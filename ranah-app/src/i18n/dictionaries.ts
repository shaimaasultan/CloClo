// Ported from the LANG.en / LANG.ar objects in dial-hollow.html — app-facing strings only
// (the prototype's dev-harness copy like eyebrow/lede/steps is dropped; it was never app UI).

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
  roomTitle: string;
  roomBack: string;
  wallNote: string;
  wallNoteBored: string;
  wallNoteHappy: string;
  moodBadge: { bored: string; happy: string };
  moments: string[];
  skyPrefix: string;
  skyNames: Record<'clear' | 'rain' | 'snow' | 'storm', string>;
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
    roomTitle: "Keeper's room",
    roomBack: 'Dial',
    wallNote: 'call someone soon',
    wallNoteBored: 'hasn’t rung in a while…',
    wallNoteHappy: 'so many calls today!',
    moodBadge: { bored: 'Bored', happy: 'Excited' },
    moments: ['Reading quietly', 'Humming a tune', 'Waving hello'],
    skyPrefix: 'Caller’s sky',
    skyNames: { clear: 'Clear', rain: 'Rain', snow: 'Snow', storm: 'Storm' },
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
  },
};
