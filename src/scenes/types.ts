// MiniLocker film: the contract every scene file fulfils (patch 12a).
//
// A scene file exports THREE things, named after its id (S2 shown):
//   S2Work     overlay component: STAGE-space things (captions, badges, callouts, the explainer graphics). It gets the GLOBAL frame.
//   S2_CAMERA  CameraKeyframe[] in GLOBAL frames (see src/config/camera.ts). May be empty.
//   S2_CURSOR  CursorWaypoint[] in GLOBAL frames and LOGICAL window px. May be empty.
// src/scenes/index.ts gathers them; src/MiniLockerFilm.tsx concatenates the arrays and renders the overlays, so it is never edited again.
import type React from "react";
import type { CameraKeyframe } from "../config/camera";
import type { CursorWaypoint } from "../config/camera";

export interface SceneOverlayProps {
  /** The GLOBAL film frame (0..TOTAL-1). Overlays are mounted only while the frame is inside their scene's range. */
  frame: number;
}

export type SceneOverlay = React.FC<SceneOverlayProps>;

export interface SceneModule {
  overlay: SceneOverlay;
  camera: readonly CameraKeyframe[];
  cursor: readonly CursorWaypoint[];
}
