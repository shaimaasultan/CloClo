// Ported from the case-colour palettes in dial-hollow.html (:root and [data-palette] blocks),
// plus later themes modelled on classic telephones.

export type PaletteName = 'oxblood' | 'verdigris' | 'ivory' | 'graphite' | 'midnight' | 'mustard' | 'mint' | 'rose';

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
  // The case colour carried into the keeper's world: their sweater (bright
  // enough to read on the dark dial hub) and the wash of colour on the room's wall.
  sweater: string;
  wallpaper: string;
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
    sweater: '#b0483d',
    wallpaper: '#6b2b26',
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
    sweater: '#3f8f73',
    wallpaper: '#1f3d34',
  },
  // Cream Bakelite on a dark espresso screen: the old tan screen washed out
  // the app's light text.
  ivory: {
    body1: '#d9c8a3',
    body2: '#2a2419',
    metal1: '#f3e6c4',
    metal2: '#c9a15c',
    metal3: '#8a6a2f',
    face: '#fbf6ea',
    ink: '#3a2e1c',
    inkMuted: '#8a7a5c',
    hub1: '#4a3d2a',
    hub2: '#241d14',
    highlight: '#f6dfa0',
    sweater: '#e3cf9f',
    wallpaper: '#b8a47c',
  },
  // A warm amber highlight, so graphite sits with the brass dial and the
  // room's warm props instead of clashing with them.
  graphite: {
    body1: '#2b2b2e',
    body2: '#131315',
    metal1: '#eceef3',
    metal2: '#b9bcc6',
    metal3: '#6b6b73',
    face: '#d8d8dc',
    ink: '#1a1a1c',
    inkMuted: '#6b6b73',
    hub1: '#232326',
    hub2: '#101012',
    highlight: '#ffd27a',
    sweater: '#8fa3c9',
    wallpaper: '#3a3a40',
  },
  // Deep navy with polished brass.
  midnight: {
    body1: '#1f2c4a',
    body2: '#0c1222',
    metal1: '#e9c98a',
    metal2: '#c49a52',
    metal3: '#7d5f2e',
    face: '#f1e8d6',
    ink: '#1a2236',
    inkMuted: '#5e6780',
    hub1: '#1a2440',
    hub2: '#0a1020',
    highlight: '#ffd98e',
    sweater: '#4a6fb0',
    wallpaper: '#1f2c4a',
  },
  // Golden Bakelite, like a 1970s desk phone.
  mustard: {
    body1: '#c8962a',
    body2: '#241a0a',
    metal1: '#f5dc9a',
    metal2: '#e0b24a',
    metal3: '#8a6418',
    face: '#fbf1d8',
    ink: '#2e2108',
    inkMuted: '#7d6a42',
    hub1: '#3b2c10',
    hub2: '#1c1506',
    highlight: '#ffe08a',
    sweater: '#e8a93a',
    wallpaper: '#9c7420',
  },
  // Pastel mint with chrome, like a 1950s diner phone.
  mint: {
    body1: '#7fb8a6',
    body2: '#13241f',
    metal1: '#eef4f1',
    metal2: '#c9d8d2',
    metal3: '#6f8a82',
    face: '#f4faf7',
    ink: '#16302a',
    inkMuted: '#5d766f',
    hub1: '#1d3530',
    hub2: '#0d1a17',
    highlight: '#b8f0dc',
    sweater: '#5fa38d',
    wallpaper: '#4f8a78',
  },
  // Dusty rose with soft chrome, after the classic Princess phone.
  rose: {
    body1: '#b9747f',
    body2: '#2a1519',
    metal1: '#f7e6e9',
    metal2: '#e3c6cb',
    metal3: '#8f6a70',
    face: '#fdf3f5',
    ink: '#3a1e24',
    inkMuted: '#86636a',
    hub1: '#3a2127',
    hub2: '#1c0f12',
    highlight: '#ffc2cc',
    sweater: '#d98c98',
    wallpaper: '#8f5560',
  },
};

export const PALETTE_ORDER: PaletteName[] = ['oxblood', 'verdigris', 'ivory', 'graphite', 'midnight', 'mustard', 'mint', 'rose'];

// Swatch fill for each palette picker button — the palette's body1 colour.
export const PALETTE_SWATCH_HEX: Record<PaletteName, string> = {
  oxblood: '#6b2b26',
  verdigris: '#1f3d34',
  ivory: '#d9c8a3',
  graphite: '#2b2b2e',
  midnight: '#1f2c4a',
  mustard: '#c8962a',
  mint: '#7fb8a6',
  rose: '#b9747f',
};

// Neutral app chrome (the light "prototype harness" page background is dropped —
// the app itself is always the dark phone-screen look, since that's the product).
export const APP_INK = '#efe6d3';
export const APP_INK_MUTED = 'rgba(239,230,211,.7)';
export const APP_SCREEN_BG = '#0b0a08';
