// MiniLocker film: THE CHOREOGRAPHY AS DATA (patch 11, BIBLE 6). Every frame number that decides what the recreated app is doing lives
// in this file, split by scene but exported together. To retime the film, change a number here and nothing else:
//   - filmState.ts reads these numbers and the evidence and returns what the app looks like on any frame;
//   - anchors.ts reads them to know where the cursor targets are at a given frame;
//   - the scene files (later patches) add the camera, the cursor and the overlays on top.
//
// RULES
//   - All frames are GLOBAL film frames (the same numbers as BIBLE 6 and CUES in timeline.ts).
//   - No measured value and no UI wording belongs here: wording is copy.ts, values are evidence.json (through select.ts).
//   - Ledger events are named by KEY ("testsFail", "hiddenCheck", ...). filmState.ts turns a key into the real event of the evidence
//     (a key whose event does not exist throws a clear error unless the pin is `optional`).
//   - The end frame of a typed line is never typed here: it comes from src/lib/typing.ts (`typedWindow` below). filmState.ts throws
//     when a typed line would not be finished by the frame its result lands on, so a retime that breaks a line is caught at once.
import { signature } from "../lib/ease";
import { typingEndFrame, type TypingOpts } from "../lib/typing";
import { BEAT } from "./timeline";

// ---------------------------------------------------------------------------------------------- helpers

/** A value that moves between keyframes: it holds the first value before the first frame and the last one after the last. */
export interface Keyframe {
  frame: number;
  value: number;
}

/** The value of `kfs` at `frame`: signature-eased between neighbouring keyframes (keyframes must be in frame order). */
export function keyframeValue(kfs: readonly Keyframe[], frame: number): number {
  if (kfs.length === 0) return 0;
  if (frame <= kfs[0].frame) return kfs[0].value;
  for (let i = 1; i < kfs.length; i++) {
    const a = kfs[i - 1];
    const b = kfs[i];
    if (frame <= b.frame) {
      const t = b.frame === a.frame ? 1 : (frame - a.frame) / (b.frame - a.frame);
      return a.value + (b.value - a.value) * signature(Math.min(1, Math.max(0, t)));
    }
  }
  return kfs[kfs.length - 1].value;
}

/** A typed line: where it starts, and (derived from typing.ts) the first frame on which the whole text is visible. */
export interface TypedWindow {
  start: number;
  end: number;
}

/** The window of a typed line. `end` comes from typing.ts, so a longer text or a different speed moves it by itself. */
export function typedWindow(text: string, start: number, opts?: TypingOpts): TypedWindow {
  return { start, end: typingEndFrame(text, start, opts) };
}

// ---------------------------------------------------------------------------------------------- screens

export type ScreenName = "workspace" | "timeline" | "attackLab" | "report" | "sessions" | "infra";

/** Index of each screen in the header nav (ui.screens). */
export const SCREEN_INDEX: Record<ScreenName, number> = { workspace: 0, timeline: 1, attackLab: 2, report: 3, sessions: 4, infra: 5 };

export interface ScreenChange {
  /** The nav underline starts to slide here. */
  frame: number;
  /** The screen it slides to. */
  to: ScreenName;
  /** Frames the underline takes (0 = it is there from `frame`). */
  slide: number;
  /** The content swaps to the new screen on this frame (a beat, while the camera is moving). */
  swapAt: number;
  /** The Workspace centre tab that is shown once this change has swapped in. Default "terminal". */
  paneTab?: "terminal" | "browser" | "files";
  /** Frames before `frame` in which the cursor is over the target tab (header tab highlight). 0 = none. */
  hoverLead?: number;
}

/** First frame the app is on screen (S2). Earlier frames show the same state as this one. */
export const APP_FIRST_FRAME = 600;
/** Last frame of the app's content (the end of S8). */
export const APP_LAST_FRAME = 4979;

