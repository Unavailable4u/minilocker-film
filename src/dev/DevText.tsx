// DEV ONLY (patch 04). One composition that exercises the text engines (300 frames, 10 s):
//   - a command typed into the TerminalView (typedText, caret solid while typing, then blinking)
//   - 12 terminal lines streamed in irregular bursts (streamLines), with the spring-eased tail scroll
//     (streamArrivals + tailScrollOffset) because the terminal is only 10 rows tall
//   - a 64-hex SHA-256 resolving left to right (lockHex, lockedCount, shortHash)
//   - the glitch layer at strength 0, 0.5 and 1
// Labels, lines and numbers here are developer notes, not film copy and not evidence. The hash is the real
// SHA-256 of the three letters "abc" (a well-known test vector), so it is a true hash of what its label says.
// Check it with:  npx remotion studio src/index.ts   (open DevText, scrub the timeline)
//   stills:  npx remotion still src/index.ts DevText out/qa/text-typing.png --frame=26
//            npx remotion still src/index.ts DevText out/qa/text-hash-mid.png --frame=218
//            npx remotion still src/index.ts DevText out/qa/text-hash-locked.png --frame=290
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "../ui/theme.css";
import { alpha, fonts, theme } from "../config/theme";
import { FontsReady } from "../lib/fonts";
import { lockHex, lockedCount, shortHash } from "../lib/hash";
import { streamArrivals, streamLines, tailScrollOffset } from "../lib/stream";
import { caretVisible, typedText, typingCaret, typingEndFrame } from "../lib/typing";
import { GlitchLayer } from "../ui/GlitchLayer";
import { TerminalView, type TermLine } from "../ui/TerminalView";

export const DEV_TEXT_FRAMES = 300;

const COMMAND = "echo typing engine check, with micro-pauses.";
const TYPE_START = 8;
const TYPE_END = typingEndFrame(COMMAND, TYPE_START);
const STREAM_START = TYPE_END + 6;
const STREAM_END = STREAM_START + 96;
const STREAM_SEED = 4;

const HASH = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"; // SHA-256("abc")
const LOCK_START = 170;
const LOCK_FRAMES = 96;
const HASH_SEED = 7;

const OUT_LINES: readonly TermLine[] = [
  { text: "dev stream 01: plain output", tone: "out" },
  { text: "dev stream 02: plain output, a little longer than the first one", tone: "out" },
  { text: "dev stream 03: dim note", tone: "dim" },
  { text: "dev stream 04: an error-tone line", tone: "err" },
  { text: "dev stream 05: plain output", tone: "out" },
  { text: "", tone: "out" },
  {
    text:
      "dev stream 07: a very long line to test the ellipsis and the clipping, it keeps going past the right edge of the " +
      "terminal surface so the row must clip instead of wrapping onto a second row",
    tone: "out",
  },
  { text: "dev stream 08: plain output", tone: "out" },
  { text: "dev stream 09: dim note", tone: "dim" },
  { text: "dev stream 10: plain output", tone: "out" },
  { text: "dev stream 11: an error-tone line", tone: "err" },
  { text: "dev stream 12: last line", tone: "out" },
];

const TERM_W = 1000;
const TERM_H = 236; // 10 rows of 21.75 px plus 2 x 9 px padding

const mono = (size: number, color: string = theme.ink2): React.CSSProperties => ({
  fontFamily: fonts.mono,
  fontSize: size,
  color,
  lineHeight: 1.3,
});

const Label: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div style={{ position: "absolute", left: x, top: y, ...mono(20, theme.ink3) }}>{children}</div>
);

/** A generic opaque "page" to glitch: no real site, no logo. */
const SamplePage: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: theme.sheet, padding: 28 }}>
    <div style={{ height: 14, width: 120, background: theme.rule2, borderRadius: 3 }} />
    <div
      style={{
        marginTop: 18,
        fontFamily: fonts.serif,
        fontWeight: 700,
        fontSize: 40,
        letterSpacing: "-0.012em",
        color: theme.ink,
        lineHeight: 1.05,
      }}
    >
      A generic article page
    </div>
    {[0.92, 0.84, 0.9, 0.6].map((w, i) => (
      <div key={i} style={{ marginTop: 16, height: 12, width: `${w * 100}%`, background: theme.rule, borderRadius: 3 }} />
    ))}
    <div style={{ marginTop: 26, ...mono(20, theme.accentInk) }}>SYSTEM: dev sample of hidden text</div>
    <div style={{ position: "absolute", left: 28, bottom: 24, width: 164, height: 46, background: theme.accent, borderRadius: 6 }} />
    <div style={{ position: "absolute", left: 212, bottom: 24, width: 96, height: 46, border: `1px solid ${theme.rule2}`, borderRadius: 6 }} />
  </div>
);

