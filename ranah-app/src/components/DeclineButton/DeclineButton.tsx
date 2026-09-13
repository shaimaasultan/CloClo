import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLang } from '../../state/LangContext';
import { useReducedMotion } from '../../state/useReducedMotion';

const HANDSET_PATH =
  'M14 44 C 6 44 4 30 12 24 L 40 6 C 46 2 52 6 50 13 L 46 24 C 62 14 88 14 104 24 L 100 13 C 98 6 104 2 110 6 L 138 24 C 146 30 144 44 136 44 C 130 44 128 40 122 36 C 106 26 44 26 28 36 C 22 40 20 44 14 44 Z';

// Glow breathes over 1.8s; the buzz is a quick ~270ms side-to-side burst
// followed by a pause, like a phone vibrating in a pocket.
const GLOW_HALF_MS = 900;
const BUZZ_STEP_MS = 45;
const BUZZ_PAUSE_MS = 1100;
const BUZZ_DISTANCE = 2.5;

interface DeclineButtonProps {
  label: string;
  onPress: () => void;
}

// A loud, can't-miss Decline for a ringing call: solid red pill with a
// hang-up handset, a pulsing red halo, and a periodic buzz. Motion is
// dropped (halo held steady) when the OS asks for reduced motion.
export function DeclineButton({ label, onPress }: DeclineButtonProps) {
  const { isRtl } = useLang();
  const glow = useRef(new Animated.Value(0)).current;
  const buzz = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      glow.setValue(0.5);
      buzz.setValue(0);
      return;
    }
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const step = (toValue: number) => Animated.timing(buzz, { toValue, duration: BUZZ_STEP_MS, useNativeDriver: true });
    const buzzLoop = Animated.loop(
      Animated.sequence([step(-1), step(1), step(-1), step(1), step(-1), step(0), Animated.delay(BUZZ_PAUSE_MS)])
    );
    glowLoop.start();
    buzzLoop.start();
    return () => {
      glowLoop.stop();
      buzzLoop.stop();
    };
  }, [reduceMotion, glow, buzz]);

  const translateX = buzz.interpolate({ inputRange: [-1, 1], outputRange: [-BUZZ_DISTANCE, BUZZ_DISTANCE] });
  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });
  const haloScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { opacity: haloOpacity, transform: [{ scaleX: haloScale }, { scaleY: haloScale }] }]}
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.button,
          { flexDirection: isRtl ? 'row-reverse' : 'row' },
          (pressed || hovered) && styles.buttonActive,
        ]}
      >
        {/* Handset tipped 135° — the universal "hang up" glyph. */}
        <Svg width={14} height={14} viewBox="0 0 150 150" style={{ transform: [{ rotate: '135deg' }] }}>
          <Path d={HANDSET_PATH} fill="#fff5f0" transform="translate(0 43)" />
        </Svg>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: -6,
    right: -6,
    borderRadius: 999,
    backgroundColor: '#e0544a',
  },
  button: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b23b32',
    borderWidth: 1,
    borderColor: 'rgba(255,220,210,.35)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonActive: { backgroundColor: '#c9463c' },
  label: { color: '#fff5f0', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
});
