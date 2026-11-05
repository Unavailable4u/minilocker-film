#!/usr/bin/env node
// make-sfx.mjs (patch 22): synthesizes every sound effect of the film into public/audio/ and writes public/audio/manifest.json.
//
//   npm run sfx                    synthesize the WAVs, validate them, (re)write the manifest
//   npm run sfx -- --check         write nothing; exit 1 when the manifest or a file on disk is stale or missing
//
// PURE NODE, NO DEPENDENCIES. Windows, macOS and Linux behave the same. Nothing here is a sample and nothing is copyrighted: every sound is
// built from sines, a seeded noise source, filters, envelopes and one small reverb. The noise comes from mulberry32 seeded by the sound's name,
// so the same Node version always writes byte-identical files (the manifest carries a sha256 per file).
//
// FORMAT: 48 kHz, 16-bit PCM, mono WAV. LEVELS: every effect peaks at -12 dBFS and every key tick at -24 dBFS (BIBLE 9); src/config/sfx.ts scales
// them per cue with a plain volume. Silence is a RULE, not a file: f2370-2399 holds no cue at all (src/config/sfx.ts throws if one lands there).
//
// public/audio/music.mp3 and public/audio/voice.wav are OPTIONAL slots the user fills by hand. This script only records whether they exist: the
// film reads that from the manifest at build time and never looks at the disk while rendering. Run `npm run sfx` again after you add or remove one.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const FPS = 30;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "audio");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const MUSIC = path.join(OUT_DIR, "music.mp3");
const VOICE = path.join(OUT_DIR, "voice.wav");

const PEAK_DB = { default: -12, key: -24 };
/** Hard limits the film's timing needs. glass-shatter (f2340) must be over before the silence starts on f2370: 29 frames. */
const MAX_SECONDS = { "glass-shatter": 29 / FPS };
/** A sound that must not start or end on a click: its first and last sample stay under this (linear). */
const EDGE_LIMIT = 0.002;

// ---------------------------------------------------------------------------------------------- small DSP kit

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const TAU = Math.PI * 2;
const len = (seconds) => Math.max(1, Math.round(seconds * SR));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const dbToLin = (db) => Math.pow(10, db / 20);
const linToDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));
/** exponential decay with time constant `tau` seconds */
const decay = (t, tau) => Math.exp(-t / tau);
/** smooth 0..1 */
const smooth = (x) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** Chamberlin state-variable filter. `band` is scaled to unity gain at the centre. Stable for fc under about SR / 6. */
class SVF {
  constructor() {
    this.low = 0;
    this.band = 0;
  }
  run(x, fc, q) {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    const q1 = 1 / q;
    this.low += f * this.band;
    const high = x - this.low - q1 * this.band;
    this.band += f * high;
    return { low: this.low, band: this.band * q1, high };
  }
}

/** one-pole low-pass, coefficient from the cutoff */
class OnePole {
  constructor() {
    this.y = 0;
  }
  run(x, fc) {
    const a = 1 - Math.exp((-TAU * fc) / SR);
    this.y += a * (x - this.y);
    return this.y;
  }
}

/** Raised-cosine fade-in and fade-out so no sound starts or ends on a click. */
function fades(y, inSec, outSec) {
  const nIn = Math.min(y.length, len(inSec));
  const nOut = Math.min(y.length, len(outSec));
  for (let i = 0; i < nIn; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nIn);
  for (let i = 0; i < nOut; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nOut);
  return y;
}

function normalize(y, peakDb) {
  let peak = 0;
  for (let i = 0; i < y.length; i++) peak = Math.max(peak, Math.abs(y[i]));
  if (!(peak > 0)) throw new Error("make-sfx: a sound is silent");
  const g = dbToLin(peakDb) / peak;
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}

/** A small Schroeder reverb (four combs, two all-passes). Returns a buffer `extraSec` longer than the input. */
function reverb(x, extraSec, mix, feedback = 0.78) {
  const out = new Float64Array(x.length + len(extraSec));
  const scale = SR / 44100;
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round(d * scale), buf: null, i: 0 }));
  combs.forEach((c) => (c.buf = new Float64Array(c.d)));
  const aps = [225, 556].map((d) => ({ d: Math.round(d * scale), buf: null, i: 0 }));
  aps.forEach((a) => (a.buf = new Float64Array(a.d)));
  let damp = 0;
  for (let n = 0; n < out.length; n++) {
    const dry = n < x.length ? x[n] : 0;
    let wet = 0;
    for (const c of combs) {
      const v = c.buf[c.i];
      damp += 0.35 * (v - damp);
      c.buf[c.i] = dry * 0.25 + damp * feedback;
      c.i = (c.i + 1) % c.d;
      wet += v;
    }
    for (const a of aps) {
      const v = a.buf[a.i];
      const w = wet + 0.5 * v;
      a.buf[a.i] = w;
      wet = v - 0.5 * w;
      a.i = (a.i + 1) % a.d;
    }
    out[n] = dry * (1 - mix) + wet * mix * 0.5;
  }
  return out;
}

