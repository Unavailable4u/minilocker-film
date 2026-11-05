// STUB (patch 12a). Replaced completely by patch 21. Keeps the film compiling and the barrel stable.
import React from "react";
import { holdShot, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import type { SceneOverlayProps } from "./types";

// patch 25: interim camera for the stub (patch 21 replaces this file): the whole window, then a slow push, so the review sheets are not a frozen corner.
export const S9_CAMERA: readonly CameraKeyframe[] = holdShot(4980, 5099, "fullWindow", { padding: 60, push: 0.04, arrive: 30 });
export const S9_CURSOR: readonly CursorWaypoint[] = [];
export const S9Outro: React.FC<SceneOverlayProps> = () => null;
