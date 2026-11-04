// S4 assembly (patch 12a). Concatenates the two halves; patches 15 and 16 replace S4a / S4b, and 15 may rewrite this file.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../config/camera";
import type { SceneOverlayProps } from "./types";
import { S4A_CAMERA, S4A_CURSOR, S4a } from "./s4/S4a";
import { S4B_CAMERA, S4B_CURSOR, S4b } from "./s4/S4b";

export const S4_CAMERA: readonly CameraKeyframe[] = [...S4A_CAMERA, ...S4B_CAMERA];
export const S4_CURSOR: readonly CursorWaypoint[] = [...S4A_CURSOR, ...S4B_CURSOR];

export const S4Rewind: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S4a frame={frame} />
    <S4b frame={frame} />
  </>
);
