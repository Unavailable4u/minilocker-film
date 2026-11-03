// A small data packet: a square glyph with two "data" bars and a trailing streak (patch 08, explainer graphics A).
//
// - STAGE space (1920 x 1080 px). `x`, `y` are the centre of the glyph; the streak trails to its LEFT (packets fly towards +x).
// - Pure and props-driven: it never reads the frame. Motion is linear and belongs to the parent (EgressWall computes `x`
//   from a progress value at PACKET_PX_PER_FRAME). The label, if any, is a prop (an evidence host), never typed here.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01 } from "../lib/ease";

export const PACKET_SIZE = 22;
export const PACKET_STREAK = 72;

export interface PacketProps {
  /** Centre of the glyph, stage px. */
  x: number;
  y: number;
  /** Length of the trailing streak in px. Default 72 (PACKET_STREAK). 0 draws none. */
  streak?: number;
  /** Side of the glyph in px. Default 22. */
  size?: number;
  /** Glyph and streak color. Default theme.ink. */
  color?: string;
  /** 0..1, multiplies everything. Default 1. */
  opacity?: number;
  /** Mono label above the glyph (an evidence host). */
  label?: string;
  /** 0..1 opacity of the label alone. Default 1. */
  labelOpacity?: number;
}

export const Packet: React.FC<PacketProps> = ({
  x,
  y,
  streak = PACKET_STREAK,
  size = PACKET_SIZE,
  color = theme.ink,
  opacity = 1,
  label,
  labelOpacity = 1,
}) => {
  const o = clamp01(opacity);
  if (o <= 0.001) return null;
  const half = size / 2;
  const bar = (top: number, width: number, a: number): React.CSSProperties => ({
    position: "absolute",
    left: -half - width,
    top,
    width,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${alpha(color, a)})`,
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity: o, pointerEvents: "none" }}>
      {streak > 0 ? (
        <>
          <div style={{ ...bar(-1.5, streak, 0.85), height: 3 }} />
          <div style={bar(-9, streak * 0.55, 0.4)} />
          <div style={bar(7, streak * 0.38, 0.3)} />
        </>
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        style={{ position: "absolute", left: -half, top: -half, overflow: "visible" }}
      >
        <rect x="1" y="1" width="20" height="20" rx="5" fill={theme.sunken} stroke={color} strokeWidth="1.5" />
        <line x1="6" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="13" x2="12" y2="13" stroke={alpha(color, 0.65)} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -half - 16,
            transform: "translate(-50%, -100%)",
            whiteSpace: "nowrap",
            fontFamily: fonts.mono,
            fontSize: 20,
            lineHeight: 1.2,
            color: theme.ink2,
            opacity: clamp01(labelOpacity),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
