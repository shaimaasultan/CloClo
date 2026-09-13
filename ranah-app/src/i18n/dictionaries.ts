// Ported from the LANG.en / LANG.ar objects in dial-hollow.html — app-facing strings only
// (the prototype's dev-harness copy like eyebrow/lede/steps is dropped; it was never app UI).

import type { DecorChoice } from '../state/decorations';

export type Lang = 'en' | 'ar';

// The wordmark stays Latin-script in every language — it's a name, not a
// word, so it doesn't get translated or transliterated.
export const APP_NAME = 'CloClo';

export interface Dictionary {
  dir: 'ltr' | 'rtl';
  slogan: string;
  dockNames: Record<'dial' | 'contacts' | 'recents' | 'keeper' | 'sounds' | 'settings', string>;
  readoutLabel: string;
  callingLabel: string;
  clearAria: string;
  linePill: string;
  handsetLift: string;
  handsetHangup: string;
  incomingTag: string;
  decline: string;
  mute: string;
  muteAria: string;
  clarity: string;
  clarityAria: string;
  end: string;
  endAria: string;
  exampleNote: string;
  translatedLabel: string;
  youLabel: string;
  roomTitle: string;
  roomBack: string;
  wallNote: string;
  wallNoteBored: string;
  wallNoteHappy: string;
  moodBadge: { bored: string; happy: string };
  moments: string[];
  skyPrefix: string;
  skyNames: Record<'clear' | 'rain' | 'snow' | 'storm', string>;
  contactsTitle: string;
  recentsTitle: string;
  callTypeNames: Record<CallType, string>;
  soundsTitle: string;
  soundsHint: string;
  toneNames: Record<ToneId, string>;
  settingsTitle: string;
  soundLabel: string;
  soundHint: string;
  privacyLabel: string;
  privacyHint: string;
  privacyHidden: string;
  advancedTitle: string;
  advancedHint: string;
  languageLabel: string;
  paletteLabel: string;
  paletteNames: Record<'oxblood' | 'verdigris' | 'ivory' | 'graphite', string>;
  callers: Caller[];
  recents: RecentCall[];
  // Short spoken-style call length, e.g. "4m 12s" / "4 د 12 ث".
  formatCallDuration: (seconds: number) => string;
  justNow: string;
  minutesAgo: (minutes: number) => string;
  hoursAgo: (hours: number) => string;
  // Accessibility label for the missed-call sticky note on the room's door.
  missedNoteLabel: (names: string) => string;
  keepsakeNames: Record<KeepsakeKind, string>;
  // Shown in the room caption when a shelf keepsake is tapped.
  keepsakeCaption: (item: string, name: string, calls: number) => string;
  // Things you can tap in the Keeper's room.
  lampOffLabel: string;
  lampOnLabel: string;
  windowOpenLabel: string;
  windowCloseLabel: string;
  pokeLabel: string;
  napLabel: string;
  peekLabel: string;
  bookCaption: string;
  plantCaption: string;
  giggleCaption: string;
  grumpyCaption: string;
  napCaption: string;
  peekCaption: (weather: string) => string;
  seatLabel: string;
  seatCaption: (weather: string) => string;
  // Seasonal and holiday room decorations.
  decorLabel: string;
  decorNames: Record<DecorChoice, string>;
  ramadanGreeting: string;
  eidGreeting: string;
  newYearGreeting: string;
  birthdayGreeting: (name: string) => string;
  birthdayCakeLabel: (name: string) => string;
}

// The little object each caller leaves on the keeper's shelf.
export type KeepsakeKind = 'postcard' | 'mug' | 'snowGlobe';

export type CallerActivity = 'driving' | 'work' | 'home';

export type CallType = 'incoming' | 'outgoing' | 'missed';
export type ToneId = 'classic' | 'chime' | 'buzz' | 'pulse';

export interface Caller {
  name: string;
  meta: string;
  sky: 'clear' | 'rain' | 'snow' | 'storm';
  number: string;
  keepsake: KeepsakeKind;
  // What they're up to and their local hour (0–23) — mirrors the "… their
  // time" in `meta`, and drives the keeper's props and the room's lighting.
  activity: CallerActivity;
  localHour: number;
  // "MM-DD"; on the day, the Keeper's room throws them a little party.
  birthday: string;
}

