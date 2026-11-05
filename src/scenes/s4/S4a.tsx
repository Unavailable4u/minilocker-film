// S4a assembly (patches 15a, 15b, 15c). Concatenates the three parts of S4a; patch 16's S4b follows at f2400 (assembled by S4Rewind.tsx).
//   S4a1  f2100-2219  the underline slides to "Attack Lab", the camera lands, the cursor sweeps the tiles, selects the hero and rides Run     - patch 15a
//   S4a2  f2220-2299  the click on Run, the real steps build, the FileLattice and the first snapshot node, "Real work."                 - patch 15b
//   S4a3  f2300-2399  the wipe command types large, the lattice shatters (f2340), silence and WIPED_0 (f2370), "Everything gone."            - patch 15c
// Keyframes and waypoints are concatenated in this order, so each part's first entry must come after the previous part's last one. S4b (patch 16) starts
// at f2400 and is assembled by S4Rewind.tsx, which concatenates S4A_* and S4B_* and renders both overlays: this file keeps the three names it imports.
//
// The STAGE (S4Stage.tsx: the backing panel, the FileLattice and the snapshot timeline) is one persistent object that belongs to no single part: it is
// mounted here, once, UNDER the parts' own overlays (captions and callouts), and draws from f2240 on (15b, 15c) until patch 16 retires it.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../../config/camera";
import type { SceneOverlayProps } from "../types";
import { S4A1_CAMERA, S4A1_CURSOR, S4a1 } from "./S4a1";
import { S4A2_CAMERA, S4A2_CURSOR, S4a2 } from "./S4a2";
import { S4A3_CAMERA, S4A3_CURSOR, S4a3 } from "./S4a3";
import { S4Stage } from "./S4Stage";

export const S4A_CAMERA: readonly CameraKeyframe[] = [...S4A1_CAMERA, ...S4A2_CAMERA, ...S4A3_CAMERA];
export const S4A_CURSOR: readonly CursorWaypoint[] = [...S4A1_CURSOR, ...S4A2_CURSOR, ...S4A3_CURSOR];

export const S4a: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S4Stage frame={frame} />
    <S4a1 frame={frame} />
    <S4a2 frame={frame} />
    <S4a3 frame={frame} />
  </>
);