/** Sum of enveloped sinusoids with a start time, for resonant partials. Adds into `y`. */
function addPartial(y, startSec, freq, amp, tau, attackSec = 0.0004) {
  const i0 = Math.round(startSec * SR);
  const n = Math.min(y.length - i0, Math.round(tau * 7 * SR));
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const att = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
    y[i0 + k] += amp * att * Math.sin(TAU * freq * t) * Math.exp(-t / tau);
  }
}

// ---------------------------------------------------------------------------------------------- the sounds

/** One key tick: a soft, mechanical-light key. A 2-4 kHz click over a short low "thock". Three variants differ in pitch and noise. */
function keyTick(variant) {
  const rnd = mulberry32(seedOf(`key-${variant}`));
  const centre = [3200, 2700, 3700][variant - 1];
  const thock = [210, 185, 235][variant - 1];
  const y = new Float64Array(len(0.085));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const click = bp.run(rnd() * 2 - 1, centre, 2.2).band * decay(t, 0.0016);
    ph += (TAU * thock * (1 + 0.6 * decay(t, 0.01))) / SR;
    y[i] = 0.9 * click + 0.55 * Math.sin(ph) * decay(t, 0.018);
  }
  return fades(y, 0.0004, 0.012);
}

/** UI tick: a clean 1.5 kHz blip with a bright partial. */
function uiTick() {
  const y = new Float64Array(len(0.08));
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = Math.sin(TAU * 1500 * t) * decay(t, 0.012) + 0.3 * Math.sin(TAU * 3000 * t) * decay(t, 0.006);
  }
  return fades(y, 0.0005, 0.015);
}

/** Click (the Run button): noise burst, a falling blip and a tiny thump. */
function click() {
  const rnd = mulberry32(seedOf("click"));
  const y = new Float64Array(len(0.11));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const nz = bp.run(rnd() * 2 - 1, 2400, 1.5).band * decay(t, 0.003);
    ph += (TAU * (400 + 500 * decay(t, 0.012))) / SR;
    const blip = Math.sin(ph) * decay(t, 0.02);
    const thump = Math.sin(TAU * 140 * t) * decay(t, 0.03);
    y[i] = 0.9 * nz + 0.5 * blip + 0.4 * thump;
  }
  return fades(y, 0.0005, 0.02);
}

/**
 * Whoosh: band-passed noise whose centre sweeps up, then a short fall. The PEAK is at 26 frames (0.8667 s): the S2 to S3 whip runs f1474-1500
 * (patch 25), so a cue that starts on f1474 peaks on f1500. Other whooshes use the same file at a lower volume.
 */
function whoosh() {
  const rnd = mulberry32(seedOf("whoosh"));
  const peakAt = 26 / FPS;
  const y = new Float64Array(len(0.95));
  const bp = new SVF();
  const air = new SVF();
  const body = new OnePole();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const rise = Math.min(1, t / peakAt);
    const env = t < peakAt ? Math.pow(rise, 2.2) : decay(t - peakAt, 0.03);
    const fc = 250 * Math.pow(5200 / 250, Math.pow(rise, 1.1));
    const nz = rnd() * 2 - 1;
    const sweep = bp.run(nz, fc, 1.4).band;
    const hiss = air.run(nz, 3200, 0.8).high * 0.28 * env;
    const low = body.run(nz, 220) * 0.9 * Math.pow(1 - rise, 1.5);
    y[i] = (sweep * 1.1 + low) * env + hiss;
  }
  return fades(y, 0.004, 0.008);
}