export interface RecentCall {
  callerIdx: number;
  type: CallType;
  time: string;
  meta: string;
  // How long the call lasted. Missed calls never connected, so they have none.
  durationSec?: number;
}

export const DICTIONARIES: Record<Lang, Dictionary> = {
  en: {
    dir: 'ltr',
    slogan: 'Hello from the other side.',
    dockNames: {
      dial: 'Dial',
      contacts: 'Contacts',
      recents: 'Recents',
      keeper: 'Keeper',
      sounds: 'Sounds',
      settings: 'Settings',
    },
    readoutLabel: 'Last dialed',
    callingLabel: 'Number',
    clearAria: 'Clear dialed number',
    linePill: 'Line open',
    handsetLift: 'Lift handset to open the line',
    handsetHangup: 'Hang up',
    incomingTag: 'Incoming call',
    decline: 'Decline',
    mute: 'Mute',
    muteAria: 'Mute microphone',
    clarity: 'Clarity',
    clarityAria: 'Clean up the caller’s audio',
    end: 'End',
    endAria: 'End call',
    exampleNote: 'Example live translation',
    translatedLabel: 'Translated',
    youLabel: 'You',
    roomTitle: "Keeper's room",
    roomBack: 'Dial',
    wallNote: 'call someone soon',
    wallNoteBored: 'hasn’t rung in a while…',
    wallNoteHappy: 'so many calls today!',
    moodBadge: { bored: 'Bored', happy: 'Excited' },
    moments: ['Reading quietly', 'Humming a tune', 'Waving hello'],
    skyPrefix: 'Caller’s sky',
    skyNames: { clear: 'Clear', rain: 'Rain', snow: 'Snow', storm: 'Storm' },
    contactsTitle: 'Contacts',
    recentsTitle: 'Recents',
    callTypeNames: { incoming: 'Incoming', outgoing: 'Outgoing', missed: 'Missed' },
    soundsTitle: 'Sounds',
    soundsHint: 'Choose how each caller sounds',
    toneNames: { classic: 'Classic', chime: 'Chime', buzz: 'Retro buzz', pulse: 'Digital pulse' },
    settingsTitle: 'Settings',
    soundLabel: 'Sound effects',
    soundHint: 'Dial ticks, clunks, and ringtones',
    privacyLabel: 'Privacy mode',
    privacyHint: 'Hides dialled numbers and recent calls',
    privacyHidden: 'Hidden while Privacy mode is on',
    advancedTitle: 'Advanced settings',
    advancedHint: 'Language and case colour',
    languageLabel: 'Language',
    paletteLabel: 'Case colour',
    paletteNames: { oxblood: 'Oxblood', verdigris: 'Verdigris', ivory: 'Ivory', graphite: 'Graphite' },
    callers: [
      { name: 'Nadia', meta: 'Driving · light rain · 9:42 PM their time', sky: 'rain', number: '0100 214 7788', keepsake: 'postcard', activity: 'driving', localHour: 21, birthday: '03-21' },
      { name: 'Omar', meta: 'At work · clear skies · 2:15 PM their time', sky: 'clear', number: '0122 356 4190', keepsake: 'mug', activity: 'work', localHour: 14, birthday: '07-02' },
      { name: 'Mama', meta: 'At home · snow falling · 11:05 PM their time', sky: 'snow', number: '0111 908 2234', keepsake: 'snowGlobe', activity: 'home', localHour: 23, birthday: '11-05' },
    ],
    recents: [
      { callerIdx: 0, type: 'incoming', time: '2m ago', meta: 'Driving · light rain · 9:42 PM their time', durationSec: 252 },
      { callerIdx: 1, type: 'outgoing', time: 'Yesterday', meta: 'At the gym · clear skies · 6:30 PM their time', durationSec: 65 },
      { callerIdx: 2, type: 'missed', time: 'Yesterday', meta: 'At home · snow falling · 11:20 PM their time' },
      { callerIdx: 0, type: 'outgoing', time: 'Monday', meta: 'At home · clear skies · 8:00 AM their time', durationSec: 758 },
    ],
    formatCallDuration: (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
    },
    justNow: 'Just now',
    minutesAgo: (minutes) => `${minutes}m ago`,
    hoursAgo: (hours) => `${hours}h ago`,
    missedNoteLabel: (names) => `Missed call from ${names}. Open Recents`,
    keepsakeNames: { postcard: 'A postcard', mug: 'A coffee mug', snowGlobe: 'A snow globe' },
    keepsakeCaption: (item, name, calls) => `${item} from ${name} · ${calls} ${calls === 1 ? 'call' : 'calls'}`,
    lampOffLabel: 'Turn the lamp off',
    lampOnLabel: 'Turn the lamp on',
    windowOpenLabel: 'Open the window',
    windowCloseLabel: 'Close the window',
    pokeLabel: 'Poke the keeper',
    napLabel: 'Send the keeper to nap on the bed',
    peekLabel: 'Peek outside the door',
    bookCaption: 'The keeper’s favourite book',
    plantCaption: 'The plant perks up',
    giggleCaption: 'Hehe!',
    grumpyCaption: 'Hmph! Enough poking.',
    napCaption: 'Napping on the bed',
    peekCaption: (weather) => `Peeking outside · ${weather}`,
    seatLabel: 'Sit the keeper on the window seat',
    seatCaption: (weather) => `Gazing out the window · ${weather}`,
    decorLabel: 'Room decorations',
    decorNames: {
      auto: 'Auto (by date)',
      none: 'None',
      spring: 'Spring',
      summer: 'Summer',
      autumn: 'Autumn',
      winter: 'Winter',
      ramadan: 'Ramadan',
      eid: 'Eid',
      newYear: 'New Year',
      birthday: 'Birthday',
    },
    ramadanGreeting: 'Ramadan Kareem',
    eidGreeting: 'Eid Mubarak',
    newYearGreeting: 'Happy New Year!',
    birthdayGreeting: (name) => `Happy birthday, ${name}!`,
    birthdayCakeLabel: (name) => `Call ${name} to say happy birthday`,
  },
  ar: {
    dir: 'rtl',
    slogan: 'أهلاً من الطرف التاني.',
    dockNames: {
      dial: 'القرص',
      contacts: 'جهات الاتصال',
      recents: 'الأخيرة',
      keeper: 'الحارس',
      sounds: 'نغمات',
      settings: 'الإعدادات',
    },
    readoutLabel: 'آخر رقم',
    callingLabel: 'الرقم',
    clearAria: 'امسحي الرقم',
    linePill: 'الخط مفتوح',
    handsetLift: 'دوسي على السماعة عشان تفتحي الخط',
    handsetHangup: 'اقفلي السماعة',
    incomingTag: 'مكالمة واردة',
    decline: 'رفض',
    mute: 'كتم',
    muteAria: 'كتم الميكروفون',
    clarity: 'وضوح',
    clarityAria: 'نضّفي صوت اللي بيتصل',
    end: 'إنهاء',
    endAria: 'إنهاء المكالمة',
    exampleNote: 'مثال لترجمة فورية',
    translatedLabel: 'الترجمة',
    youLabel: 'أنا',
    roomTitle: 'أوضة الحارس',
    roomBack: 'القرص',
    wallNote: 'اتصل بحد قريب',
    wallNoteBored: 'السكة ساكتة من شوية…',
    wallNoteHappy: 'فيه مكالمات كتير النهارده!',
    moodBadge: { bored: 'زهقان', happy: 'مبسوط' },
    moments: ['بيقرا بهدوء', 'بيدندن لحن', 'بيسلم عليك'],
    skyPrefix: 'جو اللي بيتصل',
    skyNames: {
      clear: 'صافي',
      rain: 'مطر',
      snow: 'تلج',
      storm: 'عاصفة',
    },
    contactsTitle: 'جهات الاتصال',
    recentsTitle: 'الأخيرة',
    callTypeNames: { incoming: 'واردة', outgoing: 'صادرة', missed: 'فايتة' },
    soundsTitle: 'نغمات',
    soundsHint: 'اختاري نغمة كل حد بيتصل',
    toneNames: { classic: 'كلاسيك', chime: 'رنة خفيفة', buzz: 'رنة قديمة', pulse: 'نبضة رقمية' },
    settingsTitle: 'الإعدادات',
    soundLabel: 'المؤثرات الصوتية',
    soundHint: 'صوت القرص، السماعة، والنغمات',
    privacyLabel: 'وضع الخصوصية',
    privacyHint: 'بيخفي الأرقام اللي اتطلبت والمكالمات الأخيرة',
    privacyHidden: 'مخفية أثناء وضع الخصوصية',
    advancedTitle: 'إعدادات متقدمة',
    advancedHint: 'اللغة ولون الجسم',
    languageLabel: 'اللغة',
    paletteLabel: 'لون الجسم',
    paletteNames: { oxblood: 'عنّابي', verdigris: 'أخضر نحاسي', ivory: 'عاجي', graphite: 'غرافيت' },
    callers: [
      { name: 'نادية', meta: 'بتسوق · مطر خفيف · 9:42 مساءً عندها', sky: 'rain', number: '0100 214 7788', keepsake: 'postcard', activity: 'driving', localHour: 21, birthday: '03-21' },
      { name: 'عمر', meta: 'في الشغل · جو صافي · 2:15 الضهر عنده', sky: 'clear', number: '0122 356 4190', keepsake: 'mug', activity: 'work', localHour: 14, birthday: '07-02' },
      { name: 'ماما', meta: 'في البيت · بينزل تلج · 11:05 بالليل عندها', sky: 'snow', number: '0111 908 2234', keepsake: 'snowGlobe', activity: 'home', localHour: 23, birthday: '11-05' },
    ],
    recents: [
      { callerIdx: 0, type: 'incoming', time: 'من دقيقتين', meta: 'بتسوق · مطر خفيف · 9:42 مساءً عندها', durationSec: 252 },
      { callerIdx: 1, type: 'outgoing', time: 'إمبارح', meta: 'في الجيم · جو صافي · 6:30 المغرب عنده', durationSec: 65 },
      { callerIdx: 2, type: 'missed', time: 'إمبارح', meta: 'في البيت · بينزل تلج · 11:20 بالليل عندها' },
      { callerIdx: 0, type: 'outgoing', time: 'الإتنين', meta: 'في البيت · جو صافي · 8:00 الصبح عندها', durationSec: 758 },
    ],
    formatCallDuration: (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
    },
    justNow: 'دلوقتي',
    minutesAgo: (minutes) => `من ${minutes} دقيقة`,
    hoursAgo: (hours) => `من ${hours} ساعة`,
    missedNoteLabel: (names) => `مكالمة فايتة من ${names}. افتحي الأخيرة`,
    keepsakeNames: { postcard: 'كارت بوستال', mug: 'مج قهوة', snowGlobe: 'كرة تلج' },
    keepsakeCaption: (item, name, calls) => `${item} من ${name} · ${calls === 1 ? 'مكالمة واحدة' : `${calls} مكالمات`}`,
    lampOffLabel: 'اطفي النور',
    lampOnLabel: 'نوّري النور',
    windowOpenLabel: 'افتحي الشباك',
    windowCloseLabel: 'اقفلي الشباك',
    pokeLabel: 'زغزغي الحارس',
    napLabel: 'خلّي الحارس ينام على السرير',
    peekLabel: 'بصّي برا الباب',
    bookCaption: 'الكتاب المفضل للحارس',
    plantCaption: 'النبتة فرحانة',
    giggleCaption: 'هيهي!',
    grumpyCaption: 'هممف! كفاية زغزغة.',
    napCaption: 'نايم على السرير',
    peekCaption: (weather) => `بيبص برا · ${weather}`,
    seatLabel: 'قعّدي الحارس على قعدة الشباك',
    seatCaption: (weather) => `بيتفرج من الشباك · ${weather}`,
    decorLabel: 'زينة الأوضة',
    decorNames: {
      auto: 'تلقائي (حسب التاريخ)',
      none: 'من غير',
      spring: 'ربيع',
      summer: 'صيف',
      autumn: 'خريف',
      winter: 'شتا',
      ramadan: 'رمضان',
      eid: 'العيد',
      newYear: 'رأس السنة',
      birthday: 'عيد ميلاد',
    },
    ramadanGreeting: 'رمضان كريم',
    eidGreeting: 'عيد مبارك',
    newYearGreeting: 'سنة سعيدة!',
    birthdayGreeting: (name) => `عيد ميلاد سعيد يا ${name}!`,
    birthdayCakeLabel: (name) => `اتصلي بـ${name} وقولي عيد ميلاد سعيد`,
  },
};
