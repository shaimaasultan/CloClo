import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PaletteName } from '../../theme/tokens';
import { SkyIcon } from '../SkyIcon/SkyIcon';
import { WeatherKind } from '../WeatherLayer/WeatherLayer';

const PALETTE_ORDER: PaletteName[] = ['oxblood', 'verdigris', 'ivory', 'graphite'];
const SKY_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'storm'];

const PALETTE_SWATCH_HEX: Record<PaletteName, string> = {
  oxblood: '6b2b26',
  verdigris: '1f3d34',
  ivory: 'cbb994',
  graphite: '2b2b2e',
};

// The caller's-sky and case-colour pickers sit above the phone's scene in the
// prototype (statusbar + the doc-harness controls cluster), so they persist
// across whichever screen is active — same here, one shared bar every route renders.
export function TopBar() {
  const { t, lang, setLang, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const { sky, setSky } = useKeeperState();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={[styles.topBar, { flexDirection: rowDir }]}>
      <View style={[styles.skyPicker, { flexDirection: rowDir }]}>
        {SKY_ORDER.map((kind) => {
          const active = sky === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => setSky(kind)}
              accessibilityRole="button"
              accessibilityLabel={`${t.skyPrefix}: ${t.skyNames[kind]}`}
              style={[styles.skyBtn, active && { backgroundColor: 'rgba(243,215,139,.22)' }]}
            >
              <SkyIcon kind={kind} size={15} color={active ? colours.highlight : '#c9bfa9'} />
            </Pressable>
          );
        })}
      </View>
      {PALETTE_ORDER.map((name) => (
        <Pressable
          key={name}
          onPress={() => setPalette(name)}
          style={[
            styles.swatch,
            { backgroundColor: `#${PALETTE_SWATCH_HEX[name]}` },
            paletteName === name && styles.swatchActive,
          ]}
        />
      ))}
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => setLang(lang === 'en' ? 'ar' : 'en')} style={styles.langToggle}>
        <Text style={[styles.langLabel, lang === 'en' && styles.langLabelActive]}>EN</Text>
        <Text style={[styles.langLabel, lang === 'ar' && styles.langLabelActive]}>عربي</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#f3d78b' },
  skyPicker: { gap: 4, marginRight: 4 },
  skyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
