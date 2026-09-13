import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PALETTE_ORDER, PALETTE_SWATCH_HEX } from '../../theme/tokens';
import { SkyIcon } from '../SkyIcon/SkyIcon';
import { WeatherKind } from '../WeatherLayer/WeatherLayer';

const SKY_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'storm'];

// Same refresh cadence and 24h HH:MM format as the prototype's tickClock().
const CLOCK_REFRESH_MS = 15000;

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function useClock() {
  const [time, setTime] = useState(() => formatTime(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  return time;
}

// The prototype's statusbar put the clock on one side and the caller's-sky
// picker on the other. Here the clock, sky picker, and case-colour swatches
// share a single pill under the dock, split by hairline dividers, so the
// whole status strip reads as one object on every screen.
export function TopBar() {
  const { t, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const { sky, setSky } = useKeeperState();
  const time = useClock();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={styles.bar}>
      <View style={[styles.pill, { flexDirection: rowDir }]}>
        <Text style={styles.clock} accessibilityRole="text" accessibilityLabel={time}>
          {time}
        </Text>

        <View style={styles.divider} />

        <View style={[styles.group, styles.skyGroup, { flexDirection: rowDir }]}>
          {SKY_ORDER.map((kind) => {
            const active = sky === kind;
            return (
              <Pressable
                key={kind}
                onPress={() => setSky(kind)}
                role="radio"
                aria-checked={active}
                aria-label={`${t.skyPrefix}: ${t.skyNames[kind]}`}
                style={[styles.skyBtn, active && { backgroundColor: 'rgba(243,215,139,.22)' }]}
              >
                <SkyIcon kind={kind} size={15} color={active ? colours.highlight : '#c9bfa9'} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={[styles.group, styles.paletteGroup, { flexDirection: rowDir }]}>
          {PALETTE_ORDER.map((name) => (
            <Pressable
              key={name}
              onPress={() => setPalette(name)}
              role="radio"
              aria-checked={paletteName === name}
              aria-label={t.paletteNames[name]}
              style={[
                styles.swatch,
                { backgroundColor: PALETTE_SWATCH_HEX[name] },
                paletteName === name && styles.swatchActive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  pill: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(11,10,8,.35)',
  },
  clock: {
    color: '#efe6d3',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,.12)' },
  group: { alignItems: 'center' },
  skyGroup: { gap: 2 },
  paletteGroup: { gap: 6 },
  skyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#f3d78b' },
});
