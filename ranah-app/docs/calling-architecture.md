# Ranah Calling Architecture

Design for end-to-end encrypted calls and texts between two Ranah installs — contacts, history and connection keys stay on-device; the server only ever forwards an opaque, encrypted blob through a push notification.

**Scope for v1:** notification-triggered call requests, not a synchronous ring (see the discussion below). PushKit/CallKit-based true ringing is deferred, additive work.

Grounded in the current `ranah-app` source (`ContactsContext`, `MessagesContext`, `persist.ts`, `notifications/scheduler.ts`), not designed from scratch.

## Five pieces, in build order

| # | Piece | Needs a custom dev client? |
|---|-------|------------------------------|
| 1 | E2E key exchange at pairing | No — Expo Go |
| 2 | Relay server, stateless | No — Expo Go |
| 3 | Local-only storage | No — Expo Go |
| 4 | QR pairing UI | No — Expo Go |
| 5 | WebRTC calling | **Yes** |

Only WebRTC forces the move off Expo Go. Pairing, crypto, and real text messaging between two phones can be built and demoed entirely first.

---

## 1. E2E key exchange at pairing

The "session key" this whole design hinges on isn't a thing the server hands out — it's derived fresh, every time, from two public keys the devices already hold.

Each device generates a keypair once, at first launch, using **tweetnacl** (pure JS/WASM, X25519 + XSalsa20-Poly1305 — the standard NaCl "box"). Pure JS/WASM means it runs identically on web and native with no config plugin or dev-client rebuild — crypto stays fully decoupled from the WebRTC native-module migration.

- **Private key** → `expo-secure-store` (iOS Keychain / Android Keystore). Never AsyncStorage, never backed up.
- **Public key** → a new field on the existing `profile` object, already persisted, not sensitive.
- After pairing, either side derives the shared secret fresh: `nacl.box(msg, nonce, theirPublicKey, myPrivateKey)`. Nothing about "the key" needs separate storage beyond each side's own keypair plus the other's public key, which pairing already delivered.

**Pairing QR payload:**

```json
{
  "id": "me-8f2a1c",
  "publicKey": "base64…",
  "pushToken": "ExponentPushToken[…]",
  "grant": { "...": "signed authorization for the relay — see §2" }
}
```

**Decided:** scanning the code is a straight fit for the existing `addContact()` in `ContactsContext.tsx` — it just gets new fields to carry. The `grant` is what later lets the relay verify a sender with no lookup at all (see below).

## 2. Relay server, as a router

Since the payload is already opaque to it, the server can be genuinely stateless — no database to even architect retention around.

One HTTP endpoint, best run as a single serverless function (Cloudflare Worker / Vercel Edge Function) rather than a hosted process — there's nothing for a long-running server to hold.

```
POST /relay
{
  "grant": { "...": "signed at pairing time, see below" },
  "senderPublicKey": "A's public key",
  "signature": "sign_A(payload)",
  "type": "call-offer",   // | call-ice | call-answer | call-end | text
  "payload": "<nacl.box-encrypted blob, base64>"
}
```

The function does exactly one thing: verify the grant and signature below, then hand `payload` to **Expo's push API** (`exp.host/--/api/v2/push/send`), addressed to whatever push token the grant names. `type` only picks a notification title/sound — it's never used to interpret the encrypted contents. Because the app already uses `expo-notifications`, this means one unified API instead of separately integrating APNs and FCM.

### Who's allowed to reach you: a signed grant, not a lookup

A bare `toPushToken` in the request isn't enough — the relay has no database, so it can't check "is this sender someone the recipient actually paired with." Worse, encryption alone doesn't help: the relay never decrypts anything, so it can't tell a real message from garbage either — a notification still lands on the recipient's phone before their app ever tries (and fails) to decrypt it. Confidentiality isn't delivery control.

The fix is a credential the relay can verify with *no lookup at all* — the same trust model as a self-signed certificate or a capability token. At pairing, alongside the public-key exchange, B also issues A a grant, signed with B's own key:

```json
{
  "granteePublicKey": "A's public key",
  "issuerPublicKey": "B's public key",
  "pushToken": "B's current token",
  "issuedAt": "…", "expiresAt": "…",
  "signature": "sign_B(everything above)"
}
```

