// S2b (f760-1200) "The run" (BIBLE 6, S2). Patch 13b: the real task plays in the terminal and the transcript.
//
// What the app does here is all filmState.ts (the fix_repo_v2 run on FIX_RUN's pins, from the evidence); this file only adds
//   - the CAMERA that follows the newest line: it leaves the form, lands on the stream + terminal and then sways between the
//     transcript (a new assistant step, its words and tool call land at the bottom of the left column) and the terminal (new output
//     lands at the bottom of the centre pane), with a small push-in on the key results (tests fail, tests pass);
//   - the CURSOR, which leaves the Run button once the press has played and rests over the terminal;
//   - the "Vultr Serverless Inference - {model}" CHIP, which pulses on every assistant step.
//
// NOTHING IS TYPED BY HAND: the beats are the pins of script.ts (testsFail, patch, testsPass, finish) and the first block of terminal
// output the session builds, the chip's pulses are the frames of the `llm.response` events (filmState.assistantStepFrames), and the
// model name is evidence.infra.inference.model. Retime a pin and the camera moves with it; the file throws at import time when
// the retime would put a move out of order or too close to the next scene.
//
// Hand-offs: 13a's last camera keyframe starts f722 and its last waypoint is the Run press (f750); this part's first keyframe is f770.
// 13c's first keyframe must start at f1190 or later (this part's last move ends on f1176 and holds), its first waypoint at f1196 or later
// (the cursor is hidden from f1188: 13c may fade it in again with a waypoint of its own).
import React from "react";
import { Badge, badgePulse, badgeReveal } from "../../fx/Badge";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import type { FocusName } from "../../config/focus";
import { copy } from "../../config/copy";
import { assistantStepFrames, getFixSession, inferencePulseAt } from "../../config/filmState";
import { FIX_RUN, type FixKey } from "../../config/script";
import { alpha, theme } from "../../config/theme";
import { selectInfra } from "../../data/select";
import { clamp01, signature } from "../../lib/ease";
import type { SceneOverlayProps } from "../types";

const s2 = copy.s2;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

const pinAt = (key: FixKey): number => {
  const p = FIX_RUN.pins.find((q) => q.key === key);
  if (!p) throw new Error(`S2b: FIX_RUN has no "${key}" pin (src/config/script.ts)`);
  return p.frame;
};

/** The first block of real output (not a typed command) with a screenful of lines: the first thing the camera has to read. */
function firstOutputFrame(): number {
  const b = getFixSession().blocks.find((x) => !x.typed && x.rows.length >= 8);
  if (!b) throw new Error("S2b: the fix run has no block of terminal output with 8 or more lines");
  return b.start;
}

export const S2B_TIMING = {
  /** the camera leaves the form and is on the run shot 30 frames later (the first assistant step lands about f808) */
  leaveForm: 770,
  /** the chip is drawn on f786-800 and off again f1182-1194, clear of 13c's first callout (f1200) */
  chipIn: 786,
  chipOut: 1182,
  /** the cursor leaves the Run button after the press ripple (14 f) has played, rests on the terminal from `restAt`, hides from `hideAt` */
  restAt: 800,
  hideAt: 1188,
  /** the camera is on the closing shot by here and holds (13c takes over) */
  camEnd: 1176,
} as const;

// ---------------------------------------------------------------------------------------------- camera

interface Move {
  /** the move starts on this frame (it ends `frames` later) */
  start: number;
  frames: number;
  target: FocusName;
  bias: number;
  why: string;
}

/**
 * runView / runLeft / runRight (focus.ts) are the same size, so the sways are pans and the zoom stays at about 1.45. scaleBias adds the
 * push on a key result (at most 6 %: about 1.54).
 *   leave the form -> runView            (before the first assistant step)
 *   first real output (ls, README)       -> runRight, the terminal has the newest lines
 *   tests fail (pin)                      -> push in on the terminal, which keeps the red output in view
 *   patch (pin)                           -> runLeft: the agent's words and the write_file call land in the transcript
 *   re-runs (the quiet stretch)           -> a slow creep, so no frame is still for long
 *   tests pass (pin)                      -> runRight, pushed in: the green re-run
 *   finish (pin)                          -> back to runView, the shot 13c takes over from
 */
function buildMoves(): readonly Move[] {
  const out = firstOutputFrame();
  const fail = pinAt("testsFail");
  const patch = pinAt("patch");
  const pass = pinAt("testsPass");
  const finish = pinAt("finish");
  return [
    { start: S2B_TIMING.leaveForm, frames: 30, target: "runView", bias: 1, why: "leave the form" },
    { start: out - 10, frames: 28, target: "runRight", bias: 1, why: "first output" },
    { start: fail - 6, frames: 40, target: "runRight", bias: 1.03, why: "tests fail: push" },
    { start: fail + 34, frames: 44, target: "runRight", bias: 1.06, why: "creep while the file is read" },
    { start: patch - 18, frames: 28, target: "runLeft", bias: 1.02, why: "the patch: transcript" },
    { start: patch + 40, frames: 60, target: "runLeft", bias: 1.06, why: "creep through the re-runs" },
    { start: pass - 14, frames: 28, target: "runRight", bias: 1.06, why: "tests pass" },
    { start: finish - 24, frames: S2B_TIMING.camEnd - (finish - 24), target: "runView", bias: 1, why: "finish: back to the run shot" },
  ];
}

