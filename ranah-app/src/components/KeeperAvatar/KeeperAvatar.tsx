import React from 'react';
import { Pressable, View } from 'react-native';
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

  // `size` is still the footprint of the 48-unit character box (176..224),
  // but the drawing spills PAD units past it on every side so the umbrella
  // canopy and the zzz — which reach up to y=153 and out to x=232 — are no
  // longer sliced off by the viewBox edge.
  const PAD = 16;
  const drawSize = (size * (48 + PAD * 2)) / 48;
  const drawOffset = (-size * PAD) / 48;
  // With the umbrella up, the zzz drift out on the left instead of
  // colliding with the canopy on the right.
  const zzzX = showUmbrella ? [172, 164] : [222, 230];

  const content = (
    <View pointerEvents="none" style={{ width: size, height: size, overflow: 'visible' }}>
    <Svg
      width={drawSize}
      height={drawSize}
      viewBox={`${176 - PAD} ${176 - PAD} ${48 + PAD * 2} ${48 + PAD * 2}`}
      style={{ position: 'absolute', left: drawOffset, top: drawOffset }}
    >
      {!awake && (
        <G opacity={0.55}>
          <SvgText x={zzzX[0]} y={172} fontSize={9} fill={colours.face} opacity={0.55}>
            z
          </SvgText>
          <SvgText x={zzzX[1]} y={164} fontSize={7} fill={colours.face} opacity={0.4}>
            z
          </SvgText>
        </G>
      )}
      <G>
        {/* A small round body — chibi proportions, so the face reads as the
            biggest thing on the little person rather than a floating head. */}
        <Ellipse cx={200} cy={213} rx={14} ry={10} fill={colours.metal2} />
        <Ellipse cx={183} cy={211} rx={3.5} ry={6.5} fill={colours.metal2} transform="rotate(-15 183 211)" />
        <Ellipse cx={217} cy={211} rx={3.5} ry={6.5} fill={colours.metal2} transform="rotate(15 217 211)" />
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
            {/* Canopy: the same round dome as before, closed by a scalloped
                hem (four small arcs dipping below the rim) instead of a flat
                line, so it reads as ribbed fabric rather than a half-moon. */}
            {/* Shaft first so the canopy sits over its top end. */}
            <Line x1={217} y1={172} x2={223} y2={205} stroke={colours.metal3} strokeWidth={1.3} strokeLinecap="round" />
            <Path
              d="M223 205 q3 3.5 6.5 1.5"
              stroke={colours.metal3}
              strokeWidth={1.3}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M203 181 A14 14 0 0 1 231 181 A3.5 3.5 0 0 0 224 181 A3.5 3.5 0 0 0 217 181 A3.5 3.5 0 0 0 210 181 A3.5 3.5 0 0 0 203 181 Z"
              fill={colours.metal2}
              stroke={colours.metal3}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
            {/* Ribs fanning from the crown to each scallop point, plus a soft
                sheen on the left panel, so the canopy reads as stretched
                fabric over spokes. */}
            <Path
              d="M217 167 Q211 172 210 181 M217 167 L217 181 M217 167 Q223 172 224 181"
              stroke={colours.metal3}
              strokeWidth={0.5}
              strokeOpacity={0.8}
              fill="none"
              strokeLinecap="round"
            />
            <Path d="M206.5 178 Q208 171 213.5 168.5" stroke={colours.metal1} strokeWidth={1} strokeOpacity={0.7} fill="none" strokeLinecap="round" />
            <Line x1={217} y1={167} x2={217} y2={163} stroke={colours.metal3} strokeWidth={1} strokeLinecap="round" />
            <Circle cx={217} cy={162.6} r={0.9} fill={colours.metal1} />
          </G>
        )}
      </G>
    </Svg>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
