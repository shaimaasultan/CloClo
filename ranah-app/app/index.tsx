import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthorFooter } from '../src/components/AuthorFooter/AuthorFooter';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { CallInfoBar } from '../src/components/CallInfoBar/CallInfoBar';
import { DeclineButton } from '../src/components/DeclineButton/DeclineButton';
import { MissedCallNote } from '../src/components/MissedCallNote/MissedCallNote';
import { SnoozeSticker } from '../src/components/SnoozeSticker/SnoozeSticker';
import { MuteButton } from '../src/components/MuteButton/MuteButton';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
import { RotaryDial } from '../src/components/RotaryDial/RotaryDial';
import { WeatherLayer } from '../src/components/WeatherLayer/WeatherLayer';
import { useContacts } from '../src/state/ContactsContext';
import { isBirthdayOn } from '../src/state/decorations';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useNudge } from '../src/state/nudges';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { dayKey, occursOn, pendingSnoozes, useReminders } from '../src/state/RemindersContext';
import { useSettings } from '../src/state/SettingsContext';
import { useIncomingCall } from '../src/state/useIncomingCall';
import { pointer } from '../src/theme/pointer';

const CHROME_HEIGHT = 245; // rough budget for the header (logo + settings pill) + dock + readout row above the stage, plus the author footer

