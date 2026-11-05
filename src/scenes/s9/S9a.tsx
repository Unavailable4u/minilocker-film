// S9a (patch 21a): the dial reforms, collapses into the Mark, "MiniLocker", the tagline, and the Mark's breathing glow (f4980-5099, top half).
//
//   f4980-4995  the dial reforms on the cleared stage (five arcs, outermost first, from the real final dial of the film's main task);
//               the crimson core grows at the centre (f4984-4995). FORMED on the beat f4995.
//   f4995-5010  the dial collapses into the Mark (reverse of S1: the arcs drain outermost first while the finished Mark comes in,
//               scale 1.2 -> 1, opacity 0 -> 1). Complete on the beat f5010.
//   f5010       impact: the Mark punches, one thin crimson ring leaves it, the glow starts and breathes (s9Breath) to the last frame.
//               "MiniLocker" rises (masked, 22 f, settled f5032).
//   f5025       the tagline (KineticText, one line, last word landed f5051).
//
// Owns everything ABOVE S9_LAYOUT.rule.y. 21b owns the hairline and below. Every frame and rectangle comes from s9/shared.ts (never edited).
// Everything is a pure function of the GLOBAL frame. Stage space, no opaque layer, no backdrop-filter, no CSS blur.
// NO NEW STRINGS: "MiniLocker" is copy.ui.wordmark, the tagline copy.s9.line; the dial is drawn from evidence (no labels, no numbers).
import React from "react";
import { copy } from "../../config/copy";
import { alpha, fonts, theme } from "../../config/theme";
import { selectTask } from "../../data/select";
import { KineticText } from "../../fx/KineticText";
import { SERIF_ADVANCE, estimateWidth } from "../../fx/util";
import { clamp01, easeOutBack, signature } from "../../lib/ease";
import { gaugesOf } from "../../lib/gauges";
import { dialDims } from "../../ui/BlastPanel";
import { Mark } from "../../ui/Mark";
import { DIAL_KEYS, RadiusDial, type DialDim } from "../../ui/RadiusDial";
import type { SceneOverlayProps } from "../types";
import { S9_END, S9_LAYOUT as L, S9_START, S9_TIMING as T, onBeat, s9Breath, s9Ramp } from "./shared";

// ---------------------------------------------------------------------------------------------- what only this part draws

/** The dial's arcs sweep in: arc i starts i * REFORM_EVERY after reform.start and takes REFORM_FRAMES (the fifth is whole at f4995). */
const REFORM_EVERY = 2;
const REFORM_FRAMES = 7;
/**
 * The arcs drain outermost first, each over COLLAPSE_FRAMES. The prompt says "2 f apart, 8 f each, done by f5007", which does not add up
 * (4995 + 4 * 2 + 8 = f5011), so the stagger is 1 f: the fifth arc is empty at 4995 + 4 + 8 = f5007, three frames before the Mark lands.
 */
const COLLAPSE_EVERY = 1;
const COLLAPSE_FRAMES = 8;
/** The crimson core grows at the centre between these frames (easeOutBack). */
const CORE_GROW = { start: 4984, end: 4995 } as const;
/** The dial's ticks (not part of an arc) fade in with the first arcs and out as the last arcs drain. */
const DIAL_FADE_IN = { start: 4980, end: 4986 } as const;
const DIAL_FADE_OUT = { start: 5002, end: 5008 } as const;
/** The Mark enters at the S1 markOut recipe, reversed: scale 1 + 0.2 * (1 - in), opacity in. */
const MARK_ENTER_SCALE = 0.2;
/** The impact punch of the Mark at f5010: 1 + 0.05 * exp(-(f - 5010) / 6). */
const PUNCH = { amp: 0.05, tau: 6 } as const;
/** The shock ring (S1's `Shock` recipe). It is masked to fade out before rule.y so 21a never paints at or below the hairline. */
const SHOCK = { r0: 150, r1: 700, frames: 30, strength: 0.3, fadeBand: 140 } as const;
/** The glow: a soft crimson wash behind the Mark (radius, alpha) and the core's drop shadow; both are multiplied by s9Breath. They fade in over this many frames from f5010. */
const GLOW = { radius: 260, alpha: 0.18, rampFrames: 15 } as const;
/** The title's rise, in frames (S1Title's `Title` pattern). Settled at lockup + 22 = f5032. */
const TITLE_RISE_FRAMES = 22;
/** Last frame on which the tagline's last word has landed (contract text: 7 words, 5025 + 6 x 2 + 14). */
const TAGLINE_STAGGER = 2;
const TAGLINE_RISE = 14;
const TAGLINE_LAST_LANDED = 5051;
/** The dial's outer ticks reach this fraction of its half-size (RadiusDial: 118 of 120). */
const DIAL_TICK_FRACTION = 118 / 120;

