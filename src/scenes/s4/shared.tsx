// S4 shared layout and timing (patch 15a). The three parts of S4a (S4a1, S4a2, S4a3) import this file and never each other's internals, so a retime or a
// reframe is made in ONE place. 15b and 15c resend this file with their own sections added (every addition is marked with its patch number).
//
// WHERE THE FRAMES COME FROM. Every interaction frame of the Attack Lab (tile hovers, the select, the list scroll, Run's hover and press, the step
// frames, the wipe) lives in script.ts `LAB` and is read by filmState.ts to build the app's own screen. Nothing here retypes one: the camera and the
// cursor are computed FROM `LAB`, so a retime in script.ts moves them with it, and the import-time checks in S4a1.tsx throw when the two would disagree.
// What this file owns is only what script.ts does not know: when the camera moves.
//
// SPACE. The Attack Lab is the app, not an explainer: in 15a nothing is drawn in stage space (no scrim, no overlay); the app's own screen shows the
// verdict tiles, the donut and the card list, and the cursor works on it. The first stage-space objects of S4a arrive in 15b (the FileLattice over the
// left half, the SnapshotTimeline along the bottom).
//
// The shots of 15a (all in `attackLabPick`, src/config/focus.ts: window x 0-820, y 75-545):
//   landing   f2112-2154  from S3's pose on the nav (padding 96, zoom 2.56) down to the pick region, as the screen swaps in (script.ts SCREEN_CHANGES,
//                         swapAt f2112, cross-fade 8 f). The underline's slide (f2100-2124) is on the nav, where S3 left the camera, until the move starts.
//   push      f2154-2216  a slow 5 % push on the same region while the cursor sweeps the tiles, picks the hero and the list scrolls under it.
// Hand-off to 15b: its first camera keyframe starts at f2220 or later (this part ends on `attackLabPick`, padding 48, bias 1.05, arrived f2216);
// its first cursor waypoint is the click on Run at LAB.pressAt (f2220), at the position this part's last waypoint (f2216) already rests on.
//
// 15b (f2220-2299) adds the first stage-space objects of S4a: the persistent STAGE (a backing panel with the FileLattice, and the SnapshotTimeline rail
// along the bottom), drawn by S4Stage.tsx from the pure functions at the end of this file. Every addition below is marked "15b".
//   open      f2226-2250  the camera opens from `attackLabPick` (zoom 2.09) to `attackSteps` (zoom 1.19) on the beat f2250: the pane's step column is in
//                         the RIGHT half of the stage, the left half is free for the lattice. Then a 2 % push to f2299.
//   stage     f2240-2280  the panel fades in (f2240), the lattice builds (f2250-2280), the rail draws on (f2262-2280), snapshot node 1 lands on the beat f2280.
//   Hand-off to 15c: its first camera keyframe starts at f2300 or later (this part ends on `attackSteps`, padding 96, bias 1.02, arrived f2299); the
//   stage keeps drawing after f2299 (lattice intact) until 15c shatters it and patch 16 retires it.
//
// 15c (f2300-2399) extends the SAME stage (every addition below is marked "15c"): the wipe command types large in the blank band over the lattice
// (f2304-2336), THE WIPE lands on f2340 (the shards fly, the lattice drains to 30 %, a 3 % punch with a seeded shake that the stage shares with the camera),
// and on f2370 the real output of the wipe slams in huge, vermilion, in the empty lattice's place, in TOTAL SILENCE until f2399 (`S4_CUE_ANCHORS`).
//   Hand-off to patch 16 (S4b, f2400): this part ends on `attackSteps`, padding 96, bias 1.03 (arrived f2398); the stage keeps drawing the empty slots with
//   the huge token until patch 16 takes them over (the rewind: the pulse, the ghost container, the shards' return).
import { WINDOW } from "../../config/focus"; // 15b
import { layout } from "../../config/theme"; // 15b
import { SCREEN_CHANGES, LAB } from "../../config/script";
import { BEAT, CUES, SCENES } from "../../config/timeline"; // 15b: BEAT, CUES
import { SHATTER_FRAMES, latticeSize } from "../../gfx/FileLattice"; // 15b, 15c: SHATTER_FRAMES
import { MONO_ADVANCE } from "../../fx/util"; // 15c
import { getCameraState } from "../../fx/Camera"; // 15c
import { kf } from "../../config/camera"; // 15c
import { TL_X0, TL_X1, TL_Y, timelineNodeX } from "../../gfx/SnapshotTimeline"; // 15b
import { clamp01, signature } from "../../lib/ease"; // 15b
import { LAB_LIST_W } from "../../ui/AttackLabScreen"; // 15b
import { rem, sp } from "../../ui/primitives"; // 15b

