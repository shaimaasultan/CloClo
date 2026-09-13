import { useRouter } from 'expo-router';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { CallInfoBar } from '../src/components/CallInfoBar/CallInfoBar';
import { DeclineButton } from '../src/components/DeclineButton/DeclineButton';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
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
import type { KeepsakeKind } from '../src/i18n/dictionaries';
import { pointer } from '../src/theme/pointer';
import { CaseColours } from '../src/theme/tokens';

const VB_W = 400;
const VB_H = 300;
// Static daytime window sky — the prototype paints this from a live clock
// (dawn/day/dusk/night); that time-of-day system doesn't exist yet here,
// so the window shows a fixed daytime gradient regardless of hour.
const WINDOW_SKY = ['#cfe3e2', '#eee4c8', '#e7d9ad'];

const WATER = '#8fb4cc';
const WATER_LIGHT = '#d6e8f2';
const SNOW = '#f5f0e4';

// The keeper's feet rest on the rug at this height in the 400x300 room.
const FLOOR_Y = 268;
// Keeper height as a share of the room; small enough that the incoming-call
// card at the top of the room never covers their head, even arms-up.
const KEEPER_SHARE = 0.48;

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

function WindowWeather({ sky, clipId }: { sky: WeatherKind; clipId: string }) {
  const flash = useFlicker(sky === 'storm');
  const highlight = '#f3d78b';
  return (
    <G clipPath={`url(#${clipId})`}>
      {sky === 'clear' && (
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

// The ceiling lamp; it stutters with each lightning strike in a storm.
function CeilingLamp({ colours, storm }: { colours: CaseColours; storm: boolean }) {
  const flicker = useFlicker(storm);
  return (
    <G>
      <Line x1={200} y1={0} x2={200} y2={34} stroke={colours.metal3} strokeWidth={2} />
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
  );
}

// What the weather brings indoors: a sunbeam, a rain puddle by the door with
// a dripping umbrella, or snow blown in over the step with boots left out.
function RoomWeather({ colours, sky }: { colours: CaseColours; sky: WeatherKind }) {
  const reduceMotion = useReducedMotion();
  const wet = sky === 'rain' || sky === 'storm';
  const ripple = useLoop(wet && !reduceMotion, 1800);
  const drip = useLoop(wet && !reduceMotion, 1400);

  return (
    <G>
      {sky === 'clear' && <Path d="M32 98 L120 98 L232 284 L70 284 Z" fill={colours.highlight} opacity={0.07} />}

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

// Tap areas for each keepsake on the shelf, in room units (around the book
// that already lives there).
const SHELF_SLOTS: Record<KeepsakeKind, { x: number; y: number; w: number; h: number }> = {
  mug: { x: 279, y: 18, w: 25, h: 30 },
  postcard: { x: 303, y: 20, w: 27, h: 28 },
  snowGlobe: { x: 352, y: 16, w: 24, h: 32 },
};
// The door note's tap area.
const NOTE_SLOT = { x: 332, y: 126, w: 46, h: 48 };

// Little things callers leave behind, drawn on the shelf.
function Keepsake({ kind, colours }: { kind: KeepsakeKind; colours: CaseColours }) {
  switch (kind) {
    case 'mug':
      return (
        <G>
          <Rect x={284} y={32} width={13} height={14} rx={2} fill={colours.face} stroke={colours.metal3} strokeWidth={0.8} />
          <Path d="M297 35 q5 0 5 4.5 q0 4.5 -5 4.5" stroke={colours.metal3} strokeWidth={1.6} fill="none" />
          <Path
            d="M288 29 q-2 -3 0 -6 M293 29 q-2 -3 0 -6"
            stroke={colours.face}
            strokeOpacity={0.55}
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
          <Rect x={355} y={40} width={18} height={6} rx={2} fill={colours.metal3} />
        </G>
      );
  }
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
  // Briefly replaces the moment caption after a keepsake is tapped.
  const [shelfCaption, setShelfCaption] = useState<string | null>(null);
  useEffect(() => {
    if (!shelfCaption) return;
    const id = setTimeout(() => setShelfCaption(null), 3500);
    return () => clearTimeout(id);
  }, [shelfCaption]);
  const { clunk } = useSettings();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  // Unique per mount so a stale screen left in the navigation stack can never
  // collide with this one's <Defs> ids (see the same note in RotaryDial).
  const uid = useId();
  const wallGradientId = `roomWallGrad-${uid}`;
  const windowGradientId = `windowGrad-${uid}`;
  const winClipId = `roomWinClip-${uid}`;

  const ringing = callState === 'ringing';
  const ringer = ringerIdx !== null ? t.callers[ringerIdx] : null;

  // Answering opens the live call screen with its transcript.
  const answerCall = () => {
    clunk(true);
    setCallState('active');
    router.navigate('/call');
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

  // A keepsake appears once you've actually talked with that caller.
  const keepsakes = t.callers
    .map((caller, idx) => ({ idx, kind: caller.keepsake, name: caller.name, calls: connectedCallCount(idx) }))
    .filter((k) => k.calls > 0);
  const missedNames = missedNotes.map((idx) => t.callers[idx]?.name).filter((name): name is string => !!name);
  const noteInitials = missedNames
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join('');

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
                    <Stop offset="0%" stopColor={WINDOW_SKY[0]} />
                    <Stop offset="55%" stopColor={WINDOW_SKY[1]} />
                    <Stop offset="100%" stopColor={WINDOW_SKY[2]} />
                  </LinearGradient>
                  <ClipPath id={winClipId}>
                    <Rect x={28} y={26} width={96} height={72} rx={8} />
                  </ClipPath>
                </Defs>

                <Rect x={0} y={0} width={VB_W} height={VB_H} fill={`url(#${wallGradientId})`} />
                <Ellipse cx={200} cy={270} rx={150} ry={20} fill={colours.body2} opacity={0.45} />

                <Rect x={28} y={26} width={96} height={72} rx={8} fill={`url(#${windowGradientId})`} stroke={colours.metal2} strokeWidth={3} />
                <WindowWeather sky={sky} clipId={winClipId} />
                <Line x1={76} y1={26} x2={76} y2={98} stroke={colours.metal2} strokeWidth={2} />
                <Line x1={28} y1={62} x2={124} y2={62} stroke={colours.metal2} strokeWidth={2} />

                <Rect x={276} y={46} width={96} height={7} rx={2} fill={colours.metal2} />
                <Rect x={330} y={22} width={20} height={26} rx={2} transform="rotate(-6 340 35)" fill={colours.metal1} stroke={colours.metal3} strokeWidth={1} />
                {keepsakes.map((k) => (
                  <Keepsake key={k.kind} kind={k.kind} colours={colours} />
                ))}

                {/* Front door and mat, where the weather gets in. */}
                <Rect x={326} y={120} width={56} height={142} rx={4} fill={colours.body1} stroke={colours.metal2} strokeWidth={3} />
                <Rect x={336} y={132} width={36} height={44} rx={3} fill="none" stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={1.2} />
                <Rect x={336} y={190} width={36} height={58} rx={3} fill="none" stroke={colours.metal3} strokeOpacity={0.6} strokeWidth={1.2} />
                <Circle cx={371} cy={196} r={3.2} fill={colours.metal1} />
                <Rect x={318} y={262} width={72} height={7} rx={3} fill={colours.metal3} opacity={0.75} />
                {missedNames.length > 0 && <MissedNote initials={noteInitials} count={missedNames.length} />}

                {!ringing && <CeilingLamp colours={colours} storm={sky === 'storm'} />}

                <RoomWeather colours={colours} sky={sky} />

                <Rect x={26} y={186} width={92} height={48} rx={11} fill={colours.metal2} />
                <Ellipse cx={48} cy={194} rx={17} ry={11} fill={colours.face} />

                {!ringing && (
                  <SvgText x={200} y={18} textAnchor="middle" fontSize={9} fill={colours.inkMuted}>
                    {wallNote}
                  </SvgText>
                )}
              </Svg>

              <View style={[pointer.none, { position: 'absolute', top: keeperTop, left: (boxW - keeperW) / 2 }]}>
                <KeeperAvatar
                  size={keeperH}
                  colours={colours}
                  callState={callState}
                  mood={mood}
                  sky={sky}
                  activity={roomProp}
                  variant="room"
                />
              </View>

              {keepsakes.map((k) => {
                const slot = SHELF_SLOTS[k.kind];
                const label = t.keepsakeCaption(t.keepsakeNames[k.kind], k.name, k.calls);
                return (
                  <Pressable
                    key={k.kind}
                    onPress={() => setShelfCaption(label)}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={{ position: 'absolute', left: px(slot.x), top: py(slot.y), width: px(slot.w), height: py(slot.h) }}
                  />
                );
              })}

              {missedNames.length > 0 && (
                <Pressable
                  onPress={() => router.navigate('/recents')}
                  accessibilityRole="button"
                  accessibilityLabel={t.missedNoteLabel(missedNames.join(', '))}
                  style={{
                    position: 'absolute',
                    left: px(NOTE_SLOT.x),
                    top: py(NOTE_SLOT.y),
                    width: px(NOTE_SLOT.w),
                    height: py(NOTE_SLOT.h),
                  }}
                />
              )}

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
          <Text style={styles.caption}>{shelfCaption ?? t.moments[momentIndex]}</Text>
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
