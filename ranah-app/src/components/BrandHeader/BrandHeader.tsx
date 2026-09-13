import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { APP_NAME } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { Logo } from '../Logo/Logo';
import { SettingsBar } from '../SettingsBar/SettingsBar';

// Below this width the logo, wordmark, slogan, and settings pill can't share
// one row, so the wordmark and slogan step aside (they stay in the
// accessibility label) and the pill tightens up.
const COMPACT_BELOW = 480;

// The top row on every screen: the brand on one side and the settings pill
// (clock, caller's sky, case colour, language) on the other.
export function BrandHeader() {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_BELOW;
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={[styles.row, { flexDirection: rowDir, paddingHorizontal: compact ? 12 : 16 }]}>
      <View
        style={[styles.brand, { flexDirection: rowDir }]}
        accessibilityRole="header"
        accessibilityLabel={`${APP_NAME} — ${t.slogan}`}
      >
        <Logo size={compact ? 28 : 30} colours={colours} />
        {!compact && (
          <View style={[styles.textCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.brandName}>{APP_NAME}</Text>
            <Text style={styles.slogan}>{t.slogan}</Text>
          </View>
        )}
      </View>
      <View style={styles.spacer} />
      <SettingsBar compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brand: { alignItems: 'center', gap: 10, flexShrink: 0 },
  textCol: { gap: 1 },
  brandName: {
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
  spacer: { flex: 1 },
});
