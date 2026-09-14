import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { discardRecording } from '../audio/recordedTones';
import { forgetSound, playClunk, playDialReturn, playRingtone, playSfx, playTick, Sfx } from '../audio/tones';
import type { DecorChoice } from './decorations';
import { readPersisted, usePersist } from './persist';
import { dayKey } from './RemindersContext';
import { KeepsakeKind, ToneId } from '../i18n/dictionaries';

// Mirrors the prototype's soundEnabled / privacyMode flags and its
// contactTones map (contact id -> ringtone id, defaulting to 'classic').
const DEFAULT_CONTACT_TONES: Record<string, ToneId> = { nadia: 'classic', omar: 'chime', mama: 'buzz' };

interface SettingsValue {
  soundEnabled: boolean;
  toggleSound: () => void;
  privacyMode: boolean;
  togglePrivacy: () => void;
  toneForContact: (id: string) => ToneId;
  setContactTone: (id: string, tone: ToneId) => void;
  tick: () => void;
  clunk: (open: boolean) => void;
  // Room interaction sounds (giggles, lamp clicks, …), silent when sound is off.
  sfx: (name: Sfx) => void;
  // Keeper's room decorations: follow the date, or preview a season/holiday.
  decorChoice: DecorChoice;
  setDecorChoice: (choice: DecorChoice) => void;
  // Which keepsake each caller leaves on the shelf (like contactTones);
  // falls back to the contact's own default.
  keepsakeFor: (id: string, fallback: KeepsakeKind) => KeepsakeKind;
  setContactKeepsake: (id: string, kind: KeepsakeKind) => void;
  // "Haven't talked in a while" nudges: after how many days (0 = off), when
  // the count started for contacts never called in the app, and the day each
  // contact's nudge was last put off ("Not now").
  nudgeDays: number;
  setNudgeDays: (days: number) => void;
  nudgeSince: number;
  nudgeDismissed: Record<string, string>;
  dismissNudge: (id: string) => void;
  // Ringtones recorded with the microphone: a contact's file (phones) or
  // data: URL (web). Setting one also selects it; null deletes it.
  recordedToneFor: (id: string) => string | undefined;
  setRecordedTone: (id: string, uri: string | null) => void;
  // The rotary dial whirring home after a digit, one click per pulse.
  dialReturn: (digit: string) => void;
}

interface SavedSettings {
  soundEnabled: boolean;
  privacyMode: boolean;
  contactTones: Record<string, ToneId>;
  decorChoice: DecorChoice;
  keepsakeOverrides: Record<string, KeepsakeKind>;
  nudgeDays: number;
  nudgeSince: number;
  nudgeDismissed: Record<string, string>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Saved from the last session, if any.
  const [saved] = useState(() =>
    readPersisted<Partial<SavedSettings>>('settings', {}, (v) => typeof v === 'object' && v !== null)
  );
  const [soundEnabled, setSoundEnabled] = useState(saved.soundEnabled ?? true);
  const [privacyMode, setPrivacyMode] = useState(saved.privacyMode ?? false);
  const [contactTones, setContactTones] = useState({ ...DEFAULT_CONTACT_TONES, ...saved.contactTones });
  const [decorChoice, setDecorChoice] = useState<DecorChoice>(saved.decorChoice ?? 'auto');
  const [keepsakeOverrides, setKeepsakeOverrides] = useState<Record<string, KeepsakeKind>>(saved.keepsakeOverrides ?? {});
  const [nudgeDays, setNudgeDays] = useState(saved.nudgeDays ?? 7);
  const [nudgeSince] = useState(() => saved.nudgeSince ?? Date.now());
  const [nudgeDismissed, setNudgeDismissed] = useState<Record<string, string>>(saved.nudgeDismissed ?? {});
  // Kept apart from the other settings: recordings on the web are data: URLs
  // and much bigger than everything else.
  const [recordedTones, setRecordedTones] = useState<Record<string, string>>(() =>
    readPersisted('recordedTones', {}, (v) => typeof v === 'object' && v !== null)
  );
  usePersist('recordedTones', recordedTones);

