import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { useContacts } from '../../state/ContactsContext';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useMessages } from '../../state/MessagesContext';
import { pendingSnoozes, useReminders } from '../../state/RemindersContext';
import { DockIcon, DockKey } from '../DockIcon/DockIcon';

// Same blue as the snooze sticker, the red of the missed-call note's pin,
// and a green for unread messages.
const SNOOZE_BLUE = '#3d5a8a';
const MISSED_RED = '#c0463c';
const UNREAD_GREEN = '#2f7d57';

// Below this width the eight labels don't fit, so the dock shows icons only
// (each still named for screen readers).
const LABELS_MIN_WIDTH = 520;

const DOCK_KEYS: DockKey[] = ['dial', 'contacts', 'messages', 'recents', 'reminders', 'keeper', 'sounds', 'settings'];

const DOCK_ROUTES: Record<DockKey, string> = {
  dial: '/',
  contacts: '/contacts',
  messages: '/messages',
  recents: '/recents',
  reminders: '/reminders',
  keeper: '/room',
  sounds: '/sounds',
  settings: '/settings',
};

interface DockProps {
  active: DockKey;
}

export function Dock({ active }: DockProps) {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { width } = useWindowDimensions();
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const showLabels = width >= LABELS_MIN_WIDTH;
  const { reminders } = useReminders();
  const { missedNotes } = useKeeperState();
  const { contactById } = useContacts();
  const { unreadTotal } = useMessages();
  // Count badges: unread messages, unseen missed calls on Recents, snoozed
  // reminders on the bell.
  const missedCount = missedNotes.filter((id) => contactById(id)).length;
  const snoozedCount = pendingSnoozes(reminders).length;
  const badges: Partial<Record<DockKey, { count: number; color: string; ring: string; label: string }>> = {
    messages: { count: unreadTotal, color: UNREAD_GREEN, ring: '#bfe3cc', label: t.unreadMessagesCount(unreadTotal) },
    recents: { count: missedCount, color: MISSED_RED, ring: '#f1dc72', label: t.missedCallsCount(missedCount) },
    reminders: { count: snoozedCount, color: SNOOZE_BLUE, ring: '#bcd9f2', label: t.snoozedCount(snoozedCount) },
  };

  return (
    <View style={[styles.dock, { flexDirection: rowDir }]}>
      {DOCK_KEYS.map((key) => {
        const isActive = key === active;
        const badge = badges[key];
        const hasBadge = !!badge && badge.count > 0;
        const iconColor = isActive ? colours.highlight : '#c9bfa9';
        const label = hasBadge && badge ? `${t.dockNames[key]}, ${badge.label}` : t.dockNames[key];
        const content = (
          <View style={[styles.dockBtn, !showLabels && styles.dockBtnCompact, isActive && styles.dockBtnActive]}>
            <View>
              <DockIcon name={key} color={iconColor} />
              {hasBadge && badge && (
                <View style={[styles.badge, { backgroundColor: badge.color, borderColor: badge.ring }]}>
                  <Text style={styles.badgeText}>{badge.count > 9 ? '9+' : badge.count}</Text>
                </View>
              )}
            </View>
            {showLabels && <Text style={[styles.dockLabel, isActive && { color: iconColor }]}>{t.dockNames[key]}</Text>}
          </View>
        );
        const route = DOCK_ROUTES[key];
        if (route && !isActive) {
          return (
            // dismissTo, not navigate: in this Expo Router, navigate pushes a
            // new copy every time, so each dock tap stacked another mounted
            // screen. dismissTo pops back to the screen if it's already in the
            // stack and otherwise replaces the current one — the dock behaves
            // like tabs and the stack can't grow.
            <Pressable
              key={key}
              onPress={() => router.dismissTo(route as never)}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              {content}
            </Pressable>
          );
        }
        return (
          <View key={key} accessibilityRole="text" accessibilityLabel={label} accessibilityState={{ selected: true }}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  dockBtn: { alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 3, borderRadius: 12 },
  // Icons only: a roomier square target instead of icon + label.
  dockBtnCompact: { paddingVertical: 8, paddingHorizontal: 8 },
  dockBtnActive: { backgroundColor: 'rgba(201,162,75,.18)' },
  dockLabel: { color: '#c9bfa9', fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bcd9f2',
  },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800', lineHeight: 11 },
});
