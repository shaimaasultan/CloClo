import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Caller, CallerActivity, KeepsakeKind, Lang } from '../i18n/dictionaries';
import { useLang } from './LangContext';

// A contact as stored. The starting contacts carry a name per language until
// they're edited; anyone added or renamed keeps the name as typed.
export interface Contact {
  id: string;
  name: string;
  names?: Partial<Record<Lang, string>>;
  number: string;
  birthday: string;
  activity: CallerActivity;
  sky: Caller['sky'];
  localHour: number;
  keepsake: KeepsakeKind;
}

export type ContactDraft = Omit<Contact, 'id' | 'names'>;

const SEED_CONTACTS: Contact[] = [
  { id: 'nadia', name: 'Nadia', names: { en: 'Nadia', ar: 'نادية' }, number: '0100 214 7788', birthday: '03-21', activity: 'driving', sky: 'rain', localHour: 21, keepsake: 'postcard' },
  { id: 'omar', name: 'Omar', names: { en: 'Omar', ar: 'عمر' }, number: '0122 356 4190', birthday: '07-02', activity: 'work', sky: 'clear', localHour: 14, keepsake: 'mug' },
  { id: 'mama', name: 'Mama', names: { en: 'Mama', ar: 'ماما' }, number: '0111 908 2234', birthday: '11-05', activity: 'home', sky: 'snow', localHour: 23, keepsake: 'snowGlobe' },
];

interface ContactsValue {
  // In the current language, with a live status line.
  contacts: Caller[];
  contactById: (id: string | null | undefined) => Caller | undefined;
  // The stored form, for the edit screen.
  rawContact: (id: string) => Contact | undefined;
  addContact: (draft: ContactDraft) => string;
  updateContact: (id: string, draft: ContactDraft) => void;
  removeContact: (id: string) => void;
}

const ContactsContext = createContext<ContactsValue | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang();
  const [stored, setStored] = useState<Contact[]>(SEED_CONTACTS);

  // "… 9:42 PM their time" uses the device's minutes, so tick each minute.
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  useEffect(() => {
    const id = setInterval(() => setMinute(new Date().getMinutes()), 30000);
    return () => clearInterval(id);
  }, []);

  const contacts = useMemo<Caller[]>(
    () =>
      stored.map((c) => ({
        id: c.id,
        name: c.names?.[lang] ?? c.name,
        meta: `${t.activityNames[c.activity]} · ${t.skyPhrases[c.sky]} · ${t.theirTime(c.localHour, minute)}`,
        sky: c.sky,
        number: c.number,
        keepsake: c.keepsake,
        activity: c.activity,
        localHour: c.localHour,
        birthday: c.birthday,
      })),
    [stored, lang, t, minute]
  );

  const contactById = useCallback(
    (id: string | null | undefined) => (id ? contacts.find((c) => c.id === id) : undefined),
    [contacts]
  );
  const rawContact = useCallback((id: string) => stored.find((c) => c.id === id), [stored]);

  const addContact = useCallback((draft: ContactDraft) => {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setStored((prev) => [...prev, { ...draft, id }]);
    return id;
  }, []);

  const updateContact = useCallback((id: string, draft: ContactDraft) => {
    setStored((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        // Renaming drops the per-language names; an untouched name keeps them.
        const names = draft.name === c.name ? c.names : undefined;
        return { ...draft, id, names };
      })
    );
  }, []);

  const removeContact = useCallback((id: string) => {
    setStored((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo<ContactsValue>(
    () => ({ contacts, contactById, rawContact, addContact, updateContact, removeContact }),
    [contacts, contactById, rawContact, addContact, updateContact, removeContact]
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used within ContactsProvider');
  return ctx;
}
