import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useLang } from '../src/state/LangContext';
import { useSettings } from '../src/state/SettingsContext';
import { useCallContact } from '../src/state/useCallContact';

export default function RecentsScreen() {
  const { t } = useLang();
  const { privacyMode } = useSettings();
  const callContact = useCallContact();

  return (
    <ScreenShell active="recents">
      <ScrollView contentContainerStyle={styles.list}>
        {privacyMode ? (
          <Text style={styles.hint}>{t.privacyHidden}</Text>
        ) : (
          t.recents.map((entry, i) => {
            const caller = t.callers[entry.callerIdx];
            return (
              <ContactRow
                key={`${entry.callerIdx}-${i}`}
                name={caller.name}
                meta={entry.time}
                subMeta={entry.meta}
                callType={entry.type}
                accessibilityLabel={`${t.callTypeNames[entry.type]} · ${caller.name} · ${entry.time} · ${entry.meta}`}
                onPress={() => callContact(entry.callerIdx)}
              />
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.55)',
  },
});
