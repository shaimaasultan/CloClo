import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useContacts } from './ContactsContext';
import { useKeeperState } from './KeeperStateContext';
import { useSettings } from './SettingsContext';

// Ported from the prototype's callContact(): switch to the caller's sky,
// open the line, clunk the handset, and drop back to the dial where the
// lifted handset and awake keeper show the call is live. Ignored while a
// call is already ringing or active, same as the prototype.
export function useCallContact() {
  const router = useRouter();
  const { contactById } = useContacts();
  const { callState, startCall, setSky } = useKeeperState();
  const { clunk } = useSettings();

  return useCallback(
    (id: string) => {
      if (callState !== 'idle') return;
      const caller = contactById(id);
      if (!caller) return;
      setSky(caller.sky);
      startCall(id);
      clunk(true);
      router.dismissTo('/');
    },
    [callState, contactById, setSky, startCall, clunk, router]
  );
}
