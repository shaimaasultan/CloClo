import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useContacts } from './ContactsContext';
import { useKeeperState } from './KeeperStateContext';
import { askLateCall, isLateHour } from './lateCall';
import { useSettings } from './SettingsContext';

// Ported from the prototype's callContact(): switch to the caller's sky,
// open the line, clunk the handset, and drop back to the dial where the
// lifted handset and awake keeper show the call is live. Ignored while a
// call is already ringing or active, same as the prototype.
//
// If it's late at night where they are, the keeper asks first (see
// LateCallPrompt); "Call anyway" calls again with `force`.
export function useCallContact() {
  const router = useRouter();
  const { contactById } = useContacts();
  const { callState, startCall, setSky } = useKeeperState();
  const { clunk } = useSettings();

  return useCallback(
    (id: string, options?: { force?: boolean }) => {
      if (callState !== 'idle') return;
      const caller = contactById(id);
      if (!caller) return;
      if (!options?.force && isLateHour(caller.localHour)) {
        askLateCall(id);
        return;
      }
      setSky(caller.sky);
      startCall(id);
      clunk(true);
      router.dismissTo('/');
    },
    [callState, contactById, setSky, startCall, clunk, router]
  );
}
