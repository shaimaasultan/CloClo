import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setRainLevel } from '../src/audio/tones';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { CallInfoBar } from '../src/components/CallInfoBar/CallInfoBar';
import { DeclineButton } from '../src/components/DeclineButton/DeclineButton';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar, KeeperReaction, KeeperSpot } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
import { RoomDecorations } from '../src/components/RoomDecorations/RoomDecorations';
import { WeatherKind, WeatherLayer } from '../src/components/WeatherLayer/WeatherLayer';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';
import { useReducedMotion } from '../src/state/useReducedMotion';
import { resolveDecor } from '../src/state/decorations';
import { useCallContact } from '../src/state/useCallContact';
import type { KeepsakeKind } from '../src/i18n/dictionaries';
import { USE_NATIVE_DRIVER } from '../src/theme/animation';
import { pointer } from '../src/theme/pointer';
import { CaseColours } from '../src/theme/tokens';

const VB_W = 400;
const VB_H = 300;
// Time of day, from the prototype's paintSky(): dawn 5–7, day 7–17, dusk
// 17–20, night otherwise.
type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// The prototype's window gradients for each phase.
const WINDOW_SKIES: Record<DayPhase, [string, string, string]> = {
  dawn: ['#2c2440', '#6a4a53', '#caa06a'],
  day: ['#cfe3e2', '#eee4c8', '#e7d9ad'],
  dusk: ['#3a2436', '#8a4a52', '#caa24b'],
  night: ['#0c0f1a', '#161018', '#221a1e'],
};

// A tint laid over the room art for each phase. The keeper and the lamp sit
// above it, so at night they read as lit by the lamp in a dark room.
const ROOM_TINT: Record<DayPhase, string | null> = {
  dawn: 'rgba(60,40,90,0.16)',
  day: null,
  dusk: 'rgba(110,50,20,0.16)',
  night: 'rgba(8,12,36,0.45)',
};

// Light falling through the window onto the floor.
const WINDOW_BEAM: Record<DayPhase, { color: string; opacity: number }> = {
  dawn: { color: '#e8a060', opacity: 0.08 },
  day: { color: '#f3d78b', opacity: 0.07 },
  dusk: { color: '#e8a060', opacity: 0.08 },
  night: { color: '#b8c8f0', opacity: 0.05 },
};

const WATER = '#8fb4cc';
const WATER_LIGHT = '#d6e8f2';
const SNOW = '#f5f0e4';

// The keeper's feet rest on the rug at this height in the 400x300 room.
const FLOOR_Y = 268;
// Keeper height as a share of the room; small enough that the incoming-call
// card at the top of the room never covers their head, even arms-up.
const KEEPER_SHARE = 0.48;

// Where the keeper stands (or sits) for each spot, in room units: x is their
// centre, `ground` is where their feet rest.
const SPOTS: Record<KeeperSpot, { x: number; ground: number }> = {
  center: { x: 200, ground: FLOOR_Y },
  bed: { x: 72, ground: 206 },
  door: { x: 300, ground: FLOOR_Y },
  // Up on the cushioned window seat, in front of the window.
  seat: { x: 76, ground: 110 },
};

// Three pokes inside this window make the keeper grumpy.
const POKE_WINDOW_MS = 1800;
// A press that moves further than this is a drag; a shorter, quicker one is a poke.
const DRAG_THRESHOLD = 8;
const POKE_MAX_MS = 400;

// Rain loudness: a quiet patter through a shut window, much louder open.
const RAIN_LEVEL = { closed: 0.015, open: 0.06, openStorm: 0.09 };

type Slot = { x: number; y: number; w: number; h: number };

// Tap areas, in room units.
const LAMP_SLOT: Slot = { x: 178, y: 22, w: 44, h: 44 };
const WINDOW_SLOT: Slot = { x: 22, y: 22, w: 108, h: 80 };
const BED_SLOT: Slot = { x: 24, y: 182, w: 96, h: 54 };
const DOOR_SLOT: Slot = { x: 322, y: 116, w: 64, h: 150 };
const BOOK_SLOT: Slot = { x: 327, y: 18, w: 26, h: 30 };
const PLANT_SLOT: Slot = { x: 122, y: 200, w: 34, h: 70 };
const CAKE_SLOT: Slot = { x: 40, y: 224, w: 42, h: 46 };
const SEAT_SLOT: Slot = { x: 16, y: 98, w: 120, h: 26 };
// Tap areas for each keepsake on the shelf, around the book.
const SHELF_SLOTS: Record<KeepsakeKind, Slot> = {
  mug: { x: 279, y: 18, w: 25, h: 30 },
  postcard: { x: 303, y: 20, w: 24, h: 28 },
  snowGlobe: { x: 352, y: 16, w: 24, h: 32 },
};
// The door note's tap area.
const NOTE_SLOT: Slot = { x: 332, y: 126, w: 46, h: 48 };

// What each shelf item and the plant wobble around (their base).
const KEEPSAKE_PIVOT: Record<KeepsakeKind, [number, number]> = {
  mug: [290, 46],
  postcard: [316, 45],
  snowGlobe: [364, 46],
};
const BOOK_PIVOT: [number, number] = [340, 46];
const PLANT_PIVOT: [number, number] = [139, 268];

// react-native-svg's Animated wrapper injects `collapsable={false}` (a perf
// hint meant for RN Views); on web it leaks straight to the DOM as a
// non-boolean attribute warning. Strip it before it reaches the SVG node.
function stripCollapsable<P extends object>(Comp: React.ComponentType<P>) {
  return React.forwardRef<unknown, P & { collapsable?: boolean }>((props, ref) => {
    const { collapsable, ...rest } = props;
    return <Comp ref={ref as never} {...(rest as P)} />;
  });
}
const AnimatedRect = Animated.createAnimatedComponent(stripCollapsable(Rect));
const AnimatedCircle = Animated.createAnimatedComponent(stripCollapsable(Circle));
const AnimatedG = Animated.createAnimatedComponent(stripCollapsable(G));

