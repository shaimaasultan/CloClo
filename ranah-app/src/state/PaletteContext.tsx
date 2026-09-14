import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CaseColours, PALETTES, PaletteName } from '../theme/tokens';
import { readPersisted, usePersist } from './persist';

// How many case colours the header offers as quick picks; the rest live in
// Advanced settings.
const QUICK_COUNT = 3;
// Quick picks for a fresh install.
const DEFAULT_QUICK: PaletteName[] = ['oxblood', 'midnight', 'verdigris'];

const isPalette = (v: unknown): v is PaletteName => typeof v === 'string' && v in PALETTES;

// The quick picks with `current` guaranteed to be among them, filled up from
// the defaults and without duplicates.
function withCurrent(quick: PaletteName[], current: PaletteName): PaletteName[] {
  const list = quick.includes(current) ? quick : [current, ...quick];
  return [...new Set([...list, ...DEFAULT_QUICK])].slice(0, QUICK_COUNT);
}

interface PaletteContextValue {
  paletteName: PaletteName;
  colours: CaseColours;
  setPalette: (name: PaletteName) => void;
  // The three colours the header shows: the most recently used ones. Picking
  // one of them keeps their order; picking another (in Advanced settings)
  // replaces the least recently added.
  quickPalettes: PaletteName[];
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [paletteName, setPaletteName] = useState<PaletteName>(() => readPersisted<PaletteName>('palette', 'oxblood', isPalette));
  const [quickPalettes, setQuickPalettes] = useState<PaletteName[]>(() =>
    withCurrent(
      readPersisted<PaletteName[]>('paletteQuick', DEFAULT_QUICK, (v) => Array.isArray(v) && v.every(isPalette)),
      paletteName
    )
  );
  usePersist('palette', paletteName);
  usePersist('paletteQuick', quickPalettes);

  const setPalette = useCallback((name: PaletteName) => {
    setPaletteName(name);
    setQuickPalettes((prev) => (prev.includes(name) ? prev : withCurrent([name, ...prev].slice(0, QUICK_COUNT), name)));
  }, []);

  const value = useMemo<PaletteContextValue>(
    () => ({ paletteName, colours: PALETTES[paletteName], setPalette, quickPalettes }),
    [paletteName, setPalette, quickPalettes]
  );
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
