import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { useSettings } from '../../state/SettingsContext';

// Ported from the prototype's .infobar__group: the "Last dialed" readout
// (with its clear button) and, while a call is ringing or open, a second
// "Number" readout showing the caller's number.
export function CallInfoBar() {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { dialed, clearDialed, callState, ringerIdx } = useKeeperState();
  const { privacyMode } = useSettings();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  // Privacy mode masks the dialled digits one-for-one, as the prototype does.
  const readout = dialed ? (privacyMode ? '•'.repeat(dialed.length) : dialed) : '—';
  const caller = callState !== 'idle' && ringerIdx !== null ? t.callers[ringerIdx] : null;
  const pillBorder = { borderColor: `${colours.metal2}66` };

  return (
    <View style={[styles.group, { flexDirection: rowDir }]}>
      <View style={[styles.pill, styles.readoutPill, pillBorder, { flexDirection: rowDir }]}>
        <Text style={styles.label}>{t.readoutLabel}</Text>
        <Text style={[styles.digits, { color: colours.highlight }]}>{readout}</Text>
        {dialed.length > 0 && (
          <Pressable onPress={clearDialed} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel={t.clearAria}>
            <Text style={styles.clearBtnLabel}>×</Text>
          </Pressable>
        )}
      </View>

      {caller && (
        <View style={[styles.pill, pillBorder, { flexDirection: rowDir }]}>
          <Text style={styles.label}>{t.callingLabel}</Text>
          <Text style={[styles.digits, { color: colours.highlight }]}>{caller.number}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignItems: 'center', flexWrap: 'wrap', gap: 8, flexShrink: 1 },
  pill: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(11,10,8,.55)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  readoutPill: { paddingHorizontal: 12 },
  label: { color: 'rgba(239,230,211,.5)', fontSize: 9, letterSpacing: 1, fontFamily: 'monospace' },
  digits: { fontSize: 14, letterSpacing: 2, fontWeight: '600', fontFamily: 'monospace' },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239,230,211,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnLabel: { color: '#efe6d3', fontSize: 12, lineHeight: 14 },
});
