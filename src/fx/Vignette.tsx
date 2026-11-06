// A 12% edge vignette over the whole stage (BIBLE 4.4). STAGE space, above the camera.
import React from "react";
import { STAGE } from "../config/timeline";
import { shade } from "../config/theme";

export interface VignetteProps {
  /** Darkness at the corners, 0..1. Default 0.12. */
  strength?: number;
}

export const Vignette: React.FC<VignetteProps> = ({ strength = 0.12 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: STAGE.w,
      height: STAGE.h,
      pointerEvents: "none",
      background: `radial-gradient(ellipse farthest-corner at 50% 50%, ${shade(0)} 52%, ${shade(strength)} 100%)`,
    }}
  />
);
