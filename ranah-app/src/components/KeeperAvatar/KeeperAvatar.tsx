import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { CaseColours } from '../../theme/tokens';

export type KeeperMood = 'neutral' | 'happy' | 'bored';

interface KeeperAvatarProps {
  size: number;
  colours: CaseColours;
  awake: boolean;
  mood?: KeeperMood;
  showUmbrella?: boolean;
  onPress?: () => void;
}

// Ported from the #avatar SVG group in dial-hollow.html. Local coordinate space
// matches the prototype's 200,200-centered avatar (viewBox 176..224) so future
// pieces (room-scale version, props) can reuse the same path data.
export function KeeperAvatar({
  size,
  colours,
  awake,
  mood = 'neutral',
  showUmbrella = false,
  onPress,
}: KeeperAvatarProps) {
  const mouthPath = !awake
    ? 'M197.5 202.5 q2.5 1.6 5 0'
    : mood === 'happy'
      ? 'M193.5 201.5 q6.5 6.5 13 0'
      : mood === 'bored'
        ? 'M196.5 204 q3.5 -2.5 7 0'
        : 'M196.5 202.5 q3.5 3 7 0';

  const content = (
    <Svg width={size} height={size} viewBox="176 176 48 48">
      {!awake && (
        <G opacity={0.55}>
          <SvgText x={222} y={168} fontSize={9} fill={colours.face} opacity={0.55}>
            z
          </SvgText>
          <SvgText x={230} y={160} fontSize={7} fill={colours.face} opacity={0.4}>
            z
          </SvgText>
        </G>
      )}
      <G transform={awake ? 'translate(0, -9)' : undefined}>
        {!awake && <Ellipse cx={200} cy={214} rx={17} ry={9} fill={colours.metal2} />}
        <Circle cx={200} cy={197} r={12.5} fill="#e8b98c" />
        <Path d="M188 191 a12.5 12.5 0 0 1 24 0 c0 -6 -5 -9 -12 -9 s-12 3 -12 9 z" fill="#3a2a20" />
        {awake ? (
          <G>
            <Circle cx={195.5} cy={197} r={1.6} fill="#241e1a" />
            <Circle cx={204.5} cy={197} r={1.6} fill="#241e1a" />
          </G>
        ) : (
          <G>
            <Path d="M193.5 197.5 q2 2 4 0" stroke="#3a2a20" strokeWidth={1.3} fill="none" strokeLinecap="round" />
            <Path d="M202.5 197.5 q2 2 4 0" stroke="#3a2a20" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          </G>
        )}
        <Path d={mouthPath} stroke="#3a2a20" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        {showUmbrella && (
          <G>
            <Path
              d="M203 181 a14 14 0 0 1 28 0 z"
              fill={colours.metal2}
              stroke={colours.metal3}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
            <Line x1={217} y1={181} x2={223} y2={205} stroke={colours.metal3} strokeWidth={1.3} strokeLinecap="round" />
            <Path
              d="M223 205 q3 3.5 6.5 1.5"
              stroke={colours.metal3}
              strokeWidth={1.3}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}
      </G>
    </Svg>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
