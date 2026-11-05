// Named focus rectangles of the recreated MiniLocker window, in LOGICAL coordinates (1600 x 900, origin top-left of the window).
// The virtual camera (src/fx/Camera.tsx) frames one of these per keyframe. Nothing else in the film types a UI coordinate.
//
// DERIVED FROM THE REAL LAYOUT (MiniLocker repo, frontend/src/App.tsx and BIBLE 10):
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
  | "browserPane"
  | "s5Fence"
  | "s5Ledger"
  | "s5Approval"
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
  | "attackSteps"
  | "attackChecks"
  | "attackVerdict"
  | "reportGrid"
  | "verifyButton"
  | "infraDiagram"
  | "fullWindow";

export const FOCUS_NAMES: readonly FocusName[] = [
  "nav",
  "taskForm",
  "stepStream",
  "terminal",
  "browserPane",
  "s5Fence",
  "s5Ledger",
  "s5Approval",
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
  "attackSteps",
  "attackChecks",
  "attackVerdict",
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
  /**
   * S5 (patch 17). The Workspace's centre column (tab pills and the browser panel, x 374-1141) with 140 px of extra height under it, so the camera clamps
   * to zoom 1.0 and the panel ends on stage y ~874: the captions' strip (y 905+) stays clear of the page card. At zoom 1.0 the left and right columns
   * of the app still show beside the card (x 202-576 and 1343-1802).
   */
  browserPane: { x: GRID.colLeft, y: GRID.headerH, w: GRID.colCenter, h: WINDOW.h - GRID.headerH + 140 },
  /**
   * S5: the page card (the browser panel) and the right-hand column the fence and the scanner's ledger line use. Zoom 1.08 (height-limited: 1728/1590 =
   * 1.087, 888/822 = 1.080); the card ends on stage y ~924, the right column on x ~1797.
   */
  s5Fence: { x: 20, y: 120, w: 1590, h: 822 },
  /** S5: the same shot as s5Fence panned 185 px to the right (zoom 1.08), so the right-hand column (command, policy deny, egress) moves to the middle and the dimmed page card keeps clear of the captions. */
  s5Ledger: { x: 205, y: 120, w: 1590, h: 822 },
  /** S5: the approval modal, centred on the page card. Zoom 1.43 (height-limited: 888/620). */
  s5Approval: { x: 337, y: 160, w: 840, h: 620 },
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
  /**
   * S4a (patch 15b): the steps of the Attack Lab's detail pane, with the stage's left half free for the explainer. The camera centres its focus, so the
   * rect reaches from the window's left edge (x 0) to the right edge of the pane's step column (x 1450: the column ends at 1437.5, see
   * shared.tsx S4_COLUMN) and from just above the "What happened" rows (y 640) to 140 px under the window's bottom edge: at padding 96 that is zoom 1.19,
   * width-limited, with the column in the right half of the stage (x ~837-1809), the first step row at stage y ~280 and the window's bottom edge at
   * ~y 590, clear of the snapshot rail (y 770). The title and the italic summary of the pane are above the frame on purpose: a half-cut title at
   * the top edge reads as a mistake, so the focus is centred low enough (y 856) that they are fully out.
   */
  attackSteps: { x: 0, y: 640, w: 1450, h: 432 },
  /**
   * Attack Lab, patch 16d: the "Containment checks" card of the detail pane at the scroll the checks are read at (`LAB.detailScroll`: 700 px). MEASURED on
   * stills of the 8-check result: the card's heading is at window y ~310, its eight rows end at y ~878, the column is x 669-1437. The frame is the heading and
   * the card, with the tail of the steps above it out of the way.
   */
  attackChecks: { x: 640, y: 250, w: 820, h: 610 },
  /**
   * Attack Lab, patch 16d: the verdict, at scroll 0. The donut (window x 23-143, y 83-200), the 15 tiles (x 172-767, y ~105-145), the "Run all attacks" button (x ~1383-1550) and the
   * pane's verdict banner (x 620-1437, y 430-567) in one frame, with no control cut by the frame's edge, so the stamp, the blue tile and the donut that fills are all on the screen when they land on f2780. MEASURED.
   */
  attackVerdict: { x: 0, y: 70, w: 1570, h: 520 },
  /**
   * Report (patch 18, measured): the page's own column (the report article is 1088 px wide, x 256-1344, centred in the window) with 40 px either side, from
   * the bottom of the header (y 67) to the window's bottom edge. The page scrolls under the camera (REPORT_SCROLL), so this is the part of the body that
   * stays on screen; the nine cards (two columns, 535.5 px each, MEASURED.report.cards) pass through it. At padding 96 it frames at zoom 1.07.
   */
  reportGrid: { x: 216, y: GRID.headerH, w: 1168, h: WINDOW.h - GRID.headerH },
  /**
   * Report (patch 18, measured): the ledger block at scroll 560: the seal (with the re-verified line that lands inside it) and the "Verify ledger now" button
   * (page y 1068, so y 508 at scroll 560), over the full width of the article. Zoom 1.59 at padding 96, width-limited.
   */
  verifyButton: { x: 256, y: 346, w: 1088, h: 230 },
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
