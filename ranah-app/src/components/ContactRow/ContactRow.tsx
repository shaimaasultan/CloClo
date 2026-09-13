import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CallType } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { CallTypeIcon, PhoneIcon } from '../Icons/Icons';

const MISSED_RED = '#e6a49c';

interface ContactRowProps {
  name: string;
  meta: string;
  // Recents only: the call direction arrow, and a second, dimmer meta line.
  callType?: CallType;
  subMeta?: string;
  accessibilityLabel?: string;
  onPress: () => void;
}

// Ported from the prototype's .contact-row: initial avatar, name + meta
// column, and a phone glyph on the trailing edge.
export function ContactRow({ name, meta, callType, subMeta, accessibilityLabel, onPress }: ContactRowProps) {
  const { isRtl } = useLang();
  const { colours } = usePalette();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? 'right' : 'left';
  const missed = callType === 'missed';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        { flexDirection: rowDir },
        (pressed || hovered) && styles.rowActive,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colours.metal2 }]}>
        <Text style={[styles.avatarLetter, { color: colours.ink }]}>{name.charAt(0)}</Text>
      </View>

      <View style={[styles.info, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.name, { textAlign }, missed && { color: MISSED_RED }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.metaRow, { flexDirection: rowDir }]}>
          {callType && <CallTypeIcon type={callType} color={missed ? MISSED_RED : 'rgba(239,230,211,.5)'} />}
          <Text style={[styles.meta, { textAlign }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {subMeta ? (
          <Text style={[styles.meta, styles.subMeta, { textAlign }]} numberOfLines={1}>
            {subMeta}
          </Text>
        ) : null}
      </View>

      <PhoneIcon color={colours.highlight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 14 },
  rowActive: { backgroundColor: 'rgba(255,255,255,.05)' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontWeight: '800' },
  info: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  metaRow: { alignItems: 'center', gap: 5, maxWidth: '100%' },
  meta: { color: 'rgba(239,230,211,.55)', fontSize: 10, fontFamily: 'monospace', flexShrink: 1 },
  subMeta: { color: 'rgba(239,230,211,.4)', marginTop: 1, maxWidth: '100%' },
});
