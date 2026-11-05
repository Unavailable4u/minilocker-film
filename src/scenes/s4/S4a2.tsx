// S4a2 (f2220-2299) "The agent works" (BIBLE 6, S4a). Patch 15b: the middle third of S4a.
//
// What this part does
//   - f2220 the click on Run: the only click of S4a, on the button the cursor rests on since f2216 (script.ts LAB.pressAt; the app's own press, busy ring
//     f2223 and result f2232 are filmState's). The cursor fades out over the 8 frames after it (`hide`): it would otherwise sit on the card list that
//     the lattice's panel is about to cover.
//   - f2226-2250 the camera opens from `attackLabPick` (zoom 2.09) to `attackSteps` (zoom 1.19) and ARRIVES on the beat f2250: the steps column of the
//     detail pane is in the right half of the stage, the left half is free. The app builds the real steps (the write at f2236 is filmState's, from
//     `LAB.stepAt`): this part draws nothing over them.
//   - f2240-2280 the STAGE (S4Stage.tsx): the backing panel (f2240), the FileLattice builds in (f2250-2280), the rail draws on (f2262-2280), and snapshot
//     node 1 lands on the beat f2280 with the first 8 hex of the real snapshot hash.
//   - f2220-2296 the caption "Real work. Snapshot after every step." (CUES.s4.captionWorks).
//   - f2250-2299 a 2 % push on the steps.
//
// Hand-offs. 15a's last cursor waypoint (f2216) is on Run's centre; this part's one waypoint is the click on the same point. 15c's first camera keyframe,
// cursor waypoint and overlay item start at f2300 or later (LAB.stepAt.wipe): this part ends on `attackSteps`, padding 96, bias 1.02 (arrived f2299),
// the wipe row of the app appearing on f2300 under it.
//
// Space plan (stage px, at the camera's pose from f2250). Panel x 96-820, hanging from the top edge (y -40 to 722; shared.tsx S4_PANEL); the steps column
// x ~837-1809; the window's bottom edge ~y 590; the rail y 770 with its node label under it (y ~812); the caption's ink starts y ~905. Nothing of the stage
// reaches the column.
import React from "react";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { WINDOW } from "../../config/focus";
import { anchorPoint, labRunAnchor } from "../../config/anchors";
import { copy } from "../../config/copy";
import { LAB } from "../../config/script";
import { STAGE } from "../../config/timeline";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4_COLUMN, S4_PANEL, S4_PICK_PADDING, S4_RAIL, S4_TIMING } from "./shared";

// ---------------------------------------------------------------------------------------------- camera

/**
 * Two keyframes, both after f2219 (15a's last, f2154, arrives f2216 and holds):
 *   1. f2226: the opening, `attackLabPick` to `attackSteps` (padding 96, zoom 1.19), 24 frames, arrives on the beat f2250.
 *   2. f2250: the push, the same region with a 2 % bias, arrives f2299.
 * No tilt: the steps are text at a small zoom, and the lattice is stage space (a tilt would move the app against it).
 */