/** Sub impact: a sine that drops from 100 to 38 Hz, a soft click and a long body. */
function subImpact() {
  const rnd = mulberry32(seedOf("sub-impact"));
  const y = new Float64Array(len(1.6));
  const lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * (38 + 62 * decay(t, 0.12))) / SR;
    const body = Math.sin(ph) * Math.min(1, t / 0.002) * decay(t, 0.55);
    const harm = 0.18 * Math.sin(2 * ph) * decay(t, 0.25);
    const knock = lp.run(rnd() * 2 - 1, 250) * decay(t, 0.02);
    y[i] = body + harm + 0.35 * knock;
  }
  return fades(y, 0.001, 0.15);
}

/** Shimmer: detuned high partials with a slow tremolo and sparkle grains. */
function shimmer() {
  const rnd = mulberry32(seedOf("shimmer"));
  const freqs = [1760, 2217.5, 2637, 3322.4, 3951];
  const phases = freqs.map(() => rnd() * TAU);
  const rates = freqs.map(() => 5 + rnd() * 4);
  const y = new Float64Array(len(1.8));
  const hp = new SVF();
  const gate = rnd() * TAU;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.03) * decay(t, 0.55);
    let s = 0;
    freqs.forEach((f, k) => {
      const trem = 0.65 + 0.35 * Math.sin(TAU * rates[k] * t + phases[k]);
      s += trem * (Math.sin(TAU * f * t + phases[k]) + 0.6 * Math.sin(TAU * (f + 3.1) * t)) * (1 / (1 + k * 0.35));
    });
    const grain = Math.pow(0.5 + 0.5 * Math.sin(TAU * 13 * t + gate), 4);
    const sparkle = hp.run(rnd() * 2 - 1, 6500, 0.9).high * grain * decay(t, 0.4);
    y[i] = s * env * 0.22 + sparkle * 0.35;
  }
  return fades(y, 0.002, 0.25);
}

/** Chime: a soft bell, inharmonic partials with shorter decays up the spectrum. */
function chime() {
  const y = new Float64Array(len(1.4));
  const f0 = 1046.5;
  const parts = [
    [1, 1, 0.55],
    [2.76, 0.5, 0.32],
    [5.4, 0.25, 0.18],
    [8.93, 0.12, 0.1],
  ];
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, tau] of parts) s += a * Math.sin(TAU * f0 * r * t) * decay(t, tau);
    y[i] = s * Math.min(1, t / 0.003);
  }
  return fades(y, 0.001, 0.2);
}

/** Ledger tick: the quietest tick of the set, a 2.4 kHz tap. */
function ledgerTick() {
  const rnd = mulberry32(seedOf("ledger-tick"));
  const y = new Float64Array(len(0.07));
  const hp = new SVF();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = 0.8 * Math.sin(TAU * 2400 * t) * decay(t, 0.006) + 0.3 * hp.run(rnd() * 2 - 1, 4000, 0.8).high * decay(t, 0.0015);
  }
  return fades(y, 0.0004, 0.012);
}

/** Alarm blip (a decoy was read): amber, short, two tones (988 Hz then 740 Hz), a soft odd-harmonic wave. */
function alarmBlip() {
  const y = new Float64Array(len(0.3));
  const lp = new OnePole();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const second = t >= 0.115;
    const f = second ? 740 : 988;
    const local = second ? t - 0.115 : t;
    const env = Math.min(1, local / 0.004) * (second ? decay(local, 0.07) : decay(local, 0.05));
    const w = Math.sin(TAU * f * t) + 0.33 * Math.sin(TAU * 3 * f * t) + 0.2 * Math.sin(TAU * 5 * f * t);
    y[i] = lp.run(w * env, 4200);
  }
  return fades(y, 0.001, 0.05);
}

/** Thud (the egress refusal): a heavy dry hit, a fast pitch drop and a low-passed knock. */
function thud() {
  const rnd = mulberry32(seedOf("thud"));
  const y = new Float64Array(len(0.6));
  const lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 85 * decay(t, 0.035))) / SR;
    const body = Math.sin(ph) * Math.min(1, t / 0.001) * decay(t, 0.14);
    const knock = lp.run(rnd() * 2 - 1, 500) * decay(t, 0.01);
    y[i] = body + 0.2 * Math.sin(2 * ph) * decay(t, 0.06) + 0.7 * knock;
  }
  return fades(y, 0.0008, 0.08);
}

