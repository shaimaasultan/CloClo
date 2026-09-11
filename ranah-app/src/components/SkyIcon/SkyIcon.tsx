import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { WeatherKind } from '../WeatherLayer/WeatherLayer';

interface SkyIconProps {
  kind: WeatherKind;
  size?: number;
  color: string;
}

const cloudPath = 'M6 16.5a3.6 3.6 0 0 1 1-7 4.6 4.6 0 0 1 8.9-1.4A3.8 3.8 0 0 1 17.5 15c0 .5-.08.96-.23 1.4';

export function SkyIcon({ kind, size = 18, color }: SkyIconProps) {
  const strokeProps = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  switch (kind) {
    case 'clear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={5} {...strokeProps} />
          <Line x1={12} y1={2} x2={12} y2={4.5} {...strokeProps} />
          <Line x1={12} y1={19.5} x2={12} y2={22} {...strokeProps} />
          <Line x1={2} y1={12} x2={4.5} y2={12} {...strokeProps} />
          <Line x1={19.5} y1={12} x2={22} y2={12} {...strokeProps} />
          <Line x1={4.9} y1={4.9} x2={6.6} y2={6.6} {...strokeProps} />
          <Line x1={17.4} y1={17.4} x2={19.1} y2={19.1} {...strokeProps} />
          <Line x1={4.9} y1={19.1} x2={6.6} y2={17.4} {...strokeProps} />
          <Line x1={17.4} y1={6.6} x2={19.1} y2={4.9} {...strokeProps} />
        </Svg>
      );
    case 'rain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={cloudPath} {...strokeProps} />
          <Line x1={9} y1={18.5} x2={7.6} y2={21.5} {...strokeProps} />
          <Line x1={13} y1={18.5} x2={11.6} y2={21.5} {...strokeProps} />
        </Svg>
      );
    case 'snow':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={cloudPath} {...strokeProps} />
          <Line x1={8} y1={18} x2={8} y2={22} {...strokeProps} />
          <Line x1={6.2} y1={19.2} x2={9.8} y2={20.8} {...strokeProps} />
          <Line x1={9.8} y1={19.2} x2={6.2} y2={20.8} {...strokeProps} />
        </Svg>
      );
    case 'storm':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={cloudPath} {...strokeProps} />
          <Path d="M13 17.5 10 21.5h3.2l-1.8 3" {...strokeProps} />
        </Svg>
      );
  }
}
