// Barrel for every scene (patch 12a). MiniLockerFilm.tsx imports ONLY from here: replacing a scene file never requires touching it.
// To add a scene export, add it to the lists below; the film derives the camera, the cursor and the overlays from them.
import type { CameraKeyframe, CursorWaypoint } from "../config/camera";
import { kf } from "../config/camera";
import type { SceneKey } from "../config/timeline";
import type { SceneOverlay } from "./types";
import { S0Hook, S0_CAMERA, S0_CURSOR } from "./S0Hook";
import { S1Title, S1_CAMERA, S1_CURSOR } from "./S1Title";
import { S2Work, S2_CAMERA, S2_CURSOR } from "./S2Work";
import { S3Decoys, S3_CAMERA, S3_CURSOR } from "./S3Decoys";
import { S4Rewind, S4_CAMERA, S4_CURSOR } from "./S4Rewind";
import { S5Page, S5_CAMERA, S5_CURSOR } from "./S5Page";
import { S6Evidence, S6_CAMERA, S6_CURSOR } from "./S6Evidence";
import { S7Value, S7_CAMERA, S7_CURSOR } from "./S7Value";
import { S8Vultr, S8_CAMERA, S8_CURSOR } from "./S8Vultr";
import { S9Outro, S9_CAMERA, S9_CURSOR } from "./S9Outro";

export * from "./types";
export { S0Hook, S1Title, S2Work, S3Decoys, S4Rewind, S5Page, S6Evidence, S7Value, S8Vultr, S9Outro };

/** The overlay component of each scene (stage-space captions, badges, explainers). */
export const SCENE_OVERLAYS: Record<SceneKey, SceneOverlay> = {
  S0: S0Hook,
  S1: S1Title,
  S2: S2Work,
  S3: S3Decoys,
  S4: S4Rewind,
  S5: S5Page,
  S6: S6Evidence,
  S7: S7Value,
  S8: S8Vultr,
  S9: S9Outro,
};

const concatCamera = (): CameraKeyframe[] => {
  const all = [...S0_CAMERA, ...S1_CAMERA, ...S2_CAMERA, ...S3_CAMERA, ...S4_CAMERA, ...S5_CAMERA, ...S6_CAMERA, ...S7_CAMERA, ...S8_CAMERA, ...S9_CAMERA];
  // The camera needs a keyframe that holds from frame 0; scenes that are still stubs contribute none.
  return all.length === 0 || all[0].frame > 0 ? [kf(0, "fullWindow"), ...all] : all;
};

/** Every scene's keyframes concatenated in film order (global frames). Always has a keyframe at or before frame 0. */
export const FILM_CAMERA: readonly CameraKeyframe[] = concatCamera();

/** Every scene's cursor waypoints concatenated in film order (global frames, logical px). */
export const FILM_CURSOR: readonly CursorWaypoint[] = [
  ...S0_CURSOR,
  ...S1_CURSOR,
  ...S2_CURSOR,
  ...S3_CURSOR,
  ...S4_CURSOR,
  ...S5_CURSOR,
  ...S6_CURSOR,
  ...S7_CURSOR,
  ...S8_CURSOR,
  ...S9_CURSOR,
];
