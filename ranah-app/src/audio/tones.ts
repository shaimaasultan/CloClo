import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { ToneId } from '../i18n/dictionaries';

// All of CloClo's sounds are WAV files in assets/sounds — a two-gong
// telephone bell, the rotary dial whirring home with its pulse clicks, the
// handset's clunk, the room's little noises and rain — synthesized by
// scripts/generate-sounds.mjs and played with expo-audio, so they work on
// iOS, Android and the web alike. A ringtone recorded for a contact plays
// from its own file (a data: URL on the web).

export type BuiltInTone = Exclude<ToneId, 'recorded'>;
export const TONE_IDS: BuiltInTone[] = ['classic', 'chime', 'buzz', 'pulse'];

// Little sounds for things you can tap in the Keeper's room.
export type Sfx = 'giggle' | 'grump' | 'click' | 'creak' | 'rustle' | 'bump' | 'shimmer';

type Source = number | string;

const RINGTONES: Record<BuiltInTone, number> = {
  classic: require('../../assets/sounds/ring-classic.wav'),
  chime: require('../../assets/sounds/ring-chime.wav'),
  buzz: require('../../assets/sounds/ring-buzz.wav'),
  pulse: require('../../assets/sounds/ring-pulse.wav'),
};

// Index 0 is one pulse (the digit "1"); index 9 is ten pulses ("0").
const DIAL_RETURNS: number[] = [
  require('../../assets/sounds/dial-1.wav'),
  require('../../assets/sounds/dial-2.wav'),
  require('../../assets/sounds/dial-3.wav'),
  require('../../assets/sounds/dial-4.wav'),
  require('../../assets/sounds/dial-5.wav'),
  require('../../assets/sounds/dial-6.wav'),
  require('../../assets/sounds/dial-7.wav'),
  require('../../assets/sounds/dial-8.wav'),
  require('../../assets/sounds/dial-9.wav'),
  require('../../assets/sounds/dial-10.wav'),
];

const SFX: Record<Sfx, number> = {
  giggle: require('../../assets/sounds/sfx-giggle.wav'),
  grump: require('../../assets/sounds/sfx-grump.wav'),
  click: require('../../assets/sounds/sfx-click.wav'),
  creak: require('../../assets/sounds/sfx-creak.wav'),
  rustle: require('../../assets/sounds/sfx-rustle.wav'),
  bump: require('../../assets/sounds/sfx-bump.wav'),
  shimmer: require('../../assets/sounds/sfx-shimmer.wav'),
};

const TICK: number = require('../../assets/sounds/tick.wav');
const CLUNK_OPEN: number = require('../../assets/sounds/clunk-open.wav');
const CLUNK_CLOSE: number = require('../../assets/sounds/clunk-close.wav');
const RAIN: number = require('../../assets/sounds/rain-loop.wav');

// How often a built-in ringtone repeats while a call rings: the bell rings
// for about two seconds, then pauses, like a real phone.
const RING_INTERVAL_MS = 3800;

// Let sounds play even with an iPhone's silent switch on (they're the app's
// whole point), set once before the first sound.
let audioModeSet = false;
function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

// One player per sound, reused for every play.
const players = new Map<string, AudioPlayer>();

function playerFor(key: string, source: Source): AudioPlayer | null {
  const existing = players.get(key);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(typeof source === 'string' ? { uri: source } : source);
    players.set(key, player);
    return player;
  } catch {
    return null;
  }
}

// Play a sound from the start (restarting it if it's still going).
function play(key: string, source: Source, volume = 1) {
  ensureAudioMode();
  const player = playerFor(key, source);
  if (!player) return;
  try {
    player.volume = volume;
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  } catch {
    // A sound that can't play isn't worth interrupting the app for.
  }
}

export function playTick() {
  play('tick', TICK);
}

export function playClunk(open: boolean) {
  play(open ? 'clunk-open' : 'clunk-close', open ? CLUNK_OPEN : CLUNK_CLOSE);
}

