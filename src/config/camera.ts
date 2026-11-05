// Types and constants of the virtual camera and the cursor. Scenes export arrays of these (SN_CAMERA, SN_CURSOR);
// MiniLockerFilm.tsx concatenates them. The maths lives in src/fx/Camera.tsx and src/fx/Cursor.tsx.
//
// FRAME NUMBERS here are GLOBAL film frames (the same numbers as CUES in timeline.ts). Render <Camera> and <Cursor> in the
// global frame space (not inside a <Sequence> with a non-zero `from`).

import type { FocusName } from "./focus";

/** How a camera move between two keyframes is timed. "spring" uses the camera spring (BIBLE 5), the others take `frames`. */
export type CameraEase = "spring" | "signature" | "linear";

export interface CameraKeyframe {
  /** Global frame at which the move TO this keyframe starts (the first keyframe holds from frame 0). */
  frame: number;
  /** The named focus rectangle (src/config/focus.ts) the camera frames. */
  target: FocusName;
  /** Empty stage margin around the focus, in stage pixels (1920 x 1080). 96 is the film's safe margin. */
  padding: number;
  /** Multiplier on the solved zoom: 1 = exactly fit the focus inside the padding; 1.03 = a 3% punch-in. The final zoom is clamped to 1.0 .. 2.6. */
  scaleBias: number;
  /** Tilt in degrees. Clamped per scene: 6 (X) and 5 (Y) normally, 14 in S1 and S9. */
  rotateX: number;
  rotateY: number;
  /** Roll in degrees (clamped to +-3). */
  rotateZ: number;
  /** Timing of the move into this keyframe. Default "spring". */
  ease?: CameraEase;
  /** Length in frames of a "signature" or "linear" move (default 30). Ignored for "spring". */
  frames?: number;
  /** Impact shake amplitude in stage pixels, starting at this frame and decaying over 8 frames. Land it on a beat. */
  shake?: number;
}

export interface CursorWaypoint {
  /** Global frame at which the cursor ARRIVES at (x, y). */
  frame: number;
  /** Position in the LOGICAL 1600 x 900 space of the app window. */
  x: number;
  y: number;
  /** Press at this frame: the arrow scales to 0.88 and back over 4 frames and a crimson ripple plays for 14 frames. */
  click?: boolean;
  /** What the cursor is over while it rests here (any label the scene wants to read back, for example "run-button"). */
  hover?: string;
  /** The cursor fades out over 8 frames after this waypoint and stays hidden until it fades in at the next one (no travel between them). */
  hide?: boolean;
}

export const CAMERA_LIMITS = {
  scaleMin: 1.0,
  scaleMax: 2.6,
  /** normal tilt limits in degrees */
  tiltX: 6,
  tiltY: 5,
  /** tilt limits in S1 and S9 */
  tiltXWide: 14,
  tiltYWide: 14,
  tiltZ: 3,
  perspective: 1800,
  /** amplitude of the sinusoidal float in stage pixels (patch 25: 2 -> 5, with periods of 190 / 257 frames, so a held shot visibly lives) */
  driftPx: 5,
  /** amplitude of the slow zoom breathing, as a fraction of the zoom (patch 25). 0.004 = +-0.4 %, one breath every ~310 frames. */
  floatZoom: 0.004,
  /** the impact shake decays over this many frames */
  shakeFrames: 8,
  /** depth-of-field illusion outside the focus */
  dofBlurPx: 1.2,
  dofDim: 0.12,
  /** after this many frames a camera spring counts as settled */
  springSettled: 150,
  /** default length of a "signature" or "linear" move */
  defaultMoveFrames: 30,
} as const;

/** Shorthand for a keyframe: kf(600, "blastPanel", { padding: 80, rotateY: -3 }). Defaults: padding 96, no bias, no tilt, spring. */
export function kf(frame: number, target: FocusName, opts: Partial<Omit<CameraKeyframe, "frame" | "target">> = {}): CameraKeyframe {
  return {
    frame,
    target,
    padding: opts.padding ?? 96,
    scaleBias: opts.scaleBias ?? 1,
    rotateX: opts.rotateX ?? 0,
    rotateY: opts.rotateY ?? 0,
    rotateZ: opts.rotateZ ?? 0,
    ...(opts.ease !== undefined ? { ease: opts.ease } : {}),
    ...(opts.frames !== undefined ? { frames: opts.frames } : {}),
    ...(opts.shake !== undefined ? { shake: opts.shake } : {}),
  };
}

/**
 * patch 25: a shot that lives. Eases to `target` over `arrive` frames from `frame`, then creeps in by `push` (0.04 = 4 %) in a linear move that ends on
 * `end`. Use it for every hold longer than about 2 s, so no shot is still (the float in Camera.tsx is on top of this). Returns two keyframes: spread
 * them into a scene's camera array. The next keyframe must start at `end` or later.
 */
export function holdShot(
  frame: number,
  end: number,
  target: FocusName,
  opts: { padding?: number; arrive?: number; push?: number; scaleBias?: number; rotateX?: number; rotateY?: number } = {},
): CameraKeyframe[] {
  const arrive = opts.arrive ?? 36;
  const push = opts.push ?? 0.04;
  const bias = opts.scaleBias ?? 1;
  const common = { padding: opts.padding ?? 96, rotateX: opts.rotateX ?? 0, rotateY: opts.rotateY ?? 0 };
  if (!(end > frame + arrive)) throw new Error(`holdShot: end f${end} must be later than frame f${frame} + arrive ${arrive}`);
  return [
    kf(frame, target, { ...common, scaleBias: bias, ease: "signature", frames: arrive }),
    kf(frame + arrive, target, { ...common, scaleBias: bias * (1 + push), ease: "linear", frames: end - (frame + arrive) }),
  ];
}
