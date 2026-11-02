// The four named springs of the film (BIBLE 4.4 / 5). Pure.
import { spring } from "remotion";

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export const springPresets = {
  /** UI element pop */
  uiPop: { damping: 18, stiffness: 170, mass: 0.9 },
  /** panel / window settle */
  panel: { damping: 22, stiffness: 120, mass: 1 },
  /** virtual camera */
  camera: { damping: 26, stiffness: 90, mass: 1.1 },
  /** tiny settle */
  settle: { damping: 14, stiffness: 220, mass: 1 },
} as const satisfies Record<string, SpringConfig>;

export type SpringPresetName = keyof typeof springPresets;

/**
 * Spring progress from 0 (at or before `startFrame`) toward 1 (at rest).
 * Underdamped presets (uiPop, settle) may overshoot 1 slightly on the way, by design.
 */
export function spr(
  frame: number,
  fps: number,
  startFrame: number,
  preset: SpringPresetName | SpringConfig = "uiPop",
): number {
  const local = frame - startFrame;
  if (local <= 0) return 0;
  const config = typeof preset === "string" ? springPresets[preset] : preset;
  return spring({ frame: local, fps, config });
}