/** Glass shatter (the wipe): a crack, 70 seeded resonant shards and a bright wash. At most 29 frames: it is over before the silence on f2370. */
function glassShatter() {
  const rnd = mulberry32(seedOf("glass-shatter"));
  const y = new Float64Array(len(0.95));
  const hp = new SVF();
  const wash = new SVF();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = hp.run(rnd() * 2 - 1, 1500, 0.8).high * decay(t, 0.012) + 0.2 * wash.run(rnd() * 2 - 1, 3000, 0.8).high * decay(t, 0.18);
  }
  for (let k = 0; k < 70; k++) {
    const start = 0.01 + Math.pow(rnd(), 1.7) * 0.55;
    const freq = 2200 + rnd() * 7000;
    const tau = 0.02 + rnd() * 0.16;
    const amp = (0.25 + 0.75 * rnd()) * decay(start, 0.25) * 0.5;
    addPartial(y, start, freq, amp, tau);
  }
  return fades(y, 0.0005, 0.08);
}

/** Rewind riser (1.5 s): a pitch-up sweep with tape flutter over rising noise. It peaks at 1.46 s, which is f2445 when it starts on f2400 (the container is complete there). */
function rewindRiser() {
  const rnd = mulberry32(seedOf("rewind-riser"));
  const peakAt = 1.46;
  const y = new Float64Array(len(1.5));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const x = Math.min(1, t / peakAt);
    const env = (t < peakAt ? Math.pow(x, 2.2) : decay(t - peakAt, 0.012)) * (1 + 0.25 * Math.sin(TAU * 14 * t));
    const f = 140 * Math.pow(1800 / 140, Math.pow(x, 1.6));
    ph += (TAU * f * (1 + 0.01 * Math.sin(TAU * 6 * t))) / SR;
    const tone = Math.sin(ph) + 0.35 * Math.sin(2 * ph);
    const air = bp.run(rnd() * 2 - 1, f * 1.8, 2).band * 0.5;
    y[i] = (tone * 0.7 + air) * env;
  }
  return fades(y, 0.01, 0.01);
}

/** Lock tick k (1..8): a short pluck on a rising major-pentatonic step (C5 D5 E5 G5 A5 C6 D6 E6), one per 2 characters of the locked hash. */
function lockTick(k) {
  const semis = [0, 2, 4, 7, 9, 12, 14, 16][k - 1];
  const f = 523.25 * Math.pow(2, semis / 12);
  const y = new Float64Array(len(0.12));
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] =
      (Math.sin(TAU * f * t) * decay(t, 0.03) + 0.25 * Math.sin(TAU * 2 * f * t) * decay(t, 0.015) + 0.2 * Math.sin(TAU * 3 * f * t) * decay(t, 0.008)) *
      Math.min(1, t / 0.0006);
  }
  return fades(y, 0.0004, 0.025);
}

/** Stamp (CONTAINED): a thump, a paper slap and a metallic pair. Heavier than a click, lighter than the thud. */
function stamp() {
  const rnd = mulberry32(seedOf("stamp"));
  const y = new Float64Array(len(0.55));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * (70 + 90 * decay(t, 0.05))) / SR;
    const thump = Math.sin(ph) * Math.min(1, t / 0.001) * decay(t, 0.09);
    const slap = bp.run(rnd() * 2 - 1, 1400, 1.2).band * decay(t, 0.012);
    const metal = (Math.sin(TAU * 640 * t) + 0.7 * Math.sin(TAU * 953 * t)) * decay(t, 0.09) * 0.22;
    y[i] = thump + 0.9 * slap + metal;
  }
  return fades(y, 0.0008, 0.08);
}

/** Verify sweep: a clean rising tone with a scanning tremolo. The peak is at 90 % of the length. */
function verifySweep(seconds, name) {
  const rnd = mulberry32(seedOf(name));
  const peakAt = 0.9 * seconds;
  const y = new Float64Array(len(seconds));
  const hp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const x = clamp01(t / peakAt);
    const f = 420 * Math.pow(2100 / 420, Math.pow(x, 1.3));
    ph += (TAU * f) / SR;
    const env = Math.min(1, t / 0.08) * (t < peakAt ? 1 : decay(t - peakAt, 0.03)) * (0.55 + 0.45 * smooth(x));
    const scan = 0.65 + 0.35 * Math.sin(TAU * 26 * t);
    const tone = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * scan;
    y[i] = (tone + 0.12 * hp.run(rnd() * 2 - 1, 5000, 0.8).high) * env;
  }
  return fades(y, 0.01, 0.01);
}

