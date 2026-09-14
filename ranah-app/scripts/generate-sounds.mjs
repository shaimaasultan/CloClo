#!/usr/bin/env node
// Generates CloClo's sounds as WAV files in assets/sounds/ — run `npm run sounds`.
// Everything is synthesized here (no recordings, no licences), so the same
// sounds play on iOS, Android and the web through expo-audio.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const TAU = Math.PI * 2;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// Seeded noise, so regenerating produces identical files (and tidy git diffs).
let seed = 20260913;
function noise() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

// Scale to `peak`, soften the very ends so nothing clicks (unless it's a
// loop), and write 16-bit mono PCM.
function save(name, samples, peak, { fadeEnds = true } = {}) {
  if (fadeEnds) {
    const fade = Math.min(64, Math.floor(samples.length / 4));
    for (let i = 0; i < fade; i++) {
      samples[i] *= i / fade;
      samples[samples.length - 1 - i] *= i / fade;
    }
  }
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const gain = max > 0 ? peak / max : 1;
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples.length * 2, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(RATE, 24);
  wav.writeUInt32LE(RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * gain)) * 32767), 44 + i * 2));
  writeFileSync(join(OUT, name), wav);
  console.log(`${name.padEnd(18)} ${(samples.length / RATE).toFixed(2)}s`);
}

// --- Simple tones, matching the web prototype's oscillator blips ----------

const WAVES = {
  sine: (p) => Math.sin(TAU * p),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  triangle: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  sawtooth: (p) => 2 * (p % 1) - 1,
};

// A 5 ms exponential attack to `peak`, then an exponential decay over `dur`.
function tone(out, start, freq, dur, type, peak) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor((dur + 0.02) * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const env =
      t < 0.005
        ? 0.0001 * Math.pow(peak / 0.0001, t / 0.005)
        : peak * Math.pow(0.0001 / peak, Math.min(1, (t - 0.005) / Math.max(0.001, dur - 0.005)));
    out[s0 + i] += env * WAVES[type](freq * t);
  }
}

function tones(seconds, list) {
  const out = buffer(seconds);
  for (const [start, freq, dur, type, peak] of list) tone(out, start, freq, dur, type, peak);
  return out;
}

// --- Mechanical noises -----------------------------------------------------

// A sharp metal contact click with a little ping.
function contactClick(out, start, strength) {
  const s0 = Math.floor(start * RATE);
  for (let i = 0; i < Math.floor(0.012 * RATE) && s0 + i < out.length; i++) {
    const t = i / RATE;
    out[s0 + i] += strength * (noise() * Math.exp(-t / 0.0012) + 0.5 * Math.sin(TAU * 2600 * t) * Math.exp(-t / 0.004));
  }
}

// A low knock whose pitch drops as it dies away.
function thump(out, start, freq, strength, decay) {
  const s0 = Math.floor(start * RATE);
  let phase = 0;
  for (let i = 0; i < Math.floor(decay * 6 * RATE) && s0 + i < out.length; i++) {
    const t = i / RATE;
    phase += (freq * (1 + 0.6 * Math.exp(-t / 0.01))) / RATE;
    out[s0 + i] += strength * Math.sin(TAU * phase) * Math.exp(-t / decay);
  }
}

// Hollow plastic rattle: high-passed noise, quickly gone.
function rattle(out, start, strength) {
  const s0 = Math.floor(start * RATE);
  let lp = 0;
  for (let i = 0; i < Math.floor(0.09 * RATE) && s0 + i < out.length; i++) {
    const t = i / RATE;
    const n = noise();
    lp += 0.25 * (n - lp);
    out[s0 + i] += strength * (n - lp) * Math.exp(-t / 0.025);
  }
}

// --- The telephone bell ------------------------------------------------------

// One hammer blow on a small metal gong: a handful of inharmonic partials,
// the higher ones dying faster, plus the hammer's own tick.
function strikeGong(out, start, freq, strength) {
  const partials = [
    [1, 1, 3.2],
    [2.32, 0.55, 7],
    [3.9, 0.3, 11],
    [5.4, 0.18, 16],
  ];
  const s0 = Math.floor(start * RATE);
  const offset = (noise() + 1) * Math.PI;
  for (let i = 0; i < Math.floor(0.9 * RATE) && s0 + i < out.length; i++) {
    const t = i / RATE;
    let v = t < 0.004 ? 0.6 * noise() * (1 - t / 0.004) : 0;
    for (const [ratio, amp, decay] of partials) v += amp * Math.exp(-decay * t) * Math.sin(TAU * freq * ratio * t + offset * ratio);
    out[s0 + i] += strength * v;
  }
}

// The classic telephone bell: an electromagnetic hammer swinging about 20
// times a second between two gongs, so both ring on top of each other.
function bellRing(ringSeconds) {
  const out = buffer(ringSeconds + 0.9);
  const swing = 1 / 20;
  for (let k = 0; k * swing < ringSeconds; k++) {
    const strength = 0.85 + 0.15 * ((noise() + 1) / 2);
    strikeGong(out, k * swing, 1046, strength);
    strikeGong(out, k * swing + swing / 2, 1397, strength * 0.9);
  }
  return out;
}

// --- The rotary dial ---------------------------------------------------------

