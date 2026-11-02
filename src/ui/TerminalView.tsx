// The terminal surface of the app, as a dumb component: props in, pixels out. It never reads the frame.
//
// Faithful to the app's terminal (frontend/src/Terminal.tsx): always the dark listing (term-bg / term-fg /
// term-dim), CMU Typewriter, ANSI is NOT needed (tones replace it). The window chrome (traffic lights, the
// "sandbox - /workspace" strip, the ledger-event count) is NOT drawn here: the Workspace patch wraps this surface.
//
// Layout rules (so partial text never makes anything jump)
// - Every row is exactly TERM_LINE_PX tall and never wraps: long text is clipped with an ellipsis.
// - The caret is absolutely positioned in `ch` units. It adds no width, and the row count never depends on it
//   (use `caretOn` to blink it; do not drop `caretLine` for that).
// - A "cmd" row draws a dim "$ " prompt itself: `text` is the command only, and caretCol counts the text only.
// - Control characters in text are stripped (as the app does for sandbox output); tabs become 4 spaces.
//
// Scrolling (in ROWS, fractional allowed)
// - tail=false: `scrollOffset` is how many rows the content is scrolled up from the top.
// - tail=true: the newest row rests at the bottom (like a real terminal). `scrollOffset` is then added to that
//   resting position, and is meant to be the spring-eased lag from `tailScrollOffset()` in src/lib/stream.ts (<= 0).

import React from "react";
import { alpha, fonts, theme } from "../config/theme";

export type TermTone = "out" | "cmd" | "err" | "dim";

export interface TermLine {
  text: string;
  tone?: TermTone;
}

export interface TerminalViewProps {
  lines: readonly TermLine[];
  /** Row of the caret. Omit for no caret. May equal lines.length (an empty row below the last line). */
  caretLine?: number;
  /** Column of the caret in characters of that row's text (the "$ " prompt of a cmd row is added automatically). */
  caretCol?: number;
  /** Caret visible right now (blink). Default true. Changing it never changes the layout. */
  caretOn?: boolean;
  /** Rows scrolled up (see the header). */
  scrollOffset: number;
  /** Newest row rests at the bottom. Default false. */
  tail?: boolean;
  width: number;
  height: number;
}

export const TERM_FONT_PX = 15;
export const TERM_LINE_HEIGHT = 1.45;
/** Height of one row in px. */
export const TERM_LINE_PX = TERM_FONT_PX * TERM_LINE_HEIGHT;
/** Padding of the text area (the app uses px-3 py-2 at a 17 px root: 12.75 and 8.5 px). */
export const TERM_PAD_X = 13;
export const TERM_PAD_Y = 9;
/** Prompt drawn before the text of a cmd row. */
export const TERM_PROMPT = "$ ";
/** Advance of CMU Typewriter Text in em (monospaced). */
const ADVANCE_EM = 0.525;

/** How many rows fit in a terminal of this height (used by tail mode). */
export function terminalCapacity(height: number): number {
  return Math.max(1, Math.floor((height - 2 * TERM_PAD_Y) / TERM_LINE_PX));
}

/** Strip control bytes like the app does (\n and \t survive there; here a row is one line, so \n goes too). */
function clean(s: string): string {
  return s.replace(/\t/g, "    ").replace(/[\x00-\x1f\x7f]/g, "");
}

function toneColor(tone: TermTone): string {
  switch (tone) {
    case "err":
      return theme.bad;
    case "dim":
      return theme.termDim;
    case "cmd":
    case "out":
    default:
      return theme.termFg;
  }
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  lines,
  caretLine,
  caretCol = 0,
  caretOn = true,
  scrollOffset,
  tail = false,
  width,
  height,
}) => {
  const hasCaret = caretLine !== undefined && caretLine >= 0;
  const rowCount = Math.max(lines.length, hasCaret ? (caretLine as number) + 1 : 0);
  const capacity = terminalCapacity(height);
  const scrollRows = tail ? Math.max(0, Math.max(0, rowCount - capacity) + scrollOffset) : scrollOffset;

  const innerW = width - 2 * TERM_PAD_X;
  const maxCols = Math.max(1, Math.floor(innerW / (TERM_FONT_PX * ADVANCE_EM)));

  // render only the rows that can be on screen (plus one on each side while scrolling)
  const first = Math.max(0, Math.floor(scrollRows) - 1);
  const last = Math.min(rowCount - 1, Math.ceil(scrollRows) + capacity + 1);

  const rows: React.ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const line = i < lines.length ? lines[i] : undefined;
    const tone: TermTone = line?.tone ?? "out";
    const isCmd = tone === "cmd";
    const text = line ? clean(line.text) : "";
    const top = (i - scrollRows) * TERM_LINE_PX;
    const showCaret = hasCaret && caretOn && i === caretLine;
    const promptCols = isCmd ? TERM_PROMPT.length : 0;
    const col = Math.min(Math.max(0, caretCol), Math.max(0, maxCols - promptCols - 1));
    rows.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          top,
          width: innerW,
          height: TERM_LINE_PX,
          lineHeight: `${TERM_LINE_PX}px`,
          whiteSpace: "pre",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: toneColor(tone),
        }}
      >
        {isCmd ? <span style={{ color: theme.termDim }}>{TERM_PROMPT}</span> : null}
        {text}
        {showCaret ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: `${promptCols + col}ch`,
              top: 3,
              width: "1ch",
              height: TERM_LINE_PX - 6,
              background: theme.accent,
              boxShadow: `0 0 10px ${alpha(theme.accent, 0.55)}`,
            }}
          />
        ) : null}
      </div>,
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: theme.termBg,
        color: theme.termFg,
        fontFamily: fonts.mono,
        fontSize: TERM_FONT_PX,
        fontWeight: 500,
        tabSize: 4,
        fontVariantLigatures: "none",
      }}
    >
      {/* the text area: rows are clipped at its edges (not at the padding), like the app's xterm */}
      <div
        style={{
          position: "absolute",
          left: TERM_PAD_X,
          top: TERM_PAD_Y,
          width: innerW,
          height: Math.max(0, height - 2 * TERM_PAD_Y),
          overflow: "hidden",
        }}
      >
        {rows}
      </div>
    </div>
  );
};
