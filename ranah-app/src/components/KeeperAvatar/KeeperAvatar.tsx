import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { CallState, KeeperMood, RoomProp } from '../../state/KeeperStateContext';
import { useReducedMotion } from '../../state/useReducedMotion';
import { USE_NATIVE_DRIVER } from '../../theme/animation';
import { CaseColours } from '../../theme/tokens';
import type { WeatherKind } from '../WeatherLayer/WeatherLayer';

// The keeper is drawn in a 100x140 box: head centred at (50,50), shoulders
// at (35,80)/(65,80), feet on the ground around y=132.
const VB_W = 100;
const VB_H = 140;

const SKIN = '#e8b98c';
const HAIR = '#3a2a20';
const INK = '#241e1a';
const TROUSERS = '#46506a';
const SHOES = '#2a2320';
const RAINCOAT = '#e2b640';
const RAINCOAT_SHADE = '#b98f25';
const WOOL = '#b8463e';
const WOOL_LIGHT = '#ede5d4';
const SHIVER = '#cfe3f7';

export type KeeperPose = 'sleep' | 'book' | 'music' | 'wave' | 'alert' | 'onCall';

// What the keeper is doing, from the call first, then mood, then the room's
// current moment. On the dial it dozes in the hub between calls; in its room
// it reads, hums, or waves to match the caption under the room.
export function keeperPose(
  variant: 'hub' | 'room',
  callState: CallState,
  mood: KeeperMood,
  activity: RoomProp
): KeeperPose {
  if (callState === 'ringing') return 'alert';
  if (callState === 'active') return 'onCall';
  if (mood === 'happy') return 'wave';
  if (variant === 'hub') return 'sleep';
  if (activity === 'book') return 'book';
  if (activity === 'music') return 'music';
  return 'wave';
}

// react-native-svg's Animated wrapper leaks `collapsable` to the DOM on web.
function stripCollapsable<P extends object>(Comp: React.ComponentType<P>) {
  return React.forwardRef<unknown, P & { collapsable?: boolean }>((props, ref) => {
    const { collapsable, ...rest } = props;
    return <Comp ref={ref as never} {...(rest as P)} />;
  });
}
const AnimatedG = Animated.createAnimatedComponent(stripCollapsable(G));