/**
 * BIBLE 6: workspace f600, attack lab f2100, browser tab f3300, report f3720, infra f4560. In frame order.
 * The change at f3300 goes from the Attack Lab to the Workspace (the hostile page task runs there, on its browser tab): no nav
 * underline is hovered for it, the camera whips to the tab.
 */
export const SCREEN_CHANGES: readonly ScreenChange[] = [
  { frame: 600, to: "workspace", slide: 0, swapAt: 600 },
  { frame: 2100, to: "attackLab", slide: 24, swapAt: 2112, hoverLead: 20 },
  { frame: 3300, to: "workspace", slide: 24, swapAt: 3312, paneTab: "browser" },
  { frame: 3720, to: "report", slide: 24, swapAt: 3732, hoverLead: 20 },
  { frame: 4560, to: "infra", slide: 24, swapAt: 4572, hoverLead: 20 },
];

/** While one screen takes over from another, both are mounted for this many frames and cross-fade. */
export const SWAP_FADE_FRAMES = 8;

// ---------------------------------------------------------------------------------------------- terminal

/** How the Workspace terminal plays a ledger run. */
export const TERMINAL = {
  /** Typing speed of a shell command, characters per second (a command that would not be done in time types faster by itself). */
  cps: 42,
  /** Streaming of a block of output: it arrives over round(lines x perLine) frames, but never less than `min` nor more than `max`. */
  stream: { min: 5, max: 34, perLine: 2.5 },
} as const;

// ---------------------------------------------------------------------------------------------- ledger runs (pins)

/**
 * A PIN says: this ledger event appears on this frame, and real time then stands still for `hold` frames so the viewer can read it.
 * Between two pins real time plays linearly, so the frames of every other event follow from the evidence. filmState.ts turns the pins
 * into LedgerClock segments. A pin must come after the one before it by more than its own hold (else filmState throws).
 */
export interface Pin<K extends string> {
  key: K;
  frame: number;
  hold?: number;
  /** An evidence that has no such event simply drops this pin instead of throwing. */
  optional?: boolean;
}

/** Key events of the fix_repo_v2 task (BIBLE 6 S2). */
export type FixKey = "start" | "testsFail" | "patch" | "testsPass" | "finish" | "hiddenCheck" | "audit" | "destroyed" | "end";

export const FIX_RUN = {
  /** The Run button is pressed (BIBLE: f750, press + ripple) and the task starts a few frames later. */
  pressAt: 750,
  pressFrames: 3,
  /** Frames after task.end until the report (the seal) is in. */
  reportLag: 8,
  pins: [
    { key: "start", frame: 753 }, //                       header chip becomes running with the task id
    { key: "testsFail", frame: 880, hold: 24 }, //          the tests run and fail (red)
    { key: "patch", frame: 980, hold: 15 }, //              the patch is written
    { key: "testsPass", frame: 1100, hold: 30 }, //         the re-run is green
    { key: "finish", frame: 1170 },
    { key: "hiddenCheck", frame: 1200, hold: 24 }, //       "Hidden check passed" lands (callout f1200)
    { key: "audit", frame: 1272, hold: 36 }, //             sandbox audit: the gauges flip, the dial arcs light
    { key: "destroyed", frame: 1312 },
    { key: "end", frame: 1322 },
  ] as readonly Pin<FixKey>[],
} as const;

/** Key events of the hostile_page_injection attack as it plays in the Workspace (BIBLE 6 S5). */
export type HostileKey = "start" | "injection" | "obeyCall" | "deny" | "approvalRequested" | "approvalDenied" | "end";

