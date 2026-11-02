// Deterministic terminal streaming. Pure: no frame reads, no clock, no Math.random.
//
// A stream reveals an array of lines between `startFrame` and `endFrame` in irregular bursts: stalls, steady
// trickles and short floods, all from the seeded PRNG. Progress is counted in CHARACTERS (a newline between two
// lines counts as one), so the line being written is visible partially while it arrives (partial-line support).
// Progress is monotonic: the visible text only ever grows, and at `endFrame` everything is visible.
//
// Conventions
// - No trailing newline after the last line: once everything has arrived the caret sits at the end of the last line.
// - A row is "reached" as soon as the newline before it has been consumed, so it may be visible while still empty.
// - `lines` are any objects with a `text` (TerminalView's { text, tone } fits). Extra fields are copied through.
// - Characters are Unicode code points.

import { mixSeed, rand } from "./prng";
import { spr } from "./spring";

export interface StreamResult<T extends { text: string }> {
  /** The lines that have been reached, the last one possibly cut short. Same order as the input. */
  visibleLines: T[];
  /** Index of the line the caret is on (the last visible line; 0 for an empty input). */
  caretLine: number;
  /** Caret column in CODE POINTS of that line's text (it is the visible length of that line). */
  caretCol: number;
}

/** The streaming progress curve: cum[j] = fraction (0..1) of the stream revealed after j frames. */
function progressCurve(durationFrames: number, seed: number): Float64Array {
  const w = new Float64Array(durationFrames);
  let total = 0;
  for (let k = 0; k < durationFrames; k++) {
    const block = rand(mixSeed(seed ^ 0x5bd1e995, Math.floor(k / 5))); // one mood per 5 frames
    const r = rand(mixSeed(seed, k));
    let v: number;
    if (block < 0.22) v = 0.04 * r; // stall
    else if (block > 0.8) v = 2.2 + 3.5 * r; // burst
    else v = 0.25 + 1.1 * r; // trickle
    v += 0.0005; // never exactly zero in total
    w[k] = v;
    total += v;
  }
  const cum = new Float64Array(durationFrames + 1);
  let acc = 0;
  for (let k = 0; k < durationFrames; k++) {
    acc += w[k];
    cum[k + 1] = k === durationFrames - 1 ? 1 : acc / total;
  }
  return cum;
}

const curveCache = new Map<string, Float64Array>();
function curve(durationFrames: number, seed: number): Float64Array {
  const key = `${durationFrames}|${seed}`;
  let c = curveCache.get(key);
  if (!c) {
    if (curveCache.size >= 64) curveCache.clear();
    c = progressCurve(durationFrames, seed);
    curveCache.set(key, c);
  }
  return c;
}

function check(who: string, startFrame: number, endFrame: number): void {
  if (!(endFrame > startFrame)) {
    throw new Error(`${who}: endFrame (${endFrame}) must be greater than startFrame (${startFrame})`);
  }
}

/** Revealed units (characters + newlines) at `frame`. Integer, monotonic, exactly `total` at endFrame. */
function revealedUnits(total: number, frame: number, startFrame: number, endFrame: number, seed: number): number {
  const d = endFrame - startFrame;
  const j = Math.min(d, Math.max(0, Math.floor(frame - startFrame)));
  if (j >= d) return total;
  return Math.min(total, Math.floor(total * curve(d, seed)[j]));
}

export function streamLines<T extends { text: string }>(
  lines: readonly T[],
  frame: number,
  startFrame: number,
  endFrame: number,
  seed: number,
): StreamResult<T> {
  check("streamLines", startFrame, endFrame);
  if (lines.length === 0) return { visibleLines: [], caretLine: 0, caretCol: 0 };
  const lens = lines.map((l) => Array.from(l.text).length);
  const total = lens.reduce((a, n) => a + n, 0) + (lines.length - 1);
  let remaining = revealedUnits(total, frame, startFrame, endFrame, seed);

  const visible: T[] = [];
  for (let i = 0; i < lines.length; i++) {
    const len = lens[i];
    const last = i === lines.length - 1;
    if (remaining >= len + (last ? 0 : 1)) {
      visible.push(lines[i]);
      remaining -= len + (last ? 0 : 1);
      if (last) return { visibleLines: visible, caretLine: i, caretCol: len };
      continue;
    }
    // the line being written: cut short, or complete with the newline still pending
    const cut = Math.min(remaining, len);
    visible.push(cut >= len ? lines[i] : { ...lines[i], text: Array.from(lines[i].text).slice(0, cut).join("") });
    return { visibleLines: visible, caretLine: i, caretCol: cut };
  }
  // unreachable: the last line always returns above
  return { visibleLines: visible, caretLine: lines.length - 1, caretCol: lens[lines.length - 1] };
}

/**
 * The first frame on which each line is visible (the frame its row appears, even if still empty).
 * Line 0 is `startFrame`. Use it for per-line sound ticks and for `tailScrollOffset`.
 */
export function streamArrivals<T extends { text: string }>(
  lines: readonly T[],
  startFrame: number,
  endFrame: number,
  seed: number,
): number[] {
  check("streamArrivals", startFrame, endFrame);
  const out: number[] = [];
  let startUnit = 0;
  let f = startFrame;
  const total = lines.reduce((a, l) => a + Array.from(l.text).length, 0) + Math.max(0, lines.length - 1);
  for (let i = 0; i < lines.length; i++) {
    while (f < endFrame && revealedUnits(total, f, startFrame, endFrame, seed) < startUnit) f++;
    out.push(f);
    startUnit += Array.from(lines[i].text).length + 1;
  }
  return out;
}

/**
 * Spring-eased "tail" scroll for TerminalView. Pass the arrival frame of EVERY row (rows in order) and the
 * current frame: the result is <= 0, in rows, and is the lag of the content behind its resting position. Each new row
 * pushes the content up by one row at once; this lets it settle there on the "panel" spring instead.
 */
export function tailScrollOffset(frame: number, fps: number, arrivalFrames: readonly number[]): number {
  let lag = 0;
  for (const a of arrivalFrames) {
    if (frame < a || frame - a > 60) continue; // not here yet, or long settled
    lag += 1 - spr(frame, fps, a, "panel");
  }
  return -lag;
}
