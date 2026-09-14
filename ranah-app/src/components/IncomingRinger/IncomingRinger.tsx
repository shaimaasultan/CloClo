import { useEffect } from 'react';
import { startRing, stopRing } from '../../audio/tones';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useSettings } from '../../state/SettingsContext';

// Mounted once at the root rather than in a screen, so the phone keeps
// ringing no matter which screen the user wanders to while it rings. The
// caller's chosen ringtone rings until the call is answered or declined:
// the old bell (or another built-in tone) with pauses between rings, or a
// recorded ringtone on a loop.
export function IncomingRinger() {
  const { callState, ringerId } = useKeeperState();
  const { soundEnabled, toneForContact, recordedToneFor } = useSettings();

  const ringing = callState === 'ringing' && ringerId !== null;
  const tone = ringerId !== null ? toneForContact(ringerId) : null;
  const recordedUri = ringerId !== null ? recordedToneFor(ringerId) : undefined;

  useEffect(() => {
    if (!ringing || !soundEnabled || !tone) return;
    startRing(tone, recordedUri);
    return () => stopRing();
  }, [ringing, soundEnabled, tone, recordedUri]);

  return null;
}
