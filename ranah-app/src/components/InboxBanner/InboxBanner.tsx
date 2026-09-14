import { useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textDirection } from '../../messages/format';
import { presentNow } from '../../notifications/scheduler';
import { useContacts } from '../../state/ContactsContext';
import { useInbox } from '../../state/InboxContext';
import { useLang } from '../../state/LangContext';
import { useMessages } from '../../state/MessagesContext';
import { usePalette } from '../../state/PaletteContext';
import { useSettings } from '../../state/SettingsContext';
import { pointer } from '../../theme/pointer';

const MAX_BANNERS = 3;

// Mounted once at the root. Your unseen notifications — "New message from
// Nadia" — as banners at the bottom of the screen (reminder alerts use the
// top). Each new one also plays a sound and is shown once as a phone or
// browser notification. Read opens the conversation; × just dismisses the
// notification (the message stays unread in Messages).
export function InboxBanner() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { contactById } = useContacts();
  const { unseen, markSeen, markPresented } = useInbox();
  const { activeChat, hasMessage } = useMessages();
  const { sfx } = useSettings();
  const insets = useSafeAreaInsets();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  const openChat = useCallback(
    (peerId: string, itemId: string) => {
      markSeen(itemId);
      router.push({ pathname: '/chat', params: { id: peerId } });
    },
    [markSeen, router]
  );

  // Present each new notification once, unless you're already in that
  // conversation (the chat marks those seen itself).
  useEffect(() => {
    const fresh = unseen.filter((item) => !item.presented && item.from !== activeChat);
    if (fresh.length === 0) return;
    for (const item of fresh) {
      markPresented(item.id);
      const name = contactById(item.from)?.name;
      if (!name) continue;
      presentNow(t.newMessageFrom(name), item.text, { kind: 'message', peerId: item.from }, () => openChat(item.from, item.id)).catch(
        () => {}
      );
    }
    sfx('shimmer');
  }, [unseen, activeChat, contactById, markPresented, openChat, sfx, t]);

  const visible = unseen
    .filter((item) => item.from !== activeChat && !!contactById(item.from) && hasMessage(item.messageId))
    .slice(0, MAX_BANNERS);
  if (visible.length === 0) return null;

  return (
    <View style={[styles.wrap, pointer.boxNone, { bottom: insets.bottom + 44 }]}>
      {visible.map((item) => {
        const contact = contactById(item.from);
        if (!contact) return null;
        return (
          <View
            key={item.id}
            role="alert"
            style={[styles.banner, { flexDirection: rowDir, borderColor: `${colours.metal2}99`, backgroundColor: colours.body2 }]}
          >
            <Text style={styles.icon}>💬</Text>
            <Pressable onPress={() => openChat(item.from, item.id)} role="button" style={styles.text}>
              <Text style={[styles.tag, { textAlign, color: colours.highlight }]} numberOfLines={1}>
                {t.newMessageFrom(contact.name)}
              </Text>
              <Text style={[styles.preview, textDirection(item.text)]} numberOfLines={2}>
                {item.text}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openChat(item.from, item.id)}
              role="button"
              style={[styles.readBtn, { backgroundColor: colours.metal2 }]}
            >
              <Text style={[styles.readLabel, { color: colours.ink }]}>{t.readMessage}</Text>
            </Pressable>
            <Pressable onPress={() => markSeen(item.id)} role="button" aria-label={t.dismissLabel} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 55, alignItems: 'center', gap: 8 },
  banner: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: { fontSize: 20 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  tag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  preview: { color: '#f3ecdd', fontSize: 13 },
  readBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  readLabel: { fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: 'rgba(239,230,211,.7)', fontSize: 18, lineHeight: 20 },
});