Every field the relay needs to verify the grant travels *inside* the grant itself, so checking it needs nothing external:

1. Verify `grant.signature` against `grant.issuerPublicKey` — proves B really issued it, nothing looked up.
2. Check `grant.granteePublicKey` matches the request's `senderPublicKey` — this grant names this sender.
3. Verify the sender's own `signature` over the request — proves it really came from whoever holds A's private key.
4. Route to `grant.pushToken`, never a bare token supplied separately.
5. Reject if `expiresAt` has passed.

**Decided:** someone who merely obtains a bare push token can't produce a valid grant for it — that only comes from actually pairing with the recipient, or stealing their private key outright. The grant refreshes the same piggyback way as the push token, so it never needs to be long-lived to stay usable.

### Rate limiting: sender id and receiver id, nothing else

The grant stops *strangers*; it doesn't stop a legitimate but compromised or buggy paired contact from flooding. Deliberately **no IP-based limiting** — both counters below key on identifiers the relay already has to see to verify the grant in the first place (`senderPublicKey`, `grant.issuerPublicKey` as the recipient's own persistent id), so this adds no new visibility at all, rather than introducing IP as a fourth thing the server pays attention to. Both are short-lived, auto-expiring counters — not stored user data: no message content, no contacts, nothing beyond an opaque key for a few seconds to minutes before vanishing.

| Layer | Keyed on | Rough budget | Catches |
|---|---|---|---|
| Sender id | `senderPublicKey` | ~30/min, ~300/hr | One identity stuck in a flood/retry loop |
| Receiver id | `grant.issuerPublicKey` | ~60/min | One recipient, regardless of how many senders are hitting them |

**Order**: verify grant + signature *first* → sender check → receiver check → forward. Both counters only ever run on identities the signature has already confirmed, never on a raw claimed value — so there's nothing left to spoof: an attacker can't burn through someone else's budget by putting their public key in the `senderPublicKey` field, because that field is only trusted once the accompanying signature proves whoever sent this really holds the matching private key. Ed25519 verification is microseconds, not a meaningful cost even checked on every request — the earlier instinct to rate-limit before verifying "to save the expensive check for later" wasn't actually buying anything worth the gap it opened.

**Decided:** both rate-limit keys are signed, not claimed. `senderPublicKey` is trusted only after its signature verifies; `grant.issuerPublicKey` was already trusted only after the grant's own signature verifies. Symmetric, and the earlier spoofing gap is closed, not just bounded.

**Open:** one caveat that's inherent to the platform, not this design: any HTTP server technically sees the connecting IP as a property of the protocol itself — that can't be made to disappear, and the hosting platform (Cloudflare/Vercel/etc.) will likely apply its own IP-level DDoS protection underneath this regardless. What's actually being decided here is narrower and real: the relay's *own application logic* never uses IP as a signal or a key, only the two signed ids above. A flood of purely fabricated requests with no valid signature at all still costs a small, fixed verification check each — that's a volumetric concern properly handled by the platform's own infrastructure, not something rate-limiting two trusted ids was ever going to solve.

### One seen-ids store, covering every delivery — request or response alike

The grant doesn't change per request, so a relay that's *seen* a valid delivery once — grant, signature, encrypted payload, all of it — could resend that exact triplet later and it would still pass every check. That's true whichever direction it went: a replayed call *offer* (a request) and a replayed call *answer* (a response to one) are the same category of problem, and so is a replayed text. One uniform mechanism should catch all of them, not a patchwork of one-off checks per type.

Every relayed item — `text`, `call-offer`, `call-answer`, `call-ice`, `call-end` — already carries (or trivially gets) a unique id: `Message.id` for text, generated the same way today in `MessagesContext.tsx`; the session token itself for call signaling. A single local, persisted store checks all of them the same way, regardless of type or direction:

