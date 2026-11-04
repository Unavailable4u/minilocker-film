// Named focus rectangles of the recreated MiniLocker window, in LOGICAL coordinates (1600 x 900, origin top-left of the window).
// The virtual camera (src/fx/Camera.tsx) frames one of these per keyframe. Nothing else in the film types a UI coordinate.
//
// DERIVED FROM THE REAL LAYOUT (draft repo, frontend/src/App.tsx and BIBLE 10):
//   - header 67.47 px, MEASURED in patch 05 (65.47 inner + 1 px accent hairline + 1 px border; logo + wordmark on the left, six nav
//     items starting at x 375.11, status chip, theme button and token on the right)
//   - Workspace grid: 22rem | 1fr | 27rem at the 17 px root = 374 | 767 | 459 (they add up to 1600)
//   - right column (BlastPanel): padding 16, the dial (about 232 px) on top, then a two-column gauge grid in the order
//     Network, Policy / Filesystem, Secrets / Compute, Time, then the wide Sandboxes card
//   - Attack Lab: summary bar (donut, 15 tiles, sentences, button) over the attack cards and the detail pane
//   - Report: header, nine dimension cards in a 3 x 3 grid, ledger block with the "Verify ledger now" button
//
// These rectangles are CLOSE, not pixel-exact: no UI component exists yet. THE UI PATCHES MAY REFINE THEM and MUST UPDATE THIS
// FILE when they do (then every camera keyframe that names the focus follows automatically). Keep the names stable.

// The measured rectangles (anchors.ts reads the same file). Imported here, not through anchors.ts, which imports this file.
import measured from "./anchors.measured.json";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Window size the focus rectangles live in. Equal to LOGICAL in timeline.ts. */
export const WINDOW = { w: 1600, h: 900 } as const;

/** Layout facts the rectangles are computed from. */
export const GRID = {
  /** Whole header, measured (patch 05): 65.47 inner + 1 px hairline + 1 px border. The body under it is 832.53 px. */
  headerH: 67.47,
  /** The header without its hairline and border: the height of a nav item and of the badge row. */
  headerInnerH: 65.47,
  /** Left edge of the first nav item, measured (patch 05). */
  navX: 375.11,
  /** Workspace columns: 22rem | 1fr | 27rem at 17 px. */
  colLeft: 374,
  colCenter: 767,
  colRight: 459,
  /** padding of the BlastPanel */
  panelPad: 16,
  /** width of the dial in the BlastPanel */
  dial: 232,
  /** gauge cards: two columns, 12 px gap, 96 px tall */
  gaugeGap: 12,
  gaugeH: 96,
} as const;

const RIGHT_X = GRID.colLeft + GRID.colCenter; // 1141
const GAUGE_W = (GRID.colRight - 2 * GRID.panelPad - GRID.gaugeGap) / 2; // 207.5
const GAUGE_X1 = RIGHT_X + GRID.panelPad; // 1157
const GAUGE_X2 = GAUGE_X1 + GAUGE_W + GRID.gaugeGap; // 1376.5
const DIAL_Y = GRID.headerH + GRID.panelPad; // 76
const GAUGE_Y1 = DIAL_Y + GRID.dial + 16; // 324
const GAUGE_ROW = GRID.gaugeH + GRID.gaugeGap; // 108

export type FocusName =
  | "nav"
  | "taskForm"
  | "stepStream"
  | "terminal"
  | "runView"
  | "runLeft"
  | "runRight"
  | "blastPanel"
  | "closingWide"
  | "dial"
  | "gaugeSecrets"
  | "gaugeNetwork"
  | "gaugeCompute"
  | "attackSummary"
  | "attackGrid"
  | "attackDetail"
  | "attackLabPick"
  | "reportGrid"
  | "verifyButton"
  | "infraDiagram"
  | "fullWindow";

export const FOCUS_NAMES: readonly FocusName[] = [
  "nav",
  "taskForm",
  "stepStream",
  "terminal",
  "runView",
  "runLeft",
  "runRight",
  "blastPanel",
  "closingWide",
  "dial",
  "gaugeSecrets",
  "gaugeNetwork",
  "gaugeCompute",
  "attackSummary",
  "attackGrid",
  "attackDetail",
  "attackLabPick",
  "reportGrid",
  "verifyButton",
  "infraDiagram",
  "fullWindow",
];

/**
 * The measured Secrets card (anchors.measured.json, key blastGauges). Read when the camera asks for the focus, not when this file loads: the
 * measuring tool bundles the project while that key may not exist yet (first run, or after a UI change), and must still be able to run.
 */
function measuredGaugeSecrets(): Rect {
  const r = (measured as unknown as { blastGauges?: { secrets?: Rect } }).blastGauges?.secrets;
  if (!r) throw new Error("focus: src/config/anchors.measured.json has no blastGauges.secrets; run `node tools/measure-anchors.mjs` and commit the JSON");
  return { x: r.x, y: r.y, w: r.w, h: r.h };
}

