// S3c (f1930-2099) "Bait, not secrets." (BIBLE 6, S3). Patch 14c: the last third of S3.
//
// What this part does
//   - f1930-2016 caption "Bait, not secrets." (highlight "Bait,"): up from the frame the wall's group has gone (14b ends f1929), gone as the scrim has
//     finished leaving (f2018). It is at the usual caption position: while it is up the box is still full size (its lowest chip ends at y 862, the
//     caption's ink starts at y ~905) and the camera has not left the dimmed window yet.
//   - f1935-1965 the teardown audit: ContainerBox's line sweeps the box. f1965 (a beat) the stamp "real secrets in sandbox: 0" lands, the rack and the
//     plate step back behind it, and the camera takes a small impact (the dimmed app jolts; the stage-space box does not). ALL of this is S3Box.tsx:
//     the box is one object. This file owns the caption and the camera.
//   - f2004-2018 the hand-back: S3Scrim leaves (shared.tsx) and the camera goes from the dimmed window to the live Blast panel (`blastPanel`, arrives
//     f2032) so the app's own gauges are on screen, the Secrets card among them. The box is pulled back (S3Box, `s3BoxPose`) into the strip left of
//     the panel, so the stamp's 0 and the gauge's 0 are on one frame.
//   - f2040-2066 the seal ring closes on the pulled-back box (S3Box). f2052-2088 the camera swings from the panel to the header nav
//     (`nav`, padding 96), where S4 starts at f2100: the underline slides to "Attack Lab" (script.ts SCREEN_CHANGES, hover lead from f2080). The sealed
//     box holds until f2078 and leaves (fade, drift left) before the camera has landed, so it never crosses the nav.
//
// Hand-offs. Nothing here needs 14a or 14b changed. S4a (patch 15): its first camera keyframe starts at f2100 or later, from the pose this part ends
// on (`nav`, padding 96, no tilt, no bias); its first cursor waypoint arrives after f2100.
//
// The stamp's number is read from the audit (data.ts: `audit.realSecretsInSandbox`). The film must not hide a real secret in the sandbox, so this
// file throws on import (naming what the audit found) if that count is not 0 or if the audit never scanned the sandbox: a stamp that says 0 for a
// scan that did not happen would be a claim without a measurement.
import React from "react";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { MONO_ADVANCE, estimateWidth } from "../../fx/util";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { copy } from "../../config/copy";
import { focusRect } from "../../config/focus";
import { layout } from "../../config/theme";
import { CUES } from "../../config/timeline";
import { BOX_W } from "../../gfx/ContainerBox";
import type { SceneOverlayProps } from "../types";
import { containerChips } from "../../data/select";
import { s3Data } from "./data";
import { NAV_PADDING, S3_PULLBACK, S3_TIMING } from "./shared";

const s3 = copy.s3;

// ---------------------------------------------------------------------------------------------- timing

export const S3C_TIMING = {
  /** "Bait, not secrets." (CUES.s3.captionBait): leaves (12 frames before `end`) as the scrim's out-ramp starts, gone when it has finished. */
  caption: { start: CUES.s3.captionBait, end: 2016 },
  /** The impact on the stamp's frame: the dimmed app jolts 5 px (decays over 8 frames). */
  thud: { at: S3_TIMING.stamp.at, shake: 5 },
  /** The camera goes back to the app on the frame the scrim starts to leave and arrives on the Blast panel 28 frames later. */
  gauges: { from: S3_TIMING.scrim.outFrom, frames: 28 },
  /** The swing to the header nav: 36 frames, arriving f2088, then it holds and drifts 11 frames to the cut at f2100. */
  swing: { from: 2052, frames: 36 },
  /** The last frame 14c draws on (the last frame of S3). */
  partEnd: 2099,
} as const;

// ---------------------------------------------------------------------------------------------- camera

/**
 * Three keyframes, all after f1929 (14b's last frame):
 *   1. f1965: the same pose as 14b's push (`fullWindow`, padding 60, bias 1.05), with an impact shake: a no-move keyframe whose only job is the thud.
 *   2. f2004: the live Blast panel (the dial and the six gauge cards), padding 96: the zoom is set by the panel's height (zoom 1.067), the panel
 *      stands at stage x 715-1205 and the strips either side of it are free (the box is pulled back into the left one).
 *   3. f2052: the header nav, padding NAV_PADDING = 300 (patch 25; zoom ~1.96, no tilt: S4a's first keyframe starts from this pose).
 */
