import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import type { Caller, CallerActivity } from '../src/i18n/dictionaries';
import { useContacts } from '../src/state/ContactsContext';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

const ACTIVITIES: CallerActivity[] = ['driving', 'work', 'home'];
const SKIES: Caller['sky'][] = ['clear', 'rain', 'snow', 'storm'];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, '0');

// "MM-DD", '' when both are blank, or null when it isn't a real date.
function parseBirthday(month: string, day: string): string | null {
  if (!month.trim() && !day.trim()) return '';
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > DAYS_IN_MONTH[m - 1]) return null;
  return `${pad(m)}-${pad(d)}`;
}

// Add a contact (no id) or edit one (?id=…), with Delete behind a confirmation.
export default function ContactEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { rawContact, contactById, addContact, updateContact, removeContact } = useContacts();
  const { callState, ringerId, setCallState } = useKeeperState();
  const { sfx } = useSettings();

  const existing = id ? rawContact(id) : undefined;
  const shownName = id ? contactById(id)?.name ?? '' : '';
  const [bMonth, bDay] = existing?.birthday ? existing.birthday.split('-') : ['', ''];

  const [name, setName] = useState(shownName);
  const [number, setNumber] = useState(existing?.number ?? '');
  const [month, setMonth] = useState(bMonth);
  const [day, setDay] = useState(bDay);
  const [activity, setActivity] = useState<CallerActivity>(existing?.activity ?? 'home');
  const [sky, setSky] = useState<Caller['sky']>(existing?.sky ?? 'clear');
  const [localHour, setLocalHour] = useState(existing?.localHour ?? new Date().getHours());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);
  const birthday = parseBirthday(month, day);
  const canSave = name.trim().length > 0 && number.trim().length > 0 && birthday !== null;
  const backToContacts = () => router.dismissTo('/contacts');

  const save = () => {
    if (!canSave) return;
    const draft = {
      // An unchanged name keeps the stored one (and its other-language spelling).
      name: existing && name.trim() === shownName ? existing.name : name.trim(),
      number: number.trim(),
      birthday: birthday ?? '',
      activity,
      sky,
      localHour,
      keepsake: existing?.keepsake ?? ('photo' as const),
    };
    if (existing) updateContact(existing.id, draft);
    else addContact(draft);
    sfx('bump');
    backToContacts();
  };

  const remove = () => {
    if (!existing) return;
    // Deleting whoever is on the line hangs up first.
    if (callState !== 'idle' && ringerId === existing.id) setCallState('idle');
    removeContact(existing.id);
    backToContacts();
  };

  const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      role="radio"
      aria-checked={active}
      style={[
        styles.chip,
        active && { backgroundColor: `${colours.metal2}47`, borderColor: `${colours.metal2}8c` },
      ]}
    >
      <Text style={[styles.chipLabel, { color: active ? colours.highlight : 'rgba(239,230,211,.75)' }]}>{label}</Text>
    </Pressable>
  );

  const label = (text: string) => <Text style={[styles.label, { textAlign }]}>{text}</Text>;

  return (
    <ScreenShell
      active="contacts"
      back={{ label: t.contactsTitle, title: existing ? t.editContact : t.addContact, onPress: backToContacts }}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          {label(t.contactNameLabel)}
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { textAlign }]}
            placeholderTextColor="rgba(239,230,211,.3)"
            aria-label={t.contactNameLabel}
            autoFocus={!existing}
          />
        </View>

        <View style={styles.field}>
          {label(t.contactNumberLabel)}
          <TextInput
            value={number}
            onChangeText={setNumber}
            keyboardType="phone-pad"
            // Phone numbers read left to right in both languages.
            style={[styles.input, styles.mono, { textAlign, writingDirection: 'ltr' }]}
            placeholder="0100 000 0000"
            placeholderTextColor="rgba(239,230,211,.3)"
            aria-label={t.contactNumberLabel}
          />
        </View>

        <View style={styles.field}>
          {label(t.birthdayLabel)}
          <View style={[styles.inline, { flexDirection: rowDir }]}>
            <TextInput
              value={month}
              onChangeText={(v) => setMonth(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder={t.birthdayMonth}
              placeholderTextColor="rgba(239,230,211,.3)"
              style={[styles.input, styles.mono, styles.short]}
              aria-label={`${t.birthdayLabel} · ${t.birthdayMonth}`}
            />
            <Text style={styles.dash}>/</Text>
            <TextInput
              value={day}
              onChangeText={(v) => setDay(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder={t.birthdayDay}
              placeholderTextColor="rgba(239,230,211,.3)"
              style={[styles.input, styles.mono, styles.short]}
              aria-label={`${t.birthdayLabel} · ${t.birthdayDay}`}
            />
          </View>
          {birthday === null && <Text style={[styles.error, { textAlign }]}>{t.birthdayInvalid}</Text>}
        </View>

        <View style={styles.field}>
          {label(t.activityLabel)}
          <View style={[styles.chips, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.activityLabel}>
            {ACTIVITIES.map((a) => chip(a, t.activityNames[a], a === activity, () => setActivity(a)))}
          </View>
        </View>

        <View style={styles.field}>
          {label(t.weatherLabel)}
          <View style={[styles.chips, { flexDirection: rowDir }]} role="radiogroup" aria-label={t.weatherLabel}>
            {SKIES.map((s) => chip(s, t.skyNames[s], s === sky, () => setSky(s)))}
          </View>
        </View>

        <View style={styles.field}>
          {label(t.localHourLabel)}
          <View style={[styles.inline, { flexDirection: rowDir }]}>
            <Pressable
              onPress={() => setLocalHour((h) => (h + 23) % 24)}
              role="button"
              aria-label={t.earlierHour}
              style={styles.stepBtn}
            >
              <Text style={styles.stepLabel}>−</Text>
            </Pressable>
            <Text style={[styles.hourValue, { color: colours.highlight }]}>{t.theirTime(localHour, 0)}</Text>
            <Pressable
              onPress={() => setLocalHour((h) => (h + 1) % 24)}
              role="button"
              aria-label={t.laterHour}
              style={styles.stepBtn}
            >
              <Text style={styles.stepLabel}>+</Text>
            </Pressable>
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
              <Text style={styles.confirmText}>{t.deleteConfirm(shownName)}</Text>
              <View style={[styles.inline, styles.confirmButtons, { flexDirection: rowDir }]}>
                <Pressable onPress={() => setConfirmingDelete(false)} role="button" style={styles.keepBtn}>
                  <Text style={styles.keepLabel}>{t.keepContact}</Text>
                </Pressable>
                <Pressable onPress={remove} role="button" style={styles.deleteConfirmBtn}>
                  <Text style={styles.deleteConfirmLabel}>{t.deleteContact}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingDelete(true)} role="button" style={styles.deleteBtn}>
              <Text style={styles.deleteLabel}>{t.deleteContact}</Text>
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
  short: { width: 64, textAlign: 'center' },
  inline: { alignItems: 'center', gap: 8 },
  dash: { color: 'rgba(239,230,211,.4)', fontSize: 16 },
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
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.07)',
  },
  stepLabel: { color: '#f3ecdd', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  hourValue: { fontSize: 12, fontFamily: 'monospace', minWidth: 150, textAlign: 'center' },
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
