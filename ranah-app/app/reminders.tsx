import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DockIcon } from '../src/components/DockIcon/DockIcon';
import { PhoneIcon } from '../src/components/Icons/Icons';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useNotificationPermission } from '../src/notifications/permission';
import { useContacts } from '../src/state/ContactsContext';
import { isBirthdayOn } from '../src/state/decorations';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import {
  clockKey,
  dayKey,
  nextOccurrenceAfter,
  occursOn,
  parseDayKey,
  Reminder,
  useReminders,
} from '../src/state/RemindersContext';
import { useCallContact } from '../src/state/useCallContact';

// Untimed reminders sort after timed ones.
const byTime = (a: Reminder, b: Reminder) => (a.time || '99:99').localeCompare(b.time || '99:99');

// Today (with contacts' birthdays), what's coming up, and one-off reminders
// whose day has passed. Tick today's off; tap one to edit it.
export default function RemindersScreen() {
  const router = useRouter();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { reminders, toggleDone } = useReminders();
  const { contacts, contactById } = useContacts();
  const callContact = useCallContact();
  const [permission, requestPermission] = useNotificationPermission();

  // Keeps "Due now" and the day itself current while the screen is open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  useFocusEffect(useCallback(() => setNow(new Date()), []));

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);
  const today = dayKey(now);
  const nowClock = clockKey(now);
  const formatDay = (d: Date) =>
    d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatClock = (time: string) => t.clockTime(Number(time.slice(0, 2)), Number(time.slice(3, 5)));

  const birthdays = contacts.filter((c) => isBirthdayOn(c.birthday, now));
  const todays = reminders.filter((r) => occursOn(r, now)).sort(byTime);
  const upcoming = reminders
    .filter((r) => !occursOn(r, now))
    .map((r) => ({ r, next: nextOccurrenceAfter(r, now) }))
    .filter((x): x is { r: Reminder; next: Date } => x.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime() || byTime(a.r, b.r));
  const earlier = reminders.filter((r) => r.repeat === 'none' && r.date < today);

  // Calling someone ticks off today's reminders about them (see ReminderNotifier).
  const callButton = (id: string, name: string) => (
    <Pressable
      onPress={() => callContact(id)}
      role="button"
      aria-label={t.callNameAria(name)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.callBtn,
        (pressed || hovered) && styles.callBtnActive,
      ]}
    >
      <PhoneIcon color={colours.highlight} />
    </Pressable>
  );

  const reminderRow = (r: Reminder, when: string | null, isToday: boolean) => {
    const title = r.titles?.[lang] ?? r.title;
    const contact = contactById(r.contactId);
    const done = isToday && r.doneDates.includes(today);
    const due = isToday && !done && r.time !== '' && r.time <= nowClock;
    const meta = [
      due ? t.reminderDue : null,
      when,
      r.time ? formatClock(r.time) : null,
      r.repeat !== 'none' ? t.repeatNames[r.repeat] : null,
      contact?.name ?? null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <View
        key={`${r.id}-${when ?? 'today'}`}
        style={[
          styles.row,
          { flexDirection: rowDir },
          due && { borderColor: `${colours.metal2}8c`, backgroundColor: `${colours.metal2}1f` },
        ]}
      >
        {isToday ? (
          <Pressable
            onPress={() => toggleDone(r.id, today)}
            role="checkbox"
            aria-checked={done}
            aria-label={title}
            style={[styles.check, { borderColor: `${colours.metal2}b3` }, done && { backgroundColor: colours.metal2 }]}
          >
            {done && (
              <Svg width={12} height={12} viewBox="0 0 12 12">
                <Path d="M2.5 6.2 5 8.6l4.5-5" stroke={colours.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </Pressable>
        ) : (
          <View style={styles.leadIcon}>
            <DockIcon name="reminders" color="rgba(239,230,211,.45)" size={18} />
          </View>
        )}
        <Pressable
          onPress={() => router.push({ pathname: '/reminder', params: { id: r.id } })}
          role="button"
          aria-label={t.editReminderAria(title)}
          style={styles.info}
        >
          <Text style={[styles.title, { textAlign }, done && styles.doneText]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.meta, { textAlign }, due && { color: colours.highlight }]} numberOfLines={1}>
            {meta}
          </Text>
        </Pressable>
        {contact && callButton(contact.id, contact.name)}
      </View>
    );
  };

  const heading = (text: string) => <Text style={[styles.heading, { textAlign, color: colours.metal1 }]}>{text}</Text>;
  const empty = (text: string) => <Text style={[styles.empty, { textAlign }]}>{text}</Text>;

  return (
    <ScreenShell active="reminders">
      <View style={[styles.toolbar, { flexDirection: rowDir }]}>
        <Text style={[styles.date, { textAlign }]}>{formatDay(now)}</Text>
        <Pressable
          onPress={() => router.push('/reminder')}
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
          <Text style={[styles.addLabel, { color: colours.highlight }]}>{t.addReminder}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {permission !== 'granted' && permission !== 'unsupported' && (
          <View style={[styles.notify, { flexDirection: rowDir, borderColor: `${colours.metal2}66` }]}>
            <Text style={styles.notifyEmoji}>🔔</Text>
            <Text style={[styles.notifyText, { textAlign }]}>
              {permission === 'denied' ? t.notificationsBlocked : t.notificationsOffHint}
            </Text>
            {permission === 'undetermined' && (
              <Pressable
                onPress={() => requestPermission()}
                role="button"
                style={[styles.notifyBtn, { backgroundColor: colours.metal2 }]}
              >
                <Text style={[styles.notifyBtnLabel, { color: colours.ink }]}>{t.turnOnNotifications}</Text>
              </Pressable>
            )}
          </View>
        )}
        {Platform.OS === 'web' && permission === 'granted' && empty(t.notificationsWebNote)}
        {heading(t.todayHeading)}
        {birthdays.length === 0 && todays.length === 0 && empty(t.nothingToday)}
        {birthdays.map((c) => (
          <View key={`bday-${c.id}`} style={[styles.row, { flexDirection: rowDir }]}>
            <Text style={styles.leadEmoji}>🎂</Text>
            <View style={styles.info}>
              <Text style={[styles.title, { textAlign }]} numberOfLines={1}>
                {t.birthdayOf(c.name)}
              </Text>
              <Text style={[styles.meta, { textAlign }]} numberOfLines={1}>
                {t.theirTime(c.localHour, now.getMinutes())}
              </Text>
            </View>
            {callButton(c.id, c.name)}
          </View>
        ))}
        {todays.map((r) => reminderRow(r, null, true))}

        {heading(t.upcomingHeading)}
        {upcoming.length === 0 && empty(t.nothingUpcoming)}
        {upcoming.map(({ r, next }) => reminderRow(r, formatDay(next), false))}

        {earlier.length > 0 && heading(t.earlierHeading)}
        {earlier.map((r) => {
          const d = parseDayKey(r.date);
          return reminderRow(r, d ? formatDay(d) : r.date, false);
        })}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  date: { color: 'rgba(239,230,211,.7)', fontSize: 11, fontFamily: 'monospace' },
  addBtn: { alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  addLabel: { fontSize: 11, fontWeight: '700' },
  list: { paddingTop: 4, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  notify: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 6 },
  notifyEmoji: { fontSize: 18 },
  notifyText: { flex: 1, minWidth: 0, color: 'rgba(239,230,211,.75)', fontSize: 11 },
  notifyBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  notifyBtnLabel: { fontSize: 11, fontWeight: '800' },
  heading: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 2,
  },
  empty: { color: 'rgba(239,230,211,.45)', fontSize: 11, fontFamily: 'monospace', paddingHorizontal: 8, paddingVertical: 6 },
  row: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  leadIcon: { width: 24, alignItems: 'center' },
  leadEmoji: { width: 24, textAlign: 'center', fontSize: 18 },
  info: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: '#f3ecdd', fontSize: 13, fontWeight: '600' },
  doneText: { textDecorationLine: 'line-through', color: 'rgba(239,230,211,.45)' },
  meta: { color: 'rgba(239,230,211,.55)', fontSize: 10, fontFamily: 'monospace' },
  callBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  callBtnActive: { backgroundColor: 'rgba(255,255,255,.07)' },
});
