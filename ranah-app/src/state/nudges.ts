import { useMemo } from 'react';
import type { Caller } from '../i18n/dictionaries';
import { useContacts } from './ContactsContext';
import { LoggedCall, useKeeperState } from './KeeperStateContext';
import { dayKey } from './RemindersContext';
import { useSettings } from './SettingsContext';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Nudge {
  contact: Caller;
  // Whole days since you last talked.
  days: number;
}

// The contact you've gone longest without talking to, once that's at least
// `nudgeDays` (0 turns nudges off), skipping anyone put off today. Only
// calls connected in the app count; for someone never called in the app,
// the count starts from `since`.
export function pickNudge(
  contacts: Caller[],
  callLog: LoggedCall[],
  nudgeDays: number,
  since: number,
  dismissed: Record<string, string>,
  now: Date
): Nudge | null {
  if (nudgeDays <= 0) return null;
  const today = dayKey(now);
  let best: Nudge | null = null;
  for (const contact of contacts) {
    if (dismissed[contact.id] === today) continue;
    // The call log is newest first.
    const last = callLog.find((c) => c.contactId === contact.id && c.type !== 'missed')?.at ?? since;
    const days = Math.floor((now.getTime() - last) / DAY_MS);
    if (days >= nudgeDays && (!best || days > best.days)) best = { contact, days };
  }
  return best;
}

export function useNudge(): Nudge | null {
  const { contacts } = useContacts();
  const { callLog } = useKeeperState();
  const { nudgeDays, nudgeSince, nudgeDismissed } = useSettings();
  // `contacts` refreshes every minute (their local times), which also keeps
  // "today" current here.
  return useMemo(
    () => pickNudge(contacts, callLog, nudgeDays, nudgeSince, nudgeDismissed, new Date()),
    [contacts, callLog, nudgeDays, nudgeSince, nudgeDismissed]
  );
}
