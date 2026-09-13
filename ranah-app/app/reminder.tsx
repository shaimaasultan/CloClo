import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { useNotificationPermission } from '../src/notifications/permission';
import { useContacts } from '../src/state/ContactsContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { dayKey, parseDayKey, Repeat, REPEATS, useReminders } from '../src/state/RemindersContext';
import { useSettings } from '../src/state/SettingsContext';

const pad = (n: number) => String(n).padStart(2, '0');

// Add a reminder (no id) or edit one (?id=…), with Delete behind a confirmation.
export default function ReminderEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { reminderById, addReminder, updateReminder, removeReminder } = useReminders();
  const { contacts } = useContacts();
  const { sfx } = useSettings();
  const [permission, requestPermission] = useNotificationPermission();

  const existing = id ? reminderById(id) : undefined;
  const shownTitle = existing ? existing.titles?.[lang] ?? existing.title : '';
  const [startYear, startMonth, startDay] = (existing?.date ?? dayKey(new Date())).split('-');

  const [title, setTitle] = useState(shownTitle);
  const [year, setYear] = useState(startYear);
  const [month, setMonth] = useState(startMonth);
  const [day, setDay] = useState(startDay);
  const [hour, setHour] = useState(existing?.time ? existing.time.slice(0, 2) : '');
  const [minute, setMinute] = useState(existing?.time ? existing.time.slice(3, 5) : '');
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? 'none');
  const [contactId, setContactId] = useState<string | null>(existing?.contactId ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);

  const parsedDate = year.length === 4 ? parseDayKey(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`) : null;
  const date = parsedDate ? dayKey(parsedDate) : null;
  // "HH:MM", '' when both are blank, or null when it isn't a real time.
  const time = (() => {
    if (!hour && !minute) return '';
    const h = Number(hour);
    const m = Number(minute || '0');
    if (!hour || !Number.isInteger(h) || h > 23 || !Number.isInteger(m) || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  })();
  const canSave = title.trim().length > 0 && date !== null && time !== null;
  const backToList = () => router.dismissTo('/reminders');

  const setDate = (d: Date) => {
    const [y, m, dd] = dayKey(d).split('-');
    setYear(y);
    setMonth(m);
    setDay(dd);
  };
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const save = () => {
    if (!canSave || date === null || time === null) return;
    const draft = {
      // An unchanged title keeps the stored one (and its other-language wording).
      title: existing && title.trim() === shownTitle ? existing.title : title.trim(),
      date,
      time,
      repeat,
      contactId,
    };
    // Saving a timed reminder is the natural moment to ask for notifications.
    if (time && permission === 'undetermined') requestPermission();
    if (existing) updateReminder(existing.id, draft);
    else addReminder(draft);
    sfx('bump');
    backToList();
  };

  const remove = () => {
    if (!existing) return;
    removeReminder(existing.id);
    backToList();
  };

  const chip = (key: string, label: string, active: boolean, onPress: () => void, role: 'radio' | 'button' = 'radio') => (
    <Pressable
      key={key}
      onPress={onPress}
      role={role}
      aria-checked={role === 'radio' ? active : undefined}
      style={[styles.chip, active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` }]}
    >
      <Text style={[styles.chipLabel, { color: active ? colours.highlight : 'rgba(239,230,211,.75)' }]}>{label}</Text>
    </Pressable>
  );

  const label = (text: string) => <Text style={[styles.label, { textAlign }]}>{text}</Text>;
  const numberInput = (value: string, onChange: (v: string) => void, placeholder: string, maxLength: number, aria: string, wide = false) => (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
      keyboardType="number-pad"
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor="rgba(239,230,211,.3)"
      style={[styles.input, styles.mono, wide ? styles.wide : styles.short]}
      aria-label={aria}
    />
  );

  return (
    <ScreenShell
      active="reminders"
      back={{ label: t.dockNames.reminders, title: existing ? t.editReminder : t.addReminder, onPress: backToList }}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          {label(t.reminderTitleLabel)}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.reminderTitlePlaceholder}
            placeholderTextColor="rgba(239,230,211,.3)"
            style={[styles.input, { textAlign }]}
            aria-label={t.reminderTitleLabel}
            autoFocus={!existing}
          />
        </View>

        <View style={styles.field}>
          {label(t.reminderDateLabel)}
          {/* Year / month / day always read left to right, like the number. */}
          <View style={[styles.inline, { flexDirection: 'row', alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
            {numberInput(year, setYear, t.reminderYear, 4, `${t.reminderDateLabel} · ${t.reminderYear}`, true)}
            <Text style={styles.dash}>-</Text>
            {numberInput(month, setMonth, t.birthdayMonth, 2, `${t.reminderDateLabel} · ${t.birthdayMonth}`)}
            <Text style={styles.dash}>-</Text>
            {numberInput(day, setDay, t.birthdayDay, 2, `${t.reminderDateLabel} · ${t.birthdayDay}`)}
          </View>
          <View style={[styles.chips, { flexDirection: rowDir }]}>
            {chip('today', t.reminderToday, date === dayKey(today), () => setDate(today), 'button')}
            {chip('tomorrow', t.reminderTomorrow, date === dayKey(tomorrow), () => setDate(tomorrow), 'button')}
          </View>
          {date === null && <Text style={[styles.error, { textAlign }]}>{t.reminderInvalidDate}</Text>}
        </View>

        <View style={styles.field}>
          {label(t.reminderTimeLabel)}
          <View style={[styles.inline, { flexDirection: 'row', alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
            {numberInput(hour, setHour, t.reminderHour, 2, `${t.reminderTimeLabel} · ${t.reminderHour}`)}
            <Text style={styles.dash}>:</Text>
            {numberInput(minute, setMinute, t.reminderMinute, 2, `${t.reminderTimeLabel} · ${t.reminderMinute}`)}
            {time ? (
              <Text style={[styles.preview, { color: colours.highlight }]}>
                {t.clockTime(Number(time.slice(0, 2)), Number(time.slice(3, 5)))}
              </Text>
            ) : null}
          </View>
          {time === null && <Text style={[styles.error, { textAlign }]}>{t.reminderInvalidTime}</Text>}
        </View>

        <View style={styles.field}>
          {label(t.repeatLabel)}
          <View style={[styles.chips, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.repeatLabel}>
            {REPEATS.map((r) => chip(r, t.repeatNames[r], r === repeat, () => setRepeat(r)))}
          </View>
        </View>

        <View style={styles.field}>
          {label(t.reminderContactLabel)}
          <View style={[styles.chips, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.reminderContactLabel}>
            {chip('none', t.reminderNoContact, contactId === null, () => setContactId(null))}
            {contacts.map((c) => chip(c.id, c.name, c.id === contactId, () => setContactId(c.id)))}
          </View>
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          role="button"
          aria-disabled={!canSave}
          style={[styles.saveBtn, { backgroundColor: colours.metal2 }, !canSave && styles.disabled]}
        >
          <Text style={[styles.saveLabel, { color: colours.ink }]}>{t.saveContact}</Text>
        </Pressable>

        {existing &&
          (confirmingDelete ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmText}>{t.deleteReminderConfirm(shownTitle)}</Text>
              <View style={[styles.inline, styles.confirmButtons, { flexDirection: rowDir }]}>
                <Pressable onPress={() => setConfirmingDelete(false)} role="button" style={styles.keepBtn}>
                  <Text style={styles.keepLabel}>{t.keepContact}</Text>
                </Pressable>
                <Pressable onPress={remove} role="button" style={styles.deleteConfirmBtn}>
                  <Text style={styles.deleteConfirmLabel}>{t.deleteReminder}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingDelete(true)} role="button" style={styles.deleteBtn}>
              <Text style={styles.deleteLabel}>{t.deleteReminder}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </ScreenShell>
  );
}

const DANGER = '#e6a49c';

const styles = StyleSheet.create({
  form: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24, gap: 14 },
  field: { gap: 6 },
  label: {
    color: 'rgba(239,230,211,.55)',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  input: {
    color: '#f3ecdd',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    backgroundColor: 'rgba(11,10,8,.35)',
  },
  mono: { fontFamily: 'monospace', letterSpacing: 1 },
  short: { width: 58, textAlign: 'center' },
  wide: { width: 78, textAlign: 'center' },
  inline: { alignItems: 'center', gap: 8 },
  dash: { color: 'rgba(239,230,211,.4)', fontSize: 16 },
  preview: { fontSize: 12, fontFamily: 'monospace', marginLeft: 4 },
  error: { color: DANGER, fontSize: 10, fontFamily: 'monospace' },
  chips: { flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  saveBtn: { marginTop: 6, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  saveLabel: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  deleteBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230,164,156,.4)',
  },
  deleteLabel: { color: DANGER, fontSize: 12, fontWeight: '700' },
  confirm: {
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,164,156,.4)',
    backgroundColor: 'rgba(122,54,48,.25)',
  },
  confirmText: { color: '#f3ecdd', fontSize: 12, textAlign: 'center' },
  confirmButtons: { justifyContent: 'center' },
  keepBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)' },
  keepLabel: { color: '#f3ecdd', fontSize: 12, fontWeight: '700' },
  deleteConfirmBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#7a3630' },
  deleteConfirmLabel: { color: '#f6ece7', fontSize: 12, fontWeight: '700' },
});
