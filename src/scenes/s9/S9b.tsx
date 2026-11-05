// S9b (patch 21b): the quiet block of the end card and the clean hold, f5040-5099 (BIBLE 6, S9).
//
// Owns everything at or below S9_LAYOUT.rule.y, top to bottom, all centred on x = S9_LAYOUT.cx:
//   f5040  the hairline (2 px, ink-3 at 50 %, drawn from the centre outward) and the demo host (the host of evidence.meta.baseUrl)
//   f5055  the repo URL (copy.urls.repo, as written)
//   f5057  the legal row: "MIT licensed", a round separator, "Built on Vultr", the official Vultr logo
//   f5069  everything settled; f5070-5099 THE CLEAN HOLD: nothing of this file moves, nothing fades. The Mark's breathing glow (21a) and the
//          camera's push are the only things alive. No fade to black, no fade out of any kind.
//
// Every frame and every rectangle comes from s9/shared.ts (the contract, never edited here). Everything is a pure function of the GLOBAL frame,
// and the frame is clamped to S9_TIMING.settled before anything reads it, so no animation can depend on a later frame.
// The overlay is stage space, position absolute, no opaque layer, no blur of any kind (motion rule 5).
//
// NO NEW STRINGS: the demo host comes from evidence (selectMeta().baseUrl), the rest from copy.urls / copy.brand. copy.urls.demo is empty on
// purpose and is never read here, so it can never become a second source for the demo address.
import React from "react";
import { copy } from "../../config/copy";
import { alpha, fonts, theme } from "../../config/theme";
import { selectMeta } from "../../data/select";
import { MONO_ADVANCE, SERIF_ADVANCE, estimateWidth } from "../../fx/util";
import { VultrLogo, hasVultrLogo } from "../../ui/VultrLogo";
import type { SceneOverlayProps } from "../types";
import { S9_END, S9_LAYOUT as L, S9_START, S9_TIMING as T, onBeat, s9Ramp } from "./shared";

// ---------------------------------------------------------------------------------------------- what only this part draws

/** Diameter of the round separator in the legal row (a circle, not a typed character). */
const SEP_PX = 6;
/** Gap between the items of the legal row (also the gap before the logo). */
const LEGAL_GAP_PX = 18;
/** The logo's width counted as this many times its height, for the width estimate only (the official mark is a wide wordmark). */
const LOGO_WIDTH_PER_HEIGHT = 2.2;
/** How far a masked rise starts below its box, in percent of the box (S1Title's `Title`). */
const RISE_PCT = 108;

/**
 * The HOST of a base URL: `new URL(baseUrl).host`. If that throws, or yields no host (an address without a protocol such as
 * "demo.example:8080" parses as a protocol), the protocol and everything from the first "/" (also "?" and "#") are stripped by hand.
 * "" gives "" (the SAMPLE evidence has no deployment).
 */