/** Success chord: a soft open fifth (D4 A4 D5, a low A3 under it), slow attack, a gentle low-pass, a touch of room. */
function successChord() {
  const dry = new Float64Array(len(2.0));
  const notes = [
    [220, 0.5],
    [293.66, 1],
    [440, 0.9],
    [587.33, 0.55],
  ];
  const lp = new OnePole();
  for (let i = 0; i < dry.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, a] of notes) {
      s += a * (Math.sin(TAU * (f - 1.2) * t) + Math.sin(TAU * (f + 1.2) * t)) * 0.5 + a * 0.12 * Math.sin(TAU * 2 * f * t);
    }
    const env = Math.min(1, t / 0.07) * decay(t, 1.0);
    dry[i] = lp.run(s * env, 3000);
  }
  return fades(reverb(dry, 0.6, 0.25), 0.003, 0.25);
}

/** Tail (S9): a low soft thump with an open fifth ringing out in a room, exactly 3.0 s so it ends on the last frame of the film when it starts on f5010. */
function tail() {
  const dry = new Float64Array(len(2.6));
  const notes = [
    [220, 1],
    [329.63, 0.8],
    [440, 0.55],
  ];
  const lp = new OnePole();
  let ph = 0;
  for (let i = 0; i < dry.length; i++) {
    const t = i / SR;
    ph += (TAU * (45 + 20 * decay(t, 0.15))) / SR;
    let s = Math.sin(ph) * Math.min(1, t / 0.002) * decay(t, 0.35) * 1.2;
    for (const [f, a] of notes) s += a * 0.35 * Math.sin(TAU * f * t) * Math.min(1, t / 0.04) * decay(t, 1.1);
    dry[i] = lp.run(s, 2200);
  }
  const wet = reverb(dry, 0.4, 0.3, 0.8);
  return fades(wet, 0.001, 0.5);
}

/** Slam (S0 terminal hits): a hard, dry hit with a click and a metallic pair. */
function slam() {
  const rnd = mulberry32(seedOf("slam"));
  const y = new Float64Array(len(0.5));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 95 * decay(t, 0.04))) / SR;
    const body = Math.sin(ph) * Math.min(1, t / 0.0008) * decay(t, 0.1);
    const crack = bp.run(rnd() * 2 - 1, 900, 0.9).band * decay(t, 0.02);
    const metal = (Math.sin(TAU * 420 * t) + 0.8 * Math.sin(TAU * 777 * t)) * decay(t, 0.05) * 0.15;
    y[i] = body + 0.9 * crack + metal;
  }
  return fades(y, 0.0006, 0.08);
}

/** Glitch (S0, f165-177): 0.4 s of seeded stutter: bit-crushed square tones, noise bursts and gaps, loudest in the middle. */
function glitch() {
  const rnd = mulberry32(seedOf("glitch"));
  const y = new Float64Array(len(0.4));
  const hp = new SVF();
  let i = 0;
  while (i < y.length) {
    const run = Math.max(40, Math.round((0.012 + rnd() * 0.04) * SR));
    const kind = rnd();
    const f = 300 + rnd() * 3700;
    const hold = 2 + Math.floor(rnd() * 8);
    let held = 0;
    for (let k = 0; k < run && i < y.length; k++, i++) {
      const t = i / SR;
      const bell = Math.sin(Math.PI * clamp01(t / 0.4));
      let v = 0;
      if (kind < 0.2) v = 0;
      else if (kind < 0.55) v = hp.run(rnd() * 2 - 1, 2500, 0.9).high * 0.8;
      else {
        if (k % hold === 0) held = Math.sin(TAU * f * t) >= 0 ? 1 : -1;
        v = Math.round(held * 0.7 * 8) / 8;
      }
      y[i] = v * bell;
    }
  }
  return fades(y, 0.002, 0.03);
}

/** Pop k (1..3): a 70 ms bubble that glides up, one per architecture node. Three pitches so a run of them does not sound like a machine. */
function pop(k) {
  const f0 = [520, 660, 780][k - 1];
  const y = new Float64Array(len(0.09));
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * f0 * (1 + 0.7 * (1 - decay(t, 0.01)))) / SR;
    y[i] = Math.sin(ph) * decay(t, 0.022) * Math.min(1, t / 0.001);
  }
  return fades(y, 0.0006, 0.02);
}