interface KeeperAvatarProps {
  // Height of the character; width follows the 100:140 drawing.
  size: number;
  colours: CaseColours;
  callState: CallState;
  mood: KeeperMood;
  sky: WeatherKind;
  activity?: RoomProp;
  variant: 'hub' | 'room';
  // On a call: drive the mouth from outside (e.g. as transcript lines
  // arrive). Left undefined, the keeper chatters on its own.
  talking?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

// A full little person who lives in the phone: they doze or potter about
// between calls, leap up when the phone rings, chat with a handset to their
// ear on a call, and dress for the caller's weather.
export function KeeperAvatar({
  size,
  colours,
  callState,
  mood,
  sky,
  activity = 'book',
  variant,
  talking,
  onPress,
  accessibilityLabel,
}: KeeperAvatarProps) {
  const reduceMotion = useReducedMotion();
  const pose = keeperPose(variant, callState, mood, activity);
  const width = (size * VB_W) / VB_H;

  const bob = useRef(new Animated.Value(0)).current;
  const shiver = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0.5)).current;
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  const isAlert = pose === 'alert';
  const isStorm = sky === 'storm';

  // Breathing between calls; an excited hop while the phone rings.
  useEffect(() => {
    if (reduceMotion) {
      bob.setValue(0);
      return;
    }
    const loop = isAlert
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(bob, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(bob, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.delay(260),
          ])
        )
      : Animated.loop(
          Animated.sequence([
            Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          ])
        );
    loop.start();
    return () => loop.stop();
  }, [isAlert, reduceMotion, bob]);

  // Shivering in a storm.
  useEffect(() => {
    if (reduceMotion || !isStorm) {
      shiver.setValue(0);
      return;
    }
    const step = (toValue: number) => Animated.timing(shiver, { toValue, duration: 55, useNativeDriver: USE_NATIVE_DRIVER });
    const loop = Animated.loop(Animated.sequence([step(-1), step(1), step(-1), step(1), step(0), Animated.delay(700)]));
    loop.start();
    return () => loop.stop();
  }, [isStorm, reduceMotion, shiver]);

  // Waving arm.
  useEffect(() => {
    if (reduceMotion || pose !== 'wave') {
      wave.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(wave, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pose, reduceMotion, wave]);

  // Blinking whenever the eyes are open.
  const canBlink = pose !== 'sleep';
  useEffect(() => {
    if (reduceMotion || !canBlink) {
      setBlink(false);
      return;
    }
    let open: ReturnType<typeof setTimeout>;
    let close: ReturnType<typeof setTimeout>;
    const schedule = () => {
      close = setTimeout(() => {
        setBlink(true);
        open = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 2400 + Math.random() * 2800);
    };
    schedule();
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [canBlink, reduceMotion]);

  // Chatting on a call.
  useEffect(() => {
    if (reduceMotion || pose !== 'onCall' || talking !== undefined) {
      setMouthOpen(false);
      return;
    }
    const id = setInterval(() => setMouthOpen((m) => !m), 230);
    return () => clearInterval(id);
  }, [pose, reduceMotion, talking]);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, isAlert ? -size * 0.07 : -size * 0.012] });
  const shiverX = shiver.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.01, size * 0.01] });
  const waveRotate = wave.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-20)', 'rotate(16)'] });

  const clothing = sky === 'rain' ? RAINCOAT : isStorm ? colours.body1 : colours.metal2;
  const umbrellaHeld = sky === 'rain' && (pose === 'sleep' || pose === 'onCall');
  const umbrellaLeaning = sky === 'rain' && !umbrellaHeld;

  const arm = (d: string, hand: [number, number]) => (
    <G>
      <Path d={d} stroke={clothing} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Circle cx={hand[0]} cy={hand[1]} r={4} fill={SKIN} />
    </G>
  );
  const restLeft = () => arm('M35 80 Q28 92 31 102', [31, 102]);
  const restRight = () => arm('M65 80 Q72 92 69 102', [69, 102]);

  const eyeKind = (() => {
    if (pose === 'sleep' || blink) return 'closed';
    if (pose === 'alert') return 'wide';
    if (mood === 'bored' && callState === 'idle') return 'droopy';
    if (pose === 'book') return 'down';
    return 'open';
  })();

  const renderEyes = () => {
    switch (eyeKind) {
      case 'closed':
        return (
          <G stroke={HAIR} strokeWidth={1.6} fill="none" strokeLinecap="round">
            <Path d="M38.5 52 q3.5 3 7 0" />
            <Path d="M54.5 52 q3.5 3 7 0" />
          </G>
        );
      case 'wide':
        return (
          <G>
            <Circle cx={42} cy={52} r={3.2} fill={INK} />
            <Circle cx={58} cy={52} r={3.2} fill={INK} />
            <Circle cx={43.1} cy={50.9} r={1.1} fill="#fff" />
            <Circle cx={59.1} cy={50.9} r={1.1} fill="#fff" />
          </G>
        );
      case 'droopy':
        return (
          <G>
            <Circle cx={42} cy={53} r={2.4} fill={INK} />
            <Circle cx={58} cy={53} r={2.4} fill={INK} />
            <Rect x={39.2} y={49.8} width={5.6} height={3.2} fill={SKIN} />
            <Rect x={55.2} y={49.8} width={5.6} height={3.2} fill={SKIN} />
            <Line x1={39} y1={53} x2={45} y2={53} stroke={HAIR} strokeWidth={1.2} strokeLinecap="round" />
            <Line x1={55} y1={53} x2={61} y2={53} stroke={HAIR} strokeWidth={1.2} strokeLinecap="round" />
          </G>
        );
      case 'down':
        return (
          <G>
            <Circle cx={42} cy={54} r={2.3} fill={INK} />
            <Circle cx={58} cy={54} r={2.3} fill={INK} />
          </G>
        );
      default:
        return (
          <G>
            <Circle cx={42} cy={52} r={2.6} fill={INK} />
            <Circle cx={58} cy={52} r={2.6} fill={INK} />
            <Circle cx={42.9} cy={51.1} r={0.8} fill="#fff" />
            <Circle cx={58.9} cy={51.1} r={0.8} fill="#fff" />
          </G>
        );
    }
  };

  const renderBrows = () => {
    if (pose === 'alert') {
      return (
        <G stroke={HAIR} strokeWidth={1.4} fill="none" strokeLinecap="round">
          <Path d="M37 45 q5 -3 10 0" />
          <Path d="M53 45 q5 -3 10 0" />
        </G>
      );
    }
    if (isStorm && pose !== 'sleep') {
      return (
        <G stroke={HAIR} strokeWidth={1.3} strokeLinecap="round">
          <Line x1={37} y1={46.5} x2={45} y2={43.5} />
          <Line x1={55} y1={43.5} x2={63} y2={46.5} />
        </G>
      );
    }
    return null;
  };

  const renderMouth = () => {
    const stroke = { stroke: HAIR, strokeWidth: 1.3, fill: 'none', strokeLinecap: 'round' as const };
    switch (pose) {
      case 'sleep':
        return <Path d="M47 62 q3 2 6 0" {...stroke} />;
      case 'alert':
        return <Ellipse cx={50} cy={63} rx={3} ry={3.6} fill={INK} />;
      case 'onCall':
        return (talking ?? mouthOpen) ? <Ellipse cx={50} cy={62.5} rx={3.2} ry={2.4} fill={INK} /> : <Path d="M46 62 q4 3 8 0" {...stroke} />;
      case 'music':
        return <Ellipse cx={50} cy={62.5} rx={1.9} ry={1.7} fill={INK} />;
      case 'wave':
        return mood === 'bored' ? <Path d="M46 62 q4 3 8 0" {...stroke} /> : <Path d="M43 60 q7 8 14 0 Z" fill={INK} />;
      default:
        return mood === 'bored' ? <Path d="M46 63.5 q4 -2 8 0" {...stroke} /> : <Path d="M46 62 q4 3 8 0" {...stroke} />;
    }
  };

  const renderHead = () => (
    <G>
      {sky === 'rain' && <Circle cx={50} cy={49} r={27} fill={RAINCOAT} />}
      <Circle cx={27.5} cy={53} r={4.5} fill={SKIN} />
      <Circle cx={72.5} cy={53} r={4.5} fill={SKIN} />
      <Circle cx={50} cy={50} r={22.5} fill={SKIN} />
      <Circle cx={37} cy={58} r={3.2} fill="#e8907c" opacity={0.45} />
      <Circle cx={63} cy={58} r={3.2} fill="#e8907c" opacity={0.45} />
      <Path d="M27.5 50 Q26 25 50 25 Q74 25 72.5 50 Q68 38 58 37 Q53 31 45 35 Q34 37 27.5 50 Z" fill={HAIR} />
      {renderEyes()}
      {renderBrows()}
      {renderMouth()}

      {sky === 'rain' && (
        <Path d="M24 52 Q22 20 50 20 Q78 20 76 52 Q72 34 50 32 Q28 34 24 52 Z" fill={RAINCOAT} stroke={RAINCOAT_SHADE} strokeWidth={0.8} />
      )}
      {sky === 'snow' && (
        <G>
          <Path d="M27 44 Q27 19 50 19 Q73 19 73 44 Z" fill={WOOL} />
          <Rect x={26} y={38} width={48} height={8} rx={4} fill={WOOL_LIGHT} />
          <Circle cx={50} cy={17} r={5} fill={WOOL_LIGHT} />
        </G>
      )}
      {sky === 'clear' && (
        // Sunglasses pushed up onto the hair.
        <G>
          <Rect x={35} y={27} width={12} height={7} rx={3} fill="#1f1b1a" />
          <Rect x={53} y={27} width={12} height={7} rx={3} fill="#1f1b1a" />
          <Line x1={47} y1={30} x2={53} y2={30} stroke="#1f1b1a" strokeWidth={1.5} />
          <Line x1={37} y1={29} x2={40} y2={29} stroke="#ffffff" strokeWidth={0.8} strokeOpacity={0.5} strokeLinecap="round" />
        </G>
      )}
      {pose === 'music' && (
        <G>
          <Path d="M26 52 Q26 17 50 17 Q74 17 74 52" stroke="#2e2a2e" strokeWidth={3.5} fill="none" />
          <Rect x={20.5} y={46} width={9} height={14} rx={4} fill="#2e2a2e" />
          <Rect x={70.5} y={46} width={9} height={14} rx={4} fill="#2e2a2e" />
        </G>
      )}
    </G>
  );

  const renderTorso = () => (
    <G>
      {sky === 'rain' ? (
        <G>
          <Path d="M29 112 Q28 78 50 73 Q72 78 71 112 Z" fill={RAINCOAT} />
          <Circle cx={50} cy={88} r={1.3} fill={RAINCOAT_SHADE} />
          <Circle cx={50} cy={98} r={1.3} fill={RAINCOAT_SHADE} />
        </G>
      ) : (
        <G>
          <Path d="M31 106 Q29 78 50 73 Q71 78 69 106 Z" fill={colours.metal2} />
          <Path d="M43 74 q7 6 14 0" stroke={colours.metal3} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </G>
      )}
      {sky === 'snow' && (
        <G>
          <Rect x={35} y={70} width={30} height={8} rx={4} fill={WOOL} />
          <Rect x={55} y={74} width={7} height={17} rx={3} fill={WOOL} />
          <Line x1={55} y1={81} x2={62} y2={81} stroke={WOOL_LIGHT} strokeWidth={1.2} />
          <Line x1={55} y1={86} x2={62} y2={86} stroke={WOOL_LIGHT} strokeWidth={1.2} />
        </G>
      )}
      {isStorm && (
        // Wrapped in a blanket against the storm.
        <G>
          <Path
            d="M22 112 Q20 76 50 67 Q80 76 78 112 Q64 106 50 110 Q36 106 22 112 Z"
            fill={colours.body1}
            stroke={colours.metal3}
            strokeWidth={0.8}
          />
          <Line x1={37} y1={77} x2={35} y2={108} stroke={colours.metal1} strokeOpacity={0.3} strokeWidth={1} />
          <Line x1={63} y1={77} x2={65} y2={108} stroke={colours.metal1} strokeOpacity={0.3} strokeWidth={1} />
          <Path d="M24 94 Q50 88 76 94" stroke={colours.metal1} strokeOpacity={0.3} strokeWidth={1} fill="none" />
        </G>
      )}
    </G>
  );

  const renderArms = () => {
    switch (pose) {
      case 'book':
        return (
          <G>
            <Rect x={36} y={84} width={28} height={18} rx={2} fill={colours.metal1} stroke={colours.metal3} strokeWidth={0.8} />
            <Line x1={50} y1={84} x2={50} y2={102} stroke={colours.metal3} strokeWidth={0.8} />
            <Line x1={40} y1={89} x2={47} y2={89} stroke={colours.metal3} strokeWidth={0.6} strokeOpacity={0.6} />
            <Line x1={53} y1={89} x2={60} y2={89} stroke={colours.metal3} strokeWidth={0.6} strokeOpacity={0.6} />
            {arm('M35 80 Q31 95 39 98', [39, 97])}
            {arm('M65 80 Q69 95 61 98', [61, 97])}
          </G>
        );
      case 'music':
        return (
          <G>
            {restLeft()}
            {arm('M65 80 Q77 76 73 62', [73, 61])}
          </G>
        );
      case 'alert':
        return (
          <G>
            {arm('M35 80 Q22 72 24 58', [24, 57])}
            {arm('M65 80 Q78 72 76 58', [76, 57])}
          </G>
        );
      case 'onCall':
        return (
          <G>
            <G transform="rotate(-22 26 50)">
              <Rect x={21.5} y={37} width={9} height={27} rx={4.5} fill="#2e2622" stroke={colours.metal2} strokeWidth={1} />
              <Circle cx={26} cy={41} r={1.4} fill={colours.metal1} />
              <Circle cx={26} cy={60} r={1.4} fill={colours.metal1} />
            </G>
            {arm('M35 80 Q22 74 27 60', [28, 58])}
            {restRight()}
          </G>
        );
      case 'wave':
        return (
          <G>
            {restLeft()}
            <G transform="translate(65 80)">
              <AnimatedG transform={waveRotate}>
                <Path d="M0 0 Q11 -8 12 -22" stroke={clothing} strokeWidth={7} strokeLinecap="round" fill="none" />
                <Circle cx={12} cy={-23} r={4} fill={SKIN} />
              </AnimatedG>
            </G>
          </G>
        );
      default:
        return (
          <G>
            {restLeft()}
            {restRight()}
          </G>
        );
    }
  };

  const renderHeldUmbrella = () => (
    <G>
      <Line x1={69} y1={100} x2={70} y2={20} stroke={colours.metal3} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M69 102 q0 5 -4 5" stroke={colours.metal3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path
        d="M44 20 A26 17 0 0 1 96 20 A6.5 6.5 0 0 0 83 20 A6.5 6.5 0 0 0 70 20 A6.5 6.5 0 0 0 57 20 A6.5 6.5 0 0 0 44 20 Z"
        fill={colours.body1}
        stroke={colours.metal3}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <Path d="M70 3 Q62 9 57 20 M70 3 L70 20 M70 3 Q78 9 83 20" stroke={colours.metal3} strokeWidth={0.6} strokeOpacity={0.7} fill="none" />
      <Line x1={70} y1={3} x2={70} y2={0} stroke={colours.metal3} strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );

  // Standing, or sitting cross-legged to doze.
  const sitting = pose === 'sleep';
  const upperBody = (
    <G transform={sitting ? 'translate(0 14)' : undefined}>
      {renderTorso()}
      {renderHead()}
      {renderArms()}
      {umbrellaHeld && renderHeldUmbrella()}
    </G>
  );

  const content = (
    <View style={{ pointerEvents: 'none', width, height: size }}>
      {/* Ground shadow stays put while the body bobs above it. */}
      <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Ellipse cx={50} cy={134} rx={sitting ? 30 : 22} ry={4} fill="#000" opacity={0.22} />
      </Svg>
      <Animated.View style={{ width, height: size, transform: [{ translateX: shiverX }] }}>
        <Animated.View style={{ width, height: size, transform: [{ translateY: bobY }] }}>
          <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
            {umbrellaLeaning && (
              <G>
                <Line x1={91} y1={84} x2={91} y2={90} stroke={colours.metal3} strokeWidth={1.2} strokeLinecap="round" />
                <Path d="M91 88 L86 118 L96 118 Z" fill={colours.body1} stroke={colours.metal3} strokeWidth={0.7} />
                <Line x1={91} y1={118} x2={90} y2={130} stroke={colours.metal3} strokeWidth={1.6} strokeLinecap="round" />
                <Path d="M90 130 q0 4 -4 4" stroke={colours.metal3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
              </G>
            )}

            {sitting ? (
              <G>
                <Rect x={24} y={118} width={30} height={10} rx={5} fill={TROUSERS} transform="rotate(6 39 123)" />
                <Rect x={46} y={120} width={30} height={10} rx={5} fill={TROUSERS} transform="rotate(-6 61 125)" />
                <Ellipse cx={22} cy={125} rx={5} ry={4.5} fill={SHOES} />
                <Ellipse cx={78} cy={125} rx={5} ry={4.5} fill={SHOES} />
              </G>
            ) : (
              <G>
                <Rect x={40.5} y={104} width={8.5} height={25} rx={4} fill={TROUSERS} />
                <Rect x={51} y={104} width={8.5} height={25} rx={4} fill={TROUSERS} />
                <Ellipse cx={44.5} cy={130} rx={6.5} ry={3.8} fill={SHOES} />
                <Ellipse cx={55.5} cy={130} rx={6.5} ry={3.8} fill={SHOES} />
              </G>
            )}

            {upperBody}

            {pose === 'music' && (
              <G>
                <SvgText x={80} y={40} fontSize={12} fill={colours.highlight}>
                  ♪
                </SvgText>
                <SvgText x={88} y={26} fontSize={10} fill={colours.highlight} opacity={0.75}>
                  ♫
                </SvgText>
              </G>
            )}
            {pose === 'alert' && (
              <G>
                <SvgText x={80} y={32} fontSize={16} fontWeight="800" fill={colours.highlight}>
                  !
                </SvgText>
                <SvgText x={88} y={22} fontSize={12} fontWeight="800" fill={colours.highlight} opacity={0.7}>
                  !
                </SvgText>
              </G>
            )}
            {pose === 'sleep' && (
              <G>
                <SvgText x={umbrellaHeld ? 14 : 76} y={34} fontSize={11} fontWeight="700" fill={colours.face} opacity={0.6}>
                  z
                </SvgText>
                <SvgText x={umbrellaHeld ? 6 : 84} y={24} fontSize={8} fontWeight="700" fill={colours.face} opacity={0.4}>
                  z
                </SvgText>
              </G>
            )}
            {isStorm && pose !== 'sleep' && (
              <G stroke={SHIVER} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7}>
                {/* Wavy shiver lines (not chevrons, which read as nav arrows). */}
                <Path d="M16 78 q-3 3 0 6 q3 3 0 6 q-3 3 0 6" />
                <Path d="M84 78 q3 3 0 6 q-3 3 0 6 q3 3 0 6" />
              </G>
            )}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: size }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </Pressable>
  );
}