/** The frames patch 22 reads. */
export const S9A_CUE_ANCHORS = {
  formed: T.reform.end,
  markLanded: T.collapse.end,
  lockup: T.lockup,
  tagline: T.tagline,
} as const;

// ---------------------------------------------------------------------------------------------- the real final dial (once)

/** The film's main task, as the Blast panel draws it (same functions): never forced to "clean". */
const FINAL_DIMS: readonly DialDim[] = (() => {
  const gauges = gaugesOf(selectTask().events, false);
  for (const key of DIAL_KEYS) {
    if (!gauges.some((g) => g.key === key)) throw new Error(`S9a: the final dial needs the "${key}" gauge, but gaugesOf(selectTask().events) did not return it`);
  }
  const dims = dialDims(gauges);
  if (dims.length !== DIAL_KEYS.length) throw new Error(`S9a: the final dial has ${dims.length} arcs, expected ${DIAL_KEYS.length}`);
  return dims;
})();

// ---------------------------------------------------------------------------------------------- import-time checks

const TAGLINE_WORDS = copy.s9.line.split(/\s+/).filter((w) => w.length > 0).length;
const TAGLINE_LANDED = T.tagline + (TAGLINE_WORDS - 1) * TAGLINE_STAGGER + TAGLINE_RISE;
const TITLE_TEXT = copy.ui.wordmark.lead + copy.ui.wordmark.tail;

(function checkS9a(): void {
  const bad = (why: string): never => {
    throw new Error(`S9a: ${why}`);
  };
  const beats: ReadonlyArray<readonly [string, number]> = [
    ["reform.start", T.reform.start],
    ["reform.end (formed)", T.reform.end],
    ["collapse.start", T.collapse.start],
    ["collapse.end (the Mark lands)", T.collapse.end],
    ["lockup", T.lockup],
    ["tagline", T.tagline],
  ];
  for (const [name, f] of beats) {
    if (!onBeat(f)) bad(`${name} (f${f}) is not on a beat (a multiple of 15)`);
    if (!(f >= S9_START && f <= S9_END)) bad(`${name} (f${f}) is outside f${S9_START}-f${S9_END}`);
  }
  if (!(T.reform.start < T.reform.end && T.reform.end <= T.collapse.start && T.collapse.start < T.collapse.end)) {
    bad(`reform (f${T.reform.start}-${T.reform.end}) and collapse (f${T.collapse.start}-${T.collapse.end}) must be in order and not overlap`);
  }
  if (!(T.collapse.end <= T.lockup && T.lockup < T.tagline)) bad(`order must be collapse (f${T.collapse.end}) <= lockup (f${T.lockup}) < tagline (f${T.tagline})`);

  const n = DIAL_KEYS.length;
  const lastReform = T.reform.start + (n - 1) * REFORM_EVERY + REFORM_FRAMES;
  if (!(lastReform <= T.reform.end)) bad(`the fifth arc is whole at f${lastReform}, after the dial is formed (f${T.reform.end})`);
  const lastDrain = T.collapse.start + (n - 1) * COLLAPSE_EVERY + COLLAPSE_FRAMES;
  if (!(lastDrain <= T.collapse.end)) bad(`the fifth arc is empty at f${lastDrain}, after the Mark lands (f${T.collapse.end})`);
  if (!(CORE_GROW.start >= T.reform.start && CORE_GROW.end <= T.reform.end)) bad(`the core grows f${CORE_GROW.start}-${CORE_GROW.end}, outside the reform (f${T.reform.start}-${T.reform.end})`);
  if (!(DIAL_FADE_OUT.end <= T.collapse.end && DIAL_FADE_OUT.start >= lastDrain - COLLAPSE_FRAMES)) bad(`the dial's ticks fade out f${DIAL_FADE_OUT.start}-${DIAL_FADE_OUT.end}, outside the collapse`);

  const dialTop = L.dial.cy - (DIAL_TICK_FRACTION * L.dial.size) / 2;
  if (!(dialTop >= L.safeX)) bad(`the dial's outer ticks reach y ${dialTop.toFixed(1)}, inside the ${L.safeX} px safe margin`);
  const dialSide = L.cx - (DIAL_TICK_FRACTION * L.dial.size) / 2;
  if (!(dialSide >= L.safeX)) bad(`the dial's outer ticks reach x ${dialSide.toFixed(1)}, inside the ${L.safeX} px safe margin`);
  const markTop = L.mark.cy - L.mark.size / 2;
  if (!(markTop >= L.safeX)) bad(`the Mark's top (y ${markTop}) is inside the ${L.safeX} px safe margin`);

  const titleW = estimateWidth(TITLE_TEXT, L.title.fontSize, SERIF_ADVANCE);
  const avail = L.cx * 2 - 2 * L.safeX;
  if (!(titleW <= avail)) bad(`the title is about ${Math.round(titleW)} px wide, more than the ${avail} px inside the ${L.safeX} px safe margin`);
  const taglineW = estimateWidth(copy.s9.line, L.tagline.fontSize, SERIF_ADVANCE);
  if (!(taglineW <= avail)) bad(`the tagline is about ${Math.round(taglineW)} px wide, more than the ${avail} px inside the ${L.safeX} px safe margin`);
  if (!(L.title.top + L.title.h <= L.tagline.top)) bad(`the title's bottom (${L.title.top} + ${L.title.h}) is below the tagline's top (${L.tagline.top})`);
  if (!(L.tagline.top + L.tagline.h < L.rule.y)) bad(`the tagline's bottom (${L.tagline.top} + ${L.tagline.h}) is not above the hairline (y ${L.rule.y})`);
  if (!(L.mark.cy + L.mark.size / 2 < L.title.top)) bad(`the Mark's bottom (y ${L.mark.cy + L.mark.size / 2}) is not above the title (y ${L.title.top})`);
  if (!(L.mark.cy + GLOW.radius < L.rule.y)) bad(`the glow wash reaches y ${L.mark.cy + GLOW.radius}, not above the hairline (y ${L.rule.y})`);
  if (!(T.lockup + TITLE_RISE_FRAMES <= T.hold)) bad(`the title is settled at f${T.lockup + TITLE_RISE_FRAMES}, after the clean hold starts (f${T.hold})`);
  if (!(TAGLINE_LANDED <= TAGLINE_LAST_LANDED)) bad(`the tagline's last word lands at f${TAGLINE_LANDED} (${TAGLINE_WORDS} words), after f${TAGLINE_LAST_LANDED}`);
})();

