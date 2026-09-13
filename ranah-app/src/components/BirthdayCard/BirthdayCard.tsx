import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Caller } from '../../i18n/dictionaries';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PhoneIcon } from '../Icons/Icons';

const BUNTING = ['#e8709a', '#f3d78b', '#5fb8a8', '#8fb3e8'];

// A reminder card listing everyone whose birthday is today, each with their
// local time (is it a good hour to ring?) and a button to call them.
export function BirthdayCard({ people, onCall }: { people: Caller[]; onCall: (id: string) => void }) {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);
  const now = new Date();

  if (people.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: `${colours.metal2}24`, borderColor: `${colours.metal2}66` }]}
      role="region"
      aria-label={t.birthdaysTitle}
    >
      {/* A strip of party bunting across the top. */}
      <Svg width="100%" height={10} viewBox="0 0 200 10" preserveAspectRatio="none" style={styles.bunting}>
        {Array.from({ length: 10 }, (_, i) => (
          <Path key={i} d={`M${i * 20 + 2} 0 L${i * 20 + 18} 0 L${i * 20 + 10} 9 Z`} fill={BUNTING[i % BUNTING.length]} />
        ))}
      </Svg>

      <View style={[styles.head, { flexDirection: rowDir }]}>
        <Text style={styles.cake}>🎂</Text>
        <View style={styles.headText}>
          <Text style={[styles.title, { textAlign, color: colours.highlight }]} accessibilityRole="header">
            {t.birthdaysTitle}
          </Text>
          <Text style={[styles.hint, { textAlign }]}>{t.birthdaysHint}</Text>
        </View>
      </View>

      {people.map((person) => (
        <View key={person.id} style={[styles.row, { flexDirection: rowDir }]}>
          <View style={[styles.avatar, { backgroundColor: colours.metal2 }]}>
            <Text style={[styles.avatarLetter, { color: colours.ink }]}>{person.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { textAlign }]} numberOfLines={1}>
              {person.name}
            </Text>
            <Text style={[styles.meta, { textAlign }]} numberOfLines={1}>
              {t.theirTime(person.localHour, now.getMinutes())}
            </Text>
          </View>
          <Pressable
            onPress={() => onCall(person.id)}
            role="button"
            aria-label={t.birthdayCakeLabel(person.name)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.callBtn,
              { flexDirection: rowDir, backgroundColor: colours.metal2 },
              (pressed || hovered) && styles.callBtnActive,
            ]}
          >
            <PhoneIcon color={colours.ink} />
            <Text style={[styles.callLabel, { color: colours.ink }]}>{t.birthdayCall}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 12, gap: 6, overflow: 'hidden' },
  bunting: { position: 'absolute', top: 0, left: 0, right: 0 },
  head: { alignItems: 'center', gap: 10, marginBottom: 2 },
  cake: { fontSize: 22 },
  headText: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontSize: 14, fontWeight: '800' },
  hint: { color: 'rgba(239,230,211,.6)', fontSize: 10, fontFamily: 'monospace' },
  row: { alignItems: 'center', gap: 10, paddingVertical: 4 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 13, fontWeight: '800' },
  info: { flex: 1, minWidth: 0, gap: 1 },
  name: { color: '#f3ecdd', fontSize: 13, fontWeight: '700' },
  meta: { color: 'rgba(239,230,211,.55)', fontSize: 10, fontFamily: 'monospace' },
  callBtn: { alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  callBtnActive: { opacity: 0.85 },
  callLabel: { fontSize: 11, fontWeight: '800' },
});
