import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { playClunk, playRingtone, playSfx, playTick, Sfx } from '../audio/tones';
import { ToneId } from '../i18n/dictionaries';

// Mirrors the prototype's soundEnabled / privacyMode flags and its
// contactTones map (caller index -> ringtone id, defaulting to 'classic').
const DEFAULT_CONTACT_TONES: Record<number, ToneId> = { 0: 'classic', 1: 'chime', 2: 'buzz' };

interface SettingsValue {
  soundEnabled: boolean;
  toggleSound: () => void;
  privacyMode: boolean;
  togglePrivacy: () => void;
  toneForContact: (idx: number) => ToneId;
  setContactTone: (idx: number, tone: ToneId) => void;
  tick: () => void;
  clunk: (open: boolean) => void;
  // Room interaction sounds (giggles, lamp clicks, …), silent when sound is off.
  sfx: (name: Sfx) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [contactTones, setContactTones] = useState(DEFAULT_CONTACT_TONES);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      // Same confirmation blip the prototype plays when sound comes back on.
      if (!prev) playTick();
      return !prev;
    });
  }, []);

  const togglePrivacy = useCallback(() => setPrivacyMode((prev) => !prev), []);

  const toneForContact = useCallback((idx: number) => contactTones[idx] ?? 'classic', [contactTones]);

  const setContactTone = useCallback(
    (idx: number, tone: ToneId) => {
      setContactTones((prev) => ({ ...prev, [idx]: tone }));
      if (soundEnabled) playRingtone(tone);
    },
    [soundEnabled]
  );

  const tick = useCallback(() => {
    if (soundEnabled) playTick();
  }, [soundEnabled]);

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
    () => ({ soundEnabled, toggleSound, privacyMode, togglePrivacy, toneForContact, setContactTone, tick, clunk, sfx }),
    [soundEnabled, toggleSound, privacyMode, togglePrivacy, toneForContact, setContactTone, tick, clunk, sfx]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
