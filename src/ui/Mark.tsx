// The MiniLocker Mark. Geometry, stroke widths and opacities are EXACTLY BIBLE Appendix A (frontend/src/ui.tsx):
// a dotted outer ring, two solid rings, a faint core wash and a crimson core dot, in a 32 x 32 viewBox.
// Pure: everything is a function of the props. No hooks, no frame reads.
import React from "react";
import { theme } from "../config/theme";
import { clamp01, easeOutBack, mapRange, signature } from "../lib/ease";

export type MarkMode = "static" | "build" | "collapse";

export interface MarkProps {
  /** Rendered width and height in px. */
  size: number;
  /** 0..1. Ignored when mode is "static". */
  progress?: number;
  mode?: MarkMode;
  /** Ring color. Defaults to ink. */
  color?: string;
  /** Core color. Defaults to the crimson accent. */
  accent?: string;
}

// ---------------------------------------------------------------------------------------------- timing

/** Nominal length of a build or collapse, in frames: one bar at 120 BPM. Use it with markProgress(). */
export const MARK_BUILD_FRAMES = 60;

/** Progress-terms helper: frame -> 0..1 for a build or collapse that starts at `startFrame`. */
export function markProgress(frame: number, startFrame: number, durationFrames: number = MARK_BUILD_FRAMES): number {
  return clamp01((frame - startFrame) / durationFrames);
}

const F = 1 / MARK_BUILD_FRAMES; // one frame, in progress terms (at the nominal duration)

/**
 * When each part of the BUILD happens, as [start, end] in progress terms (0..1).
 * Ring 2 starts exactly 15 frames (a beat) after ring 1, at the nominal MARK_BUILD_FRAMES.
 * The dotted outer ring is last.
 */
export const MARK_BUILD = {
  core: [0, 15 * F],
  ring1: [10 * F, 40 * F],
  /** Offset between ring 1 and ring 2 starting to draw: 15 f, in progress terms. */
  ring2Offset: 15 * F,
  ring2: [25 * F, 55 * F],
  dots: [42 * F, 60 * F],
} as const;

/**
 * When each part of the COLLAPSE happens, as [start, end]. Outermost first: the dotted ring shrinks into the dot,
 * then ring 2, then ring 1. The core gets a small punch as the last ring lands.
 */
export const MARK_COLLAPSE = {
  dots: [0, 0.4],
  ring2: [0.12, 0.62],
  ring1: [0.26, 0.86],
  punch: [0.7, 1],
} as const;

// ---------------------------------------------------------------------------------------------- geometry (Appendix A)

const C = 16; // center
const R_DOTS = 14.8;
const R_RING2 = 10.4;
const R_RING1 = 6;
const R_WASH = 4.4;
const R_DOT = 2.2;

type Range = readonly [number, number];
const within = (p: number, r: Range, easing: (t: number) => number = signature): number =>
  mapRange(p, r[0], r[1], 0, 1, easing);

// ---------------------------------------------------------------------------------------------- component

interface RingProps {
  r: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dash?: string;
  /** 0..1: how much of the ring is drawn, starting at 12 o'clock and going clockwise. 1 = the full circle. */
  draw?: number;
}

/** A ring that can be drawn on as an arc. At draw = 1 it is the exact circle from the source. */
const Ring: React.FC<RingProps> = ({ r, stroke, strokeWidth, opacity, dash, draw = 1 }) => {
  if (opacity <= 0 || draw <= 0 || r <= 0) return null;
  if (draw >= 1) {
    return (
      <circle cx={C} cy={C} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} opacity={opacity} />
    );
  }
  // Partial: an explicit dash of `draw` times the circumference, then a gap longer than the rest of the circle.
  // (Explicit lengths instead of pathLength, so every renderer agrees.) The circle starts at 3 o'clock, so rotate it to start at 12.
  const len = 2 * Math.PI * r;
  return (
    <circle
      cx={C}
      cy={C}
      r={r}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={`${(draw * len).toFixed(4)} ${(len * 2).toFixed(4)}`}
      opacity={opacity}
      transform={`rotate(-90 ${C} ${C})`}
    />
  );
};

export const Mark: React.FC<MarkProps> = ({ size, progress = 1, mode = "static", color, accent }) => {
  const ink = color ?? theme.ink;
  const core = accent ?? theme.accent;
  const p = clamp01(progress);

  // defaults = the finished mark exactly as in Appendix A
  let dotsR = R_DOTS;
  let dotsOpacity = 0.5;
  let ring2R = R_RING2;
  let ring2Opacity = 0.78;
  let ring2Draw = 1;
  let ring1R = R_RING1;
  let ring1Opacity = 1;
  let ring1Draw = 1;
  let coreScale = 1;

  if (mode === "build") {
    coreScale = easeOutBack(within(p, MARK_BUILD.core, (t) => t));
    ring1Draw = within(p, MARK_BUILD.ring1);
    ring2Draw = within(p, MARK_BUILD.ring2);
    dotsOpacity = 0.5 * within(p, MARK_BUILD.dots);
  } else if (mode === "collapse") {
    const d = within(p, MARK_COLLAPSE.dots);
    const r2 = within(p, MARK_COLLAPSE.ring2);
    const r1 = within(p, MARK_COLLAPSE.ring1);
    dotsR = R_DOTS + (R_DOT - R_DOTS) * d;
    dotsOpacity = 0.5 * (1 - d);
    ring2R = R_RING2 + (R_DOT - R_RING2) * r2;
    ring2Opacity = 0.78 * (1 - r2);
    ring1R = R_RING1 + (R_DOT - R_RING1) * r1;
    ring1Opacity = 1 - r1;
    const punch = within(p, MARK_COLLAPSE.punch, (t) => t);
    coreScale = 1 + 0.18 * Math.sin(Math.PI * punch);
  }

  const washOpacity = 0.2 * clamp01(coreScale);

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block", flex: "none" }}>
      <Ring r={dotsR} stroke={ink} strokeWidth={1} dash="1.2 2.4" opacity={dotsOpacity} />
      <Ring r={ring2R} stroke={ink} strokeWidth={1.2} opacity={ring2Opacity} draw={ring2Draw} />
      <Ring r={ring1R} stroke={ink} strokeWidth={1.7} opacity={ring1Opacity} draw={ring1Draw} />
      {coreScale > 0 && (
        <g transform={`translate(${C} ${C}) scale(${coreScale}) translate(${-C} ${-C})`}>
          <circle cx={C} cy={C} r={R_WASH} fill={core} opacity={washOpacity} />
          <circle cx={C} cy={C} r={R_DOT} fill={core} />
        </g>
      )}
    </svg>
  );
};