function useFlicker(active: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    let cancelled = false;
    const cycle = () => {
      if (cancelled) return;
      Animated.sequence([
        Animated.delay(1200 + Math.random() * 2600),
        Animated.timing(value, { toValue: 0.5, duration: 60, useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration: 100, useNativeDriver: false }),
      ]).start(() => cycle());
    };
    cycle();
    return () => {
      cancelled = true;
      value.stopAnimation();
    };
  }, [active, value]);
  return value;
}

// A 0→1 loop, held at 0 when inactive.
function useLoop(active: boolean, duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [active, duration, value]);
  return value;
}

// A quick back-and-forth wobble for things that react to a tap.
function useWiggle() {
  const reduceMotion = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const play = useCallback(() => {
    if (reduceMotion) return;
    value.setValue(0);
    const step = (toValue: number) => Animated.timing(value, { toValue, duration: 70, useNativeDriver: false });
    Animated.sequence([step(1), step(-1), step(0.6), step(-0.4), step(0)]).start();
  }, [reduceMotion, value]);
  const rotate = value.interpolate({ inputRange: [-1, 1], outputRange: ['rotate(-12)', 'rotate(12)'] });
  return { rotate, play };
}

// Rotates its children around `pivot` (react-native-svg only animates one
// number per transform string reliably, so the pivot is static translates).
function Wobble({
  pivot,
  rotate,
  children,
}: {
  pivot: [number, number];
  rotate: Animated.AnimatedInterpolation<string>;
  children: React.ReactNode;
}) {
  return (
    <G transform={`translate(${pivot[0]} ${pivot[1]})`}>
      <AnimatedG transform={rotate}>
        <G transform={`translate(${-pivot[0]} ${-pivot[1]})`}>{children}</G>
      </AnimatedG>
    </G>
  );
}

function WindowWeather({ sky, clipId, phase }: { sky: WeatherKind; clipId: string; phase: DayPhase }) {
  const flash = useFlicker(sky === 'storm');
  const highlight = '#f3d78b';
  return (
    <G clipPath={`url(#${clipId})`}>
      {sky === 'clear' && phase === 'night' && (
        // A clear night: crescent moon and stars.
        <G>
          <Circle cx={96} cy={44} r={11} fill="#f1ead0" />
          <Circle cx={101} cy={40} r={10} fill="#11131f" />
          <G fill="#ffffff" opacity={0.8}>
            <Circle cx={40} cy={36} r={1.1} />
            <Circle cx={58} cy={50} r={0.9} />
            <Circle cx={46} cy={78} r={1} />
            <Circle cx={68} cy={34} r={0.8} />
            <Circle cx={110} cy={80} r={1} />
            <Circle cx={66} cy={86} r={0.9} />
          </G>
        </G>
      )}
      {sky === 'clear' && phase !== 'night' && (
        <G opacity={0.85}>
          <Circle cx={76} cy={58} r={15} fill={highlight} />
          <Line x1={76} y1={32} x2={76} y2={24} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={46} y1={58} x2={36} y2={58} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={106} y1={58} x2={116} y2={58} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={55} y1={37} x2={47} y2={29} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={97} y1={37} x2={105} y2={29} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={55} y1={79} x2={47} y2={87} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
          <Line x1={97} y1={79} x2={105} y2={87} stroke={highlight} strokeWidth={2} strokeLinecap="round" />
        </G>
      )}
      {(sky === 'rain' || sky === 'storm') && (
        <G opacity={0.55} stroke="#cfe3ea" strokeWidth={1.3} strokeLinecap="round">
          <Line x1={38} y1={28} x2={34} y2={44} />
          <Line x1={52} y1={28} x2={48} y2={44} />
          <Line x1={66} y1={28} x2={62} y2={44} />
          <Line x1={80} y1={28} x2={76} y2={44} />
          <Line x1={94} y1={28} x2={90} y2={44} />
          <Line x1={108} y1={28} x2={104} y2={44} />
          <Line x1={42} y1={54} x2={38} y2={70} />
          <Line x1={56} y1={54} x2={52} y2={70} />
          <Line x1={70} y1={54} x2={66} y2={70} />
          <Line x1={84} y1={54} x2={80} y2={70} />
          <Line x1={98} y1={54} x2={94} y2={70} />
          <Line x1={112} y1={54} x2={108} y2={70} />
        </G>
      )}
      {sky === 'snow' && (
        <G opacity={0.85} fill="#fff">
          <Circle cx={40} cy={36} r={2.2} />
          <Circle cx={58} cy={48} r={1.8} />
          <Circle cx={76} cy={32} r={2.4} />
          <Circle cx={94} cy={50} r={2} />
          <Circle cx={110} cy={38} r={1.6} />
          <Circle cx={46} cy={64} r={2} />
          <Circle cx={64} cy={74} r={1.6} />
          <Circle cx={84} cy={68} r={2.2} />
          <Circle cx={102} cy={62} r={1.8} />
        </G>
      )}
      {sky === 'storm' && <AnimatedRect x={28} y={26} width={96} height={72} fill="#fff" opacity={flash} />}
    </G>
  );
}

// The ceiling lamp: tap to switch it. When on, it stutters with each
// lightning strike in a storm and carries the room after dark.
function CeilingLamp({ colours, storm, lit, on }: { colours: CaseColours; storm: boolean; lit: boolean; on: boolean }) {
  const flicker = useFlicker(storm && on);
  return (
    <G>
      {on && lit && (
        // After dark the lamp carries the room: a wide glow and a warm pool
        // of light on the floor where the keeper stands.
        <G>
          <Circle cx={200} cy={44} r={52} fill={colours.highlight} opacity={0.1} />
          <Ellipse cx={200} cy={262} rx={112} ry={26} fill={colours.highlight} opacity={0.09} />
        </G>
      )}
      <Line x1={200} y1={0} x2={200} y2={34} stroke={colours.metal3} strokeWidth={2} />
      {on ? (
        <G>
          <AnimatedCircle
            cx={200}
            cy={44}
            r={20}
            fill={colours.highlight}
            opacity={flicker.interpolate({ inputRange: [0, 0.5], outputRange: [0.18, 0.03] })}
          />
          <AnimatedCircle
            cx={200}
            cy={44}
            r={9}
            fill={colours.highlight}
            opacity={flicker.interpolate({ inputRange: [0, 0.5], outputRange: [0.85, 0.25] })}
          />
        </G>
      ) : (
        <G>
          <Circle cx={200} cy={44} r={9} fill="#6b6250" />
          <Path d="M195 42 q5 -4 10 0" stroke="#8a806a" strokeWidth={1} fill="none" />
        </G>
      )}
    </G>
  );
}