export const HOSTILE_RUN = {
  /**
   * The Workspace takes over from the Attack Lab: the frame its layer starts to fade in (the change's swapAt, 3312, minus half of
   * SWAP_FADE_FRAMES), so the cross-fade never shows the finished fix task. The header chip says running with the attack's task id.
   */
  startFrame: 3308,
  reportLag: 8,
  pins: [
    { key: "start", frame: 3318 },
    { key: "injection", frame: 3430, hold: 24 }, //          "Possible prompt injection on page 1 (score N)" (f3360-3479)
    { key: "obeyCall", frame: 3482 }, //                     the compromised agent obeys: the follow-up command (f3480-3599)
    { key: "deny", frame: 3512, hold: 24 }, //               "Policy deny" lands
    { key: "approvalRequested", frame: 3612, hold: 30, optional: true }, // only if the evidence has approval events (f3600-3719)
    { key: "approvalDenied", frame: 3652, hold: 24, optional: true },
    { key: "end", frame: 3700 },
  ] as readonly Pin<HostileKey>[],
} as const;

// ---------------------------------------------------------------------------------------------- Workspace

/** TaskForm interactions of S2 (BIBLE: scenario select f700, profile strict (hover), hold 1 min f730, click f750). */
export const FORM = {
  selectHoverFrom: 690,
  selectFocusFrom: 694,
  /** The scenario is chosen: its title and task text fill the form (the quick-fill chips go away). */
  selectAt: 700,
  selectBlurAt: 708,
  /** The cursor rests on this profile option (the default, "strict"). */
  profile: "strict" as "strict" | "observe",
  profileHoverFrom: 712,
  profileHoverTo: 724,
  holdHoverFrom: 724,
  holdFocusFrom: 726,
  /** The hold select changes to this many seconds (60 = "hold 1 min"). */
  holdAt: 730,
  holdSeconds: 60 as 0 | 60 | 180 | 600,
  holdBlurAt: 738,
  runHoverFrom: 742,
} as const;

/** The Blast panel gauges: when each one first has something real to show. */
export const GAUGES = {
  /** Network, Policy, Time and Sandboxes are live from the first event. Filesystem, Secrets and Compute flip when the sandbox is audited. */
  auditOrder: ["fs", "sec", "cpu"] as const,
  /** Frames between those three flips (BIBLE: 3 f stagger). */
  auditStagger: 3,
  /** A card rises over this many frames when its value arrives. */
  revealFrames: 10,
  /** A card that just changed glows for this many frames. */
  flashFrames: 18,
} as const;

/**
 * S2 (patch 13c): the Blast panel body scrolls down to the event log, where the line "Hidden check passed" lands (the hiddenCheck pin,
 * f1200), and back up to the dial and the gauges before the audit flips Filesystem / Secrets / Compute (the audit pin, f1272).
 * `px` is how far the body is scrolled while the log is on screen: the hidden check's row then sits in the middle of the panel with the
 * log's other lines under it (the row's own position is measured, anchors.measured.json `blast`).
 */
export const BLAST_LOG_SCROLL = { from: 1190, shownAt: 1224, leaveFrom: 1250, backAt: 1272, px: 700 } as const;

/** Scroll of the Blast panel body (px). It rests at 0 (the dial and the gauges), except while S2 shows the event log. */
export const BLAST_SCROLL: readonly Keyframe[] = [
  { frame: 600, value: 0 },
  { frame: BLAST_LOG_SCROLL.from, value: 0 },
  { frame: BLAST_LOG_SCROLL.shownAt, value: BLAST_LOG_SCROLL.px },
  { frame: BLAST_LOG_SCROLL.leaveFrom, value: BLAST_LOG_SCROLL.px },
  { frame: BLAST_LOG_SCROLL.backAt, value: 0 },
];

/** The Vultr beats. */
export const VULTR = {
  /** The "Vultr Serverless Inference - {model}" chip pulses on every assistant step and fades over this many frames. */
  inferencePulseFrames: 18,
  /** S8 chips (BIBLE: VM f4650, Serverless Inference f4710, Object Storage f4770) and how long each takes to light. */
  chipFrames: [4650, 4710, 4770] as readonly number[],
  chipLightFrames: 16,
} as const;

// ---------------------------------------------------------------------------------------------- Attack Lab