export const FOCUS: Record<FocusName, Rect> = {
  /** the six nav items in the header (measured in patch 05; w is the widest case, Workspace active: 648.89 + 5 gaps + 14.05 bold) */
  nav: { x: GRID.navX, y: 0, w: 674, h: GRID.headerInnerH },
  /** Workspace, left column, top: scenario select, free text, chips, profile, hold, "Run in sandbox" */
  taskForm: { x: 0, y: GRID.headerH, w: GRID.colLeft, h: 440 },
  /** Workspace, left column, below the form: the step list */
  stepStream: { x: 0, y: GRID.headerH + 440, w: GRID.colLeft, h: WINDOW.h - GRID.headerH - 440 },
  /** Workspace, centre: the terminal panel under the tab pills */
  terminal: { x: GRID.colLeft + 16, y: GRID.headerH + 52, w: GRID.colCenter - 32, h: WINDOW.h - GRID.headerH - 52 - 12 },
  /**
   * S2 run shots (patch 13b): the transcript's newest steps and the terminal's newest lines on one frame. Both panes are bottom-anchored
   * (the app scrolls them to the newest line), so the rectangles drop the top of the panes and run about 100 px past the window's bottom:
   * the strip of bare stage under the window is where the inference chip sits.
   * All three have the same size (same zoom), so a move between them is a pan, never a breath: runLeft favours the transcript (a new
   * assistant step), runRight the terminal (new output), runView sits between them.
   */
  runView: { x: 10, y: 310, w: 1100, h: 690 },
  runLeft: { x: -50, y: 310, w: 1100, h: 690 },
  runRight: { x: 75, y: 310, w: 1100, h: 690 },
  /** Workspace, right column: the whole BlastPanel */
  blastPanel: { x: RIGHT_X, y: GRID.headerH, w: GRID.colRight, h: WINDOW.h - GRID.headerH },
  /**
   * S2 closing widen (patch 13c, strip enlarged in 13c2): the whole window with 140 px of extra height under it, so at zoom 1.0 the window sits on
   * the upper part of the stage (y 20-920) and the caption has a strip under it. The camera clamps the zoom to 1.0 here (the rectangle is taller
   * than the stage). With 13c1's 100 px (window y 40-940) the 64 px caption, at the film's usual caption position, straddled the window's bottom edge.
   */
  closingWide: { x: 0, y: 0, w: WINDOW.w, h: WINDOW.h + 140 },
  /** the Blast Radius dial at the top of the BlastPanel (also where the S1 dial lands) */
  dial: { x: RIGHT_X + (GRID.colRight - GRID.dial) / 2, y: DIAL_Y, w: GRID.dial, h: GRID.dial },
  /**
   * gauge card "Secrets" (row 2, right), MEASURED in the DOM after the audit, panel not scrolled (patch 13c2, tools/measure-anchors.mjs ->
   * anchors.measured.json). The computed estimate it replaces was about 237 px too high and 67 px too short.
   */
  get gaugeSecrets(): Rect {
    return measuredGaugeSecrets();
  },
  /** gauge card "Network" (row 1, left) */
  gaugeNetwork: { x: GAUGE_X1, y: GAUGE_Y1, w: GAUGE_W, h: GRID.gaugeH },
  /** gauge card "Compute" (row 3, left) */
  gaugeCompute: { x: GAUGE_X1, y: GAUGE_Y1 + 2 * GAUGE_ROW, w: GAUGE_W, h: GRID.gaugeH },
  /** Attack Lab summary bar: donut, 15 verdict tiles, sentences, "Run all attacks" */
  attackSummary: { x: 24, y: GRID.headerH + 16, w: WINDOW.w - 48, h: 150 },
  /** Attack Lab: the attack cards (the list the cursor picks from) */
  attackGrid: { x: 24, y: GRID.headerH + 180, w: 720, h: WINDOW.h - GRID.headerH - 196 },
  /** Attack Lab: the detail pane (steps, policy decisions, egress rows, checks) */
  attackDetail: { x: 760, y: GRID.headerH + 180, w: WINDOW.w - 784, h: WINDOW.h - GRID.headerH - 196 },
  /**
   * S4a (patch 15a): where the cursor picks the attack. The left of the summary bar (the donut and the 15 verdict tiles, x 171-771) and the top of the
   * card list under it: after the list's scroll the hero's card rests at y 258-393 with its Run button inside. No other focus holds both the tiles and
   * the card at a zoom the 34 px tiles can be read at (attackSummary and attackGrid are each one half of this).
   */
  attackLabPick: { x: 0, y: GRID.headerH + 8, w: 820, h: 470 },
  /** Report: the nine dimension cards */
  reportGrid: { x: 24, y: GRID.headerH + 90, w: WINDOW.w - 48, h: 640 },
  /** Report: the "Verify ledger now" button in the ledger block */
  verifyButton: { x: WINDOW.w - 24 - 380, y: WINDOW.h - 94, w: 380, h: 56 },
  /** Infra: the wiring diagram of nodes joined by arrows */
  infraDiagram: { x: 24, y: GRID.headerH + 140, w: WINDOW.w - 48, h: 420 },
  /** the whole window */
  fullWindow: { x: 0, y: 0, w: WINDOW.w, h: WINDOW.h },
};

/** The rectangle of a named focus. Throws for an unknown name (a typo in a keyframe must not silently frame nothing). */
export function focusRect(name: FocusName): Rect {
  const r = FOCUS[name];
  if (!r) throw new Error(`focus: unknown focus name "${String(name)}" (see FOCUS_NAMES in src/config/focus.ts)`);
  return r;
}

/** The centre of a rectangle. */
export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A point inside a rectangle by fractions (0..1 from the top-left corner). */
export function rectPoint(r: Rect, fx: number, fy: number): { x: number; y: number } {
  return { x: r.x + r.w * fx, y: r.y + r.h * fy };
}