// What the weather brings indoors: a sunbeam, a rain puddle by the door with
// a dripping umbrella, or snow blown in over the step with boots left out.
function RoomWeather({ colours, sky, phase }: { colours: CaseColours; sky: WeatherKind; phase: DayPhase }) {
  const reduceMotion = useReducedMotion();
  const wet = sky === 'rain' || sky === 'storm';
  const ripple = useLoop(wet && !reduceMotion, 1800);
  const drip = useLoop(wet && !reduceMotion, 1400);

  return (
    <G>
      {sky === 'clear' && (
        <Path d="M32 98 L120 98 L232 284 L70 284 Z" fill={WINDOW_BEAM[phase].color} opacity={WINDOW_BEAM[phase].opacity} />
      )}

      {wet && (
        <G>
          <Ellipse cx={342} cy={276} rx={38} ry={6} fill={WATER} opacity={0.42} />
          <G transform="translate(342 276)">
            <AnimatedG
              transform={ripple.interpolate({ inputRange: [0, 1], outputRange: ['scale(0.2)', 'scale(1)'] })}
              opacity={ripple.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })}
            >
              <Ellipse cx={0} cy={0} rx={30} ry={5} fill="none" stroke={WATER_LIGHT} strokeWidth={1.4} />
            </AnimatedG>
          </G>

          {/* Umbrella stand beside the door, still dripping. */}
          <Rect x={290} y={238} width={20} height={26} rx={3} fill={colours.metal3} />
          <Path d="M300 196 L294 234 L306 234 Z" fill={colours.body1} stroke={colours.metal3} strokeWidth={0.8} />
          <Line x1={300} y1={190} x2={300} y2={197} stroke={colours.metal3} strokeWidth={1.4} strokeLinecap="round" />
          <G transform="translate(300 266)">
            <AnimatedG
              transform={drip.interpolate({ inputRange: [0, 1], outputRange: ['translate(0, 0)', 'translate(0, 10)'] })}
              opacity={drip.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.9, 0.9, 0] })}
            >
              <Circle cx={0} cy={0} r={1.8} fill={WATER} />
            </AnimatedG>
          </G>
        </G>
      )}

      {sky === 'snow' && (
        <G>
          <Path d="M314 268 Q324 250 338 258 Q350 244 364 255 Q378 250 390 268 Z" fill={SNOW} />
          <Circle cx={330} cy={262} r={3} fill="#ffffff" opacity={0.8} />
          {/* Snowy boots kicked off by the door. */}
          <G fill="#5a4636">
            <Path d="M282 266 v-16 q0 -4 4 -4 h7 q4 0 4 4 v9 h6 q3 0 3 3 v4 Z" />
            <Path d="M306 266 v-16 q0 -4 4 -4 h7 q4 0 4 4 v9 h6 q3 0 3 3 v4 Z" />
          </G>
          <Rect x={282} y={245} width={15} height={4} rx={2} fill={SNOW} />
          <Rect x={306} y={245} width={15} height={4} rx={2} fill={SNOW} />
        </G>
      )}
    </G>
  );
}

// Little things callers leave behind, drawn on the shelf. `excited` is the
// moment after a tap: the mug steams harder, the snow globe swirls.
function Keepsake({ kind, colours, excited }: { kind: KeepsakeKind; colours: CaseColours; excited: boolean }) {
  switch (kind) {
    case 'mug':
      return (
        <G>
          <Rect x={284} y={32} width={13} height={14} rx={2} fill={colours.face} stroke={colours.metal3} strokeWidth={0.8} />
          <Path d="M297 35 q5 0 5 4.5 q0 4.5 -5 4.5" stroke={colours.metal3} strokeWidth={1.6} fill="none" />
          <Path
            d={excited ? 'M288 29 q-2 -4 0 -8 M290.5 28 q-2 -5 0 -10 M293 29 q-2 -4 0 -8' : 'M288 29 q-2 -3 0 -6 M293 29 q-2 -3 0 -6'}
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
        <G transform="rotate(8 316 38)">
          <Rect x={305} y={30} width={22} height={15} rx={1.5} fill="#e9f1f4" stroke={colours.metal3} strokeWidth={0.8} />
          <Rect x={320} y={32} width={5} height={6} fill="#c0463c" />
          <Line x1={308} y1={37} x2={317} y2={37} stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={0.7} />
          <Line x1={308} y1={40.5} x2={315} y2={40.5} stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={0.7} />
        </G>
      );
    case 'snowGlobe':
      return (
        <G>
          <Circle cx={364} cy={33} r={9} fill="#dbe9f1" fillOpacity={0.85} stroke={colours.metal1} strokeWidth={0.8} />
          <Path d="M364 27 L359.5 36 H368.5 Z" fill="#3f7a5a" />
          <Circle cx={359} cy={30} r={0.9} fill="#ffffff" />
          <Circle cx={368.5} cy={28.5} r={0.9} fill="#ffffff" />
          <Circle cx={366.5} cy={36} r={0.9} fill="#ffffff" />
          {excited && (
            <G fill="#ffffff">
              <Circle cx={361} cy={34} r={0.8} />
              <Circle cx={367} cy={31} r={0.8} />
              <Circle cx={360} cy={38} r={0.8} />
              <Circle cx={365} cy={26} r={0.8} />
              <Circle cx={369.5} cy={35} r={0.8} />
            </G>
          )}
          <Rect x={355} y={40} width={18} height={6} rx={2} fill={colours.metal3} />
        </G>
      );
  }
}

