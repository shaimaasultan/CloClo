# CloClo

*Hello from the other side.*

CloClo reimagines the phone app as a rotary telephone with a small **keeper**
living in its hub. You pull numbers round a brass dial, the keeper wakes up
when a call comes in, and every call carries a little of the caller's world
with it: their weather, their local time, and what they're up to.

## Demo

<video src="docs/demo.mp4" controls width="360"></video>

**[▶ Watch the demo (1:39)](docs/demo.mp4)** – dialling, a birthday call
with the keeper's party hat, the keeper's room, adding a contact, and the
Arabic layout.

This repository holds two things:

- **`dial-hollow.html`** – the original single-file HTML prototype.
- **`ranah-app/`** – the Expo / React Native app that brings the prototype to
  iOS, Android, and the web.

## Features

### Calling

- **Rotary dial** – drag a finger hole clockwise to the brass stop and let go;
  the disk springs back and the digit is added to *Last dialed*.
- **Incoming calls** – the handset vibrates over the top of the keeper's room,
  the caller's card shows their name and status, and the caller's ringtone
  repeats until you answer or hit the glowing **Decline** button. A call
  nobody answers is logged as missed.
- **On a call** – a *Line in use* pill appears beside *Last dialed* and
  *Number*, with **Mute** and **Hang up** on both the dial and the keeper's
  room. Muting keeps the line open and turns the pill amber.
- **Live call screen** – answering opens a call view with a running timer,
  Mute / Clarity / End controls, and a transcript where each line appears in
  the speaker's own language with a live translation underneath.
- **Missed-call note** – the keeper pins a sticky note to the room's door and
  beside the dial; tap it to open Recents, which takes the note down.

### Contacts and Recents

- **Contacts** – add, edit, and delete contacts: name, number, birthday, what
  they're usually doing, their weather, and their local time. Their status
  line ("Driving · light rain · 9:42 PM their time") is built from those
  details in English and Arabic. Deleting asks for confirmation.
- **Birthdays today** – a card at the top of Contacts lists everyone whose
  birthday it is, with their local time and a **Call** button; a small 🎂
  reminder beside the dial opens it.
- **Recents** – call directions and durations, with "Just now", "5m ago",
  "Yesterday", "3d ago" labels.
- **Sounds** – pick a ringtone per contact.
- **Keepsakes** – in Settings, choose the object each contact leaves on the
  keeper's shelf (mug, postcard, snow globe, book, photo, or shell). It
  appears once you've talked with them.

### Reminders