export const DevText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- terminal: typed command, then the streamed output ----
  const typed = typedText(COMMAND, frame, TYPE_START);
  const cmdLine: TermLine = { text: COMMAND, tone: "cmd" };
  let lines: TermLine[];
  let caretLine: number;
  let caretCol: number;
  let caretOn: boolean;
  const arrivals = [TYPE_START, ...streamArrivals(OUT_LINES, STREAM_START, STREAM_END, STREAM_SEED)];
  if (frame < STREAM_START) {
    lines = [{ text: typed, tone: "cmd" }];
    caretLine = 0;
    caretCol = Array.from(typed).length;
    caretOn = typingCaret(COMMAND, frame, TYPE_START);
  } else {
    const s = streamLines(OUT_LINES, frame, STREAM_START, STREAM_END, STREAM_SEED);
    lines = [cmdLine, ...s.visibleLines];
    caretLine = s.caretLine + 1;
    caretCol = s.caretCol;
    caretOn = frame < STREAM_END ? true : caretVisible(frame - STREAM_END);
  }
  const scrollOffset = tailScrollOffset(frame, fps, arrivals);

  // ---- hash lock ----
  const hash = lockHex(HASH, frame, LOCK_START, LOCK_FRAMES, HASH_SEED);
  const locked = lockedCount(HASH, frame, LOCK_START, LOCK_FRAMES);

  const readout = [
    `frame    ${String(frame).padStart(3, " ")} / ${DEV_TEXT_FRAMES}`,
    `typed    ${String(Array.from(typed).length).padStart(2, " ")} / ${Array.from(COMMAND).length}`,
    `rows     ${String(lines.length).padStart(2, " ")} / ${OUT_LINES.length + 1}`,
    `scroll   ${scrollOffset.toFixed(2).padStart(6, " ")} rows`,
    `locked   ${String(locked).padStart(2, " ")} / ${HASH.length}`,
    `caret    ${caretOn ? "on " : "off"}`,
  ];

  const glitchPanels: { strength: number; x: number }[] = [
    { strength: 0, x: 96 },
    { strength: 0.5, x: 96 + 568 },
    { strength: 1, x: 96 + 2 * 568 },
  ];

  return (
    <FontsReady>
      <AbsoluteFill className="film-root" style={{ background: theme.stageGradient }}>
        {/* terminal */}
        <Label x={96} y={64}>TerminalView: typed command, then 12 streamed lines (tail mode, 10 rows)</Label>
        <div style={{ position: "absolute", left: 96, top: 96, border: `1px solid ${theme.rule}`, borderRadius: 8, overflow: "hidden" }}>
          <TerminalView
            lines={lines}
            caretLine={caretLine}
            caretCol={caretCol}
            caretOn={caretOn}
            scrollOffset={scrollOffset}
            tail
            width={TERM_W}
            height={TERM_H}
          />
        </div>

        {/* readout */}
        <Label x={1160} y={64}>readout</Label>
        <div style={{ position: "absolute", left: 1160, top: 96, width: 664, height: TERM_H + 2, border: `1px solid ${theme.rule}`, borderRadius: 8, background: theme.sunken, padding: "14px 18px", whiteSpace: "pre", ...mono(22, theme.ink2) }}>
          {readout.join("\n")}
        </div>

        {/* hash lock */}
        <Label x={96} y={372}>lockHex: SHA-256 of the three letters abc (test vector), resolving left to right</Label>
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 404,
            width: 1728,
            height: 68,
            border: `1px solid ${theme.rule}`,
            borderRadius: 8,
            background: theme.sunken,
            padding: "0 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: fonts.mono,
            fontSize: 30,
            whiteSpace: "pre",
          }}
        >
          <span>
            <span style={{ color: theme.ink }}>{hash.slice(0, locked)}</span>
            <span style={{ color: alpha(theme.ink3, 0.8) }}>{hash.slice(locked)}</span>
          </span>
          <span style={{ ...mono(22, locked >= HASH.length ? theme.ok : theme.ink3) }}>
            {locked >= HASH.length ? `locked ${shortHash(HASH)}` : `${String(locked).padStart(2, " ")}/64`}
          </span>
        </div>

        {/* glitch */}
        {glitchPanels.map((g) => (
          <React.Fragment key={g.x}>
            <Label x={g.x} y={510}>GlitchLayer strength {g.strength}</Label>
            <div
              style={{
                position: "absolute",
                left: g.x,
                top: 542,
                width: 544,
                height: 420,
                border: `1px solid ${theme.rule}`,
                borderRadius: 8,
                overflow: "hidden",
                background: theme.sheet,
              }}
            >
              <GlitchLayer strength={g.strength} seed={3}>
                <SamplePage />
              </GlitchLayer>
            </div>
          </React.Fragment>
        ))}
      </AbsoluteFill>
    </FontsReady>
  );
};
