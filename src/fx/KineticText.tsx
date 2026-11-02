// Staggered masked word reveal (3 frames between words), with an optional underline that draws on. Used for the hook sentence
// and the title.
//
// - Lives in STAGE space: render it OUTSIDE <Camera>, in the global frame space. All frames are global.
// - Each word rises out of its own mask (overflow hidden), word i starting 3 frames after word i-1. Lines (an array) continue
//   the same stagger, so the whole text reads left to right, top to bottom.
// - `endFrame` (optional): the words leave upwards through the mask in the same order, finishing on endFrame.
// - `underline`: the word (or phrase made of whole words) that gets a crimson underline, drawn left to right with the
//   signature ease after the last word has landed (plus `underline.delay` frames). The only glow in this component is on that line.

import React from "react";
import { useCurrentFrame } from "remotion";
import { fonts, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";

export interface KineticUnderline {
  /** The word or whole-word phrase to underline. It must appear in `text`. */
  word: string;
  /** Extra frames after the last word has landed. Default 6. */
  delay?: number;
  /** Frames the line takes to draw. Default 18. */
  frames?: number;
}

export interface KineticTextProps {
  /** One line, or several lines (a line is never wrapped). */
  text: string | readonly string[];
  /** Global frame at which the first word starts to rise. */
  startFrame: number;
  /** Global frame at which the text is gone. Omit to keep it on screen. */
  endFrame?: number;
  /** Font size in px at 1080p. Default 72 (the hook sentence); the title uses 150. */
  fontSize?: number;
  /** "serif" (CMU Serif, default) or "mono". */
  family?: "serif" | "mono";
  weight?: 500 | 700;
  italic?: boolean;
  align?: "left" | "center";
  color?: string;
  /** A word or phrase drawn in accent-ink. */
  highlight?: string;
  underline?: KineticUnderline;
  /** Frames between two words. Default 3 (BIBLE 4.4). */
  stagger?: number;
  /** Frames one word takes to rise. Default 18. */
  riseFrames?: number;
}

const OUT_FRAMES = 12;

interface WordSpec {
  text: string;
  index: number;
  line: number;
  hl: boolean;
  ul: boolean;
}

/** Marks which words fall inside the highlight / underline phrase (matched on whole words). */
function mark(words: string[], phrase: string | undefined): boolean[] {
  const flags = words.map(() => false);
  if (!phrase) return flags;
  const target = phrase.trim().split(/\s+/);
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, j) => words[i + j] === w)) {
      for (let j = 0; j < target.length; j++) flags[i + j] = true;
      return flags;
    }
  }
  return flags;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  startFrame,
  endFrame,
  fontSize = 72,
  family = "serif",
  weight = 700,
  italic = false,
  align = "center",
  color = theme.ink,
  highlight,
  underline,
  stagger = 3,
  riseFrames = 18,
}) => {
  const frame = useCurrentFrame();
  const lines = typeof text === "string" ? [text] : [...text];

  // flatten into words, keeping line numbers and a running index for the stagger
  const specs: WordSpec[] = [];
  const perLine: string[][] = lines.map((l) => l.split(/\s+/).filter((w) => w.length > 0));
  const flat = perLine.flat();
  const hlFlags = mark(flat, highlight);
  const ulFlags = mark(flat, underline?.word);
  if (underline && !ulFlags.some(Boolean)) {
    throw new Error(`KineticText: underline word "${underline.word}" is not in the text`);
  }
  let idx = 0;
  perLine.forEach((words, line) => {
    words.forEach((w) => {
      specs.push({ text: w, index: idx, line, hl: hlFlags[idx], ul: ulFlags[idx] });
      idx++;
    });
  });
  const count = specs.length;

  const allInDone = startFrame + (count - 1) * stagger + riseFrames;
  if (frame < startFrame) return null;
  if (endFrame !== undefined && frame >= endFrame) return null;

  const outStart = endFrame === undefined ? Infinity : endFrame - OUT_FRAMES - (count - 1) * stagger;

  const wordStyle = (s: WordSpec): { y: number } => {
    const inP = signature(clamp01((frame - (startFrame + s.index * stagger)) / riseFrames));
    const outP = signature(clamp01((frame - (outStart + s.index * stagger)) / OUT_FRAMES));
    return { y: (1 - inP) * 108 - outP * 108 };
  };

  const ulDelay = underline?.delay ?? 6;
  const ulFrames = underline?.frames ?? 18;
  const ulP = underline ? signature(clamp01((frame - (allInDone + ulDelay)) / ulFrames)) : 0;
  const ulOut = endFrame === undefined ? 0 : signature(clamp01((frame - (endFrame - OUT_FRAMES)) / OUT_FRAMES));

  const fam = family === "mono" ? fonts.mono : fonts.serif;
  const pad = fontSize * 0.16;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        fontFamily: fam,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        lineHeight: 1.04,
        letterSpacing: family === "serif" ? "-0.012em" : "0",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {perLine.map((words, line) => (
        <div key={line} style={{ display: "flex", flexWrap: "nowrap", columnGap: fontSize * 0.28, justifyContent: align === "center" ? "center" : "flex-start" }}>
          {specs
            .filter((s) => s.line === line)
            .map((s) => {
              const { y } = wordStyle(s);
              return (
                <span key={s.index} style={{ position: "relative", display: "inline-block" }}>
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      // room for descenders inside the mask, without moving the layout
                      padding: `${pad}px 0`,
                      margin: `${-pad}px 0`,
                    }}
                  >
                    <span style={{ display: "block", transform: `translateY(${y}%)`, color: s.hl ? theme.accentInk : undefined }}>
                      {s.text}
                    </span>
                  </span>
                  {s.ul ? (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -fontSize * 0.06,
                        height: Math.max(3, fontSize * 0.045),
                        borderRadius: 2,
                        background: theme.accent,
                        boxShadow: `0 0 ${fontSize * 0.22}px rgba(240,26,73,.55)`,
                        transformOrigin: "0 50%",
                        transform: `scaleX(${ulP * (1 - ulOut)})`,
                      }}
                    />
                  ) : null}
                </span>
              );
            })}
        </div>
      ))}
    </div>
  );
};
