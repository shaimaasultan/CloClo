import type { Dictionary, Lang } from '../i18n/dictionaries';
import { dayKey, occursOn, parseDayKey, Reminder } from '../state/RemindersContext';

// Reminders without a time still get a nudge, first thing in the morning.
export const ALL_DAY_ALERT = '09:00';

export interface PlannedAlert {
  // One per reminder, day and time (or snooze), so an alert never fires twice.
  key: string;
  reminderId: string;
  // The reminder's day ("YYYY-MM-DD") this alert belongs to.
  day: string;
  fireAt: Date;
  title: string;
  body: string;
  contactId: string | null;
  // The single repeat of a snoozed reminder.
  snoozed: boolean;
}

type ContactName = (id: string | null) => string | null;

function buildAlert(r: Reminder, day: Date, t: Dictionary, lang: Lang, contactName: ContactName): PlannedAlert {
  const time = r.time || ALL_DAY_ALERT;
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(3, 5));
  const name = contactName(r.contactId);
  return {
    key: `${r.id}|${dayKey(day)}|${time}`,
    reminderId: r.id,
    day: dayKey(day),
    fireAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute),
    title: r.titles?.[lang] ?? r.title,
    body: [r.time ? t.clockTime(hour, minute) : t.reminderToday, name ? t.callNameAria(name) : null].filter(Boolean).join(' · '),
    contactId: name ? r.contactId : null,
    snoozed: false,
  };
}

// The repeat of a snoozed reminder, at its snooze time.
function buildSnoozeAlert(r: Reminder, t: Dictionary, lang: Lang, contactName: ContactName): PlannedAlert | null {
  if (!r.snooze) return null;
  const day = parseDayKey(r.snooze.day);
  if (!day) return null;
  return {
    ...buildAlert(r, day, t, lang, contactName),
    key: `${r.id}|${r.snooze.day}|snooze`,
    fireAt: new Date(r.snooze.at),
    snoozed: true,
  };
}

// Every alert still to come over the next `days`, soonest first, skipping
// days already ticked off. A snoozed day's alert is replaced by its snooze
// repeat. Capped because phones limit pending notifications (iOS keeps 64).
export function planAlerts(
  reminders: Reminder[],
  now: Date,
  t: Dictionary,
  lang: Lang,
  contactName: ContactName,
  days = 60,
  limit = 60
): PlannedAlert[] {
  const alerts: PlannedAlert[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(day);
    for (const r of reminders) {
      if (!occursOn(r, day) || r.doneDates.includes(key) || r.snooze?.day === key) continue;
      const alert = buildAlert(r, day, t, lang, contactName);
      if (alert.fireAt > now) alerts.push(alert);
    }
  }
  for (const r of reminders) {
    const repeat = buildSnoozeAlert(r, t, lang, contactName);
    if (repeat && repeat.fireAt > now && !r.doneDates.includes(repeat.day)) alerts.push(repeat);
  }
  return alerts.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, limit);
}

// Alerts whose time has just come (within `graceMs`) and whose reminder
// isn't done: today's first alerts (unless already snoozed) and any snooze
// repeats. The grace lets an alert still show if the app was opened late.
export function dueAlerts(
  reminders: Reminder[],
  now: Date,
  t: Dictionary,
  lang: Lang,
  contactName: ContactName,
  graceMs = 10 * 60 * 1000
): PlannedAlert[] {
  const today = dayKey(now);
  const alerts: PlannedAlert[] = [];
  for (const r of reminders) {
    if (occursOn(r, now) && !r.doneDates.includes(today) && r.snooze?.day !== today) {
      alerts.push(buildAlert(r, now, t, lang, contactName));
    }
    const repeat = buildSnoozeAlert(r, t, lang, contactName);
    if (repeat && !r.doneDates.includes(repeat.day)) alerts.push(repeat);
  }
  return alerts.filter((a) => a.fireAt <= now && now.getTime() - a.fireAt.getTime() < graceMs);
}
