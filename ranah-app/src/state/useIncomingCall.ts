import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useContacts } from './ContactsContext';
import { useKeeperState } from './KeeperStateContext';

// Ported from the prototype's startRinging(): pick a random contact, switch
// to their sky, start ringing, and open the Keeper's room — the keeper is
// the one who hears the phone first, so that's where an incoming call lands.
export function useIncomingCall() {
  const router = useRouter();
  const { contacts } = useContacts();
  const { callState, setSky, startRinging } = useKeeperState();

  return useCallback(() => {
    if (callState !== 'idle' || contacts.length === 0) return;
    const caller = contacts[Math.floor(Math.random() * contacts.length)];
    setSky(caller.sky);
    startRinging(caller.id);
    router.dismissTo('/room');
  }, [callState, contacts, setSky, startRinging, router]);
}
