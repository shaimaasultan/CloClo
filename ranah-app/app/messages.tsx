import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { SearchBox } from '../src/components/SearchBox/SearchBox';
import { messageTime } from '../src/messages/format';
import { contactMatches } from '../src/state/contactSearch';
import { useContacts } from '../src/state/ContactsContext';
import { useLang } from '../src/state/LangContext';
import { useMessages } from '../src/state/MessagesContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// Your conversations, most recent first, with search, a new-message picker,
// and a preview button that delivers a sample message (until messages can
// arrive from other people's devices).
export default function MessagesScreen() {
  const router = useRouter();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { contacts, contactById } = useContacts();
  const { myId, conversations, receiveMessage } = useMessages();
  const { sfx } = useSettings();
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  // Keep "2:14 PM" / "Yesterday" labels current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const q = query.trim().toLowerCase();
  const shown = conversations.filter((conversation) => {
    const contact = contactById(conversation.peerId);
    return !!contact && (!q || contactMatches(contact, query) || conversation.last.text.toLowerCase().includes(q));
  });
  const pickable = contacts.filter((contact) => contactMatches(contact, query));

  const openChat = (id: string) => {
    setPicking(false);
    setQuery('');
    router.push({ pathname: '/chat', params: { id } });
  };

  const previewIncoming = () => {
    if (contacts.length === 0) return;
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const text = t.sampleMessages[Math.floor(Math.random() * t.sampleMessages.length)];
    receiveMessage(contact.id, text);
    sfx('bump');
    setNow(Date.now());
  };

  const avatar = (name: string, size = 40) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colours.metal2 }]}>
      <Text style={[styles.avatarLetter, { color: colours.ink, fontSize: size * 0.4 }]}>{name.charAt(0)}</Text>
    </View>
  );

  return (
    <ScreenShell active="messages">
      <View style={[styles.toolbar, { flexDirection: rowDir }]}>
        <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
        <Pressable
          onPress={() => setPicking((p) => !p)}
          role="button"
          aria-expanded={picking}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.newBtn,
            { flexDirection: rowDir, borderColor: `${colours.metal2}8c` },
            (pressed || hovered || picking) && { backgroundColor: `${colours.metal2}33` },
          ]}
        >
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" stroke={colours.highlight} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
          <Text style={[styles.newLabel, { color: colours.highlight }]}>{t.newMessage}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {picking && (
          <View style={[styles.picker, { borderColor: `${colours.metal2}66` }]}>
            <Text style={[styles.pickerTitle, { textAlign }]}>{t.chooseContact}</Text>
            {pickable.length === 0 && <Text style={styles.empty}>{t.noMatches}</Text>}
            {pickable.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => openChat(contact.id)}
                role="button"
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.pickRow,
                  { flexDirection: rowDir },
                  (pressed || hovered) && styles.rowActive,
                ]}
              >
                {avatar(contact.name, 30)}
                <Text style={[styles.pickName, { textAlign }]}>{contact.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!picking && shown.length === 0 && <Text style={styles.empty}>{q ? t.noMatches : t.noConversations}</Text>}

        {!picking &&
          shown.map((conversation) => {
            const contact = contactById(conversation.peerId);
            if (!contact) return null;
            const mine = conversation.last.from === myId;
            const unread = conversation.unread > 0;
            return (
              <Pressable
                key={conversation.peerId}
                onPress={() => openChat(conversation.peerId)}
                role="button"
                aria-label={unread ? `${contact.name}, ${t.unreadMessagesCount(conversation.unread)}` : contact.name}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.row,
                  { flexDirection: rowDir },
                  (pressed || hovered) && styles.rowActive,
                ]}
              >
                {avatar(contact.name)}
                <View style={styles.info}>
                  <View style={[styles.line, { flexDirection: rowDir }]}>
                    <Text style={[styles.name, { textAlign }, unread && styles.nameUnread]} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text style={[styles.time, unread && { color: colours.highlight }]}>
                      {messageTime(t, lang, conversation.last.at, now)}
                    </Text>
                  </View>
                  <View style={[styles.line, { flexDirection: rowDir }]}>
                    <Text style={[styles.preview, { textAlign }, unread && styles.previewUnread]} numberOfLines={1}>
                      {mine ? t.youPrefix(conversation.last.text) : conversation.last.text}
                    </Text>
                    {unread && (
                      <View style={[styles.unreadBadge, { backgroundColor: colours.highlight }]}>
                        <Text style={[styles.unreadText, { color: colours.ink }]}>{conversation.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

        <View style={[styles.footerRow, { flexDirection: rowDir }]}>
          <Pressable onPress={previewIncoming} role="button" style={styles.previewBtn}>
            <Text style={styles.previewLabel}>{t.previewMessage}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{t.messagesLocalNote}</Text>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  newBtn: { alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  newLabel: { fontSize: 11, fontWeight: '700' },
  list: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 16, gap: 2 },
  picker: { borderWidth: 1, borderRadius: 14, padding: 8, gap: 2, marginBottom: 8, backgroundColor: 'rgba(11,10,8,.3)' },
  pickerTitle: {
    color: 'rgba(239,230,211,.6)',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pickRow: { alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },
  pickName: { flex: 1, color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  row: { alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  rowActive: { backgroundColor: 'rgba(255,255,255,.05)' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontWeight: '800' },
  info: { flex: 1, minWidth: 0, gap: 3 },
  line: { alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0, color: '#f3ecdd', fontSize: 14, fontWeight: '600' },
  nameUnread: { fontWeight: '800' },
  time: { color: 'rgba(239,230,211,.5)', fontSize: 10, fontFamily: 'monospace' },
  preview: { flex: 1, minWidth: 0, color: 'rgba(239,230,211,.55)', fontSize: 12 },
  previewUnread: { color: '#f3ecdd', fontWeight: '600' },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 10, fontWeight: '800' },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 11, fontFamily: 'monospace', color: 'rgba(239,230,211,.55)' },
  footerRow: { justifyContent: 'center', paddingTop: 14 },
  previewBtn: { backgroundColor: 'rgba(239,230,211,.1)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  previewLabel: { color: 'rgba(239,230,211,.8)', fontSize: 10, fontWeight: '600' },
  note: { textAlign: 'center', paddingTop: 8, fontSize: 9, fontFamily: 'monospace', color: 'rgba(239,230,211,.4)' },
});
