import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dueAlerts, planAlerts, PlannedAlert } from '../../notifications/plan';
import { useNotificationPermission } from '../../notifications/permission';
import {
  canScheduleAhead,
  onNotificationTap,
  setupNotifications,
  showSystemNotification,
  syncScheduled,
} from '../../notifications/scheduler';
import { useContacts } from '../../state/ContactsContext';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { dayKey, occursOn, useReminders } from '../../state/RemindersContext';
import { useSettings } from '../../state/SettingsContext';
import { useCallContact } from '../../state/useCallContact';
import { pointer } from '../../theme/pointer';
import { PhoneIcon } from '../Icons/Icons';

const CHECK_MS = 15000;
const MAX_BANNERS = 3;

// Alerts already shown, so a reload doesn't repeat them (web only; phones
// keep this in memory).
const FIRED_KEY = 'cloclo:firedAlerts';
type SimpleStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const webStorage = (): SimpleStorage | null => {
  try {
    return (globalThis as { localStorage?: SimpleStorage }).localStorage ?? null;
  } catch {
    return null;
  }
};
function loadFired(): Set<string> {
  try {
    const raw = webStorage()?.getItem(FIRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveFired(fired: Set<string>) {
  try {
    webStorage()?.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-100)));
  } catch {
    // Not saved; at worst an alert shows again after a reload.
  }
}

// Mounted once at the root, like IncomingRinger. It keeps the phone's
// scheduled notifications in step with the reminders, and while the app is
// open it watches the clock and shows a banner (plus a browser notification
// on the web) when a reminder's time comes.
export function ReminderNotifier() {
  const router = useRouter();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { reminders, toggleDone, markDone } = useReminders();
  const { callState, ringerId } = useKeeperState();
  const { contactById } = useContacts();
  const { sfx } = useSettings();
  const callContact = useCallContact();
  const insets = useSafeAreaInsets();
  const [permission] = useNotificationPermission();
  const [banners, setBanners] = useState<PlannedAlert[]>([]);
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  const contactName = useCallback((id: string | null) => contactById(id)?.name ?? null, [contactById]);
  // The check below runs on a timer, so it reads the latest values from here.
  const latest = useRef({ reminders, t, lang, contactName });
  latest.current = { reminders, t, lang, contactName };

  const openReminders = useCallback(() => router.dismissTo('/reminders'), [router]);

  useEffect(() => {
    setupNotifications().catch(() => {});
    return onNotificationTap(openReminders);
  }, [openReminders]);

  // Phones: reschedule whenever reminders, names or language change.
  const namesKey = reminders.map((r) => contactName(r.contactId) ?? '').join('|');
  useEffect(() => {
    if (!canScheduleAhead || permission !== 'granted') return;
    const id = setTimeout(() => {
      const { reminders: rs, t: dict, lang: l, contactName: name } = latest.current;
      syncScheduled(planAlerts(rs, new Date(), dict, l, name)).catch(() => {});
    }, 500);
    return () => clearTimeout(id);
  }, [reminders, lang, namesKey, permission]);

  // While open: fire alerts whose time has come.
  const fired = useRef<Set<string>>(loadFired());
  useEffect(() => {
    const check = () => {
      const { reminders: rs, t: dict, lang: l, contactName: name } = latest.current;
      const due = dueAlerts(rs, new Date(), dict, l, name).filter((a) => !fired.current.has(a.key));
      if (due.length === 0) return;
      for (const alert of due) {
        fired.current.add(alert.key);
        showSystemNotification(alert.title, alert.body, openReminders);
      }
      saveFired(fired.current);
      sfx('shimmer');
      setBanners((prev) => [...due, ...prev].slice(0, MAX_BANNERS));
    };
    check();
    const id = setInterval(check, CHECK_MS);
    return () => clearInterval(id);
  }, [openReminders, sfx]);

  // Talking to someone ticks off today's reminders about them, however the
  // call started: from Contacts, Recents, a reminder, the birthday card, or
  // answering their call. Declined and missed calls don't count.
  useEffect(() => {
    if (callState !== 'active' || !ringerId) return;
    const now = new Date();
    const today = dayKey(now);
    latest.current.reminders
      .filter((r) => r.contactId === ringerId && occursOn(r, now) && !r.doneDates.includes(today))
      .forEach((r) => markDone(r.id, today));
  }, [callState, ringerId, markDone]);

  const dismiss = (key: string) => setBanners((prev) => prev.filter((b) => b.key !== key));

  // A banner goes away by itself once its reminder is ticked off or deleted.
  const visible = banners.filter((b) => {
    const r = reminders.find((x) => x.id === b.reminderId);
    return r && !r.doneDates.includes(dayKey(b.fireAt));
  });
  if (visible.length === 0) return null;

  return (
    <View style={[styles.wrap, pointer.boxNone, { top: insets.top + 8 }]}>
      {visible.map((alert) => (
        <View
          key={alert.key}
          role="alert"
          style={[styles.banner, { flexDirection: rowDir, borderColor: `${colours.metal2}99`, backgroundColor: colours.body2 }]}
        >
          <Text style={styles.bell}>🔔</Text>
          <Pressable
            onPress={() => {
              dismiss(alert.key);
              openReminders();
            }}
            role="button"
            style={styles.text}
          >
            <Text style={[styles.tag, { textAlign, color: colours.highlight }]} numberOfLines={1}>
              {t.reminderAlertTag} · {alert.body}
            </Text>
            <Text style={[styles.title, { textAlign }]} numberOfLines={2}>
              {alert.title}
            </Text>
          </Pressable>
          {alert.contactId && (
            <Pressable
              onPress={() => {
                dismiss(alert.key);
                callContact(alert.contactId as string);
              }}
              role="button"
              aria-label={alert.body}
              style={[styles.iconBtn, { backgroundColor: `${colours.metal2}33` }]}
            >
              <PhoneIcon color={colours.highlight} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              toggleDone(alert.reminderId, dayKey(alert.fireAt));
              dismiss(alert.key);
            }}
            role="button"
            style={[styles.doneBtn, { backgroundColor: colours.metal2 }]}
          >
            <Text style={[styles.doneLabel, { color: colours.ink }]}>{t.markDoneLabel}</Text>
          </Pressable>
          <Pressable onPress={() => dismiss(alert.key)} role="button" aria-label={t.dismissLabel} style={styles.closeBtn}>
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50, alignItems: 'center', gap: 8 },
  banner: {
    width: '100%',
    maxWidth: 460,
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
  bell: { fontSize: 20 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  tag: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'monospace' },
  title: { color: '#f3ecdd', fontSize: 14, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  doneLabel: { fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: 'rgba(239,230,211,.7)', fontSize: 18, lineHeight: 20 },
});
