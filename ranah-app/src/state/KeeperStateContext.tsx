import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WeatherKind } from '../components/WeatherLayer/WeatherLayer';
import { CallType, DICTIONARIES } from '../i18n/dictionaries';
import { readPersisted, usePersist } from './persist';

export type CallState = 'idle' | 'ringing' | 'active';
export type KeeperMood = 'neutral' | 'bored' | 'happy';

const ROOM_PROPS = ['book', 'music', 'chat'] as const;
export type RoomProp = (typeof ROOM_PROPS)[number];

// Ported from the prototype's computeMood(): bored after a long silence,
// briefly happy right after a call ends, neutral otherwise.
const BORED_MS = 30000;
const HAPPY_MS = 18000;
const MOOD_POLL_MS = 4000;
// An unanswered call stops ringing after this long and counts as missed.
const RING_TIMEOUT_MS = 20000;
const CALL_LOG_LIMIT = 30;

// A call made or received in the app (kept across restarts).
export interface LoggedCall {
  contactId: string;
  type: CallType;
  at: number;
  durationSec?: number;
}

// The sample call history is the same in every language, so either
// dictionary works for counting it.
const SAMPLE_RECENTS = DICTIONARIES.en.recents;
// Seed the door note with the sample history's missed calls.
const SAMPLE_MISSED = [...new Set(SAMPLE_RECENTS.filter((r) => r.type === 'missed').map((r) => r.contactId))];

interface KeeperStateValue {
  callState: CallState;
  setCallState: (state: CallState) => void;
  sky: WeatherKind;
  setSky: (sky: WeatherKind) => void;
  mood: KeeperMood;
  momentIndex: number;
  roomProp: RoomProp;
  cycleMoment: () => void;
  // The contact who is ringing (or on the line after answering); null once
  // the call is back to idle.
  ringerId: string | null;
  startRinging: (contactId: string) => void;
  // Open the line straight to a known contact (Contacts / Recents), so the
  // Number readout can show who's on the line just as it does for rings.
  startCall: (contactId: string) => void;
  // The "Last dialed" readout lives here rather than in the dial screen so
  // the same info bar can show it on the Keeper's room too, as the
  // prototype's infobar sits above every scene.
  dialed: string;
  appendDigit: (digit: string) => void;
  clearDialed: () => void;
  // Calls made in the app (saved across restarts), newest first.
  callLog: LoggedCall[];
  // Unseen missed calls the keeper has pinned to the door, one contact id per
  // call (so the same caller can appear more than once), newest first;
  // cleared once Recents has been seen.
  missedNotes: string[];
  dismissMissedNotes: () => void;
  // Connected (answered or outgoing) calls with a contact, sample history
  // included — what unlocks their keepsake on the shelf.
  connectedCallCount: (contactId: string) => number;
  // Your microphone on a live call: muted keeps the line in use but stops
  // your side (and the transcript) until unmuted. Resets when the call ends.
  muted: boolean;
  toggleMute: () => void;
}

const KeeperStateContext = createContext<KeeperStateValue | null>(null);