// A potted plant by the bed. Each tap it perks up and grows, then flowers.
function Plant({ growth }: { growth: number }) {
  return (
    <G>
      <Path d="M139 250 Q137 232 139 214" stroke="#4f7a4a" strokeWidth={2} fill="none" />
      <Ellipse cx={132} cy={236} rx={7} ry={3.5} fill="#5f9a55" transform="rotate(-30 132 236)" />
      <Ellipse cx={146} cy={230} rx={7} ry={3.5} fill="#5f9a55" transform="rotate(30 146 230)" />
      <Ellipse cx={133} cy={222} rx={6} ry={3} fill="#6fae62" transform="rotate(-35 133 222)" />
      {growth >= 1 && <Ellipse cx={146} cy={217} rx={6} ry={3} fill="#6fae62" transform="rotate(35 146 217)" />}
      {growth >= 2 && <Ellipse cx={134} cy={209} rx={5} ry={2.6} fill="#7cbf6d" transform="rotate(-40 134 209)" />}
      {growth >= 3 && (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle
              key={a}
              cx={139 + 5 * Math.cos((a * Math.PI) / 180)}
              cy={206 + 5 * Math.sin((a * Math.PI) / 180)}
              r={2.6}
              fill="#e8907c"
            />
          ))}
          <Circle cx={139} cy={206} r={2.6} fill="#f3d78b" />
        </G>
      )}
      <Path d="M128 250 L150 250 L146 268 L132 268 Z" fill="#b0643c" />
      <Rect x={126} y={247} width={26} height={5} rx={2} fill="#c47a4c" />
    </G>
  );
}

// The front door swung open, showing the caller's weather outside.
function OpenDoor({
  colours,
  sky,
  phase,
  skyGradientId,
  clipId,
}: {
  colours: CaseColours;
  sky: WeatherKind;
  phase: DayPhase;
  skyGradientId: string;
  clipId: string;
}) {
  return (
    <G>
      <Rect x={326} y={120} width={56} height={142} fill={`url(#${skyGradientId})`} />
      <G clipPath={`url(#${clipId})`}>
        {sky === 'clear' && phase !== 'night' && <Circle cx={354} cy={150} r={10} fill="#f3d78b" opacity={0.9} />}
        {sky === 'clear' && phase === 'night' && (
          <G>
            <Circle cx={360} cy={146} r={7} fill="#f1ead0" />
            <Circle cx={363.5} cy={143.5} r={6.4} fill="#11131f" />
          </G>
        )}
        {(sky === 'rain' || sky === 'storm') && (
          <G stroke="#cfe3ea" strokeWidth={1.3} strokeLinecap="round" opacity={0.65}>
            {[0, 1, 2, 3].flatMap((row) =>
              [0, 1, 2, 3].map((col) => {
                const x = 334 + col * 13 + (row % 2) * 6;
                const y = 128 + row * 30;
                return <Line key={`${row}-${col}`} x1={x} y1={y} x2={x - 3} y2={y + 12} />;
              })
            )}
          </G>
        )}
        {sky === 'snow' && (
          <G fill="#ffffff" opacity={0.9}>
            {[0, 1, 2, 3, 4].flatMap((row) =>
              [0, 1, 2].map((col) => (
                <Circle key={`${row}-${col}`} cx={336 + col * 17 + (row % 2) * 8} cy={132 + row * 24} r={1.8} />
              ))
            )}
          </G>
        )}
        {sky === 'storm' && <Path d="M360 126 L351 150 L358 150 L349 174" stroke="#f7f1c8" strokeWidth={2} fill="none" />}
        {/* The ground just outside. */}
        <Rect x={326} y={236} width={56} height={26} fill={sky === 'snow' ? SNOW : '#4a5a3e'} opacity={0.85} />
      </G>
      <Rect x={326} y={120} width={56} height={142} rx={2} fill="none" stroke={colours.metal2} strokeWidth={3} />
      {/* The door itself, swung in against the wall. */}
      <Path d="M382 120 L396 112 L396 270 L382 262 Z" fill={colours.body1} stroke={colours.metal3} strokeWidth={1} />
      <Circle cx={392} cy={196} r={2.2} fill={colours.metal1} />
    </G>
  );
}

// A sticky note pinned to the door with the missed caller's initial, and a
// count badge when several calls were missed.
function MissedNote({ initials, count }: { initials: string; count: number }) {
  return (
    <G>
      <G transform="rotate(-6 355 152)">
        <Rect x={340} y={138} width={30} height={28} rx={2} fill="#f1dc72" />
        <Path d="M362 166 L370 158 L370 166 Z" fill="#d6bf55" />
        <Circle cx={355} cy={140} r={2.6} fill="#c0463c" />
        <SvgText x={355} y={159} textAnchor="middle" fontSize={initials.length > 1 ? 10 : 13} fontWeight="800" fill="#5a3a1a">
          {initials}
        </SvgText>
      </G>
      {count > 1 && (
        <G>
          <Circle cx={371} cy={135} r={7} fill="#c0463c" />
          <SvgText x={371} y={138.5} textAnchor="middle" fontSize={9} fontWeight="800" fill="#ffffff">
            {count}
          </SvgText>
        </G>
      )}
    </G>
  );
}

// Rough budget for the header (logo + settings pill) + dock + info row above
// the stage, so the outdoor weather layer's sun doesn't render under that chrome.
const CHROME_HEIGHT = 225;

