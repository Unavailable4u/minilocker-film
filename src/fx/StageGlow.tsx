// The film stage's ambient light: one soft crimson radial that drifts slowly (BIBLE 4: rgba(255,32,82,.08-.14)).
// STAGE space, fills its parent. Pure: the drift and the breath are sines of the frame (no randomness).
import React from "react";
import { useCurrentFrame } from "remotion";
import { STAGE } from "../config/timeline";
import { theme } from "../config/theme";

export interface StageGlowProps {
  /** Scale on the whole effect, 0..1. Default 1. */
  opacity?: number;
}

export const StageGlow: React.FC<StageGlowProps> = ({ opacity = 1 }) => {
  const frame = useCurrentFrame();
  // two slow periods (frames), so the pattern does not repeat visibly inside the 5100-frame film
  const x = STAGE.w * (0.5 + 0.12 * Math.sin((Math.PI * 2 * frame) / 600 + 0.4));
  const y = STAGE.h * (0.46 + 0.08 * Math.sin((Math.PI * 2 * frame) / 840 + 1.9));
  const a = 0.11 + 0.03 * Math.sin((Math.PI * 2 * frame) / 240); // .08 .. .14
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        background: `radial-gradient(ellipse 980px 620px at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(${theme.glowRgb},${a.toFixed(4)}), transparent 70%)`,
      }}
    />
  );
};
