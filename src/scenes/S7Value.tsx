// S7 Value (patch 19, f4260-4559) "A promise vs a measurement" (BIBLE 6, S7). Replaces the 12a stub completely.
//
// A text-only scene on the graphite stage. The app is still the layer under it; this file steps it back and draws everything else.
//
//   f4260-4289  the app defocuses and drops behind: a stage-sized backdrop layer ramps to blur 10 px and brightness .35 (S7Scrim; exported,
//               so S8 can ramp it out). It stays at full strength to the last frame of the scene.
//   f4275-4379  the question to ask before trusting an agent (patch 27: said to the viewer, not to a reviewer), italic CMU Serif, two lines,
//               KineticText (copy.s7.line, split after its colon, never retyped). The words land by f4335; "know?" is drawn in accent-ink and underlined.
//   f4305       a change-ticket card pops in on the right (code-built: hairlines, skeleton bars, a dashed slot labelled copy.s7.ticket.attach).
//   f4320       a Blast Radius report sheet rises on the left: its title is copy.rep.eyebrow, its body the report's real 3 x 3 grid of dimension
//               cards drawn as a schematic (no words, no numbers, no status colors: nothing measured is shown here).
//   f4335-4364  the report glides into the ticket's slot, shrinking to a thumbnail; it lands on the beat f4365 and the slot's check pops.
//   f4368-4379  the line and both cards leave upwards together.
//   f4380-4559  CompareTable (src/gfx/CompareTable.tsx). Rows on the beats f4380, f4410, f4440; the MiniLocker row rises on f4455 and, on the
//               beat f4470, grows 6 % and takes the accent edge (it is fully grown on f4500). The table pushes in 1.8 % over the whole part so
//               nothing is ever still for 1.5 s. The caption (copy.s7.caption, two lines) lands on the beat f4500 and leaves at the cut (f4560).
//
// Every word is copy.ts (copy.s7, copy.rep.eyebrow, copy.gfxC). Nothing measured is shown, so this scene reads nothing from the evidence.
// Only generic categories appear: no competitor names. The marks of the table are an editorial judgement and say so nowhere but in copy.gfxC.
import React from "react";
import { alpha, fonts, layout, scrim, theme } from "../config/theme";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { BEAT, FPS, SCENES, STAGE } from "../config/timeline";
import { Caption } from "../fx/Caption";
import { KineticText } from "../fx/KineticText";
import { CompareTable, compareTableSize, COMPARE_W } from "../gfx/CompareTable";
import { clamp01, signature, stepPulse } from "../lib/ease";
import { spr } from "../lib/spring";
import { Mark } from "../ui/Mark";
import type { SceneOverlayProps } from "./types";

const s7 = copy.s7;
const gfxC = copy.gfxC;

// ---------------------------------------------------------------------------------------------- timing

/** Every frame of the scene, global. Beats are marked; the import-time checks at the bottom keep them true. */
export const S7_TIMING = {
  /** The app steps back: blur and dim ramp over 30 frames (ends on the beat f4290). */
  scrim: { from: 4260, to: 4290 },
  /** The first word of the question rises (a beat); the last word has landed on f4335. */
  line: { from: 4275 },
  /** The ticket card pops in (a beat). */
  ticket: { from: 4305 },
  /** The report sheet rises (a beat). */
  report: { from: 4320 },
  /** The report glides into the ticket's slot and lands on the beat f4365. */
  glide: { from: 4335, to: 4365 },
  /** The question and both cards leave upwards. */
  leave: { from: 4368, to: 4380 },
  /** The table: the heads and the first category row on the beat f4380, then f4410, f4440; the product row rises on f4455 and grows on f4470. */
  table: { head: 4380, rows: [4380, 4410, 4440] as readonly number[], product: 4455, emphasis: 4470 },
  /** Frames a row takes to build (rise, then its three marks), the heads to draw, the product row to grow. */
  rowFrames: 30,
  headFrames: 20,
  emphasisFrames: 30,
  /** The caption: lands on the beat f4500, leaves over the last 12 frames before the cut. */
  caption: { from: 4500, to: 4560 },
} as const;

/** How far the app steps back (BIBLE 6, S7: blur 10 px, brightness .35). */
export const S7_SCRIM = { blurPx: 10, brightness: 0.35 } as const;

