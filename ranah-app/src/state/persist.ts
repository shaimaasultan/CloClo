import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

// What survives a restart: contacts, settings, language, case colour and
// call history (Recents and the missed-call note).
// Everything is read once before the app renders (see PersistGate), so each
// provider can start from its saved value without a flash of defaults.
export type PersistKey = 'contacts' | 'settings' | 'lang' | 'palette' | 'callLog' | 'missedNotes';

const KEYS: PersistKey[] = ['contacts', 'settings', 'lang', 'palette', 'callLog', 'missedNotes'];
const PREFIX = 'cloclo:';
const cache = new Map<string, unknown>();
let hydration: Promise<void> | null = null;

export function hydratePersisted(): Promise<void> {
  if (!hydration) {
    hydration = AsyncStorage.multiGet(KEYS.map((key) => PREFIX + key))
      .then((pairs) => {
        for (const [storageKey, raw] of pairs) {
          if (raw == null) continue;
          try {
            cache.set(storageKey.slice(PREFIX.length), JSON.parse(raw));
          } catch {
            // A corrupt entry just falls back to the default.
          }
        }
      })
      .catch(() => {
        // Storage unavailable (e.g. a private browser window): run with defaults.
      });
  }
  return hydration;
}

// The saved value, if it passes `isValid`; otherwise the fallback.
export function readPersisted<T>(key: PersistKey, fallback: T, isValid: (value: unknown) => boolean = () => true): T {
  const value = cache.get(key);
  return value !== undefined && isValid(value) ? (value as T) : fallback;
}

// Saves `value` whenever it changes.
export function usePersist(key: PersistKey, value: unknown) {
  useEffect(() => {
    const raw = JSON.stringify(value);
    cache.set(key, value);
    AsyncStorage.setItem(PREFIX + key, raw).catch(() => {});
  }, [key, value]);
}