/** The attack screen's entry in SCREEN_CHANGES (the underline slides to "Attack Lab" from `frame`, the screens swap at `swapAt`). */
const LAB_SCREEN = SCREEN_CHANGES.find((c) => c.to === "attackLab");

/** Empty stage margin round `attackLabPick`: with the region's 820 x 470 it gives zoom 2.09, height-limited (the tiles are 34 px, 71 px on the stage). */
export const S4_PICK_PADDING = 48;

const LANDING_FROM = LAB_SCREEN ? LAB_SCREEN.swapAt : 2112;
const LANDING_FRAMES = 42;

export const S4_TIMING = {
  /** The first frame of S4 (S3 ends on f2099 with the camera on the nav). */
  sceneStart: SCENES.S4.start,
  /**
   * 15a: the camera leaves the nav on the frame the screens swap and arrives 42 frames later (f2154), 12 frames before the first tile hover: it lands, it
   * does not arrive while the cursor is already working. A signature move, like every other hand-over of the film.
   */
  landing: { from: LANDING_FROM, frames: LANDING_FRAMES },
  /** 15a: the push that follows, a 5 % bias on the same region; it starts as the landing arrives and arrives on LAB.listScrollTo (f2216), as the card has come to rest. */
  push: { from: LANDING_FROM + LANDING_FRAMES, frames: LAB.listScrollTo - (LANDING_FROM + LANDING_FRAMES), bias: 1.05 },
  /** 15a: the cursor appears (fades in over the 8 frames that end here) right of the tiles, 28 frames before the first hover; it is the first waypoint. */
  cursorEnter: 2138,
  /** The last frame 15a draws on. 15b's first camera keyframe and first overlay item start at f2220 or later (LAB.pressAt). */
  partEndA1: 2219,

  // ---------------------------------------------------------------- 15b (f2220-2299)
  /**
   * 15b: the camera opens from the pick to the steps. It starts 6 frames after the click (the ripple is still playing, the app's busy ring has just
   * started) and takes 24 frames, so it ARRIVES on the beat f2250. A signature move, like every other hand-over of the film.
   */
  open: { from: LAB.pressAt + 6, frames: 24 },
  /** 15b: the slow push that follows, a 2 % bias on the same region; it arrives on the last frame of the part. */
  settle: { from: LAB.pressAt + 6 + 24, frames: 2299 - (LAB.pressAt + 6 + 24), bias: 1.02 },
  /** 15b: the backing panel fades in over the camera's last 10 frames; the stage is up from here. */
  panel: { from: 2240, frames: 12 },
  /** 15b: the FileLattice builds in (its own stagger: 24 tiles and the hero, a few frames apart) from the camera's arrival to the beat f2280. */
  lattice: { from: 2250, frames: 30 },
  /** 15b: the rail of the SnapshotTimeline draws on, finishing as the node lands. */
  rail: { from: 2262, frames: 18 },
  /** 15b: snapshot node 1 lands on a beat, with the first 8 hex of the real hash (its label reveals over the node's second half). */
  node: { at: 2280, frames: 14 },
  /** 15b: "The agent works. Snapshot after every step." (CUES.s4.captionWorks): it leaves (rising) over its last 12 frames, so it is gone by f2296. */
  caption: { start: CUES.s4.captionWorks, end: 2296 },
  /** 15b: the last frame 15b draws on. 15c's first camera keyframe, cursor waypoint and overlay item start at f2300 or later (LAB.stepAt.wipe). */
  partEndA2: 2299,

  // ---------------------------------------------------------------- 15c (f2300-2399)
  /** 15c: the command's line (rule + text) appears; the first item of 15c, on the frame after 15b's last. */
  cmdIn: { from: 2300, frames: 4 },
  /** 15c: the real wipe command types (linear, about 2.4 characters a frame) and is complete 4 frames before the wipe. */
  type: { from: 2304, frames: 32 },
  /** 15c: THE WIPE (script.ts LAB.wipeLandsAt, a beat): the shards fly for SHATTER_FRAMES, ending on the frame the silence starts. */
  wipe: { at: LAB.wipeLandsAt },
  shatter: { from: LAB.wipeLandsAt, frames: SHATTER_FRAMES },
  /** 15c: the lattice drains to `amount` (BIBLE: 30 %) over `frames`. */
  desat: { from: LAB.wipeLandsAt, frames: 12, amount: 0.3 },
  /** 15c: the command stays above as the cause, dimmed to `to` over `frames`. */
  dim: { from: LAB.wipeLandsAt, frames: 16, to: 0.35 },
  /** 15c: the punch: `extra` (3 %) on top of 15b's settled bias, in `frames`, with a seeded shake of `shake` stage px that the stage shares. Then `relax`. */
  punch: { at: LAB.wipeLandsAt, frames: 6, extra: 1.03, shake: 12 },
  /** 15c: after the punch the camera eases to `bias` and arrives on f2398 (patch 16's first keyframe starts at f2400 or later). */
  relax: { from: LAB.wipeLandsAt + 6, frames: 52, bias: 1.03 },
  /** 15c: the real output of the wipe slams in (CUES.s4.captionGone): opacity in 4 frames, scale from 1.1 in `frames`. */
  token: { at: CUES.s4.captionGone, frames: 10 },
  /** 15c: TOTAL SILENCE, inclusive (BIBLE: f2370-2399): no SFX, music ducked to nothing. Patch 22 reads it from `S4_CUE_ANCHORS`. */
  silence: { from: CUES.s4.captionGone, to: 2399 },
  /** 15c: "Everything gone." (CUES.s4.captionGone); it leaves over its last 12 frames and is gone when patch 16's "Rewind." (CUES.s4.captionRewind) starts. */
  captionGone: { start: CUES.s4.captionGone, end: CUES.s4.captionRewind },
  /** 15c: the last frame 15c draws on. Patch 16's first camera keyframe, cursor waypoint and overlay item start at f2400 or later. */
  partEndA3: 2399,
} as const;

