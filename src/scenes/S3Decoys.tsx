// S3 assembly (patch 14a). Concatenates the three parts; patches 14b and 14c replace S3b / S3c, and may rewrite this file.
//   S3a  f1500-1679  "Containment, measured", the hand-over to the explainer, the box, its six chips, the decoys   - patch 14a
//   S3b  f1680-1929  the module reads the decoys; the exfil attempt and the refusal at the egress wall               - patch 14b
//   S3c  f1930-2099  the teardown audit and its stamp, the hand-back to the app, the seal, the swing to the nav       - patch 14c
// Keyframes and waypoints are concatenated in this order, so each part's first entry must come after the previous part's last one.
// The app scrim (dimmed 55 %, blurred 6 px: s3/shared.tsx) and the box (s3/S3Box.tsx, the one container all three parts act on) are drawn here, once, under the three overlays.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../config/camera";
import type { SceneOverlayProps } from "./types";
import { S3A_CAMERA, S3A_CURSOR, S3a } from "./s3/S3a";
import { S3B_CAMERA, S3B_CURSOR, S3b } from "./s3/S3b";
import { S3C_CAMERA, S3C_CURSOR, S3c } from "./s3/S3c";
import { S3Box } from "./s3/S3Box";
import { S3Scrim } from "./s3/shared";

export const S3_CAMERA: readonly CameraKeyframe[] = [...S3A_CAMERA, ...S3B_CAMERA, ...S3C_CAMERA];
export const S3_CURSOR: readonly CursorWaypoint[] = [...S3A_CURSOR, ...S3B_CURSOR, ...S3C_CURSOR];

export const S3Decoys: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S3Scrim frame={frame} />
    <S3Box frame={frame} />
    <S3a frame={frame} />
    <S3b frame={frame} />
    <S3c frame={frame} />
  </>
);
