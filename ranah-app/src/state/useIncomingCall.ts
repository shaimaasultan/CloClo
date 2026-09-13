import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useKeeperState } from './KeeperStateContext';
import { useLang } from './LangContext';

// Ported from the prototype's startRinging(): pick a random caller, switch
// to their sky, start ringing, and open the Keeper's room — the keeper is
// the one who hears the phone first, so that's where an incoming call lands.
export function useIncomingCall() {
  const router = useRouter();
  const { t } = useLang();
  const { callState, setSky, startRinging } = useKeeperState();

  return useCallback(() => {
    if (callState !== 'idle') return;
    const idx = Math.floor(Math.random() * t.callers.length);
    setSky(t.callers[idx].sky);
    startRinging(idx);
    router.dismissTo('/room');
  }, [callState, t, setSky, startRinging, router]);
}
