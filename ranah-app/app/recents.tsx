import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import type { Dictionary, RecentCall } from '../src/i18n/dictionaries';
import { LoggedCall, useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { useSettings } from '../src/state/SettingsContext';
import { useCallContact } from '../src/state/useCallContact';

// "Just now" / "5m ago" / "2h ago" for this session's calls.
function relativeTime(t: Dictionary, at: number, now: number) {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  return t.hoursAgo(Math.floor(minutes / 60));
}

function toRecent(t: Dictionary, entry: LoggedCall, now: number): RecentCall {
  return {
    callerIdx: entry.callerIdx,
    type: entry.type,
    time: relativeTime(t, entry.at, now),
    meta: t.callers[entry.callerIdx].meta,
    durationSec: entry.durationSec,
  };
}

export default function RecentsScreen() {
  const { t } = useLang();
  const { privacyMode } = useSettings();
  const { callLog, dismissMissedNotes } = useKeeperState();
  const callContact = useCallContact();
  const [now, setNow] = useState(() => Date.now());

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

  // This session's calls first, then the sample history.
  const entries = [...callLog.map((entry) => toRecent(t, entry, now)), ...t.recents];

  return (
    <ScreenShell active="recents">
      <ScrollView contentContainerStyle={styles.list}>
        {privacyMode ? (
          <Text style={styles.hint}>{t.privacyHidden}</Text>
        ) : (
          entries.map((entry, i) => {
            const caller = t.callers[entry.callerIdx];
            // Missed calls never connected, so only answered calls show a length.
            const duration = entry.durationSec !== undefined ? t.formatCallDuration(entry.durationSec) : null;
            const when = duration ? `${entry.time} · ${duration}` : entry.time;
            return (
              <ContactRow
                key={`${entry.callerIdx}-${i}`}
                name={caller.name}
                meta={when}
                subMeta={entry.meta}
                callType={entry.type}
                accessibilityLabel={`${t.callTypeNames[entry.type]} · ${caller.name} · ${when} · ${entry.meta}`}
                onPress={() => callContact(entry.callerIdx)}
              />
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
