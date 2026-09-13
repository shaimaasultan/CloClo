import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lang } from '../../i18n/dictionaries';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PALETTE_ORDER, PALETTE_SWATCH_HEX } from '../../theme/tokens';
import { SkyIcon } from '../SkyIcon/SkyIcon';
import { WeatherKind } from '../WeatherLayer/WeatherLayer';

const SKY_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'storm'];
const LANG_OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'EN' },
  { lang: 'ar', label: 'عربي' },
];

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

interface SettingsBarProps {
  // Phone widths: tighter spacing and smaller targets so the whole pill fits
  // on the same row as the logo.
  compact?: boolean;
}

// One pill holding every at-a-glance control: the clock, the caller's-sky
// picker, the case-colour swatches, and the EN / عربي switch — split by
// hairline dividers so it reads as a single object beside the logo.
export function SettingsBar({ compact = false }: SettingsBarProps) {
  const { t, lang, setLang, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const { sky, setSky } = useKeeperState();
  const time = useClock();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  const size = compact
    ? { gap: 6, padX: 8, clock: 12, skyBtn: 22, skyIcon: 14, swatch: 14, swatchGap: 3, swatchBorder: 1.5, langFont: 10, langPadX: 5 }
    : { gap: 8, padX: 12, clock: 14, skyBtn: 26, skyIcon: 15, swatch: 18, swatchGap: 6, swatchBorder: 2, langFont: 12, langPadX: 8 };

  const divider = <View style={styles.divider} />;

  return (
    <View style={[styles.pill, { flexDirection: rowDir, gap: size.gap, paddingHorizontal: size.padX }]}>
      <Text style={[styles.clock, { fontSize: size.clock }]} accessibilityLabel={time}>
        {time}
      </Text>

      {divider}

      <View style={[styles.group, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.skyPrefix}>
        {SKY_ORDER.map((kind) => {
          const active = sky === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => setSky(kind)}
              role="radio"
              aria-checked={active}
              aria-label={`${t.skyPrefix}: ${t.skyNames[kind]}`}
              style={[
                { width: size.skyBtn, height: size.skyBtn, borderRadius: size.skyBtn / 2 },
                styles.skyBtn,
                active && { backgroundColor: 'rgba(243,215,139,.22)' },
              ]}
            >
              <SkyIcon kind={kind} size={size.skyIcon} color={active ? colours.highlight : '#c9bfa9'} />
            </Pressable>
          );
        })}
      </View>

      {divider}

      <View
        style={[styles.group, { flexDirection: rowDir, gap: size.swatchGap }]}
        role="radiogroup"
        aria-label={t.paletteLabel}
      >
        {PALETTE_ORDER.map((name) => {
          const active = paletteName === name;
          return (
            <Pressable
              key={name}
              onPress={() => setPalette(name)}
              role="radio"
              aria-checked={active}
              aria-label={t.paletteNames[name]}
              style={{
                width: size.swatch,
                height: size.swatch,
                borderRadius: size.swatch / 2,
                borderWidth: size.swatchBorder,
                borderColor: active ? '#f3d78b' : 'transparent',
                backgroundColor: PALETTE_SWATCH_HEX[name],
              }}
            />
          );
        })}
      </View>

      {divider}

      <View style={[styles.group, { flexDirection: rowDir, gap: 1 }]} role="radiogroup" aria-label={t.languageLabel}>
        {LANG_OPTIONS.map((opt) => {
          const active = lang === opt.lang;
          return (
            <Pressable
              key={opt.lang}
              onPress={() => setLang(opt.lang)}
              role="radio"
              aria-checked={active}
              style={[styles.langBtn, { paddingHorizontal: size.langPadX }, active && { backgroundColor: colours.metal2 }]}
            >
              <Text style={[styles.langLabel, { fontSize: size.langFont, color: active ? colours.ink : 'rgba(239,230,211,.6)' }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(11,10,8,.35)',
    flexShrink: 1,
  },
  clock: {
    color: '#efe6d3',
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,.12)' },
  group: { alignItems: 'center' },
  skyBtn: { alignItems: 'center', justifyContent: 'center' },
  langBtn: { borderRadius: 999, paddingVertical: 3 },
  langLabel: { fontWeight: '600' },
});
