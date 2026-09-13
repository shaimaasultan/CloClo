import { Platform } from 'react-native';
import { ToneId } from '../i18n/dictionaries';

// Ported from the prototype's WebAudio tone() helper and RINGTONES table.
// These are synthesized oscillator blips, which only the browser's
// AudioContext can produce — expo-audio plays recorded files, not
// oscillators — so on iOS/Android every call here is a silent no-op until
// real sound assets are recorded for the native build.

type Wave = 'sine' | 'square' | 'triangle';

export const TONE_IDS: ToneId[] = ['classic', 'chime', 'buzz', 'pulse'];

let audioCtx: any = null;

function getContext() {
  if (Platform.OS !== 'web') return null;
  if (!audioCtx) {
    const g = globalThis as any;
    const Ctx = g.AudioContext || g.webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function tone(freq: number, dur: number, type: Wave = 'square', gainPeak = 0.06) {
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playTick() {
  tone(1400, 0.03, 'square', 0.05);
}

export function playClunk(open: boolean) {
  tone(open ? 180 : 120, 0.16, 'sine', 0.09);
}

const RINGTONES: Record<ToneId, () => void> = {
  classic: () => {
    tone(1000, 0.18, 'sine', 0.06);
    setTimeout(() => tone(820, 0.18, 'sine', 0.06), 220);
  },
  chime: () => {
    tone(880, 0.12, 'triangle', 0.06);
    setTimeout(() => tone(1108, 0.12, 'triangle', 0.06), 110);
    setTimeout(() => tone(1318, 0.16, 'triangle', 0.06), 220);
  },
  buzz: () => {
    tone(300, 0.09, 'square', 0.05);
    setTimeout(() => tone(300, 0.09, 'square', 0.05), 130);
  },
  pulse: () => {
    tone(650, 0.06, 'square', 0.05);
    setTimeout(() => tone(950, 0.06, 'square', 0.05), 90);
    setTimeout(() => tone(650, 0.06, 'square', 0.05), 180);
  },
};

export function playRingtone(id: ToneId) {
  RINGTONES[id]();
}
