import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { Lang } from '../src/i18n/dictionaries';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { DECOR_CHOICES } from '../src/state/decorations';
import { useSettings } from '../src/state/SettingsContext';
import { PALETTE_ORDER, PALETTE_SWATCH_HEX } from '../src/theme/tokens';

// Nudge after this many days without talking; 0 is off.
const NUDGE_OPTIONS = [0, 3, 7, 14, 30];

const LANG_OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'EN' },
  { lang: 'ar', label: 'عربي' },
];

// Ported from the prototype's advanced settings screen: large case-colour
// swatches and a segmented EN / عربي language switch.
export default function AdvancedSettingsScreen() {
  const router = useRouter();
  const { t, lang, setLang, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const { decorChoice, setDecorChoice, nudgeDays, setNudgeDays } = useSettings();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const align = { alignItems: isRtl ? ('flex-end' as const) : ('flex-start' as const) };

  return (
    <ScreenShell
      active="settings"
      back={{ label: t.settingsTitle, title: t.advancedTitle, onPress: () => router.dismissTo('/settings') }}
    >
      <ScrollView contentContainerStyle={styles.list}>
        <View style={[styles.section, align]}>
          <Text style={styles.label}>
            {t.paletteLabel} · {t.paletteNames[paletteName]}
          </Text>
          <View style={[styles.swatchRow, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.paletteLabel}>
            {PALETTE_ORDER.map((name) => {
              const active = paletteName === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => setPalette(name)}
                  role="radio"
                  aria-label={t.paletteNames[name]}
                  aria-checked={active}
                  style={[
                    styles.swatch,
                    { backgroundColor: PALETTE_SWATCH_HEX[name] },
                    active && { borderColor: colours.highlight },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Decorations follow the date, or preview any season or holiday. */}
        <View style={[styles.section, align]}>
          <Text style={styles.label}>{t.decorLabel}</Text>
          <View style={[styles.chipRow, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.decorLabel}>
            {DECOR_CHOICES.map((choice) => {
              const active = decorChoice === choice;
              return (
                <Pressable
                  key={choice}
                  onPress={() => setDecorChoice(choice)}
                  role="radio"
                  aria-checked={active}
                  style={[
                    styles.chip,
                    active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: active ? colours.highlight : 'rgba(239,230,211,.75)' }]}>
                    {t.decorNames[choice]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* How long before the keeper nudges you to call someone. */}
        <View style={[styles.section, align]}>
          <Text style={styles.label}>{t.nudgeLabel}</Text>
          <Text style={[styles.hint, { textAlign: isRtl ? 'right' : 'left' }]}>{t.nudgeHint}</Text>
          <View style={[styles.chipRow, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.nudgeLabel}>
            {NUDGE_OPTIONS.map((days) => {
              const active = nudgeDays === days;
              return (
                <Pressable
                  key={days}
                  onPress={() => setNudgeDays(days)}
                  role="radio"
                  aria-checked={active}
                  style={[
                    styles.chip,
                    active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: active ? colours.highlight : 'rgba(239,230,211,.75)' }]}>
                    {days === 0 ? t.nudgeOff : t.nudgeAfterDays(days)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, styles.lastSection, align]}>
          <Text style={styles.label}>{t.languageLabel}</Text>
          <View style={[styles.langSwitch, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.languageLabel}>
            {LANG_OPTIONS.map((opt) => {
              const active = lang === opt.lang;
              return (
                <Pressable
                  key={opt.lang}
                  onPress={() => setLang(opt.lang)}
                  role="radio"
                  aria-checked={active}
                  style={[styles.langBtn, active && { backgroundColor: colours.metal2 }]}
                >
                  <Text style={[styles.langLabel, { color: active ? colours.ink : 'rgba(239,230,211,.6)' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16 },
  section: {
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  lastSection: { borderBottomWidth: 0 },
  label: { color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  hint: { color: 'rgba(239,230,211,.5)', fontSize: 10, fontFamily: 'monospace', marginTop: -6 },
  // Eight themes: the swatches wrap onto a second row on narrow screens.
  swatchRow: { gap: 10, flexWrap: 'wrap' },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  chipRow: { flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  langSwitch: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.12)',
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  langBtn: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  langLabel: { fontSize: 12, fontWeight: '600' },
});