- A new persisted key, `seenDeliveryIds` — same `persist.ts` mechanism as everything else, local-only by construction.
- On every incoming delivery, whatever its `type`: check `seenDeliveryIds` first. Already present → drop silently. Not present → record it, *then* hand it to the type-specific handler (`receiveMessage`, or the call state machine).
- Independent of the message list or call state, so deleting a message, ending a call, or anything else the user does afterward never un-remembers that an id was seen.
- Capped and pruned by count and age, so it only needs to outlive how long a stale replay could plausibly still be floating around — not forever.

The call session-token **ratchet stays too**, layered on top for calls specifically — `seenDeliveryIds` answers "have I processed this exact delivery before," while the ratchet additionally answers "does this belong to the call that's actually live right now," which a simple id check alone can't (a genuinely fresh offer for a *new* call attempt has a new id, so dedupe won't catch it — only the ratchet knows a previous attempt was abandoned).

**Decided:** one universal layer (dedupe, every type, either direction) plus one call-specific layer on top (ordering/liveness within a live session) — every content type Ranah relays now has an anti-replay memory that doesn't depend on what the user does with it afterward. That's the full chain, closed.

## 3. Local-only storage

Mostly a confirmation, not new work — the app was already built this way.

Contacts, messages, call log, reminders, settings and profile are already 100% local via `persist.ts` / AsyncStorage — confirmed by reading it, not assumed. Nothing architectural changes here. What's new is two fields:

- `Contact` gains `publicKey` and `pushToken`.
- `profile` gains `publicKey` (the private half goes to `expo-secure-store`, not here).

**Decided — stale push tokens:** a reinstall or OS-level change invalidates a token, and with zero server state there's no registry to catch it. Rather than a separate refresh protocol: every outgoing message and call-signaling packet carries **the sender's own current token, read fresh at send time**. Every time a contact hears from you, they silently get an up-to-date copy of your token for free, piggybacked on ordinary traffic — no chain, nothing to pre-issue, nothing to get out of sync.

**Open:** the one gap nothing on the client side closes: if a token changes *and* there's been genuine silence since (no message either direction), the first message after that gap still fails — there was no traffic to piggyback the new token onto. That's inherent to zero server state, not a flaw in the piggyback idea. The fallback is re-pairing by QR, and it's an acceptable price for a server that never remembers anything.

## 4. QR pairing, in the app

The one piece of the whole design that's purely UI — and, usefully, needs no native module at all.

- **Show your code** — `react-native-qrcode-svg`, pure JS, renders via `react-native-svg` (already a dependency).
- **Scan theirs** — `expo-camera`'s built-in barcode scanning, a stock Expo Go capability.
- **Flow** — one "Pair" screen: your QR on screen, a "Scan their code" button beside it. Two people trade a glance at each other's phones once, same shape as Signal/WhatsApp device-linking.

**Decided:** neither `expo-camera` nor `tweetnacl` need a custom dev client — pairing, crypto and text-over-relay (pieces 1–4) can be built and demoed entirely inside plain Expo Go. **Only WebRTC forces the move.** That's a real incremental delivery path: working end-to-end text before calling is touched at all.

## 5. WebRTC calling

The notification payload doesn't just wake the app — it *is* the signaling transport.

With no held connection anywhere, the SDP offer (typically a few hundred bytes to ~2KB) rides directly inside the push's `data` field. Each ICE candidate goes out the same way, as its own small follow-up push. Nothing is fetched from a server after the tap — the notification already carried the (encrypted) content.

**The call sequence, end to end:**

1. **Caller's device** — build & encrypt an SDP offer: `RTCPeerConnection.createOffer()`, then `nacl.box()` it to the callee's stored public key.
2. **Relay (stateless)** — forward, don't store: POSTs the encrypted blob to Expo Push, addressed to the callee's token. Nothing written anywhere.
3. **Callee's device** — notification arrives, with a ring-style sound. A normal push — the app runs no code until it's tapped. This is a call *request*, not a synchronous ring (see the note below).
4. **Callee's device** — tap → decrypt → answer: open with the caller's known public key, `setRemoteDescription()`, gather local media, create + encrypt an answer, relay it back the same way.
5. **Both devices** — trade ICE candidates, connect: same encrypted-push relay, one small message per candidate, until a direct peer connection forms.

### A second, ephemeral token — scoped to one call

