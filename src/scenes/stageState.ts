// Stage-level choreography that belongs to no single scene (patch 12a). Pure functions of the GLOBAL frame.
// Patch 12c rewrites this file when S1's match cut is built; MiniLockerFilm.tsx only calls these two functions.
import { clamp01 } from "../lib/ease";

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** FilmApp is mounted from this frame; it must already be docked when S2 begins (BIBLE 6, S1). */
export const APP_MOUNT_FRAME = 560;
/** The frame S2 starts: the app is fully in place and at full opacity. */
export const APP_READY_FRAME = 600;

export interface AppReveal {
  mounted: boolean;
  /** 0..1 */
  opacity: number;
  /** extra vertical offset in LOGICAL px (positive = lower) */
  dy: number;
}

/** 12a placeholder reveal: the window fades in and rises 48 px between f560 and f599. 12c replaces it with the dial match cut. */
export function appReveal(frame: number): AppReveal {
  if (frame < APP_MOUNT_FRAME) return { mounted: false, opacity: 0, dy: 0 };
  const t = clamp01((frame - APP_MOUNT_FRAME) / (APP_READY_FRAME - APP_MOUNT_FRAME));
  const e = easeOutCubic(t);
  return { mounted: true, opacity: e, dy: (1 - e) * 48 };
}

/** Opacity of the grid paper on the stage: only S1 (fading out f540-599) and S9 (BIBLE 5). */
export function gridOpacity(frame: number): number {
  if (frame >= 300 && frame < 600) return 1 - clamp01((frame - 540) / 59);
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
