// S5 Page (f3300-3719) "Flagged. Denied. Nothing leaves." (BIBLE 6, S5; Pattern B, containment 3). Patch 17.
//
// What this scene does
//   - f3300 the camera whips onto the Workspace's browser tab (the app's own tab pills, "browser" active, from script.ts SCREEN_CHANGES), the eyebrow badge
//     "Pattern B - sandboxed browser use" draws on; f3330 the camera has landed and the FIXTURE PAGE is drawn over the app's browser panel (src/ui/FixturePage.tsx,
//     rebuilt in code, never a screenshot): a plain article, a visible note box, a visible link. The app behind steps back under a scrim (like S3 and S7).
//   - f3360-3479 THE FENCE. Caption "A page tries to hijack the agent." The page text enters the model through an "untrusted content" fence: a bracket
//     with the label (copy.s5.fenceLabel) round the REAL text the model is given (the tool result's text between the untrusted-data markers). Then the scan:
//     a beam sweeps the page, dims it, and unrolls the three hidden layers (display:none, off-screen, comment) where it passes; they are vermilion and
//     hatched because the ledger's injection.suspected says hidden findings; the visible note gets an outline for the visible finding. The REAL ledger line
//     "Possible prompt injection on page 1 (score N): ..." rises (derive.describe) with a hit.
//   - f3480-3599 THE COMPROMISED AGENT OBEYS. Caption "Flagged. Denied. Nothing leaves." The REAL follow-up command types in (script.ts TYPED.hostileCommand, the
//     same typing as the app's terminal), the REAL "Policy deny (high): ..." line lands with a hit and its reason; "Egress blocked -> host" lines land only if
//     the ledger has them; then a stamp "nothing left the sandbox", built from the report's network and secrets dimensions (s5/data.ts throws if they do not
//     support it), with its three facts as numbers from the report.
//   - f3600-3719 THE APPROVAL BEAT (only if the ledger has approval events; otherwise the previous block is extended). Caption "Risky actions wait for a
//     human. Default: no." The approval modal (the ledger's own summary, risk and reason), a countdown ring racing, resolving to "Approval denied or timed out".
//     No number on the ring: the ledger says denied or timed out, not how long it took, and the film's time is not the run's time.
//   - f3700-3719 the page and the scrim leave, the camera settles on the whole window (fullWindow, padding 60).
//
// Everything on screen is laid out in the app's LOGICAL px (the page card sits exactly on the Workspace's browser panel) and drawn by ONE transform that
// follows the film's camera (`world` below), so the camera's moves, its drift and its hit shakes carry the page, the fence and the cards with the app.
// The camera is computed from this scene's keyframes alone: the film's camera equals it from f3330 on (the first move is complete, and S4's moves are long
// done), and the page card is drawn only from f3330.
//
// Hand-offs. S4's last keyframe is before f3300 (16a: f2400; 16b-16f must end before f3300). S6 (patch 18): its first camera keyframe and cursor waypoint
// start at f3720 or later, from `fullWindow`, padding 60 (this scene's last pose, arrived f3719). The cursor: none (BIBLE 5).
import { Badge, badgePulse, badgeReveal } from "../fx/Badge";
import { Caption } from "../fx/Caption";
import { getCameraState, worldToStage } from "../fx/Camera";
import { MONO_ADVANCE, SERIF_ADVANCE } from "../fx/util";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { GRID, WINDOW } from "../config/focus";
import { TYPED } from "../config/script";
import { alpha, fonts, theme } from "../config/theme";
import { BEAT, CUES, FPS, SCENES, STAGE } from "../config/timeline";
import { getHostileSession } from "../config/filmState";
import { StampBox } from "../gfx/ContainerBox";
import { clamp01, signature, stepPulse } from "../lib/ease";
import { spr } from "../lib/spring";
import { typedText, typingCaret, typingEndFrame } from "../lib/typing";
import { FIXTURE, FixturePage, fixtureLayerTop } from "../ui/FixturePage";
import { PANEL_INSET, TAB_STRIP_H, terminalPaneLayout } from "../ui/TerminalPane";
import { s5Data, type S5Data } from "./s5/data";
const s5 = copy.s5;
const data: S5Data = s5Data(); // throws now, naming what is missing, if the evidence cannot support the scene

// ---------------------------------------------------------------------------------------------- timing

/** Every frame number of the scene (global frames). Retime here; the import-time checks below say what a change breaks. */
export const S5_TIMING = {
  badge: { from: 3300, leaveFrom: 3346, leaveFrames: 12 },
  whip: { from: 3300, levelFrom: 3315, lands: 3330 },
  page: { from: 3330, frames: 14 },
  scrim: { inFrom: 3330, inTo: 3350, outFrom: 3700, outTo: 3719 },
  caption1: { start: CUES.s5.captionHijack, end: 3476 },
  /** The fence (f3360, a beat): the bracket draws, the label and the arrow follow, the text rows are given one by one. */
  fence: { from: 3366, bracketFrames: 24, labelFrom: 3372, arrowFrom: 3378, cardFrom: 3384, rowFrom: 3390, rowStagger: 5 },
  /** The scan: the beam crosses the page linearly; the dim comes in with it. */
  scan: { from: 3396, frames: 36, dimFrom: 3390, dimFrames: 15, dim: 0.78 },
  /** The scanner's ledger line rises on a beat, after the beam has left the page; the camera takes a hit. */
  injection: { at: 3435, frames: 14 },
  phase1Exit: { from: 3468, frames: 12 },
  caption2: { start: CUES.s5.captionFlagged },
  /** The compromised agent's command types on TYPED.hostileCommand (the same frames as the app's terminal); its box is up from f3480. */
  command: { from: 3480, frames: 10 },
  deny: { at: 3525, frames: 12 },
  egress: { at: 3540, stagger: 15, frames: 12 },
  stamp: { at: 3555, frames: 24, factsFrom: 3570, factsFrames: 12 },
  phase2Exit: { from: 3585, frames: 12 },
  caption3: { start: CUES.s5.captionHuman },
  /** The approval beat. The modal is up on a beat, after the app's own approval pin; the ring races, and the denial lands on a beat. */
  approval: { at: 3615, frames: 16, ringFrom: 3630, ringFrames: 30, denied: 3660, resultFrames: 12, exitFrom: 3690, exitFrames: 10, pageDimFrom: 3600, pageDimFrames: 15 },
  pageExit: { from: 3702, frames: 14 },
  settle: { from: 3700, frames: 19 },
  sceneEnd: SCENES.S5.end,
} as const;

