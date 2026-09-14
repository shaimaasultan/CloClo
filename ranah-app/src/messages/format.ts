import type { TextStyle } from 'react-native';
import type { Dictionary, Lang } from '../i18n/dictionaries';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const daysBetween = (at: number, now: number) => Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS);
const locale = (lang: Lang) => (lang === 'ar' ? 'ar-EG' : 'en-GB');

// A message's time in a list: "2:14 PM" today, "Yesterday", a weekday this
// week, then a short date.
export function messageTime(t: Dictionary, lang: Lang, at: number, now: number): string {
  const days = daysBetween(at, now);
  const d = new Date(at);
  if (days <= 0) return t.clockTime(d.getHours(), d.getMinutes());
  if (days === 1) return t.daysAgo(1);
  if (days < 7) return d.toLocaleDateString(locale(lang), { weekday: 'short' });
  return d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' });
}

// The divider above each day's messages in a conversation.
export function dayHeading(t: Dictionary, lang: Lang, at: number, now: number): string {
  const days = daysBetween(at, now);
  if (days <= 0) return t.todayHeading;
  if (days === 1) return t.daysAgo(1);
  return new Date(at).toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' });
}

// Each message reads in its own direction — Arabic right-aligned, English
// left-aligned — whatever the app's language.
export function textDirection(text: string): TextStyle {
  return /[؀-ۿ]/.test(text)
    ? { writingDirection: 'rtl', textAlign: 'right' }
    : { writingDirection: 'ltr', textAlign: 'left' };
}
