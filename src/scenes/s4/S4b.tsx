// S4b assembly (patch 16, built in six parts, 16a-16f). Concatenates the parts of S4b; patch 16's parts are applied one on top of the other, each resending this file:
//   S4b1  f2400-2459  "Rewind.": the slab retires, the greyed and the blue "rewound" nodes, the pulse, the fresh sandbox (GhostContainer)       - patch 16a
//   S4b2  f2460-2579  the return: the shards come back with overshoot, the HashTile locks, "N files re-hashed - all matched"                      - patch 16b
//   S4b3  f2580-2699  the cat: the restored line in stage space, the stage retires, the camera moves to the detail pane                           - patch 16c
//   S4b4  f2700-2819  the checks light, the verdict tile, the donut, the stamp (camera and scroll only; nothing in stage space)                                - patch 16d
//   S4b5  f2820-3029  the HashChain of the ledger, "Undone, not erased.", "Verify ledger", the seal                                                  - patch 16e
//   S4b6  f3030-3299  the proof: the clip or the reconstruction, three numerals, the hand-off on the beat f3300                                  - patch 16f (not yet)
// Keyframes and waypoints are concatenated in this order, so each part's first entry must come after the previous part's last one. The stage object
// (S4Stage.tsx) is mounted by S4a.tsx under every overlay, and drawn from f2240 on until 16c retires it (f2655-2668).
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../../config/camera";
import type { SceneOverlayProps } from "../types";
import { S4B1_CAMERA, S4B1_CURSOR, S4b1 } from "./S4b1";
import { S4B2_CAMERA, S4B2_CURSOR, S4b2 } from "./S4b2";
import { S4B3_CAMERA, S4B3_CURSOR, S4b3 } from "./S4b3";
import { S4B4_CAMERA, S4B4_CURSOR } from "./S4b4";
import { S4B5_CAMERA, S4B5_CURSOR, S4b5 } from "./S4b5";

export const S4B_CAMERA: readonly CameraKeyframe[] = [...S4B1_CAMERA, ...S4B2_CAMERA, ...S4B3_CAMERA, ...S4B4_CAMERA, ...S4B5_CAMERA];
export const S4B_CURSOR: readonly CursorWaypoint[] = [...S4B1_CURSOR, ...S4B2_CURSOR, ...S4B3_CURSOR, ...S4B4_CURSOR, ...S4B5_CURSOR];

export const S4b: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S4b1 frame={frame} />
    <S4b2 frame={frame} />
    <S4b3 frame={frame} />
    <S4b5 frame={frame} />
  </>
);