/**
 * 15c: the frames patch 22 (the audio) hooks. The film's only silence is f2370-2399, so it lists the glass-shatter that ends the sound on f2340 and the
 * silence itself; patch 22 adds the sound that comes back on f2400 (S4b's). Frames, not seconds: they come from `S4_TIMING`, never typed twice.
 */
export const S4_CUE_ANCHORS = {
  glassShatter: { frame: S4_TIMING.wipe.at },
  silence: { from: S4_TIMING.silence.from, to: S4_TIMING.silence.to },
} as const;

/** Where the cursor appears (window px): over the detail pane, right of the tiles' row (tiles end at x 771), at the height of the first card. */
export const S4_CURSOR_ENTER = { x: 800, y: 320 } as const;

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S4_TIMING;
  if (!LAB_SCREEN) throw new Error('S4: SCREEN_CHANGES has no entry for "attackLab" (script.ts): the landing is timed from its swapAt');
  if (!(t.sceneStart === LAB_SCREEN.frame)) throw new Error(`S4: the Attack Lab's underline slide starts on f${LAB_SCREEN.frame}, the scene on f${t.sceneStart}: S4 starts with that slide`);
  if (!(t.landing.from >= t.sceneStart)) throw new Error("S4: the landing cannot start before the scene (S3 owns the camera until f2099)");
  const landed = t.landing.from + t.landing.frames;
  if (!(landed <= LAB.tileHovers[0].from)) throw new Error(`S4: the camera must have landed (f${landed}) by the first tile hover (f${LAB.tileHovers[0].from})`);
  if (!(t.push.from >= landed)) throw new Error("S4: the push cannot start before the landing has arrived");
  if (!(t.push.from + t.push.frames <= t.partEndA1)) throw new Error("S4: the push must have arrived by the end of 15a");
  if (!(t.cursorEnter >= t.sceneStart + 8)) throw new Error("S4: the cursor fades in over 8 frames: its first waypoint must be at f2108 or later");
  if (!(t.cursorEnter < LAB.tileHovers[0].from)) throw new Error("S4: the cursor must appear before the first tile hover");
  if (!(t.partEndA1 < LAB.pressAt)) throw new Error("S4: 15a must end before the click on Run (LAB.pressAt): the click is 15b's first cursor waypoint");
})();

