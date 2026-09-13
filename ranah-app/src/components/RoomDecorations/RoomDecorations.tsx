import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { RoomDecor } from '../../state/decorations';
import { useReducedMotion } from '../../state/useReducedMotion';
import { CaseColours } from '../../theme/tokens';

// Drawn in the Keeper's room's 400x300 units. Garlands hang in two swags
// across the top wall, leaving the middle clear for the lamp and wall note.

// react-native-svg's Animated wrapper leaks `collapsable` to the DOM on web.
function stripCollapsable<P extends object>(Comp: React.ComponentType<P>) {
  return React.forwardRef<unknown, P & { collapsable?: boolean }>((props, ref) => {
    const { collapsable, ...rest } = props;
    return <Comp ref={ref as never} {...(rest as P)} />;
  });
}
const AnimatedG = Animated.createAnimatedComponent(stripCollapsable(G));

type Point = [number, number];

const SWAGS: { p0: Point; p1: Point; p2: Point }[] = [
  { p0: [8, 10], p1: [76, 26], p2: [146, 10] },
  { p0: [254, 10], p1: [322, 20], p2: [392, 10] },
];

// `count` evenly spaced points along each swag.
function swagPoints(count: number): Point[] {
  const points: Point[] = [];
  for (const { p0, p1, p2 } of SWAGS) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
      const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
      points.push([x, y]);
    }
  }
  return points;
}

const SWAG_PATH = SWAGS.map(({ p0, p1, p2 }) => `M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`).join(' ');

