import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BirthdayCard } from '../src/components/BirthdayCard/BirthdayCard';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useContacts } from '../src/state/ContactsContext';
import { isBirthdayOn } from '../src/state/decorations';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useCallContact } from '../src/state/useCallContact';

export default function ContactsScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { contacts } = useContacts();
  const callContact = useCallContact();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <ScreenShell active="contacts">
      <View style={[styles.toolbar, { flexDirection: rowDir }]}>
        <Pressable
          onPress={() => router.push('/contact')}
          role="button"
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.addBtn,
            { flexDirection: rowDir, borderColor: `${colours.metal2}8c` },
            (pressed || hovered) && { backgroundColor: `${colours.metal2}33` },
          ]}
        >
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M6 1.5v9M1.5 6h9" stroke={colours.highlight} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.addLabel, { color: colours.highlight }]}>{t.addContact}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <BirthdayCard people={contacts.filter((c) => isBirthdayOn(c.birthday))} onCall={callContact} />
        {contacts.length === 0 && <Text style={styles.empty}>{t.noContacts}</Text>}
        {contacts.map((caller) => {
          const meta = isBirthdayOn(caller.birthday) ? `🎂 ${t.birthdayToday} · ${caller.meta}` : caller.meta;
          return (
            <View key={caller.id} style={[styles.item, { flexDirection: rowDir }]}>
              <View style={styles.rowWrap}>
                <ContactRow name={caller.name} meta={meta} onPress={() => callContact(caller.id)} />
              </View>
              {/* A separate button beside the row: a button can't sit inside another. */}
              <Pressable
                onPress={() => router.push({ pathname: '/contact', params: { id: caller.id } })}
                role="button"
                aria-label={t.editContactAria(caller.name)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.editBtn,
                  (pressed || hovered) && styles.editBtnActive,
                ]}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"
                    stroke="rgba(239,230,211,.7)"
                    strokeWidth={1.8}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  addBtn: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addLabel: { fontSize: 11, fontWeight: '700' },
  list: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  item: { alignItems: 'center', gap: 4 },
  rowWrap: { flex: 1, minWidth: 0 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  editBtnActive: { backgroundColor: 'rgba(255,255,255,.07)' },
  empty: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.55)',
  },
});