- **Reminders tab** – a bell in the dock opens your reminders: *Today*
  (including contacts' birthdays), *Upcoming* with each reminder's next date,
  and *Earlier* for one-off reminders whose day has passed.
- **Add and edit** – what to remember, a date (with Today / Tomorrow
  shortcuts), an optional time, how often it repeats (once, daily, weekly,
  monthly, yearly), and optionally someone to call. Delete asks for
  confirmation.
- **Tick them off** – check today's reminders as done; ones whose time has
  come are marked *Due now*, and linked contacts get a **Call** button.
  Talking to someone ticks off today's reminders about them, however the
  call started – from Contacts, Recents, a reminder, the birthday card, or
  answering their call (missed and declined calls don't count).
- **Notifications** – when a reminder's time comes you get a notification
  (reminders without a time nudge you at 9:00 AM). On iOS and Android they're
  scheduled with the system, so they arrive even when CloClo is closed; tap
  one to open Reminders. While the app is open, a banner slides in with
  **Call**, **Done**, and dismiss. The Reminders tab asks for permission.
- **Today's reminders on the dial** – a 🔔 button shows how many are left
  today (or *All done for today*) and opens the Reminders tab.

### The keeper

- **A little person in the phone** – they doze in the dial's hub between
  calls, leap up when the phone rings, and chat with the handset to their ear
  on a call.
- **Dressed for the caller's weather** – sunglasses for clear skies, a
  raincoat and umbrella in the rain, a wool hat and scarf in the snow, and a
  blanket (and shivers) in a storm.
- **Mirrors the caller** – a tie when they're at work, fuzzy slippers when
  they're at home, a steering wheel when they're driving.
- **Reactions** – finger to their lips ("shh") while you're muted, and a party
  hat with confetti when someone calls on their birthday.

### The keeper's room

- **Things to tap** – switch the lamp on and off, open the window to hear the
  rain louder, poke the keeper (they giggle, then get grumpy), make the plant
  grow, and wiggle the book and keepsakes on the shelf.
- **Things to drag** – send the keeper to nap on the bed, peek out of the
  front door, or sit on the window seat.
- **Time of day** – the room's light follows the phone's clock, and switches
  to the caller's local time while they ring.
- **Seasons and holidays** – decorations follow the date: blossoms and a
  butterfly in spring, lemonade and a sun hat in summer, maple leaves in
  autumn, twinkling string lights in winter, plus crescent moons and lanterns
  for Ramadan and bunting for Eid and New Year (Ramadan and Eid use the
  Islamic calendar). Advanced settings can preview any of them.
- **Birthdays** – when a contact calls on their birthday, the room puts up
  bunting, balloons, and a cake, and the keeper says "Happy birthday!".

### Look and language

- **Header controls** – one pill beside the logo holds the clock, the sky
  picker, the case colour (Oxblood, Verdigris, Ivory, Graphite), and the
  language switch.
- **Case colour** – repaints the phone, the keeper's sweater, and a wash over
  the room's wall.
- **Caller's sky** – clear, rain, snow, or storm weather drifts behind every
  screen and follows the caller when they ring.
- **English and Arabic** – full Egyptian-Arabic translation with right-to-left
  layout. In Arabic the room mirrors, the keeper's book shows Arabic letters,
  and they greet you with "أهلاً".

### Remembered between launches

Contacts, settings (sound, privacy mode, ringtones, keepsakes, decorations),
language, case colour, call history, and reminders are saved on the device and
restored when the app opens.

## Project status

CloClo is a working prototype, not a telephony app yet:

- No real calls are placed or received: incoming calls come from the
  *Preview an incoming call* button, and the call transcript and the starting
  call history are sample data.
- Dial ticks, handset clunks, ringtones, and room sounds are synthesised with
  the Web Audio API, so they play in the web build only and are silent on
  iOS / Android until recorded sound assets are added.
- Ramadan and Eid decorations need a JavaScript engine with Islamic-calendar
  support; where it's missing, those holidays are skipped.
- In the web build, reminder notifications only arrive while CloClo is open
  in a browser tab (a web page can't schedule them ahead of time). Phone
  notifications need a restart of the Expo server after installing, and are
  capped at the next 60 alerts.
- The dialled number and the current call don't survive a restart.

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
    │   ├── contact.tsx         # add / edit / delete a contact
    │   ├── recents.tsx
    │   ├── reminders.tsx       # today's, upcoming and earlier reminders
    │   ├── reminder.tsx        # add / edit / delete a reminder
    │   ├── sounds.tsx
    │   ├── settings.tsx
    │   ├── keepsakes.tsx       # shelf object per contact
    │   └── advanced.tsx        # case colour, language, decorations
    └── src/
        ├── components/         # dial, handset, keeper, room decor, header, dock, …
        ├── state/              # calls, contacts, reminders, settings, language,
        │                       # palette, decorations, and saved-data loading
        ├── notifications/      # reminder alerts: planning, phone scheduling,
        │                       # browser notifications, and permission
        ├── i18n/               # English and Arabic dictionaries
        ├── audio/              # synthesised tones, ringtones, and room sounds
        ├── data/               # sample call transcript
        └── theme/              # case-colour palettes
```

## Author

CloClo is designed and built by **Shaimaa Said Soltan**.

## License

CloClo is released under the [MIT License](LICENSE). `ranah-app/LICENSE` is
the MIT license that ships with the Expo starter template and covers that
template code.
