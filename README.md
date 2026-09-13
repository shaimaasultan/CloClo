# CloClo

*Hello from the other side.*

CloClo reimagines the phone app as a rotary telephone with a small **keeper**
living in its hub. You pull numbers round a brass dial, the keeper wakes up
when a call comes in, and every call carries a little of the caller's world
with it: their weather, their local time, and what they're up to.

This repository holds two things:

- **`dial-hollow.html`** – the original single-file HTML prototype.
- **`ranah-app/`** – the Expo / React Native app that brings the prototype to
  iOS, Android, and the web.

## Features

- **Rotary dial** – drag a finger hole clockwise to the brass stop and let go;
  the disk springs back and the digit is added to *Last dialed*.
- **Keeper's room** – the keeper reads, hums, and waves; its mood drifts to
  *Bored* after a quiet spell and *Excited* after a call. Tap the room to
  change what it's doing.
- **Incoming calls** – the handset vibrates over the top of the keeper's room,
  the caller's card shows their name and status, and the caller's ringtone
  repeats until you answer or hit the glowing **Decline** button.
- **Live call screen** – answering opens a call view with a running timer,
  Mute / Clarity / End controls, and a transcript where each line appears in
  the speaker's own language with a live translation underneath.
- **Contacts, Recents, Sounds, Settings** – call anyone from Contacts or
  Recents (with call directions and durations), pick a ringtone per caller,
  and toggle sound effects or privacy mode (which masks dialled digits and
  hides recent calls).
- **Caller's sky** – clear, rain, snow, or storm weather drifts behind every
  screen and follows the caller when they ring.
- **Header controls** – one pill beside the logo holds the clock, the sky
  picker, the case colour (Oxblood, Verdigris, Ivory, Graphite), and the
  language switch.
- **English and Arabic** – full Egyptian-Arabic translation with right-to-left
  layout.

## Project status

CloClo is a working prototype, not a telephony app yet:

- Callers, recent calls, call durations, and the call transcript are sample
  data; no real calls are placed or received.
- Dial ticks, handset clunks, and ringtones are synthesised with the Web Audio
  API, so they play in the web build only and are silent on iOS / Android
  until recorded sound assets are added.
- Settings, ringtone choices, and the dialled number reset when the app
  restarts.

## Getting started

### Run the app

Requirements: [Node.js](https://nodejs.org/) (LTS) and npm. To run on a
device, install the [Expo Go](https://expo.dev/go) app or set up an Android
emulator / iOS simulator.

```bash
cd ranah-app
npm install
```

Then start the target you want:

```bash
npm run web
```

```bash
npm run android
```

```bash
npm run ios
```

`npm start` opens the Expo dev server, from which you can pick any target.
The app is built on **Expo SDK 57**, **React Native 0.86**, and
**Expo Router**; see the
[Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) when working on it.

### Open the prototype

`dial-hollow.html` has no build step – open it directly in a browser.

## Project structure

```
.
├── dial-hollow.html            # original HTML prototype
└── ranah-app/                  # Expo / React Native app
    ├── app/                    # screens (Expo Router file-based routes)
    │   ├── index.tsx           # dial
    │   ├── room.tsx            # keeper's room + incoming call
    │   ├── call.tsx            # live call screen with transcript
    │   ├── contacts.tsx
    │   ├── recents.tsx
    │   ├── sounds.tsx
    │   ├── settings.tsx
    │   └── advanced.tsx        # case colour + language
    └── src/
        ├── components/         # dial, handset, keeper, header, dock, …
        ├── state/              # keeper/call, language, palette, settings
        ├── i18n/               # English and Arabic dictionaries
        ├── audio/              # synthesised tones and ringtones
        ├── data/               # sample call transcript
        └── theme/              # case-colour palettes
```

## License

CloClo is released under the [MIT License](LICENSE). `ranah-app/LICENSE` is
the MIT license that ships with the Expo starter template and covers that
template code.
