// LimitsCard: "Said plainly", the three limits of S8 (patch 10, BIBLE 11 C).
//
// - Positioned in STAGE px by `x`, `y` (top-left of the card; default centred horizontally). The card is LIMITS_W (1440) wide.
// - Pure and props-driven: nothing here reads the frame. A scene passes 0..1 progress values (`lineProgress[i]`, optionally
//   `titleProgress` and `footnoteProgress`). No CSS transitions, no timers, no randomness.
// - Every word is a prop: the heading and the footnote come from copy.gfxC (limitsTitle, limitsFootnote), the lines from copy.s8.limits.
// - A thin vermilion rule with diagonal hatching runs down the left side, one segment per line, growing from the top as the line arrives.
//   Vermilion with hatching is the film's "flagged" look (status color, never the accent): these are the product's own flagged limits.
// - Serif 40 px lines, each lifted out of its own mask; a mono footnote that names the file of the repository (SECURITY.md).
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { STAGE } from "../config/timeline";
import { clamp01, signature } from "../lib/ease";

export const LIMITS_W = 1440;
export const LIMITS_LINE_H = 104;
export const LIMITS_TITLE_H = 60;
const RULE_W = 10;
const TEXT_X = 46;
const LINE_FONT = 40;
const LINE = 1.5;

export interface LimitsCardProps {
  /** The heading (copy.gfxC.limitsTitle). */
  title: string;
  /** The limits, in order (copy.s8.limits). */
  lines: readonly string[];
  /** Mono footnote under the lines (copy.gfxC.limitsFootnote). */
  footnote: string;
  /** 0..1 per line, same length as `lines`. */
  lineProgress: readonly number[];
  /** 0..1, the heading. Default 1. */
  titleProgress?: number;
  /** 0..1, the footnote. Default 1. */
  footnoteProgress?: number;
  /** Top-left corner in stage px. Default: centred horizontally, y = 270. */
  x?: number;
  y?: number;
}

/** Height of the card box for `count` lines. */
export function limitsCardHeight(count: number): number {
  return LIMITS_TITLE_H + count * LIMITS_LINE_H + 24 + 34;
}

const RULE_BG =
  `repeating-linear-gradient(135deg, ${theme.bad} 0 2px, transparent 2px 6px), ${alpha(theme.bad, 0.16)}`;

export const LimitsCard: React.FC<LimitsCardProps> = ({
  title,
  lines,
  footnote,
  lineProgress,
  titleProgress = 1,
  footnoteProgress = 1,
  x = (STAGE.w - LIMITS_W) / 2,
  y = 270,
}) => {
  if (lines.length === 0) throw new Error("LimitsCard: needs at least one line");
  if (lineProgress.length !== lines.length) {
    throw new Error(`LimitsCard: lineProgress needs ${lines.length} values (one per line), got ${lineProgress.length}`);
  }
  const tp = signature(clamp01(titleProgress));
  const fp = signature(clamp01(footnoteProgress));
  const total = limitsCardHeight(lines.length);
  const linesTop = LIMITS_TITLE_H;

  return (
    <div style={{ position: "absolute", left: x, top: y, width: LIMITS_W, height: total, pointerEvents: "none" }}>
      {/* heading */}
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          top: 0,
          height: LIMITS_TITLE_H,
          display: "flex",
          alignItems: "center",
          fontFamily: fonts.serif,
          fontWeight: 700,
          fontSize: 26,
          color: theme.ink3,
          fontVariantCaps: "all-small-caps",
          letterSpacing: "0.1em",
          opacity: tp,
          transform: `translateY(${(1 - tp) * 10}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>

      {/* lines */}
      {lines.map((text, i) => {
        const lp = clamp01(lineProgress[i]);
        const seg = signature(clamp01(lp / 0.5));
        const rise = signature(clamp01((lp - 0.15) / 0.85));
        const top = linesTop + i * LIMITS_LINE_H;
        return (
          <React.Fragment key={i}>
            {seg > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top,
                  width: RULE_W,
                  height: LIMITS_LINE_H,
                  background: RULE_BG,
                  borderLeft: `${LINE}px solid ${theme.bad}`,
                  boxSizing: "border-box",
                  transformOrigin: "top center",
                  transform: `scaleY(${seg})`,
                }}
              />
            ) : null}
            {lp > 0.001 ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: TEXT_X,
                    top,
                    width: LIMITS_W - TEXT_X,
                    height: LIMITS_LINE_H,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: LIMITS_LINE_H,
                      display: "flex",
                      alignItems: "center",
                      fontFamily: fonts.serif,
                      fontWeight: 700,
                      fontSize: LINE_FONT,
                      lineHeight: 1.2,
                      letterSpacing: "-0.01em",
                      color: theme.ink,
                      whiteSpace: "nowrap",
                      opacity: rise,
                      transform: `translateY(${(1 - rise) * 44}px)`,
                    }}
                  >
                    {text}
                  </div>
                </div>
                {i < lines.length - 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: TEXT_X,
                      top: top + LIMITS_LINE_H - LINE / 2,
                      width: (LIMITS_W - TEXT_X) * seg,
                      height: LINE,
                      background: theme.rule,
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* footnote */}
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          top: linesTop + lines.length * LIMITS_LINE_H + 24,
          fontFamily: fonts.mono,
          fontWeight: 500,
          fontSize: 22,
          lineHeight: "28px",
          color: theme.ink3,
          opacity: fp,
          transform: `translateY(${(1 - fp) * 8}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {footnote}
      </div>
    </div>
  );
};