export const S4A2_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.open.from, "attackSteps", { padding: 96, ease: "signature", frames: S4_TIMING.open.frames }),
  kf(S4_TIMING.settle.from, "attackSteps", { padding: 96, scaleBias: S4_TIMING.settle.bias, ease: "signature", frames: S4_TIMING.settle.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/**
 * The click on Run, in LOGICAL window px: the same point 15a's last waypoint rests on (the button, at its place when the list has stopped scrolling).
 * `hide`: the cursor fades out over the 8 frames after the click and stays hidden (patch 16 may bring it back with a waypoint of its own).
 */
function buildCursor(): readonly CursorWaypoint[] {
  const hero = s4Data().hero.index;
  const run = anchorPoint(labRunAnchor(hero, hero, LAB.pressAt));
  return [{ frame: LAB.pressAt, x: run.x, y: run.y, click: true, hide: true, hover: "run-button" }];
}

export const S4A2_CURSOR: readonly CursorWaypoint[] = buildCursor();

// ---------------------------------------------------------------------------------------------- import-time checks

/** The steps column keeps at least this much stage between its right edge and the stage's, at any pose of this part. */
const COLUMN_EDGE = 48;
/** The panel's right edge and the column's left edge keep at least this much stage between them. */
const COLUMN_GAP = 12;
/** The window's bottom edge, at any pose of this part, is at least this far above the rail. */
const RAIL_GAP = 24;

(() => {
  const t = S4_TIMING;
  if (!(S4A2_CAMERA[0].frame > t.partEndA1)) throw new Error("S4a2: the first keyframe must start after 15a's last frame (f2219)");
  for (let i = 1; i < S4A2_CAMERA.length; i++) {
    if (!(S4A2_CAMERA[i].frame >= S4A2_CAMERA[i - 1].frame)) throw new Error(`S4a2: camera keyframe ${i} is out of order`);
  }
  if (S4A2_CURSOR.length !== 1 || S4A2_CURSOR[0].frame !== LAB.pressAt || S4A2_CURSOR.filter((w) => w.click).length !== 1) {
    throw new Error("S4a2: the cursor's one waypoint is the click on Run at LAB.pressAt: the only click of S4a");
  }
  s4Data(); // throws now, naming what is missing, if the evidence cannot support S4a

  // The camera at the poses of this part: the base is where 15a ends (`attackLabPick`, padding 48, bias 1.05).
  const poses = [kf(0, "attackLabPick", { padding: S4_PICK_PADDING, scaleBias: t.push.bias }), ...S4A2_CAMERA];
  const panelRight = S4_PANEL.x + S4_PANEL.w;
  const frames = [t.open.from + t.open.frames, t.partEndA2];
  for (const f of frames) {
    const cam = getCameraState(f, poses, undefined, { wideTilt: false });
    const colLeft = worldToStage(cam, { x: S4_COLUMN.x, y: 0 }).x;
    const colRight = worldToStage(cam, { x: S4_COLUMN.x + S4_COLUMN.w, y: 0 }).x;
    const winBottom = worldToStage(cam, { x: 0, y: WINDOW.h }).y;
    if (!(colLeft >= panelRight + COLUMN_GAP)) {
      throw new Error(`S4a2: on f${f} the steps column starts at stage x ${colLeft.toFixed(0)}, under the panel (it ends x ${panelRight}, ${COLUMN_GAP} px clear needed): reframe attackSteps or narrow S4_PANEL`);
    }
    if (!(colRight <= STAGE.w - COLUMN_EDGE)) {
      throw new Error(`S4a2: on f${f} the steps column ends at stage x ${colRight.toFixed(0)}, within ${COLUMN_EDGE} px of the stage's edge: reframe attackSteps`);
    }
    if (!(winBottom <= S4_RAIL.y - RAIL_GAP)) {
      throw new Error(`S4a2: on f${f} the window's bottom edge is at stage y ${winBottom.toFixed(0)}, within ${RAIL_GAP} px of the snapshot rail (y ${S4_RAIL.y}): reframe attackSteps`);
    }
  }
  // the Run button the click lands on must be on the stage at the pose of f2220 (the camera has not started to move: 15a's last pose)
  const click = getCameraState(LAB.pressAt, poses, undefined, { wideTilt: false });
  const p = worldToStage(click, { x: S4A2_CURSOR[0].x, y: S4A2_CURSOR[0].y });
  if (!(p.x >= 40 && p.x <= STAGE.w - 40 && p.y >= 40 && p.y <= STAGE.h - 40)) {
    throw new Error(`S4a2: the click on Run lands on stage (${p.x.toFixed(0)}, ${p.y.toFixed(0)}), within 40 px of the edge or off it: 15a's last pose changed`);
  }
})();

// ---------------------------------------------------------------------------------------------- the overlay

/** The caption of the part; the stage (panel, lattice, timeline) is S4Stage.tsx, drawn by the assembly in S4a.tsx. */
export const S4a2: React.FC<SceneOverlayProps> = () => (
  <Caption text={copy.s4.captionWorks} highlight="Snapshot" startFrame={S4_TIMING.caption.start} endFrame={S4_TIMING.caption.end} />
);