export function KeeperStateProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallStateRaw] = useState<CallState>('idle');
  const [sky, setSky] = useState<WeatherKind>('clear');
  const [mood, setMood] = useState<KeeperMood>('neutral');
  const [momentIndex, setMomentIndex] = useState(0);
  const [ringerId, setRingerId] = useState<string | null>(null);
  const [dialed, setDialed] = useState('');
  const [callLog, setCallLog] = useState<LoggedCall[]>(() => readPersisted('callLog', [], Array.isArray));
  const [missedNotes, setMissedNotes] = useState<string[]>(() => readPersisted('missedNotes', SAMPLE_MISSED, Array.isArray));
  usePersist('callLog', callLog);
  usePersist('missedNotes', missedNotes);
  const [muted, setMuted] = useState(false);

  const lastCallEndTime = useRef(0);
  const callsCompleted = useRef(0);
  // Mirrors of state for transitions, which must read the current values
  // synchronously (a timeout and a tap can race).
  const callStateRef = useRef<CallState>('idle');
  const ringerIdRef = useRef<string | null>(null);
  const callStartedAt = useRef(0);
  const callDirection = useRef<'incoming' | 'outgoing'>('outgoing');

  const computeMood = useCallback((): KeeperMood => {
    const dt = Date.now() - lastCallEndTime.current;
    if (dt < HAPPY_MS && callsCompleted.current > 0) return 'happy';
    if (dt > BORED_MS) return 'bored';
    return 'neutral';
  }, []);

  useEffect(() => {
    const id = setInterval(() => setMood(computeMood()), MOOD_POLL_MS);
    return () => clearInterval(id);
  }, [computeMood]);

  const logCall = useCallback((entry: LoggedCall) => {
    setCallLog((prev) => [entry, ...prev].slice(0, CALL_LOG_LIMIT));
  }, []);

  // Every call-state change goes through here so the call log stays right:
  // a ring that ends without being answered — declined or left to ring out —
  // is missed and pinned to the door; an answered or outgoing call is logged
  // with its length when it ends.
  const transition = useCallback(
    (next: CallState) => {
      const prev = callStateRef.current;
      if (prev === next) return;
      const who = ringerIdRef.current;
      const now = Date.now();

      if (next === 'active') {
        callDirection.current = prev === 'ringing' ? 'incoming' : 'outgoing';
        callStartedAt.current = now;
      }
      if (prev === 'active' && next === 'idle') {
        lastCallEndTime.current = now;
        callsCompleted.current += 1;
        if (who !== null) {
          logCall({
            contactId: who,
            type: callDirection.current,
            at: now,
            durationSec: Math.max(1, Math.round((now - callStartedAt.current) / 1000)),
          });
        }
      }
      if (prev === 'ringing' && next === 'idle' && who !== null) {
        logCall({ contactId: who, type: 'missed', at: now });
        setMissedNotes((notes) => [who, ...notes].slice(0, 99));
      }

      callStateRef.current = next;
      if (next === 'idle') {
        ringerIdRef.current = null;
        setRingerId(null);
        setMuted(false);
      }
      setCallStateRaw(next);
      if (prev === 'active' && next === 'idle') setMood(computeMood());
    },
    [computeMood, logCall]
  );

  const setCallState = useCallback((next: CallState) => transition(next), [transition]);

  // Nobody picked up: stop ringing and leave a note.
  useEffect(() => {
    if (callState !== 'ringing') return;
    const id = setTimeout(() => transition('idle'), RING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [callState, transition]);

  const cycleMoment = useCallback(() => {
    setMomentIndex((i) => (i + 1) % ROOM_PROPS.length);
  }, []);

  const startRinging = useCallback(
    (contactId: string) => {
      ringerIdRef.current = contactId;
      setRingerId(contactId);
      transition('ringing');
    },
    [transition]
  );

  const startCall = useCallback(
    (contactId: string) => {
      ringerIdRef.current = contactId;
      setRingerId(contactId);
      transition('active');
    },
    [transition]
  );

  const appendDigit = useCallback((digit: string) => {
    setDialed((prev) => (prev + digit).slice(0, 15));
  }, []);

  const clearDialed = useCallback(() => setDialed(''), []);

  const dismissMissedNotes = useCallback(() => setMissedNotes((notes) => (notes.length ? [] : notes)), []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const connectedCallCount = useCallback(
    (contactId: string) =>
      SAMPLE_RECENTS.filter((r) => r.contactId === contactId && r.type !== 'missed').length +
      callLog.filter((c) => c.contactId === contactId && c.type !== 'missed').length,
    [callLog]
  );

  const value = useMemo<KeeperStateValue>(
    () => ({
      callState,
      setCallState,
      sky,
      setSky,
      mood,
      momentIndex,
      roomProp: ROOM_PROPS[momentIndex],
      cycleMoment,
      ringerId,
      startRinging,
      startCall,
      dialed,
      appendDigit,
      clearDialed,
      callLog,
      missedNotes,
      dismissMissedNotes,
      connectedCallCount,
      muted,
      toggleMute,
    }),
    [
      callState,
      setCallState,
      sky,
      mood,
      momentIndex,
      cycleMoment,
      ringerId,
      startRinging,
      startCall,
      dialed,
      appendDigit,
      clearDialed,
      callLog,
      missedNotes,
      dismissMissedNotes,
      connectedCallCount,
      muted,
      toggleMute,
    ]
  );

  return <KeeperStateContext.Provider value={value}>{children}</KeeperStateContext.Provider>;
}

export function useKeeperState() {
  const ctx = useContext(KeeperStateContext);
  if (!ctx) throw new Error('useKeeperState must be used within KeeperStateProvider');
  return ctx;
}