The pair token above is long-lived and addresses a device; it says nothing about which *call attempt* a given signaling message belongs to. Push delivery is best-effort and can redeliver or arrive out of order, so a second, disposable token rides inside the encrypted payload for the lifetime of a single call only — born with the offer, discarded at `call-end`, never persisted.

Each message carries two things: proof of the token it just received, and a freshly generated token for whatever comes next. A ratchet, not a static session id:

```
Caller → offer:   { sdp,                        sessionToken: T0 }
Callee → answer:  { sdp,      inResponseTo: T0, sessionToken: T1 }
Caller → ICE:     { candidate, inResponseTo: T1, sessionToken: T2 }
Callee → ICE:     { candidate, inResponseTo: T2, sessionToken: T3 }
…and so on until call-end, then the whole chain is thrown away
```

What it buys, without any server involvement:

- **Replay/duplicate protection** — a mismatched token means "not part of the live exchange," and it's dropped rather than acted on.
- **Implicit session identity** — if the caller retries after no answer, the retry's tokens are freshly generated and won't match the abandoned attempt's chain, so a late straggler from the dead attempt can't get confused with the live one.
- **Nothing to persist** — lives only in each device's in-memory call state. `callLog`/`missedNotes` still record *that* a call happened; the session tokens themselves never touch AsyncStorage.

Why this works where rotating the *real* push token doesn't: a live call session, by definition, requires continuous back-and-forth to exist at all. There's no long-silence case to bridge — if messages stop flowing, the call attempt has effectively already failed or ended.

### Platform split

- **Web** — the browser's native `RTCPeerConnection`.
- **Native** — `react-native-webrtc`'s `RTCPeerConnection`, same shape, different import. Exactly what the existing `.native.ts` / `.ts` split (already used for `src/audio/`) is for: a `webrtc.ts` / `webrtc.native.ts` pair exporting one small interface for `call.tsx` to use.

**Open — STUN only, no TURN, for v1.** Free public STUN handles NAT traversal for most home/wifi pairs but will fail on some networks (symmetric NATs, some carrier or corporate networks). A known, real gap, not an oversight. TURN (a small coturn instance, or a metered service) can be added later without touching anything else here.

### Where it lands in the existing app

`app/call.tsx` currently assumes a call is already live and only shows your own speech transcript. This adds the phase *before* that: decrypt the incoming offer, build the peer connection, answer, exchange ICE — only then does `callState` flip to `'active'`, exactly as it does today. The transcript doesn't disappear; it becomes a layer on top of real two-way audio instead of being the entire call.

---

## Why "notification-triggered," not a synchronous ring

A **normal** push notification does not wake the app to run code in the background on iOS — it just shows a banner/sound. The app only starts doing anything once the user taps it. On Android, default-priority messages are also subject to Doze-mode delay. So the realistic flow is: caller sends → callee sees a notification with a ring-like sound → callee taps → app opens → **now** the WebRTC handshake starts. There's no live "ringing…" feedback for the caller, and no OS-level full-screen incoming-call UI over the lock screen (that requires PushKit/CallKit on iOS and ConnectionService on Android — deliberately deferred).

This is closer to "a call request you tap to open and then connect" than a synchronous ring — more like requesting a FaceTime than receiving a phone call. Chosen deliberately for v1 to avoid CallKit/ConnectionService integration and VoIP-push entitlement rules. **Extends cleanly later**: PushKit/CallKit/ConnectionService are additive — a second, higher-priority delivery path and a new full-screen incoming-call UI — the relay design, E2E keys, local-only storage, and WebRTC core don't change.

## Suggested build order

1. **Keys & pairing** — keypair generation, secure-store, QR show/scan. Testable in Expo Go.
2. **Relay + text** — stateless forward endpoint; swap `localTransport` for a relay-backed one. Real texting between two phones, no calling yet.
3. **Dev client + WebRTC** — move off Expo Go, add `react-native-webrtc`, get one basic two-way audio call working on a shared network.
4. **Polish (later)** — TURN, PushKit/CallKit for a true synchronous ring — all additive on top of this core.

---

*Also published as an interactive doc: see the Claude artifact "Ranah Calling Architecture" for the same content with diagrams.*
