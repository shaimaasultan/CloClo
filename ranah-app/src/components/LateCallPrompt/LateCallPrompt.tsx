import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useContacts } from '../../state/ContactsContext';
import { useKeeperState } from '../../state/KeeperStateContext';
import { askLateCall, usePendingLateCall } from '../../state/lateCall';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { useCallContact } from '../../state/useCallContact';
import { KeeperAvatar } from '../KeeperAvatar/KeeperAvatar';

// Mounted once at the root. When you call someone in the middle of their
// night, the keeper yawns and checks: "It's 2:14 AM for Mama. Call anyway?"
export function LateCallPrompt() {
  const pendingId = usePendingLateCall();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { contactById } = useContacts();
  const { mood, sky } = useKeeperState();
  const callContact = useCallContact();

  const contact = contactById(pendingId);
  if (!contact) return null;

  const time = t.clockTime(contact.localHour, new Date().getMinutes());
  const title = t.lateCallTitle(contact.name, time);
  const close = () => askLateCall(null);

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t.notNow} />
      <View
        role="alertdialog"
        aria-label={title}
        style={[styles.card, { backgroundColor: colours.body2, borderColor: `${colours.metal2}80` }]}
      >
        <KeeperAvatar size={120} colours={colours} callState="idle" mood={mood} sky={sky} variant="room" yawning sleepy />
        <Text style={styles.title}>🌙 {title}</Text>
        <Text style={styles.body}>{t.lateCallBody}</Text>
        <View style={[styles.buttons, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={close} role="button" style={styles.laterBtn}>
            <Text style={styles.laterLabel}>{t.notNow}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              close();
              callContact(contact.id, { force: true });
            }}
            role="button"
            style={[styles.callBtn, { backgroundColor: colours.metal2 }]}
          >
            <Text style={[styles.callLabel, { color: colours.ink }]}>{t.callAnyway}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,.55)',
  },
  card: { width: '100%', maxWidth: 340, alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, padding: 18 },
  title: { color: '#f3ecdd', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  body: { color: 'rgba(239,230,211,.7)', fontSize: 12, textAlign: 'center' },
  buttons: { gap: 10, marginTop: 8 },
  laterBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)' },
  laterLabel: { color: '#f3ecdd', fontSize: 12, fontWeight: '700' },
  callBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 },
  callLabel: { fontSize: 12, fontWeight: '800' },
});
