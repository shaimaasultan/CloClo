import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useLang } from '../../state/LangContext';

interface SnoozeStickerProps {
  // How many reminders are snoozed, and when the soonest comes back (epoch ms).
  count: number;
  nextAt: number;
  onPress: () => void;
  size?: number;
}

// A blue sticky note to go with the keeper's yellow missed-call note: a
// little clock and the time the next snoozed reminder comes back, with a
// count badge when several are snoozed. Tap it to open Reminders.
export function SnoozeSticker({ count, nextAt, onPress, size = 48 }: SnoozeStickerProps) {
  const { t } = useLang();
  if (count === 0) return null;
  const at = new Date(nextAt);
  const shortTime = `${at.getHours() % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.snoozeStickerLabel(count, t.clockTime(at.getHours(), at.getMinutes()))}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G transform="rotate(5 20 20)">
          <Rect x={6} y={7} width={28} height={27} rx={2} fill="#bcd9f2" />
          <Path d="M26 34 L34 26 L34 34 Z" fill="#94b9dc" />
          <Circle cx={20} cy={9} r={2.6} fill="#3d5a8a" />
          {/* The clock face and hands. */}
          <Circle cx={20} cy={19} r={5.5} fill="#f5f9fd" stroke="#2f4870" strokeWidth={1.2} />
          <Line x1={20} y1={19} x2={20} y2={15.8} stroke="#2f4870" strokeWidth={1.1} strokeLinecap="round" />
          <Line x1={20} y1={19} x2={22.4} y2={20.3} stroke="#2f4870" strokeWidth={1.1} strokeLinecap="round" />
          <SvgText x={20} y={31} textAnchor="middle" fontSize={7} fontWeight="800" fill="#2f4870">
            {shortTime}
          </SvgText>
        </G>
        {count > 1 && (
          <G>
            <Circle cx={33} cy={8} r={6.5} fill="#3d5a8a" />
            <SvgText x={33} y={11.3} textAnchor="middle" fontSize={8.5} fontWeight="800" fill="#ffffff">
              {count}
            </SvgText>
          </G>
        )}
      </Svg>
    </Pressable>
  );
}
