import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';

// Sits beside Hang up during a live call. Muting keeps the line in use; it
// only stops your side of the call until you unmute.
export function MuteButton() {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { muted, toggleMute } = useKeeperState();
  const color = muted ? colours.highlight : '#efe6d3';

  return (
    <Pressable
      onPress={toggleMute}
      role="switch"
      aria-checked={muted}
      aria-label={t.muteAria}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        { flexDirection: isRtl ? 'row-reverse' : 'row' },
        muted && { backgroundColor: `${colours.metal2}38`, borderColor: `${colours.metal2}80` },
        (pressed || hovered) && styles.buttonActive,
      ]}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M9 5.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
        <Path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        {muted && <Line x1={4} y1={4} x2={20} y2={20} stroke="#e6a49c" strokeWidth={2.2} strokeLinecap="round" />}
      </Svg>
      <Text style={[styles.label, { color }]}>{muted ? t.unmute : t.mute}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Matches the Hang up pill's size so the two read as a pair.
  button: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.18)',
    backgroundColor: 'rgba(11,10,8,.55)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonActive: { backgroundColor: 'rgba(255,255,255,.1)' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
});
