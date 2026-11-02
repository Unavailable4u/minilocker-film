// Easing helpers. Pure functions only.
import { Easing } from "remotion";

/** The signature curve, cubic-bezier(0.65, 0, 0.35, 1). Use it for almost every move. */
export const SIGNATURE_BEZIER = [0.65, 0, 0.35, 1] as const;
export const signature: (t: number) => number = Easing.bezier(0.65, 0, 0.35, 1);

/** Alias: the in-out curve is the signature curve. */
export const easeInOut = signature;

/** Clamp to 0..1. */
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Map `value` from [inMin, inMax] to [outMin, outMax], optionally eased, clamped at both ends.
 * Works with inMin > inMax and outMin > outMax.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  easing: (t: number) => number = (t) => t,
): number {
  if (inMin === inMax) return value < inMin ? outMin : outMax;
  const t = clamp01((value - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * easing(t);
}

/** Ease-out with a small overshoot (back ease). `s` is the overshoot strength; 1.70158 gives about 10%. */
export function easeOutBack(t: number, s = 1.70158): number {
  const x = clamp01(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}

/**
 * Overshoot-and-correct: travels to 1 + amount over the first 70% of the move, then settles back to exactly 1.
 * t=0 gives 0 and t=1 gives 1. Used for the cursor.
 */
export function overshoot(t: number, amount = 0.05): number {
  const x = clamp01(t);
  const split = 0.7;
  if (x <= split) return (1 + amount) * signature(x / split);
  return 1 + amount * (1 - signature((x - split) / (1 - split)));
}

/**
 * A beat-synced impulse: 0 before `start`, jumps to 1 at `start`, then eases down to 0 over `len` frames.
 * Use it for punches and glows: scale = 1 + 0.025 * stepPulse(frame, beatFrame, 8).
 */
export function stepPulse(frame: number, start: number, len: number): number {
  if (frame < start || len <= 0) return 0;
  const t = (frame - start) / len;
  if (t >= 1) return 0;
  return 1 - signature(t);
}
