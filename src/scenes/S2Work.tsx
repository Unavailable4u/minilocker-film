// S2 assembly (patch 13a). Concatenates the three parts; patches 13b and 13c replace S2b / S2c, and may rewrite this file.
//   S2a  f600-780    the setup: the form is filled in and Run is pressed (camera, cursor, badge, flow strip, first caption)  - patch 13a
//   S2b  f760-1200   the run: the stream and the terminal, the inference chip                                                 - patch 13b
//   S2c  f1200-1499  the finish: the two callouts, the blast panel, the closing caption, the whip to S3                      - patch 13c
// Keyframes and waypoints are concatenated in this order, so each part's first entry must come after the previous part's last one.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../config/camera";
import type { SceneOverlayProps } from "./types";
import { S2A_CAMERA, S2A_CURSOR, S2a } from "./s2/S2a";
import { S2B_CAMERA, S2B_CURSOR, S2b } from "./s2/S2b";
import { S2C_CAMERA, S2C_CURSOR, S2c } from "./s2/S2c";

export const S2_CAMERA: readonly CameraKeyframe[] = [...S2A_CAMERA, ...S2B_CAMERA, ...S2C_CAMERA];
export const S2_CURSOR: readonly CursorWaypoint[] = [...S2A_CURSOR, ...S2B_CURSOR, ...S2C_CURSOR];

export const S2Work: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S2a frame={frame} />
    <S2b frame={frame} />
    <S2c frame={frame} />
  </>
);
