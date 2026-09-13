import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TONE_IDS } from '../src/audio/tones';
import { ToneIcon } from '../src/components/Icons/Icons';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// Ported from the prototype's sounds screen: one block per caller with a
// wrap-around row of ringtone chips; picking one previews it.
export default function SoundsScreen() {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { toneForContact, setContactTone } = useSettings();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <ScreenShell active="sounds">
      <Text style={styles.hint}>{t.soundsHint}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {t.callers.map((caller, idx) => {
          const selected = toneForContact(idx);
          return (
            <View key={caller.number} style={styles.block}>
              <View style={[styles.head, { flexDirection: rowDir }]}>
                <View style={[styles.avatar, { backgroundColor: colours.metal2 }]}>
                  <Text style={[styles.avatarLetter, { color: colours.ink }]}>{caller.name.charAt(0)}</Text>
                </View>
                <Text style={styles.name}>{caller.name}</Text>
              </View>
              <View
                style={[styles.picker, { flexDirection: rowDir }]}
                role="radiogroup"
                aria-label={caller.name}
              >
                {TONE_IDS.map((tone) => {
                  const active = tone === selected;
                  const color = active ? colours.highlight : 'rgba(239,230,211,.75)';
                  return (
                    <Pressable
                      key={tone}
                      onPress={() => setContactTone(idx, tone)}
                      // One tone per caller, so each chip is a radio option.
                      role="radio"
                      aria-checked={active}
                      style={[
                        styles.chip,
                        { flexDirection: rowDir },
                        active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
                      ]}
                    >
                      <ToneIcon color={color} />
                      <Text style={[styles.chipLabel, { color }]}>{t.toneNames[tone]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.55)',
  },
  list: { paddingTop: 2, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  block: { gap: 8 },
  head: { alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 13, fontWeight: '800' },
  name: { color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  picker: { flexWrap: 'wrap', gap: 6 },
  chip: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  chipLabel: { fontSize: 11, fontWeight: '600' },
});