/** The frames patch 22 reads (SFX hits). The approval hit exists only when the evidence has approval events. */
export const S5_CUE_ANCHORS = {
  injectionLine: S5_TIMING.injection.at,
  policyDeny: S5_TIMING.deny.at,
  stamp: S5_TIMING.stamp.at,
  approvalDenied: data.approval ? S5_TIMING.approval.denied : null,
} as const;

const T = S5_TIMING;
const HAS_APPROVAL = data.approval !== null;
/** The caption of the second block runs to the end of the scene's content when there is no approval beat. */
const CAPTION2_END = HAS_APPROVAL ? 3596 : 3696;

// ---------------------------------------------------------------------------------------------- camera

/**
 * The camera of the scene. Roll on the whip (a second keyframe levels it, so it is exactly 0 on the landing, f3330). Moves on the beats; the hits
 * (f3435, f3525, f3555, f3660) are no-move keyframes with a short shake, which the world layer follows. No tilt: the page is text at zoom 1.0-1.43.
 */
export const S5_CAMERA: readonly CameraKeyframe[] = [
  kf(T.whip.from, "browserPane", { ease: "signature", frames: 30, rotateZ: 2.2 }),
  kf(T.whip.levelFrom, "browserPane", { ease: "signature", frames: 15, rotateZ: 0 }),
  kf(3360, "s5Fence", { ease: "signature", frames: 30 }),
  kf(T.injection.at, "s5Fence", { ease: "signature", frames: 1, shake: 6 }),
  kf(3480, "s5Ledger", { ease: "signature", frames: 30 }),
  kf(T.deny.at, "s5Ledger", { ease: "signature", frames: 1, shake: 8 }),
  kf(T.stamp.at, "s5Ledger", { ease: "signature", frames: 1, shake: 6 }),
  ...(HAS_APPROVAL
    ? [kf(3600, "s5Approval", { ease: "signature" as const, frames: 30 }), kf(T.approval.denied, "s5Approval", { ease: "signature" as const, frames: 1, shake: 6 })]
    : []),
  kf(T.settle.from, "fullWindow", { padding: 60, ease: "signature", frames: T.settle.frames }),
];

/** No cursor in S5 (BIBLE 5: the cursor is shown in S2, S4a and S6 only). S4's cursor is hidden since f2220. */

// ---------------------------------------------------------------------------------------------- layout (LOGICAL px, the app's window space)

const PANE = terminalPaneLayout();
/** The page card: exactly the Workspace's browser panel (the app's panel under the tab pills, inset by p-3). */
const PAGE = { x: GRID.colLeft + PANEL_INSET, y: GRID.headerH + TAB_STRIP_H + PANEL_INSET, w: PANE.panelW, h: PANE.panelH } as const;
/** The right-hand column over the BlastPanel: the fence, the ledger lines, the command. */
const COL = { x: 1160, w: 430, pad: 14, bar: 4 } as const;
const INNER_W = COL.w - 2 * COL.pad - COL.bar;

const MONO = { size: 20, line: 26 } as const;
const MONO_BIG = { size: 22, line: 28 } as const;
const SERIF = { size: 22, line: 30 } as const;
const SERIF_SMALL = { size: 20, line: 28 } as const;
const HEAD_H = 34;

/** Greedy wrap at `cols` characters (long words are split, never dropped); more than `maxLines` ends with an ellipsis. */
function wrap(text: string, cols: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= cols) {
      cur = next;
      continue;
    }
    if (cur) out.push(cur);
    let w = word;
    while (w.length > cols) {
      out.push(w.slice(0, cols));
      w = w.slice(cols);
    }
    cur = w;
  }
  if (cur) out.push(cur);
  if (out.length <= maxLines) return out;
  const kept = out.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = `${last.length > cols - 1 ? last.slice(0, cols - 1) : last}\u2026`;
  return kept;
}

/** A conservative count of the lines CSS will wrap `text` into (the layout positions cards by this, so a card never runs into the next one). */
const estLines = (text: string, size: number, advance: number): number => Math.max(1, Math.ceil((text.length * size * advance) / INNER_W));

const monoCols = (size: number): number => Math.floor(INNER_W / (size * MONO_ADVANCE));

const FENCE_PARTS = s5.fenceLabel.split(" - ");
const FENCE_ROWS = [...wrap(data.fence.begin, monoCols(MONO.size), 2), ...wrap(data.fence.text, monoCols(MONO.size), 3), ...wrap(data.fence.end, monoCols(MONO.size), 2)];
const FENCE_BEGIN_ROWS = wrap(data.fence.begin, monoCols(MONO.size), 2).length;
const FENCE_END_FROM = FENCE_ROWS.length - wrap(data.fence.end, monoCols(MONO.size), 2).length;