// The dial spinning home after you let go: the governor's whirr, and one
// contact click per pulse, ten a second — "3" clicks three times, "0" ten —
// ending with a knock as it comes to rest.
function dialReturn(pulses) {
  const lead = 0.1;
  const period = 0.1;
  const whirrEnd = lead + pulses * period;
  const out = buffer(whirrEnd + 0.14);
  let lp1 = 0;
  let lp2 = 0;
  let humPhase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.03) * Math.max(0, Math.min(1, (whirrEnd + 0.03 - t) / 0.06));
    const n = noise();
    lp1 += 0.09 * (n - lp1);
    lp2 += 0.09 * (lp1 - lp2);
    humPhase += (120 * (1 + 0.06 * Math.sin(TAU * 11 * t))) / RATE;
    const hum = 0.5 * Math.sin(TAU * humPhase) + 0.25 * Math.sin(TAU * 2 * humPhase);
    out[i] = env * (2.2 * lp2 + 0.18 * hum);
  }
  for (let p = 0; p < pulses; p++) {
    const at = lead + p * period;
    contactClick(out, at, 0.9); // the contacts break…
    contactClick(out, at + 0.064, 0.35); // …and make again
  }
  thump(out, whirrEnd + 0.01, 140, 0.5, 0.05);
  return out;
}

// --- The handset -------------------------------------------------------------

// Lifting the handset (a light knock and a rattle) or dropping it back onto
// the cradle (a heavier knock with a small bounce).
function handset(open) {
  const out = buffer(0.45);
  if (open) {
    contactClick(out, 0, 0.45);
    thump(out, 0.015, 190, 0.7, 0.045);
    rattle(out, 0.02, 0.25);
  } else {
    thump(out, 0, 115, 1, 0.07);
    contactClick(out, 0.004, 0.55);
    thump(out, 0.075, 125, 0.35, 0.04);
    rattle(out, 0.01, 0.35);
  }
  return out;
}

// --- Room sounds ---------------------------------------------------------------

function rustle() {
  const out = buffer(0.16);
  for (const start of [0, 0.045, 0.09]) {
    const s0 = Math.floor(start * RATE);
    let lp = 0;
    for (let i = 0; i < Math.floor(0.03 * RATE); i++) {
      const t = i / RATE;
      const n = noise();
      lp += 0.5 * (n - lp);
      out[s0 + i] += (n - lp) * Math.sin((Math.PI * t) / 0.03);
    }
  }
  return out;
}

// A seamless loop of rain: soft filtered noise with the odd heavier drop, its
// end cross-faded into its start.
function rainLoop(seconds, crossfade) {
  const raw = buffer(seconds + crossfade);
  let lp = 0;
  let deep = 0;
  for (let i = 0; i < raw.length; i++) {
    const n = noise();
    lp += 0.33 * (n - lp);
    deep += 0.05 * (n - deep);
    raw[i] = 0.7 * lp + 0.6 * deep;
  }
  for (let k = 0; k < seconds * 14; k++) {
    const s0 = Math.floor(((noise() + 1) / 2) * (raw.length - 0.02 * RATE));
    const strength = 0.15 + 0.2 * ((noise() + 1) / 2);
    for (let i = 0; i < Math.floor(0.01 * RATE); i++) raw[s0 + i] += strength * noise() * Math.exp(-i / RATE / 0.002);
  }
  const out = buffer(seconds);
  const fadeN = Math.floor(crossfade * RATE);
  for (let i = 0; i < out.length; i++) out[i] = raw[i];
  for (let i = 0; i < fadeN; i++) {
    const w = i / fadeN;
    out[i] = raw[i] * w + raw[out.length + i] * (1 - w);
  }
  return out;
}

// --- Write everything ----------------------------------------------------------

mkdirSync(OUT, { recursive: true });

save('ring-classic.wav', bellRing(1.8), 0.9);
save('ring-chime.wav', tones(0.42, [[0, 880, 0.12, 'triangle', 0.06], [0.11, 1108, 0.12, 'triangle', 0.06], [0.22, 1318, 0.16, 'triangle', 0.06]]), 0.7);
save('ring-buzz.wav', tones(0.26, [[0, 300, 0.09, 'square', 0.05], [0.13, 300, 0.09, 'square', 0.05]]), 0.5);
save('ring-pulse.wav', tones(0.28, [[0, 650, 0.06, 'square', 0.05], [0.09, 950, 0.06, 'square', 0.05], [0.18, 650, 0.06, 'square', 0.05]]), 0.5);

for (let pulses = 1; pulses <= 10; pulses++) save(`dial-${pulses}.wav`, dialReturn(pulses), 0.75);
save('tick.wav', tones(0.06, [[0, 1400, 0.03, 'square', 0.05]]), 0.3);
save('clunk-open.wav', handset(true), 0.8);
save('clunk-close.wav', handset(false), 0.85);

save('sfx-giggle.wav', tones(0.3, [[0, 880, 0.07, 'triangle', 0.05], [0.09, 1100, 0.07, 'triangle', 0.05], [0.18, 1320, 0.09, 'triangle', 0.05]]), 0.45);
save('sfx-grump.wav', tones(0.45, [[0, 170, 0.2, 'sawtooth', 0.035], [0.16, 130, 0.24, 'sawtooth', 0.035]]), 0.4);
save('sfx-click.wav', tones(0.06, [[0, 2200, 0.02, 'square', 0.04]]), 0.3);
save('sfx-creak.wav', tones(0.4, [[0, 320, 0.22, 'triangle', 0.03], [0.15, 260, 0.2, 'triangle', 0.03]]), 0.4);
save('sfx-rustle.wav', rustle(), 0.35);
save('sfx-bump.wav', tones(0.1, [[0, 660, 0.06, 'sine', 0.05]]), 0.45);
save('sfx-shimmer.wav', tones(0.34, [[0, 1568, 0.1, 'triangle', 0.035], [0.08, 1760, 0.1, 'triangle', 0.035], [0.16, 2093, 0.14, 'triangle', 0.035]]), 0.4);

save('rain-loop.wav', rainLoop(3, 0.5), 0.5, { fadeEnds: false });