// ---------------------------------------------------------------------------------------------- 15b: layout

/**
 * The step column of the Attack Lab's detail pane, in WINDOW px, DERIVED from the app's own layout (AttackLabScreen.tsx: the pane is the second grid column,
 * after the card list of LAB_LIST_W; it pads sp(8) on each side; its content is one column of at most rem(48), centred). Nothing is typed: a change to the
 * screen's layout moves this, and the checks in S4a2.tsx tell you if the camera no longer leaves the column clear.
 */
const PANE_PAD = sp(8);
const PANE_INNER = WINDOW.w - LAB_LIST_W - 2 * PANE_PAD;
const COLUMN_W = Math.min(rem(48), PANE_INNER);
export const S4_COLUMN = { x: LAB_LIST_W + PANE_PAD + (PANE_INNER - COLUMN_W) / 2, w: COLUMN_W } as const;

/** 15b: the lattice. A 6 x 4 schematic of a workspace; the hero tile (2 x 2 cells, top-left cell `heroIndex`: row 1, column 2) is the real file. */
export const S4_LATTICE = { count: 24, columns: 6, heroIndex: 8, seed: 11 } as const;
const LATTICE_SIZE = latticeSize(S4_LATTICE.count, S4_LATTICE.columns);

/** FileLattice's footnote is one mono line of 20 px under the lattice, 22 px below it. */
const FOOTNOTE_GAP = 22;
const FOOTNOTE_H = 26;
/** Air under the footnote, inside the panel. 15c: 70 -> 40, which gives the wipe command the band above the lattice (96 px safe margin to the lattice). */
const PANEL_PAD_BOTTOM = 40;
const PANEL_W = 724;
/** The panel hangs from the top edge of the stage and ends here: 48 px above the rail's node ring (rail y 770, node radius 12 + 8 ring). */
const PANEL_BOTTOM = 722;
/** The panel's top is above the stage on purpose: only its bottom corners show, and none of the app's card list is left cropped over its top edge. */
const PANEL_TOP = -40;

/**
 * 15b: the backing panel of the explainer (stage px), a SOLID sheet (the page background, `theme.paper`) hanging from the top edge of the stage over the
 * left half. The app's card list is behind it, and the first version of this panel (a 92 % one, floating) let the card text show through the tiles and left a
 * card cropped over its top edge, so it is opaque and runs off the top. Its right edge is clear of the pane's step column (S4a2.tsx checks it at the camera's
 * pose); its left edge is the film's safe margin, which is also where the window's own left edge is at that pose.
 */
export const S4_PANEL = {
  x: layout.safeMargin,
  y: PANEL_TOP,
  w: PANEL_W,
  h: PANEL_BOTTOM - PANEL_TOP,
  radius: 20,
} as const;

/** 15b: the lattice's top-left on the stage: centred across the panel, with the footnote and the bottom air under it. Patch 16's reassemble and the hash tiles use the same place. */
export const S4_LATTICE_AT = {
  x: S4_PANEL.x + (S4_PANEL.w - LATTICE_SIZE.w) / 2,
  y: PANEL_BOTTOM - PANEL_PAD_BOTTOM - FOOTNOTE_H - FOOTNOTE_GAP - LATTICE_SIZE.h,
  w: LATTICE_SIZE.w,
  h: LATTICE_SIZE.h,
} as const;

/** 15b: the rail of the snapshot timeline (SnapshotTimeline's own defaults: y 770, x 96-1824); node `i` sits in slot i, so node 1 is slot 0. */
export const S4_RAIL = { y: TL_Y, x0: TL_X0, x1: TL_X1 } as const;
/** Where node `slot` sits on the stage (stage px). Patch 16's tether leaves from here. */
export const s4NodeX = (slot: number): number => timelineNodeX(slot, 5, S4_RAIL.x0, S4_RAIL.x1);

// ---------------------------------------------------------------------------------------------- 15b: the stage's state, per frame

