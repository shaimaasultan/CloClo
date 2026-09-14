import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { keepRecording } from '../src/audio/recordedTones';
import { TONE_IDS } from '../src/audio/tones';
import { ToneIcon } from '../src/components/Icons/Icons';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { ToneRecorder } from '../src/components/ToneRecorder/ToneRecorder';
import type { ToneId } from '../src/i18n/dictionaries';
import { useContacts } from '../src/state/ContactsContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// Ported from the prototype's sounds screen: one block per caller with a
// wrap-around row of ringtone chips; picking one previews it. Each caller
// can also have a ringtone you record yourself.
export default function SoundsScreen() {
  const { t, isRtl } = useLang();
  const { contacts } = useContacts();
  const { colours } = usePalette();
  const { toneForContact, setContactTone, recordedToneFor, setRecordedTone } = useSettings();
  // The contact whose recorder panel is open.
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <ScreenShell active="sounds">
      <Text style={styles.hint}>{t.soundsHint}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {contacts.map((caller) => {
          const selected = toneForContact(caller.id);
          const recorded = recordedToneFor(caller.id);
          const options: ToneId[] = recorded ? [...TONE_IDS, 'recorded'] : TONE_IDS;
          return (
            <View key={caller.id} style={styles.block}>
              <View style={[styles.head, { flexDirection: rowDir }]}>
                <View style={[styles.avatar, { backgroundColor: colours.metal2 }]}>
                  <Text style={[styles.avatarLetter, { color: colours.ink }]}>{caller.name.charAt(0)}</Text>
                </View>
                <Text style={styles.name}>{caller.name}</Text>
              </View>
              <View style={[styles.picker, { flexDirection: rowDir }]} role="radiogroup" aria-label={caller.name}>
                {options.map((tone) => {
                  const active = tone === selected;
                  const color = active ? colours.highlight : 'rgba(239,230,211,.75)';
                  return (
                    <Pressable
                      key={tone}
                      onPress={() => setContactTone(caller.id, tone)}
                      // One tone per caller, so each chip is a radio option.
                      role="radio"
                      aria-checked={active}
                      style={[
                        styles.chip,
                        { flexDirection: rowDir },
                        active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
                      ]}
                    >
                      {tone === 'recorded' ? <Text style={styles.micIcon}>🎙</Text> : <ToneIcon color={color} />}
                      <Text style={[styles.chipLabel, { color }]}>{t.toneNames[tone]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.recordRow, { flexDirection: rowDir }]}>
                <Pressable
                  onPress={() => setRecordingFor((current) => (current === caller.id ? null : caller.id))}
                  role="button"
                  aria-expanded={recordingFor === caller.id}
                  style={styles.linkBtn}
                >
                  <Text style={[styles.linkLabel, { color: colours.highlight }]}>
                    🎙 {recorded ? t.recordNewTone : t.recordTone}
                  </Text>
                </Pressable>
                {recorded && (
                  <Pressable onPress={() => setRecordedTone(caller.id, null)} role="button" style={styles.linkBtn}>
                    <Text style={styles.deleteLabel}>{t.recordDelete}</Text>
                  </Pressable>
                )}
              </View>

              {recordingFor === caller.id && (
                <ToneRecorder
                  contactName={caller.name}
                  onClose={() => setRecordingFor(null)}
                  onKeep={async (tempUri) => {
                    setRecordedTone(caller.id, await keepRecording(caller.id, tempUri));
                  }}
                />
              )}
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
  list: { paddingTop: 2, paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
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
  micIcon: { fontSize: 11 },
  recordRow: { alignItems: 'center', gap: 14 },
  linkBtn: { paddingVertical: 2 },
  linkLabel: { fontSize: 11, fontWeight: '700' },
  deleteLabel: { color: '#e6a49c', fontSize: 11, fontWeight: '700' },
});
