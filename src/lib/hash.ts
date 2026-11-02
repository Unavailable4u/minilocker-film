// Hash-lock text: a hex string whose characters resolve from left to right out of scrambled hex digits.
// Pure: the scramble comes from the seeded PRNG and is a function of the frame (no clock, no Math.random).

import { mixSeed, randInt } from "./prng";

const HEX_LOWER = "0123456789abcdef";
const HEX_UPPER = "0123456789ABCDEF";
const IS_HEX = /^[0-9a-fA-F]$/;
/** The scrambled digits change every 2 frames. */
export const HASH_SCRAMBLE_FRAMES = 2;

/**
 * How many characters of the hash are locked at `frame`: 0 at or before `startFrame`, all of them from
 * `startFrame + lockFrames` on, linear in between. `finalHex` can be the string or just its length.
 * Use it for sound cues (one tick per newly locked character) and for counters.
 */
export function lockedCount(finalHex: string | number, frame: number, startFrame: number, lockFrames: number): number {
  const n = typeof finalHex === "number" ? finalHex : finalHex.length;
  const p = lockFrames > 0 ? (frame - startFrame) / lockFrames : frame >= startFrame ? 1 : 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;
  return Math.floor(p * n);
}

/**
 * A string of the same length as `finalHex`. The first `lockedCount(...)` characters are the final ones;
 * every other hex digit is a seeded random digit that changes every 2 frames (the two halves of the string
 * change on alternate frames, so it flickers instead of pulsing). A character that is not a hex digit
 * (a separator) is always shown as it is. Upper-case input gets upper-case scramble digits.
 */
export function lockHex(finalHex: string, frame: number, startFrame: number, lockFrames: number, seed = 0): string {
  const n = finalHex.length;
  const locked = lockedCount(n, frame, startFrame, lockFrames);
  if (locked >= n) return finalHex;
  const digits = /[A-F]/.test(finalHex) && !/[a-f]/.test(finalHex) ? HEX_UPPER : HEX_LOWER;
  let out = finalHex.slice(0, locked);
  for (let i = locked; i < n; i++) {
    const ch = finalHex[i];
    if (!IS_HEX.test(ch)) {
      out += ch;
      continue;
    }
    const tick = Math.floor((frame + (i & 1)) / HASH_SCRAMBLE_FRAMES);
    out += digits[randInt(mixSeed(mixSeed(seed, tick), i), 0, 15)];
  }
  return out;
}

/** The first `n` characters (default 8) of a hash, as the product shows them. */
export function shortHash(h: string, n = 8): string {
  return h.slice(0, Math.max(0, n));
}
