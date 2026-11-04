// S3 shared layout, timing and the app scrim (patch 14a). The three parts of S3 (S3a, S3b, S3c) import this file and never each other's
// internals, so a retime or a move of the box is made in ONE place.
//
// SPACE. Everything S3 draws is STAGE space (1920 x 1080), over the camera layer and under the grain: the ContainerBox, the EgressWall, the
// captions and the callouts. The app behind it (FilmApp) is dimmed 55 % and blurred 6 px by `S3Scrim` while the explainer owns the stage.
//
// The stage in S3 (14a draws the box; 14b / 14c add the module label, the packet, the wall, the stamp):
//   box            x 160-1260, y 190-790 (BOX_W x BOX_H, ContainerBox). Its six chips stand 30 px off the edge: the top ones reach y 118, the
//                  bottom ones y 862, the right one x 1290-~1480. The caption's ink starts at y ~905: it never meets a chip.
//   rack           3 x 2 DecoyRack in the box, box-local (52, 32), 996 x 404 plus a 70 px room for ledger lines (to box-local y 506).
//   module band    box-local y 520-580: 14b's hostile module plate (box-local y 534-578, one line: "shop/_telemetry.py" + its description).
//   egress         wall at stage x 1500. 14b: packets leave the module plate's right end (`s3ModulePlate(...).stageRight`), along `packetY`
//                  (the plate's middle, stage y 746), through the box's right edge (x 1260) to the wall.
//   14c            the audit line sweeps the box (box-local x 0-1100), the stamp sits on the box's centre (the rack and the plate step back behind it),
//                  then the whole box (chips, ring, stamp) is pulled back in STAGE space to `S3_PULLBACK`: x 112-596, y 408-672 (+ chips), in the
//                  strip of the stage LEFT of the live Blast panel (stage x 715-1205 when the camera frames `blastPanel`), where the ring closes on it.
import React from "react";
import { alpha, theme } from "../../config/theme";
import { BEAT } from "../../config/timeline";
import { clamp01, signature } from "../../lib/ease";
import { MIN_EVENT_SPACING, makeClock } from "../../lib/clock";
import { MONO_ADVANCE, estimateWidth } from "../../fx/util";
import { BOX_H, BOX_W } from "../../gfx/ContainerBox";
import { COL_GAP, decoyRackSize, ROW_GAP, TILE_H, TILE_W } from "../../gfx/DecoyRack";
import { packetWallFrame } from "../../gfx/EgressWall";

// ---------------------------------------------------------------------------------------------- layout

export const S3_BOX = { x: 160, y: 190 } as const;

/** The rack inside the box (box-local px): centred left to right, 32 px under the top edge. */
export function s3Rack(count: number): { x: number; y: number; w: number; h: number; lineRoom: number } {
  const size = decoyRackSize(count);
  return { x: Math.round((BOX_W - size.w) / 2), y: 32, w: size.w, h: size.h, lineRoom: size.lineRoom };
}

/** The box-local band under the rack that 14b uses for the hostile module's name. */
export const S3_MODULE_BAND = { y: 520, h: 60 } as const;

/**
 * 14b: the hostile module's plate, in the module band (box-local y 534-578). One line: the module's name (mono 22) and, from the task ledger, its own
 * description (mono 20, dim) after a hairline. Its left edge is the rack's.
 */
export const S3_PLATE = { y: 534, h: 44, padX: 16, gap: 14, nameSize: 22, blurbSize: 20 } as const;

export interface S3ModulePlate {
  /** Box-local px (children of the ContainerBox). */
  x: number;
  y: number;
  w: number;
  h: number;
  nameW: number;
  /** 0 when there is no description. */
  blurbW: number;
  /** Stage px: the plate's right edge, where the packet leaves, and its middle height. */
  stageRight: number;
  stageMidY: number;
}

/** Geometry of the module plate for `count` decoys (the rack's left edge) and the module's name / description. Text widths are estimates (mono advance 0.525). */
export function s3ModulePlate(count: number, name: string, blurb: string | null): S3ModulePlate {
  const p = S3_PLATE;
  const nameW = Math.round(estimateWidth(name, p.nameSize, MONO_ADVANCE));
  const blurbW = blurb ? Math.round(estimateWidth(blurb, p.blurbSize, MONO_ADVANCE)) : 0;
  const w = p.padX * 2 + nameW + (blurb ? p.gap * 2 + 1 + blurbW : 0) + 3; // + the 1.5 px border either side
  const x = s3Rack(count).x;
  return { x, y: p.y, w, h: p.h, nameW, blurbW, stageRight: S3_BOX.x + x + w, stageMidY: S3_BOX.y + p.y + p.h / 2 };
}

