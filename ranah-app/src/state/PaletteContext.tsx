import React, { createContext, useContext, useMemo, useState } from 'react';
import { CaseColours, PALETTES, PaletteName } from '../theme/tokens';
import { readPersisted, usePersist } from './persist';

interface PaletteContextValue {
  paletteName: PaletteName;
  colours: CaseColours;
  setPalette: (name: PaletteName) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [paletteName, setPalette] = useState<PaletteName>(() =>
    readPersisted<PaletteName>('palette', 'oxblood', (v) => typeof v === 'string' && v in PALETTES)
  );
  usePersist('palette', paletteName);
  const value = useMemo<PaletteContextValue>(
    () => ({ paletteName, colours: PALETTES[paletteName], setPalette }),
    [paletteName]
  );
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