/**
 * The persistent STAGE (S4Stage.tsx) is drawn from these pure functions of the global frame; they are the only place its timing lives. 15c adds the wipe
 * (the lattice's `shatter` and `desaturate`, and its camera punch) and patch 16 adds the rewind (`reassemble`, the ghost container, the rewound node) by
 * EXTENDING these functions and the S4Stage component, never by drawing a second lattice.
 */

/** 0..1, eased: the backing panel's entrance. */
export function s4PanelProgress(frame: number): number {
  return signature(clamp01((frame - S4_TIMING.panel.from) / S4_TIMING.panel.frames));
}

/** The four LINEAR 0..1 values FileLattice takes (it applies its own easing). 15b: `intact` moves; 15c adds `shatter` and `desaturate`; `reassemble` is 0 until patch 16. */
export interface S4LatticeState {
  intact: number;
  shatter: number;
  reassemble: number;
  desaturate: number;
}

export function s4LatticeState(frame: number): S4LatticeState {
  const t = S4_TIMING.lattice;
  const sh = S4_TIMING.shatter;
  const ds = S4_TIMING.desat;
  // 15c: the shatter and the drain (linear: FileLattice applies its own easing); `reassemble` stays 0 until patch 16
  return {
    intact: clamp01((frame - t.from) / t.frames),
    shatter: clamp01((frame - sh.from) / sh.frames),
    reassemble: 0,
    desaturate: ds.amount * clamp01((frame - ds.from) / ds.frames),
  };
}

/** 0..1 linear: the rail draws on. */
export function s4RailProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.rail.from) / S4_TIMING.rail.frames);
}

/** 0..1 linear: snapshot node 1 lands (0 before f2280). */
export function s4NodeProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.node.at) / S4_TIMING.node.frames);
}

// ---------------------------------------------------------------------------------------------- 15c: the wipe command, the token, the shake

/**
 * 15c: the wipe command, typed large in mono on the stage, in the band between the top of the stage's safe margin and the lattice (the panel's blank top).
 * It is laid out FROM the evidence's command: the largest size in 24..34 px at which it wraps (at spaces, greedy) to at most two lines inside the panel.
 * A rule of 4 px in the colour of what it does (the wipe: `theme.bad`) stands to the left of the text.
 */
export const S4_COMMAND = { x: S4_PANEL.x + 40, top: layout.safeMargin, rule: 4, gap: 14, lineHeight: 1.45, rightPad: 40 } as const;

export interface S4CommandLayout {
  fontSize: number;
  lines: string[];
  /** where the text starts (stage px) and the height of the block */
  textX: number;
  y: number;
  h: number;
  /** the characters of the command shown across all lines (spaces at the breaks are not typed) */
  total: number;
}

function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if (next.length <= maxChars || cur === "") cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

export function s4CommandLayout(command: string): S4CommandLayout {
  const textX = S4_COMMAND.x + S4_COMMAND.rule + S4_COMMAND.gap;
  const avail = S4_PANEL.x + S4_PANEL.w - S4_COMMAND.rightPad - textX;
  let best: { fontSize: number; lines: string[] } | null = null;
  for (let f = 34; f >= 24; f--) {
    const lines = wrapWords(command, Math.floor(avail / (f * MONO_ADVANCE)));
    if (lines.length <= 2 && lines.every((l) => l.length * f * MONO_ADVANCE <= avail)) {
      best = { fontSize: f, lines };
      break;
    }
  }
  if (!best) throw new Error(`S4 (15c): the wipe command (${command.length} characters) does not wrap into two lines of at least 24 px in the panel (${avail}px wide)`);
  return {
    fontSize: best.fontSize,
    lines: best.lines,
    textX,
    y: S4_COMMAND.top,
    h: Math.round(best.lines.length * best.fontSize * S4_COMMAND.lineHeight),
    total: best.lines.reduce((n, l) => n + l.length, 0),
  };
}

/** 0..1: the command's line is there (it appears at f2300 and is dimmed from the wipe). */
export function s4CommandOpacity(frame: number): number {
  const t = S4_TIMING;
  if (frame < t.cmdIn.from) return 0;
  const appear = clamp01((frame - t.cmdIn.from) / t.cmdIn.frames);
  const dim = clamp01((frame - t.dim.from) / t.dim.frames);
  return appear * (1 - (1 - t.dim.to) * signature(dim));
}

