// Film grain: 3% opacity, re-seeded every frame, fully deterministic.
//
// The noise is an SVG feTurbulence whose `seed` is a pure function of the frame (seeded PRNG, never Math.random), turned to grey.
// Put it on top of the whole stage, above the camera, below nothing. STAGE space.

import React, { useId } from "react";
import { useCurrentFrame } from "remotion";
import { STAGE } from "../config/timeline";
import { rand } from "../lib/prng";

export interface GrainProps {
  /** Opacity 0..1. Default 0.03 (BIBLE 4.4). */
  opacity?: number;
  /** Noise frequency. Higher = finer grain. Default 0.85. */
  frequency?: number;
}

/** The turbulence seed of a frame (an integer, stable for a given frame). */
export function grainSeed(frame: number): number {
  return Math.floor(rand(frame * 31 + 11) * 100000);
}

export const Grain: React.FC<GrainProps> = ({ opacity = 0.03, frequency = 0.85 }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={STAGE.w}
      height={STAGE.h}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity, mixBlendMode: "overlay" }}
    >
      <filter id={`grain-${id}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={2} seed={grainSeed(frame)} stitchTiles="stitch" />
        {/* to grey, full alpha */}
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
      </filter>
      <rect width={STAGE.w} height={STAGE.h} filter={`url(#grain-${id})`} />
    </svg>
  );
};
