import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Caller } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';

// How many speed-dial holes fit under the dial.
const MAX_HOLES = 5;

interface SpeedDialProps {
  favourites: Caller[];
  onCall: (id: string) => void;
  holeSize?: number;
}

// Favourites as extra finger holes under the rotary dial: a brass-rimmed
// hole with the contact's initial and a little star. Tap one to call them.
export function SpeedDial({ favourites, onCall, holeSize = 42 }: SpeedDialProps) {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  if (favourites.length === 0) return null;

  return (
    <View style={[styles.row, { flexDirection: isRtl ? 'row-reverse' : 'row' }]} role="group" aria-label={t.speedDialLabel}>
      {favourites.slice(0, MAX_HOLES).map((contact) => (
        <Pressable
          key={contact.id}
          onPress={() => onCall(contact.id)}
          role="button"
          aria-label={t.speedDialAria(contact.name)}
          style={({ pressed }: { pressed: boolean }) => [styles.item, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.hole,
              {
                width: holeSize,
                height: holeSize,
                borderRadius: holeSize / 2,
                borderColor: colours.metal2,
                backgroundColor: colours.face,
              },
            ]}
          >
            <Text style={[styles.initial, { color: colours.ink }]}>{contact.name.charAt(0)}</Text>
            <Text style={[styles.star, { color: colours.highlight }]}>★</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {contact.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'center', gap: 14, marginTop: 10 },
  item: { alignItems: 'center', gap: 3, maxWidth: 64 },
  pressed: { transform: [{ scale: 0.94 }] },
  hole: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35)',
  },
  initial: { fontSize: 16, fontWeight: '800' },
  star: { position: 'absolute', top: -7, right: -5, fontSize: 13 },
  name: { color: 'rgba(239,230,211,.7)', fontSize: 9, fontWeight: '600' },
});