// ---------------------------------------------------------------------------------------------- pieces

const markScale = (frame: number): number => {
  // enter: 1.2 -> 1 over the collapse (the reverse of S1's markOut); from the lockup beat the impact punch decays (negligible well before the hold)
  const enter = 1 - s9Ramp(frame, T.collapse.start, T.collapse.end);
  const punch = frame < T.lockup || frame >= T.hold ? 0 : PUNCH.amp * Math.exp(-(frame - T.lockup) / PUNCH.tau);
  return 1 + MARK_ENTER_SCALE * enter + punch;
};

/** The dial: reforms (f4980-4995), then drains into the Mark (f4995-5007). No labels, no centre, no scan. */
const DialLayer: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame >= DIAL_FADE_OUT.end) return null;
  const opacity = s9Ramp(frame, DIAL_FADE_IN.start, DIAL_FADE_IN.end) * (1 - s9Ramp(frame, DIAL_FADE_OUT.start, DIAL_FADE_OUT.end));
  const dims = FINAL_DIMS.map((d, i): DialDim => {
    const sweep = s9Ramp(frame, T.reform.start + i * REFORM_EVERY, T.reform.start + i * REFORM_EVERY + REFORM_FRAMES);
    const a = T.collapse.start + i * COLLAPSE_EVERY;
    const drain = s9Ramp(frame, a, a + COLLAPSE_FRAMES);
    return { ...d, draw: frame < T.collapse.start ? sweep : 1 - drain, value: undefined };
  });
  const size = L.dial.size;
  return (
    <div style={{ position: "absolute", left: L.cx - size / 2, top: L.dial.cy - size / 2, width: size, height: size, opacity }}>
      <RadiusDial dims={dims} verdictWord="" verdictTone="mute" size={size} showLabels={0} glow={1} pulseFlagged={false} centerOpacity={0} />
    </div>
  );
};

/** The soft crimson wash behind the Mark. It has no box edge: the gradient reaches 0 at its own radius, so only the stage clips it. */
const GlowWash: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.lockup) return null;
  const k = s9Ramp(frame, T.lockup, T.lockup + GLOW.rampFrames);
  const a = GLOW.alpha * k * s9Breath(frame);
  const d = GLOW.radius * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: L.cx - GLOW.radius,
        top: L.mark.cy - GLOW.radius,
        width: d,
        height: d,
        background: `radial-gradient(circle closest-side, ${alpha(theme.accent, a)} 0%, ${alpha(theme.accent, 0)} 100%)`,
      }}
    />
  );
};

/** The Mark's rings (ink), entering as the reverse of S1's markOut. The core is drawn by <Core/>, so the Mark's own core is transparent. */
const MarkRings: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.collapse.start) return null;
  const inP = s9Ramp(frame, T.collapse.start, T.collapse.end);
  const s = L.mark.size;
  return (
    <div style={{ position: "absolute", left: L.cx - s / 2, top: L.mark.cy - s / 2, width: s, height: s, opacity: inP, transform: `scale(${markScale(frame).toFixed(4)})` }}>
      <Mark size={s} mode="static" accent="transparent" />
    </div>
  );
};

