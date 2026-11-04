// GhostContainer: an outlined container that draws itself on, the fresh sandbox the files are restored into (patch 09, BIBLE 11 B).
//
// - Positioned in STAGE px by `x`, `y`, size `w` x `h`. Children are laid out in BOX-LOCAL px (origin = the box's top-left corner).
// - Pure and props-driven: nothing here reads the frame. `draw` is a LINEAR 0..1 (the scene gives it 24 frames, BIBLE 11 B); the
//   component applies the signature ease. The outline, the corner ticks and a fainter echo outline draw on from the top-left,
//   clockwise; a faint blue wash and the label chip arrive with them.
// - It is a ghost on purpose: a hairline, an echo and a wash of ok-blue, no solid fill. The word on the chip is a prop
//   (copy.gfxB.freshSandbox).
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";
import { MONO_ADVANCE, estimateWidth } from "../fx/util";

export const GHOST_RADIUS = 22;
/** Frames the film gives `draw` (BIBLE 11 B). */
export const GHOST_DRAW_FRAMES = 24;

const LINE = 1.5;
const ECHO = 9; // px the echo outline sits outside the real one
const CORNER_ARM = 26;
const CORNER_OFFSET = 14;
const CHIP_FONT = 20;
const CHIP_H = 34;

export interface GhostContainerProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 linear draw-on. */
  draw: number;
  /** The word on the chip (copy.gfxB.freshSandbox). */
  label: string;
  /** Interior slot, box-local px. */
  children?: React.ReactNode;
}

function roundedPerimeter(w: number, h: number, r: number): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

function roundedPath(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

export const GhostContainer: React.FC<GhostContainerProps> = ({ x, y, w, h, draw, label, children }) => {
  const d = signature(clamp01(draw));
  if (d <= 0.001) return null;
  const perim = roundedPerimeter(w, h, GHOST_RADIUS);
  const echoPerim = roundedPerimeter(w + 2 * ECHO, h + 2 * ECHO, GHOST_RADIUS + ECHO);
  const arm = CORNER_ARM;
  const off = CORNER_OFFSET;
  const corners = [
    `M ${-off} ${-off + arm} V ${-off} H ${-off + arm}`,
    `M ${w + off - arm} ${-off} H ${w + off} V ${-off + arm}`,
    `M ${w + off} ${h + off - arm} V ${h + off} H ${w + off - arm}`,
    `M ${-off + arm} ${h + off} H ${-off} V ${h + off - arm}`,
  ];
  const chipW = Math.round(estimateWidth(label, CHIP_FONT, MONO_ADVANCE) + 32);
  const chipP = signature(clamp01((draw - 0.4) / 0.6));

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: GHOST_RADIUS,
          background: alpha(theme.ok, 0.045),
          boxShadow: `inset 0 0 60px ${alpha(theme.ok, 0.06)}`,
          opacity: d,
        }}
      />
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path
          d={roundedPath(-ECHO, -ECHO, w + 2 * ECHO, h + 2 * ECHO, GHOST_RADIUS + ECHO)}
          fill="none"
          stroke={alpha(theme.ok, 0.28)}
          strokeWidth={LINE}
          strokeDasharray={`${echoPerim * d} ${echoPerim}`}
        />
        <path
          d={roundedPath(0, 0, w, h, GHOST_RADIUS)}
          fill="none"
          stroke={theme.ink2}
          strokeWidth={LINE}
          strokeDasharray={`${perim * d} ${perim}`}
        />
        {corners.map((c, i) => (
          <path
            key={i}
            d={c}
            fill="none"
            stroke={theme.ink3}
            strokeWidth={LINE}
            strokeLinecap="square"
            strokeDasharray={`${arm * 2 * d} ${arm * 2}`}
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>{children}</div>
      {chipP > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 28,
            top: -CHIP_H / 2,
            width: chipW,
            height: CHIP_H,
            clipPath: `inset(0 ${(1 - chipP) * 100}% 0 0)`,
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `${LINE}px solid ${alpha(theme.ok, 0.7)}`,
              borderRadius: 8,
              background: theme.sheet,
              fontFamily: fonts.mono,
              fontSize: CHIP_FONT,
              lineHeight: 1,
              color: theme.ok,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </div>
      ) : null}
    </div>
  );
};
