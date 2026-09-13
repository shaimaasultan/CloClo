// Ported from the LANG.en / LANG.ar objects in dial-hollow.html — app-facing strings only
// (the prototype's dev-harness copy like eyebrow/lede/steps is dropped; it was never app UI).

import type { DecorChoice } from '../state/decorations';
import type { Repeat } from '../state/RemindersContext';

export type Lang = 'en' | 'ar';

// The wordmark stays Latin-script in every language — it's a name, not a
// word, so it doesn't get translated or transliterated.
export const APP_NAME = 'CloClo';

export interface Dictionary {
  dir: 'ltr' | 'rtl';
  slogan: string;
  dockNames: Record<'dial' | 'contacts' | 'recents' | 'reminders' | 'keeper' | 'sounds' | 'settings', string>;
  readoutLabel: string;
  callingLabel: string;
  clearAria: string;
  linePill: string;
  // Shown beside "Last dialed" / "Number" while a call is live.
  lineInUse: string;
  handsetLift: string;
  handsetHangup: string;
  incomingTag: string;
  decline: string;
  mute: string;
  unmute: string;
  // Added to "Line in use" while your microphone is muted.
  mutedTag: string;
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
  recents: RecentCall[];
  // Pieces of a contact's status line ("Driving · light rain · 9:42 PM their time").
  activityNames: Record<CallerActivity, string>;
  skyPhrases: Record<Caller['sky'], string>;
  theirTime: (hour: number, minute: number) => string;
  // Contacts: add, edit, delete.
  addContact: string;
  editContact: string;
  editContactAria: (name: string) => string;
  contactNameLabel: string;
  contactNumberLabel: string;
  birthdayLabel: string;
  birthdayMonth: string;
  birthdayDay: string;
  birthdayInvalid: string;
  activityLabel: string;
  weatherLabel: string;
  localHourLabel: string;
  earlierHour: string;
  laterHour: string;
  saveContact: string;
  deleteContact: string;
  deleteConfirm: (name: string) => string;
  keepContact: string;
  noContacts: string;
  // On a contact's birthday: a tag on their rows and cards, and the keeper's bubble.
  birthdayToday: string;
  // The "Birthdays today" reminder card on Contacts, and its note on the dial.
  birthdaysTitle: string;
  birthdaysHint: string;
  birthdayCall: string;
  birthdayReminder: (names: string, count: number) => string;
  // Credit line in every screen's footer.
  madeBy: (name: string) => string;
  // Reminders.
  clockTime: (hour: number, minute: number) => string;
  addReminder: string;
  editReminder: string;
  editReminderAria: (title: string) => string;
  reminderTitleLabel: string;
  reminderTitlePlaceholder: string;
  reminderDateLabel: string;
  reminderYear: string;
  reminderToday: string;
  reminderTomorrow: string;
  reminderTimeLabel: string;
  reminderHour: string;
  reminderMinute: string;
  reminderInvalidDate: string;
  reminderInvalidTime: string;
  repeatLabel: string;
  repeatNames: Record<Repeat, string>;
  reminderContactLabel: string;
  reminderNoContact: string;
  deleteReminder: string;
  deleteReminderConfirm: (title: string) => string;
  todayHeading: string;
  upcomingHeading: string;
  earlierHeading: string;
  nothingToday: string;
  nothingUpcoming: string;
  birthdayOf: (name: string) => string;
  reminderDue: string;
  callNameAria: (name: string) => string;
  // The "today's reminders" button on the dial.
  remindersToday: (count: number) => string;
  allDoneToday: string;
  // Short spoken-style call length, e.g. "4m 12s" / "4 د 12 ث".
  formatCallDuration: (seconds: number) => string;
  justNow: string;
  minutesAgo: (minutes: number) => string;
  hoursAgo: (hours: number) => string;
  daysAgo: (days: number) => string;
  // Accessibility label for the missed-call sticky note on the room's door.
  missedNoteLabel: (names: string) => string;
  keepsakeNames: Record<KeepsakeKind, string>;
  // Settings › Keepsakes: choose the object each caller leaves on the shelf.
  keepsakeShortNames: Record<KeepsakeKind, string>;
  keepsakesTitle: string;
  keepsakesHint: string;
  keepsakesLinkHint: string;
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
  // The keeper's speech bubble when they wave.
  helloBubble: string;
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
export type KeepsakeKind = 'postcard' | 'mug' | 'snowGlobe' | 'book' | 'photo' | 'shell';

export type CallerActivity = 'driving' | 'work' | 'home';

export type CallType = 'incoming' | 'outgoing' | 'missed';
export type ToneId = 'classic' | 'chime' | 'buzz' | 'pulse';

// A contact as the screens see it: name in the current language and a status
// line built from their activity, weather and local time.
export interface Caller {
  id: string;
  name: string;
  meta: string;
  sky: 'clear' | 'rain' | 'snow' | 'storm';
  number: string;
  keepsake: KeepsakeKind;
  // What they're up to and their local hour (0–23) — mirrors the "… their
  // time" in `meta`, and drives the keeper's props and the room's lighting.
  activity: CallerActivity;
  localHour: number;
  // "MM-DD" (or empty); on the day, the Keeper's room throws them a little party.
  birthday: string;
}

export interface RecentCall {
  contactId: string;
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
      reminders: 'Reminders',
      keeper: 'Keeper',
      sounds: 'Sounds',
      settings: 'Settings',
    },
    readoutLabel: 'Last dialed',
    callingLabel: 'Number',
    clearAria: 'Clear dialed number',
    linePill: 'Line open',
    lineInUse: 'Line in use',
    handsetLift: 'Lift handset to open the line',
    handsetHangup: 'Hang up',
    incomingTag: 'Incoming call',
    decline: 'Decline',
    mute: 'Mute',
    unmute: 'Unmute',
    mutedTag: 'Muted',
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
    recents: [
      { contactId: 'nadia', type: 'incoming', time: '2m ago', meta: 'Driving · light rain · 9:42 PM their time', durationSec: 252 },
      { contactId: 'omar', type: 'outgoing', time: 'Yesterday', meta: 'At the gym · clear skies · 6:30 PM their time', durationSec: 65 },
      { contactId: 'mama', type: 'missed', time: 'Yesterday', meta: 'At home · snow falling · 11:20 PM their time' },
      { contactId: 'nadia', type: 'outgoing', time: 'Monday', meta: 'At home · clear skies · 8:00 AM their time', durationSec: 758 },
    ],
    activityNames: { driving: 'Driving', work: 'At work', home: 'At home' },
    skyPhrases: { clear: 'clear skies', rain: 'light rain', snow: 'snow falling', storm: 'stormy' },
    theirTime: (hour, minute) =>
      `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'} their time`,
    addContact: 'Add contact',
    editContact: 'Edit contact',
    editContactAria: (name) => `Edit ${name}`,
    contactNameLabel: 'Name',
    contactNumberLabel: 'Number',
    birthdayLabel: 'Birthday',
    birthdayMonth: 'MM',
    birthdayDay: 'DD',
    birthdayInvalid: 'Enter a real month and day, or leave both empty',
    activityLabel: 'Usually',
    weatherLabel: 'Their weather',
    localHourLabel: 'Their local time',
    earlierHour: 'An hour earlier',
    laterHour: 'An hour later',
    saveContact: 'Save',
    deleteContact: 'Delete contact',
    deleteConfirm: (name) => `Delete ${name}? This can’t be undone.`,
    keepContact: 'Keep',
    noContacts: 'No contacts yet — add someone to call',
    birthdayToday: 'Birthday today',
    birthdaysTitle: 'Birthdays today',
    birthdaysHint: 'Give them a call to wish them a happy birthday',
    birthdayCall: 'Call',
    birthdayReminder: (names, count) => `${count === 1 ? 'Birthday today' : 'Birthdays today'} · ${names}`,
    madeBy: (name) => `CloClo · Made by ${name}`,
    clockTime: (hour, minute) => `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`,
    addReminder: 'Add reminder',
    editReminder: 'Edit reminder',
    editReminderAria: (title) => `Edit reminder: ${title}`,
    reminderTitleLabel: 'What to remember',
    reminderTitlePlaceholder: 'e.g. Call the dentist',
    reminderDateLabel: 'Date',
    reminderYear: 'YYYY',
    reminderToday: 'Today',
    reminderTomorrow: 'Tomorrow',
    reminderTimeLabel: 'Time (optional)',
    reminderHour: 'HH',
    reminderMinute: 'MM',
    reminderInvalidDate: 'Enter a real date',
    reminderInvalidTime: 'Enter a time like 09:30 (24-hour), or leave it empty',
    repeatLabel: 'Repeat',
    repeatNames: { none: 'Once', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' },
    reminderContactLabel: 'Someone to call',
    reminderNoContact: 'No one',
    deleteReminder: 'Delete reminder',
    deleteReminderConfirm: (title) => `Delete “${title}”? This can’t be undone.`,
    todayHeading: 'Today',
    upcomingHeading: 'Upcoming',
    earlierHeading: 'Earlier',
    nothingToday: 'Nothing to remember today',
    nothingUpcoming: 'No upcoming reminders',
    birthdayOf: (name) => `${name}’s birthday`,
    reminderDue: 'Due now',
    callNameAria: (name) => `Call ${name}`,
    remindersToday: (count) => (count === 1 ? '1 reminder today' : `${count} reminders today`),
    allDoneToday: 'All done for today',
    formatCallDuration: (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
    },
    justNow: 'Just now',
    minutesAgo: (minutes) => `${minutes}m ago`,
    hoursAgo: (hours) => `${hours}h ago`,
    daysAgo: (days) => (days === 1 ? 'Yesterday' : `${days}d ago`),
    missedNoteLabel: (names) => `Missed call from ${names}. Open Recents`,
    keepsakeNames: {
      postcard: 'A postcard',
      mug: 'A coffee mug',
      snowGlobe: 'A snow globe',
      book: 'A little book',
      photo: 'A photo frame',
      shell: 'A seashell',
    },
    keepsakeShortNames: { mug: 'Mug', postcard: 'Postcard', snowGlobe: 'Snow globe', book: 'Book', photo: 'Photo', shell: 'Shell' },
    keepsakesTitle: 'Keepsakes',
    keepsakesHint: 'Choose what each caller leaves on the keeper’s shelf',
    keepsakesLinkHint: 'The object each caller leaves on the shelf',
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
    helloBubble: 'Hello!',
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
      reminders: 'تذكيرات',
      keeper: 'الحارس',
      sounds: 'نغمات',
      settings: 'الإعدادات',
    },
    readoutLabel: 'آخر رقم',
    callingLabel: 'الرقم',
    clearAria: 'امسحي الرقم',
    linePill: 'الخط مفتوح',
    lineInUse: 'الخط شغّال',
    handsetLift: 'دوسي على السماعة عشان تفتحي الخط',
    handsetHangup: 'اقفلي السماعة',
    incomingTag: 'مكالمة واردة',
    decline: 'رفض',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
    mutedTag: 'مكتوم',
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
    recents: [
      { contactId: 'nadia', type: 'incoming', time: 'من دقيقتين', meta: 'بتسوق · مطر خفيف · 9:42 مساءً عندها', durationSec: 252 },
      { contactId: 'omar', type: 'outgoing', time: 'إمبارح', meta: 'في الجيم · جو صافي · 6:30 المغرب عنده', durationSec: 65 },
      { contactId: 'mama', type: 'missed', time: 'إمبارح', meta: 'في البيت · بينزل تلج · 11:20 بالليل عندها' },
      { contactId: 'nadia', type: 'outgoing', time: 'الإتنين', meta: 'في البيت · جو صافي · 8:00 الصبح عندها', durationSec: 758 },
    ],
    activityNames: { driving: 'في العربية', work: 'في الشغل', home: 'في البيت' },
    skyPhrases: { clear: 'جو صافي', rain: 'مطر خفيف', snow: 'بينزل تلج', storm: 'عاصفة' },
    theirTime: (hour, minute) =>
      `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'صباحاً' : 'مساءً'} عندهم`,
    addContact: 'إضافة جهة اتصال',
    editContact: 'تعديل جهة الاتصال',
    editContactAria: (name) => `تعديل ${name}`,
    contactNameLabel: 'الاسم',
    contactNumberLabel: 'الرقم',
    birthdayLabel: 'عيد الميلاد',
    birthdayMonth: 'شهر',
    birthdayDay: 'يوم',
    birthdayInvalid: 'اكتبي شهر ويوم صحيحين، أو سيبيهم فاضيين',
    activityLabel: 'غالباً',
    weatherLabel: 'الجو عندهم',
    localHourLabel: 'الساعة عندهم',
    earlierHour: 'ساعة بدري',
    laterHour: 'ساعة متأخر',
    saveContact: 'حفظ',
    deleteContact: 'مسح جهة الاتصال',
    deleteConfirm: (name) => `تمسحي ${name}؟ مش هينفع ترجعيه.`,
    keepContact: 'خليه',
    noContacts: 'لسه مفيش جهات اتصال — ضيفي حد تكلميه',
    birthdayToday: 'عيد الميلاد النهارده',
    birthdaysTitle: 'أعياد ميلاد النهارده',
    birthdaysHint: 'كلميهم وقوليلهم كل سنة وانتوا طيبين',
    birthdayCall: 'اتصلي',
    birthdayReminder: (names, count) => `${count === 1 ? 'عيد ميلاد النهارده' : 'أعياد ميلاد النهارده'} · ${names}`,
    madeBy: (name) => `CloClo · من صنع ${name}`,
    clockTime: (hour, minute) => `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'صباحاً' : 'مساءً'}`,
    addReminder: 'إضافة تذكير',
    editReminder: 'تعديل التذكير',
    editReminderAria: (title) => `تعديل التذكير: ${title}`,
    reminderTitleLabel: 'تفتكري إيه',
    reminderTitlePlaceholder: 'مثلاً: اتصلي بالدكتور',
    reminderDateLabel: 'التاريخ',
    reminderYear: 'سنة',
    reminderToday: 'النهارده',
    reminderTomorrow: 'بكرة',
    reminderTimeLabel: 'الساعة (اختياري)',
    reminderHour: 'ساعة',
    reminderMinute: 'دقيقة',
    reminderInvalidDate: 'اكتبي تاريخ صحيح',
    reminderInvalidTime: 'اكتبي ساعة زي 09:30 (نظام 24 ساعة)، أو سيبيها فاضية',
    repeatLabel: 'التكرار',
    repeatNames: { none: 'مرة واحدة', daily: 'كل يوم', weekly: 'كل أسبوع', monthly: 'كل شهر', yearly: 'كل سنة' },
    reminderContactLabel: 'حد تتصلي بيه',
    reminderNoContact: 'مفيش',
    deleteReminder: 'مسح التذكير',
    deleteReminderConfirm: (title) => `تمسحي «${title}»؟ مش هينفع ترجعيه.`,
    todayHeading: 'النهارده',
    upcomingHeading: 'الجاية',
    earlierHeading: 'اللي فات',
    nothingToday: 'مفيش حاجة تفتكريها النهارده',
    nothingUpcoming: 'مفيش تذكيرات جاية',
    birthdayOf: (name) => `عيد ميلاد ${name}`,
    reminderDue: 'جه وقته',
    callNameAria: (name) => `اتصلي بـ${name}`,
    remindersToday: (count) => (count === 1 ? 'تذكير واحد النهارده' : `${count} تذكيرات النهارده`),
    allDoneToday: 'خلصتي كل حاجة النهارده',
    formatCallDuration: (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
    },
    justNow: 'دلوقتي',
    minutesAgo: (minutes) => `من ${minutes} دقيقة`,
    hoursAgo: (hours) => `من ${hours} ساعة`,
    daysAgo: (days) => (days === 1 ? 'إمبارح' : `من ${days} يوم`),
    missedNoteLabel: (names) => `مكالمة فايتة من ${names}. افتحي الأخيرة`,
    keepsakeNames: {
      postcard: 'كارت بوستال',
      mug: 'مج قهوة',
      snowGlobe: 'كرة تلج',
      book: 'كتاب صغير',
      photo: 'برواز صورة',
      shell: 'صدفة',
    },
    keepsakeShortNames: { mug: 'مج', postcard: 'كارت', snowGlobe: 'كرة تلج', book: 'كتاب', photo: 'صورة', shell: 'صدفة' },
    keepsakesTitle: 'التذكارات',
    keepsakesHint: 'اختاري اللي كل حد بيسيبه على رف الحارس',
    keepsakesLinkHint: 'الحاجة اللي كل حد بيسيبها على الرف',
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
    helloBubble: 'أهلاً',
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