/** 0..1: how far the app has stepped back. 0 before f4260, 1 from f4290 on, and it stays 1 to the end of the scene. S8 reads it to ramp the app back in. */
export function s7ScrimAmount(frame: number): number {
  const { from, to } = S7_TIMING.scrim;
  return signature(clamp01((frame - from) / (to - from)));
}

// ---------------------------------------------------------------------------------------------- camera and cursor

/**
 * The app is under the scrim, so the camera only has to be quiet: it settles on the whole window (the pose S3 holds) while the app steps back,
 * then drifts a little (2.5 % push, 1.2 / 0.6 degrees of tilt) over the table's 180 frames. No big moves (BIBLE 6, S7).
 */
export const S7_CAMERA: readonly CameraKeyframe[] = [
  kf(S7_TIMING.scrim.from, "fullWindow", { padding: 60, ease: "signature", frames: 30 }),
  kf(S7_TIMING.table.head, "fullWindow", { padding: 60, scaleBias: 1.025, rotateX: 0.6, rotateY: -1.2, ease: "linear", frames: 180 }),
];

/** No cursor in S7: the scene is text on the stage. (Scene S6 must leave it hidden: its last waypoint should carry `hide`.) */
export const S7_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- geometry (stage px, 1920 x 1080)

const LINE_TOP = 168;
const LINE_SIZE = 68;

/** The change-ticket card. */
const TICKET = { x: 1010, y: 410, w: 560, h: 470 } as const;
/** The dashed slot inside the ticket (relative to the ticket's top-left) that the report lands in. */
const SLOT = { x: 36, y: 292, w: 488, h: 150 } as const;

/** The report sheet at full size, where it rises (left of the ticket). */
const SHEET = { x: 350, y: 440, w: 420, h: 380 } as const;
/** The thumbnail the sheet shrinks to, inside the slot. */
const THUMB_SCALE = (SLOT.h - 24) / SHEET.h;
const THUMB = {
  x: TICKET.x + SLOT.x + 16,
  y: TICKET.y + SLOT.y + 12,
  w: SHEET.w * THUMB_SCALE,
  h: SHEET.h * THUMB_SCALE,
} as const;

/** The table's top-left. It is centred horizontally by CompareTable's default; y leaves room for the legend and the two-line caption. */
const TABLE_Y = 170;

// ---------------------------------------------------------------------------------------------- copy helpers (words are never retyped)

/** "Before you trust an AI agent, ask: what could it touch, ..." -> two lines, split after the colon. */
function splitAfter(text: string, mark: ": " | ". ", who: string): [string, string] {
  const i = text.indexOf(mark);
  if (i < 0) throw new Error(`S7: ${who} has no "${mark}" to split at: ${text}`);
  return [text.slice(0, i + 1), text.slice(i + 2)];
}

const LINE_LINES = splitAfter(s7.line, ": ", "copy.s7.line");
const CAPTION_LINES = splitAfter(s7.caption, ". ", "copy.s7.caption");

// ---------------------------------------------------------------------------------------------- the scrim

/**
 * The app dimmed to brightness .35 and blurred 10 px, as a stage-sized backdrop layer (the way S3Scrim does it): whatever is under it
 * (the window, the cursor, the stage glow) steps back, so MiniLockerFilm and FilmApp stay untouched.
 */
export const S7Scrim: React.FC<{ frame: number }> = ({ frame }) => {
  const a = s7ScrimAmount(frame);
  if (a <= 0.001) return null;
  // Dim only (brightness .35 = 65 % black). The 10 px blur is applied to the app layer by MiniLockerFilm (appLook.ts): a backdrop-filter here drew mirrored copies of the window (f4270).
  return <div style={{ position: "absolute", inset: 0, background: scrim(+((1 - S7_SCRIM.brightness) * a).toFixed(3)), pointerEvents: "none" }} />;
};

// ---------------------------------------------------------------------------------------------- the two cards

const SMALL_CAPS: React.CSSProperties = { fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" };
const HAIR = 1.5;

/** A skeleton bar: a hairline-coloured rounded rectangle standing for a line of text. Not a measurement, not a word. */
const Bar: React.FC<{ x: number; y: number; w: number; h?: number; strong?: boolean }> = ({ x, y, w, h = 10, strong = false }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, background: strong ? theme.rule2 : theme.rule }} />
);

