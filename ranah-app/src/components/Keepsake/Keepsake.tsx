import React from 'react';
import { Circle, G, Line, Path, Rect } from 'react-native-svg';
import type { KeepsakeKind } from '../../i18n/dictionaries';
import { CaseColours } from '../../theme/tokens';

export const KEEPSAKE_KINDS: KeepsakeKind[] = ['mug', 'postcard', 'snowGlobe', 'book', 'photo', 'shell'];

// A little object a caller leaves on the keeper's shelf. Drawn centred on
// x=0, standing on the shelf at y=46 (the Keeper's room units) — translate it
// into place. `excited` is the moment after a tap: the mug steams harder and
// the snow globe swirls.
export function Keepsake({ kind, colours, excited = false }: { kind: KeepsakeKind; colours: CaseColours; excited?: boolean }) {
  switch (kind) {
    case 'mug':
      return (
        <G>
          <Rect x={-6} y={32} width={13} height={14} rx={2} fill={colours.face} stroke={colours.metal3} strokeWidth={0.8} />
          <Path d="M7 35 q5 0 5 4.5 q0 4.5 -5 4.5" stroke={colours.metal3} strokeWidth={1.6} fill="none" />
          <Path
            d={excited ? 'M-2 29 q-2 -4 0 -8 M0.5 28 q-2 -5 0 -10 M3 29 q-2 -4 0 -8' : 'M-2 29 q-2 -3 0 -6 M3 29 q-2 -3 0 -6'}
            stroke={colours.face}
            strokeOpacity={excited ? 0.9 : 0.55}
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      );
    case 'postcard':
      return (
        <G transform="rotate(8 0 38)">
          <Rect x={-11} y={30} width={22} height={15} rx={1.5} fill="#e9f1f4" stroke={colours.metal3} strokeWidth={0.8} />
          <Rect x={4} y={32} width={5} height={6} fill="#c0463c" />
          <Line x1={-8} y1={37} x2={1} y2={37} stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={0.7} />
          <Line x1={-8} y1={40.5} x2={-1} y2={40.5} stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={0.7} />
        </G>
      );
    case 'snowGlobe':
      return (
        <G>
          <Circle cx={0} cy={33} r={9} fill="#dbe9f1" fillOpacity={0.85} stroke={colours.metal1} strokeWidth={0.8} />
          <Path d="M0 27 L-4.5 36 H4.5 Z" fill="#3f7a5a" />
          <Circle cx={-5} cy={30} r={0.9} fill="#ffffff" />
          <Circle cx={4.5} cy={28.5} r={0.9} fill="#ffffff" />
          <Circle cx={2.5} cy={36} r={0.9} fill="#ffffff" />
          {excited && (
            <G fill="#ffffff">
              <Circle cx={-3} cy={34} r={0.8} />
              <Circle cx={3} cy={31} r={0.8} />
              <Circle cx={-4} cy={38} r={0.8} />
              <Circle cx={1} cy={26} r={0.8} />
              <Circle cx={5.5} cy={35} r={0.8} />
            </G>
          )}
          <Rect x={-9} y={40} width={18} height={6} rx={2} fill={colours.metal3} />
        </G>
      );
    case 'book':
      // A small hardback standing up, with gold bands on the spine.
      return (
        <G transform="rotate(-5 0 46)">
          <Rect x={-5} y={24} width={10} height={22} rx={1.5} fill="#7fb3d5" stroke={colours.metal3} strokeWidth={0.8} />
          <Rect x={-5} y={28} width={10} height={2.4} fill="#f3d78b" />
          <Rect x={-5} y={40} width={10} height={2.4} fill="#f3d78b" />
          <Line x1={-2} y1={33} x2={2} y2={33} stroke="#2f4870" strokeWidth={0.8} />
        </G>
      );
    case 'photo':
      // A little framed photo with a heart, on a stand.
      return (
        <G>
          <Line x1={3} y1={44} x2={6} y2={46} stroke={colours.metal3} strokeWidth={1} strokeLinecap="round" />
          <Rect x={-9} y={28} width={18} height={16} rx={1.5} fill={colours.metal1} stroke={colours.metal3} strokeWidth={0.8} />
          <Rect x={-6} y={31} width={12} height={10} fill="#cfe3e2" />
          <Path d="M0 39 C-3 36.5 -3.5 34.4 -1.8 33.6 C-0.8 33.2 0 34 0 34.6 C0 34 0.8 33.2 1.8 33.6 C3.5 34.4 3 36.5 0 39 Z" fill="#e8907c" />
        </G>
      );
    case 'shell':
      // A fan-shaped seashell with ridges.
      return (
        <G>
          <Path d="M-8 45 Q-9.5 34 0 30 Q9.5 34 8 45 Z" fill="#f2c9b8" stroke="#c98f68" strokeWidth={0.8} strokeLinejoin="round" />
          <Path
            d="M0 45 L-6 36 M0 45 L-3 32.5 M0 45 L0 31 M0 45 L3 32.5 M0 45 L6 36"
            stroke="#c98f68"
            strokeWidth={0.6}
            fill="none"
            strokeLinecap="round"
          />
          <Rect x={-3} y={44} width={6} height={2} rx={1} fill="#c98f68" />
        </G>
      );
  }
}
