import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { USE_NATIVE_DRIVER } from '../../theme/animation';

const TRAVEL = 16;

interface SwitchProps {
  value: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
}

// Ported from the prototype's .switch: a 40x24 pill whose thumb slides 16px
// toward the trailing edge when on, turning brass with an ink thumb.
export function Switch({ value, onToggle, accessibilityLabel }: SwitchProps) {
  const { isRtl } = useLang();
  const { colours } = usePalette();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [value, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, isRtl ? -TRAVEL : TRAVEL] });

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      // aria-checked, not accessibilityState: react-native-web drops the
      // latter, so screen readers on web would never hear on/off.
      aria-checked={value}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: value ? colours.metal2 : 'rgba(255,255,255,.14)' }]}
    >
      <Animated.View
        style={[
          styles.thumb,
          isRtl ? { right: 3 } : { left: 3 },
          { backgroundColor: value ? colours.ink : '#efe6d3', transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 40, height: 24, borderRadius: 999, flexShrink: 0 },
  thumb: { position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 9 },
});