export function hostOf(baseUrl: string): string {
  const raw = String(baseUrl ?? "").trim();
  if (raw === "") return "";
  try {
    const host = new URL(raw).host;
    if (host !== "") return host;
  } catch {
    // not an absolute URL: fall through to the manual strip
  }
  const noProtocol = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const cut = noProtocol.search(/[/?#]/);
  return (cut < 0 ? noProtocol : noProtocol.slice(0, cut)).trim();
}

/** The demo row's text, computed once. "" on the SAMPLE evidence: the row is then not drawn (and the others do not move). */
const DEMO_HOST = hostOf(selectMeta().baseUrl);

let warnedDemo = false;
function warnDemoOnce(): void {
  if (warnedDemo) return;
  warnedDemo = true;
  console.warn(
    "[minilocker-film] S9 demo row is not drawn because evidence.meta.baseUrl is empty (the SAMPLE evidence). " +
      'A real capture has it; "npm run evidence:final-check" refuses an empty baseUrl before the final render.',
  );
}

/** The frames patch 22 (audio) reads. */
export const S9B_CUE_ANCHORS = {
  rule: T.demo,
  demo: T.demo,
  repo: T.repo,
  legal: T.legal,
  settled: T.settled,
} as const;

// ---------------------------------------------------------------------------------------------- import-time checks

/** The legal row's estimated width: its items, the separator, the logo (when it is drawn) and the gaps between them. */
function legalWidth(): number {
  const text = (s: string): number => estimateWidth(s, L.legal.fontSize, SERIF_ADVANCE);
  const logo = hasVultrLogo ? LOGO_WIDTH_PER_HEIGHT * L.legal.logoHeight : 0;
  const items = hasVultrLogo ? 4 : 3;
  return text(copy.brand.license) + SEP_PX + text(copy.brand.builtOn) + logo + (items - 1) * LEGAL_GAP_PX;
}

(function checkS9b(): void {
  const bad = (why: string): never => {
    throw new Error(`S9b: ${why}`);
  };

  // frames
  if (!onBeat(T.demo)) bad(`the demo host and hairline start (f${T.demo}) is not on a beat`);
  if (!onBeat(T.repo)) bad(`the repo URL start (f${T.repo}) is not on a beat`);
  const starts: ReadonlyArray<readonly [string, number]> = [
    ["hairline", T.demo],
    ["demo host", T.demo],
    ["repo URL", T.repo],
    ["legal row", T.legal],
  ];
  for (const [name, start] of starts) {
    if (!(start >= S9_START && start >= T.demo)) bad(`${name} starts at f${start}, before f${T.demo} (this part's first frame)`);
    if (!(start + T.revealFrames <= T.settled)) bad(`${name} (f${start} + ${T.revealFrames} f = f${start + T.revealFrames}) is not settled by f${T.settled}`);
  }
  if (!(T.demo + T.revealFrames <= T.repo)) bad(`the demo reveal (f${T.demo} + ${T.revealFrames}) must be done before the repo row starts (f${T.repo})`);
  if (!(T.repo <= T.legal)) bad(`the legal row (f${T.legal}) must not start before the repo row (f${T.repo})`);
  if (!(T.legal + T.revealFrames <= T.settled)) bad(`the legal reveal (f${T.legal} + ${T.revealFrames}) must be done by f${T.settled}`);
  if (!(T.settled <= T.hold - 1)) bad(`settled (f${T.settled}) must be at most hold - 1 (f${T.hold - 1})`);
  if (!(T.hold <= S9_END)) bad(`the clean hold (f${T.hold}) must start inside the scene (last frame f${S9_END})`);

  // rows: inside [rule.y, bottom], in order, not overlapping
  const rows: ReadonlyArray<readonly [string, { readonly top: number; readonly h: number }]> = [
    ["demo host", L.demo],
    ["repo URL", L.repo],
    ["legal row", L.legal],
  ];
  let prevBottom = L.rule.y + 1; // the hairline is 2 px tall, centred on rule.y
  for (const [name, r] of rows) {
    if (!(r.top >= L.rule.y)) bad(`${name} top (${r.top}) is above the hairline (y ${L.rule.y})`);
    if (!(r.top + r.h <= L.bottom)) bad(`${name} bottom (${r.top} + ${r.h} = ${r.top + r.h}) is below the bottom margin (y ${L.bottom})`);
    if (!(r.top >= prevBottom)) bad(`${name} top (${r.top}) overlaps the row above it (bottom ${prevBottom})`);
    prevBottom = r.top + r.h;
  }
  if (!(L.legal.logoHeight <= L.legal.h)) bad(`the logo (${L.legal.logoHeight} px) is taller than the legal row (${L.legal.h} px)`);

  // width: inside the safe margin, centred
  const avail = L.cx * 2 - 2 * L.safeX;
  const widths: ReadonlyArray<readonly [string, number]> = [
    ["hairline", L.rule.w],
    ["demo host", estimateWidth(DEMO_HOST, L.demo.fontSize, MONO_ADVANCE)],
    ["repo URL", estimateWidth(copy.urls.repo, L.repo.fontSize, MONO_ADVANCE)],
    ["legal row", legalWidth()],
  ];
  for (const [name, w] of widths) {
    if (!(w <= avail)) bad(`${name} is about ${Math.round(w)} px wide, more than the ${avail} px inside the ${L.safeX} px safe margin`);
  }

  // content
  if (copy.urls.repo.trim() === "") bad("copy.urls.repo is empty");
})();

// ---------------------------------------------------------------------------------------------- pieces

/**
 * One row's masked rise (S1Title's `Title` is the pattern): an overflow-hidden box with the row's fixed top and height, the content
 * travelling from 108 % below its box up to 0. `p` is 0..1 and already eased. A little horizontal padding (cancelled by an equal negative
 * margin, so the centring does not change) keeps the side bearings of the first and last glyph from being cut by the mask.
 */
const Rise: React.FC<{ top: number; h: number; padX: number; p: number; children: React.ReactNode }> = ({ top, h, padX, p, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, height: h, display: "flex", justifyContent: "center" }}>
    <div style={{ overflow: "hidden", height: h, padding: `0 ${padX}px`, margin: `0 ${-padX}px` }}>
      <div style={{ height: h, transform: `translateY(${((1 - p) * RISE_PCT).toFixed(3)}%)` }}>{children}</div>
    </div>
  </div>
);

/** The hairline: scaleX 0 -> 1 from its centre, signature ease. Static from f5052. */
const Hairline: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.demo) return null;
  const p = s9Ramp(frame, T.demo, T.demo + T.revealFrames);
  return (
    <div
      style={{
        position: "absolute",
        left: L.cx - L.rule.w / 2,
        top: L.rule.y - 1,
        width: L.rule.w,
        height: 2,
        background: alpha(theme.ink3, 0.5),
        transform: `scaleX(${p.toFixed(4)})`,
        transformOrigin: "50% 50%",
      }}
    />
  );
};

