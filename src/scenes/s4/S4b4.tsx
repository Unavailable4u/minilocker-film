// S4b4 (f2700-2819) "The checks" (BIBLE 6, S4b). Patch 16d: the fourth sixth of S4b. CAMERA ONLY: nothing is drawn in stage space (the stage is gone from f2669).
//
// What this part does (everything on screen is the app's own Attack Lab, driven by script.ts `LAB` and filmState.ts)
//   - f2700-2769 the eight REAL checks light one after another, every `LAB.checkEvery` (10) frames from `LAB.checksFrom` (f2700), under "Containment checks".
//     The camera moves from the detail pane to the checks (`attackChecks`: heading and rows, scroll 740) over 30 frames and ARRIVES on the beat f2730, then drifts
//     in 2 % while rows 4-8 light.
//   - f2764-2779 the camera sweeps to the verdict (`attackVerdict`: the donut, the 15 tiles, the \"Run all attacks\" button and the pane's verdict banner) while the pane
//     scrolls back to the top (`LAB.detailScroll`, f2768-2780); it ARRIVES on f2780, the stamp (`LAB.stampAt`): the tile turns blue and the donut fills from 0.
//   - f2780-2819 a slow push on the verdict (bias 1 -> 1.03) so the shot is never still.
//
// The cursor: none (hidden since the click on Run, f2220; the spec of this part is camera and scroll only).
// Hand-offs. 16c ended on `attackDetail`, padding 96, bias 1 (arrived f2684): the first keyframe starts on f2700 from that pose. This part ends on `attackVerdict`,
// padding 96, bias 1.03 (arrived f2819): 16e (S4b5) starts its one keyframe on f2820 from that pose.
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { focusRect, type FocusName } from "../../config/focus";
import { LAB } from "../../config/script";
import { STAGE } from "../../config/timeline";
import { s4Data } from "./data";
import { S4B1_CAMERA } from "./S4b1";
import { S4B2_CAMERA } from "./S4b2";
import { S4B3_CAMERA } from "./S4b3";
import { S4A3_CAMERA } from "./S4a3";
import { S4_TIMING } from "./shared";

// ---------------------------------------------------------------------------------------------- camera

/** Four keyframes, after f2699: to the checks (arrives f2730), a drift in while rows 4-8 light, the sweep to the verdict (arrives f2780), the slow push to f2819. */
export const S4B4_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.checksMove.from, "attackChecks", { padding: 96, scaleBias: 1, ease: "signature", frames: S4_TIMING.checksMove.frames }),
  kf(S4_TIMING.checksDrift.from, "attackChecks", { padding: 96, scaleBias: S4_TIMING.checksDrift.bias, ease: "linear", frames: S4_TIMING.checksDrift.frames }),
  kf(S4_TIMING.verdictMove.from, "attackVerdict", { padding: 96, scaleBias: 1, ease: "signature", frames: S4_TIMING.verdictMove.frames }),
  kf(S4_TIMING.verdictPush.from, "attackVerdict", { padding: 96, scaleBias: S4_TIMING.verdictPush.bias, ease: "linear", frames: S4_TIMING.verdictPush.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** No waypoints: the cursor stays hidden through the checks (camera and scroll only). */
export const S4B4_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

/** The framed rectangle is inside the stage with at least this much stage round it, at the frames listed below. */
const RECT_EDGE = 24;

(() => {
  const t = S4_TIMING;
  if (!(S4B4_CAMERA[0].frame > t.partEndB3)) throw new Error("S4b4: the first keyframe must start after 16c's last frame (f2699)");
  if (!(S4B4_CAMERA[0].frame >= LAB.checksFrom)) throw new Error(`S4b4: the camera must start on or after the first check (f${LAB.checksFrom})`);
  for (let i = 1; i < S4B4_CAMERA.length; i++) {
    const prev = S4B4_CAMERA[i - 1];
    if (!(S4B4_CAMERA[i].frame >= prev.frame + (prev.frames ?? 0))) throw new Error(`S4b4: keyframe ${i} starts before keyframe ${i - 1} has arrived`);
  }
  const last = S4B4_CAMERA[S4B4_CAMERA.length - 1];
  if (!(last.frame + (last.frames ?? 0) <= t.partEndB4)) throw new Error("S4b4: the camera must have arrived by the last frame of the part (f2819): 16e's first keyframe starts at f2820 or later");
  if (!(t.checksMove.from + t.checksMove.frames <= 2730 && t.verdictMove.from + t.verdictMove.frames === LAB.stampAt)) {
    throw new Error(`S4b4: the checks shot must be on screen by the beat f2730 and the verdict shot must arrive on the stamp (f${LAB.stampAt})`);
  }

  // the evidence must fit the framing: the verdict and the checks the film shows are the real ones
  const data = s4Data();
  if (!(data.outcome.checksTotal <= LAB.checksFit)) {
    throw new Error(`S4b4: the attack has ${data.outcome.checksTotal} checks and the framing (attackChecks, scroll 740) holds ${LAB.checksFit}: enlarge attackChecks and LAB.detailScroll`);
  }

  // each shot has its rectangle inside the stage, at the frame it arrives and at the end of its drift or push
  const poses = [...S4A3_CAMERA, ...S4B1_CAMERA, ...S4B2_CAMERA, ...S4B3_CAMERA, ...S4B4_CAMERA];
  const shots: Array<[FocusName, number]> = [
    ["attackChecks", t.checksMove.from + t.checksMove.frames],
    ["attackChecks", t.checksDrift.from + t.checksDrift.frames],
    ["attackVerdict", t.verdictMove.from + t.verdictMove.frames],
    ["attackVerdict", t.partEndB4],
  ];
  for (const [name, f] of shots) {
    const cam = getCameraState(f, poses, undefined, { wideTilt: false });
    const r = focusRect(name);
    const a = worldToStage(cam, { x: r.x, y: r.y });
    const b = worldToStage(cam, { x: r.x + r.w, y: r.y + r.h });
    if (!(a.x >= RECT_EDGE && a.y >= RECT_EDGE && b.x <= STAGE.w - RECT_EDGE && b.y <= STAGE.h - RECT_EDGE)) {
      throw new Error(`S4b4: on f${f} \`${name}\` is at stage x ${a.x.toFixed(0)}-${b.x.toFixed(0)}, y ${a.y.toFixed(0)}-${b.y.toFixed(0)}: it must be inside the stage with ${RECT_EDGE} px round it`);
    }
  }
})();
