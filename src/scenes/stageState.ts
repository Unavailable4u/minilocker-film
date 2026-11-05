// Stage-level choreography that belongs to no single scene. Pure functions of the GLOBAL frame.
// Patch 12c rewrote this file for S1's match cut: the app window rises under the flying dial (f540-599) and the grid paper
// fades in with the f300 impact and out with the cut. MiniLockerFilm.tsx only calls these functions (it is not edited).
import { clamp01, signature } from "../lib/ease";

/** FilmApp is mounted from this frame: the window starts rising off-frame while the title leaves (BIBLE 6, S1: f540-599). */
export const APP_MOUNT_FRAME = 540;
/** The frame S2 starts: the app is fully in place and at full opacity. */
export const APP_READY_FRAME = 600;

/** The window is fully docked (dy = 0) from this frame; the dial rides it down to the last 10 frames, so the landing is exact. */
export const APP_DOCKED_FRAME = 590;
/** The window is at full opacity from this frame (it is dimmed before). */
export const APP_LIT_FRAME = 588;

/** How far below its place the window starts, in LOGICAL px: far enough to be off-frame (the stage is 1080 px high). */
export const APP_RISE_PX = 1000;
/** Lowest opacity while the window is rising: "mounted but dimmed". */
export const APP_DIM = 0.28;

/**
 * S9 (patch 21 contract): the app window clears. It fades out over these frames (signature ease) and is unmounted from `end` on, so the end card
 * sits on the bare stage (graphite gradient, glow, grid paper). The camera's pull-back (S9_CAMERA) carries the window away while it fades.
 */
export const APP_CLEAR = { start: 4980, end: 5004 } as const;

export interface AppReveal {
  mounted: boolean;
  /** 0..1 */
  opacity: number;
  /** extra vertical offset in LOGICAL px (positive = lower) */
  dy: number;
}

/**
 * The window's entrance, the second half of the S1 match cut. From f540 it rises from below the frame (signature ease, docked at
 * f590) while it brightens from 28% to 100% (lit at f588), so the dial of the title scene can drop onto the panel's dial socket
 * as the window arrives. At and after f600 the window is exactly where S2 expects it: { mounted, opacity 1, dy 0 }.
 *
 * S1Title.tsx reads this same function to follow the panel's dial while the window moves; never retime it without re-reading that file.
 */
export function appReveal(frame: number): AppReveal {
  if (frame < APP_MOUNT_FRAME) return { mounted: false, opacity: 0, dy: 0 };
  if (frame >= APP_CLEAR.start) {
    const out = signature(clamp01((frame - APP_CLEAR.start) / (APP_CLEAR.end - APP_CLEAR.start)));
    return out >= 1 ? { mounted: false, opacity: 0, dy: 0 } : { mounted: true, opacity: 1 - out, dy: 0 };
  }
  const rise = signature(clamp01((frame - APP_MOUNT_FRAME) / (APP_DOCKED_FRAME - APP_MOUNT_FRAME)));
  const lit = signature(clamp01((frame - APP_MOUNT_FRAME) / (APP_LIT_FRAME - APP_MOUNT_FRAME)));
  return { mounted: true, opacity: APP_DIM + (1 - APP_DIM) * lit, dy: (1 - rise) * APP_RISE_PX };
}

/** Frames the grid paper takes to fade in on the f300 impact. */
const GRID_IN_FRAMES = 24;

/** Opacity of the grid paper on the stage: S1 (in with the f300 impact, out f540-599) and S9 (BIBLE 5). */
export function gridOpacity(frame: number): number {
  if (frame >= 300 && frame < 600) {
    const fadeIn = signature(clamp01((frame - 300) / GRID_IN_FRAMES));
    const fadeOut = 1 - clamp01((frame - 540) / 59);
    return Math.min(fadeIn, fadeOut);
  }
  if (frame >= 4980) return clamp01((frame - 4980) / 20);
  return 0;
}

/**
 * Depth of field on the global camera (12% dim and a 1.2 px blur outside the focus, src/fx/Camera.tsx).
 * OFF in 12a: in the headless Chromium used to QA this patch the blur layer drew mirrored ghost copies of the window along its
 * edges. Set to true and look at a still in YOUR Chrome (`npx remotion still src/index.ts MiniLockerFilm out/qa/f600.png --frame=600`);
 * if the window edges are clean, leave it on.
 */
export const CAMERA_DOF = false;