/** One line of text in a fixed row. */
const TextRow: React.FC<{
  frame: number;
  start: number;
  row: { readonly top: number; readonly h: number; readonly fontSize: number };
  text: string;
  family: string;
  color: string;
}> = ({ frame, start, row, text, family, color }) => {
  if (frame < start) return null;
  const p = s9Ramp(frame, start, start + T.revealFrames);
  return (
    <Rise top={row.top} h={row.h} padX={row.fontSize * 0.25} p={p}>
      <div style={{ fontFamily: family, fontSize: row.fontSize, lineHeight: `${row.h}px`, whiteSpace: "nowrap", color }}>{text}</div>
    </Rise>
  );
};

/** "MIT licensed" . "Built on Vultr" + logo, one centred line, every item vertically centred on the logo's height. */
const LegalRow: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.legal) return null;
  const p = s9Ramp(frame, T.legal, T.legal + T.revealFrames);
  const lineHeight = `${L.legal.logoHeight}px`;
  return (
    <Rise top={L.legal.top} h={L.legal.h} padX={L.legal.fontSize * 0.25} p={p}>
      <div
        style={{
          height: L.legal.h,
          display: "flex",
          alignItems: "center",
          gap: LEGAL_GAP_PX,
          whiteSpace: "nowrap",
          fontFamily: fonts.serif,
          fontSize: L.legal.fontSize,
          color: theme.ink3,
        }}
      >
        <span style={{ lineHeight }}>{copy.brand.license}</span>
        <span aria-hidden="true" style={{ flex: "none", width: SEP_PX, height: SEP_PX, borderRadius: "50%", background: theme.ink3 }} />
        <span style={{ lineHeight }}>{copy.brand.builtOn}</span>
        {hasVultrLogo ? <VultrLogo height={L.legal.logoHeight} /> : null}
      </div>
    </Rise>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S9b: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < T.demo) return null;
  // The clean hold, made structural: from f5070 nothing here moves, so no animation may read a frame after `settled`.
  const f = Math.min(frame, T.settled);
  if (DEMO_HOST === "") warnDemoOnce();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Hairline frame={f} />
      {DEMO_HOST === "" ? null : <TextRow frame={f} start={T.demo} row={L.demo} text={DEMO_HOST} family={fonts.mono} color={theme.ink} />}
      <TextRow frame={f} start={T.repo} row={L.repo} text={copy.urls.repo} family={fonts.mono} color={theme.ink2} />
      <LegalRow frame={f} />
    </div>
  );
};
