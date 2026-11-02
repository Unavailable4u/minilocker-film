// The film's caption: ONE line (or an explicit two-line stack), bottom-centre safe area, CMU Serif 700, a masked line-rise reveal.
//
// - Lives in STAGE space (1920 x 1080): render it OUTSIDE <Camera>, in the global frame space (not inside a <Sequence> with
//   a non-zero `from`; startFrame / endFrame are global frames).
// - The line rises through a mask (overflow hidden) with the signature ease; it leaves the same way, upwards, during the last
//   12 frames before endFrame. At endFrame it is gone. It is never just faded.
// - Size: `size` (default 72, clamped to type.captionMin 56 .. type.captionMax 76). A line that would not fit in the safe width
//   shrinks towards 56 px; if it still does not fit, give `text` as two lines (an array) instead.
// - `highlight` is the key word or phrase, drawn in accent-ink. `sub` is an optional mono sub-line under the caption.

import React from "react";
import { useCurrentFrame } from "remotion";
import { fonts, layout, theme, type } from "../config/theme";
import { STAGE } from "../config/timeline";
import { SERIF_ADVANCE, checkRange, estimateWidth, inOut, splitHighlight } from "./util";

export interface CaptionProps {
  /** One line, or an array of lines (use two only when one line cannot fit). */
  text: string | readonly string[];
  /** The key word or phrase inside `text` that is drawn in accent-ink. */
  highlight?: string;
  /** Optional mono sub-line (20+ px). */
  sub?: string;
  /** Global frame at which the reveal starts. */
  startFrame: number;
  /** Global frame at which the caption is gone (it starts leaving 12 frames earlier). */
  endFrame: number;
  /** Font size at 1080p. Default 72; clamped to 56..76. */
  size?: number;
}

const IN_FRAMES = 20;
const OUT_FRAMES = 12;
const LINE_STAGGER = 4;

export const Caption: React.FC<CaptionProps> = ({ text, highlight, sub, startFrame, endFrame, size = 72 }) => {
  checkRange("Caption", startFrame, endFrame);
  const frame = useCurrentFrame();
  if (frame < startFrame || frame >= endFrame) return null;

  const lines = typeof text === "string" ? [text] : [...text];
  const safeW = STAGE.w - 2 * layout.safeMargin;
  const longest = lines.reduce((m, l) => Math.max(m, estimateWidth(l, 1, SERIF_ADVANCE)), 0);
  const wanted = Math.min(type.captionMax, Math.max(type.captionMin, size));
  const fit = longest > 0 ? safeW / longest : wanted;
  const fontSize = Math.max(type.captionMin, Math.min(wanted, Math.floor(fit)));

  const subSize = 24;
  const subLineIn = (lines.length) * LINE_STAGGER;

  const row = (content: React.ReactNode, i: number, rowSize: number, extra: React.CSSProperties) => {
    const { inP, outP } = inOut(frame, startFrame + i * LINE_STAGGER, endFrame, IN_FRAMES, OUT_FRAMES);
    // 0 -> 105% below the mask, rest at 0, leave to -105% above
    const y = (1 - inP) * 105 - outP * 105;
    return (
      <div
        key={i}
        style={{
          overflow: "hidden",
          // room for descenders and the text shadow inside the mask, without moving the layout
          padding: `${rowSize * 0.14}px ${rowSize * 0.4}px`,
          margin: `${-rowSize * 0.14}px ${-rowSize * 0.4}px`,
          lineHeight: 1.1,
        }}
      >
        <div style={{ transform: `translateY(${y}%)`, willChange: "transform", ...extra }}>{content}</div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: STAGE.w,
        bottom: layout.captionBottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: fontSize * 0.1,
        pointerEvents: "none",
      }}
    >
      {lines.map((line, i) =>
        row(
          splitHighlight(line, highlight).map((piece, j) => (
            <span key={j} style={piece.hl ? { color: theme.accentInk } : undefined}>
              {piece.text}
            </span>
          )),
          i,
          fontSize,
          {
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize,
            letterSpacing: "-0.01em",
            color: theme.ink,
            whiteSpace: "nowrap",
            textShadow: "0 2px 28px rgba(0,0,0,.65), 0 1px 2px rgba(0,0,0,.5)",
          },
        ),
      )}
      {sub
        ? row(sub, subLineIn, subSize, {
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: subSize,
            letterSpacing: "0.02em",
            color: theme.ink2,
            whiteSpace: "nowrap",
            textShadow: "0 1px 12px rgba(0,0,0,.7)",
          })
        : null}
    </div>
  );
};