function starPath(cx: number, cy: number, r: number) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join(' L')} Z`;
}

const BUNTING: Record<'eid' | 'newYear' | 'birthday', string[]> = {
  eid: ['#3f7a5a', '#f3d78b', '#f5f0e4'],
  newYear: ['#f3d78b', '#cfd6e0', '#c0463c'],
  birthday: ['#e8907c', '#7fb3d5', '#f3d78b'],
};
const BULBS = ['#f3d78b', '#e8907c', '#7fb3d5', '#9fd19a'];
const LEAVES = ['#c0392b', '#d35400', '#e5a000', '#8e2f1f'];

// A maple leaf about 18 units tall, centred on (0,0) with its stem pointing
// down: five pointed lobes, a stem, and faint veins.
const MAPLE_LEAF =
  'M0 -10 L2 -5.5 L5 -7 L4.2 -2.6 L9 -3.6 L6.4 0 L8.2 2.4 L3.4 2.2 L4 6 L0.8 4.2 L0 5.2 L-0.8 4.2 L-4 6 L-3.4 2.2 L-8.2 2.4 L-6.4 0 L-9 -3.6 L-4.2 -2.6 L-5 -7 L-2 -5.5 Z';
const MAPLE_VEINS = 'M0 -7 L0 4.5 M0 1 L5.5 -2.5 M0 1 L-5.5 -2.5';
const LEAF_INK = 'rgba(60,20,10,0.45)';

function MapleLeaf({ transform, fill }: { transform: string; fill: string }) {
  return (
    <G transform={transform}>
      <Path d={MAPLE_LEAF} fill={fill} stroke={LEAF_INK} strokeWidth={0.5} strokeLinejoin="round" />
      <Path d={MAPLE_VEINS} stroke={LEAF_INK} strokeWidth={0.6} fill="none" strokeLinecap="round" />
      <Line x1={0} y1={4.5} x2={0} y2={9.5} stroke={LEAF_INK} strokeWidth={1} strokeLinecap="round" />
    </G>
  );
}
const BLOSSOMS = ['#f2b8c6', '#ffffff', '#f3d78b'];
const LANTERNS: { x: number; top: number }[] = [
  { x: 150, top: 44 },
  { x: 252, top: 58 },
];
const CANDLES = [54, 59, 64];
const CONFETTI: { x: number; y: number; color: string; angle: number }[] = [
  { x: 146, y: 70, color: '#f3d78b', angle: 20 },
  { x: 162, y: 96, color: '#e8907c', angle: -30 },
  { x: 238, y: 74, color: '#7fb3d5', angle: 45 },
  { x: 256, y: 104, color: '#f3d78b', angle: -15 },
  { x: 176, y: 118, color: '#9fd19a', angle: 60 },
  { x: 228, y: 124, color: '#e8907c', angle: 10 },
  { x: 140, y: 132, color: '#cfd6e0', angle: -50 },
  { x: 262, y: 138, color: '#9fd19a', angle: 35 },
];

// Alternating twinkle for string lights.
function useTwinkle(active: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, value]);
  return value;
}

interface RoomDecorationsProps {
  decor: RoomDecor;
  colours: CaseColours;
  // 'room' is drawn under the room's time-of-day tint; 'lights' (bulbs,
  // lantern glow, candle flames) on top, so they glow after dark.
  layer: 'room' | 'lights';
  doorOpen: boolean;
  night: boolean;
}

export function RoomDecorations({ decor, colours, layer, doorOpen, night }: RoomDecorationsProps) {
  const reduceMotion = useReducedMotion();
  const { season, holiday } = decor;
  const stringLights = season === 'winter' && !holiday;
  const twinkle = useTwinkle(layer === 'lights' && stringLights && !reduceMotion);

  if (layer === 'lights') {
    return (
      <G>
        {stringLights &&
          swagPoints(9).map(([x, y], i) => (
            <AnimatedG
              key={i}
              opacity={twinkle.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [1, 0.35] : [0.35, 1] })}
            >
              <Circle cx={x} cy={y + 3} r={4.5} fill={BULBS[i % BULBS.length]} opacity={night ? 0.35 : 0.18} />
              <Circle cx={x} cy={y + 3} r={2.2} fill={BULBS[i % BULBS.length]} />
            </AnimatedG>
          ))}
        {holiday === 'ramadan' &&
          LANTERNS.map(({ x, top }) => <Circle key={x} cx={x} cy={top + 11} r={16} fill="#f3c96b" opacity={night ? 0.28 : 0.12} />)}
        {holiday === 'birthday' &&
          CANDLES.map((x) => (
            <G key={x}>
              <Circle cx={x + 1.1} cy={228.5} r={4} fill="#f3c96b" opacity={night ? 0.3 : 0.15} />
              <Ellipse cx={x + 1.1} cy={229} rx={1.5} ry={2.6} fill="#f3c96b" />
            </G>
          ))}
      </G>
    );
  }

  const garland =
    holiday === 'ramadan'
      ? 'crescents'
      : holiday
        ? 'bunting'
        : season === 'winter'
          ? 'lights'
          : season === 'autumn'
            ? 'leaves'
            : season === 'spring'
              ? 'blossoms'
              : null;

  return (
    <G>
      {garland && <Path d={SWAG_PATH} stroke={colours.metal3} strokeWidth={1} fill="none" opacity={0.8} />}

      {garland === 'bunting' &&
        holiday &&
        holiday !== 'ramadan' &&
        swagPoints(7).map(([x, y], i) => (
          <Path key={i} d={`M${x - 4} ${y} L${x + 4} ${y} L${x} ${y + 7} Z`} fill={BUNTING[holiday][i % 3]} />
        ))}
      {garland === 'crescents' &&
        swagPoints(6).map(([x, y], i) =>
          i % 2 === 0 ? (
            <Path
              key={i}
              d={`M${x + 1.2} ${y + 0.5} A3.4 3.4 0 1 0 ${x + 1.2} ${y + 7.5} A2.6 2.6 0 1 1 ${x + 1.2} ${y + 0.5} Z`}
              fill="#f3d78b"
            />
          ) : (
            <Path key={i} d={starPath(x, y + 4, 3.4)} fill="#f3d78b" />
          )
        )}
      {garland === 'leaves' &&
        // Maple leaves hanging stem-up from the cord, tilted this way and that.
        // Large enough (0.85×) that the lobes read as maple, not as dots.
        swagPoints(6).map(([x, y], i) => (
          <MapleLeaf
            key={i}
            fill={LEAVES[i % LEAVES.length]}
            transform={`translate(${x.toFixed(1)} ${(y + 8).toFixed(1)}) rotate(${180 + (i % 2 ? 18 : -18)}) scale(0.85)`}
          />
        ))}
      {garland === 'blossoms' &&
        swagPoints(7).map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y + 2.5} r={2.6} fill={BLOSSOMS[i % BLOSSOMS.length]} />
            <Circle cx={x} cy={y + 2.5} r={1} fill="#f3d78b" />
          </G>
        ))}

      {season === 'spring' && (
        <G>
          {/* A vase of flowers on the windowsill, and a butterfly. */}
          <Line x1={102} y1={86} x2={100} y2={76} stroke="#4f7a4a" strokeWidth={1} />
          <Line x1={105} y1={86} x2={105} y2={72} stroke="#4f7a4a" strokeWidth={1} />
          <Line x1={108} y1={86} x2={110} y2={77} stroke="#4f7a4a" strokeWidth={1} />
          <Circle cx={100} cy={76} r={2.6} fill="#e8907c" />
          <Circle cx={105} cy={72} r={2.6} fill="#f3d78b" />
          <Circle cx={110} cy={77} r={2.6} fill="#f2b8c6" />
          <Path d="M100 98 L98 88 Q98 84 104 84 Q110 84 110 88 L108 98 Z" fill="#7fb3d5" />
          <G transform="rotate(-12 164 128)">
            <Ellipse cx={160} cy={126} rx={4} ry={3} fill="#f2b8c6" />
            <Ellipse cx={168} cy={126} rx={4} ry={3} fill="#f2b8c6" />
            <Ellipse cx={161} cy={131} rx={2.6} ry={2} fill="#e8907c" />
            <Ellipse cx={167} cy={131} rx={2.6} ry={2} fill="#e8907c" />
            <Line x1={164} y1={123} x2={164} y2={133} stroke="#3a2a20" strokeWidth={1} strokeLinecap="round" />
          </G>
        </G>
      )}
      {season === 'summer' && (
        <G>
          {/* Lemonade on the windowsill; a sun hat hung on the door. */}
          <Rect x={100} y={86} width={9} height={12} rx={1} fill="#f6e7a0" opacity={0.9} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.6} />
          <Line x1={106} y1={86} x2={110} y2={79} stroke="#c0463c" strokeWidth={1} strokeLinecap="round" />
          {!doorOpen && (
            <G>
              <Ellipse cx={350} cy={118} rx={18} ry={4} fill="#e8c98a" />
              <Path d="M340 118 Q342 106 350 106 Q358 106 360 118 Z" fill="#e8c98a" />
              <Rect x={341} y={113} width={18} height={3} fill="#c0463c" />
            </G>
          )}
        </G>
      )}
      {season === 'autumn' && (
        // A few maple leaves blown in, lying flat on the floor by the door.
        <G>
          <G transform="translate(306 265) scale(1 0.55)">
            <MapleLeaf fill={LEAVES[0]} transform="rotate(25) scale(0.7)" />
          </G>
          <G transform="translate(320 268) scale(1 0.55)">
            <MapleLeaf fill={LEAVES[2]} transform="rotate(-40) scale(0.6)" />
          </G>
          <G transform="translate(293 269) scale(1 0.55)">
            <MapleLeaf fill={LEAVES[1]} transform="rotate(70) scale(0.55)" />
          </G>
        </G>
      )}

      {holiday === 'ramadan' &&
        LANTERNS.map(({ x, top }) => (
          // A fanous: a cap, a faceted glass body, and a little point below.
          <G key={x}>
            <Line x1={x} y1={0} x2={x} y2={top} stroke={colours.metal3} strokeWidth={1} />
            <Path d={`M${x - 4} ${top + 4} L${x + 4} ${top + 4} L${x} ${top} Z`} fill={colours.metal2} />
            <Path
              d={`M${x - 5} ${top + 4} L${x + 5} ${top + 4} L${x + 6.5} ${top + 11} L${x + 5} ${top + 18} L${x - 5} ${top + 18} L${x - 6.5} ${top + 11} Z`}
              fill="#e7a83c"
              stroke={colours.metal2}
              strokeWidth={0.8}
            />
            <Line x1={x} y1={top + 4} x2={x} y2={top + 18} stroke={colours.metal2} strokeWidth={0.8} />
            <Line x1={x - 6.5} y1={top + 11} x2={x + 6.5} y2={top + 11} stroke={colours.metal2} strokeWidth={0.6} />
            <Path d={`M${x - 4} ${top + 18} L${x + 4} ${top + 18} L${x} ${top + 22} Z`} fill={colours.metal2} />
          </G>
        ))}
      {holiday === 'eid' && (
        // A plate of kahk, the Eid cookies, dusted with sugar.
        <G>
          <Ellipse cx={60} cy={262} rx={18} ry={4} fill="#e9e1d0" stroke={colours.metal3} strokeWidth={0.8} />
          {[
            [52, 258],
            [60, 256],
            [68, 258],
            [56, 252.5],
            [64, 252.5],
          ].map(([x, y]) => (
            <G key={`${x}-${y}`}>
              <Circle cx={x} cy={y} r={3.6} fill="#e8c98a" />
              <Circle cx={x - 1} cy={y - 1} r={0.6} fill="#ffffff" />
              <Circle cx={x + 1.2} cy={y + 0.6} r={0.5} fill="#ffffff" />
            </G>
          ))}
        </G>
      )}
      {holiday === 'newYear' &&
        CONFETTI.map(({ x, y, color, angle }) => (
          <Rect key={`${x}-${y}`} x={x - 2} y={y - 1} width={4} height={2} fill={color} transform={`rotate(${angle} ${x} ${y})`} />
        ))}
      {holiday === 'birthday' && (
        <G>
          {/* Balloons tied to the bed, and a cake with candles in front of it. */}
          <Path d="M30 160 Q34 174 38 186 M46 152 Q42 170 40 186" stroke={colours.metal3} strokeWidth={0.8} fill="none" />
          <Ellipse cx={30} cy={150} rx={8} ry={10} fill="#e8907c" />
          <Ellipse cx={46} cy={142} rx={8} ry={10} fill="#7fb3d5" />
          <Ellipse cx={27} cy={146} rx={2} ry={3} fill="#ffffff" opacity={0.4} />
          <Ellipse cx={43} cy={138} rx={2} ry={3} fill="#ffffff" opacity={0.4} />

          <Ellipse cx={60} cy={266} rx={18} ry={3} fill="#000000" opacity={0.18} />
          <Rect x={44} y={250} width={32} height={15} rx={3} fill="#f1e2d0" />
          <Rect x={44} y={250} width={32} height={5} rx={2.5} fill="#e8907c" />
          <Rect x={48} y={239} width={24} height={12} rx={3} fill="#f7ecde" />
          <Path d="M48 244 q3 3 6 0 q3 3 6 0 q3 3 6 0 q3 3 6 0" stroke="#e8907c" strokeWidth={2} fill="none" />
          {CANDLES.map((x, i) => (
            <Rect key={x} x={x} y={231} width={2.2} height={8} fill={BULBS[i % BULBS.length]} />
          ))}
        </G>
      )}
    </G>
  );
}
