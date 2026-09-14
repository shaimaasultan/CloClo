import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { APP_NAME } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { Logo } from '../Logo/Logo';
import { SettingsBar } from '../SettingsBar/SettingsBar';

// Below this width the settings pill tightens up (smaller buttons and gaps).
const COMPACT_BELOW = 480;
// Below this width the brand (logo, wordmark, slogan) and the settings pill
// can't share one row, so the header stacks them: brand on top, pill
// underneath — the wordmark and slogan never have to disappear.
const STACK_BELOW = 520;
// How much taller the stacked header is, for screens that size things
// around the header (the dial, and where the sun sits).
export const STACKED_HEADER_EXTRA = 42;
export const isHeaderStacked = (width: number) => width < STACK_BELOW;

// The top row on every screen: the brand on one side and the settings pill
// (clock and date, caller's sky, case colour, language) on the other.
export function BrandHeader() {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_BELOW;
  const stacked = isHeaderStacked(width);
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const paddingHorizontal = compact ? 12 : 16;

  const brand = (
    <View
      style={[styles.brand, { flexDirection: rowDir }]}
      accessibilityRole="header"
      accessibilityLabel={`${APP_NAME} — ${t.slogan}`}
    >
      <Logo size={compact ? 28 : 30} colours={colours} />
      <View style={[styles.textCol, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.brandName, compact && styles.brandNameCompact]} numberOfLines={1}>
          {APP_NAME}
        </Text>
        <Text style={styles.slogan} numberOfLines={1}>
          {t.slogan}
        </Text>
      </View>
    </View>
  );

  if (stacked) {
    return (
      <View style={[styles.stack, { paddingHorizontal }]}>
        <View style={[styles.stackRow, { flexDirection: rowDir }]}>{brand}</View>
        <View style={[styles.stackRow, { flexDirection: rowDir }]}>
          <SettingsBar compact={compact} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { flexDirection: rowDir, paddingHorizontal }]}>
      {brand}
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
  stack: { gap: 8, paddingTop: 10, paddingBottom: 6 },
  stackRow: { alignItems: 'center' },
  brand: { alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  textCol: { gap: 1, flexShrink: 1, minWidth: 0 },
  brandName: {
    color: '#f3ecdd',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandNameCompact: { fontSize: 15 },
  slogan: {
    color: 'rgba(239,230,211,.55)',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  spacer: { flex: 1 },
});