export const S3C_CAMERA: readonly CameraKeyframe[] = [
  kf(S3C_TIMING.thud.at, "fullWindow", { padding: 60, scaleBias: 1.05, ease: "linear", frames: 1, shake: S3C_TIMING.thud.shake }),
  kf(S3C_TIMING.gauges.from, "blastPanel", { padding: 96, ease: "signature", frames: S3C_TIMING.gauges.frames }),
  kf(S3C_TIMING.swing.from, "nav", { padding: NAV_PADDING, ease: "signature", frames: S3C_TIMING.swing.frames }),
];

/** No cursor in S3: S4a brings it back (the nav tab is hovered by filmState's hoverLead, not by a waypoint). */
export const S3C_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S3C_TIMING;
  const T = S3_TIMING;
  if (!(S3C_CAMERA[0].frame > T.partEndB && t.caption.start > T.partEndB)) throw new Error("S3c: the first keyframe and the caption must start after 14b's last frame (f1929)");
  for (let i = 1; i < S3C_CAMERA.length; i++) {
    if (!(S3C_CAMERA[i].frame >= S3C_CAMERA[i - 1].frame)) throw new Error(`S3c: camera keyframe ${i} is out of order`);
  }
  if (!(t.thud.at === T.stamp.at)) throw new Error("S3c: the camera's impact must be on the frame the stamp lands");
  if (!(t.gauges.from >= T.scrim.outFrom)) throw new Error("S3c: the camera must not leave the dimmed app before the scrim's out-ramp starts (f2004)");
  if (!(t.caption.end <= T.scrim.outTo)) throw new Error("S3c: the caption must be gone by the time the app is back (the scrim's out-ramp ends)");
  if (!(t.gauges.from + t.gauges.frames <= t.swing.from)) throw new Error("S3c: the camera must have arrived on the gauges before it swings to the nav");
  if (!(t.swing.from + t.swing.frames <= t.partEnd)) throw new Error("S3c: the swing must have landed on the nav by the end of S3");
  if (!(T.exit.from + T.exit.frames <= t.swing.from + t.swing.frames + 8)) throw new Error("S3c: the box must be gone as the camera lands on the nav (it must never cross the header)");

  const data = s3Data(); // throws now, naming what is missing, if the evidence cannot support S3
  const a = data.audit;
  if (a.realSecretsInSandbox !== 0) {
    throw new Error(`S3c: the teardown audit found ${a.realSecretsInSandbox} real secret(s) in the sandbox; the film must not hide it, so the stamp "${copy.gfxA.stampSecrets}: 0" will not be shown`);
  }
  if (!a.scanned) throw new Error("S3c: the ledger has no sandbox.audit that scanned the sandbox, so \"0 real secrets\" would not be a measurement");

  // The pulled-back box (and its right-hand chip) must stay left of the live panel, and inside the safe margin, at the camera's `blastPanel` pose.
  const pose = getCameraState(2030, [kf(0, "blastPanel", { padding: 96 })]);
  const panel = focusRect("blastPanel");
  const panelLeft = worldToStage(pose, { x: panel.x, y: panel.y }).x;
  // right chip ("128 processes"): ContainerBox's CHIP_FONT 22, CHIP_PAD_X 18, STEM 30 (private constants there)
  const rightChipW = Math.round(estimateWidth(containerChips(copy.s3.chips)[3], 22, MONO_ADVANCE)) + 36;
  const rightEdge = S3_PULLBACK.to.x + S3_PULLBACK.scale * (BOX_W + 30 + rightChipW);
  if (!(rightEdge + 16 <= panelLeft)) throw new Error(`S3c: the pulled-back box's right chip reaches stage x ${rightEdge.toFixed(0)}, within 16 px of the live panel (x ${panelLeft.toFixed(0)})`);
  // left edge of the ink: the seal ring (22 px off the box, 3 px stroke: ContainerBox's SEAL_GAP) at the pulled-back scale
  const leftInk = S3_PULLBACK.to.x - S3_PULLBACK.scale * 25;
  if (!(leftInk >= layout.safeMargin)) throw new Error(`S3c: the pulled-back box's seal ring reaches stage x ${leftInk.toFixed(0)}, inside the ${layout.safeMargin} px safe margin`);
})();

// ---------------------------------------------------------------------------------------------- the overlay

export const S3c: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S3C_TIMING;
  if (frame < t.caption.start || frame >= t.caption.end) return null;
  return <Caption text={s3.captionBait} highlight="Bait," startFrame={t.caption.start} endFrame={t.caption.end} />;
};
