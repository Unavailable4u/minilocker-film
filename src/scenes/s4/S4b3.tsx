// S4b3 (f2580-2699) "The cat" (BIBLE 6, S4b). Patch 16c: the third sixth of S4b.
//
// What this part does
//   - f2584-2593 the HashTile and the counter step aside (S4b2.tsx, `s4HashOpacity`: a fade with a 10 px drop). The counter has been up for 20 frames by then.
//   - f2596-2607 the REAL cat command (`data.cat.command`, "cat /workspace/precious.txt" in the sample) types in the strip the tile has left (`S4_CAT`: right of the
//     panel, under the steps column), small, in `theme.ink3`, behind a rule of 4 px in `theme.ok` (clean is blue in the app).
//   - f2610-2639 the REAL restored line prints under it (`data.cat.line`: the first line of the cat's result, without the harness's `exit_code=` line), mono, as
//     large as fits the strip on ONE row, with room for the cursor (39 px in the sample), `theme.ink`; complete on the beat f2640. It is drawn HERE, in stage space, because the app's own cat row
//     (it appears on f2582, LAB.stepAt.cat) is clipped below the window at `attackSteps` and cannot be shown there.
//     The scene throws unless this line is the first line of the file the attack WROTE (`data.write.content`): the film says the work came back, so the evidence
//     must say it did.
//   - f2655-2668 the stage retires: the panel, the lattice, the container, the rail with its nodes, the cat (S4Stage.tsx, `s4StageOpacity`, one opacity for all).
//   - f2655-2684 the camera moves from the steps to the detail pane (`attackDetail`: the pane's whole column, 816 x 637 px of the window) and ARRIVES on the beat
//     f2685. A signature move, as every hand-over of the film. The app's detail pane is already scrolling to the checks (script.ts `LAB.detailScroll`, f2660-2698),
//     so after the stage is gone the screen is the app's own: the checks that light from f2700 are on it.
//
// Hand-offs. 16b ended on `attackSteps`, padding 96, bias 1.05 (arrived f2579): this part's one keyframe starts on f2655, from that pose. It ends on `attackDetail`,
// padding 96, bias 1 (arrived f2684). 16d (f2700) starts its camera, cursor and overlay items on f2700 or later, from that pose. The stage is GONE from f2669: 16d
// draws nothing of it. The cursor: none (hidden since the click on Run, f2220; 16d brings it back). No caption: the next one is "Real wipe. Real rewind. Real hashes." (f3060).
import React from "react";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { focusRect } from "../../config/focus";
import { alpha, fonts, theme } from "../../config/theme";
import { STAGE } from "../../config/timeline";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4B1_CAMERA } from "./S4b1";
import { S4B2_CAMERA } from "./S4b2";
import { S4A3_CAMERA } from "./S4a3";
import { S4_CAT, S4_TIMING, s4CatCmdChars, s4CatCursor, s4CatLayout, s4CatLineChars, s4CatOpacity } from "./shared";

// ---------------------------------------------------------------------------------------------- camera

/**
 * One keyframe, after f2579 (16b's arrives f2579 on `attackSteps`, padding 96, bias 1.05): the move to the detail pane, from f2655 (the line has been complete for
 * 15 frames) to the beat f2685. No tilt: the stage is leaving, and the app should not move against it.
 */
