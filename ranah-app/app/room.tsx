import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
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
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';

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

function WindowWeather({ sky }: { sky: 'clear' | 'rain' | 'snow' | 'storm' }) {
  const flash = useFlicker(sky === 'storm');
  const highlight = '#f3d78b';
  return (
    <G clipPath="url(#roomWinClip)">
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

function BackChevron({ color, mirrored }: { color: string; mirrored: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" style={mirrored ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const PROP_GLYPH: Record<'book' | 'music' | 'chat', string> = { book: '📖', music: '♫', chat: '💬' };

// Rough budget for the topBar + head row + dock above the stage, so the
// outdoor weather layer's sun doesn't render under that chrome.
const CHROME_HEIGHT = 260;

export default function KeeperRoomScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { callState, sky, mood, roomProp, cycleMoment, momentIndex } = useKeeperState();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const awake = callState !== 'idle';
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

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <TopBar />

        <View style={[styles.head, { flexDirection: rowDir }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { flexDirection: rowDir }]} accessibilityRole="button">
            <BackChevron color="rgba(239,230,211,.75)" mirrored={isRtl} />
            <Text style={styles.backLabel}>{t.roomBack}</Text>
          </Pressable>
          <View style={[styles.titles, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
            <Text style={styles.title}>{t.roomTitle}</Text>
            {(mood === 'bored' || mood === 'happy') && (
              <View style={[styles.moodBadge, mood === 'happy' ? styles.moodHappy : styles.moodBored]}>
                <Text style={[styles.moodBadgeText, mood === 'happy' && { color: colours.ink }]}>{t.moodBadge[mood]}</Text>
              </View>
            )}
          </View>
        </View>

        <Dock active="keeper" />

        <Pressable
          onPress={cycleMoment}
          style={styles.stage}
          onLayout={handleStageLayout}
          accessibilityRole="button"
          accessibilityLabel={t.roomTitle}
        >
          {boxW > 0 && (
            <View style={{ width: boxW, height: boxH, position: 'relative' }}>
              <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
                <Defs>
                  <RadialGradient id="roomWallGrad" cx="50%" cy="28%" r="85%">
                    <Stop offset="0%" stopColor={colours.hub1} />
                    <Stop offset="100%" stopColor={colours.hub2} />
                  </RadialGradient>
                  <LinearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={WINDOW_SKY[0]} />
                    <Stop offset="55%" stopColor={WINDOW_SKY[1]} />
                    <Stop offset="100%" stopColor={WINDOW_SKY[2]} />
                  </LinearGradient>
                  <ClipPath id="roomWinClip">
                    <Rect x={28} y={26} width={96} height={72} rx={8} />
                  </ClipPath>
                </Defs>

                <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#roomWallGrad)" />
                <Ellipse cx={200} cy={270} rx={150} ry={20} fill={colours.body2} opacity={0.45} />

                <Rect x={28} y={26} width={96} height={72} rx={8} fill="url(#windowGrad)" stroke={colours.metal2} strokeWidth={3} />
                <WindowWeather sky={sky} />
                <Line x1={76} y1={26} x2={76} y2={98} stroke={colours.metal2} strokeWidth={2} />
                <Line x1={28} y1={62} x2={124} y2={62} stroke={colours.metal2} strokeWidth={2} />

                <Rect x={276} y={46} width={96} height={7} rx={2} fill={colours.metal2} />
                <Rect x={330} y={22} width={20} height={26} rx={2} transform="rotate(-6 340 35)" fill={colours.metal1} stroke={colours.metal3} strokeWidth={1} />

                <Line x1={200} y1={0} x2={200} y2={34} stroke={colours.metal3} strokeWidth={2} />
                <Circle cx={200} cy={44} r={20} fill={colours.highlight} opacity={0.18} />
                <Circle cx={200} cy={44} r={9} fill={colours.highlight} opacity={0.85} />

                <Rect x={26} y={186} width={92} height={48} rx={11} fill={colours.metal2} />
                <Ellipse cx={48} cy={194} rx={17} ry={11} fill={colours.face} />

                <SvgText x={200} y={18} textAnchor="middle" fontSize={9} fill={colours.inkMuted}>
                  {wallNote}
                </SvgText>
              </Svg>

              <View style={styles.keeperDock}>
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
            </View>
          )}
        </Pressable>

        <Text style={styles.caption}>{t.moments[momentIndex]}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: { alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6 },
  backLabel: { color: 'rgba(239,230,211,.75)', fontSize: 11, fontWeight: '600' },
  titles: { gap: 3 },
  title: { color: '#f3ecdd', fontSize: 15, fontWeight: '800' },
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
  caption: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(239,230,211,.7)',
  },
});
