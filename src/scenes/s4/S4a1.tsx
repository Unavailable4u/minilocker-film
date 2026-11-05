// S4a1 (f2100-2219) "Attack Lab: the pick" (BIBLE 6, S4a). Patch 15a: the first third of S4a.
//
// What this part does
//   - f2100-2124 the header underline slides to "Attack Lab" (script.ts SCREEN_CHANGES: slide from f2100, the screens swap at f2112, hover lead from f2080).
//     The camera is still on the nav where S3 left it; nothing in this file moves it until the screens swap.
//   - f2112-2154 the camera lands on the Attack Lab (`attackLabPick`: the left of the summary bar and the top of the card list). The summary bar is the
//     app's own: the 15 verdict tiles and the donut at "0 of 15 contained" (filmState builds every tile as not run before the click on Run).
//   - f2138-2196 the cursor appears right of the tiles and sweeps four of them, one per 8 frames, then rests on the hero's (hover rings are the app's, from
//     LAB.tileHovers: the cursor's waypoints are computed FROM those frames). f2200 it selects `rewind_after_rm_rf` (a hover-dwell, no click ripple: the
//     only click of S4a is Run) and the card list scrolls the hero's card up under it (f2201-2216, the app's own scroll).
//   - f2212-2216 the cursor rides the Run button, which is still sliding up with the list, and rests on it at f2216 (LAB.runHoverFrom: the button's own
//     hover ring starts f2212). The click is 15b's (f2220).
//   - f2154-2216 meanwhile the camera pushes 5 % on the same region.
//
// Nothing is typed here: tiles, card and button positions are MEASURED (anchors.measured.json, through anchors.ts) and the hero's index comes from the
// evidence's catalog (data.ts). The part draws nothing in stage space: the Attack Lab is the app, and the explainer graphics start in 15b.
//
// Hand-offs. 15b starts at f2220: its first camera keyframe starts at f2220 or later (this part ends on `attackLabPick`, padding 48, bias 1.05, arrived
// f2216), and its first cursor waypoint is the click on Run at LAB.pressAt, on the position this part's last waypoint rests on.
import React from "react";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { anchorPoint, labRunAnchor, labTileAnchor, MEASURED } from "../../config/anchors";
import { LAB } from "../../config/script";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4_CURSOR_ENTER, S4_PICK_PADDING, S4_TIMING } from "./shared";
import { NAV_PADDING } from "../s3/shared";

// ---------------------------------------------------------------------------------------------- camera

/**
 * Two keyframes, both after f2099 (S3's last, f2052, is the nav; it holds, with the camera's 2 px drift, until the landing starts):
 *   1. f2112: the landing, nav to `attackLabPick` (padding 48, zoom 2.09), 42 frames.
 *   2. f2154: the push, the same region with a 5 % bias, 62 frames, arrives f2216.
 * No tilt: the region is text at a zoom above 2, where a tilt rasterizes it smeared (S3a's note); the push and the 2 px drift are the motion.
 */