/** How many characters of the command are typed (0..total), linear. */
export function s4CommandChars(frame: number, total: number): number {
  const t = S4_TIMING.type;
  return Math.round(total * clamp01((frame - t.from) / t.frames));
}

/** The text cursor: there from the first frame of the command until the wipe. */
export function s4CommandCursor(frame: number): boolean {
  return frame >= S4_TIMING.cmdIn.from && frame < S4_TIMING.wipe.at;
}

/** 15c: the huge output (\"WIPED_0\"): the largest mono bold that fits the lattice's width with 24 px each side, at most 170 px. */
export function s4TokenLayout(token: string): { fontSize: number } {
  const fontSize = Math.min(170, Math.floor((S4_LATTICE_AT.w - 48) / (token.length * MONO_ADVANCE)));
  if (!(fontSize >= 48)) throw new Error(`S4 (15c): the wipe output "${token}" (${token.length} characters) does not fit the lattice's width at 48 px or more`);
  return { fontSize };
}

/** 15c: the token slams in on f2370: opacity in 4 frames, scale 1.1 -> 1 in `token.frames`. */
export function s4TokenState(frame: number): { opacity: number; scale: number } {
  const t = S4_TIMING.token;
  if (frame < t.at) return { opacity: 0, scale: 1.1 };
  return { opacity: clamp01((frame - t.at) / 4), scale: 1.1 - 0.1 * signature(clamp01((frame - t.at) / t.frames)) };
}

/**
 * 15c: the camera's impact shake at a frame (stage px), the SAME seeded one the camera adds to the app (Camera.tsx `shakeAt` keys it on the keyframe's
 * frame), so the stage objects jolt with the app instead of standing still against it.
 */
export function s4Shake(frame: number): { x: number; y: number } {
  const cam = getCameraState(frame, [kf(0, "attackSteps"), kf(S4_TIMING.punch.at, "attackSteps", { ease: "linear", frames: 1, shake: S4_TIMING.punch.shake })], undefined, { wideTilt: false });
  return { x: cam.shakeX, y: cam.shakeY };
}

// ---------------------------------------------------------------------------------------------- 15c: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (15c): ${m}`);
  };
  if (!(t.cmdIn.from > t.partEndA2 && t.cmdIn.from >= LAB.stepAt.wipe)) bad("15c's first item must start after 15b's last frame, on the frame the app's wipe row appears (LAB.stepAt.wipe)");
  if (!(t.type.from >= t.cmdIn.from && t.type.from + t.type.frames < t.wipe.at)) bad("the command must be fully typed before the wipe lands (f2339 at the latest)");
  if (!(t.wipe.at === LAB.wipeLandsAt && t.wipe.at % BEAT === 0)) bad("the wipe must land on LAB.wipeLandsAt, on a beat");
  if (!(t.punch.at === t.wipe.at && t.punch.extra === 1.03)) bad("the camera punches 3 % on the frame of the wipe");
  if (!(t.shatter.frames === SHATTER_FRAMES && t.shatter.from + t.shatter.frames === t.token.at)) bad("the shatter must last SHATTER_FRAMES and end on the frame the token slams in");
  if (!(t.desat.amount === 0.3)) bad("the wipe drains the lattice to 30 %");
  if (!(t.punch.at + t.punch.frames <= t.relax.from)) bad("the relax must start after the punch has arrived");
  if (!(t.relax.from + t.relax.frames <= t.partEndA3)) bad("the camera must have arrived by the last frame of 15c, before patch 16's first keyframe (f2400)");
  if (!(t.token.at === CUES.s4.captionGone && t.token.at + t.token.frames <= t.partEndA3)) bad("the token slams in on the caption's cue and is complete before the part ends");
  if (!(t.silence.from === t.token.at && t.silence.to === t.partEndA3 && t.partEndA3 < CUES.s4.captionRewind)) bad("the silence is f2370 to the last frame of 15c, ending before \"Rewind.\" (CUES.s4.captionRewind)");
  if (!(t.captionGone.start === CUES.s4.captionGone && t.captionGone.end === CUES.s4.captionRewind)) bad("\"Everything gone.\" runs from its cue to the cue of \"Rewind.\"");
  // the band for the command: from the safe margin to 16 px above the lattice, inside the panel
  const band = S4_LATTICE_AT.y - 16 - S4_COMMAND.top;
  if (!(band >= 2 * 24 * S4_COMMAND.lineHeight)) bad(`the band above the lattice (${band.toFixed(0)} px, from the safe margin) cannot hold two lines of 24 px`);
})();

