import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CaseColours } from '../../theme/tokens';

interface PhoneHandsetProps {
  width: number;
  colours: CaseColours;
  isRinging: boolean;
  isOpen: boolean;
  onPress?: () => void;
}

// Ported from the .cradle / .handset markup in dial-hollow.html — same path
// data, same shake keyframes (0,-6,5,-4,3,0 deg over .6s), same lift-on-open
// transform (translateY(-16) rotate(-7deg)).
export function PhoneHandset({ width, colours, isRinging, isOpen, onPress }: PhoneHandsetProps) {
  const shake = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

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

  const rotate = shake.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });
  const liftY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.073] });
  const liftRotate = lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] });

  return (
    <View style={{ width, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ flexDirection: 'row', gap: cradleGap, marginBottom: -pegHeight * 0.4, zIndex: 1 }}>
        <View
          style={{
            width: pegWidth,
            height: pegHeight,
            borderRadius: pegWidth * 0.3,
            backgroundColor: colours.metal2,
          }}
        />
        <View
          style={{
            width: pegWidth,
            height: pegHeight,
            borderRadius: pegWidth * 0.3,
            backgroundColor: colours.metal2,
          }}
        />
      </View>
      <Pressable onPress={onPress} style={{ zIndex: 2 }} accessibilityRole="button" accessibilityLabel="Lift handset">
        <Animated.View
          style={{
            width,
            height: handsetHeight,
            transform: [{ translateY: liftY }, { rotate: isRinging ? rotate : liftRotate }],
          }}
        >
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
    </View>
  );
}
