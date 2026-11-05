// STUB (patch 12a). Replaced completely by patch 20. Keeps the film compiling and the barrel stable.
import React from "react";
import { holdShot, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import type { SceneOverlayProps } from "./types";

// patch 25: interim camera for the stub (patch 20 replaces this file): the whole window, then a slow push, so the review sheets are not a frozen corner.
export const S8_CAMERA: readonly CameraKeyframe[] = holdShot(4560, 4979, "fullWindow", { padding: 60, push: 0.04 });
export const S8_CURSOR: readonly CursorWaypoint[] = [];
export const S8Vultr: React.FC<SceneOverlayProps> = () => null;