/** The report sheet at its full size (SHEET.w x SHEET.h): the title, the report's 3 x 3 grid of dimension cards (schematic) and a ledger block. */
const ReportSheet: React.FC = () => {
  const pad = 24;
  const gap = 12;
  const tileW = (SHEET.w - 2 * pad - 2 * gap) / 3;
  const tileH = 72;
  const gridTop = 88;
  return (
    <div
      style={{
        position: "relative",
        width: SHEET.w,
        height: SHEET.h,
        boxSizing: "border-box",
        borderRadius: 14,
        border: `${HAIR}px solid ${theme.rule2}`,
        background: theme.raised,
        boxShadow: `${theme.panelShadow}, ${theme.liftShadow}`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: pad, top: 22, display: "flex", alignItems: "center", gap: 12 }}>
        <Mark size={34} />
        <span style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 22, lineHeight: "26px", color: theme.ink2, whiteSpace: "nowrap", ...SMALL_CAPS }}>
          {copy.rep.eyebrow}
        </span>
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 70, height: HAIR, background: theme.rule2 }} />
      {Array.from({ length: 9 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = pad + col * (tileW + gap);
        const y = gridTop + row * (tileH + gap);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: tileW, height: tileH, boxSizing: "border-box", borderRadius: 8, border: `${HAIR}px solid ${theme.rule}`, background: alpha(theme.sheet, 0.8) }}>
            <Bar x={12} y={14} w={tileW * 0.5} h={8} strong />
            <Bar x={12} y={34} w={tileW * 0.72} h={6} />
            <Bar x={12} y={48} w={tileW * 0.4} h={6} />
          </div>
        );
      })}
      <Bar x={pad} y={gridTop + 3 * tileH + 2 * gap + 22} w={SHEET.w - 2 * pad} h={6} />
    </div>
  );
};

