// MiniLocker film: WHERE THE CURSOR AND THE CALLOUTS POINT (patch 11).
//
// Every target is a rectangle in LOGICAL window px (1600 x 900, origin = top-left of the AppWindow), the same space as focus.ts, so
// Cursor.tsx / Callout.tsx / Camera.tsx can use it directly. A target that moves (a card in a scrolled list, a button on a page that
// scrolls) is a FUNCTION OF THE FRAME: it reads the same script.ts scroll values filmState.ts uses, so a cursor that follows it stays on
// the element while the page scrolls.
//
// WHERE THE NUMBERS COME FROM
//   Fixed layout (the Workspace form, the Attack Lab tiles and cards, the Report, Infra) is MEASURED in the DOM of the real components:
//   run `node tools/measure-anchors.mjs --browser <chrome>` (it renders the DevApp with the probe on) and commit anchors.measured.json. Nothing here is a guess about the live app: it is the position of the film's own pixels.
//   Nav tabs come straight from Header.tsx (navItemRect).
import measured from "./anchors.measured.json";
import { navItemRect } from "../ui/Header";
import { clamp01, mapRange, signature } from "../lib/ease";
import { rectCenter, type Rect } from "./focus";
import { FORM, LAB, REPORT, REPORT_SCROLL, SCREEN_CHANGES, SCREEN_INDEX, keyframeValue, type ScreenName } from "./script";

// ---------------------------------------------------------------------------------------------- measured layout

/** Measured in the DOM by tools/measure-anchors.mjs, window px. */
export const MEASURED = measured as unknown as {
  workspace: { scenarioSelect: Rect; profileStrict: Rect; profileObserve: Rect; holdSelect: Rect; runButton: Rect; paneTabs: Rect[] };
  lab: { tiles: Rect[]; cards: { top: number; h: number }[]; list: Rect; runInCard: Rect; cardX: number; cardW: number };
  report: { verifyButton: Rect; firstCard: Rect };
  infra: { firstPanel: Rect };
};

// ---------------------------------------------------------------------------------------------- helpers

const shift = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });

/** The attack's index in the lab's order is needed for tile and card positions: filmState.ts passes it (it reads the catalog). */
export interface LabLayout {
  /** Number of attacks in the lab. */
  count: number;
  /** Index of the hero attack. */
  heroIndex: number;
}

// ---------------------------------------------------------------------------------------------- nav

/** The nav tab (1-6 = index 0-5) as the cursor clicks it: measured as the active one (Header.navItemRect). */
export function navTabAnchor(index: number): Rect {
  return navItemRect(index);
}

/** The tab the cursor aims at for a screen change, by screen name. */
export function navTabOf(screen: ScreenName): Rect {
  return navItemRect(SCREEN_INDEX[screen]);
}

/** The cursor's tab target at a frame: the next screen change's tab while its hover lead runs, else null. */
export function navCursorAt(frame: number): { screen: ScreenName; rect: Rect; amount: number } | null {
  for (let i = 1; i < SCREEN_CHANGES.length; i++) {
    const c = SCREEN_CHANGES[i];
    const lead = c.hoverLead ?? 0;
    if (lead > 0 && frame >= c.frame - lead && frame <= c.frame) return { screen: c.to, rect: navItemRect(SCREEN_INDEX[c.to]), amount: clamp01((frame - (c.frame - lead)) / lead) };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------- Workspace (TaskForm)

export const workspaceAnchors = {
  /** The scenario select (S2: f690-700). */
  taskSelect: (): Rect => MEASURED.workspace.scenarioSelect,
  /** The profile segment named in FORM.profile (S2: f712-724). */
  profileSegment: (): Rect => (FORM.profile === "strict" ? MEASURED.workspace.profileStrict : MEASURED.workspace.profileObserve),
  /** The hold select (S2: f724-738). */
  holdSelect: (): Rect => MEASURED.workspace.holdSelect,
  /** "Run in sandbox" (S2: f742-750). */
  runButton: (): Rect => MEASURED.workspace.runButton,
  /** A Workspace centre tab pill: 0 terminal, 1 browser, 2 files. */
  paneTab: (index: number): Rect => MEASURED.workspace.paneTabs[index],
};

// ---------------------------------------------------------------------------------------------- Attack Lab

/** Px the Attack Lab card list scrolls so the hero's card sits `margin` px under the top of the list (filmState: labListScrollAt). */
export function labListScrollTarget(heroIndex: number, margin: number): number {
  return Math.max(0, MEASURED.lab.cards[heroIndex].top - margin);
}

/** The scroll of the card list on a frame. */
export function labListScrollOf(frame: number, heroIndex: number): number {
  return mapRange(frame, LAB.listScrollFrom, LAB.listScrollTo, 0, labListScrollTarget(heroIndex, LAB.listMargin), signature);
}

/** The verdict tile of attack `index` (the 15 tiles of the summary bar). */
export function labTileAnchor(index: number): Rect {
  return MEASURED.lab.tiles[index];
}

/** The card of attack `index` at a frame (it moves with the list's scroll). */
export function labCardAnchor(index: number, heroIndex: number, frame: number): Rect {
  const m = MEASURED.lab;
  return { x: m.cardX, y: m.list.y + m.cards[index].top - labListScrollOf(frame, heroIndex), w: m.cardW, h: m.cards[index].h };
}

/** The Run button of attack `index`'s card at a frame (S4: f2212-2220, for the hero). */
export function labRunAnchor(index: number, heroIndex: number, frame: number): Rect {
  const card = labCardAnchor(index, heroIndex, frame);
  const r = MEASURED.lab.runInCard;
  return { x: card.x + r.x, y: card.y + r.y, w: r.w, h: r.h };
}

/** The scroll of the Attack Lab detail pane on a frame. */
export function labDetailScrollOf(frame: number): number {
  return keyframeValue(LAB.detailScroll, frame);
}

// ---------------------------------------------------------------------------------------------- Report

/** The scroll of the Report page on a frame. */
export function reportScrollOf(frame: number): number {
  return keyframeValue(REPORT_SCROLL, frame);
}

/** "Verify ledger now" at a frame (S6: f3950-3960): the page's own position minus the scroll. */
export function verifyButtonAnchor(frame: number): Rect {
  const r = MEASURED.report.verifyButton;
  return shift(r, 0, -reportScrollOf(frame));
}

/** The first dimension card of the Report at a frame. */
export function reportCardAnchor(frame: number): Rect {
  return shift(MEASURED.report.firstCard, 0, -reportScrollOf(frame));
}

// ---------------------------------------------------------------------------------------------- Infra

/** The first panel of the Infra screen (it does not scroll in the film). */
export function infraCardAnchor(): Rect {
  return MEASURED.infra.firstPanel;
}

// ---------------------------------------------------------------------------------------------- one lookup for scenes

export type AnchorName =
  | "taskSelect"
  | "profileSegment"
  | "holdSelect"
  | "runButton"
  | "labTile"
  | "labRun"
  | "labCard"
  | "verifyButton"
  | "reportCard"
  | "infraCard"
  | "workspaceCard";

/** The centre of a rectangle, for a cursor that aims at a point. */
export const anchorPoint = (r: Rect): { x: number; y: number } => rectCenter(r);

/** Where REPORT.verifyHoverFrom puts the cursor on the button (documented here so a scene need not read script.ts). */
export const VERIFY_HOVER_FROM = REPORT.verifyHoverFrom;