const L1 = (() => {
  const labelTop = 140;
  const cardTop = labelTop + FENCE_PARTS.length * MONO.line + 18;
  const cardH = 2 * COL.pad + FENCE_ROWS.length * MONO.line;
  const injTop = cardTop + cardH + 30;
  const injH = HEAD_H + estLines(data.injection.line, SERIF.size, SERIF_ADVANCE) * SERIF.line + 2 * COL.pad;
  return { labelTop, cardTop, cardH, injTop, injH, bottom: injTop + injH };
})();

const COMMAND_LINES = wrap(data.command, monoCols(MONO_BIG.size), 3);
const L2 = (() => {
  const labelTop = 140;
  const cmdTop = labelTop + MONO.line + 10;
  const cmdH = 2 * COL.pad + COMMAND_LINES.length * MONO_BIG.line;
  const denyTop = cmdTop + cmdH + 30;
  const reasonLines = data.deny.reason ? estLines(data.deny.reason, SERIF_SMALL.size, SERIF_ADVANCE) : 0;
  const denyH = HEAD_H + estLines(data.deny.line, SERIF.size, SERIF_ADVANCE) * SERIF.line + (reasonLines ? 8 + reasonLines * SERIF_SMALL.line : 0) + 2 * COL.pad;
  let top = denyTop + denyH + 24;
  const egress = data.egress.slice(0, 2).map((x) => {
    const h = HEAD_H + estLines(x.line, SERIF.size, SERIF_ADVANCE) * SERIF.line + 2 * COL.pad;
    const r = { top, h };
    top += h + 20;
    return r;
  });
  return { labelTop, cmdTop, cmdH, denyTop, denyH, egress, bottom: top - (egress.length ? 20 : 24) };
})();

/** The stamp sits under the block-2 cards (heights are estimates; the import-time check keeps the whole column above y 864). */
const STAMP = { top: L2.bottom + 30, size: 28, h: 76, gap: 14, factsH: 72 } as const;

// ---------------------------------------------------------------------------------------------- pure helpers of the frame

const rise = (frame: number, from: number, frames: number): number => signature(clamp01((frame - from) / Math.max(1, frames)));

/** The scan's beam position over the page viewport, 0..1 (linear: a sweep). */
const beamAt = (frame: number): number => clamp01((frame - T.scan.from) / T.scan.frames);
const VIEW_H = PAGE.h - 2 - FIXTURE.addressH;

/** The frame the (linear) beam is at `y` px down the page viewport. */
const frameOfBeam = (y: number): number => T.scan.from + (y / VIEW_H) * T.scan.frames;