/** Attack Lab interactions of S4 (BIBLE: hover tiles f2160-2219, select rewind_after_rm_rf, click Run f2220, wipe f2340, rewind f2400, checks f2700, verdict f2780). */
export const LAB = {
  /** The attack the film runs. */
  hero: "rewind_after_rm_rf",
  /** The cursor passes over these tiles (an index into the lab's order, or "hero"), each from its frame until the next one. */
  tileHovers: [
    { from: 2166, tile: 1 },
    { from: 2174, tile: 4 },
    { from: 2182, tile: 8 },
    { from: 2190, tile: 13 },
    { from: 2196, tile: "hero" },
  ] as readonly { from: number; tile: number | "hero" }[],
  /** The hero tile is clicked: it is selected, and the card list scrolls so its card is in view. */
  selectAt: 2200,
  listScrollFrom: 2201,
  listScrollTo: 2216,
  runHoverFrom: 2212,
  /** Click on the hero card's Run button (press + ripple). */
  pressAt: 2220,
  pressFrames: 3,
  /** The attack is running from here (busy ring, pulsing tile) ... */
  runStart: 2223,
  /** ... until its result arrives and the steps start to build. */
  resultAt: 2232,
  /** When each kind of step appears (BIBLE: write f2236, the wipe is typed f2300-2339 and lands f2340, rewind f2400, cat f2580-2699). */
  stepAt: { write: 2236, wipe: 2300, rewind: 2400, cat: 2582 } as Readonly<Record<"write" | "wipe" | "rewind" | "cat", number>>,
  /** The output of the wipe (WIPED_0) lands here: THE WIPE (BIBLE: f2340). */
  wipeLandsAt: 2340,
  /** A step of no known kind appears this many frames after the one before it. */
  stepFallbackGap: 40,
  /** The checks light one after another from here (BIBLE: f2700-2819) ... */
  checksFrom: 2700,
  checkEvery: 10,
  /** ... the verdict stamps in and the tile turns blue, the donut goes from 0 to 1 of 15. */
  stampAt: 2780,
  stampFrames: 12,
  donutFrames: 20,
  /** The card list scrolls so the hero card sits this many px under the top of the list. */
  listMargin: 40,
  /**
   * Scroll of the detail pane (px): the steps first, then down to the checks before they light (520 at f2698, where 16c's camera arrives on the pane). Patch 16d:
   * further down (740) as the sixth to eighth checks add rows, so all eight are on the screen (at 520 the sixth is cut by the window's edge), then back to the top
   * by the stamp (f2780), where the verdict banner (it keeps its space from the first result frame) lands at the top of the pane. It stays at 0 after. MEASURED on
   * stills: at 700 the checks' heading is at window y ~310 and the last row ends at y ~878, so at 740 they are at ~270 and ~838 (`attackChecks`), which keeps the
   * eighth row (it lights on f2770) on the screen for the first frames of the scroll back; at 0 the banner is at y 430-567 (`attackVerdict`).
   * A result with more than 8 checks needs a larger scroll and a taller `attackChecks`: S4b4 throws if the evidence has more.
   */
  detailScroll: [
    { frame: 2220, value: 0 },
    { frame: 2660, value: 0 },
    { frame: 2698, value: 520 },
    { frame: 2736, value: 520 },
    { frame: 2756, value: 740 },
    { frame: 2768, value: 740 },
    { frame: 2780, value: 0 },
  ] as readonly Keyframe[],
  /** Patch 16d: the most checks the framing (`attackChecks`, scroll 740) holds. */
  checksFit: 8,
} as const;

/** Typed lines (BIBLE: the wipe types large f2300-2339, the compromised agent's command types f3480+). The end frame is derived. */
export const TYPED = {
  wipeCommand: { start: 2300, opts: { cps: 75, pausePunct: 0.4, pauseSpace: 0.1 } as TypingOpts },
  hostileCommand: { start: 3484, opts: { cps: 70, pausePunct: 0.4, pauseSpace: 0.1 } as TypingOpts },
} as const;

