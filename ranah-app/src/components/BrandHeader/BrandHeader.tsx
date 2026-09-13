import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { Logo } from '../Logo/Logo';

// Sits above the navigation dock on every screen — the one piece of chrome
// that's purely brand, not a control, so it stays put regardless of which
// screen is active. The language toggle rides along on the opposite side
// since it's the one control that isn't visual theming (sky/colour), which
// now live in their own row under the dock.
export function BrandHeader() {
  const { t, lang, setLang, isRtl } = useLang();
  const { colours } = usePalette();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={[styles.row, { flexDirection: rowDir }]}>
      <Logo size={30} colours={colours} />
      <View style={[styles.textCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.slogan}>{t.slogan}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => setLang(lang === 'en' ? 'ar' : 'en')} style={styles.langToggle}>
        <Text style={[styles.langLabel, lang === 'en' && styles.langLabelActive]}>EN</Text>
        <Text style={[styles.langLabel, lang === 'ar' && styles.langLabelActive]}>عربي</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  textCol: { gap: 1 },
  brand: {
    color: '#f3ecdd',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slogan: {
    color: 'rgba(239,230,211,.55)',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  langToggle: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langLabel: { color: 'rgba(239,230,211,.5)', fontSize: 12, fontWeight: '600' },
  langLabelActive: { color: '#efe6d3' },
});