/**
 * Stage px of the box's right edge, and the y packets fly along: the middle of the module plate (14a had the box's vertical middle, y 490; with the
 * sample's host the refusal tag then stands on the allowlist plaque, y 356-434 against 212-410, so the packet flies lower, under the ledger lines).
 */
export const S3_EGRESS = { fromX: S3_BOX.x + BOX_W, packetY: S3_BOX.y + S3_PLATE.y + S3_PLATE.h / 2 } as const;

/** Stage position of a decoy tile (index in the rack, row-major) and its size. */
export function s3TileRect(index: number, count: number): { x: number; y: number; w: number; h: number } {
  const rack = s3Rack(count);
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: S3_BOX.x + rack.x + col * (TILE_W + COL_GAP),
    y: S3_BOX.y + rack.y + row * (TILE_H + ROW_GAP),
    w: TILE_W,
    h: TILE_H,
  };
}

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

export const S3_TIMING = {
  /** 14a: "Containment, measured." (CUES.s3.caption) over the Secrets card; it is gone before the explainer takes over. */
  caption: { start: 1500, end: 1548 },
  /** The app is dimmed and blurred under the explainer: in over f1546-1562 (full at the f1560 hand-over), out over f2004-2018 (14c: back to the app, f2010). */
  scrim: { inFrom: 1546, inTo: 1562, outFrom: 2004, outTo: 2018 },
  /** The box outline draws on from f1560 for 36 frames. */
  box: { drawFrom: 1560, drawFrames: 36 },
  /** The six chips land on beats (BIBLE 6): non-root, read-only root, no capabilities, 128 processes, 512 MB, no route out. Each takes 22 frames. */
  chips: { beats: [1575, 1590, 1605, 1620, 1635, 1650] as readonly number[], frames: 22 },
  /** The decoy tiles appear one every 4 frames from f1584 (the box interior is by then 2/3 drawn); each rises over 14 frames. */
  decoys: { from: 1584, stagger: 4, riseFrames: 14 },
  /** "Random per task" (CUES.s3.calloutRandom): up while the tiles are fresh, gone before 14b's first beat. */
  calloutRandom: { start: 1620, end: 1679 },
  /** The last frame 14a draws on. 14b's first camera keyframe and first overlay item start at f1680 or later. */
  partEnd: 1679,
  /** 14b: the module plate is drawn on (a mask from the left) over 16 frames from f1682. */
  module: { from: 1682, frames: 16 },
  /**
   * 14b: the reads. The `canary.read` events of the ledger are mapped onto f1692-1752 by a LedgerClock (their real spacing, at least 6 frames apart,
   * see `s3ReadFrames`); each tile then lights amber over 30 frames and its ledger line rises 6 frames after the read, over 14 frames.
   */
  reads: { from: 1692, to: 1752, stateFrames: 30, lineDelay: 6, lineFrames: 14 },
  /** 14b: the packet's wall hit is on the beat f1830; it leaves the module plate the frames before that its flight takes (see `s3PacketStart`). */
  send: { hit: 1830 },
  /** 14b's last frame. 14c's first camera keyframe and first overlay item start at f1930 or later. */
  partEndB: 1929,
  /** 14c: the teardown audit's line crosses the box in 30 frames from the beat f1935 (the ruler along the bottom edge stays). */
  audit: { from: 1935, frames: 30 },
  /**
   * 14c: the stamp lands on the beat f1965, the frame the line leaves the box, and takes 18 frames to settle (ContainerBox's own stamp motion).
   * The rack and the module plate step back (to 28 % of their ink) over f1958-1976, so the stamp does not lie over live tile labels.
   */
  stamp: { at: 1965, frames: 18, dimFrom: 1958, dimFrames: 18, dim: 0.72 },
  /** 14c: the pull-back: the box shrinks to `S3_PULLBACK` over f2004-2032 (the app is handed back at the same time: scrim out f2004-2018). */
  pullback: { from: 2004, frames: 28 },
  /** 14c: the seal ring closes round the pulled-back box, f2040-2066 (ContainerBox draws it from the top centre to the bottom centre). */
  seal: { from: 2040, frames: 26 },
  /** 14c: the sealed box leaves (fade and a short drift left) over f2078-2094, before the camera has landed on the nav. */
  exit: { from: 2078, frames: 16 },
} as const;

/**
 * 14c: where the box rests while the camera shows the live gauges. `scale` of the whole box group (chips, ring and stamp included); `to` is the
 * stage position of the box's top-left corner at rest. With the camera on `blastPanel` (padding 96, zoom 1.067) the panel covers stage x 715-1205:
 * the box and its right chip stay left of x ~691. `exitDrift` px to the left while it leaves.
 */
