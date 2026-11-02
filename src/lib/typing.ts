// Deterministic typing. Pure: no frame reads, no clock, no Math.random.
//
// A typing schedule is built once per (text, options) from the seeded PRNG: every character gets a delay of
// about 1/cps seconds (default 38 chars/s) with +-40% jitter, plus a micro-pause after a space and a longer
// one after punctuation. The schedule is cumulative and monotonic, so the visible text only ever grows.
// Several characters can appear on the same frame (38 chars/s is faster than 30 fps); that is intended.
//
// Rules for callers
// - `startFrame` is the GLOBAL frame on which the first character appears. Use an integer.
// - Character = Unicode code point (never a half of a surrogate pair).
// - The same text with the same options always types the same way. The default seed is derived from the text,
//   so two different lines do not share a rhythm; pass `opts.seed` to vary the rhythm of one line.

import { FPS } from "../config/timeline";
import { hashStringToSeed, mixSeed, rand } from "./prng";

export interface TypingOpts {
  /** Mean typing speed in characters per second. Default 38. */
  cps?: number;
  /** Relative jitter of each character delay, 0..1. Default 0.4 (+-40%). */
  jitter?: number;
  /** Extra seed. Default: derived from the text itself. */
  seed?: number;
  /** Mean extra pause in FRAMES after punctuation , . ; : ! ? ) ] } - Default 2.6. */
  pausePunct?: number;
  /** Mean extra pause in FRAMES after a space. Default 0.7. */
  pauseSpace?: number;
  /** Frames per second used to turn cps into frames. Default FPS (30). */
  fps?: number;
}

interface Schedule {
  chars: string[];
  /** times[i] = frames after startFrame at which chars[i] appears. times[0] = 0. Non-decreasing. */
  times: Float64Array;
}

const PUNCT = new Set([",", ".", ";", ":", "!", "?", ")", "]", "}", "-"]);
const CACHE_LIMIT = 128;
const cache = new Map<string, Schedule>();

function schedule(text: string, opts: TypingOpts | undefined): Schedule {
  const cps = opts?.cps ?? 38;
  const jitter = opts?.jitter ?? 0.4;
  const pausePunct = opts?.pausePunct ?? 2.6;
  const pauseSpace = opts?.pauseSpace ?? 0.7;
  const fps = opts?.fps ?? FPS;
  const seed = mixSeed(opts?.seed ?? 0, hashStringToSeed(text));
  if (!(cps > 0)) throw new Error(`typing: cps must be positive (got ${cps})`);
  const key = `${seed}|${cps}|${jitter}|${pausePunct}|${pauseSpace}|${fps}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const chars = Array.from(text);
  const times = new Float64Array(chars.length);
  const base = fps / cps;
  let t = 0;
  for (let i = 0; i < chars.length; i++) {
    times[i] = t;
    const r = rand(mixSeed(seed, i));
    let delay = base * (1 + jitter * (2 * r - 1));
    const ch = chars[i];
    if (ch === " ") delay += pauseSpace * (0.5 + rand(mixSeed(seed ^ 0x2545f491, i)));
    else if (PUNCT.has(ch)) delay += pausePunct * (0.6 + 0.8 * rand(mixSeed(seed ^ 0x2545f491, i)));
    t += delay;
  }
  const out: Schedule = { chars, times };
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, out);
  return out;
}

/** How many characters of `fullText` are visible at `frame`. */
export function typedCount(fullText: string, frame: number, startFrame: number, opts?: TypingOpts): number {
  const { times } = schedule(fullText, opts);
  const t = frame - startFrame;
  // binary search: number of entries with times[i] <= t
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The visible prefix of `fullText` at `frame`. Empty before `startFrame`; the first character lands ON `startFrame`. */
export function typedText(fullText: string, frame: number, startFrame: number, opts?: TypingOpts): string {
  const n = typedCount(fullText, frame, startFrame, opts);
  if (n <= 0) return "";
  const { chars } = schedule(fullText, opts);
  return n >= chars.length ? fullText : chars.slice(0, n).join("");
}

/** The first frame on which the whole text is visible. Empty text: `startFrame`. */
export function typingEndFrame(fullText: string, startFrame: number, opts?: TypingOpts): number {
  const { times } = schedule(fullText, opts);
  if (times.length === 0) return startFrame;
  return Math.ceil(startFrame + times[times.length - 1]);
}

/** Caret blink: 16 frames on, 16 frames off, starting ON at frame 0 (and on every multiple of 32). */
export function caretVisible(frame: number): boolean {
  const phase = Math.floor(frame / 16);
  return ((phase % 2) + 2) % 2 === 0;
}

/**
 * Caret for a line that is being typed: solid while characters are still arriving (a caret never blinks off
 * in the middle of typing), then it blinks, starting ON on the frame the text is complete.
 */
export function typingCaret(fullText: string, frame: number, startFrame: number, opts?: TypingOpts): boolean {
  const end = typingEndFrame(fullText, startFrame, opts);
  if (frame < end) return true;
  return caretVisible(frame - end);
}