/** Dim of the visible page behind the scan, and the page card's own opacity in the approval beat. */
function pageDim(frame: number): number {
  const scan = rise(frame, T.scan.dimFrom, T.scan.dimFrames) * T.scan.dim;
  return HAS_APPROVAL ? scan + (0.92 - T.scan.dim) * rise(frame, T.approval.pageDimFrom, T.approval.pageDimFrames) : scan;
}
function pageOpacity(frame: number): number {
  return HAS_APPROVAL ? 1 - 0.7 * rise(frame, T.approval.pageDimFrom, T.approval.pageDimFrames) : 1;
}

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const beatOf = (name: string, f: number): void => {
    if (f % BEAT !== 0) throw new Error(`S5: ${name} (f${f}) is not on a beat (BEAT = ${BEAT})`);
  };
  beatOf("the whip", T.whip.from);
  beatOf("the landing", T.whip.lands);
  beatOf("the fence", T.fence.from - 6);
  beatOf("the scanner's ledger line", T.injection.at);
  beatOf("the policy deny", T.deny.at);
  beatOf("the stamp", T.stamp.at);
  beatOf("the egress line", T.egress.at);
  if (HAS_APPROVAL) {
    beatOf("the approval modal", T.approval.at);
    beatOf("the ring's start", T.approval.ringFrom);
    beatOf("the denial", T.approval.denied);
  }

  // camera order: S4's last keyframe is before f3300, S6's first is from f3720
  const last = S5_CAMERA[S5_CAMERA.length - 1];
  if (!(S5_CAMERA[0].frame >= 3300)) throw new Error("S5: the first keyframe must be on or after f3300");
  if (!(last.frame + (last.frames ?? 0) <= T.sceneEnd)) throw new Error("S5: the settle must have arrived by the last frame of the scene (f3719): S6's first keyframe starts at f3720 or later");

  // the whip has landed (roll 0, both moves complete) before the page is drawn
  if (!(T.whip.levelFrom + 15 <= T.page.from && T.whip.from + 30 <= T.page.from)) throw new Error("S5: the camera must have landed before the page card is drawn (it is anchored to the settled pose)");

  // order of the story
  const order: [string, number][] = [
    ["page", T.page.from],
    ["caption 1", T.caption1.start],
    ["fence bracket", T.fence.from],
    ["scan", T.scan.from],
    ["scanner's ledger line", T.injection.at],
    ["phase 1 exit", T.phase1Exit.from],
    ["caption 2", T.caption2.start],
    ["command", TYPED.hostileCommand.start],
    ["policy deny", T.deny.at],
    ["stamp", T.stamp.at],
    ["phase 2 exit", T.phase2Exit.from],
  ];
  for (let i = 1; i < order.length; i++) if (!(order[i][1] > order[i - 1][1])) throw new Error(`S5: "${order[i][0]}" (f${order[i][1]}) must come after "${order[i - 1][0]}" (f${order[i - 1][1]})`);
  if (!(T.scan.from + T.scan.frames <= T.injection.at)) throw new Error("S5: the beam must have left the page before the scanner's ledger line rises");
  if (!(T.fence.rowFrom + (FENCE_ROWS.length - 1) * T.fence.rowStagger < T.scan.from + T.scan.frames)) throw new Error("S5: the fence's text rows must all be given before the scan ends");
  if (!(T.injection.at + T.injection.frames <= T.phase1Exit.from)) throw new Error("S5: the ledger line must have landed before the fence block leaves");
  if (!(T.phase1Exit.from + T.phase1Exit.frames <= T.caption2.start)) throw new Error("S5: the fence block must be gone when the second block starts");
  if (!(T.caption1.end <= T.caption2.start)) throw new Error("S5: caption 1 must be gone when caption 2 starts");

  // layers are crossed by the beam before the ledger line, and fit the page
  const layers = s5.fixture.hidden.length;
  if (!(fixtureLayerTop(layers - 1) + FIXTURE.layerH <= FIXTURE.linkTop && fixtureLayerTop(layers - 1) + FIXTURE.layerH <= VIEW_H)) throw new Error("S5: the hidden layers do not fit above the link in the page viewport");
  if (!(frameOfBeam(fixtureLayerTop(layers - 1) + FIXTURE.layerH) <= T.injection.at)) throw new Error("S5: the last hidden layer must be fully revealed before the scanner's ledger line");

  // the real run's own pins: the film's overlay never shows an event before the app does
  const session = getHostileSession();
  const pin = (k: string): number | undefined => session.pinFrame.get(k);
  const after = (k: string, f: number, name: string): void => {
    const p = pin(k);
    if (p !== undefined && !(f >= p)) throw new Error(`S5: ${name} (f${f}) is before the app's own "${k}" event (f${p}): retime S5_TIMING or the pins in script.ts`);
  };
  after("injection", T.injection.at, "the scanner's ledger line");
  after("obeyCall", TYPED.hostileCommand.start, "the command");
  after("deny", T.deny.at, "the policy deny line");
  if (HAS_APPROVAL) {
    after("approvalRequested", T.approval.at, "the approval modal");
    after("approvalDenied", T.approval.denied, "the denial");
  }
  // the command is typed (same frames as the app's terminal) before the deny lands, inside the second block
  const typedEnd = typingEndFrame(data.command, TYPED.hostileCommand.start, TYPED.hostileCommand.opts);
  if (!(typedEnd < T.deny.at)) throw new Error(`S5: the command is typed by f${typedEnd}, after the policy deny line (f${T.deny.at})`);
  if (!(TYPED.hostileCommand.start >= T.command.from)) throw new Error("S5: the command must start typing after its box is up");

  // block 2 and the stamp
  if (!(T.deny.at + T.deny.frames <= T.stamp.at)) throw new Error("S5: the deny line must have landed before the stamp");
  if (data.egress.length > 0 && !(T.egress.at > T.deny.at && T.egress.at + (Math.min(2, data.egress.length) - 1) * T.egress.stagger + T.egress.frames <= T.stamp.at + T.stamp.frames)) throw new Error("S5: the egress lines must land after the deny line and before the stamp has settled");
  if (!(T.stamp.factsFrom >= T.stamp.at + 10)) throw new Error("S5: the stamp's facts follow the stamp");
  const block2End = HAS_APPROVAL ? T.phase2Exit.from + T.phase2Exit.frames : T.pageExit.from;
  if (!(T.stamp.factsFrom + T.stamp.factsFrames <= block2End)) throw new Error("S5: the stamp's facts must have landed before block 2 ends");

  // approval beat
  if (HAS_APPROVAL) {
    const a = T.approval;
    if (!(T.phase2Exit.from + T.phase2Exit.frames <= a.at)) throw new Error("S5: block 2 must be gone before the approval modal rises");
    if (!(a.ringFrom >= a.at + a.frames - 2)) throw new Error("S5: the ring races after the modal has risen");
    if (!(a.ringFrom + a.ringFrames <= a.denied)) throw new Error("S5: the ring must have run out when the denial lands");
    if (!(a.denied + a.resultFrames <= a.exitFrom && a.exitFrom + a.exitFrames <= T.pageExit.from)) throw new Error("S5: the denial must hold before the modal leaves, and the modal must be gone before the page leaves");
    if (!(CAPTION2_END <= T.caption3.start)) throw new Error("S5: caption 2 must be gone when caption 3 starts");
  }
  if (!(T.pageExit.from + T.pageExit.frames <= T.sceneEnd)) throw new Error("S5: the page must be gone by the last frame of the scene");

  // the right column fits the stage at the poses that show it (safe margin 96, captions' strip from y 905)
  const checkPose = (name: string, frame: number, bottom: number): void => {
    const cam = getCameraState(frame, S5_CAMERA, FPS, { wideTilt: false });
    const tr = worldToStage(cam, { x: COL.x + COL.w, y: 140 });
    const bl = worldToStage(cam, { x: PAGE.x, y: bottom });
    if (!(tr.x <= STAGE.w - 96)) throw new Error(`S5: at ${name} the right column ends at stage x ${tr.x.toFixed(0)}, inside the 96 px safe margin`);
    if (!(tr.y >= 96)) throw new Error(`S5: at ${name} the right column starts at stage y ${tr.y.toFixed(0)}, inside the 96 px safe margin`);
    if (!(bl.y <= 905)) throw new Error(`S5: at ${name} the content ends at stage y ${bl.y.toFixed(0)}, in the captions' strip (905+)`);
  };
  checkPose("the fence shot", 3395, L1.bottom);
  checkPose("the ledger shot", 3515, L2.bottom);
  // the page card on the stage: not into the captions' strip (the captions are dropped 40 px, ink from y ~945)
  for (const [name, frame] of [["the hold", 3345], ["the fence shot", 3395], ["the ledger shot", 3515]] as const) {
    const cam = getCameraState(frame, S5_CAMERA, FPS, { wideTilt: false });
    const b = worldToStage(cam, { x: PAGE.x, y: PAGE.y + PAGE.h });
    const t = worldToStage(cam, { x: PAGE.x, y: PAGE.y });
    if (!(b.y <= 940)) throw new Error(`S5: at ${name} the page card ends at stage y ${b.y.toFixed(0)}, into the captions (ink from y 945)`);
    if (!(t.y >= 96)) throw new Error(`S5: at ${name} the page card starts at stage y ${t.y.toFixed(0)}, inside the 96 px safe margin`);
  }
  if (!(L1.bottom <= 864 && STAMP.top + STAMP.h + STAMP.gap + STAMP.factsH <= 864)) throw new Error(`S5: the right column is too tall (fence block ends world y ${L1.bottom}, the stamp's facts end ${STAMP.top + STAMP.h + STAMP.gap + STAMP.factsH}; limit 864)`);
  if (!(PAGE.h - 2 - FIXTURE.addressH >= FIXTURE.linkTop + FIXTURE.textLine)) throw new Error("S5: the page card is too short for the fixture's link");
  if (!(COL.x >= PAGE.x + PAGE.w + 20)) throw new Error("S5: the right column must clear the page card");
})();

