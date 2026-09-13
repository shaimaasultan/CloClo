import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Lang } from '../i18n/dictionaries';
import { readPersisted, usePersist } from './persist';

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export interface Reminder {
  id: string;
  title: string;
  // The starter reminder carries a title per language until it's renamed.
  titles?: Partial<Record<Lang, string>>;
  // First (or only) day, "YYYY-MM-DD".
  date: string;
  // "HH:MM", or '' for any time that day.
  time: string;
  repeat: Repeat;
  // Someone to call about it, if any.
  contactId: string | null;
  // Days ("YYYY-MM-DD") it was ticked off.
  doneDates: string[];
}

export type ReminderDraft = Omit<Reminder, 'id' | 'titles' | 'doneDates'>;

const pad = (n: number) => String(n).padStart(2, '0');
// Only the most recent ticks matter (today's, and a little history).
const DONE_HISTORY = 60;

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const clockKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// A real calendar date for "YYYY-MM-DD", or null.
export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

// Does the reminder fall on this day?
export function occursOn(r: Reminder, day: Date): boolean {
  const key = dayKey(day);
  const start = parseDayKey(r.date);
  if (!start || key < r.date) return false;
  switch (r.repeat) {
    case 'none':
      return key === r.date;
    case 'daily':
      return true;
    case 'weekly':
      return day.getDay() === start.getDay();
    case 'monthly':
      return day.getDate() === start.getDate();
    case 'yearly':
      return day.getMonth() === start.getMonth() && day.getDate() === start.getDate();
  }
}

// The next day after `day` it falls on, looking up to a year ahead.
export function nextOccurrenceAfter(r: Reminder, day: Date): Date | null {
  for (let i = 1; i <= 366; i++) {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate() + i);
    if (occursOn(r, d)) return d;
  }
  return null;
}

const SEED_REMINDERS: Reminder[] = [
  {
    id: 'call-mama',
    title: 'Call Mama',
    titles: { en: 'Call Mama', ar: 'كلمي ماما' },
    date: dayKey(new Date()),
    time: '20:00',
    repeat: 'weekly',
    contactId: 'mama',
    doneDates: [],
  },
];

interface RemindersValue {
  reminders: Reminder[];
  reminderById: (id: string) => Reminder | undefined;
  addReminder: (draft: ReminderDraft) => string;
  updateReminder: (id: string, draft: ReminderDraft) => void;
  removeReminder: (id: string) => void;
  // Tick a reminder off for one day, or untick it.
  toggleDone: (id: string, day: string) => void;
}

const RemindersContext = createContext<RemindersValue | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(() => readPersisted('reminders', SEED_REMINDERS, Array.isArray));
  usePersist('reminders', reminders);

  const reminderById = useCallback((id: string) => reminders.find((r) => r.id === id), [reminders]);

  const addReminder = useCallback((draft: ReminderDraft) => {
    const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setReminders((prev) => [...prev, { ...draft, id, doneDates: [] }]);
    return id;
  }, []);

  const updateReminder = useCallback((id: string, draft: ReminderDraft) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...draft, titles: draft.title === r.title ? r.titles : undefined } : r
      )
    );
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleDone = useCallback((id: string, day: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const doneDates = r.doneDates.includes(day)
          ? r.doneDates.filter((d) => d !== day)
          : [...r.doneDates, day].slice(-DONE_HISTORY);
        return { ...r, doneDates };
      })
    );
  }, []);

  const value = useMemo<RemindersValue>(
    () => ({ reminders, reminderById, addReminder, updateReminder, removeReminder, toggleDone }),
    [reminders, reminderById, addReminder, updateReminder, removeReminder, toggleDone]
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider');
  return ctx;
}
