// Which seasonal and holiday decorations the Keeper's room shows.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Holiday = 'ramadan' | 'eid' | 'newYear' | 'birthday';
// What the Advanced settings picker can choose: follow the date, nothing,
// or preview any season or holiday.
export type DecorChoice = 'auto' | 'none' | Season | Holiday;

export interface RoomDecor {
  season: Season | null;
  holiday: Holiday | null;
  // For birthdays: which contact it is.
  birthdayId: string | null;
}

// Anyone whose birthday might be celebrated: id and "MM-DD" (or empty).
export interface BirthdayEntry {
  id: string;
  birthday: string;
}

export const DECOR_CHOICES: DecorChoice[] = [
  'auto',
  'none',
  'spring',
  'summer',
  'autumn',
  'winter',
  'ramadan',
  'eid',
  'newYear',
  'birthday',
];

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// Northern-hemisphere meteorological seasons.
export function seasonOf(date: Date): Season {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

// Today's month and day in the Islamic (Umm al-Qura) calendar, or null where
// the platform's Intl doesn't support that calendar (some native engines).
function islamicMonthDay(date: Date): { month: number; day: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' });
    if (!formatter.resolvedOptions().calendar.startsWith('islamic')) return null;
    const parts = formatter.formatToParts(date);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return month && day ? { month, day } : null;
  } catch {
    return null;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

// Is "MM-DD" today's date?
export function isBirthdayOn(birthday: string | undefined, date: Date = new Date()): boolean {
  return !!birthday && birthday === `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The holiday on a given date, if any.
export function holidayOn(date: Date, birthdays: BirthdayEntry[]): { holiday: Holiday; birthdayId: string | null } | null {
  const celebrant = birthdays.find((b) => isBirthdayOn(b.birthday, date));
  if (celebrant) return { holiday: 'birthday', birthdayId: celebrant.id };

  const hijri = islamicMonthDay(date);
  if (hijri) {
    // Ramadan is the 9th month; Eid al-Fitr opens Shawwal (10th) and Eid
    // al-Adha falls on 10–13 Dhu al-Hijjah (12th).
    if (hijri.month === 9) return { holiday: 'ramadan', birthdayId: null };
    if ((hijri.month === 10 && hijri.day <= 3) || (hijri.month === 12 && hijri.day >= 10 && hijri.day <= 13)) {
      return { holiday: 'eid', birthdayId: null };
    }
  }

  if ((date.getMonth() === 11 && date.getDate() === 31) || (date.getMonth() === 0 && date.getDate() === 1)) {
    return { holiday: 'newYear', birthdayId: null };
  }
  return null;
}

export function resolveDecor(choice: DecorChoice, date: Date, birthdays: BirthdayEntry[]): RoomDecor {
  if (choice === 'none') return { season: null, holiday: null, birthdayId: null };
  const season = seasonOf(date);
  if (choice === 'auto') {
    const found = holidayOn(date, birthdays);
    return { season, holiday: found?.holiday ?? null, birthdayId: found?.birthdayId ?? null };
  }
  if ((SEASONS as string[]).includes(choice)) return { season: choice as Season, holiday: null, birthdayId: null };
  // Previewing a holiday: a birthday preview celebrates the first contact who has one.
  const first = birthdays.find((b) => b.birthday);
  return {
    season,
    holiday: choice as Holiday,
    birthdayId: choice === 'birthday' && first ? first.id : null,
  };
}
