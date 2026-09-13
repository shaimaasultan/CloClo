import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { CallType } from '../../i18n/dictionaries';

// Small stroke icons lifted from the prototype's list screens (24x24 viewBox).

interface IconProps {
  color: string;
  size?: number;
}

export function ChevronIcon({ color, size = 14, direction, isRtl }: IconProps & { direction: 'back' | 'forward'; isRtl: boolean }) {
  // Chevrons point along the reading direction, so RTL flips them.
  const pointsLeft = (direction === 'back') !== isRtl;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={pointsLeft ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function PhoneIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 5c0-.6.4-1 1-1h2.2c.5 0 .9.3 1 .8l.8 3a1 1 0 0 1-.3 1L7 10.5a11 11 0 0 0 6.5 6.5l1.7-1.7a1 1 0 0 1 1-.3l3 .8c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1C10.4 20 4 13.6 4 6V5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CallTypeIcon({ color, size = 11, type }: IconProps & { type: CallType }) {
  // Outgoing points up-right (away); incoming and missed point back in.
  const d = type === 'outgoing' ? 'M8 16L16 8M9 8h7v7' : 'M16 8L8 16M15 16H8V9';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ToneIcon({ color, size = 11 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 5a11 11 0 0 1 14 0M8 9a6 6 0 0 1 8 0M12 13v.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