  const toSave = useMemo<SavedSettings>(
    () => ({ soundEnabled, privacyMode, contactTones, decorChoice, keepsakeOverrides, nudgeDays, nudgeSince, nudgeDismissed }),
    [soundEnabled, privacyMode, contactTones, decorChoice, keepsakeOverrides, nudgeDays, nudgeSince, nudgeDismissed]
  );
  usePersist('settings', toSave);

  // "Not now" on a nudge: hide that contact's nudge for the rest of today.
  const dismissNudge = useCallback((id: string) => {
    setNudgeDismissed((prev) => ({ ...prev, [id]: dayKey(new Date()) }));
  }, []);

  const keepsakeFor = useCallback(
    (id: string, fallback: KeepsakeKind) => keepsakeOverrides[id] ?? fallback,
    [keepsakeOverrides]
  );
  const setContactKeepsake = useCallback((id: string, kind: KeepsakeKind) => {
    setKeepsakeOverrides((prev) => ({ ...prev, [id]: kind }));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      // Same confirmation blip the prototype plays when sound comes back on.
      if (!prev) playTick();
      return !prev;
    });
  }, []);

  const togglePrivacy = useCallback(() => setPrivacyMode((prev) => !prev), []);

  const toneForContact = useCallback(
    (id: string): ToneId => {
      const tone = contactTones[id] ?? 'classic';
      // A recorded tone whose recording is gone falls back to the bell.
      return tone === 'recorded' && !recordedTones[id] ? 'classic' : tone;
    },
    [contactTones, recordedTones]
  );

  const recordedToneFor = useCallback((id: string) => recordedTones[id], [recordedTones]);

  const setRecordedTone = useCallback((id: string, uri: string | null) => {
    setRecordedTones((prev) => {
      const old = prev[id];
      if (old && old !== uri) {
        forgetSound(old);
        discardRecording(old);
      }
      const next = { ...prev };
      if (uri) next[id] = uri;
      else delete next[id];
      return next;
    });
    // A new recording becomes their ringtone; deleting it goes back to the bell.
    setContactTones((prev) =>
      uri ? { ...prev, [id]: 'recorded' } : prev[id] === 'recorded' ? { ...prev, [id]: 'classic' } : prev
    );
  }, []);

  const setContactTone = useCallback(
    (id: string, tone: ToneId) => {
      setContactTones((prev) => ({ ...prev, [id]: tone }));
      if (soundEnabled) playRingtone(tone, recordedTones[id]);
    },
    [soundEnabled, recordedTones]
  );

  const tick = useCallback(() => {
    if (soundEnabled) playTick();
  }, [soundEnabled]);

  const dialReturn = useCallback(
    (digit: string) => {
      if (soundEnabled) playDialReturn(digit);
    },
    [soundEnabled]
  );

  const clunk = useCallback(
    (open: boolean) => {
      if (soundEnabled) playClunk(open);
    },
    [soundEnabled]
  );

  const sfx = useCallback(
    (name: Sfx) => {
      if (soundEnabled) playSfx(name);
    },
    [soundEnabled]
  );

  const value = useMemo<SettingsValue>(
    () => ({
      soundEnabled,
      toggleSound,
      privacyMode,
      togglePrivacy,
      toneForContact,
      setContactTone,
      tick,
      clunk,
      sfx,
      decorChoice,
      setDecorChoice,
      keepsakeFor,
      setContactKeepsake,
      nudgeDays,
      setNudgeDays,
      nudgeSince,
      nudgeDismissed,
      dismissNudge,
      recordedToneFor,
      setRecordedTone,
      dialReturn,
    }),
    [
      recordedToneFor,
      setRecordedTone,
      dialReturn,
      nudgeDays,
      nudgeSince,
      nudgeDismissed,
      dismissNudge,
      soundEnabled,
      toggleSound,
      privacyMode,
      togglePrivacy,
      toneForContact,
      setContactTone,
      tick,
      clunk,
      sfx,
      decorChoice,
      keepsakeFor,
      setContactKeepsake,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
