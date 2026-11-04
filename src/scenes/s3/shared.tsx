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
//   module band    box-local y 520-580: reserved for 14b's hostile module name ("shop/_telemetry.py").
//   egress         wall at stage x 1500, packets leave the box's right edge (x 1260) at `packetY`.
import React from "react";
import { alpha, theme } from "../../config/theme";
import { BEAT } from "../../config/timeline";
import { clamp01, signature } from "../../lib/ease";
import { BOX_H, BOX_W } from "../../gfx/ContainerBox";
import { COL_GAP, decoyRackSize, ROW_GAP, TILE_H, TILE_W } from "../../gfx/DecoyRack";

// ---------------------------------------------------------------------------------------------- layout

export const S3_BOX = { x: 160, y: 190 } as const;

/** The rack inside the box (box-local px): centred left to right, 32 px under the top edge. */
export function s3Rack(count: number): { x: number; y: number; w: number; h: number; lineRoom: number } {
  const size = decoyRackSize(count);
  return { x: Math.round((BOX_W - size.w) / 2), y: 32, w: size.w, h: size.h, lineRoom: size.lineRoom };
}

/** The box-local band under the rack that 14b uses for the hostile module's name. */
export const S3_MODULE_BAND = { y: 520, h: 60 } as const;

/** Stage px of the box's right edge (where packets leave) and the y packets fly along (the box's vertical middle). */
export const S3_EGRESS = { fromX: S3_BOX.x + BOX_W, packetY: S3_BOX.y + BOX_H / 2 } as const;

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
} as const;

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
})();