const MOVES = buildMoves();

export const S2B_CAMERA: readonly CameraKeyframe[] = MOVES.map((m) =>
  kf(m.start, m.target, { padding: 40, scaleBias: m.bias, ease: "signature", frames: m.frames }),
);

// ---------------------------------------------------------------------------------------------- cursor

/** Where the cursor rests: at the far right edge of the terminal, where long lines are already cut off with an ellipsis, so the arrow hides almost no text. */
const REST = { x: 1096, y: 700 } as const;

export const S2B_CURSOR: readonly CursorWaypoint[] = [
  { frame: S2B_TIMING.restAt, x: REST.x, y: REST.y, hover: "terminal" },
  { frame: S2B_TIMING.hideAt, x: REST.x, y: REST.y, hover: "terminal", hide: true },
];

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  for (let i = 1; i < MOVES.length; i++) {
    const a = MOVES[i - 1];
    const b = MOVES[i];
    if (!(b.start >= a.start + a.frames)) {
      throw new Error(`S2b: the camera move "${b.why}" (f${b.start}) starts before "${a.why}" (f${a.start}-${a.start + a.frames}) has ended; check the pins in src/config/script.ts`);
    }
  }
  if (!(MOVES[0].start >= 760)) throw new Error("S2b: the first camera keyframe must start at f760 or later (13a holds its last pose until then)");
  const last = MOVES[MOVES.length - 1];
  if (!(last.start + last.frames <= 1190)) throw new Error(`S2b: the last camera move ends at f${last.start + last.frames}; it must end by f1190 for 13c`);
  if (!(S2B_TIMING.restAt >= FIX_RUN.pressAt + 14 + 14)) throw new Error("S2b: the cursor must wait for the press ripple (14 f) and travel for at least 14 f");
  if (!(S2B_TIMING.chipOut + 12 <= 1200)) throw new Error("S2b: the chip must be gone by f1200");
  const steps = assistantStepFrames();
  if (steps.length === 0) throw new Error("S2b: the fix run has no assistant step (llm.response), so the inference chip would never pulse");
  if (!(steps[0] >= S2B_TIMING.chipIn + 14)) throw new Error(`S2b: the first assistant step (f${steps[0]}) lands before the chip is drawn (f${S2B_TIMING.chipIn + 14})`);
})();

// ---------------------------------------------------------------------------------------------- the inference chip

/** "{model}" of the deployment, from /api/infra. A deployment that is not Vultr Serverless Inference must not wear the chip (BIBLE 10.9). */
function inferenceModel(): string {
  const inf = selectInfra().inference;
  if (!inf.vultr || !inf.model) {
    throw new Error('S2b: evidence.infra.inference is not Vultr Serverless Inference with a model, so the "Vultr Serverless Inference" chip cannot be shown. Re-capture with "npm run evidence".');
  }
  return inf.model;
}

/**
 * Bottom-left of the stage: runView / runLeft / runRight (focus.ts) show about 100 px of bare stage under the window, so the chip sits
 * there like a lower third and covers nothing. With the 6 % push the window's bottom edge is at about stage y 917, the chip is 42 px
 * tall and its bottom edge is on the 96 px safe margin (y 984).
 */
const CHIP = { left: 96, top: 940 } as const;

const riseP = (frame: number, start: number, len: number): number => signature(clamp01((frame - start) / Math.max(1, len)));

const InferenceChip: React.FC<{ frame: number }> = ({ frame }) => {
  const t = S2B_TIMING;
  if (frame < t.chipIn || frame >= t.chipOut + 12) return null;
  const reveal = Math.min(badgeReveal(frame, t.chipIn, 14), 1 - riseP(frame, t.chipOut, 12));
  if (reveal <= 0) return null;
  const pulse = inferencePulseAt(frame);
  const glow = alpha(theme.info, 0.6 * pulse);
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.left,
        top: CHIP.top,
        pointerEvents: "none",
        transformOrigin: "0 50%",
        transform: `scale(${(1 + 0.04 * pulse).toFixed(4)})`,
        filter: `drop-shadow(0 0 ${(26 * pulse).toFixed(1)}px ${glow})`,
      }}
    >
      <Badge label={`${s2.inferenceChip} - ${inferenceModel()}`} tone="info" pulse={Math.max(0.25 * badgePulse(frame, 60), pulse)} reveal={reveal} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S2b: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <InferenceChip frame={frame} />
  </>
);
