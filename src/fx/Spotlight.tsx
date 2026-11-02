// A specular sweep: a soft diagonal band of light that crosses a region once. Use it on a title, a card or a panel edge.
//
// - Pure: the band position is the signature ease of the frame. STAGE space unless you render it inside <Camera>
//   (then `rect` is in logical px).
// - `rect` is the region the sweep is clipped to (default: the whole 1920 x 1080 stage).

import React from "react";
import { useCurrentFrame } from "remotion";
import { STAGE } from "../config/timeline";
import { clamp01, signature } from "../lib/ease";

export interface SpotlightProps {
  /** Global frame at which the sweep starts. */
  startFrame: number;
  /** Frames the sweep takes to cross. Default 40. */
  durationFrames?: number;
  /** The region to sweep across. Default: the whole stage. */
  rect?: { x: number; y: number; w: number; h: number };
  /** Tilt of the band in degrees from vertical. Default 18. */
  angle?: number;
  /** Band width as a fraction of the region width. Default 0.22. */
  band?: number;
  /** Peak opacity 0..1. Default 0.14. */
  intensity?: number;
  /** Corner radius of the region, for clipping a rounded card. Default 0. */
  radius?: number;
}

export const Spotlight: React.FC<SpotlightProps> = ({
  startFrame,
  durationFrames = 40,
  rect = { x: 0, y: 0, w: STAGE.w, h: STAGE.h },
  angle = 18,
  band = 0.22,
  intensity = 0.14,
  radius = 0,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > startFrame + durationFrames) return null;
  const t = clamp01((frame - startFrame) / Math.max(1, durationFrames));
  const p = signature(t);
  const bandW = rect.w * band;
  // travel from fully left of the region to fully right of it (the band is tilted, so add its slant)
  const slant = Math.tan((angle * Math.PI) / 180) * rect.h;
  const x = -bandW - slant + (rect.w + bandW * 2 + slant * 2) * p;
  const envelope = Math.sin(Math.PI * t); // soft in, soft out
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        overflow: "hidden",
        borderRadius: radius,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: x,
          top: -rect.h * 0.25,
          width: bandW,
          height: rect.h * 1.5,
          transform: `skewX(${-angle}deg)`,
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,1) 50%, rgba(255,255,255,0))",
          opacity: intensity * envelope,
          mixBlendMode: "soft-light",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
};