export const S4A1_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.landing.from, "attackLabPick", { padding: S4_PICK_PADDING, ease: "signature", frames: S4_TIMING.landing.frames }),
  kf(S4_TIMING.push.from, "attackLabPick", { padding: S4_PICK_PADDING, scaleBias: S4_TIMING.push.bias, ease: "signature", frames: S4_TIMING.push.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** The verdict tile `index`, as a clear error (not "undefined.x") when script.ts LAB.tileHovers names a tile the measurement does not have. */
function tileCentre(index: number): { x: number; y: number } {
  const r = MEASURED.lab.tiles[index];
  if (!r) throw new Error(`S4a1: LAB.tileHovers names tile ${index}, but anchors.measured.json has ${MEASURED.lab.tiles.length} tiles`);
  return anchorPoint(labTileAnchor(index));
}

/**
 * The cursor, in LOGICAL window px, on the frames script.ts gives the lab:
 *   appears right of the tiles; on each tile of LAB.tileHovers from that entry's frame; on the hero's tile at LAB.selectAt (no click: a hover-dwell);
 *   on the hero card's Run button at LAB.runHoverFrom, where the button is at that frame (the list is still scrolling), and at LAB.listScrollTo, where
 *   it rests (the card is then in place). The Run button is read from anchors.ts for the frame, so the cursor rides it up the list.
 */
function buildCursor(): readonly CursorWaypoint[] {
  const d = s4Data();
  const hero = d.hero.index;
  const wp: CursorWaypoint[] = [{ frame: S4_TIMING.cursorEnter, x: S4_CURSOR_ENTER.x, y: S4_CURSOR_ENTER.y, hover: "enter" }];
  for (const h of LAB.tileHovers) {
    const i = h.tile === "hero" ? hero : h.tile;
    wp.push({ frame: h.from, ...tileCentre(i), hover: h.tile === "hero" ? "hero-tile" : `tile-${i}` });
  }
  wp.push({ frame: LAB.selectAt, ...tileCentre(hero), hover: "hero-tile" });
  wp.push({ frame: LAB.runHoverFrom, ...anchorPoint(labRunAnchor(hero, hero, LAB.runHoverFrom)), hover: "run-button" });
  wp.push({ frame: LAB.listScrollTo, ...anchorPoint(labRunAnchor(hero, hero, LAB.listScrollTo)), hover: "run-button" });
  return wp;
}

export const S4A1_CURSOR: readonly CursorWaypoint[] = buildCursor();

// ---------------------------------------------------------------------------------------------- import-time checks

/** A cursor target must be at least this far (stage px) inside the stage's edge at the camera pose of its frame. */
const CURSOR_EDGE = 40;

(() => {
  const t = S4_TIMING;
  if (!(S4A1_CAMERA[0].frame > 2099)) throw new Error("S4a1: the first keyframe must start after S3's last frame (f2099)");
  for (let i = 1; i < S4A1_CAMERA.length; i++) {
    if (!(S4A1_CAMERA[i].frame >= S4A1_CAMERA[i - 1].frame)) throw new Error(`S4a1: camera keyframe ${i} is out of order`);
  }
  for (let i = 1; i < S4A1_CURSOR.length; i++) {
    if (!(S4A1_CURSOR[i].frame >= S4A1_CURSOR[i - 1].frame)) {
      throw new Error(`S4a1: cursor waypoint ${i} (f${S4A1_CURSOR[i].frame}) is before waypoint ${i - 1} (f${S4A1_CURSOR[i - 1].frame}); check LAB in src/config/script.ts`);
    }
  }
  const last = S4A1_CURSOR[S4A1_CURSOR.length - 1];
  if (!(last.frame <= t.partEndA1 && last.frame < LAB.pressAt)) throw new Error("S4a1: the cursor's last waypoint must be before the click on Run (f2220, 15b's)");
  if (S4A1_CURSOR.some((w) => w.click)) throw new Error("S4a1: no click in 15a: the select is a hover-dwell, the click on Run is 15b's");
  if (!(LAB.runHoverFrom >= LAB.listScrollFrom && LAB.listScrollTo <= t.partEndA1)) throw new Error("S4a1: Run's hover must come while the list scrolls, and the scroll must be done by the end of 15a");

  const data = s4Data(); // throws now, naming what is missing, if the evidence cannot support S4a

  // Every place the cursor works must be on the stage, with room, at the camera's pose on that frame. The base keyframe is the nav, where S3 ends.
  const poses = [kf(2052, "nav", { padding: NAV_PADDING }), ...S4A1_CAMERA];
  for (const w of S4A1_CURSOR) {
    const cam = getCameraState(w.frame, poses, undefined, { wideTilt: false });
    const p = worldToStage(cam, { x: w.x, y: w.y });
    if (!(p.x >= CURSOR_EDGE && p.x <= 1920 - CURSOR_EDGE && p.y >= CURSOR_EDGE && p.y <= 1080 - CURSOR_EDGE)) {
      throw new Error(`S4a1: the cursor's target "${w.hover ?? "?"}" on f${w.frame} lands on stage (${p.x.toFixed(0)}, ${p.y.toFixed(0)}), within ${CURSOR_EDGE} px of the edge or off it: reframe attackLabPick`);
    }
  }
  if (!(data.hero.index >= 0 && data.hero.index < MEASURED.lab.tiles.length)) throw new Error("S4a1: the hero's tile is not in the measured layout");
})();

// ---------------------------------------------------------------------------------------------- the overlay

/** 15a draws nothing in stage space (see the header): the app's own screen, the camera and the cursor are the whole part. */
export const S4a1: React.FC<SceneOverlayProps> = () => null;