// ---------------------------------------------------------------------------------------------- 15b: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (15b): ${m}`);
  };
  if (!(t.open.from >= LAB.pressAt + LAB.pressFrames)) bad("the camera must not leave the Run button before its press has played");
  if (!(t.open.from > t.partEndA1)) bad("15b's first camera keyframe must start after 15a's last frame");
  if ((t.open.from + t.open.frames) % BEAT !== 0) bad(`the camera must arrive on a beat (arrives f${t.open.from + t.open.frames})`);
  if (!(t.settle.frames > 0 && t.settle.from + t.settle.frames === t.partEndA2)) bad("the settle push must arrive on the last frame of the part");
  if (!(t.panel.from >= t.open.from && t.panel.from + t.panel.frames <= t.lattice.from + 4)) bad("the panel must be in (within 4 frames) when the first tile shows, and not before the camera is moving");
  if (!(t.lattice.from >= t.open.from + t.open.frames)) bad("the lattice must not start building before the camera has arrived");
  if (!(t.lattice.from + t.lattice.frames <= t.node.at)) bad("the lattice must be complete when snapshot node 1 lands");
  if (!(t.rail.from >= t.panel.from && t.rail.from + t.rail.frames <= t.node.at)) bad("the rail must be drawn by the time node 1 lands");
  if (t.node.at % BEAT !== 0) bad(`snapshot node 1 must land on a beat (lands f${t.node.at})`);
  if (!(t.node.at >= LAB.stepAt.write)) bad(`the snapshot is taken AFTER the write (f${LAB.stepAt.write}), but node 1 lands on f${t.node.at}`);
  if (!(t.node.at + t.node.frames <= t.partEndA2)) bad("the node's landing must be over by the end of the part");
  if (!(t.caption.start === CUES.s4.captionWorks && t.caption.end <= t.partEndA2 && t.caption.end > t.node.at && t.caption.end <= CUES.s4.captionGone)) {
    bad("the caption must start on its cue, stay up while node 1 lands, and be gone by the end of the part");
  }
  if (!(t.partEndA2 < LAB.stepAt.wipe)) bad(`15b must end before the wipe command starts (LAB.stepAt.wipe, f${LAB.stepAt.wipe}): 15c's first item is on that frame`);

  // the panel and what is on it: hanging from the top edge, ending well above the rail; the lattice inside it and inside the safe margin; the footnote inside it
  const pr = S4_PANEL.x + S4_PANEL.w;
  const pb = S4_PANEL.y + S4_PANEL.h;
  if (!(S4_PANEL.x >= layout.safeMargin && S4_PANEL.y <= 0 && pb <= S4_RAIL.y - 40)) bad(`the panel (x ${S4_PANEL.x}-${pr}, y ${S4_PANEL.y}-${pb}) must hang from the top edge, start inside the safe margin and end at least 40 px above the rail (y ${S4_RAIL.y})`);
  if (!(S4_LATTICE_AT.x >= S4_PANEL.x + 24 && S4_LATTICE_AT.x + S4_LATTICE_AT.w <= pr - 24)) bad("the lattice must sit inside the panel with 24 px on each side");
  if (!(S4_LATTICE_AT.y >= layout.safeMargin)) bad(`the lattice starts at stage y ${S4_LATTICE_AT.y}, inside the safe margin (${layout.safeMargin})`);
  if (!(S4_LATTICE_AT.y + S4_LATTICE_AT.h + FOOTNOTE_GAP + FOOTNOTE_H <= pb - 24)) bad("the lattice and its footnote must fit in the panel");
  if (!(S4_LATTICE.heroIndex % S4_LATTICE.columns + 1 < S4_LATTICE.columns && S4_LATTICE.heroIndex + S4_LATTICE.columns + 1 < S4_LATTICE.count)) bad("the hero's 2 x 2 block does not fit the lattice");
})();
