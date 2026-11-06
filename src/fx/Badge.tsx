// A mono pill with a pulsing dot, for "LIVE", "RECONSTRUCTED FROM LEDGER", "Pattern A - sandboxed code execution" and similar.
//
// "Dumb" like the UI kit: its look is a pure function of its props, so a scene decides when it shows and how the dot breathes:
//   <Badge label={badges.proofLive} tone="bad" pulse={badgePulse(frame)} reveal={badgeReveal(frame, 4980)} />
// - `pulse` 0..1 drives the dot (halo radius and brightness). Use badgePulse(frame, period) for a steady breath.
// - `reveal` 0..1 draws the pill on through a left-to-right mask (a mask, not a fade). Use badgeReveal(frame, startFrame).
// - `tone` is a STATUS, except "accent" (the brand crimson) and "mute": "ok" contained, "bad" live / flagged, "warn" needs a human,
//   "info" neutral.
// Pill text is mono, at least 20 px (BIBLE 4.2). The text must come from copy.ts (badges) or from evidence selectors.

import React from "react";
import { alpha, edgeLight, fonts, glassDeep, shade, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";

export type BadgeTone = "accent" | "ok" | "bad" | "warn" | "info" | "mute";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** 0..1: how bright the dot is and how far its halo spreads. Default 1. */
  pulse?: number;
  /** 0..1: how much of the pill is drawn (left to right). Default 1. */
  reveal?: number;
  /** Show the dot. Default true. */
  dot?: boolean;
  /** Font size in px; at least 20. Default 22. */
  size?: number;
}

const COLORS: Record<BadgeTone, string> = {
  accent: theme.accent,
  ok: theme.ok,
  bad: theme.bad,
  warn: theme.warn,
  info: theme.info,
  mute: theme.ink3,
};

/** A steady breath for the dot: 0..1, a cosine with `period` frames per breath (default 45). Pure. */
export function badgePulse(frame: number, period = 45): number {
  return 0.5 + 0.5 * Math.cos((Math.PI * 2 * frame) / Math.max(1, period));
}

/** 0..1 reveal of a badge that starts at `startFrame` and takes `frames` (default 14), signature ease. Pure. */
export function badgeReveal(frame: number, startFrame: number, frames = 14): number {
  return signature(clamp01((frame - startFrame) / Math.max(1, frames)));
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = "accent", pulse = 1, reveal = 1, dot = true, size = 22 }) => {
  const c = COLORS[tone];
  const fs = Math.max(20, size);
  const p = clamp01(pulse);
  const r = clamp01(reveal);
  if (r <= 0) return null;
  const dotSize = Math.round(fs * 0.42);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: fs * 0.5,
        height: fs * 1.9,
        padding: `0 ${fs * 0.75}px`,
        borderRadius: fs * 1.0,
        border: `1px solid ${alpha(c, 0.55)}`,
        background: `linear-gradient(180deg, ${alpha(c, 0.16)}, ${alpha(c, 0.06)}), ${glassDeep(0.7)}`,
        boxShadow: `0 8px 24px -12px ${shade(0.8)}, 0 1px 0 ${edgeLight(0.06)} inset`,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: fs,
        letterSpacing: "0.04em",
        color: tone === "mute" ? theme.ink2 : theme.ink,
        whiteSpace: "nowrap",
        clipPath: `inset(0 ${(1 - r) * 100}% 0 0 round ${fs}px)`,
        WebkitClipPath: `inset(0 ${(1 - r) * 100}% 0 0 round ${fs}px)`,
      }}
    >
      {dot ? (
        <span style={{ position: "relative", width: dotSize, height: dotSize, flex: "none" }}>
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: dotSize * (1.6 + 1.4 * p),
              height: dotSize * (1.6 + 1.4 * p),
              marginLeft: -(dotSize * (1.6 + 1.4 * p)) / 2,
              marginTop: -(dotSize * (1.6 + 1.4 * p)) / 2,
              borderRadius: "50%",
              background: alpha(c, 0.35 * (1 - 0.6 * p)),
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: c,
              opacity: 0.6 + 0.4 * p,
              boxShadow: `0 0 ${6 + 8 * p}px ${alpha(c, 0.7)}`,
            }}
          />
        </span>
      ) : null}
      <span>{label}</span>
    </div>
  );
};