/** The change ticket: a title, a few skeleton lines, and the dashed slot that wants the report. `landed` 0..1 turns the slot from a request into a done thing. */
const Ticket: React.FC<{ landed: number; checkPop: number }> = ({ landed, checkPop }) => {
  const labelColor = landed > 0.5 ? theme.ink : theme.ink3;
  return (
    <div
      style={{
        position: "relative",
        width: TICKET.w,
        height: TICKET.h,
        boxSizing: "border-box",
        borderRadius: 14,
        border: `${HAIR}px solid ${theme.rule2}`,
        background: alpha(theme.sheet, 0.96),
        boxShadow: `${theme.panelShadow}, ${theme.liftShadow}`,
      }}
    >
      <div style={{ position: "absolute", left: 36, top: 26, fontFamily: fonts.serif, fontWeight: 700, fontSize: 26, lineHeight: "30px", color: theme.ink2, whiteSpace: "nowrap", ...SMALL_CAPS }}>
        {s7.ticket.title}
      </div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 72, height: HAIR, background: theme.rule2 }} />
      <Bar x={36} y={104} w={TICKET.w * 0.62} h={14} strong />
      <Bar x={36} y={140} w={TICKET.w - 72} h={10} />
      <Bar x={36} y={166} w={(TICKET.w - 72) * 0.84} h={10} />
      <Bar x={36} y={192} w={(TICKET.w - 72) * 0.58} h={10} />
      <div style={{ position: "absolute", left: 36, top: 226, width: 120, height: 30, boxSizing: "border-box", borderRadius: 15, border: `${HAIR}px solid ${theme.rule2}` }} />
      <div style={{ position: "absolute", left: 168, top: 226, width: 92, height: 30, boxSizing: "border-box", borderRadius: 15, border: `${HAIR}px solid ${theme.rule2}` }} />

      {/* the slot: dashed while it asks for the report, solid once it has it */}
      <div
        style={{
          position: "absolute",
          left: SLOT.x,
          top: SLOT.y,
          width: SLOT.w,
          height: SLOT.h,
          boxSizing: "border-box",
          borderRadius: 12,
          border: `${HAIR}px ${landed > 0.5 ? "solid" : "dashed"} ${landed > 0.5 ? theme.rule2 : theme.ink3}`,
          background: alpha(theme.sunken, 0.6),
        }}
      />
      {/* where the thumbnail will sit (dashed placeholder, covered by the sheet when it lands) */}
      <div
        style={{
          position: "absolute",
          left: THUMB.x - TICKET.x,
          top: THUMB.y - TICKET.y,
          width: THUMB.w,
          height: THUMB.h,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `${HAIR}px dashed ${theme.rule2}`,
          opacity: 1 - landed,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: THUMB.x - TICKET.x + THUMB.w + 24,
          top: SLOT.y,
          height: SLOT.h,
          display: "flex",
          alignItems: "center",
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 28,
          color: labelColor,
          whiteSpace: "nowrap",
        }}
      >
        {s7.ticket.attach}
      </div>
      {checkPop > 0.001 ? (
        <svg
          width={44}
          height={44}
          viewBox="-22 -22 44 44"
          style={{ position: "absolute", left: SLOT.x + SLOT.w - 44 - 16, top: SLOT.y + SLOT.h / 2 - 22, overflow: "visible", transform: `scale(${Math.max(0, checkPop)})`, opacity: clamp01(checkPop * 3) }}
        >
          <circle r={17} fill="none" stroke={theme.ink} strokeWidth={2} />
          <path d="M -7 0.5 L -2 6 L 8 -6" fill="none" stroke={theme.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- phase A: the question and the two cards

const Opening: React.FC<{ frame: number }> = ({ frame }) => {
  const t = S7_TIMING;
  const leave = signature(clamp01((frame - t.leave.from) / (t.leave.to - t.leave.from)));

  // the ticket pops in
  const ticketIn = spr(frame, FPS, t.ticket.from, "panel");
  // the report rises, then glides into the slot
  const sheetIn = clamp01(spr(frame, FPS, t.report.from, "uiPop"));
  const glide = signature(clamp01((frame - t.glide.from) / (t.glide.to - t.glide.from)));
  const landed = frame >= t.glide.to ? 1 : 0;
  const checkPop = spr(frame, FPS, t.glide.to, "settle");
  const bump = stepPulse(frame, t.glide.to, 12);

  const sheetX = SHEET.x + (THUMB.x - SHEET.x) * glide;
  const sheetY = SHEET.y + (THUMB.y - SHEET.y) * glide + (1 - sheetIn) * 40 * (1 - glide) - Math.sin(Math.PI * glide) * 36;
  const sheetScale = 1 + (THUMB_SCALE - 1) * glide;
  const sheetRot = -3 * (1 - glide);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - leave, transform: `translateY(${(-36 * leave).toFixed(2)}px)`, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: LINE_TOP, width: STAGE.w, display: "flex", justifyContent: "center" }}>
        <KineticText
          text={LINE_LINES}
          startFrame={t.line.from}
          fontSize={LINE_SIZE}
          weight={500}
          italic
          highlight="know?"
          underline={{ word: "know?" }}
        />
      </div>

      {ticketIn > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: TICKET.x,
            top: TICKET.y,
            opacity: clamp01(ticketIn * 3),
            transformOrigin: "50% 50%",
            transform: `translateY(${((1 - ticketIn) * 40 - bump * 4).toFixed(2)}px) scale(${(0.97 + 0.03 * Math.min(1, ticketIn)).toFixed(4)})`,
          }}
        >
          <Ticket landed={landed} checkPop={checkPop} />
        </div>
      ) : null}

      {sheetIn > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity: clamp01(sheetIn * 3),
            transformOrigin: "0 0",
            transform: `translate(${sheetX.toFixed(2)}px, ${sheetY.toFixed(2)}px) rotate(${sheetRot.toFixed(3)}deg) scale(${sheetScale.toFixed(4)})`,
          }}
        >
          <ReportSheet />
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- phase B: the table

const Compare: React.FC<{ frame: number }> = ({ frame }) => {
  const t = S7_TIMING;
  if (frame < t.table.head) return null;
  const rowStarts = [...t.table.rows, t.table.product];
  const rowProgress = rowStarts.map((from) => clamp01((frame - from) / t.rowFrames));
  const headerProgress = clamp01((frame - t.table.head) / t.headFrames);
  const emphasis = clamp01((frame - t.table.emphasis) / t.emphasisFrames);
  // a slow push-in over the whole part: nothing is still for 1.5 s
  const push = clamp01((frame - t.table.head) / (SCENES.S7.end + 1 - t.table.head));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "50% 40%",
        transform: `translateY(${(-6 * push).toFixed(2)}px) scale(${(1 + 0.018 * push).toFixed(4)})`,
        pointerEvents: "none",
      }}
    >
      <CompareTable
        rows={s7.rows}
        columns={gfxC.compareColumns}
        marks={gfxC.compareMarks}
        rowProgress={rowProgress}
        emphasis={emphasis}
        headerProgress={headerProgress}
        legend={gfxC.compareLegend}
        y={TABLE_Y}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the scene