// ---------------------------------------------------------------------------------------------- world layer (follows the camera)

/** A frame of the scene's camera: what <Camera> renders from f3330 on (see the header). */
const cameraAt = (frame: number) => getCameraState(frame, S5_CAMERA, FPS, { wideTilt: false });

const WorldLayer: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const cam = cameraAt(frame);
  const o = worldToStage(cam, { x: 0, y: 0 });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: WINDOW.w,
        height: WINDOW.h,
        transformOrigin: "0 0",
        transform: `translate(${o.x.toFixed(3)}px, ${o.y.toFixed(3)}px) scale(${cam.scale.toFixed(5)})`,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
};

/** In: a left-to-right mask; out: erased from the top down. Nothing is just faded. */
const clipOf = (inP: number, outP: number): string => `inset(${(outP * 100).toFixed(2)}% ${((1 - inP) * 100).toFixed(2)}% 0 0)`;

const TONE = {
  bad: { ink: theme.bad, wash: theme.badWash, edge: alpha(theme.bad, 0.75), hatch: theme.hatchBad },
  warn: { ink: theme.warn, wash: theme.warnWash, edge: alpha(theme.warn, 0.75), hatch: undefined },
  info: { ink: theme.info, wash: theme.infoWash, edge: alpha(theme.info, 0.7), hatch: undefined },
} as const;

