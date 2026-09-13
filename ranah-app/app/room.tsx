import { useRouter } from 'expo-router';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { CallInfoBar } from '../src/components/CallInfoBar/CallInfoBar';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
import { TopBar } from '../src/components/TopBar/TopBar';
import { WeatherLayer } from '../src/components/WeatherLayer/WeatherLayer';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

const VB_W = 400;
const VB_H = 300;
// Static daytime window sky — the prototype paints this from a live clock
// (dawn/day/dusk/night); that time-of-day system doesn't exist yet here,
// so the window shows a fixed daytime gradient regardless of hour.
const WINDOW_SKY = ['#cfe3e2', '#eee4c8', '#e7d9ad'];

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

function WindowWeather({ sky, clipId }: { sky: 'clear' | 'rain' | 'snow' | 'storm'; clipId: string }) {
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

const PROP_GLYPH: Record<'book' | 'music' | 'chat', string> = { book: '📖', music: '♫', chat: '💬' };

// Rough budget for the brand header + dock + topBar + info row above the
// stage, so the outdoor weather layer's sun doesn't render under that chrome.
const CHROME_HEIGHT = 275;

export default function KeeperRoomScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { callState, setCallState, sky, mood, roomProp, cycleMoment, momentIndex, ringerIdx } = useKeeperState();
  const { clunk } = useSettings();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  // Unique per mount so a stale screen left in the navigation stack can never
  // collide with this one's <Defs> ids (see the same note in RotaryDial).
  const uid = useId();
  const wallGradientId = `roomWallGrad-${uid}`;
  const windowGradientId = `windowGrad-${uid}`;
  const winClipId = `roomWinClip-${uid}`;

  const awake = callState !== 'idle';
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
  const keeperSize = boxW > 0 ? Math.max(90, Math.min(210, boxW * 0.42, boxH * 0.5)) : 0;
  const propBadgeSize = Math.max(22, keeperSize * 0.18);
  // While ringing, the handset hangs over the room's top edge (half in the
  // sky above, half over the wall) like the prototype's cradle over
  // .keeper-room, leaving the top of the room itself for the caller card.
  const handsetWidth = Math.min(boxW * 0.42, 200);
  const handsetHeight = handsetWidth * (94 / 220);
  const boxTop = (stageSize.height - boxH) / 2;
  const handsetTop = Math.max(0, boxTop - handsetHeight * 0.55);

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <Dock active="keeper" />

        <TopBar />

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
            <View pointerEvents="box-none" style={{ width: boxW, height: boxH, position: 'relative' }}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="xMidYMid meet"
                pointerEvents="none"
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

                {!ringing && (
                  <G>
                    <Line x1={200} y1={0} x2={200} y2={34} stroke={colours.metal3} strokeWidth={2} />
                    <Circle cx={200} cy={44} r={20} fill={colours.highlight} opacity={0.18} />
                    <Circle cx={200} cy={44} r={9} fill={colours.highlight} opacity={0.85} />
                  </G>
                )}

                <Rect x={26} y={186} width={92} height={48} rx={11} fill={colours.metal2} />
                <Ellipse cx={48} cy={194} rx={17} ry={11} fill={colours.face} />

                {!ringing && (
                  <SvgText x={200} y={18} textAnchor="middle" fontSize={9} fill={colours.inkMuted}>
                    {wallNote}
                  </SvgText>
                )}
              </Svg>

              <View style={styles.keeperDock} pointerEvents="none">
                <KeeperAvatar size={keeperSize} colours={colours} awake={awake} mood={mood} showUmbrella={sky !== 'clear'} />
                <View
                  key={momentIndex}
                  style={[
                    styles.propBadge,
                    { width: propBadgeSize, height: propBadgeSize, borderRadius: propBadgeSize / 2 },
                  ]}
                >
                  <Text style={[styles.propGlyph, { fontSize: propBadgeSize * 0.5 }]}>{PROP_GLYPH[roomProp]}</Text>
                </View>
              </View>

              {/* Incoming call card, ported from the prototype's .incoming:
                  tag, caller name, their status line, and Decline. */}
              {ringing && ringer && (
                <View pointerEvents="box-none" style={[styles.incomingCard, { top: boxH * 0.03 }]}>
                  {/* Soft dark backdrop: the prototype's light text sat on a
                      night-dark room, but by day the window behind the card
                      is pale cream and would swallow the status line. */}
                  <View pointerEvents="box-none" style={styles.incomingBackdrop}>
                    <Text style={[styles.incomingTag, { color: `${colours.metal1}d9` }]}>{t.incomingTag}</Text>
                    <Text style={styles.incomingName}>{ringer.name}</Text>
                    <Text style={styles.incomingMeta}>{ringer.meta}</Text>
                    <Pressable
                      onPress={declineCall}
                      accessibilityRole="button"
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.declineBtn,
                        (pressed || hovered) && styles.declineBtnActive,
                      ]}
                    >
                      <Text style={styles.declineLabel}>{t.decline}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* The vibrating handset — tap it to answer. */}
          {ringing && boxW > 0 && (
            <View
              pointerEvents="box-none"
              style={[styles.ringingHandset, { top: handsetTop, left: (stageSize.width - handsetWidth) / 2 }]}
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
          <Text style={styles.caption}>{t.moments[momentIndex]}</Text>
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
  keeperDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: '14%',
  },
  propBadge: {
    position: 'absolute',
    top: 4,
    right: -6,
    backgroundColor: 'rgba(11,10,8,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propGlyph: { fontSize: 15, color: '#f3ecdd' },
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
  declineBtn: {
    marginTop: 2,
    backgroundColor: '#7a3630',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  declineBtnActive: { backgroundColor: '#8f423b' },
  declineLabel: { color: '#f6ece7', fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
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
