import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PhoneIcon } from '../src/components/Icons/Icons';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { dayHeading, messageTime, textDirection } from '../src/messages/format';
import { useContacts } from '../src/state/ContactsContext';
import { useInbox } from '../src/state/InboxContext';
import { useLang } from '../src/state/LangContext';
import { Message, useMessages } from '../src/state/MessagesContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';
import { useCallContact } from '../src/state/useCallContact';

type ThreadItem = { kind: 'day'; key: string; label: string } | { kind: 'message'; message: Message };

// One conversation (?id=contact): bubbles grouped by day, a composer, tap a
// message to delete it, and call or delete the conversation from the header.
export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { contactById } = useContacts();
  const { myId, thread, sendMessage, markThreadRead, deleteMessage, deleteThread, setActiveChat } = useMessages();
  const { markSeenFrom } = useInbox();
  const { sfx } = useSettings();
  const callContact = useCallContact();
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<ScrollView>(null);

  const contact = contactById(id);
  const messages = id ? thread(id) : [];
  const hasUnread = messages.some((m) => m.to === myId && !m.readAt);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Opening the conversation reads it — and so does a message arriving while
  // it's open.
  // It also clears that person's notifications, and while it's on screen no
  // banner appears for their new messages.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setActiveChat(id);
      markThreadRead(id);
      markSeenFrom(id);
      return () => setActiveChat(null);
    }, [id, markThreadRead, markSeenFrom, setActiveChat])
  );
  useEffect(() => {
    if (id && hasUnread) {
      markThreadRead(id);
      markSeenFrom(id);
    }
  }, [id, hasUnread, markThreadRead, markSeenFrom]);

  // A deleted contact (or a bad link) closes the conversation.
  useEffect(() => {
    if (!contact) router.dismissTo('/messages');
  }, [contact, router]);
  if (!id || !contact) return null;

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const canSend = draft.trim().length > 0;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(id, text);
    setDraft('');
    setSelected(null);
    sfx('click');
  };

  // On the web, Enter sends and Shift+Enter starts a new line.
  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const key = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (key.key === 'Enter' && !key.shiftKey) {
      (e as unknown as { preventDefault?: () => void }).preventDefault?.();
      send();
    }
  };

  const items: ThreadItem[] = [];
  let lastDay = '';
  for (const message of messages) {
    const d = new Date(message.at);
    const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (day !== lastDay) {
      items.push({ kind: 'day', key: day, label: dayHeading(t, lang, message.at, now) });
      lastDay = day;
    }
    items.push({ kind: 'message', message });
  }

  const renderMessage = (message: Message) => {
    const mine = message.from === myId;
    const isSelected = selected === message.id;
    // Yours on the trailing side, theirs on the leading side (mirrored in Arabic).
    const side = mine !== isRtl ? 'flex-end' : 'flex-start';
    const time = messageTime(t, lang, message.at, now);
    return (
      <View key={message.id} style={[styles.messageWrap, { alignSelf: side, alignItems: side }]}>
        <Pressable
          onPress={() => setSelected(isSelected ? null : message.id)}
          onLongPress={() => setSelected(message.id)}
          role="button"
          aria-label={`${mine ? t.youLabel : contact.name}: ${message.text}, ${time}`}
          style={[
            styles.bubble,
            mine ? { backgroundColor: colours.metal2 } : styles.theirBubble,
            mine ? (isRtl ? styles.tailLeading : styles.tailTrailing) : isRtl ? styles.tailTrailing : styles.tailLeading,
            isSelected && { borderColor: colours.highlight },
          ]}
        >
          <Text style={[styles.bubbleText, textDirection(message.text), { color: mine ? colours.ink : '#f3ecdd' }]}>
            {message.text}
          </Text>
        </Pressable>
        <Text style={styles.stamp}>
          {time}
          {mine ? ` · ${message.status === 'sending' ? t.messageSending : `${t.messageSent} ✓`}` : ''}
        </Text>
        {isSelected && (
          <View style={[styles.actions, { flexDirection: rowDir }]}>
            <Pressable
              onPress={() => {
                deleteMessage(message.id);
                setSelected(null);
              }}
              role="button"
              style={styles.actionDelete}
            >
              <Text style={styles.actionDeleteLabel}>{t.deleteMessage}</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} role="button" style={styles.actionCancel}>
              <Text style={styles.actionCancelLabel}>{t.recordCancel}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenShell
      active="messages"
      back={{ label: t.dockNames.messages, title: contact.name, onPress: () => router.dismissTo('/messages') }}
    >
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <Text style={[styles.meta, { textAlign: isRtl ? 'right' : 'left' }]} numberOfLines={1}>
          {contact.meta}
        </Text>
        <Pressable
          onPress={() => callContact(contact.id)}
          role="button"
          aria-label={t.callNameAria(contact.name)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.iconBtn, (pressed || hovered) && styles.iconBtnActive]}
        >
          <PhoneIcon color={colours.highlight} />
        </Pressable>
        <Pressable
          onPress={() => setConfirmingDelete(true)}
          role="button"
          aria-label={t.deleteConversation}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.iconBtn, (pressed || hovered) && styles.iconBtnActive]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" stroke="rgba(239,230,211,.7)" strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      {confirmingDelete && (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>{t.deleteConversationConfirm(contact.name)}</Text>
          <View style={[styles.confirmButtons, { flexDirection: rowDir }]}>
            <Pressable onPress={() => setConfirmingDelete(false)} role="button" style={styles.keepBtn}>
              <Text style={styles.keepLabel}>{t.recordCancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                deleteThread(contact.id);
                router.dismissTo('/messages');
              }}
              role="button"
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteLabel}>{t.deleteConversation}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && <Text style={styles.empty}>{t.chatEmpty(contact.name)}</Text>}
          {items.map((item) =>
            item.kind === 'day' ? (
              <Text key={`day-${item.key}`} style={styles.day}>
                {item.label}
              </Text>
            ) : (
              renderMessage(item.message)
            )
          )}
        </ScrollView>

        <View style={[styles.composer, { flexDirection: rowDir }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onKeyPress={onKeyPress}
            placeholder={t.messagePlaceholder(contact.name)}
            placeholderTextColor="rgba(239,230,211,.35)"
            multiline
            maxLength={1000}
            style={[styles.input, draft ? textDirection(draft) : { textAlign: isRtl ? 'right' : 'left' }]}
            aria-label={t.messagePlaceholder(contact.name)}
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            role="button"
            aria-label={t.sendMessage}
            aria-disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: colours.metal2 }, !canSend && styles.disabled]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}>
              <Path d="M4 12 20 4l-6 16-3-7z" fill={colours.ink} />
            </Svg>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 2 },
  meta: { flex: 1, minWidth: 0, color: 'rgba(239,230,211,.55)', fontSize: 10, fontFamily: 'monospace' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: 'rgba(255,255,255,.07)' },
  confirm: {
    marginHorizontal: 16,
    marginTop: 6,
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,164,156,.4)',
    backgroundColor: 'rgba(122,54,48,.25)',
  },
  confirmText: { color: '#f3ecdd', fontSize: 12, textAlign: 'center' },
  confirmButtons: { justifyContent: 'center', gap: 10 },
  keepBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)' },
  keepLabel: { color: '#f3ecdd', fontSize: 12, fontWeight: '700' },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#7a3630' },
  deleteLabel: { color: '#f6ece7', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, minHeight: 0 },
  thread: { flex: 1 },
  threadContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 6 },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 12, color: 'rgba(239,230,211,.55)' },
  day: {
    alignSelf: 'center',
    marginVertical: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.07)',
    color: 'rgba(239,230,211,.65)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  messageWrap: { maxWidth: '82%', gap: 2 },
  bubble: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'transparent' },
  theirBubble: { backgroundColor: 'rgba(255,255,255,.09)' },
  // A slightly squarer corner on the speaker's side, like a speech bubble's tail.
  tailTrailing: { borderBottomRightRadius: 4 },
  tailLeading: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  stamp: { color: 'rgba(239,230,211,.45)', fontSize: 9, fontFamily: 'monospace', paddingHorizontal: 4 },
  actions: { gap: 6, paddingTop: 2 },
  actionDelete: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#7a3630' },
  actionDeleteLabel: { color: '#f6ece7', fontSize: 11, fontWeight: '700' },
  actionCancel: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)' },
  actionCancelLabel: { color: '#f3ecdd', fontSize: 11, fontWeight: '700' },
  composer: {
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.06)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxHeight: 120,
    color: '#f3ecdd',
    fontSize: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    backgroundColor: 'rgba(11,10,8,.35)',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
