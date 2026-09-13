import { useEffect } from 'react';
import { playRingtone } from '../../audio/tones';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useSettings } from '../../state/SettingsContext';

// Same cadence as the prototype's ringPulse(): the caller's chosen ringtone
// right away, then again every 3.4s until the call is answered or declined.
const RING_INTERVAL_MS = 3400;

// Mounted once at the root rather than in a screen, so the phone keeps
// ringing no matter which screen the user wanders to while it rings.
export function IncomingRinger() {
  const { callState, ringerIdx } = useKeeperState();
  const { soundEnabled, toneForContact } = useSettings();

  const ringing = callState === 'ringing' && ringerIdx !== null;
  const tone = ringerIdx !== null ? toneForContact(ringerIdx) : null;

  useEffect(() => {
    if (!ringing || !soundEnabled || !tone) return;
    playRingtone(tone);
    const id = setInterval(() => playRingtone(tone), RING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ringing, soundEnabled, tone]);

  return null;
}
