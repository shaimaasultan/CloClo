import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { SearchBox } from '../src/components/SearchBox/SearchBox';
import type { Dictionary, RecentCall } from '../src/i18n/dictionaries';
import { useContacts } from '../src/state/ContactsContext';
import { LoggedCall, useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { useSettings } from '../src/state/SettingsContext';
import { contactMatches } from '../src/state/contactSearch';
import { useCallContact } from '../src/state/useCallContact';

// "Just now" / "5m ago" / "2h ago" / "3d ago" for calls made in the app.
function relativeTime(t: Dictionary, at: number, now: number) {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  if (minutes < 24 * 60) return t.hoursAgo(Math.floor(minutes / 60));
  return t.daysAgo(Math.floor(minutes / (24 * 60)));
}

function toRecent(t: Dictionary, entry: LoggedCall, now: number, meta: string): RecentCall {
  return {
    contactId: entry.contactId,
    type: entry.type,
    time: relativeTime(t, entry.at, now),
    meta,
    durationSec: entry.durationSec,
  };
}

export default function RecentsScreen() {
  const { t } = useLang();
  const { privacyMode } = useSettings();
  const { callLog, dismissMissedNotes } = useKeeperState();
  const { contactById } = useContacts();
  const callContact = useCallContact();
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState('');

  // Opening Recents means the missed calls have been seen, so the keeper
  // takes their note down from the door.
  useFocusEffect(
    useCallback(() => {
      dismissMissedNotes();
      setNow(Date.now());
    }, [dismissMissedNotes])
  );

  // Keep "5m ago" labels fresh while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Calls made in the app first, then the sample history — minus anyone
  // who has since been deleted from Contacts, and anyone the search rules out.
  const entries = [
    ...callLog.map((entry) => toRecent(t, entry, now, contactById(entry.contactId)?.meta ?? '')),
    ...t.recents,
  ].filter((entry) => {
    const contact = contactById(entry.contactId);
    return contact !== undefined && contactMatches(contact, query);
  });

  return (
    <ScreenShell active="recents">
      {!privacyMode && (
        <View style={styles.toolbar}>
          <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {privacyMode ? (
          <Text style={styles.hint}>{t.privacyHidden}</Text>
        ) : (
          <>
            {entries.length === 0 && query.trim().length > 0 && <Text style={styles.hint}>{t.noMatches}</Text>}
            {entries.map((entry, i) => {
              const caller = contactById(entry.contactId);
              if (!caller) return null;
              // Missed calls never connected, so only answered calls show a length.
              const duration = entry.durationSec !== undefined ? t.formatCallDuration(entry.durationSec) : null;
              const when = duration ? `${entry.time} · ${duration}` : entry.time;
              return (
                <ContactRow
                  key={`${entry.contactId}-${i}`}
                  name={caller.name}
                  meta={when}
                  subMeta={entry.meta}
                  callType={entry.type}
                  accessibilityLabel={`${t.callTypeNames[entry.type]} · ${caller.name} · ${when} · ${entry.meta}`}
                  onPress={() => callContact(entry.contactId)}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8 },
  list: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.55)',
  },
});