/** Low blip (S5, the denial): two falling low tones, 180 Hz then 135 Hz, softened. Not the alarm blip: lower and slower. */
function lowBlip() {
  const y = new Float64Array(len(0.38));
  const lp = new OnePole();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const second = t >= 0.15;
    const f = second ? 135 : 180;
    const local = second ? t - 0.15 : t;
    const env = Math.min(1, local / 0.004) * (second ? decay(local, 0.11) : decay(local, 0.07));
    const w = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 3 * f * t);
    y[i] = lp.run(w * env, 900);
  }
  return fades(y, 0.001, 0.06);
}

/** Hit (S5, one per ledger line): a mid thump with a small click. */
function hit() {
  const rnd = mulberry32(seedOf("hit"));
  const y = new Float64Array(len(0.3));
  const bp = new SVF();
  let ph = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    ph += (TAU * (110 + 130 * decay(t, 0.03))) / SR;
    y[i] = Math.sin(ph) * Math.min(1, t / 0.001) * decay(t, 0.07) + 0.5 * bp.run(rnd() * 2 - 1, 1600, 1.3).band * decay(t, 0.006);
  }
  return fades(y, 0.0006, 0.05);
}

/** Pad swell (S8): a warm additive pad (A2 E3 A3 C#4) that swells over 1.3 s and releases, with a low-pass that opens. */
function padSwell() {
  const y = new Float64Array(len(2.8));
  const notes = [110, 164.81, 220, 277.18];
  const lp = new OnePole();
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const swell = t < 1.3 ? Math.pow(Math.sin((Math.PI / 2) * (t / 1.3)), 2) : Math.pow(Math.cos((Math.PI / 2) * clamp01((t - 1.3) / 1.5)), 2);
    let s = 0;
    for (const f of notes) {
      for (let h = 1; h <= 8; h++) s += (Math.sin(TAU * (f - 0.8) * h * t) + Math.sin(TAU * (f + 0.8) * h * t)) * (0.5 / h);
    }
    y[i] = lp.run(s * swell, 400 + 1400 * smooth(t / 1.3));
  }
  return fades(y, 0.02, 0.05);
}

// ---------------------------------------------------------------------------------------------- the library

/** name (no extension) -> { make, peakDb }. The order is the order of the report. */
const LIBRARY = [
  ...[1, 2, 3].map((k) => ({ name: `key-${k}`, make: () => keyTick(k), peakDb: PEAK_DB.key })),
  { name: "ui-tick", make: uiTick },
  { name: "click", make: click },
  { name: "whoosh", make: whoosh },
  { name: "sub-impact", make: subImpact },
  { name: "shimmer", make: shimmer },
  { name: "chime", make: chime },
  { name: "ledger-tick", make: ledgerTick },
  { name: "alarm-blip", make: alarmBlip },
  { name: "thud", make: thud },
  { name: "glass-shatter", make: glassShatter },
  { name: "rewind-riser", make: rewindRiser },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ name: `lock-${k}`, make: () => lockTick(k) })),
  { name: "stamp", make: stamp },
  { name: "verify-sweep", make: () => verifySweep(1.0, "verify-sweep") },
  { name: "verify-sweep-long", make: () => verifySweep(1.5, "verify-sweep-long") },
  { name: "success-chord", make: successChord },
  { name: "tail", make: tail },
  { name: "slam", make: slam },
  { name: "glitch", make: glitch },
  ...[1, 2, 3].map((k) => ({ name: `pop-${k}`, make: () => pop(k) })),
  { name: "low-blip", make: lowBlip },
  { name: "hit", make: hit },
  { name: "pad-swell", make: padSwell },
];

// ---------------------------------------------------------------------------------------------- WAV