/** One ledger line as a card: the event type as a mono label, the app's own line text (derive.describe), an optional second line. */
const LedgerCard: React.FC<{ tone: keyof typeof TONE; type: string; text: string; sub?: string | null; top: number; inP: number; outP?: number; hit?: number }> = ({ tone, type, text, sub, top, inP, outP = 0, hit = 0 }) => {
  if (inP <= 0 || outP >= 1) return null;
  const c = TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: COL.x,
        top,
        width: COL.w,
        boxSizing: "border-box",
        padding: COL.pad,
        paddingLeft: COL.pad + COL.bar,
        borderRadius: 6,
        border: `1px solid ${c.edge}`,
        backgroundColor: c.wash,
        backgroundImage: c.hatch,
        boxShadow: `0 0 0 ${(3 * hit).toFixed(2)}px ${alpha(c.ink, 0.55 * hit)}, ${theme.liftShadow}`,
        clipPath: clipOf(inP, outP),
        WebkitClipPath: clipOf(inP, outP),
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: COL.bar, backgroundColor: c.ink }} />
      <div style={{ fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${HEAD_H - 8}px`, height: HEAD_H, color: c.ink }}>{type}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: SERIF.size, lineHeight: `${SERIF.line}px`, color: theme.ink, overflowWrap: "anywhere" }}>{text}</div>
      {sub ? <div style={{ marginTop: 8, fontFamily: fonts.serif, fontSize: SERIF_SMALL.size, lineHeight: `${SERIF_SMALL.line}px`, color: theme.ink2, overflowWrap: "anywhere" }}>{sub}</div> : null}
    </div>
  );
};

// ---- block 1: the fence and the scanner's line

const Fence: React.FC<{ frame: number }> = ({ frame }) => {
  const f = T.fence;
  const out = rise(frame, T.phase1Exit.from, T.phase1Exit.frames);
  if (frame < f.from || out >= 1) return null;
  const bracket = clamp01((frame - f.from) / f.bracketFrames);
  const label = rise(frame, f.labelFrom, 14);
  const arrow = rise(frame, f.arrowFrom, 10);
  const card = rise(frame, f.cardFrom, 12);
  const bx = COL.x;
  const cardLeft = COL.x + 16;
  const cardW = COL.w - 16;
  const by0 = L1.cardTop;
  const by1 = L1.cardTop + L1.cardH;
  const bracketLen = (by1 - by0) + 2 * 12;
  const ay = by0 + 40;
  const arrowX0 = PAGE.x + PAGE.w;
  const arrowX1 = bx + 14;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)`, WebkitClipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)` }}>
      {/* the label of the fence, set as three short lines over the bracket */}
      <div style={{ position: "absolute", left: bx, top: L1.labelTop, width: COL.w, clipPath: clipOf(label, 0), WebkitClipPath: clipOf(label, 0) }}>
        {FENCE_PARTS.map((part, i) => (
          <div key={i} style={{ fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? theme.info : theme.ink2, whiteSpace: "nowrap" }}>
            {part}
          </div>
        ))}
      </div>
      {/* the page text crosses into the model */}
      <svg style={{ position: "absolute", left: 0, top: 0, width: WINDOW.w, height: WINDOW.h, overflow: "visible" }}>
        <path d={`M ${arrowX0} ${ay} H ${arrowX1}`} stroke={theme.info} strokeWidth={3} fill="none" strokeDasharray={arrowX1 - arrowX0} strokeDashoffset={(1 - arrow) * (arrowX1 - arrowX0)} />
        <path d={`M ${arrowX1 - 10} ${ay - 8} L ${arrowX1} ${ay} L ${arrowX1 - 10} ${ay + 8}`} stroke={theme.info} strokeWidth={3} fill="none" opacity={arrow >= 1 ? 1 : 0} />
        {/* the bracket: a "[" round the text the model is given */}
        <path
          d={`M ${bx + 12} ${by0} H ${bx} V ${by1} H ${bx + 12}`}
          stroke={theme.info}
          strokeWidth={4}
          fill="none"
          strokeDasharray={bracketLen}
          strokeDashoffset={(1 - signature(bracket)) * bracketLen}
        />
      </svg>
      {/* the text the model is given: the markers and the page text (the tool result), row by row */}
      <div
        style={{
          position: "absolute",
          left: cardLeft,
          top: L1.cardTop,
          width: cardW,
          height: L1.cardH,
          boxSizing: "border-box",
          padding: COL.pad,
          borderRadius: 6,
          border: `1px solid ${alpha(theme.info, 0.6)}`,
          backgroundColor: theme.infoWash,
          clipPath: clipOf(card, 0),
          WebkitClipPath: clipOf(card, 0),
        }}
      >
        {FENCE_ROWS.map((row, i) => {
          const r = rise(frame, f.rowFrom + i * f.rowStagger, 8);
          const marker = i < FENCE_BEGIN_ROWS || i >= FENCE_END_FROM;
          return (
            <div
              key={i}
              style={{
                fontFamily: fonts.mono,
                fontSize: MONO.size,
                lineHeight: `${MONO.line}px`,
                height: MONO.line,
                whiteSpace: "pre",
                color: marker ? theme.info : theme.ink,
                clipPath: clipOf(r, 0),
                WebkitClipPath: clipOf(r, 0),
              }}
            >
              {row}
            </div>
          );
        })}
      </div>
      {/* the scanner's ledger line: the app's own text, with a hit when it lands */}
      <LedgerCard
        tone="bad"
        type={s5LedgerType(data.injection.index)}
        text={data.injection.line}
        top={L1.injTop}
        inP={rise(frame, T.injection.at, T.injection.frames)}
        hit={stepPulse(frame, T.injection.at, 12)}
      />
    </div>
  );
};

/** The event type of a ledger line of the hostile run, from the session's own events (never typed). */
function s5LedgerType(index: number): string {
  return getHostileSession().events[index].type;
}

// ---- block 2: the compromised agent obeys

const Obey: React.FC<{ frame: number }> = ({ frame }) => {
  const t0 = T.command.from;
  const exitFrom = HAS_APPROVAL ? T.phase2Exit.from : T.pageExit.from - T.phase2Exit.frames;
  const out = rise(frame, exitFrom, T.phase2Exit.frames);
  if (frame < t0 || out >= 1) return null;
  const boxIn = rise(frame, t0, T.command.frames);
  const typed = typedText(data.command, frame, TYPED.hostileCommand.start, TYPED.hostileCommand.opts);
  const caret = typingCaret(data.command, frame, TYPED.hostileCommand.start, TYPED.hostileCommand.opts);
  // the typed text wraps like the full command does (same break points), so nothing jumps while it types
  let shown = typed.length;
  const rows = COMMAND_LINES.map((row) => {
    const part = row.slice(0, Math.max(0, shown));
    shown -= row.length + 1;
    return part;
  });
  const deny = rise(frame, T.deny.at, T.deny.frames);
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)`, WebkitClipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)` }}>
      <div style={{ position: "absolute", left: COL.x, top: L2.labelTop, width: COL.w, fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, fontWeight: 700, color: theme.bad, whiteSpace: "nowrap", clipPath: clipOf(boxIn, 0), WebkitClipPath: clipOf(boxIn, 0) }}>
        {s5.agentLabel}
      </div>
      <div
        style={{
          position: "absolute",
          left: COL.x,
          top: L2.cmdTop,
          width: COL.w,
          height: L2.cmdH,
          boxSizing: "border-box",
          padding: COL.pad,
          paddingLeft: COL.pad + COL.bar,
          borderRadius: 6,
          border: `1px solid ${theme.rule2}`,
          backgroundColor: theme.termBg,
          clipPath: clipOf(boxIn, 0),
          WebkitClipPath: clipOf(boxIn, 0),
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: COL.bar, backgroundColor: theme.bad }} />
        {COMMAND_LINES.map((_, i) => (
          <div key={i} style={{ fontFamily: fonts.mono, fontSize: MONO_BIG.size, lineHeight: `${MONO_BIG.line}px`, height: MONO_BIG.line, whiteSpace: "pre", color: theme.termFg }}>
            {rows[i]}
            {caret && i === Math.max(0, rows.filter((r) => r !== "").length - 1) && typed.length < data.command.length ? <span style={{ color: theme.bad }}>{"\u258c"}</span> : null}
          </div>
        ))}
      </div>
      <LedgerCard tone="bad" type={s5LedgerType(data.deny.index)} text={data.deny.line} sub={data.deny.reason} top={L2.denyTop} inP={deny} hit={stepPulse(frame, T.deny.at, 12)} />
      {data.egress.slice(0, 2).map((x, i) => (
        <LedgerCard key={x.index} tone="bad" type={s5LedgerType(x.index)} text={x.line} top={L2.egress[i].top} inP={rise(frame, T.egress.at + i * T.egress.stagger, T.egress.frames)} hit={stepPulse(frame, T.egress.at + i * T.egress.stagger, 12)} />
      ))}
    </div>
  );
};

// ---- the stamp, under the ledger lines of block 2 (never over the page: the hidden layers stay readable)


const Stamp: React.FC<{ frame: number }> = ({ frame }) => {
  const exitFrom = HAS_APPROVAL ? T.phase2Exit.from : T.pageExit.from - T.phase2Exit.frames;
  const out = rise(frame, exitFrom, T.phase2Exit.frames);
  if (frame < T.stamp.at || out >= 1) return null;
  const pop = spr(frame, FPS, T.stamp.at, "uiPop");
  const inP = clamp01((frame - T.stamp.at) / 6);
  const facts = rise(frame, T.stamp.factsFrom, T.stamp.factsFrames);
  const f = [
    `${data.stamp.bytesOut} ${s5.stampFacts.bytesOut}`,
    `${data.stamp.egressAllowed} ${s5.stampFacts.egressAllowed}`,
    `${data.stamp.realSecrets} ${s5.stampFacts.realSecrets}`,
  ];
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)`, WebkitClipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)` }}>
      <div style={{ position: "absolute", left: COL.x, top: STAMP.top, width: COL.w, display: "flex", justifyContent: "center", opacity: inP, transform: `scale(${(0.86 + 0.14 * pop).toFixed(4)})` }}>
        <StampBox tone="ok" size={STAMP.size}>
          {s5.stamp}
        </StampBox>
      </div>
      <div
        style={{
          position: "absolute",
          left: COL.x,
          top: STAMP.top + STAMP.h + STAMP.gap,
          width: COL.w,
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          clipPath: clipOf(facts, 0),
          WebkitClipPath: clipOf(facts, 0),
        }}
      >
        {f.map((text) => (
          <div key={text} style={{ fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, padding: "4px 12px", borderRadius: 5, border: `1px solid ${alpha(theme.ok, 0.6)}`, backgroundColor: theme.okWash, color: theme.ink, whiteSpace: "nowrap" }}>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- block 3: the approval modal

const MODAL = { w: 560, x: PAGE.x + PAGE.w / 2 - 280, top: 250 } as const;
const RING = { r: 46, stroke: 8 } as const;

const Approval: React.FC<{ frame: number }> = ({ frame }) => {
  const ap = data.approval;
  if (!ap) return null;
  const a = T.approval;
  const out = rise(frame, a.exitFrom, a.exitFrames);
  if (frame < a.at || out >= 1) return null;
  const inP = spr(frame, FPS, a.at, "panel");
  const race = clamp01((frame - a.ringFrom) / a.ringFrames);
  const resolved = frame >= a.denied;
  const result = rise(frame, a.denied, a.resultFrames);
  const circ = 2 * Math.PI * RING.r;
  const hit = stepPulse(frame, a.denied, 14);
  const tone = resolved ? TONE.bad : TONE.warn;
  const innerW = MODAL.w - 2 * 22;
  const sumLines = wrap(ap.summary, Math.floor(innerW / (MONO_BIG.size * MONO_ADVANCE)), 3);
  const reasonLines = ap.reasons.length ? estLines(ap.reasons[0], SERIF_SMALL.size, SERIF_ADVANCE) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: MODAL.x,
        top: MODAL.top + (1 - Math.min(1, inP)) * 18,
        width: MODAL.w,
        boxSizing: "border-box",
        padding: 22,
        borderRadius: 10,
        border: `2px solid ${tone.edge}`,
        backgroundColor: theme.sheet,
        backgroundImage: resolved ? theme.hatchBad : undefined,
        boxShadow: `0 0 0 ${(4 * hit).toFixed(2)}px ${alpha(theme.bad, 0.5 * hit)}, ${theme.liftShadow}`,
        clipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)`,
        WebkitClipPath: `inset(${(out * 100).toFixed(2)}% 0 0 0)`,
        opacity: clamp01(inP * 1.5),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, padding: "2px 12px", borderRadius: 5, border: `1px solid ${TONE.warn.edge}`, backgroundColor: theme.warnWash, color: theme.warn, whiteSpace: "nowrap" }}>{s5.approval.chip}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, color: theme.ink3, whiteSpace: "nowrap" }}>{ap.risk}</div>
      </div>
      {sumLines.map((row, i) => (
        <div key={i} style={{ fontFamily: fonts.mono, fontSize: MONO_BIG.size, lineHeight: `${MONO_BIG.line}px`, color: theme.ink, whiteSpace: "pre" }}>
          {row}
        </div>
      ))}
      {reasonLines > 0 ? <div style={{ marginTop: 10, fontFamily: fonts.serif, fontSize: SERIF_SMALL.size, lineHeight: `${SERIF_SMALL.line}px`, color: theme.ink2 }}>{ap.reasons[0]}</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 20 }}>
        <svg width={2 * (RING.r + RING.stroke)} height={2 * (RING.r + RING.stroke)} style={{ flex: "none" }}>
          <circle cx={RING.r + RING.stroke} cy={RING.r + RING.stroke} r={RING.r} fill="none" stroke={alpha(theme.warn, 0.18)} strokeWidth={RING.stroke} />
          <circle
            cx={RING.r + RING.stroke}
            cy={RING.r + RING.stroke}
            r={RING.r}
            fill="none"
            stroke={resolved ? theme.bad : theme.warn}
            strokeWidth={RING.stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={race * circ}
            transform={`rotate(-90 ${RING.r + RING.stroke} ${RING.r + RING.stroke})`}
          />
        </svg>
        <div style={{ display: "flex", gap: 14, flex: 1 }}>
          <div style={{ flex: 1, textAlign: "center", fontFamily: fonts.mono, fontSize: MONO.size, lineHeight: `${MONO.line}px`, padding: "8px 0", borderRadius: 6, border: `1px solid ${theme.rule2}`, color: theme.ink3, opacity: resolved ? 0.45 : 1 }}>{s5.approval.approve}</div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: fonts.mono,
              fontSize: MONO.size,
              lineHeight: `${MONO.line}px`,
              padding: "8px 0",
              borderRadius: 6,
              border: `2px solid ${theme.bad}`,
              backgroundColor: resolved ? theme.bad : theme.badWash,
              color: resolved ? theme.paper : theme.bad,
              fontWeight: 700,
            }}
          >
            {s5.approval.deny}
            <span style={{ marginLeft: 10, fontSize: 18, fontWeight: 400, opacity: 0.85 }}>{`\u00b7 ${s5.approval.defaultMark}`}</span>
          </div>
        </div>
      </div>
      {result > 0 ? (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${TONE.bad.edge}`, fontFamily: fonts.serif, fontSize: SERIF.size, lineHeight: `${SERIF.line}px`, color: theme.bad, clipPath: clipOf(result, 0), WebkitClipPath: clipOf(result, 0) }}>
          {ap.deniedLine}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- scrim

/** The app steps back behind the page and the cards: the same dim and blur as S3's scrim (a backdrop layer, MiniLockerFilm and FilmApp untouched). */
const SCRIM = { dim: 0.55, blurPx: 6 } as const;
function scrimAmount(frame: number): number {
  const s = T.scrim;
  return rise(frame, s.inFrom, s.inTo - s.inFrom) * (1 - rise(frame, s.outFrom, s.outTo - s.outFrom));
}
const Scrim: React.FC<{ frame: number }> = ({ frame }) => {
  const a = scrimAmount(frame);
  if (a <= 0.001) return null;
  const blur = `blur(${(SCRIM.blurPx * a).toFixed(2)}px)`;
  return <div style={{ position: "absolute", inset: 0, background: alpha(theme.paper, SCRIM.dim * a), backdropFilter: blur, WebkitBackdropFilter: blur, pointerEvents: "none" }} />;
};

// ---------------------------------------------------------------------------------------------- the page card

const PageCard: React.FC<{ frame: number }> = ({ frame }) => {
  const inP = rise(frame, T.page.from, T.page.frames);
  const out = rise(frame, T.pageExit.from, T.pageExit.frames);
  if (inP <= 0 || out >= 1) return null;
  const beam = beamAt(frame);
  const beamY = beam * VIEW_H;
  const layers = s5.fixture.hidden.map((_, i) => clamp01((beamY - fixtureLayerTop(i)) / FIXTURE.layerH));
  // the visible note is outlined as the beam leaves it, only if the scanner also flagged a visible instruction
  const noteBottom = FIXTURE.noteTop + 130;
  const noteFlag = data.injection.visible > 0 ? rise(frame, frameOfBeam(noteBottom), 8) : 0;
  return (
    <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y, width: PAGE.w, height: PAGE.h, opacity: pageOpacity(frame), clipPath: `inset(${(out * 100).toFixed(2)}% 0 ${((1 - inP) * 100).toFixed(2)}% 0)`, WebkitClipPath: `inset(${(out * 100).toFixed(2)}% 0 ${((1 - inP) * 100).toFixed(2)}% 0)` }}>
      <FixturePage
        width={PAGE.w}
        height={PAGE.h}
        url={data.page.url}
        status={data.page.status}
        dim={pageDim(frame)}
        beam={frame >= T.scan.from ? beam : null}
        layers={layers}
        flagged={data.injection.hidden > 0}
        noteFlag={noteFlag}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

/** The captions sit 40 px lower than the film's usual position (as in S2c): at the fence shot the page card ends on stage y ~924. */
const CAPTION_DROP = 40;

export const S5Page: React.FC<SceneOverlayProps> = ({ frame }) => {
  const badgeLeave = rise(frame, T.badge.leaveFrom, T.badge.leaveFrames);
  const badgeReveal0 = Math.min(badgeReveal(frame, T.badge.from), 1 - badgeLeave);
  return (
    <>
      <Scrim frame={frame} />
      {frame >= T.page.from ? (
        <WorldLayer frame={frame}>
          <PageCard frame={frame} />
          <Fence frame={frame} />
          <Obey frame={frame} />
          <Stamp frame={frame} />
          <Approval frame={frame} />
        </WorldLayer>
      ) : null}
      <div style={{ position: "absolute", left: 96, top: 140 }}>
        <Badge label={s5.badge} tone="accent" pulse={badgePulse(frame)} reveal={badgeReveal0} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, transform: `translateY(${CAPTION_DROP}px)`, pointerEvents: "none" }}>
        <Caption text={s5.captionHijack} highlight="hijack" startFrame={T.caption1.start} endFrame={T.caption1.end} />
        <Caption text={s5.captionFlagged} highlight="Nothing leaves." startFrame={T.caption2.start} endFrame={CAPTION2_END} />
        {HAS_APPROVAL ? <Caption text={s5.captionHuman} highlight="Default: no." startFrame={T.caption3.start} endFrame={3696} /> : null}
      </div>
    </>
  );
};