// The dial whirring home after a digit: one click per pulse ("0" is ten).
export function playDialReturn(digit: string) {
  const pulses = digit === '0' ? 10 : Number(digit);
  if (!Number.isInteger(pulses) || pulses < 1 || pulses > 10) return;
  play(`dial-${pulses}`, DIAL_RETURNS[pulses - 1]);
}

// One ring of a tone (a preview in Sounds, say). A recorded tone needs its
// file; without one it falls back to the bell.
export function playRingtone(id: ToneId, recordedUri?: string) {
  if (id === 'recorded' && recordedUri) play(`recorded:${recordedUri}`, recordedUri);
  else play(`ring-${id === 'recorded' ? 'classic' : id}`, RINGTONES[id === 'recorded' ? 'classic' : id]);
}

// Hear a fresh recording before keeping it.
export function previewSound(uri: string) {
  play(`preview:${uri}`, uri);
}

// Let go of the players for a recording that's been deleted.
export function forgetSound(uri: string) {
  for (const key of [`recorded:${uri}`, `preview:${uri}`]) {
    const player = players.get(key);
    if (!player) continue;
    try {
      player.pause();
      player.remove();
    } catch {
      // already gone
    }
    players.delete(key);
  }
}

// --- Ringing ------------------------------------------------------------------

let ringTimer: ReturnType<typeof setInterval> | null = null;
let loopingKey: string | null = null;

// Ring until stopRing(): a built-in tone repeats with a pause between rings;
// a recorded tone loops for as long as the call rings.
export function startRing(id: ToneId, recordedUri?: string) {
  stopRing();
  if (id === 'recorded' && recordedUri) {
    ensureAudioMode();
    const key = `recorded:${recordedUri}`;
    const player = playerFor(key, recordedUri);
    if (!player) return;
    loopingKey = key;
    try {
      player.loop = true;
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => player.play());
    } catch {
      loopingKey = null;
    }
    return;
  }
  const tone: BuiltInTone = id === 'recorded' ? 'classic' : id;
  playRingtone(tone);
  ringTimer = setInterval(() => playRingtone(tone), RING_INTERVAL_MS);
}

export function stopRing() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  // Answering or declining cuts the bell off mid-ring.
  for (const tone of TONE_IDS) players.get(`ring-${tone}`)?.pause();
  if (loopingKey) {
    const player = players.get(loopingKey);
    if (player) {
      player.loop = false;
      player.pause();
    }
    loopingKey = null;
  }
}

export function playSfx(name: Sfx) {
  play(`sfx-${name}`, SFX[name]);
}

// --- Rain ----------------------------------------------------------------------

// The room asks for small levels (0–0.09, tuned for the old synthesized
// noise); the recorded loop needs a bigger volume to sound the same.
const RAIN_VOLUME_SCALE = 8;
const RAIN_FADE_MS = 80;

let rainPlayer: AudioPlayer | null = null;
let rainTarget = 0;
let rainFade: ReturnType<typeof setInterval> | null = null;

// A looping bed of rain. `level` is the target loudness (0 fades it out and
// stops it); changes glide rather than jump.
export function setRainLevel(level: number) {
  rainTarget = Math.min(1, Math.max(0, level * RAIN_VOLUME_SCALE));
  if (rainTarget > 0 && !rainPlayer) {
    ensureAudioMode();
    try {
      rainPlayer = createAudioPlayer(RAIN);
      rainPlayer.loop = true;
      rainPlayer.volume = 0;
      rainPlayer.play();
    } catch {
      rainPlayer = null;
    }
  }
  if (!rainPlayer || rainFade) return;
  rainFade = setInterval(() => {
    const player = rainPlayer;
    if (!player) {
      if (rainFade) clearInterval(rainFade);
      rainFade = null;
      return;
    }
    const next = player.volume + (rainTarget - player.volume) * 0.25;
    player.volume = Math.abs(rainTarget - next) < 0.01 ? rainTarget : next;
    if (player.volume !== rainTarget) return;
    if (rainFade) clearInterval(rainFade);
    rainFade = null;
    if (rainTarget === 0) {
      try {
        player.pause();
        player.remove();
      } catch {
        // already stopped
      }
      rainPlayer = null;
    }
  }, RAIN_FADE_MS);
}
