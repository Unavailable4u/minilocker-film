// A radial bloom that pulses. BIBLE 4.4: glow is only for the accent underline, the dial and the decoys, so use it sparingly.
//
// - STAGE space (or inside <Camera> in logical px: it is just a positioned element, `x`/`y` are in the space it is rendered in).
// - Pure: the pulse is a cosine of the frame, so frame N always looks the same.
// - `period` is the length of one breath in frames: use a beat multiple (30 = two beats, 60 = one bar) so it stays on the music.

import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";

export interface GlowProps {
  /** Centre of the bloom, in the space the element is rendered in. */
  x: number;
  y: number;
  /** Radius of the bloom in px. Default 320. */
  radius?: number;
  /** A CSS color, default the crimson accent. */
  color?: string;
  /** Peak opacity 0..1. Default 0.35. */
  intensity?: number;
  /** Frames per breath. Default 60 (one bar). */
  period?: number;
  /** How deep the breath goes: 0 = steady, 1 = from nothing to full. Default 0.4. */
  depth?: number;
  /** Frame at which the bloom fades in (over `fadeFrames`). Default 0 (already there). */
  startFrame?: number;
  /** Frame at which it has faded out (over `fadeFrames`). Omit to keep it. */
  endFrame?: number;
  fadeFrames?: number;
}

export const Glow: React.FC<GlowProps> = ({
  x,
  y,
  radius = 320,
  color = theme.accent,
  intensity = 0.35,
  period = 60,
  depth = 0.4,
  startFrame = 0,
  endFrame,
  fadeFrames = 15,
}) => {
  const frame = useCurrentFrame();
  const inP = signature(clamp01((frame - startFrame) / Math.max(1, fadeFrames)));
  const outP = endFrame === undefined ? 1 : 1 - signature(clamp01((frame - (endFrame - fadeFrames)) / Math.max(1, fadeFrames)));
  const env = inP * outP;
  if (env <= 0.001) return null;
  const breath = 0.5 + 0.5 * Math.cos((Math.PI * 2 * (frame - startFrame)) / Math.max(1, period));
  const o = intensity * env * (1 - depth + depth * breath);
  return (
    <div
      style={{
        position: "absolute",
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        pointerEvents: "none",
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
        opacity: o,
        mixBlendMode: "screen",
      }}
    />
  );
};