export const S4B3_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.detailMove.from, "attackDetail", { padding: 96, scaleBias: 1, ease: "signature", frames: S4_TIMING.detailMove.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** No waypoints: the cursor has been hidden since the click on Run (f2220); 16d brings it back for the checks. */
export const S4B3_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

/** At the part's last pose the whole detail pane is inside the stage with at least this much stage round it. */
const PANE_EDGE = 24;

(() => {
  const t = S4_TIMING;
  if (!(S4B3_CAMERA[0].frame > t.partEndB2)) throw new Error("S4b3: the first keyframe must start after 16b's last frame (f2579)");
  const last = S4B3_CAMERA[S4B3_CAMERA.length - 1];
  if (!((last.frame + (last.frames ?? 0)) <= t.partEndB3)) throw new Error("S4b3: the camera must have arrived by the last frame of the part (f2699): 16d's first keyframe starts at f2700 or later");
  const data = s4Data(); // throws now, naming what is missing, if the evidence cannot support the cat

  // The restored line is the file the attack wrote: the film says the work came back.
  const wrote = data.write.content.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  if (!(wrote.length > 0 && data.cat.line.trim() === wrote)) {
    throw new Error(`S4b3: the cat printed "${data.cat.line}" but the file the attack wrote starts with "${wrote}": the restored file is not the one that was lost, and the film cannot say it came back`);
  }
  // the strip holds the command and the restored line (throws if the line cannot be set at 26 px or more)
  const layout16 = s4CatLayout(data.cat.command, data.cat.line);
  if (!(layout16.h <= S4_CAT.h)) throw new Error(`S4b3: the cat block is ${layout16.h} px high, the strip (${S4_CAT.h} px, the tile's) cannot hold it`);

  // The camera at the end of the part: the detail pane inside the stage.
  const poses = [...S4A3_CAMERA, ...S4B1_CAMERA, ...S4B2_CAMERA, ...S4B3_CAMERA];
  const cam = getCameraState(t.partEndB3, poses, undefined, { wideTilt: false });
  const pane = focusRect("attackDetail");
  const a = worldToStage(cam, { x: pane.x, y: pane.y });
  const b = worldToStage(cam, { x: pane.x + pane.w, y: pane.y + pane.h });
  if (!(a.x >= PANE_EDGE && a.y >= PANE_EDGE && b.x <= STAGE.w - PANE_EDGE && b.y <= STAGE.h - PANE_EDGE)) {
    throw new Error(`S4b3: on f${t.partEndB3} the detail pane is at stage x ${a.x.toFixed(0)}-${b.x.toFixed(0)}, y ${a.y.toFixed(0)}-${b.y.toFixed(0)}: it must be inside the stage with ${PANE_EDGE} px round it`);
  }
})();

// ---------------------------------------------------------------------------------------------- the overlay

/**
 * The cat: the real command and the restored line, in the strip the HashTile has left. Everything is a pure function of the frame (`shared.tsx`); the block leaves
 * with the stage (`s4CatOpacity`), and nothing is drawn before f2596 or after f2668.
 */
export const S4b3: React.FC<SceneOverlayProps> = ({ frame }) => {
  const opacity = s4CatOpacity(frame);
  if (opacity <= 0) return null;
  const data = s4Data();
  const c = S4_CAT;
  const lay = s4CatLayout(data.cat.command, data.cat.line);
  const cmdShown = data.cat.command.slice(0, s4CatCmdChars(frame, data.cat.command.length));
  const cursor = s4CatCursor(frame, data.cat.command.length, lay.outTotal);
  const caret = (size: number): React.ReactNode => (
    <span style={{ display: "inline-block", width: size * 0.5, height: size * 0.9, marginLeft: 2, verticalAlign: "-0.12em", background: theme.ink }} />
  );
  let left = s4CatLineChars(frame, lay.outTotal);
  // the line that is being printed (the last one with characters showing), for the cursor
  const printing = (() => {
    let n = s4CatLineChars(frame, lay.outTotal);
    for (let i = 0; i < lay.outLines.length; i++) {
      if (n < lay.outLines[i].length || i === lay.outLines.length - 1) return i;
      n -= lay.outLines[i].length;
    }
    return lay.outLines.length - 1;
  })();
  return (
    <div style={{ position: "absolute", left: c.x, top: lay.y, width: c.w, height: lay.h, opacity, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: c.rule, height: lay.h, borderRadius: 2, background: theme.ok, boxShadow: `0 0 18px ${alpha(theme.ok, 0.45)}` }} />
      <div style={{ position: "absolute", left: lay.textX - c.x, top: 0, width: lay.textW }}>
        <div style={{ height: c.cmdLineH, fontFamily: fonts.mono, fontSize: lay.cmdFont, lineHeight: `${c.cmdLineH}px`, color: theme.ink3, whiteSpace: "pre" }}>
          {cmdShown}
          {cursor === "cmd" ? caret(lay.cmdFont) : null}
        </div>
        <div style={{ marginTop: c.rowGap, fontFamily: fonts.mono, fontSize: lay.outFont, lineHeight: `${lay.outLineH}px`, color: theme.ink, whiteSpace: "pre", textShadow: `0 0 28px ${alpha(theme.ok, 0.28)}` }}>
          {lay.outLines.map((line, i) => {
            const shown = line.slice(0, Math.max(0, left));
            left -= line.length;
            return (
              <div key={i} style={{ height: lay.outLineH }}>
                {shown}
                {(cursor === "out" || cursor === "blink") && i === printing ? caret(lay.outFont) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
