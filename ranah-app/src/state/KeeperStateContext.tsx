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
}

const KeeperStateContext = createContext<KeeperStateValue | null>(null);

export function KeeperStateProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallStateRaw] = useState<CallState>('idle');
  const [sky, setSky] = useState<WeatherKind>('clear');
  const [mood, setMood] = useState<KeeperMood>('neutral');
  const [momentIndex, setMomentIndex] = useState(0);

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
    }),
    [callState, setCallState, sky, mood, momentIndex, cycleMoment]
  );

  return <KeeperStateContext.Provider value={value}>{children}</KeeperStateContext.Provider>;
}

export function useKeeperState() {
  const ctx = useContext(KeeperStateContext);
  if (!ctx) throw new Error('useKeeperState must be used within KeeperStateProvider');
  return ctx;
}
