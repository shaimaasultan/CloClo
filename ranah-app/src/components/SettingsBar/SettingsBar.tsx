import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lang } from '../../i18n/dictionaries';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PALETTE_SWATCH_HEX } from '../../theme/tokens';
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

// The current moment, refreshed often enough for both the time and the date.
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  return now;
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
  const { paletteName, colours, setPalette, quickPalettes } = usePalette();
  const router = useRouter();
  const { sky, setSky } = useKeeperState();
  const now = useClock();
  const time = formatTime(now);
  // Today's date in the app's language: "Sun 13 Sept" / "الأحد ١٣ سبتمبر".
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const date = now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const fullDate = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const rowDir = isRtl ? 'row-reverse' : 'row';

  const size = compact
    ? { gap: 6, padX: 8, clock: 12, date: 8, skyBtn: 22, skyIcon: 14, swatch: 14, swatchGap: 3, swatchBorder: 1.5, langFont: 10, langPadX: 5 }
    : { gap: 8, padX: 12, clock: 14, date: 9, skyBtn: 26, skyIcon: 15, swatch: 18, swatchGap: 6, swatchBorder: 2, langFont: 12, langPadX: 8 };

  const divider = <View style={styles.divider} />;

  return (
    <View style={[styles.pill, { flexDirection: rowDir, gap: size.gap, paddingHorizontal: size.padX }]}>
      {/* The date sits in small type under the time, so the pill stays the same width. */}
      <View style={styles.clockBlock} accessible accessibilityLabel={`${fullDate}, ${time}`}>
        <Text style={[styles.clock, { fontSize: size.clock, lineHeight: size.clock + 2 }]}>{time}</Text>
        <Text style={[styles.date, { fontSize: size.date, lineHeight: size.date + 2 }]} numberOfLines={1}>
          {date}
        </Text>
      </View>

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

      {/* Three quick case colours (the ones used most recently), and a
          button for all the others in Advanced settings. */}
      <View
        style={[styles.group, { flexDirection: rowDir, gap: size.swatchGap }]}
        role="radiogroup"
        aria-label={t.paletteLabel}
      >
        {quickPalettes.map((name) => {
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
                borderColor: active ? colours.highlight : 'transparent',
                backgroundColor: PALETTE_SWATCH_HEX[name],
              }}
            />
          );
        })}
        <Pressable
          onPress={() => router.push('/advanced')}
          role="button"
          aria-label={t.moreColoursAria}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.moreBtn,
            { width: size.swatch, height: size.swatch, borderRadius: size.swatch / 2 },
            (pressed || hovered) && styles.swatchBtnActive,
          ]}
        >
          <Text style={[styles.moreLabel, { fontSize: Math.round(size.swatch * 0.7), lineHeight: size.swatch - 2 }]}>+</Text>
        </Pressable>
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
  clockBlock: { alignItems: 'center' },
  date: { color: 'rgba(239,230,211,.6)', fontWeight: '600', letterSpacing: 0.2 },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,.12)' },
  group: { alignItems: 'center' },
  skyBtn: { alignItems: 'center', justifyContent: 'center' },
  swatchBtnActive: { opacity: 0.8 },
  moreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(239,230,211,.5)',
  },
  moreLabel: { color: 'rgba(239,230,211,.85)', fontWeight: '700', textAlign: 'center' },
  langBtn: { borderRadius: 999, paddingVertical: 3 },
  langLabel: { fontWeight: '600' },
});