export default function DialScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { callState, setCallState, sky, mood, appendDigit, ringerId, missedNotes, muted } = useKeeperState();
  const { contacts, contactById } = useContacts();
  // Someone you haven't talked to in a while: the hub keeper holds up their photo.
  const hubNudge = useNudge();
  const ringer = contactById(ringerId);
  // Everyone whose birthday is today, for the reminder beside the dial.
  const birthdayNames = contacts.filter((c) => isBirthdayOn(c.birthday)).map((c) => c.name);
  // Today's reminders, and how many are still to do.
  const { reminders } = useReminders();
  const now = new Date();
  const todaysReminders = reminders.filter((r) => occursOn(r, now));
  const pendingReminders = todaysReminders.filter((r) => !r.doneDates.includes(dayKey(now))).length;
  // Snoozed reminders still waiting to come back.
  const snoozed = pendingSnoozes(reminders, now.getTime());
  const { tick, clunk } = useSettings();
  const startIncomingCall = useIncomingCall();
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const rowDir = isRtl ? 'row-reverse' : 'row';
  // Same responsive intent as the prototype's min(80vw,400px) dial sizing,
  // plus a check against remaining vertical space so the handset (which
  // peeks above the dial) never gets pushed into the chrome above it.
  const dialSize = Math.max(220, Math.min(340, winWidth * 0.86, (winHeight - CHROME_HEIGHT) * 0.85));
  // Prototype proportions (400px dial): a 220px handset whose top sits 42px
  // above the dial, so its horns rest down over the brass bezel like a
  // receiver sitting in its cradle rather than floating above the phone.
  const handsetWidth = dialSize * (220 / 400);
  const handsetRise = dialSize * (42 / 400);
  const handleHandsetPress = () => {
    const opening = callState !== 'active';
    clunk(opening);
    if (callState === 'ringing') {
      // answer — straight into the live call screen with its transcript
      setCallState('active');
      router.push('/call');
    }
    else if (callState === 'active') setCallState('idle'); // hang up
    else setCallState('active'); // tap-to-call a dialled number
  };

  const handleDigit = (digit: string) => {
    tick();
    appendDigit(digit);
  };

  const hangUp = () => {
    clunk(false);
    setCallState('idle');
  };

  // The same unseen missed calls the keeper pins to the room's door.
  // Each caller once, even if they missed you several times.
  const missedNames = [...new Set(missedNotes)].map((id) => contactById(id)?.name).filter((name): name is string => !!name);

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <Dock active="dial" />

        <View style={[styles.readoutRow, { flexDirection: rowDir }]}>
          <CallInfoBar />
          <View style={{ flex: 1 }} />
          {callState === 'idle' && (
            <Pressable onPress={startIncomingCall} style={styles.demoBtn}>
              <Text style={styles.demoBtnLabel}>Preview an incoming call</Text>
            </Pressable>
          )}
          {callState === 'ringing' && <DeclineButton label={t.decline} onPress={() => setCallState('idle')} />}
          {callState === 'active' && <MuteButton />}
          {callState === 'active' && <DeclineButton calm label={t.handsetHangup} onPress={hangUp} />}
        </View>

        <View style={styles.stage}>
          {/* The keeper's missed-call note, pinned in the corner beside the dial. */}
          {/* Beneath it, a blue sticker while any reminder is snoozed. */}
          {(missedNames.length > 0 || snoozed.length > 0) && (
            <View style={[styles.missedNote, isRtl ? { right: 16 } : { left: 16 }]}>
              {missedNames.length > 0 && <MissedCallNote names={missedNames} onPress={() => router.dismissTo('/recents')} />}
              {snoozed.length > 0 && (
                <SnoozeSticker
                  count={snoozed.length}
                  nextAt={snoozed[0].snooze?.at ?? 0}
                  onPress={() => router.dismissTo('/reminders')}
                />
              )}
            </View>
          )}
          {/* Today's birthdays and reminders in the opposite corner: the
              birthday note opens the Birthdays card on Contacts, the bell
              opens Reminders. */}
          {callState === 'idle' && (birthdayNames.length > 0 || todaysReminders.length > 0) && (
            <View style={[styles.cornerStack, isRtl ? { left: 16, alignItems: 'flex-start' } : { right: 16, alignItems: 'flex-end' }]}>
              {birthdayNames.length > 0 && (
                <Pressable
                  onPress={() => router.dismissTo('/contacts')}
                  role="button"
                  style={[styles.cornerPill, { borderColor: `${colours.metal2}8c`, flexDirection: rowDir }]}
                >
                  <Text style={styles.cornerEmoji}>🎂</Text>
                  <Text style={[styles.cornerText, { color: colours.highlight }]} numberOfLines={2}>
                    {t.birthdayReminder(birthdayNames.join(isRtl ? '، ' : ', '), birthdayNames.length)}
                  </Text>
                </Pressable>
              )}
              {todaysReminders.length > 0 && (
                <Pressable
                  onPress={() => router.dismissTo('/reminders')}
                  role="button"
                  style={[styles.cornerPill, { borderColor: `${colours.metal2}8c`, flexDirection: rowDir }]}
                >
                  <Text style={styles.cornerEmoji}>🔔</Text>
                  <Text style={[styles.cornerText, { color: colours.highlight }]} numberOfLines={2}>
                    {pendingReminders > 0 ? t.remindersToday(pendingReminders) : t.allDoneToday}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          <View style={{ width: dialSize, height: dialSize + handsetRise }}>
            <View style={{ position: 'absolute', top: handsetRise, left: 0 }}>
              <RotaryDial
                size={dialSize}
                colours={colours}
                onDigit={handleDigit}
                centerContent={
                  <KeeperAvatar
                    // Full-body keeper sized to stand inside the hub circle
                    // (radius 104 of the dial's 400-unit face).
                    size={dialSize * 0.42}
                    colours={colours}
                    callState={callState}
                    mood={mood}
                    sky={sky}
                    variant="hub"
                    muted={muted}
                    callerActivity={ringer?.activity}
                    celebrating={callState !== 'idle' && isBirthdayOn(ringer?.birthday)}
                    photo={hubNudge ? { initial: hubNudge.contact.name.charAt(0) } : undefined}
                    accessibilityLabel={t.roomTitle}
                    onPress={() => router.dismissTo('/room')}
                  />
                }
              />
            </View>
            {/* Rendered after the dial so it layers over the bezel, as the
                prototype's .handset-hit (z-index 7) does over .dial-wrap. */}
            <View style={[pointer.boxNone, { position: 'absolute', top: 0, left: (dialSize - handsetWidth) / 2 }]}>
              <PhoneHandset
                width={handsetWidth}
                colours={colours}
                isRinging={callState === 'ringing'}
                isOpen={callState === 'active'}
                onPress={handleHandsetPress}
              />
            </View>
          </View>
        </View>
        <AuthorFooter />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  readoutRow: { alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  demoBtn: {
    backgroundColor: 'rgba(239,230,211,.1)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  demoBtnLabel: { color: 'rgba(239,230,211,.8)', fontSize: 10, fontWeight: '600' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missedNote: { position: 'absolute', top: 8, zIndex: 2, gap: 6 },
  cornerStack: { position: 'absolute', top: 8, zIndex: 2, gap: 6 },
  cornerPill: {
    maxWidth: 170,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(11,10,8,.55)',
  },
  cornerEmoji: { fontSize: 16 },
  cornerText: { flexShrink: 1, fontSize: 11, fontWeight: '700' },
});
