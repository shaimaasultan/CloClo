import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readPersisted, usePersist } from './persist';

// The notifications file: one record per thing to tell this person about.
// Delivering a message writes two records — the message itself (in the
// messages file) and a notification here — and the notification is how the
// recipient finds out: they tap it, and read the message in Messages.
//
// Today it's saved on this device. Later each person's notifications live in
// their own file on a server (keyed by their user id), and a device only
// ever loads the file for the person using it.

export type InboxKind = 'message';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  // Who it's for (this device's user id) and who it's from (their contact id
  // for now; a user id once CloClo has accounts).
  to: string;
  from: string;
  messageId: string;
  // A copy of the message text, for the banner and the phone notification.
  text: string;
  at: number;
  // Shown once as a sound and a phone / browser notification.
  presented?: boolean;
  // Tapped or dismissed.
  seenAt?: number;
}

export type NewInboxItem = Omit<InboxItem, 'id' | 'presented' | 'seenAt'>;

// Old notifications drop off the end of the file.
const MAX_ITEMS = 100;

interface InboxValue {
  // Not yet seen, newest first.
  unseen: InboxItem[];
  addItem: (item: NewInboxItem) => void;
  markSeen: (id: string) => void;
  // Everything from one person, e.g. when their conversation is opened.
  markSeenFrom: (from: string) => void;
  markPresented: (id: string) => void;
}

const InboxContext = createContext<InboxValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InboxItem[]>(() => readPersisted('inbox', [], Array.isArray));
  usePersist('inbox', items);

  const unseen = useMemo(() => items.filter((item) => !item.seenAt).sort((a, b) => b.at - a.at), [items]);

  const addItem = useCallback((item: NewInboxItem) => {
    const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [{ ...item, id }, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const markSeen = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id && !item.seenAt ? { ...item, seenAt: Date.now() } : item)));
  }, []);

  const markSeenFrom = useCallback((from: string) => {
    setItems((prev) =>
      prev.some((item) => item.from === from && !item.seenAt)
        ? prev.map((item) => (item.from === from && !item.seenAt ? { ...item, seenAt: Date.now() } : item))
        : prev
    );
  }, []);

  const markPresented = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id && !item.presented ? { ...item, presented: true } : item)));
  }, []);

  const value = useMemo<InboxValue>(
    () => ({ unseen, addItem, markSeen, markSeenFrom, markPresented }),
    [unseen, addItem, markSeen, markSeenFrom, markPresented]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used within InboxProvider');
  return ctx;
}
