import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { CaseColours } from '../../theme/tokens';

interface LogoProps {
  size: number;
  colours: CaseColours;
}

// Two overlapping chimes for "Clo Clo" — two voices meeting on the line.
export function Logo({ size, colours }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={colours.body2} stroke={colours.metal3} strokeWidth={0.6} />
      <Circle cx={12.5} cy={16} r={7} fill="none" stroke={colours.metal1} strokeWidth={2.2} />
      <Circle cx={19.5} cy={16} r={7} fill="none" stroke={colours.metal2} strokeWidth={2.2} opacity={0.85} />
    </Svg>
  );
}
