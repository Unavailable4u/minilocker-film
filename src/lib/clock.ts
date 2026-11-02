// LedgerClock: maps the real timestamps of ledger events (seconds, as the server wrote them) to film frames.
//
// A real task is bursty: ten events in one second, then eight seconds of the model thinking. A film cannot play that at
// real speed. A clock is built from SEGMENTS (BIBLE 6, the S2 windows): each says "this stretch of real time plays
// between these two frames", and may ask for HOLDS: moments where real time stands still for a few frames so the viewer
// can read a key event (tests fail, tests pass, hidden check, sandbox destroyed).
//
// Everything here is pure: the same inputs give the same frames, with no randomness, no Date and no frame counter.
//
//   const clock = makeClock(events, [
//     { fromTs: t0, toTs: t1, startFrame: 660, endFrame: 1000,
//       holdAt: [{ ts: failTs, frames: 24 }, { ts: passTs, frames: 30 }] },
//   ]);
//   clock.frameOfTs(failTs);        // 612.4  (the first frame of the 24-frame hold, continuous value)
//   clock.tsOfFrame(frame);         // the ledger time the viewer is looking at on that frame
//   clock.eventFrames();            // one integer frame per event, at least 6 frames apart
//
// Rules of the mapping
//   - Inside a segment, real time maps to frames linearly, at the rate that fits what is left of the segment's frames
//     after the holds are taken out: rate = (endFrame - startFrame - sum of holds) / (toTs - fromTs).
//   - frameOfTs(hold.ts) is the FIRST frame of the hold. Frames inside the hold all map back to hold.ts, so the event
//     appears, then stays on screen while time stands still. A timestamp just after the hold lands after the hold ends.
//   - Outside the segments: before the first segment, frameOfTs is the first startFrame; after the last, the last
//     endFrame. In the gap between two segments it is the endFrame of the earlier one (time the film skips piles up at
//     the end of the segment before it). tsOfFrame does the mirror image: it holds the earlier segment's toTs across a
//     frame gap, and clamps to the first fromTs / the last toTs outside everything.
//   - Both functions never go backwards: a later input never gives an earlier output.

import type { LedgerEvent } from "../data/types";

/** Events closer than this many frames are pushed apart by eventFrames(), so a burst stays readable. */
export const MIN_EVENT_SPACING = 6;

export interface ClockHold {
  /** Real timestamp of the key event the viewer must be able to read. */
  ts: number;
  /** How many frames real time stands still there (> 0). */
  frames: number;
}

export interface ClockSegment {
  /** Real time (seconds, same unit as LedgerEvent.ts) where this segment starts. */
  fromTs: number;
  /** Real time where it ends (> fromTs). */
  toTs: number;
  /** Global film frame where the segment starts. */
  startFrame: number;
  /** Global film frame where the segment ends (> startFrame). Holds are included in this span. */
  endFrame: number;
  /** Optional holds, anywhere inside [fromTs, toTs]; order does not matter. */
  holdAt?: ClockHold[];
}

export interface LedgerClock {
  /** The segments the clock was built from (validated, in film order). */
  readonly segments: readonly ClockSegment[];
  /** Real timestamp -> film frame. Continuous (a fraction of a frame is possible); round it where an integer is needed. */
  frameOfTs(ts: number): number;
  /** Film frame -> the real timestamp being shown on that frame. Inverse of frameOfTs, flat across holds. */
  tsOfFrame(frame: number): number;
  /**
   * One integer frame per event, in the order given, each at least MIN_EVENT_SPACING after the one before.
   * Defaults to the events the clock was built with. A very dense burst can be pushed past the end of its segment
   * (each event is placed after the previous one, never before its own time): the caller decides what to do then.
   */
  eventFrames(events?: readonly LedgerEvent[]): number[];
}

interface Prepared extends ClockSegment {
  holds: ClockHold[];
  /** frames per real second once the holds are taken out */
  rate: number;
}

function fail(message: string): never {
  throw new Error(`LedgerClock: ${message}`);
}

