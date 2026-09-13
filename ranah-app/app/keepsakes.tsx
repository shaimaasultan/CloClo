import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import { KEEPSAKE_KINDS, Keepsake } from '../src/components/Keepsake/Keepsake';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useContacts } from '../src/state/ContactsContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// Like Sounds, but for the keeper's shelf: pick the object each caller leaves
// there once you've talked with them.
export default function KeepsakesScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { contacts } = useContacts();
  const { colours } = usePalette();
  const { keepsakeFor, setContactKeepsake, sfx } = useSettings();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <ScreenShell
      active="settings"
      back={{ label: t.settingsTitle, title: t.keepsakesTitle, onPress: () => router.dismissTo('/settings') }}
    >
      <Text style={styles.hint}>{t.keepsakesHint}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {contacts.map((caller) => {
          const selected = keepsakeFor(caller.id, caller.keepsake);
          return (
            <View key={caller.id} style={styles.block}>
              <View style={[styles.head, { flexDirection: rowDir }]}>
                <View style={[styles.avatar, { backgroundColor: colours.metal2 }]}>
                  <Text style={[styles.avatarLetter, { color: colours.ink }]}>{caller.name.charAt(0)}</Text>
                </View>
                <Text style={styles.name}>{caller.name}</Text>
              </View>
              <View style={[styles.picker, { flexDirection: rowDir }]} role="radiogroup" aria-label={caller.name}>
                {KEEPSAKE_KINDS.map((kind) => {
                  const active = kind === selected;
                  const color = active ? colours.highlight : 'rgba(239,230,211,.75)';
                  return (
                    <Pressable
                      key={kind}
                      onPress={() => {
                        setContactKeepsake(caller.id, kind);
                        sfx('bump');
                      }}
                      role="radio"
                      aria-checked={active}
                      aria-label={t.keepsakeNames[kind]}
                      style={[
                        styles.chip,
                        { flexDirection: rowDir },
                        active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
                      ]}
                    >
                      {/* A tiny drawing of the object itself. */}
                      <Svg width={18} height={21} viewBox="-12 22 24 26">
                        <Keepsake kind={kind} colours={colours} />
                      </Svg>
                      <Text style={[styles.chipLabel, { color }]}>{t.keepsakeShortNames[kind]}</Text>
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  chipLabel: { fontSize: 11, fontWeight: '600' },
});
