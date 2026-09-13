import type { Dictionary, Lang } from '../i18n/dictionaries';
import { dayKey, occursOn, Reminder } from '../state/RemindersContext';

// Reminders without a time still get a nudge, first thing in the morning.
export const ALL_DAY_ALERT = '09:00';

export interface PlannedAlert {
  // One per reminder, day and time, so the same alert never fires twice.
  key: string;
  reminderId: string;
  fireAt: Date;
  title: string;
  body: string;
  contactId: string | null;
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
    fireAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute),
    title: r.titles?.[lang] ?? r.title,
    body: [r.time ? t.clockTime(hour, minute) : t.reminderToday, name ? t.callNameAria(name) : null].filter(Boolean).join(' · '),
    contactId: name ? r.contactId : null,
  };
}

// Every alert still to come over the next `days`, soonest first, skipping
// days already ticked off. Capped because phones limit pending
// notifications (iOS keeps 64).
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
      if (!occursOn(r, day) || r.doneDates.includes(key)) continue;
      const alert = buildAlert(r, day, t, lang, contactName);
      if (alert.fireAt > now) alerts.push(alert);
    }
  }
  return alerts.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, limit);
}

// Today's alerts whose time has just come (within `graceMs`), not yet done.
// The grace lets an alert still show if the app was opened a little late.
export function dueAlerts(
  reminders: Reminder[],
  now: Date,
  t: Dictionary,
  lang: Lang,
  contactName: ContactName,
  graceMs = 10 * 60 * 1000
): PlannedAlert[] {
  const today = dayKey(now);
  return reminders
    .filter((r) => occursOn(r, now) && !r.doneDates.includes(today))
    .map((r) => buildAlert(r, now, t, lang, contactName))
    .filter((a) => a.fireAt <= now && now.getTime() - a.fireAt.getTime() < graceMs);
}