// ---------------------------------------------------------------------------------------------- Report

/** Report beats of S6 (BIBLE: underline f3720, cards from f3780 on beats, Verify click f3960, claims f4080). */
export const REPORT = {
  /** Which run's report the Report screen shows: the fix_repo_v2 task ("fix") or the hostile page attack ("hostile"). */
  source: "fix" as "fix" | "hostile",
  headAt: 3736,
  headFrames: 12,
  /** The nine dimension cards flip in, one every beat, from here. */
  cardsFrom: 3780,
  cardEvery: BEAT,
  cardFrames: 16,
  /**
   * The page scrolls down between these frames, to this many px, so that the ledger block (the Verify button) and the first rows of
   * dimension cards are both on screen BEFORE the cards flip in (the cards sit below the fold of the page at scroll 0).
   */
  scrollFrom: 3756,
  scrollTo: 3780,
  verifyScroll: 560,
  verifyHoverFrom: 3950,
  /** Click on "Verify ledger now" (press + ripple). */
  pressAt: 3960,
  pressFrames: 4,
  /** Spinner until here, then the line "intact - N events - head ...". */
  doneAt: 4020,
  doneFrames: 10,
  /** The claims strip of S6 (four StatNumerals, one per beat) starts here: used by the S6 scene, not by the app. */
  claimsFrom: 4080,
} as const;

/**
 * The Report page's scroll (px). 0 until the screens swap, 560 by f3780 (the ledger block and the first row of cards in view), then (patch 18) it
 * FOLLOWS THE CARDS: the nine cards sit in five rows (page y 1163, 1341, 1520, 1647, 1839, the last 198 px tall; MEASURED.report.cards), and only the first row and a half are
 * on screen at 560. Each step below lands before its row finishes flipping in (cards flip on REPORT.cardsFrom + i * cardEvery, two per row), so every
 * card is seen arriving; then the page sweeps back up to the ledger block (the button is at page y 1068, so it is on screen again at 560) before
 * the cursor reaches it (REPORT.verifyHoverFrom). Signature-eased between keyframes, so it moves on the beats and rests on every row.
 */
export const REPORT_SCROLL: readonly Keyframe[] = [
  { frame: 3720, value: 0 },
  { frame: REPORT.scrollFrom, value: 0 },
  { frame: REPORT.scrollTo, value: REPORT.verifyScroll },
  { frame: 3800, value: REPORT.verifyScroll },
  { frame: 3826, value: 700 },
  { frame: 3834, value: 700 },
  { frame: 3858, value: 830 },
  { frame: 3864, value: 830 },
  { frame: 3888, value: 1000 },
  { frame: 3894, value: 1000 },
  { frame: 3912, value: 1180 },
  { frame: 3920, value: 1180 },
  { frame: 3946, value: REPORT.verifyScroll },
];

// ---------------------------------------------------------------------------------------------- Infra

/** Infra beats of S8 (BIBLE: f4560-4619 the real Infra screen, the panels flash with their real values). */
export const INFRA = {
  /** The wiring diagram, then panels 1 to 6, one after another. */
  diagramAt: 4564,
  panelsFrom: 4572,
  panelEvery: 8,
  riseFrames: 14,
  /** A panel flashes this many frames after it lands, for this long. */
  flashDelay: 12,
  flashFrames: 16,
} as const;

// ---------------------------------------------------------------------------------------------- one object for code that walks it all

export const SCRIPT = {
  screens: SCREEN_CHANGES,
  terminal: TERMINAL,
  fix: FIX_RUN,
  hostile: HOSTILE_RUN,
  form: FORM,
  gauges: GAUGES,
  vultr: VULTR,
  lab: LAB,
  typed: TYPED,
  report: REPORT,
  infra: INFRA,
} as const;