function prepare(seg: ClockSegment, index: number): Prepared {
  const where = `segment ${index}`;
  const nums = [seg.fromTs, seg.toTs, seg.startFrame, seg.endFrame];
  if (!nums.every((n) => Number.isFinite(n))) fail(`${where} has a non-finite fromTs, toTs, startFrame or endFrame`);
  if (!(seg.toTs > seg.fromTs)) fail(`${where}: toTs (${seg.toTs}) must be greater than fromTs (${seg.fromTs})`);
  if (!(seg.endFrame > seg.startFrame)) fail(`${where}: endFrame (${seg.endFrame}) must be greater than startFrame (${seg.startFrame})`);
  const holds = [...(seg.holdAt ?? [])].sort((a, b) => a.ts - b.ts);
  let held = 0;
  for (const h of holds) {
    if (!Number.isFinite(h.ts) || !Number.isFinite(h.frames)) fail(`${where}: a hold has a non-finite ts or frames`);
    if (h.ts < seg.fromTs || h.ts > seg.toTs) fail(`${where}: hold at ts ${h.ts} is outside [${seg.fromTs}, ${seg.toTs}]`);
    if (!(h.frames > 0)) fail(`${where}: hold at ts ${h.ts} needs frames > 0`);
    held += h.frames;
  }
  const live = seg.endFrame - seg.startFrame - held;
  if (!(live > 0)) fail(`${where}: its holds (${held} frames) leave no frames for real time to advance (${seg.endFrame - seg.startFrame} available)`);
  return { ...seg, holds, rate: live / (seg.toTs - seg.fromTs) };
}

function frameInSegment(s: Prepared, ts: number): number {
  let frame = s.startFrame;
  let t = s.fromTs;
  for (const h of s.holds) {
    if (ts <= h.ts) return frame + (ts - t) * s.rate;
    frame += (h.ts - t) * s.rate + h.frames;
    t = h.ts;
  }
  return frame + (ts - t) * s.rate;
}

function tsInSegment(s: Prepared, frame: number): number {
  let cf = s.startFrame;
  let t = s.fromTs;
  for (const h of s.holds) {
    const holdStart = cf + (h.ts - t) * s.rate;
    if (frame <= holdStart) return t + (frame - cf) / s.rate;
    const holdEnd = holdStart + h.frames;
    if (frame < holdEnd) return h.ts;
    cf = holdEnd;
    t = h.ts;
  }
  return t + (frame - cf) / s.rate;
}

/** Builds a clock. Throws a clear error for segments that are empty, out of order, overlapping, or over-held. */
export function makeClock(events: readonly LedgerEvent[], segments: readonly ClockSegment[]): LedgerClock {
  if (segments.length === 0) fail("at least one segment is required");
  const segs = segments.map(prepare);
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1];
    const b = segs[i];
    if (b.fromTs < a.toTs) fail(`segment ${i} starts in real time (${b.fromTs}) before segment ${i - 1} ends (${a.toTs})`);
    if (b.startFrame < a.endFrame) fail(`segment ${i} starts at frame ${b.startFrame}, before segment ${i - 1} ends at frame ${a.endFrame}`);
  }
  const first = segs[0];
  const last = segs[segs.length - 1];

  const frameOfTs = (ts: number): number => {
    if (ts <= first.fromTs) return first.startFrame;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (ts <= s.toTs) return ts >= s.fromTs ? frameInSegment(s, ts) : segs[i - 1].endFrame;
    }
    return last.endFrame;
  };

  const tsOfFrame = (frame: number): number => {
    if (frame <= first.startFrame) return first.fromTs;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (frame <= s.endFrame) return frame >= s.startFrame ? tsInSegment(s, frame) : segs[i - 1].toTs;
    }
    return last.toTs;
  };

  const frames = (list: readonly LedgerEvent[]): number[] => {
    const out: number[] = [];
    let prev = -Infinity;
    for (const e of list) {
      const frame = Math.max(Math.round(frameOfTs(e.ts)), prev + MIN_EVENT_SPACING);
      out.push(frame);
      prev = frame;
    }
    return out;
  };

  return {
    segments: segs.map(({ holds: _holds, rate: _rate, ...seg }) => seg),
    frameOfTs,
    tsOfFrame,
    eventFrames: (list) => frames(list ?? events),
  };
}