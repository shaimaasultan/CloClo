import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../src/components/Icons/Icons';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { Switch } from '../src/components/Switch/Switch';
import { useLang } from '../src/state/LangContext';
import { useSettings } from '../src/state/SettingsContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { soundEnabled, toggleSound, privacyMode, togglePrivacy } = useSettings();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textCol = { alignItems: isRtl ? ('flex-end' as const) : ('flex-start' as const) };
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  return (
    <ScreenShell active="settings">
      <ScrollView contentContainerStyle={styles.list}>
        <View style={[styles.row, { flexDirection: rowDir }]}>
          <View style={[styles.text, textCol]}>
            <Text style={[styles.label, { textAlign }]}>{t.soundLabel}</Text>
            <Text style={[styles.hint, { textAlign }]}>{t.soundHint}</Text>
          </View>
          <Switch value={soundEnabled} onToggle={toggleSound} accessibilityLabel={t.soundLabel} />
        </View>

        <View style={[styles.row, { flexDirection: rowDir }]}>
          <View style={[styles.text, textCol]}>
            <Text style={[styles.label, { textAlign }]}>{t.privacyLabel}</Text>
            <Text style={[styles.hint, { textAlign }]}>{t.privacyHint}</Text>
          </View>
          <Switch value={privacyMode} onToggle={togglePrivacy} accessibilityLabel={t.privacyLabel} />
        </View>

        <Pressable
          // A child screen on top of Settings; its back link dismisses it.
          onPress={() => router.push('/advanced')}
          accessibilityRole="button"
          style={[styles.link, { flexDirection: rowDir }]}
        >
          <View style={[styles.text, textCol]}>
            <Text style={[styles.label, { textAlign }]}>{t.advancedTitle}</Text>
            <Text style={[styles.hint, { textAlign }]}>{t.advancedHint}</Text>
          </View>
          <ChevronIcon color="rgba(239,230,211,.4)" size={16} direction="forward" isRtl={isRtl} />
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  link: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.06)',
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  hint: { color: 'rgba(239,230,211,.5)', fontSize: 10, fontFamily: 'monospace' },
});