function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    data.writeInt16LE(v, i * 2);
    peak = Math.max(peak, Math.abs(v));
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVE", 8);
  head.write("fmt ", 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return { buffer: Buffer.concat([head, data]), peakLin: peak / 32768 };
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const exists = (file) => {
  try {
    return fs.statSync(file).size > 0;
  } catch {
    return false;
  }
};

function build() {
  const out = [];
  for (const sound of LIBRARY) {
    const peakDb = sound.peakDb ?? PEAK_DB.default;
    const samples = normalize(sound.make(), peakDb);
    const { buffer, peakLin } = toWav(samples);
    const seconds = samples.length / SR;
    const measuredDb = linToDb(peakLin);
    // validation: levels, edges, hard limits
    if (!(Math.abs(measuredDb - peakDb) < 0.2)) throw new Error(`make-sfx: ${sound.name} peaks at ${measuredDb.toFixed(2)} dBFS, expected ${peakDb}`);
    if (!(peakLin < 0.98)) throw new Error(`make-sfx: ${sound.name} clips`);
    if (!(Math.abs(samples[0]) < EDGE_LIMIT && Math.abs(samples[samples.length - 1]) < EDGE_LIMIT)) {
      throw new Error(`make-sfx: ${sound.name} starts or ends on a click (edge samples ${samples[0].toFixed(4)} / ${samples[samples.length - 1].toFixed(4)})`);
    }
    const limit = MAX_SECONDS[sound.name];
    if (limit !== undefined && seconds > limit + 1e-9) throw new Error(`make-sfx: ${sound.name} is ${seconds.toFixed(3)} s, over its limit of ${limit.toFixed(3)} s`);
    out.push({
      file: `${sound.name}.wav`,
      buffer,
      info: { seconds: Number(seconds.toFixed(4)), frames: Math.ceil(seconds * FPS - 1e-9), peakDbfs: Number(measuredDb.toFixed(1)), sha256: sha256(buffer) },
    });
  }
  return out;
}

function manifestOf(built) {
  const files = {};
  for (const b of built) files[b.file] = b.info;
  return {
    _how: "Written by `npm run sfx` (scripts/make-sfx.mjs). `files` lists every synthesized WAV; `music` and `voice` say whether the optional public/audio/music.mp3 and public/audio/voice.wav exist. The film reads this file at build time and never touches the disk while rendering: run `npm run sfx` again after adding or removing music.mp3 or voice.wav.",
    format: { sampleRate: SR, bitDepth: 16, channels: 1 },
    files,
    music: exists(MUSIC),
    voice: exists(VOICE),
  };
}

// ---------------------------------------------------------------------------------------------- main

function check() {
  const problems = [];
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch (e) {
    console.error(`FAIL public/audio/manifest.json cannot be read (${e.message}). Run: npm run sfx`);
    process.exit(1);
  }
  const files = manifest.files ?? {};
  for (const sound of LIBRARY) {
    const file = `${sound.name}.wav`;
    const entry = files[file];
    if (!entry) {
      problems.push(`${file}: not in the manifest`);
      continue;
    }
    const p = path.join(OUT_DIR, file);
    if (!exists(p)) {
      problems.push(`${file}: listed in the manifest but missing on disk`);
      continue;
    }
    if (sha256(fs.readFileSync(p)) !== entry.sha256) problems.push(`${file}: differs from the manifest (edited, or written by another Node version)`);
  }
  for (const file of Object.keys(files)) if (!LIBRARY.some((s) => `${s.name}.wav` === file)) problems.push(`${file}: in the manifest but not made by this script any more`);
  if (Boolean(manifest.music) !== exists(MUSIC)) problems.push(`music.mp3: the manifest says ${Boolean(manifest.music)}, the disk says ${exists(MUSIC)}`);
  if (Boolean(manifest.voice) !== exists(VOICE)) problems.push(`voice.wav: the manifest says ${Boolean(manifest.voice)}, the disk says ${exists(VOICE)}`);
  if (problems.length) {
    for (const p of problems) console.error(`FAIL ${p}`);
    console.error("Run: npm run sfx");
    process.exit(1);
  }
  console.log(`audio manifest OK: ${LIBRARY.length} effects, music.mp3 ${manifest.music ? "present" : "absent"}, voice.wav ${manifest.voice ? "present" : "absent"}`);
}

function main() {
  if (process.argv.includes("--check")) return check();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const built = build();
  for (const b of built) fs.writeFileSync(path.join(OUT_DIR, b.file), b.buffer);
  const manifest = manifestOf(built);
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad("file", 24)}${pad("seconds", 9)}${pad("frames", 8)}peak`);
  let total = 0;
  for (const b of built) {
    total += b.info.seconds;
    console.log(`${pad(b.file, 24)}${pad(b.info.seconds.toFixed(3), 9)}${pad(b.info.frames, 8)}${b.info.peakDbfs} dBFS`);
  }
  console.log(`${built.length} effects, ${total.toFixed(1)} s in total, written to public/audio/`);
  console.log(`music.mp3: ${manifest.music ? "present" : "absent (optional: a quiet 120 BPM instrumental you have the licence for)"}`);
  console.log(`voice.wav: ${manifest.voice ? "present" : "absent (optional: the narration, see voiceBlocks in src/config/copy.ts)"}`);
}

main();
