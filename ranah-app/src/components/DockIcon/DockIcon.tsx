import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type DockKey = 'dial' | 'contacts' | 'messages' | 'recents' | 'reminders' | 'keeper' | 'sounds' | 'settings';

interface DockIconProps {
  name: DockKey;
  size?: number;
  color: string;
}

// Ported from the dock-btn SVGs in dial-hollow.html — same paths, so the
// dock reads the same way it did in the prototype.
export function DockIcon({ name, size = 20, color }: DockIconProps) {
  const strokeProps = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  switch (name) {
    case 'dial':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Circle cx={7} cy={6} r={1.5} />
          <Circle cx={12} cy={6} r={1.5} />
          <Circle cx={17} cy={6} r={1.5} />
          <Circle cx={7} cy={12} r={1.5} />
          <Circle cx={12} cy={12} r={1.5} />
          <Circle cx={17} cy={12} r={1.5} />
          <Circle cx={7} cy={18} r={1.5} />
          <Circle cx={12} cy={18} r={1.5} />
          <Circle cx={17} cy={18} r={1.5} />
        </Svg>
      );
    case 'contacts':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={8.5} r={3.3} {...strokeProps} />
          <Path d="M5.5 20c1-4 4-5.6 6.5-5.6S17.5 16 18.5 20" {...strokeProps} />
        </Svg>
      );
    case 'recents':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8} {...strokeProps} />
          <Path d="M12 7.5V12l3 2" {...strokeProps} />
        </Svg>
      );
    case 'messages':
      // A speech bubble with two lines of text.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-9l-4 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"
            {...strokeProps}
          />
          <Path d="M8 10h8M8 13h5" {...strokeProps} />
        </Svg>
      );
    case 'reminders':
      // A bell.
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" {...strokeProps} />
          <Path d="M10.2 20.2a2 2 0 0 0 3.6 0" {...strokeProps} />
        </Svg>
      );
    case 'keeper':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 12 12 5l8 7" {...strokeProps} />
          <Path d="M6 10.5V19h12v-8.5" {...strokeProps} />
          <Path d="M10 19v-5h4v5" {...strokeProps} />
        </Svg>
      );
    case 'sounds':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 17V6.5l9-2v11" {...strokeProps} />
          <Circle cx={7} cy={17} r={2.2} {...strokeProps} />
          <Circle cx={16} cy={15.5} r={2.2} {...strokeProps} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3} {...strokeProps} />
          <Path
            d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"
            {...strokeProps}
          />
        </Svg>
      );
  }
}