export default function KeeperRoomScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const {
    callState,
    setCallState,
    sky,
    mood,
    roomProp,
    cycleMoment,
    momentIndex,
    ringerIdx,
    missedNotes,
    connectedCallCount,
  } = useKeeperState();
  const { clunk, sfx, soundEnabled, decorChoice } = useSettings();
  const callContact = useCallContact();

  // Briefly replaces the moment caption after something in the room is tapped.
  const [shelfCaption, setShelfCaption] = useState<string | null>(null);
  useEffect(() => {
    if (!shelfCaption) return;
    const id = setTimeout(() => setShelfCaption(null), 3500);
    return () => clearTimeout(id);
  }, [shelfCaption]);

  // The phone's own hour, refreshed each minute, for lighting between calls.
  const [deviceHour, setDeviceHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setDeviceHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);

  // --- Things you can tap ---
  const [lampOn, setLampOn] = useState(true);
  const [windowOpen, setWindowOpen] = useState(false);
  const [keeperSpot, setKeeperSpot] = useState<KeeperSpot>('center');
  const [reaction, setReaction] = useState<KeeperReaction | null>(null);
  const [lookUp, setLookUp] = useState(false);
  const [plantGrowth, setPlantGrowth] = useState(0);
  const [excitedItem, setExcitedItem] = useState<KeepsakeKind | null>(null);
  const pokeTimes = useRef<number[]>([]);

  useEffect(() => {
    if (!reaction) return;
    const id = setTimeout(() => setReaction(null), reaction.kind === 'grumpy' ? 2600 : 1100);
    return () => clearTimeout(id);
  }, [reaction]);
  useEffect(() => {
    if (!lookUp) return;
    const id = setTimeout(() => setLookUp(false), 1400);
    return () => clearTimeout(id);
  }, [lookUp]);
  useEffect(() => {
    if (!excitedItem) return;
    const id = setTimeout(() => setExcitedItem(null), 2000);
    return () => clearTimeout(id);
  }, [excitedItem]);

  const mugWiggle = useWiggle();
  const postcardWiggle = useWiggle();
  const globeWiggle = useWiggle();
  const bookWiggle = useWiggle();
  const plantWiggle = useWiggle();
  const keepsakeWiggle: Record<KeepsakeKind, ReturnType<typeof useWiggle>> = {
    mug: mugWiggle,
    postcard: postcardWiggle,
    snowGlobe: globeWiggle,
  };

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  // Unique per mount so a stale screen left in the navigation stack can never
  // collide with this one's <Defs> ids (see the same note in RotaryDial).
  const uid = useId();
  const wallGradientId = `roomWallGrad-${uid}`;
  const windowGradientId = `windowGrad-${uid}`;
  const winClipId = `roomWinClip-${uid}`;
  const doorClipId = `roomDoorClip-${uid}`;

  const idle = callState === 'idle';
  const ringing = callState === 'ringing';
  const ringer = ringerIdx !== null ? t.callers[ringerIdx] : null;
  // While a call rings, the room takes on the caller's local time of day.
  const phase = dayPhase(ringer ? ringer.localHour : deviceHour);
  const windowSky = WINDOW_SKIES[phase];
  const tint = ROOM_TINT[phase];
  const wet = sky === 'rain' || sky === 'storm';

  // Seasonal and holiday decorations from today's date — or whatever is
  // being previewed in Advanced settings. Rechecked as the hour changes.
  const birthdayKey = t.callers.map((c) => c.birthday).join();
  const decor = useMemo(
    () => resolveDecor(decorChoice, new Date(), birthdayKey.split(',')),
    [decorChoice, deviceHour, birthdayKey]
  );
  const birthdayName = decor.birthdayIdx !== null ? t.callers[decor.birthdayIdx]?.name ?? null : null;
  const greeting =
    decor.holiday === 'ramadan'
      ? t.ramadanGreeting
      : decor.holiday === 'eid'
        ? t.eidGreeting
        : decor.holiday === 'newYear'
          ? t.newYearGreeting
          : decor.holiday === 'birthday' && birthdayName
            ? t.birthdayGreeting(birthdayName)
            : null;

  // A call always brings the keeper back to the middle of the room.
  const spot: KeeperSpot = idle ? keeperSpot : 'center';
  useEffect(() => {
    if (!idle) setKeeperSpot('center');
  }, [idle]);
  const doorOpen = spot === 'door';

  // Rain you can hear: a quiet patter with the window shut, louder open.
  // Only while this screen is showing — it fades when you leave the room.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const rainLevel =
    focused && soundEnabled && wet
      ? windowOpen
        ? sky === 'storm'
          ? RAIN_LEVEL.openStorm
          : RAIN_LEVEL.open
        : RAIN_LEVEL.closed
      : 0;
  useEffect(() => {
    setRainLevel(rainLevel);
  }, [rainLevel]);
  useEffect(() => () => setRainLevel(0), []);

  // Answering opens the live call screen with its transcript.
  const answerCall = () => {
    clunk(true);
    setCallState('active');
    router.push('/call');
  };

  const declineCall = () => setCallState('idle');
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const showMoodBadge = mood !== 'neutral';
  const wallNote = !showMoodBadge ? t.wallNote : mood === 'bored' ? t.wallNoteBored : t.wallNoteHappy;

  const handleStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize({ width, height });
  };

  // Keep the room art and the Keeper overlaid on it in lockstep: rather than
  // stretching the 400x300 artwork to whatever shape the stage happens to be
  // (which either crops it or drifts the overlay off the floor), fit the
  // largest 4:3 box the available space allows and lay everything out inside
  // that box — nothing gets cut off, any leftover space just letterboxes.
  const boxW = stageSize.width > 0 && stageSize.height > 0 ? Math.min(stageSize.width, (stageSize.height * VB_W) / VB_H) : 0;
  const boxH = (boxW * VB_H) / VB_W;
  const keeperH = boxH * KEEPER_SHARE;
  const keeperW = (keeperH * 100) / 140;
  // The drawing's feet sit at y≈133 of its 140-unit height.
  const keeperTop = (boxH * FLOOR_Y) / VB_H - keeperH * (133 / 140);
  const keeperLeft = (boxW - keeperW) / 2;
  // While ringing, the handset hangs over the room's top edge (half in the
  // sky above, half over the wall) like the prototype's cradle over
  // .keeper-room, leaving the top of the room itself for the caller card.
  const handsetWidth = Math.min(boxW * 0.42, 200);
  const handsetHeight = handsetWidth * (94 / 220);
  const boxTop = (stageSize.height - boxH) / 2;
  const handsetTop = Math.max(0, boxTop - handsetHeight * 0.55);

  // Room units → pixels inside the fitted 4:3 box.
  const px = (x: number) => (x * boxW) / VB_W;
  const py = (y: number) => (y * boxH) / VB_H;

  // --- Moving the keeper between spots ---
  // The keeper is laid out at the centre spot and moved with a translate, so
  // dragging and gliding to the bed or door are the same animation.
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const offset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const spotOffset = (s: KeeperSpot) => ({
    x: px(SPOTS[s].x - SPOTS.center.x),
    y: py(SPOTS[s].ground - SPOTS.center.ground),
  });
  const glideTo = (s: KeeperSpot) => {
    const target = spotOffset(s);
    offset.current = target;
    Animated.parallel([
      Animated.spring(posX, { toValue: target.x, friction: 7, tension: 60, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(posY, { toValue: target.y, friction: 7, tension: 60, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };
  useEffect(() => {
    if (!dragging.current) glideTo(spot);
    // glideTo only reads layout values, which are dependencies here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, boxW, boxH]);

  const moveKeeper = (next: KeeperSpot) => {
    if (next === keeperSpot) {
      glideTo(next);
      return;
    }
    if (next === 'door') sfx('creak');
    setKeeperSpot(next);
  };

  const pokeKeeper = () => {
    const now = Date.now();
    pokeTimes.current = [...pokeTimes.current.filter((at) => now - at < POKE_WINDOW_MS), now];
    const wokenFromNap = keeperSpot === 'bed';
    if (pokeTimes.current.length >= 3 || wokenFromNap) {
      pokeTimes.current = [];
      setReaction({ kind: 'grumpy', at: now });
      setShelfCaption(t.grumpyCaption);
      sfx('grump');
      if (wokenFromNap) setKeeperSpot('center');
    } else {
      setReaction({ kind: 'giggle', at: now });
      setShelfCaption(t.giggleCaption);
      sfx('giggle');
    }
  };

  // Drag the keeper to the bed or the door; drop anywhere else and they
  // wander back to the middle. A quick press that doesn't move pokes them.
  //
  // One Pan that begins on press (like the rotary dial's) rather than a
  // Pan + Tap pair: on web the composed Pan never activated, so drags did
  // nothing. Telling a poke from a drag by distance here is reliable.
  const pressStartedAt = useRef(0);
  const keeperGesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(idle)
    .minDistance(0)
    // The finger leaves the keeper's own box almost as soon as a drag
    // starts; without this the gesture cancels and they snap back.
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      pressStartedAt.current = Date.now();
      dragging.current = false;
      posX.stopAnimation();
      posY.stopAnimation();
      dragStart.current = { ...offset.current };
    })
    .onUpdate((e) => {
      if (!dragging.current && Math.hypot(e.translationX, e.translationY) < DRAG_THRESHOLD) return;
      dragging.current = true;
      const x = dragStart.current.x + e.translationX;
      const y = dragStart.current.y + e.translationY;
      offset.current = { x, y };
      posX.setValue(x);
      posY.setValue(y);
    })
    .onFinalize(() => {
      if (dragging.current) {
        dragging.current = false;
        const feetX = ((keeperLeft + offset.current.x + keeperW / 2) * VB_W) / boxW;
        const feetY = ((keeperTop + offset.current.y + keeperH * (133 / 140)) * VB_H) / boxH;
        // Lifted high on the left lands on the window seat; low on the left is the bed.
        moveKeeper(feetX < 140 && feetY < 170 ? 'seat' : feetX < 125 ? 'bed' : feetX > 282 ? 'door' : 'center');
        return;
      }
      if (Date.now() - pressStartedAt.current <= POKE_MAX_MS) pokeKeeper();
    });

  const toggleLamp = () => {
    setLampOn((on) => !on);
    setLookUp(true);
    sfx('click');
  };
  const toggleWindow = () => {
    setWindowOpen((open) => !open);
    sfx('creak');
  };
  const tapBook = () => {
    bookWiggle.play();
    setShelfCaption(t.bookCaption);
    sfx('bump');
  };
  const tapPlant = () => {
    plantWiggle.play();
    setPlantGrowth((g) => Math.min(3, g + 1));
    setShelfCaption(t.plantCaption);
    sfx('rustle');
  };
  const tapKeepsake = (kind: KeepsakeKind, label: string) => {
    keepsakeWiggle[kind].play();
    setExcitedItem(kind);
    setShelfCaption(label);
    sfx(kind === 'snowGlobe' ? 'shimmer' : 'bump');
  };

  // A keepsake appears once you've actually talked with that caller.
  const keepsakes = t.callers
    .map((caller, idx) => ({ idx, kind: caller.keepsake, name: caller.name, calls: connectedCallCount(idx) }))
    .filter((k) => k.calls > 0);
  const missedNames = missedNotes.map((idx) => t.callers[idx]?.name).filter((name): name is string => !!name);
  const noteInitials = missedNames
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join('');

  const spotCaption =
    spot === 'bed'
      ? t.napCaption
      : spot === 'door'
        ? t.peekCaption(t.skyNames[sky])
        : spot === 'seat'
          ? t.seatCaption(t.skyNames[sky])
          : null;

  const hotspot = (key: string, slot: Slot, label: string, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ position: 'absolute', left: px(slot.x), top: py(slot.y), width: px(slot.w), height: py(slot.h) }}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <Dock active="keeper" />

        <View style={styles.infoRow}>
          <CallInfoBar />
        </View>

        <View style={styles.stage} onLayout={handleStageLayout}>
          {/* Tap-anywhere-to-cycle layer sits *behind* the room rather than
              wrapping it: the ringing handset is its own button, and a
              button nested inside another is invalid on web (and would
              cycle the keeper's moment every time the call is answered). */}
          <Pressable
            onPress={cycleMoment}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t.roomTitle}
          />
          {boxW > 0 && (
            <View style={[pointer.boxNone, { width: boxW, height: boxH, position: 'relative' }]}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="xMidYMid meet"
                style={pointer.none}
              >
                <Defs>
                  <RadialGradient id={wallGradientId} cx="50%" cy="28%" r="85%">
                    <Stop offset="0%" stopColor={colours.hub1} />
                    <Stop offset="100%" stopColor={colours.hub2} />
                  </RadialGradient>
                  <LinearGradient id={windowGradientId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={windowSky[0]} />
                    <Stop offset="55%" stopColor={windowSky[1]} />
                    <Stop offset="100%" stopColor={windowSky[2]} />
                  </LinearGradient>
                  <ClipPath id={winClipId}>
                    <Rect x={28} y={26} width={96} height={72} rx={8} />
                  </ClipPath>
                  <ClipPath id={doorClipId}>
                    <Rect x={326} y={120} width={56} height={142} />
                  </ClipPath>
                </Defs>

                <Rect x={0} y={0} width={VB_W} height={VB_H} fill={`url(#${wallGradientId})`} />
                <Ellipse cx={200} cy={270} rx={150} ry={20} fill={colours.body2} opacity={0.45} />

                <Rect x={28} y={26} width={96} height={72} rx={8} fill={`url(#${windowGradientId})`} stroke={colours.metal2} strokeWidth={3} />
                <WindowWeather sky={sky} clipId={winClipId} phase={phase} />
                {windowOpen ? (
                  <G>
                    {/* Casements swung open outward. */}
                    <Path d="M28 28 L14 36 L14 88 L28 96 Z" fill="rgba(207,227,226,0.25)" stroke={colours.metal2} strokeWidth={2} />
                    <Path d="M124 28 L138 36 L138 88 L124 96 Z" fill="rgba(207,227,226,0.25)" stroke={colours.metal2} strokeWidth={2} />
                    {wet && (
                      // Rain coming in over the sill.
                      <G fill={WATER}>
                        <Rect x={40} y={99} width={70} height={3} rx={1.5} opacity={0.5} />
                        <Circle cx={58} cy={105} r={1.6} />
                        <Circle cx={92} cy={107} r={1.4} />
                      </G>
                    )}
                  </G>
                ) : (
                  <G>
                    <Line x1={76} y1={26} x2={76} y2={98} stroke={colours.metal2} strokeWidth={2} />
                    <Line x1={28} y1={62} x2={124} y2={62} stroke={colours.metal2} strokeWidth={2} />
                  </G>
                )}

                {/* The window seat: a ledge on brackets with a long cushion. */}
                <Path d="M30 110 L30 122 L40 110 Z" fill={colours.metal3} />
                <Path d="M122 110 L122 122 L112 110 Z" fill={colours.metal3} />
                <Rect x={18} y={98} width={116} height={7} rx={2} fill={colours.metal2} />
                <Rect x={22} y={104} width={108} height={8} rx={4} fill={colours.body1} />
                <Line x1={58} y1={105} x2={58} y2={111} stroke={colours.body2} strokeOpacity={0.5} strokeWidth={1} />
                <Line x1={94} y1={105} x2={94} y2={111} stroke={colours.body2} strokeOpacity={0.5} strokeWidth={1} />

                <Rect x={276} y={46} width={96} height={7} rx={2} fill={colours.metal2} />
                <Wobble pivot={BOOK_PIVOT} rotate={bookWiggle.rotate}>
                  <Rect x={330} y={22} width={20} height={26} rx={2} transform="rotate(-6 340 35)" fill={colours.metal1} stroke={colours.metal3} strokeWidth={1} />
                </Wobble>
                {keepsakes.map((k) => (
                  <Wobble key={k.kind} pivot={KEEPSAKE_PIVOT[k.kind]} rotate={keepsakeWiggle[k.kind].rotate}>
                    <Keepsake kind={k.kind} colours={colours} excited={excitedItem === k.kind} />
                  </Wobble>
                ))}

                {/* Front door and mat, where the weather gets in. */}
                {doorOpen ? (
                  <OpenDoor colours={colours} sky={sky} phase={phase} skyGradientId={windowGradientId} clipId={doorClipId} />
                ) : (
                  <G>
                    <Rect x={326} y={120} width={56} height={142} rx={4} fill={colours.body1} stroke={colours.metal2} strokeWidth={3} />
                    <Rect x={336} y={132} width={36} height={44} rx={3} fill="none" stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={1.2} />
                    <Rect x={336} y={190} width={36} height={58} rx={3} fill="none" stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={1.2} />
                    <Circle cx={371} cy={196} r={3.2} fill={colours.metal1} />
                  </G>
                )}
                <Rect x={318} y={262} width={72} height={7} rx={3} fill={colours.metal3} opacity={0.75} />
                {!doorOpen && missedNames.length > 0 && <MissedNote initials={noteInitials} count={missedNames.length} />}

                <RoomWeather colours={colours} sky={sky} phase={phase} />

                <Rect x={26} y={186} width={92} height={48} rx={11} fill={colours.metal2} />
                <Ellipse cx={48} cy={194} rx={17} ry={11} fill={colours.face} />

                <Wobble pivot={PLANT_PIVOT} rotate={plantWiggle.rotate}>
                  <Plant growth={plantGrowth} />
                </Wobble>

                <RoomDecorations
                  decor={decor}
                  colours={colours}
                  layer="room"
                  doorOpen={doorOpen}
                  night={phase === 'night' || phase === 'dusk'}
                />

                {!ringing && (
                  // On a holiday the wall note becomes a greeting.
                  <SvgText
                    x={200}
                    y={18}
                    textAnchor="middle"
                    fontSize={greeting ? 10 : 9}
                    fontWeight={greeting ? '700' : undefined}
                    fill={greeting ? colours.highlight : colours.inkMuted}
                  >
                    {greeting ?? wallNote}
                  </SvgText>
                )}

                {tint && <Rect x={0} y={0} width={VB_W} height={VB_H} fill={tint} />}
                {/* With the lamp off the room dims — a lot after dark, a little by day. */}
                {!lampOn && (
                  <Rect x={0} y={0} width={VB_W} height={VB_H} fill={phase === 'day' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.3)'} />
                )}
                {!ringing && (
                  <CeilingLamp colours={colours} storm={sky === 'storm'} lit={phase === 'night' || phase === 'dusk'} on={lampOn} />
                )}
                <RoomDecorations
                  decor={decor}
                  colours={colours}
                  layer="lights"
                  doorOpen={doorOpen}
                  night={phase === 'night' || phase === 'dusk'}
                />
              </Svg>

              {/* Tap areas sit under the keeper, so the keeper wins where they overlap. */}
              {hotspot('window', WINDOW_SLOT, windowOpen ? t.windowCloseLabel : t.windowOpenLabel, toggleWindow)}
              {!ringing && hotspot('lamp', LAMP_SLOT, lampOn ? t.lampOffLabel : t.lampOnLabel, toggleLamp)}
              {hotspot('book', BOOK_SLOT, t.bookCaption, tapBook)}
              {hotspot('plant', PLANT_SLOT, t.plantCaption, tapPlant)}
              {keepsakes.map((k) => {
                const label = t.keepsakeCaption(t.keepsakeNames[k.kind], k.name, k.calls);
                return hotspot(`keepsake-${k.kind}`, SHELF_SLOTS[k.kind], label, () => tapKeepsake(k.kind, label));
              })}
              {idle && hotspot('bed', BED_SLOT, t.napLabel, () => moveKeeper(keeperSpot === 'bed' ? 'center' : 'bed'))}
              {idle && hotspot('seat', SEAT_SLOT, t.seatLabel, () => moveKeeper(keeperSpot === 'seat' ? 'center' : 'seat'))}
              {idle && hotspot('door', DOOR_SLOT, t.peekLabel, () => moveKeeper(keeperSpot === 'door' ? 'center' : 'door'))}
              {/* On someone's birthday, tap the cake to call them. */}
              {idle &&
                decor.holiday === 'birthday' &&
                decor.birthdayIdx !== null &&
                birthdayName &&
                hotspot('cake', CAKE_SLOT, t.birthdayCakeLabel(birthdayName), () => callContact(decor.birthdayIdx as number))}
              {!doorOpen && missedNames.length > 0 &&
                hotspot('missed-note', NOTE_SLOT, t.missedNoteLabel(missedNames.join(', ')), () => router.dismissTo('/recents'))}

              <GestureDetector gesture={keeperGesture}>
                <Animated.View
                  accessibilityRole="button"
                  accessibilityLabel={t.pokeLabel}
                  style={[
                    idle ? null : pointer.none,
                    {
                      position: 'absolute',
                      top: keeperTop,
                      left: keeperLeft,
                      width: keeperW,
                      height: keeperH,
                      transform: [{ translateX: posX }, { translateY: posY }],
                    },
                  ]}
                >
                  <KeeperAvatar
                    size={keeperH}
                    colours={colours}
                    callState={callState}
                    mood={mood}
                    sky={sky}
                    activity={roomProp}
                    variant="room"
                    callerActivity={ringer?.activity}
                    sleepy={phase === 'night'}
                    spot={spot}
                    reaction={reaction}
                    lookUp={lookUp}
                    shiverStrength={windowOpen && sky === 'storm' ? 2.2 : 1}
                  />
                </Animated.View>
              </GestureDetector>

              {/* Incoming call card, ported from the prototype's .incoming:
                  tag, caller name, their status line, and Decline. */}
              {ringing && ringer && (
                <View style={[styles.incomingCard, pointer.boxNone, { top: boxH * 0.03 }]}>
                  {/* Soft dark backdrop: the prototype's light text sat on a
                      night-dark room, but by day the window behind the card
                      is pale cream and would swallow the status line. */}
                  <View style={[styles.incomingBackdrop, pointer.boxNone]}>
                    <Text style={[styles.incomingTag, { color: `${colours.metal1}d9` }]}>{t.incomingTag}</Text>
                    <Text style={styles.incomingName}>{ringer.name}</Text>
                    <Text style={styles.incomingMeta}>{ringer.meta}</Text>
                    <View style={styles.declineWrap}>
                      <DeclineButton label={t.decline} onPress={declineCall} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* The vibrating handset — tap it to answer. */}
          {ringing && boxW > 0 && (
            <View
              style={[styles.ringingHandset, pointer.boxNone, { top: handsetTop, left: (stageSize.width - handsetWidth) / 2 }]}
            >
              <PhoneHandset
                width={handsetWidth}
                colours={colours}
                isRinging
                isOpen={false}
                fullHitArea
                accessibilityLabel={ringer ? `${t.incomingTag} · ${ringer.name}` : t.incomingTag}
                onPress={answerCall}
              />
            </View>
          )}
        </View>

        {/* Mood badge rides beside the caption, like the prototype's
            .hub-status row ("Bored · Reading quietly"). */}
        <View style={[styles.captionRow, { flexDirection: rowDir }]}>
          {(mood === 'bored' || mood === 'happy') && (
            <View style={[styles.moodBadge, mood === 'happy' ? styles.moodHappy : styles.moodBored]}>
              <Text style={[styles.moodBadgeText, mood === 'happy' && { color: colours.ink }]}>{t.moodBadge[mood]}</Text>
            </View>
          )}
          <Text style={styles.caption}>{shelfCaption ?? spotCaption ?? t.moments[momentIndex]}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  moodBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  moodHappy: { backgroundColor: '#f3d78b' },
  moodBored: { backgroundColor: 'rgba(255,255,255,.08)' },
  moodBadgeText: { fontSize: 10, fontWeight: '700', color: 'rgba(239,230,211,.7)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoRow: { paddingHorizontal: 16, paddingTop: 10 },
  ringingHandset: { position: 'absolute' },
  incomingCard: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12 },
  incomingBackdrop: {
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
    backgroundColor: 'rgba(11,10,8,.62)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  incomingTag: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: 'monospace' },
  incomingName: { color: '#f3ecdd', fontSize: 19, fontWeight: '800' },
  incomingMeta: {
    color: 'rgba(239,230,211,.7)',
    fontSize: 10,
    letterSpacing: 0.3,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  // Extra room above so the button's pulsing halo doesn't crowd the meta line.
  declineWrap: { marginTop: 6 },
  captionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  caption: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(239,230,211,.7)',
  },
});
