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
// How long a reminder can be snoozed for, in minutes.
const SNOOZE_MINUTES = [5, 10, 15, 30, 60];

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
  const { reminders, markDone, snoozeReminder } = useReminders();
  const { contactById } = useContacts();
  const { callState, ringerId } = useKeeperState();
  const { sfx } = useSettings();
  const callContact = useCallContact();
  const insets = useSafeAreaInsets();
  const [permission] = useNotificationPermission();
  const [banners, setBanners] = useState<PlannedAlert[]>([]);
  // The banner whose snooze choices are open.
  const [picking, setPicking] = useState<string | null>(null);
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
      const now = new Date();
      const { reminders: rs, t: dict, lang: l, contactName: name } = latest.current;
      const due = dueAlerts(rs, now, dict, l, name).filter((a) => !fired.current.has(a.key));
      // A snoozed reminder is done once its second alert comes round — even
      // if the app was closed at the time.
      for (const r of rs) {
        if (r.snooze && r.snooze.at <= now.getTime() && !r.doneDates.includes(r.snooze.day)) markDone(r.id, r.snooze.day);
      }
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
  }, [openReminders, sfx, markDone]);

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

  const dismiss = (key: string) => {
    setBanners((prev) => prev.filter((b) => b.key !== key));
    setPicking((current) => (current === key ? null : current));
  };

  const snooze = (alert: PlannedAlert, minutes: number) => {
    snoozeReminder(alert.reminderId, alert.day, minutes);
    dismiss(alert.key);
  };

  // A first alert goes away by itself once its reminder is ticked off or
  // deleted. A snooze repeat stays until dismissed (its reminder is already
  // marked done when it arrives).
  const visible = banners.filter((b) => {
    const r = reminders.find((x) => x.id === b.reminderId);
    return r !== undefined && (b.snoozed || !r.doneDates.includes(b.day));
  });
  if (visible.length === 0) return null;

  return (
    <View style={[styles.wrap, pointer.boxNone, { top: insets.top + 8 }]}>
      {visible.map((alert) => (
        <View
          key={alert.key}
          role="alert"
          style={[styles.banner, { borderColor: `${colours.metal2}99`, backgroundColor: colours.body2 }]}
        >
          <View style={[styles.row, { flexDirection: rowDir }]}>
            <Text style={styles.bell}>{alert.snoozed ? '⏰' : '🔔'}</Text>
            <Pressable
              onPress={() => {
                dismiss(alert.key);
                openReminders();
              }}
              role="button"
              style={styles.text}
            >
              <Text style={[styles.tag, { textAlign, color: colours.highlight }]} numberOfLines={1}>
                {alert.snoozed ? t.snoozedTag : t.reminderAlertTag} · {alert.body}
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
            {/* Snooze and Done only on the first alert: a snooze happens once. */}
            {!alert.snoozed && (
              <Pressable
                onPress={() => setPicking((current) => (current === alert.key ? null : alert.key))}
                role="button"
                aria-expanded={picking === alert.key}
                style={[styles.snoozeBtn, { borderColor: `${colours.metal2}8c` }]}
              >
                <Text style={[styles.snoozeLabel, { color: colours.highlight }]}>{t.snoozeLabel}</Text>
              </Pressable>
            )}
            {!alert.snoozed && (
              <Pressable
                onPress={() => {
                  markDone(alert.reminderId, alert.day);
                  dismiss(alert.key);
                }}
                role="button"
                style={[styles.doneBtn, { backgroundColor: colours.metal2 }]}
              >
                <Text style={[styles.doneLabel, { color: colours.ink }]}>{t.markDoneLabel}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => dismiss(alert.key)} role="button" aria-label={t.dismissLabel} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>

          {picking === alert.key && (
            <View style={[styles.snoozeRow, { flexDirection: rowDir }]} role="group" aria-label={t.snoozeFor}>
              <Text style={styles.snoozeFor}>{t.snoozeFor}</Text>
              {SNOOZE_MINUTES.map((minutes) => (
                <Pressable
                  key={minutes}
                  onPress={() => snooze(alert, minutes)}
                  role="button"
                  style={[styles.chip, { borderColor: `${colours.metal2}8c` }]}
                >
                  <Text style={[styles.chipLabel, { color: colours.highlight }]}>{t.snoozeMinutes(minutes)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50, alignItems: 'center', gap: 8 },
  banner: {
    width: '100%',
    maxWidth: 480,
    gap: 8,
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
  row: { alignItems: 'center', gap: 8 },
  bell: { fontSize: 20 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  tag: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'monospace' },
  title: { color: '#f3ecdd', fontSize: 14, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  snoozeBtn: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  snoozeLabel: { fontSize: 11, fontWeight: '700' },
  doneBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  doneLabel: { fontSize: 11, fontWeight: '800' },
  closeBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: 'rgba(239,230,211,.7)', fontSize: 18, lineHeight: 20 },
  snoozeRow: { alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  snoozeFor: { color: 'rgba(239,230,211,.6)', fontSize: 10, fontFamily: 'monospace' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  chipLabel: { fontSize: 11, fontWeight: '700' },
});
