import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useLang } from '../src/state/LangContext';
import { useCallContact } from '../src/state/useCallContact';

export default function ContactsScreen() {
  const router = useRouter();
  const { t } = useLang();
  const callContact = useCallContact();

  return (
    <ScreenShell active="contacts" title={t.contactsTitle} backLabel={t.roomBack} onBack={() => router.navigate('/')}>
      <ScrollView contentContainerStyle={styles.list}>
        {t.callers.map((caller, idx) => (
          <ContactRow key={caller.number} name={caller.name} meta={caller.meta} onPress={() => callContact(idx)} />
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
});
