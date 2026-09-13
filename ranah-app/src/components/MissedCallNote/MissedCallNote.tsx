import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useLang } from '../../state/LangContext';

interface MissedCallNoteProps {
  // Names of the callers whose missed calls haven't been seen yet, newest first.
  names: string[];
  onPress: () => void;
  size?: number;
}

// The keeper's sticky note for missed calls — the same note that's pinned to
// the door in the Keeper's room: the caller's initial, a red pin, and a
// count badge when several calls were missed. Tap it to open Recents.
export function MissedCallNote({ names, onPress, size = 48 }: MissedCallNoteProps) {
  const { t } = useLang();
  if (names.length === 0) return null;
  const initials = names
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join('');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.missedNoteLabel(names.join(', '))}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G transform="rotate(-6 20 20)">
          <Rect x={6} y={7} width={28} height={27} rx={2} fill="#f1dc72" />
          <Path d="M26 34 L34 26 L34 34 Z" fill="#d6bf55" />
          <Circle cx={20} cy={9} r={2.6} fill="#c0463c" />
          <SvgText x={20} y={27} textAnchor="middle" fontSize={initials.length > 1 ? 10 : 13} fontWeight="800" fill="#5a3a1a">
            {initials}
          </SvgText>
        </G>
        {names.length > 1 && (
          <G>
            <Circle cx={33} cy={8} r={6.5} fill="#c0463c" />
            <SvgText x={33} y={11.3} textAnchor="middle" fontSize={8.5} fontWeight="800" fill="#ffffff">
              {names.length}
            </SvgText>
          </G>
        )}
      </Svg>
    </Pressable>
  );
}