export const S3_PULLBACK = { scale: 0.44, to: { x: 112, y: 408 }, exitDrift: 48 } as const;

/** 14c: pose of the box group on a frame, applied as `translate(tx, ty) scale(scale)` from the stage's top-left corner, and its opacity. */
export function s3BoxPose(frame: number): { tx: number; ty: number; scale: number; opacity: number } {
  const t = S3_TIMING;
  const e = signature(clamp01((frame - t.pullback.from) / t.pullback.frames));
  const x = signature(clamp01((frame - t.exit.from) / t.exit.frames));
  const scale = 1 + (S3_PULLBACK.scale - 1) * e;
  return {
    tx: (S3_PULLBACK.to.x - S3_PULLBACK.scale * S3_BOX.x) * e - S3_PULLBACK.exitDrift * x,
    ty: (S3_PULLBACK.to.y - S3_PULLBACK.scale * S3_BOX.y) * e,
    scale,
    opacity: 1 - x,
  };
}

/** 14c: 0..1 sweep of the audit line (ContainerBox applies no easing to it: the line moves at a constant speed). */
export function s3AuditProgress(frame: number): number {
  return clamp01((frame - S3_TIMING.audit.from) / S3_TIMING.audit.frames);
}

/** 14c: 0..1 progress of the stamp (ContainerBox shapes it). */
export function s3StampProgress(frame: number): number {
  return clamp01((frame - S3_TIMING.stamp.at) / S3_TIMING.stamp.frames);
}

/** 14c: 0..1 progress of the seal ring (ContainerBox shapes it). */
export function s3SealProgress(frame: number): number {
  return clamp01((frame - S3_TIMING.seal.from) / S3_TIMING.seal.frames);
}

/** 14c: opacity of the rack and the module plate: 1 until the stamp is near, then 1 - dim. */
export function s3ContentOpacity(frame: number): number {
  const s = S3_TIMING.stamp;
  return 1 - s.dim * signature(clamp01((frame - s.dimFrom) / s.dimFrames));
}

/** 0..1 progress of each of the six chips on `frame`. */
export function s3ChipProgress(frame: number): number[] {
  return S3_TIMING.chips.beats.map((b) => clamp01((frame - b) / S3_TIMING.chips.frames));
}

/** 0..1 draw-on of the box outline and interior. */
export function s3BoxDraw(frame: number): number {
  return clamp01((frame - S3_TIMING.box.drawFrom) / S3_TIMING.box.drawFrames);
}

/** 0..1 rise of decoy tile `i`. */
export function s3DecoyReveal(frame: number, i: number): number {
  const d = S3_TIMING.decoys;
  return signature(clamp01((frame - (d.from + i * d.stagger)) / d.riseFrames));
}

/**
 * 14b: the frame on which each read lands, one integer per entry of `reads` (ledger order), from the events' own timestamps.
 * A LedgerClock with ONE segment maps the real time from the first read to the last onto S3_TIMING.reads (f1692-1752): two reads 0.03 s apart in the
 * ledger are the film's two ends of that window, a burst is spread evenly, and the reads keep their order. A read is never less than MIN_EVENT_SPACING
 * (6) frames after the one before it, so a dense burst stays readable (at most 6 decoys: the last lands by f1782, before the packet's hit).
 * One read, or reads with one timestamp, play from the window's start (the segment is given 1 s so the clock accepts it).
 */
export function s3ReadFrames(reads: readonly { ts: number }[]): number[] {
  if (reads.length === 0) return [];
  const { from, to } = S3_TIMING.reads;
  const t0 = reads[0].ts;
  const last = reads[reads.length - 1].ts;
  const clock = makeClock([], [{ fromTs: t0, toTs: last > t0 ? last : t0 + 1, startFrame: from, endFrame: to }]);
  const out: number[] = [];
  let prev = -Infinity;
  for (const r of reads) {
    const frame = Math.max(Math.round(clock.frameOfTs(r.ts)), prev + MIN_EVENT_SPACING);
    out.push(frame);
    prev = frame;
  }
  return out;
}

/** 14b: the frame the packet leaves the module plate (`fromX`, stage px) so that it touches the wall on S3_TIMING.send.hit (a beat), at 18 px per frame. */
export function s3PacketStart(fromX: number): number {
  return Math.round(S3_TIMING.send.hit - packetWallFrame(0, fromX));
}

