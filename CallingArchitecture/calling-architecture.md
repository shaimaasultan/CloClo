# Calling & texting, without a server that remembers anything

*Ranah architecture note — implementation-ready. v1 scope: notification-triggered, not synchronous ring. Revised 2026-09-18.*

End-to-end encrypted calls and texts between two Ranah installs. Organized by what actually gets built together, not by abstract topic — every payload shows every field, every step names its tool, and every encryption/decryption is labeled with who does it and where.

## Who's talking to whom

Four different "servers" get mentioned in this doc. Only one of them is ours — mixing the other three up with it is the easiest way to misread this design.

| Name | What it is | Sees |
|---|---|---|
| **Relay server** (ours) | New. A stateless serverless function. | Encrypted blobs, plus the sender's and receiver's public keys (to verify the grant). Never plaintext, never stored. |
| **STUN server** (third-party) | Not ours. Existing, free, public (e.g. Google's `stun.l.google.com:19302`). | Nothing but a UDP ping — tells a device its own public IP:port. No app data, no contacts, no call content ever reaches it. |
| **Push service** (third-party) | Not ours. Expo's push API, itself forwarding to Apple APNs / Google FCM. | The encrypted blob, as the notification's data payload — can't decrypt it, only deliver it. |
| **TURN server** (third-party, deferred) | Not ours (or self-hosted later). Deferred entirely — not part of v1. | Encrypted media packets, only if a direct P2P connection fails. Can't decrypt them either. |

Every "server" mention in the steps below is tagged the same way: **Relay** for ours, **STUN** / **Push** for the other two that actually appear in v1.

**Contents:** [Phase 1 · Keys & Pairing](#phase-1-keys--pairing) · [Phase 2 · Relay & Text](#phase-2-relay--text) · [Phase 3 · WebRTC Calling](#phase-3-webrtc-calling) · [Reliability & retries](#reliability--retries)

---

## Phase 1 · Keys & Pairing

`Expo Go — no dev client needed`

Merges the old "key exchange" and "QR pairing UI" pieces — they're really one deliverable, since the QR code is the only thing that ever carries the keys. Nothing here touches the network at all; pairing happens in person, over a screen the two of you are both looking at.

**Tools:** tweetnacl · expo-secure-store · react-native-qrcode-svg · expo-camera · `persist.ts` (existing) · `ContactsContext.tsx` (existing)

> **Note:** Two keypairs, not one — tweetnacl uses different algorithms for encrypting and for signing, and earlier drafts of this doc glossed over that. **Box keypair** (X25519, `nacl.box.keyPair()`) encrypts/decrypts messages. **Sign keypair** (Ed25519, `nacl.sign.keyPair()`) signs the grant and every outgoing request so the relay can verify who sent what. Every payload below carries both public keys explicitly.

**1. Generate both keypairs, once, at first launch** — *on device, no network*
Tool: tweetnacl — `nacl.box.keyPair()`, `nacl.sign.keyPair()` — new file `src/crypto/identity.ts`. Secret keys go straight to `expo-secure-store` (two entries: `boxSecretKey`, `signSecretKey`) — iOS Keychain / Android Keystore, never AsyncStorage, never backed up. Public keys join the existing `profile` object.

`profile` (persist.ts, key `"profile"`) — full shape after this step:
```json
{
  "id": "me-8f2a1c",
  "boxPublicKey": "base64…",
  "signPublicKey": "base64…"
}
```

**2. Show your identity QR** — *on device, no encryption — shown in person*
Tool: react-native-qrcode-svg (pure JS, renders via react-native-svg, already a dependency) — new screen `app/pair.tsx`. Both people open this screen at the same time. No grant yet — neither side knows the other's key, so there's nothing to authorize.

Identity QR payload — full shape, round 1:
```json
{
  "id": "me-8f2a1c",
  "boxPublicKey": "base64…",
  "signPublicKey": "base64…",
  "pushToken": "ExponentPushToken[…]"
}
```

**3. Scan theirs** — *on device*
Tool: expo-camera's built-in barcode scanner — stock Expo Go capability, no config plugin. Decoded straight into a draft `Contact`. Each side now holds the other's `boxPublicKey`, `signPublicKey`, and `pushToken` — but not yet a grant.

**4. Issue a grant, the instant their key is known** — *on device, signed locally — no network*
Tool: tweetnacl — `nacl.sign.detached(payload, mySignSecretKey)`. This device now knows the other side's `signPublicKey`, so it can authorize them to reach it. This is the credential the relay verifies in Phase 2 — with no lookup, because everything it needs is inside the object itself.

Grant — full shape:
```json
{
  "granteePublicKey": "their signPublicKey",
  "issuerPublicKey": "my own signPublicKey",
  "pushToken": "my own current pushToken",
  "issuedAt": 1737100000000,
  "expiresAt": 1737200000000,
  "signature": "base64 nacl.sign.detached(…, mySignSecretKey)"
}
```

**5. Show the updated QR, second scan** — *on device, no encryption — still just shown in person*
Tool: same react-native-qrcode-svg screen, re-rendered. The QR on screen updates the instant step 4 finishes — in the app this reads as one continuous back-and-forth scan, not two deliberate steps. The other person scans it again, this time getting the grant too.

Identity QR payload — full shape, round 2:
```json
{
  "id": "me-8f2a1c",
  "boxPublicKey": "base64…",
  "signPublicKey": "base64…",
  "pushToken": "ExponentPushToken[…]",
  "grant": { "…the object from step 4, naming THEM as grantee" }
}
```

**6. Save the contact** — *on device*
Tool: existing `addContact()` in ContactsContext.tsx, existing persist.ts. Both sides now hold everything Phase 2 needs: the other's box key (to encrypt to them), sign key (to verify their signatures), push token (to route to them), and a grant *they* issued (to prove to the relay this sender is authorized).

Contact — new fields, full shape:
```json
{
  "id": "b-2f91ac",
  "name": "…",
  "boxPublicKey": "…",
  "signPublicKey": "…",
  "pushToken": "…",
  "grant": { "…the grant THEY issued to me" }
}
```
*(plus existing fields: number, birthday, activity, sky, localHour, keepsake, favourite)*

> **Note:** No encryption or decryption happens anywhere in Phase 1 — pairing is entirely in-person, over a screen, never over the network. What this phase actually produces is the *capability* to encrypt: by the end of it, each side holds the other's box key, ready for Phase 2.

---

## Phase 2 · Relay & Text

`Expo Go — no dev client needed`

Everything needed for real, working, end-to-end encrypted text messages between two phones: the relay server itself, rate limiting, replay protection, and the local storage changes that support them — one deliverable, demoable on its own before calling exists at all.

**Tools:** Cloudflare Workers / Vercel Edge · tweetnacl · Expo Push API · `MessagesContext.tsx` (existing) · `persist.ts` (existing)

**1. Compose** — *on device A*
Tool: existing `sendMessage()` in MessagesContext.tsx.
```json
{
  "id": "m1a2b3c4",
  "from": "me-8f2a1c",
  "to": "b-2f91ac",
  "text": "…",
  "at": 1737100000000,
  "status": "sending"
}
```

**2. Encrypt** — **ENCRYPTED here — on device A, sender**
Tool: tweetnacl — `nacl.box(JSON.stringify(message), nonce, contact.boxPublicKey, my.boxSecretKey)`. Plaintext never leaves this step, ever. Everything downstream — relay, push service, APNs/FCM — only ever sees the output of this line.

**3. Sign the request** — *on device A*
Tool: tweetnacl — `nacl.sign.detached(payload, my.signSecretKey)`.

**4. Send to the relay** — *A → Relay*
Every field that ever crosses the network for a text message:
```json
{
  "grant": { "…the grant B issued A, from Phase 1 step 4" },
  "senderPublicKey": "A's signPublicKey",
  "signature": "base64, from step 3",
  "type": "text",
  "payload": "base64 nacl.box ciphertext, from step 2"
}
```

**5. Verify, rate-limit, dedupe** — *on the Relay — sees ciphertext only, never plaintext*
Tool: the hosting platform's own request handler (Workers/Edge Function code) — no external library needed, just tweetnacl's verify functions. In order, cheapest-irrelevant-first:
1. Verify `grant.signature` against `grant.issuerPublicKey` — self-contained, nothing looked up.
2. Check `grant.granteePublicKey == senderPublicKey` — this grant names this sender.
3. Verify the outer `signature` against `senderPublicKey` — proves the request really came from A.
4. Rate-limit check: `senderPublicKey` (~30/min, ~300/hr) then `grant.issuerPublicKey` (~60/min) — both only trusted because steps 1–3 already verified them; nothing here is a raw claimed value. Deliberately no IP-based limiting — see the note below.
5. Reject if `expiresAt` has passed.

**6. Forward, don't store** — *Relay → Push service → APNs/FCM*
Tool: Expo Push API (`exp.host/--/api/v2/push/send`) — one unified call instead of separately integrating APNs and FCM. The same opaque `payload` rides inside the push notification's data field. None of these three — relay, Expo, APNs/FCM — can decrypt it. Nothing about this request is written to disk anywhere in this step.

**7. Notification arrives** — *device B, asleep or awake*
A plain OS notification — sound/banner only. No app code runs until it's tapped.

**8. Tap → decrypt** — **DECRYPTED here — on device B, recipient**
Tool: tweetnacl — `nacl.box.open(payload, nonce, contactA.boxPublicKey, my.boxSecretKey)`. Recovers the original `Message` JSON from step 1. This is the only device, other than A itself, that ever sees the plaintext.

**9. Dedupe** — *on device B, local only*
Tool: new persisted key `seenDeliveryIds`, same persist.ts mechanism as everything else. Check `message.id` against the local store before doing anything else — already seen → drop silently. A relay that's seen a valid request once could resend it later and it would still pass every check in step 5, since the grant doesn't change per request; this is what actually catches that, independent of message deletion or call state, capped and pruned by count and age.

**10. Deliver** — *on device B*
Tool: existing `receiveMessage()` in MessagesContext.tsx, existing InboxContext.

> **Open:** Any HTTP server technically sees the connecting IP as a property of the protocol itself — that can't be made to disappear, and the hosting platform applies its own IP-level DDoS protection underneath this regardless. What step 5 actually decides is narrower: the relay's *own application logic* never uses IP as a signal or a key, only the two signed ids.

> **Open — stale push tokens.** A reinstall invalidates a token, and with zero server state there's no registry to catch it. Fix: every outgoing message carries the sender's own current token, read fresh at send time (piggybacked on ordinary traffic — see step 4's `grant.pushToken`, refreshed the same way). The one gap that leaves: if a token changes *and* there's been genuine silence since, the first message after that gap still fails, since nothing was in flight to piggyback the new token onto. Fallback: re-pair by QR (Phase 1) — an acceptable price for a server that never remembers anything.

---

## Phase 3 · WebRTC Calling

`Custom dev client required`

`react-native-webrtc` is a native module — Expo Go can't load it. This is the one phase that needs `expo-dev-client` + an EAS build before anything in it can even be tested. Everything else it needs (relay, encryption, push) is Phase 2, unchanged.

**Tools:** expo-dev-client + EAS Build · react-native-webrtc (native) · browser RTCPeerConnection (web) · tweetnacl (same as Phase 2) · Phase 2's relay (no new server)

> **Note:** Steps 2–4 below are the exact same encrypt → sign → relay → push → tap → decrypt sequence as Phase 2, just carrying SDP/ICE instead of a text message. No new server, no new relay code — only a new `type` value and a new payload shape.

**1. Create an offer** — *on device A, caller*
Tool: `webrtc.native.ts` (wraps react-native-webrtc) or `webrtc.ts` (wraps the browser's own RTCPeerConnection) — same small interface either way, exactly the `.native.ts`/`.ts` split already used for `src/audio/`. `RTCPeerConnection.createOffer()`. A fresh session token `T0` is also generated here — random, in memory only, born with this call attempt.

**2. Encrypt, sign, relay, push** — **ENCRYPTED on device A** → Relay → Push → APNs/FCM
Identical mechanics to Phase 2 steps 2–6. `type` is now `"call-offer"`, and the encrypted payload carries the session token alongside the SDP:
```json
{
  "sdp": "…",
  "sessionToken": "T0"
}
```

**3. Tap → decrypt → answer** — **DECRYPTED on device B, callee**
Tool: same webrtc.ts/webrtc.native.ts, same tweetnacl as Phase 2 step 8. `setRemoteDescription()`, gather local media (`getUserMedia`), `createAnswer()` — then encrypt + sign + relay the answer back through the identical Phase 2 path, `type: "call-answer"`:
```json
{
  "sdp": "…",
  "inResponseTo": "T0",
  "sessionToken": "T1"
}
```

**4. Trade ICE candidates** — *both devices, same encrypt/relay/decrypt loop*
`type: "call-ice"`, one small message per candidate, each continuing the ratchet:
```json
{
  "candidate": "…",
  "inResponseTo": "T_n",
  "sessionToken": "T_n+1"
}
```

**5. NAT discovery, in parallel with steps 1 & 3** — *device ↔ STUN server directly — not through the relay*
While gathering ICE candidates, each device's own WebRTC stack queries a STUN server — a free public one (e.g. Google's `stun.l.google.com:19302`) — completely separately from everything above. This is the one point in the whole design where a device talks to a server that isn't our relay. STUN sees a UDP ping and replies "here's your public IP:port" — nothing about the call, the contact, or any encrypted payload ever reaches it.

**6. Connect, direct** — *device A ↔ device B, no server involved*
Once enough ICE candidates have been traded, the two devices connect directly — peer to peer. Audio/video flows DTLS/SRTP-encrypted between A and B only; the relay, STUN, and the push service are no longer part of the path at all once this succeeds.

**7. Hang up** — *same relay path as above, `type: "call-end"`*
The whole session-token chain (`T0`, `T1`, …) is discarded on both sides — it only ever lived in memory. `callLog`/`missedNotes` (existing, persisted) still record *that* a call happened; never the tokens themselves.

### Why the ratchet, on top of the relay's own replay protection

Phase 2's `seenDeliveryIds` answers "have I processed this exact delivery before." The session token answers something dedupe alone can't: "does this belong to the call that's actually live right now." A caller's retry after no answer generates fresh tokens that won't match the abandoned attempt's chain — a late straggler from the dead attempt can't get confused with the live one, even though its id would look perfectly new to dedupe.

> **Open — STUN only, no TURN, for v1.** Step 5's STUN lookup handles most home/wifi pairs; it will fail on some networks (symmetric NATs, some carrier or corporate networks) with no fallback in v1. A known, real gap — a TURN server (deferred) would relay the still-encrypted media when direct connection fails, without touching anything built here.

### Where it lands in the existing app

`app/call.tsx` currently assumes a call is already live and only shows your own speech transcript. Phase 3 adds the part *before* that — steps 1–6 above — and only then does `callState` flip to `'active'`, exactly as it does today. The transcript doesn't disappear; it becomes a layer on top of real two-way audio instead of being the entire call.

---

## Reliability & retries

*Cross-cutting.*

What happens if any one of the four servers from the "who's talking to whom" table is unreachable mid-call. The retry policy is different at every hop, because each hop trusts a different thing — this is one packet's path, top to bottom, end to end.

```
[client]  Device A — caller, encrypts+signs
             |
             |  backoff x4 (1s,2s,4s,8s+jitter); 4xx is terminal
             v
[ours]    Relay server — verifies, forwards only
             |
             |  Expo-managed retry (2-3 attempts, inside the relay)
             v
[3rd party] Push service — Expo -> APNs/FCM
             |
             |  no retry on our side (fire-and-forget)
             v
[client]  Device B — callee, decrypts+dedupes

[3rd party] STUN server — parallel per device
             queried independently by A and B the whole time above,
             not on this packet's path (UDP retransmit, ~7 attempts,
             handled inside the ICE stack)
```

**1. Device A → Relay** — *client-side backoff*
Timeout or 5xx: the client retries with backoff (1s, 2s, 4s, 8s + jitter), capped at 4 attempts, then surfaces "couldn't send" in the UI. A 4xx — bad signature, expired grant — is terminal: no retry, since resending the identical request would just fail the same check again.

**2. Relay → Push service** — *retried by the relay itself*
An Expo API error or timeout gets 2–3 retries inside the same request, bounded by the relay function's own execution limit — the client never sees this hop fail unless all of those are exhausted.

**3. Push service → APNs/FCM → Device B** — *no retry on our side*
Transient failures here are Expo's own internal queue/retry — opaque to us. If the device is offline or its token is dead (`DeviceNotRegistered`), the relay does not retry; recovery is the stale-token piggyback from Phase 2, not a retry loop.

**4. Device ↔ STUN, in parallel with 1–3** — *handled inside the ICE stack*
UDP packet loss is retransmitted automatically by the native WebRTC/ICE stack per RFC 5389 (~7 attempts) — invisible to app code, nothing for us to implement.

**5. Device ↔ TURN** — *v2, deferred — not built in v1*
If a TURN allocation ever fails once added, ICE just falls back to whatever candidates it already has; with none, the call fails to connect. Not part of v1 at all — see Phase 3's open callout.

**6. Whole call, offer delivered but never answered** — *app-level retry, not a raw resend*
The caller's app sends a fresh offer with a new session-token chain rather than retransmitting the old one, bounded to 1–2 re-attempts before showing "no answer".

| Hop | Failure | Retry | Bound |
|---|---|---|---|
| Device A → Relay | timeout / 5xx | Client backoff (1s, 2s, 4s, 8s + jitter) | 4 attempts |
| Device A → Relay | 4xx (bad signature, expired grant) | None — terminal | 0 |
| Relay → Push service | Expo API error/timeout | Relay retries the forward itself | 2–3 attempts |
| Push service → APNs/FCM | transient (rate limit, hiccup) | Expo's own internal queue/retry | opaque to us |
| Push → device | offline, `DeviceNotRegistered` | None — fire-and-forget | recovered via stale-token piggyback, not a retry |
| Device ↔ STUN | UDP packet loss | Native ICE stack retransmits (RFC 5389) | ~7 retransmits |
| Device ↔ TURN (v2) | allocation fails | ICE falls back to other candidates, else fails | n/a — not built in v1 |
| Whole call | no answer | Caller sends a fresh offer, new session-token chain | 1–2 re-attempts |

> **Note:** This stays simple because the relay holds no state — a retry is just "send the identical signed request again," nothing to reconcile, no partial-write cleanup. The one thing that has to catch a duplicate that *did* land twice (relay retried after the first attempt actually succeeded but the ack was lost) is `seenDeliveryIds` on the receiving device, already part of Phase 2. That single mechanism is what makes every retry above safe by construction, rather than needing separate idempotency handling at each hop.

---

*Ranah — internal architecture note — grounded in the current `ranah-app` source (ContactsContext, MessagesContext, persist.ts, notifications/scheduler.ts) rather than a from-scratch design.*
