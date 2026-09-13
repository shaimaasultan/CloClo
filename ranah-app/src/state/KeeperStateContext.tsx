import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WeatherKind } from '../components/WeatherLayer/WeatherLayer';

export type CallState = 'idle' | 'ringing' | 'active';
export type KeeperMood = 'neutral' | 'bored' | 'happy';

const ROOM_PROPS = ['book', 'music', 'chat'] as const;
export type RoomProp = (typeof ROOM_PROPS)[number];

// Ported from the prototype's computeMood(): bored after a long silence,
// briefly happy right after a call ends, neutral otherwise.
const BORED_MS = 30000;
const HAPPY_MS = 18000;
const MOOD_POLL_MS = 4000;

interface KeeperStateValue {
  callState: CallState;
  setCallState: (state: CallState) => void;
  sky: WeatherKind;
  setSky: (sky: WeatherKind) => void;
  mood: KeeperMood;
  momentIndex: number;
  roomProp: RoomProp;
  cycleMoment: () => void;
  // Index into the dictionary's callers of whoever is ringing (or on the
  // line after answering); null once the call is back to idle.
  ringerIdx: number | null;
  startRinging: (callerIdx: number) => void;
  // Open the line straight to a known caller (Contacts / Recents), so the
  // Number readout can show who's on the line just as it does for rings.
  startCall: (callerIdx: number) => void;
  // The "Last dialed" readout lives here rather than in the dial screen so
  // the same info bar can show it on the Keeper's room too, as the
  // prototype's infobar sits above every scene.
  dialed: string;
  appendDigit: (digit: string) => void;
  clearDialed: () => void;
}

const KeeperStateContext = createContext<KeeperStateValue | null>(null);

export function KeeperStateProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallStateRaw] = useState<CallState>('idle');
  const [sky, setSky] = useState<WeatherKind>('clear');
  const [mood, setMood] = useState<KeeperMood>('neutral');
  const [momentIndex, setMomentIndex] = useState(0);
  const [ringerIdx, setRingerIdx] = useState<number | null>(null);
  const [dialed, setDialed] = useState('');

  const lastCallEndTime = useRef(0);
  const callsCompleted = useRef(0);

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

  const setCallState = useCallback(
    (next: CallState) => {
      if (next === 'idle') setRingerIdx(null);
      setCallStateRaw((prev) => {
        if (prev === 'active' && next === 'idle') {
          lastCallEndTime.current = Date.now();
          callsCompleted.current += 1;
          setMood(computeMood());
        }
        return next;
      });
    },
    [computeMood]
  );

  const cycleMoment = useCallback(() => {
    setMomentIndex((i) => (i + 1) % ROOM_PROPS.length);
  }, []);

  const startRinging = useCallback(
    (callerIdx: number) => {
      setRingerIdx(callerIdx);
      setCallState('ringing');
    },
    [setCallState]
  );

  const startCall = useCallback(
    (callerIdx: number) => {
      setRingerIdx(callerIdx);
      setCallState('active');
    },
    [setCallState]
  );

  const appendDigit = useCallback((digit: string) => {
    setDialed((prev) => (prev + digit).slice(0, 15));
  }, []);

  const clearDialed = useCallback(() => setDialed(''), []);

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
      ringerIdx,
      startRinging,
      startCall,
      dialed,
      appendDigit,
      clearDialed,
    }),
    [
      callState,
      setCallState,
      sky,
      mood,
      momentIndex,
      cycleMoment,
      ringerIdx,
      startRinging,
      startCall,
      dialed,
      appendDigit,
      clearDialed,
    ]
  );

  return <KeeperStateContext.Provider value={value}>{children}</KeeperStateContext.Provider>;
}

export function useKeeperState() {
  const ctx = useContext(KeeperStateContext);
  if (!ctx) throw new Error('useKeeperState must be used within KeeperStateProvider');
  return ctx;
}
