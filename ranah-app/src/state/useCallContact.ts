import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useKeeperState } from './KeeperStateContext';
import { useLang } from './LangContext';
import { useSettings } from './SettingsContext';

// Ported from the prototype's callContact(): switch to the caller's sky,
// open the line, clunk the handset, and drop back to the dial where the
// lifted handset and awake keeper show the call is live. Ignored while a
// call is already ringing or active, same as the prototype.
export function useCallContact() {
  const router = useRouter();
  const { t } = useLang();
  const { callState, startCall, setSky } = useKeeperState();
  const { clunk } = useSettings();

  return useCallback(
    (idx: number) => {
      if (callState !== 'idle') return;
      const caller = t.callers[idx];
      if (!caller) return;
      setSky(caller.sky);
      startCall(idx);
      clunk(true);
      router.dismissTo('/');
    },
    [callState, t, setSky, startCall, clunk, router]
  );
}
