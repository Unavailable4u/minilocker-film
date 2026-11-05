// S4b1 (f2400-2459) "Rewind." (BIBLE 6, S4b). Patch 16a: the first sixth of S4b.
//
// What this part does
//   - f2400 the caption "Rewind." (CUES.s4.captionRewind), until f2456. The sound returns on f2400 (patch 22; the silence ended on f2399).
//   - f2400-2413 the slab with the wipe's output (`WIPED_0`) and the dimmed command retire: the empty, dashed slots they covered are what the fresh sandbox is
//     drawn round (S4Stage.tsx, `s4RetireProgress`).
//   - f2406 the snapshots the rewind throws away land greyed on the rail (snapshot 2 in the sample, with its real hash), the discarded work.
//   - f2415 (a beat) a pulse leaves snapshot 1 and travels to the middle of the empty lattice (SnapshotTimeline's tether, reaching it f2437); f2421-2444 the
//     GhostContainer draws on round the lattice in GHOST_DRAW_FRAMES (24) frames and is complete on the beat f2445, with its chip "fresh sandbox".
//   - f2437-2458 the blue "rewound" node: its arc leaves snapshot 1 as the pulse arrives, the node lands (f2447) with "restored into a fresh sandbox" under it.
//   - f2400-2459 a slow push on the steps (bias 1.03 -> 1.04). The cursor: none.
//
// Hand-offs. 15c ended on `attackSteps`, padding 96, bias 1.03 (arrived f2398): this part's one keyframe starts on f2400. It ends on `attackSteps`, padding 96,
// bias 1.04 (arrived f2459). 16b (f2460) starts its camera, cursor and overlay items on f2460 or later, from that pose; the stage keeps drawing the empty slots
// inside the container, the greyed node and the rewound node, and 16b fills `reassemble` in `s4LatticeState` (the shards return INTO `S4_GHOST`).
import React from "react";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { WINDOW } from "../../config/focus";
import { copy } from "../../config/copy";
import { STAGE } from "../../config/timeline";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4A3_CAMERA } from "./S4a3";
import { S4_COLUMN, S4_PANEL, S4_RAIL, S4_TIMING, s4DiscardedProgress } from "./shared";

// ---------------------------------------------------------------------------------------------- camera

/**
 * One keyframe, after f2399 (15c's last arrives f2398 on `attackSteps`, padding 96, bias 1.03): a slow push to bias 1.04 that arrives on the last frame of the
 * part. No tilt, as in 15b and 15c: the stage is not tilted, and the app would move against it.
 */
export const S4B1_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.rewindPush.from, "attackSteps", { padding: 96, scaleBias: S4_TIMING.rewindPush.bias, ease: "signature", frames: S4_TIMING.rewindPush.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** No waypoints: the cursor has been hidden since the click on Run (f2220) and 16a does not bring it back. */
export const S4B1_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

/** The steps column keeps this much stage between its left edge and the panel's right edge at the part's last pose (15c checks 4 px at the punch's peak). */
const COLUMN_PANEL_GAP = 4;
/** ... and between its right edge and the stage's. */
const COLUMN_EDGE = 24;
/** The window's bottom edge is at least this far above the rail. */
const RAIL_GAP = 24;

(() => {
  const t = S4_TIMING;
  if (!(S4B1_CAMERA[0].frame > t.partEndA3)) throw new Error("S4b1: the first keyframe must start after 15c's last frame (f2399)");
  const last = S4B1_CAMERA[S4B1_CAMERA.length - 1];
  if (!((last.frame + (last.frames ?? 0)) <= t.partEndB1)) throw new Error("S4b1: the camera must have arrived by the last frame of the part (f2459): 16b's first keyframe starts at f2460 or later");
  const data = s4Data(); // throws now, naming what is missing, if the evidence cannot support the rewind
  // the greyed snapshots all land before the pulse arrives (the rewound node follows the pulse)
  const lastDiscarded = t.discarded.from + (data.rewound.discarded.length - 1) * t.discarded.stagger + t.discarded.frames;
  if (data.rewound.discarded.length > 0 && !(lastDiscarded <= t.pulse.from + t.pulse.frames)) {
    throw new Error(`S4b1: the last of ${data.rewound.discarded.length} greyed snapshots lands on f${lastDiscarded}, after the pulse has arrived (f${t.pulse.from + t.pulse.frames}): lower S4_TIMING.discarded.stagger`);
  }
  if (data.rewound.discarded.length > 0 && !(s4DiscardedProgress(t.pulse.from + t.pulse.frames, data.rewound.discarded.length - 1) >= 1)) throw new Error("S4b1: the greyed snapshots must be down when the pulse arrives");

  // The camera at the end of the part: the base is where 15c ends (`attackSteps`, padding 96, bias 1.03).
  const poses = [...S4A3_CAMERA, ...S4B1_CAMERA];
  const panelRight = S4_PANEL.x + S4_PANEL.w;
  const cam = getCameraState(t.partEndB1, poses, undefined, { wideTilt: false });
  const colLeft = worldToStage(cam, { x: S4_COLUMN.x, y: 0 }).x;
  const colRight = worldToStage(cam, { x: S4_COLUMN.x + S4_COLUMN.w, y: 0 }).x;
  const winBottom = worldToStage(cam, { x: 0, y: WINDOW.h }).y;
  if (!(colLeft >= panelRight + COLUMN_PANEL_GAP)) throw new Error(`S4b1: on f${t.partEndB1} the steps column starts at stage x ${colLeft.toFixed(0)}, within ${COLUMN_PANEL_GAP} px of the panel (it ends x ${panelRight}): lower the push`);
  if (!(colRight <= STAGE.w - COLUMN_EDGE)) throw new Error(`S4b1: on f${t.partEndB1} the steps column ends at stage x ${colRight.toFixed(0)}, within ${COLUMN_EDGE} px of the stage's edge: lower the push`);
  if (!(winBottom <= S4_RAIL.y - RAIL_GAP)) throw new Error(`S4b1: on f${t.partEndB1} the window's bottom edge is at stage y ${winBottom.toFixed(0)}, within ${RAIL_GAP} px of the snapshot rail (y ${S4_RAIL.y}): lower the push`);
})();

// ---------------------------------------------------------------------------------------------- the overlay

/** The caption of the part; the retiring slab, the greyed and rewound nodes, the pulse and the container are the stage's (S4Stage.tsx, mounted by S4a.tsx). */
export const S4b1: React.FC<SceneOverlayProps> = () => (
  <Caption text={copy.s4.captionRewind} highlight="Rewind" startFrame={S4_TIMING.captionRewind.start} endFrame={S4_TIMING.captionRewind.end} />
);