/** The crimson core with its faint wash disc (Mark geometry: wash r 4.4, dot r 2.2 of 32). It grows first, then rides the Mark's scale; its drop shadow breathes. */
const Core: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < CORE_GROW.start) return null;
  const grow = frame >= CORE_GROW.end ? 1 : easeOutBack(clamp01((frame - CORE_GROW.start) / (CORE_GROW.end - CORE_GROW.start)));
  const scale = grow * markScale(frame);
  const u = L.mark.size / 32;
  const rDot = 2.2 * u;
  const rWash = 4.4 * u;
  const strength = Math.min(1, (0.3 + 0.7 * s9Ramp(frame, T.lockup, T.lockup + GLOW.rampFrames)) * s9Breath(frame));
  const k = L.mark.size / 360; // S1's shadow radii were drawn for a 360 px Mark
  return (
    <>
      <div style={{ position: "absolute", left: L.cx - rWash, top: L.mark.cy - rWash, width: rWash * 2, height: rWash * 2, borderRadius: "50%", background: alpha(theme.accent, 0.2), transform: `scale(${scale.toFixed(4)})` }} />
      <div
        style={{
          position: "absolute",
          left: L.cx - rDot,
          top: L.mark.cy - rDot,
          width: rDot * 2,
          height: rDot * 2,
          borderRadius: "50%",
          background: theme.accent,
          transform: `scale(${scale.toFixed(4)})`,
          boxShadow: `0 0 ${(70 * k).toFixed(1)}px ${alpha(theme.accent, Math.min(0.9, 0.55 * strength))}, 0 0 ${(160 * k).toFixed(1)}px ${alpha(theme.accent, Math.min(0.5, 0.25 * strength))}`,
        }}
      />
    </>
  );
};

/** S1's thin crimson ring, from the Mark's centre at the impact. A mask fades it out above rule.y: this part never paints at or below the hairline. */
const Shock: React.FC<{ frame: number }> = ({ frame }) => {
  const t = clamp01((frame - T.lockup) / SHOCK.frames);
  if (frame < T.lockup || t >= 1) return null;
  const e = 1 - Math.pow(1 - t, 3);
  const r = SHOCK.r0 + (SHOCK.r1 - SHOCK.r0) * e;
  const fade = `linear-gradient(to bottom, #000 0px, #000 ${L.rule.y - SHOCK.fadeBand}px, transparent ${L.rule.y}px)`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: L.cx * 2, height: L.rule.y, overflow: "hidden", WebkitMaskImage: fade, maskImage: fade }}>
      <div
        style={{
          position: "absolute",
          left: L.cx - r,
          top: L.mark.cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `2px solid ${alpha(theme.accent, SHOCK.strength * (1 - t) * (1 - t))}`,
          boxShadow: `0 0 28px ${alpha(theme.accent, 0.5 * SHOCK.strength * (1 - t))}`,
        }}
      />
    </div>
  );
};

/** "MiniLocker": S1Title's masked-rise `Title` pattern at S9's size and top. */
const Title: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.lockup) return null;
  const p = s9Ramp(frame, T.lockup, T.lockup + TITLE_RISE_FRAMES);
  const pad = L.title.fontSize * 0.18;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: L.title.top, display: "flex", justifyContent: "center" }}>
      <div style={{ overflow: "hidden", padding: `${pad}px ${pad * 0.5}px`, margin: `${-pad}px ${-pad * 0.5}px` }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: L.title.fontSize,
            lineHeight: 1.04,
            letterSpacing: "-0.012em",
            whiteSpace: "nowrap",
            color: theme.ink,
            transform: `translateY(${((1 - p) * 108).toFixed(3)}%)`,
          }}
        >
          {copy.ui.wordmark.lead}
          <span style={{ color: theme.accentInk }}>{copy.ui.wordmark.tail}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S9a: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S9_START) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <GlowWash frame={frame} />
      <DialLayer frame={frame} />
      <MarkRings frame={frame} />
      <Core frame={frame} />
      <Shock frame={frame} />
      <Title frame={frame} />
      <div style={{ position: "absolute", left: 0, right: 0, top: L.tagline.top, display: "flex", justifyContent: "center" }}>
        <KineticText
          text={copy.s9.line}
          startFrame={T.tagline}
          fontSize={L.tagline.fontSize}
          color={theme.ink2}
          align="center"
          stagger={TAGLINE_STAGGER}
          riseFrames={TAGLINE_RISE}
        />
      </div>
    </div>
  );
};
