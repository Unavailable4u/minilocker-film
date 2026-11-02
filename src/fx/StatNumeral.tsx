// Big mono numerals that count up (or down) and lock on the final value.
//
// - Pure and frame-driven: render it anywhere (stage space or inside the camera); startFrame is a global frame.
// - The value moves from `from` to `value` over `durationFrames` with the signature ease. While it is counting, digits that
//   already equal the final value from the left are "locked" (full ink); the rest are dimmed. When it lands, the whole numeral
//   gives a small 2.5% punch (BIBLE 4.4) and every digit is locked.
// - Tabular figures: CMU Typewriter Text is monospaced, and font-variant-numeric is set as well, so the width never jitters.
// - The numeral shows only what you pass in. Measured values must come from src/data/select.ts (evidence rule); a null
//   measurement must be shown as "not measured" by the caller, not as 0.

import React from "react";
import { useCurrentFrame } from "remotion";
import { fonts, theme } from "../config/theme";
import { clamp01, signature, stepPulse } from "../lib/ease";

export interface StatNumeralProps {
  /** The final value. */
  value: number;
  /** The start value. Default 0. */
  from?: number;
  /** Unit drawn after the number, smaller (for example "MB", "%", "/ 15"). */
  unit?: string;
  /** Global frame at which the count starts. Before it, `from` is shown. */
  startFrame: number;
  /** Frames the count takes. Default 45. */
  durationFrames?: number;
  /** Digits after the decimal point. Default 0. */
  decimals?: number;
  /** Group thousands with a thin separator (a comma). Default false. */
  group?: boolean;
  /** Font size in px. Default 120. */
  size?: number;
  color?: string;
  /** Hide the numeral before startFrame (default false: it shows `from`). */
  hideBefore?: boolean;
}

function format(v: number, decimals: number, group: boolean): string {
  const fixed = v.toFixed(decimals);
  if (!group) return fixed;
  const [int, frac] = fixed.split(".");
  const neg = int.startsWith("-");
  const digits = neg ? int.slice(1) : int;
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return (neg ? "-" : "") + out + (frac !== undefined ? "." + frac : "");
}

export const StatNumeral: React.FC<StatNumeralProps> = ({
  value,
  from = 0,
  unit,
  startFrame,
  durationFrames = 45,
  decimals = 0,
  group = false,
  size = 120,
  color = theme.ink,
  hideBefore = false,
}) => {
  const frame = useCurrentFrame();
  if (hideBefore && frame < startFrame) return null;

  const t = clamp01((frame - startFrame) / Math.max(1, durationFrames));
  const current = from + (value - from) * signature(t);
  const done = t >= 1;
  const finalStr = format(value, decimals, group);
  const curStr = done ? finalStr : format(current, decimals, group);

  // compare right-aligned so 99 -> 100 lines up: pad the current string on the left to the final length
  const width = Math.max(finalStr.length, curStr.length);
  const cur = curStr.padStart(width, " ");
  const fin = finalStr.padStart(width, " ");
  let lockedUpTo = 0; // number of leading characters that already match the final string
  while (lockedUpTo < width && cur[lockedUpTo] === fin[lockedUpTo]) lockedUpTo++;

  const punch = 1 + 0.025 * stepPulse(frame, startFrame + durationFrames, 8);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: size * 0.12,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        color,
        transform: `scale(${punch})`,
        transformOrigin: "0 100%",
        whiteSpace: "pre",
      }}
    >
      <span>
        {cur.split("").map((ch, i) => (
          <span key={i} style={{ opacity: done || i < lockedUpTo ? 1 : 0.55 }}>
            {ch}
          </span>
        ))}
      </span>
      {unit ? (
        <span style={{ fontSize: size * 0.34, fontWeight: 500, letterSpacing: "0.02em", color: theme.ink2 }}>{unit}</span>
      ) : null}
    </div>
  );
};
