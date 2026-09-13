import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { Lang } from '../src/i18n/dictionaries';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { PALETTE_ORDER, PALETTE_SWATCH_HEX } from '../src/theme/tokens';

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
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const align = { alignItems: isRtl ? ('flex-end' as const) : ('flex-start' as const) };

  return (
    <ScreenShell
      active="settings"
      title={t.advancedTitle}
      backLabel={t.settingsTitle}
      onBack={() => router.navigate('/settings')}
    >
      <ScrollView contentContainerStyle={styles.list}>
        <View style={[styles.section, align]}>
          <Text style={styles.label}>{t.paletteLabel}</Text>
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
  swatchRow: { gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
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