/** 0..1: how much the app is stepped back under the explainer. */
export function s3ScrimAmount(frame: number): number {
  const s = S3_TIMING.scrim;
  const up = clamp01((frame - s.inFrom) / (s.inTo - s.inFrom));
  const down = 1 - clamp01((frame - s.outFrom) / (s.outTo - s.outFrom));
  return signature(Math.min(up, down));
}

// ---------------------------------------------------------------------------------------------- the scrim

/** How dark and how blurred the app is at full scrim (BIBLE 6, S3: "dimmed 55 % and blurred 6 px"). */
export const S3_SCRIM = { dim: 0.55, blurPx: 6 } as const;

/**
 * The app dimmed 55 % and blurred 6 px, drawn as a stage-sized layer between the camera layer and the explainer. It is a backdrop filter, so it
 * needs no change to MiniLockerFilm or FilmApp: whatever is under it (the window, the cursor) steps back. Assembled once, by S3Decoys.tsx.
 */
export const S3Scrim: React.FC<{ frame: number }> = ({ frame }) => {
  const a = s3ScrimAmount(frame);
  if (a <= 0.001) return null;
  const blur = `blur(${(S3_SCRIM.blurPx * a).toFixed(2)}px)`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: alpha(theme.paper, S3_SCRIM.dim * a),
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        pointerEvents: "none",
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S3_TIMING;
  for (const b of t.chips.beats) if (b % BEAT !== 0) throw new Error(`S3: chip beat f${b} is not on a beat (BEAT = ${BEAT})`);
  for (let i = 1; i < t.chips.beats.length; i++) if (!(t.chips.beats[i] > t.chips.beats[i - 1])) throw new Error("S3: chip beats must be in order");
  if (!(t.scrim.inTo <= t.box.drawFrom + 2)) throw new Error("S3: the app must be dimmed by the time the box starts to draw");
  if (!(t.caption.end <= t.scrim.inFrom + 4)) throw new Error("S3: the opening caption must be gone as the scrim comes in");
  if (!(t.chips.beats[5] + t.chips.frames <= t.partEnd + 8)) throw new Error("S3: the last chip must have landed by the end of 14a");
  if (!(t.calloutRandom.end <= t.partEnd)) throw new Error("S3: the 'Random per task' callout must be gone by the end of 14a");
  if (!(S3_BOX.y - 72 >= 96 && S3_BOX.y + BOX_H + 72 <= 905)) throw new Error("S3: the chips must stay inside the safe margin and clear of the captions");
  // 14b
  if (!(t.module.from > t.partEnd)) throw new Error("S3: the module plate (14b) must start after 14a's last frame");
  if (!(t.reads.from > t.partEnd && t.reads.from > t.module.from && t.reads.to > t.reads.from)) throw new Error("S3: the reads (14b) must start after the module plate and after 14a");
  if (t.send.hit % BEAT !== 0) throw new Error(`S3: the packet's hit f${t.send.hit} is not on a beat (BEAT = ${BEAT})`);
  if (!(S3_PLATE.y >= S3_MODULE_BAND.y && S3_PLATE.y + S3_PLATE.h <= S3_MODULE_BAND.y + S3_MODULE_BAND.h)) throw new Error("S3: the module plate must sit inside the module band");
  // 14c
  if (!(t.audit.from > t.partEndB)) throw new Error("S3: the audit (14c) must start after 14b's last frame");
  if (t.audit.from % BEAT !== 0) throw new Error(`S3: the audit's start f${t.audit.from} is not on a beat (BEAT = ${BEAT})`);
  if (t.stamp.at % BEAT !== 0) throw new Error(`S3: the stamp's frame f${t.stamp.at} is not on a beat (BEAT = ${BEAT})`);
  if (!(t.audit.from + t.audit.frames <= t.stamp.at)) throw new Error("S3: the audit line must have left the box before the stamp lands");
  if (!(t.stamp.dimFrom + t.stamp.dimFrames <= t.stamp.at + t.stamp.frames)) throw new Error("S3: the rack must have stepped back by the time the stamp has settled");
  if (!(t.stamp.at + t.stamp.frames < t.pullback.from)) throw new Error("S3: the stamp must have settled before the pull-back starts");
  if (!(t.pullback.from >= t.scrim.outFrom)) throw new Error("S3: the pull-back is the hand-back to the app: it must not start before the scrim's out-ramp");
  if (!(t.seal.from >= t.pullback.from + t.pullback.frames)) throw new Error("S3: the seal ring closes on the pulled-back box, after the pull-back");
  if (!(t.exit.from >= t.seal.from + t.seal.frames)) throw new Error("S3: the sealed box must hold before it leaves");
  if (!(t.exit.from + t.exit.frames <= 2099)) throw new Error("S3: the box must be gone by the last frame of S3 (f2099)");
})();
