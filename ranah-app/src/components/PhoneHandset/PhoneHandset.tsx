import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CaseColours } from '../../theme/tokens';

interface PhoneHandsetProps {
  width: number;
  colours: CaseColours;
  isRinging: boolean;
  isOpen: boolean;
  onPress?: () => void;
}

// Ported from the .cradle / .handset markup in dial-hollow.html — same path
// data, same flat body-colour fill + metal2 stroke, same peg gradient
// (metal1→metal3), same shake keyframes (0,-6,5,-4,3,0 deg over .6s), same
// lift-on-open transform (translateY(-16) rotate(-7deg)). Two additions
// beyond the original: the pegs sit below the handset instead of overlapping
// its middle (so they read clearly between the ring and the handset instead
// of hiding behind it), and a soft glow breathes behind the handset while
// it's ringing (the original used a CSS drop-shadow filter for this, which
// react-native-svg has no equivalent for).
export function PhoneHandset({ width, colours, isRinging, isOpen, onPress }: PhoneHandsetProps) {
  const uid = useId();
  const pegGradientId = `handset-peg-${uid}`;
  const glowId = `handset-glow-${uid}`;

  const shake = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRinging) {
      const step = (toValue: number) =>
        Animated.timing(shake, { toValue, duration: 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
      loop = Animated.loop(Animated.sequence([step(-6), step(5), step(-4), step(3), step(0)]));
      loop.start();
    } else {
      shake.stopAnimation();
      shake.setValue(0);
    }
    return () => loop?.stop();
  }, [isRinging, shake]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRinging) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      );
      loop.start();
    } else {
      glow.stopAnimation();
      glow.setValue(0);
    }
    return () => loop?.stop();
  }, [isRinging, glow]);

  useEffect(() => {
    Animated.spring(lift, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [isOpen, lift]);

  const cradleGap = width * 0.645;
  const pegWidth = width * 0.05;
  const pegHeight = width * 0.1045;
  const handsetHeight = width * (94 / 220);
  const glowWidth = width * 1.5;
  const glowHeight = handsetHeight * 2.8;

  const rotate = shake.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });
  const liftY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.073] });
  const liftRotate = lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={{ width, alignItems: 'center' }} pointerEvents="box-none">
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Lift handset">
        <Animated.View
          style={{
            width,
            height: handsetHeight,
            transform: [{ translateY: liftY }, { rotate: isRinging ? rotate : liftRotate }],
          }}
        >
          {isRinging && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: glowWidth,
                height: glowHeight,
                left: (width - glowWidth) / 2,
                top: (handsetHeight - glowHeight) / 2,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              }}
            >
              <Svg width={glowWidth} height={glowHeight} viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={colours.highlight} stopOpacity={0.9} />
                    <Stop offset="100%" stopColor={colours.highlight} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Ellipse cx={50} cy={50} rx={50} ry={50} fill={`url(#${glowId})`} />
              </Svg>
            </Animated.View>
          )}
          <Svg width={width} height={handsetHeight} viewBox="0 0 150 64">
            <Path
              d="M14 44 C 6 44 4 30 12 24 L 40 6 C 46 2 52 6 50 13 L 46 24 C 62 14 88 14 104 24 L 100 13 C 98 6 104 2 110 6 L 138 24 C 146 30 144 44 136 44 C 130 44 128 40 122 36 C 106 26 44 26 28 36 C 22 40 20 44 14 44 Z"
              fill={colours.body2}
              stroke={colours.metal2}
              strokeWidth={1.4}
            />
          </Svg>
        </Animated.View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: cradleGap, marginTop: -pegHeight * 0.55 }}>
        <Svg width={pegWidth} height={pegHeight} viewBox="0 0 11 23">
          <Defs>
            <LinearGradient id={pegGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colours.metal1} />
              <Stop offset="100%" stopColor={colours.metal3} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={11} height={23} rx={3} fill={`url(#${pegGradientId})`} />
        </Svg>
        <Svg width={pegWidth} height={pegHeight} viewBox="0 0 11 23">
          <Defs>
            <LinearGradient id={pegGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colours.metal1} />
              <Stop offset="100%" stopColor={colours.metal3} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={11} height={23} rx={3} fill={`url(#${pegGradientId})`} />
        </Svg>
      </View>
    </View>
  );
}
