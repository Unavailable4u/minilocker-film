// STUB (patch 14a). Replaced by patch 14b: f1680-1929, the hostile module reaches for the decoys (the tiles turn amber with the real ledger lines,
// callout "Reading one rings the alarm" f1700), then the exfil attempt (Packet, EgressWall, refusal, caption "It tried to phone home. Refused." f1800,
// callout "Allowlist only" f1840). 14b's first camera keyframe and first overlay item start at f1680 or later; see s3/shared.tsx for the layout.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../../config/camera";
import type { SceneOverlayProps } from "../types";

export const S3B_CAMERA: readonly CameraKeyframe[] = [];
export const S3B_CURSOR: readonly CursorWaypoint[] = [];
export const S3b: React.FC<SceneOverlayProps> = () => null;
