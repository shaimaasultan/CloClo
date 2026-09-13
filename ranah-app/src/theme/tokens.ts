// Ported from the case-colour palettes in dial-hollow.html (:root and [data-palette] blocks).

export type PaletteName = 'oxblood' | 'verdigris' | 'ivory' | 'graphite';

export interface CaseColours {
  body1: string;
  body2: string;
  metal1: string;
  metal2: string;
  metal3: string;
  face: string;
  ink: string;
  inkMuted: string;
  hub1: string;
  hub2: string;
  highlight: string;
}

export const PALETTES: Record<PaletteName, CaseColours> = {
  oxblood: {
    body1: '#6b2b26',
    body2: '#3c1512',
    metal1: '#e6c476',
    metal2: '#c9a24b',
    metal3: '#8a6a2f',
    face: '#ede3ce',
    ink: '#241e1a',
    inkMuted: '#6d6254',
    hub1: '#3a2e22',
    hub2: '#1c1712',
    highlight: '#f3d78b',
  },
  verdigris: {
    body1: '#1f3d34',
    body2: '#0f221c',
    metal1: '#a8d9c4',
    metal2: '#5fa88f',
    metal3: '#336354',
    face: '#e7f0ea',
    ink: '#16241e',
    inkMuted: '#5c6f67',
    hub1: '#1f322b',
    hub2: '#0e1815',
    highlight: '#bdeedd',
  },
  ivory: {
    body1: '#cbb994',
    body2: '#9c8a63',
    metal1: '#f3e6c4',
    metal2: '#cdae6e',
    metal3: '#8a6a2f',
    face: '#fbf6ea',
    ink: '#3a2e1c',
    inkMuted: '#8a7a5c',
    hub1: '#6b5a3c',
    hub2: '#3c3020',
    highlight: '#f6dfa0',
  },
  graphite: {
    body1: '#2b2b2e',
    body2: '#131315',
    metal1: '#e8e8ec',
    metal2: '#a9a9b2',
    metal3: '#6b6b73',
    face: '#d8d8dc',
    ink: '#1a1a1c',
    inkMuted: '#6b6b73',
    hub1: '#232326',
    hub2: '#101012',
    highlight: '#9fc2ff',
  },
};

export const PALETTE_ORDER: PaletteName[] = ['oxblood', 'verdigris', 'ivory', 'graphite'];

// Swatch fill for each palette picker button — the palette's body1 colour.
export const PALETTE_SWATCH_HEX: Record<PaletteName, string> = {
  oxblood: '#6b2b26',
  verdigris: '#1f3d34',
  ivory: '#cbb994',
  graphite: '#2b2b2e',
};

// Neutral app chrome (the light "prototype harness" page background is dropped —
// the app itself is always the dark phone-screen look, since that's the product).
export const APP_INK = '#efe6d3';
export const APP_INK_MUTED = 'rgba(239,230,211,.7)';
export const APP_SCREEN_BG = '#0b0a08';