export const S7Value: React.FC<SceneOverlayProps> = ({ frame }) => (
  <>
    <S7Scrim frame={frame} />
    {frame < S7_TIMING.leave.to ? <Opening frame={frame} /> : null}
    <Compare frame={frame} />
    <Caption text={CAPTION_LINES} highlight="a measurement" startFrame={S7_TIMING.caption.from} endFrame={S7_TIMING.caption.to} />
  </>
);

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S7_TIMING;
  const sc = SCENES.S7;
  if (sc.start !== 4260 || sc.end !== 4559) throw new Error("S7: the scene's range moved; re-read this file's timings");
  const beats: [string, number][] = [
    ["scrim.from", t.scrim.from],
    ["scrim.to", t.scrim.to],
    ["line.from", t.line.from],
    ["ticket.from", t.ticket.from],
    ["report.from", t.report.from],
    ["glide.from", t.glide.from],
    ["glide.to", t.glide.to],
    ["table.head", t.table.head],
    ["table.rows[0]", t.table.rows[0]],
    ["table.rows[1]", t.table.rows[1]],
    ["table.rows[2]", t.table.rows[2]],
    ["table.product", t.table.product],
    ["table.emphasis", t.table.emphasis],
    ["caption.from", t.caption.from],
  ];
  for (const [name, f] of beats) if (f % BEAT !== 0) throw new Error(`S7: ${name} (f${f}) is not on a beat (BEAT = ${BEAT})`);
  if (t.table.rows[0] !== 4380 || t.table.rows[1] !== 4410 || t.table.rows[2] !== 4440) throw new Error("S7: the table rows are on f4380, f4410 and f4440 (BIBLE 6)");
  if (t.table.emphasis !== 4470 || t.caption.from !== 4500) throw new Error("S7: the product row grows on f4470 and the caption lands on f4500 (BIBLE 6)");
  if (!(t.scrim.from === sc.start)) throw new Error("S7: the app steps back from the first frame of the scene (f4260)");
  if (!(t.line.from >= t.scrim.from && t.ticket.from > t.line.from && t.report.from > t.ticket.from && t.glide.from >= t.report.from + 15)) {
    throw new Error("S7: the opening beats must come in order: scrim, line, ticket, report, glide");
  }
  if (!(t.glide.to < t.leave.from && t.leave.to === t.table.head)) throw new Error("S7: the cards must land before they leave, and leave exactly as the table starts");
  if (!(t.table.rows[2] < t.table.product && t.table.product < t.table.emphasis)) throw new Error("S7: the product row rises after the categories and before it grows");
  if (!(t.table.emphasis + t.emphasisFrames <= t.caption.from + 1)) throw new Error("S7: the product row must have grown by the time the caption lands");
  if (!(t.caption.to === sc.end + 1)) throw new Error("S7: the caption leaves at the cut (f4560)");
  // geometry: everything stays inside the safe margin
  const m = layout.safeMargin;
  if (!(TICKET.x + TICKET.w <= STAGE.w - m && TICKET.y + TICKET.h <= STAGE.h - m)) throw new Error("S7: the ticket leaves the safe margin");
  if (!(SHEET.x >= m && SHEET.y >= LINE_TOP + 2 * LINE_SIZE + 40)) throw new Error("S7: the report sheet must sit left of the safe margin line and clear of the question");
  if (!(SLOT.y + SLOT.h <= TICKET.h - 24 && THUMB.h <= SLOT.h - 16)) throw new Error("S7: the thumbnail must fit inside the ticket's slot");
  const size = compareTableSize(s7.rows.length);
  if (size.w !== COMPARE_W) throw new Error("S7: the table width moved");
  const legendBottom = TABLE_Y + size.h + 40 + 24;
  const captionTop = STAGE.h - layout.captionBottom - 2 * 72 * 1.1;
  if (!(legendBottom + 24 <= captionTop)) throw new Error(`S7: the legend (bottom ${legendBottom}) is too close to the two-line caption (top about ${captionTop})`);
  if (!(TABLE_Y >= m)) throw new Error("S7: the table's heads are above the safe margin");
})();
