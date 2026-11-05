// S4a3 (f2300-2399) "The wipe" (BIBLE 6, S4a). Patch 15c: the last third of S4a.
//
// What this part does
//   - f2300-2339 the real wipe command types large in mono on the stage, in the band above the lattice (S4Stage.tsx, from `s4Data().wipe.command`; the app's own
//     wipe row appears on f2300 under it, filmState's, from `LAB.stepAt.wipe`).
//   - f2340 THE WIPE (LAB.wipeLandsAt, a beat): the lattice's tiles shatter outward for 30 frames, drain to 30 % colour, and the camera punches 3 % (on top of 15b's
//     bias 1.02) with a short seeded shake that the stage shares (S4Stage.tsx, `s4Shake`). Then the camera eases to bias 1.03 and arrives on f2398.
//   - f2370-2399 TOTAL SILENCE (`S4_CUE_ANCHORS.silence`, for patch 22) and the real output of the wipe (`s4Data().wipe.token`, "WIPED_0" in the sample) huge, in
//     vermilion (`theme.bad`, on a hatched slab), in the place of the lattice. Caption "Everything gone." (CUES.s4.captionGone) until "Rewind." (f2400).
//   - The cursor: none. 15b hid it after the click; the only click of S4a was Run's.
//
// Hand-offs. 15b ended on `attackSteps`, padding 96, bias 1.02 (f2299): this part's first keyframe is the punch on f2340. Patch 16 (S4b) starts on f2400 or
// later from `attackSteps`, padding 96, bias 1.03; the stage keeps drawing the slab with the token and the footnote, and patch 16 owns it from there.
import React from "react";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { WINDOW } from "../../config/focus";
import { copy } from "../../config/copy";
import { STAGE } from "../../config/timeline";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4_COLUMN, S4_PANEL, S4_RAIL, S4_TIMING, s4CommandLayout, s4TokenLayout } from "./shared";

// ---------------------------------------------------------------------------------------------- camera

/**
 * Two keyframes, both after f2299 (15b's last arrives f2299 on `attackSteps`, padding 96, bias 1.02):
 *   1. f2340: the punch, 3 % on top of the bias (1.02 x 1.03), 6 frames, with the impact shake.
 *   2. f2346: the relax to bias 1.03, 52 frames, arriving f2398.
 * No tilt, as in 15b: the stage is not tilted, and the app would move against it.
 */
export const S4A3_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.punch.at, "attackSteps", {
    padding: 96,
    scaleBias: S4_TIMING.settle.bias * S4_TIMING.punch.extra,
    ease: "signature",
    frames: S4_TIMING.punch.frames,
    shake: S4_TIMING.punch.shake,
  }),
  kf(S4_TIMING.relax.from, "attackSteps", { padding: 96, scaleBias: S4_TIMING.relax.bias, ease: "signature", frames: S4_TIMING.relax.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** No waypoints: 15b's click hid the cursor, and S4a has no other click. (Patch 16 may bring it back with a waypoint of its own.) */
export const S4A3_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

/** At the punch's peak the steps column may come this close to the panel's right edge (it is 12 px clear before, in 15b): 4 px, for a few frames. */
const PUNCH_COLUMN_GAP = 4;
/** The steps column keeps this much stage between its right edge and the stage's, at any pose of this part. */
const COLUMN_EDGE = 24;
/** The window's bottom edge is at least this far above the rail at any pose of this part. */
const RAIL_GAP = 24;

(() => {
  const t = S4_TIMING;
  if (!(S4A3_CAMERA[0].frame > t.partEndA2)) throw new Error("S4a3: the first keyframe must start after 15b's last frame (f2299)");
  for (let i = 1; i < S4A3_CAMERA.length; i++) {
    if (!(S4A3_CAMERA[i].frame >= S4A3_CAMERA[i - 1].frame)) throw new Error(`S4a3: camera keyframe ${i} is out of order`);
  }
  const last = S4A3_CAMERA[S4A3_CAMERA.length - 1];
  if (!((last.frame + (last.frames ?? 0)) <= t.partEndA3)) throw new Error("S4a3: the camera must have arrived by the last frame of the part (f2399): patch 16's first keyframe starts at f2400 or later");
  const data = s4Data(); // throws now, naming what is missing, if the evidence cannot support the wipe
  s4CommandLayout(data.wipe.command); // throws if the command cannot be typed in two lines in the panel
  s4TokenLayout(data.wipe.token); // throws if the output does not fit the lattice's place

  // The camera at the poses of this part: the base is where 15b ends (`attackSteps`, padding 96, bias 1.02).
  const poses = [kf(0, "attackSteps", { padding: 96, scaleBias: t.settle.bias }), ...S4A3_CAMERA];
  const panelRight = S4_PANEL.x + S4_PANEL.w;
  for (const f of [t.punch.at + t.punch.frames, t.relax.from + t.relax.frames, t.partEndA3]) {
    const cam = getCameraState(f, poses, undefined, { wideTilt: false });
    const colLeft = worldToStage(cam, { x: S4_COLUMN.x, y: 0 }).x;
    const colRight = worldToStage(cam, { x: S4_COLUMN.x + S4_COLUMN.w, y: 0 }).x;
    const winBottom = worldToStage(cam, { x: 0, y: WINDOW.h }).y;
    if (!(colLeft >= panelRight + PUNCH_COLUMN_GAP)) throw new Error(`S4a3: on f${f} the steps column starts at stage x ${colLeft.toFixed(0)}, within ${PUNCH_COLUMN_GAP} px of the panel (it ends x ${panelRight}): lower the punch`);
    if (!(colRight <= STAGE.w - COLUMN_EDGE)) throw new Error(`S4a3: on f${f} the steps column ends at stage x ${colRight.toFixed(0)}, within ${COLUMN_EDGE} px of the stage's edge: lower the punch`);
    if (!(winBottom <= S4_RAIL.y - RAIL_GAP)) throw new Error(`S4a3: on f${f} the window's bottom edge is at stage y ${winBottom.toFixed(0)}, within ${RAIL_GAP} px of the snapshot rail (y ${S4_RAIL.y}): lower the punch`);
  }
})();

// ---------------------------------------------------------------------------------------------- the overlay

/** The caption of the part; the command, the shatter and the token are the stage's (S4Stage.tsx), drawn by the assembly in S4a.tsx. */
export const S4a3: React.FC<SceneOverlayProps> = () => (
  <Caption text={copy.s4.captionGone} highlight="gone" startFrame={S4_TIMING.captionGone.start} endFrame={S4_TIMING.captionGone.end} />
);
