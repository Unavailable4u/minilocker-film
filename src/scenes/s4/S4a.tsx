// S4a assembly (patch 15a). Concatenates the parts of S4a; patches 15b and 15c add S4a2 / S4a3 and resend this file.
//   S4a1  f2100-2219  the underline slides to "Attack Lab", the camera lands, the cursor sweeps the tiles, selects the hero and rides Run     - patch 15a
//   S4a2  f2220-2299  the click on Run, the real steps build, the FileLattice and the first snapshot node, "The agent works."                 - patch 15b
//   S4a3  f2300-2399  the wipe command types large, the lattice shatters (f2340), silence and WIPED_0 (f2370), "Everything gone."            - patch 15c
// Keyframes and waypoints are concatenated in this order, so each part's first entry must come after the previous part's last one. S4b (patch 16) starts
// at f2400 and is assembled by S4Rewind.tsx, which concatenates S4A_* and S4B_* and renders both overlays: this file keeps the three names it imports.
import React from "react";
import type { CameraKeyframe, CursorWaypoint } from "../../config/camera";
import type { SceneOverlayProps } from "../types";
import { S4A1_CAMERA, S4A1_CURSOR, S4a1 } from "./S4a1";

export const S4A_CAMERA: readonly CameraKeyframe[] = [...S4A1_CAMERA];
export const S4A_CURSOR: readonly CursorWaypoint[] = [...S4A1_CURSOR];

export const S4a: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S4a1 frame={frame} />
  </>
);
