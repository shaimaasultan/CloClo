import { Platform } from 'react-native';
import { ToneId } from '../i18n/dictionaries';

// Ported from the prototype's WebAudio tone() helper and RINGTONES table.
// These are synthesized oscillator blips, which only the browser's
// AudioContext can produce — expo-audio plays recorded files, not
// oscillators — so on iOS/Android every call here is a silent no-op until
// real sound assets are recorded for the native build.

type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

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
  // Browsers start audio suspended until the user interacts; any later
  // sound request (a tap, a toggle) wakes it back up.
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
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

// Little sounds for things you can tap in the Keeper's room.
export type Sfx = 'giggle' | 'grump' | 'click' | 'creak' | 'rustle' | 'bump' | 'shimmer';

const SFX: Record<Sfx, () => void> = {
  giggle: () => {
    tone(880, 0.07, 'triangle', 0.05);
    setTimeout(() => tone(1100, 0.07, 'triangle', 0.05), 90);
    setTimeout(() => tone(1320, 0.09, 'triangle', 0.05), 180);
  },
  grump: () => {
    tone(170, 0.2, 'sawtooth', 0.035);
    setTimeout(() => tone(130, 0.24, 'sawtooth', 0.035), 160);
  },
  click: () => tone(2200, 0.02, 'square', 0.04),
  creak: () => {
    tone(320, 0.22, 'triangle', 0.03);
    setTimeout(() => tone(260, 0.2, 'triangle', 0.03), 150);
  },
  rustle: () => {
    tone(3000, 0.015, 'square', 0.02);
    setTimeout(() => tone(2600, 0.015, 'square', 0.02), 45);
    setTimeout(() => tone(3300, 0.015, 'square', 0.02), 90);
  },
  bump: () => tone(660, 0.06, 'sine', 0.05),
  shimmer: () => {
    tone(1568, 0.1, 'triangle', 0.035);
    setTimeout(() => tone(1760, 0.1, 'triangle', 0.035), 80);
    setTimeout(() => tone(2093, 0.14, 'triangle', 0.035), 160);
  },
};

export function playSfx(name: Sfx) {
  SFX[name]();
}

// A looping bed of filtered noise for rain. `level` is the target volume
// (0 fades it out and stops it); changes glide rather than jump.
let rain: { src: any; gain: any } | null = null;

export function setRainLevel(level: number) {
  const ctx = getContext();
  if (!ctx) return;
  if (level <= 0) {
    if (rain) {
      const fading = rain;
      rain = null;
      fading.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => {
        try {
          fading.src.stop();
        } catch {
          // already stopped
        }
      }, 1500);
    }
    return;
  }
  if (!rain) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    rain = { src, gain };
  }
  rain.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.4);
}
