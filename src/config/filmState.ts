// MiniLocker film: THE STATE OF THE WHOLE APP AT ANY FRAME (patch 11).
//
//   useFilmState(frame)  ->  FilmState
//
// One pure function of the GLOBAL frame. It reads the choreography (src/config/script.ts) and the evidence (src/data/select.ts) and
// returns, already typed as the props of the UI components, what every screen of the recreated app looks like on that frame. FilmApp.tsx
// only spreads it into components; scenes never compute app state themselves.
//
// "use" is a naming courtesy of the spec: there is no React hook inside. Same frame, same state, on any machine, in any order.
//
// HOW A LEDGER RUN IS PLAYED (the fix_repo_v2 task and the hostile page attack)
//   The pins of script.ts name key events ("testsFail", "hiddenCheck", ...). Each key is looked up in the evidence by the rules in
//   resolveFix / resolveHostile below (the rule, not an id, so a re-capture needs no edit). The pins become LedgerClock segments: real
//   time plays linearly between two pins and stands still for `hold` frames after a pin. Every other event gets the frame the clock
//   gives it, pushed apart to at least 6 frames (fewer when the gap is crowded); a pinned event always lands exactly on its pin frame.
//
// WHAT IS NEVER TYPED HERE: a number, a host, a hash, a command, a label, a verdict. They come out of select.ts, or out of the product's
// own derive/gauges/terminal-lines functions applied to ledger events. The only literals are frame arithmetic and tuning constants.

import { FPS } from "./timeline";
import {
  APP_FIRST_FRAME,
  APP_LAST_FRAME,
  BLAST_SCROLL,
  FIX_RUN,
  FORM,
  GAUGES,
  HOSTILE_RUN,
  INFRA,
  LAB,
  REPORT,
  SCREEN_CHANGES,
  SCREEN_INDEX,
  SWAP_FADE_FRAMES,
  TERMINAL,
  TYPED,
  VULTR,
  keyframeValue,
  typedWindow,
  type FixKey,
  type HostileKey,
  type Pin,
  type ScreenName,
} from "./script";
import { labDetailScrollOf, labListScrollOf, reportScrollOf } from "./anchors";
import {
  selectAttack,
  selectAttackCatalog,
  selectAttackEvents,
  selectAttackReport,
  selectAttackVerify,
  selectInfra,
  selectScenarios,
  selectTask,
} from "../data/select";
import type { AttackResult, LedgerEvent, Profile, Report, ScenarioInfo, Verification } from "../data/types";
import { clamp01, signature, stepPulse } from "../lib/ease";
import { makeClock, type ClockSegment, type LedgerClock } from "../lib/clock";
import { GAUGE_KEYS, type GaugeKey } from "../lib/gauges";
import { mixSeed } from "../lib/prng";
import { RISE_FRAMES, riseProgress } from "../lib/rise";
import { streamArrivals, streamLines, tailScrollOffset } from "../lib/stream";
import { terminalRows, type TermRow } from "../lib/terminal-lines";
import { caretVisible, typedText, typingEndFrame, type TypingOpts } from "../lib/typing";
import { dialPulsePhase } from "../ui/RadiusDial";
import { orderedChecks, type AttackLabScreenProps, type AttackTile, type TileState } from "../ui/AttackLabScreen";
import type { BlastPanelProps } from "../ui/BlastPanel";
import type { InfraScreenProps } from "../ui/InfraScreen";
import type { ReportScreenProps } from "../ui/ReportScreen";
import { stepEvents, type StepStreamProps } from "../ui/StepStream";
import type { TaskFormProps } from "../ui/TaskForm";
import type { PaneTab, TerminalPaneProps } from "../ui/TerminalPane";
import type { TermLine } from "../ui/TerminalView";
import { pulsePhase, spinProgress } from "../ui/primitives";

// ---------------------------------------------------------------------------------------------- the state

export interface WorkspaceState {
  form: TaskFormProps;
  steps: StepStreamProps;
  /** Everything TerminalPane needs except the content of its browser / files tabs (FilmApp adds those). */
  terminal: Omit<TerminalPaneProps, "children">;
  blast: BlastPanelProps;
  /** The ledger events visible on this frame (what the browser tab draws its pages from). */
  events: readonly LedgerEvent[];
}

export interface FilmLayer {
  screen: ScreenName;
  /** 1 for a screen on its own; two layers that cross-fade carry opacities that add up to 1. */
  opacity: number;
}

export interface HeaderState {
  taskId: string | null;
  status: string;
  /** Phase 0..1 of the "running" ping. */
  pulse: number;
}

export interface FilmState {
  /** The frame the state is for, clamped to APP_FIRST_FRAME..APP_LAST_FRAME. */
  frame: number;
  /** The nav underline position as a screen index; fractional while it slides. */
  activeScreen: number;
  /** The nav tab the cursor is over (header hover colour), if any. */
  tabHighlight?: number;
  /** The screens that are mounted, bottom to top. One, or two while they cross-fade. */
  layers: FilmLayer[];
  /** The Workspace centre tab. */
  paneTab: PaneTab;
  header: HeaderState;
  workspace: WorkspaceState;
  attackLab: Omit<AttackLabScreenProps, "style">;
  report: Omit<ReportScreenProps, "style">;
  infra: Omit<InfraScreenProps, "style">;
  /** Beats for the overlays that belong to Vultr (BIBLE 6 S2 and S8). */
  vultr: {
    /** 0..1: the "Vultr Serverless Inference - {model}" chip. 1 on the frame an assistant step lands, fading to 0. */
    inferencePulse: number;
    /** 0..1 per S8 chip (VM, Serverless Inference, Object Storage): how lit it is. */
    chips: number[];
  };
  /** Scroll offsets in px (camera-independent): what each scrolling body is scrolled up by. */
  scroll: { blast: number; labList: number; labDetail: number; report: number; infra: number };
}

// ---------------------------------------------------------------------------------------------- errors

function fail(message: string): never {
  throw new Error(`filmState: ${message}`);
}

// ---------------------------------------------------------------------------------------------- finding the key events

type Resolved<K extends string> = Partial<Record<K, number>>;

const toolOf = (e: LedgerEvent): string => String(e.payload.tool ?? "");
const exitCode = (e: LedgerEvent): number | null => {
  const m = String(e.payload.result ?? "").match(/^exit_code=(-?\d+)/);
  return m ? Number(m[1]) : null;
};
const cmdOf = (e: LedgerEvent): string => {
  try {
    return String(JSON.parse(String(e.payload.args ?? "{}")).cmd ?? "");
  } catch {
    return "";
  }
};
const firstAfter = (events: readonly LedgerEvent[], from: number, test: (e: LedgerEvent, i: number) => boolean): number | undefined => {
  for (let i = from + 1; i < events.length; i++) if (test(events[i], i)) return i;
  return undefined;
};

/** The call that produced the tool.result at `i`: the nearest earlier tool.call. */
const callOf = (events: readonly LedgerEvent[], i: number): LedgerEvent | undefined => {
  for (let j = i - 1; j >= 0; j--) if (events[j].type === "tool.call") return events[j];
  return undefined;
};

/**
 * The rule that finds each FixKey in a fix_repo_v2 ledger:
 *   start        the task.start event
 *   testsFail    the first shell result with a non-zero exit code (the first red test run)
 *   patch        the first write_file call after that
 *   testsPass    the first later shell result with exit code 0 whose command ran the tests (unittest / pytest)
 *   finish       the finish call
 *   hiddenCheck  the scenario.check event
 *   audit        the first sandbox.audit
 *   destroyed    the first sandbox.destroyed after the audit
 *   end          the task.end event
 */
function resolveFix(events: readonly LedgerEvent[]): Resolved<FixKey> {
  const r: Resolved<FixKey> = {};
  r.start = events.findIndex((e) => e.type === "task.start");
  r.testsFail = events.findIndex((e) => e.type === "tool.result" && toolOf(e) === "run_shell" && (exitCode(e) ?? 0) !== 0);
  if (r.testsFail >= 0) r.patch = firstAfter(events, r.testsFail, (e) => e.type === "tool.call" && toolOf(e) === "write_file");
  if (r.patch !== undefined) {
    r.testsPass = firstAfter(events, r.patch, (e, i) => {
      if (e.type !== "tool.result" || toolOf(e) !== "run_shell" || exitCode(e) !== 0) return false;
      const call = callOf(events, i);
      return !!call && /unittest|pytest/.test(cmdOf(call));
    });
  }
  r.finish = events.findIndex((e) => e.type === "tool.call" && toolOf(e) === "finish");
  r.hiddenCheck = events.findIndex((e) => e.type === "scenario.check");
  r.audit = events.findIndex((e) => e.type === "sandbox.audit");
  if (r.audit >= 0) r.destroyed = firstAfter(events, r.audit, (e) => e.type === "sandbox.destroyed");
  r.end = events.findIndex((e) => e.type === "task.end");
  return r;
}

/**
 * The rule that finds each HostileKey in a hostile_page_injection ledger:
 *   start              the task.start event
 *   injection          the first injection.suspected
 *   obeyCall           the first tool call after it (the compromised agent obeying the page)
 *   deny               the first policy.decision with action "deny" after the injection
 *   approvalRequested  the first approval.requested   (optional)
 *   approvalDenied     the first approval.denied      (optional)
 *   end                the task.end event
 */
function resolveHostile(events: readonly LedgerEvent[]): Resolved<HostileKey> {
  const r: Resolved<HostileKey> = {};
  r.start = events.findIndex((e) => e.type === "task.start");
  r.injection = events.findIndex((e) => e.type === "injection.suspected");
  if (r.injection >= 0) {
    r.obeyCall = firstAfter(events, r.injection, (e) => e.type === "tool.call" && toolOf(e) !== "finish");
    r.deny = firstAfter(events, r.injection, (e) => e.type === "policy.decision" && e.payload.action === "deny");
  }
  const ar = events.findIndex((e) => e.type === "approval.requested");
  if (ar >= 0) r.approvalRequested = ar;
  const ad = events.findIndex((e) => e.type === "approval.denied");
  if (ad >= 0) r.approvalDenied = ad;
  r.end = events.findIndex((e) => e.type === "task.end");
  return r;
}

// ---------------------------------------------------------------------------------------------- the terminal blocks

interface TermBlock {
  /** Index of the ledger event the block's rows were written for. */
  src: number;
  rows: TermRow[];
  start: number;
  /** The command block types its first row. */
  typed: boolean;
}

// ---------------------------------------------------------------------------------------------- a played run

export interface Session {
  name: string;
  taskId: string;
  events: readonly LedgerEvent[];
  /** The frame each event lands on (same order as events). */
  frames: readonly number[];
  frameOfId: ReadonlyMap<number, number>;
  clock: LedgerClock;
  /** Pin frames by key. */
  pinFrame: ReadonlyMap<string, number>;
  /** Pin event indices by key. */
  pinIndex: ReadonlyMap<string, number>;
  startEventFrame: number;
  endEventFrame: number;
  reportLag: number;
  report: Report;
  verify: Verification;
  /** The terminal, cut into blocks at the frames of their events. */
  blocks: readonly TermBlock[];
  /** Index (in events) of the event whose command types with the TYPED.hostileCommand timing, or -1. */
  typedOverrideIndex: number;
}

const MIN_SPACING = 6;

function pinsToSession<K extends string>(
  name: string,
  events: readonly LedgerEvent[],
  taskId: string,
  report: Report,
  verify: Verification,
  pins: readonly Pin<K>[],
  resolved: Resolved<K>,
  reportLag: number,
  typedOverrideKey: K | null,
): Session {
  // 1. which pins exist, and where
  const live: { pin: Pin<K>; index: number }[] = [];
  for (const pin of pins) {
    const index = resolved[pin.key];
    if (index === undefined || index < 0) {
      if (pin.optional) continue;
      fail(`script pin "${pin.key}" of the ${name} run has no event in the evidence (rule in filmState.ts, resolve${name === "fix" ? "Fix" : "Hostile"}). Re-capture, or change the pins in src/config/script.ts.`);
    }
    live.push({ pin, index });
  }
  if (live.length < 2) fail(`the ${name} run needs at least two pins`);
  for (let i = 1; i < live.length; i++) {
    const a = live[i - 1];
    const b = live[i];
    if (!(b.index > a.index)) fail(`pins "${a.pin.key}" and "${b.pin.key}" of the ${name} run are out of order in the ledger (events ${a.index} and ${b.index}); reorder them in script.ts`);
    if (!(b.pin.frame - a.pin.frame > (a.pin.hold ?? 0))) {
      fail(`pin "${b.pin.key}" (f${b.pin.frame}) must come more than the hold (${a.pin.hold ?? 0}) frames after "${a.pin.key}" (f${a.pin.frame}) in the ${name} run`);
    }
  }

  // 2. effective timestamps (strictly increasing, so two events with the same timestamp still make a valid segment)
  const eff: number[] = [];
  live.forEach((l, i) => eff.push(i === 0 ? events[l.index].ts : Math.max(events[l.index].ts, eff[i - 1] + 1e-6)));

  // 3. the clock
  const segments: ClockSegment[] = [];
  for (let i = 0; i + 1 < live.length; i++) {
    const hold = live[i].pin.hold ?? 0;
    segments.push({
      fromTs: eff[i],
      toTs: eff[i + 1],
      startFrame: live[i].pin.frame,
      endFrame: live[i + 1].pin.frame,
      ...(hold > 0 ? { holdAt: [{ ts: eff[i], frames: hold }] } : null),
    });
  }
  const clock = makeClock(events, segments);

  // 4. the frame of every event
  const frames: number[] = new Array(events.length);
  live.forEach((l) => (frames[l.index] = l.pin.frame));
  const firstLive = live[0];
  for (let i = 0; i < firstLive.index; i++) frames[i] = firstLive.pin.frame;
  for (let k = 0; k + 1 < live.length; k++) {
    const A = live[k];
    const B = live[k + 1];
    const n = B.index - A.index - 1;
    if (n <= 0) continue;
    const lowerFree = A.pin.frame + (A.pin.hold ?? 0);
    const avail = B.pin.frame - lowerFree;
    const s = Math.min(MIN_SPACING, Math.floor(avail / (n + 1)));
    if (s < 1) fail(`${n} events fit between pins "${A.pin.key}" (f${A.pin.frame}) and "${B.pin.key}" (f${B.pin.frame}) of the ${name} run: move the pins further apart in script.ts`);
    const f: number[] = [];
    for (let j = 0; j < n; j++) {
      const want = Math.round(clock.frameOfTs(events[A.index + 1 + j].ts));
      const floor = j === 0 ? Math.max(A.pin.frame + s, lowerFree) : f[j - 1] + s;
      f.push(Math.max(want, floor));
    }
    for (let j = n - 1; j >= 0; j--) f[j] = Math.min(f[j], j === n - 1 ? B.pin.frame - s : f[j + 1] - s);
    for (let j = 0; j < n; j++) frames[A.index + 1 + j] = f[j];
  }
  const lastLive = live[live.length - 1];
  for (let i = lastLive.index + 1; i < events.length; i++) frames[i] = (i === lastLive.index + 1 ? lastLive.pin.frame : frames[i - 1]) + 2;

  const frameOfId = new Map<number, number>();
  events.forEach((e, i) => frameOfId.set(e.id, frames[i]));

  const pinFrame = new Map<string, number>();
  const pinIndex = new Map<string, number>();
  live.forEach((l) => {
    pinFrame.set(l.pin.key, l.pin.frame);
    pinIndex.set(l.pin.key, l.index);
  });

  // 5. the terminal, cut into blocks
  const rows = terminalRows(events);
  const blocks: TermBlock[] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && last.src === row.src) last.rows.push(row);
    else blocks.push({ src: row.src, rows: [row], start: frames[row.src], typed: row.tone === "cmd" });
  }
  const typedOverrideIndex = typedOverrideKey !== null ? (pinIndex.get(typedOverrideKey) ?? -1) : -1;

  const startIdx = pinIndex.get("start");
  const endIdx = pinIndex.get("end");
  if (startIdx === undefined || endIdx === undefined) fail(`the ${name} run needs "start" and "end" pins`);

  return {
    name,
    taskId,
    events,
    frames,
    frameOfId,
    clock,
    pinFrame,
    pinIndex,
    startEventFrame: frames[startIdx],
    endEventFrame: frames[endIdx],
    reportLag,
    report,
    verify,
    blocks,
    typedOverrideIndex,
  };
}

let fixSession: Session | null = null;
let hostileSession: Session | null = null;

/** The fix_repo_v2 run, played on FIX_RUN's pins. Built once, on first use. */
export function getFixSession(): Session {
  if (!fixSession) {
    const t = selectTask();
    fixSession = pinsToSession("fix", t.events, t.id, t.report, t.verify, FIX_RUN.pins, resolveFix(t.events), FIX_RUN.reportLag, null);
  }
  return fixSession;
}

/** The hostile page run, played on HOSTILE_RUN's pins. Built once, on first use. */
export function getHostileSession(): Session {
  if (!hostileSession) {
    const result = selectAttack("hostile_page_injection");
    const events = selectAttackEvents("hostile_page_injection");
    if (!result.task_id) fail("evidence.attacks.hostile_page_injection.result.task_id is missing");
    const s = pinsToSession(
      "hostile",
      events,
      result.task_id,
      selectAttackReport("hostile_page_injection"),
      selectAttackVerify("hostile_page_injection"),
      HOSTILE_RUN.pins,
      resolveHostile(events),
      HOSTILE_RUN.reportLag,
      "obeyCall",
    );
    // the compromised agent's command must be fully typed before the event after it lands (the policy deny)
    const call = s.events[s.typedOverrideIndex];
    const text = call ? (terminalRows([call])[0]?.text ?? "") : "";
    const nextBlock = s.blocks.find((b) => b.src > s.typedOverrideIndex);
    if (text && nextBlock) {
      const win = typedWindow(text, TYPED.hostileCommand.start, TYPED.hostileCommand.opts);
      if (win.end >= nextBlock.start) {
        fail(`TYPED.hostileCommand: the command would be typed by f${win.end}, but the next terminal block lands on f${nextBlock.start}. Start it earlier or raise its cps in src/config/script.ts.`);
      }
    }
    hostileSession = s;
  }
  return hostileSession;
}

// ---------------------------------------------------------------------------------------------- terminal at a frame

interface TermAt {
  lines: TermLine[];
  caretLine?: number;
  caretCol?: number;
  caretOn: boolean;
  arrivals: number[];
}

const len = (s: string): number => Array.from(s).length;

/** The opts a command is typed with, and the frame it starts on. A command that would not be done before `limit` types quicker. */
function typingPlan(text: string, start: number, limit: number, override: { start: number; opts: TypingOpts } | null): { start: number; opts: TypingOpts } {
  if (override) return override;
  const base: TypingOpts = { cps: TERMINAL.cps, pausePunct: 0.6, pauseSpace: 0.2 };
  if (typingEndFrame(text, start, base) <= limit) return { start, opts: base };
  const needed = (len(text) * FPS) / Math.max(2, limit - start - 1);
  return { start, opts: { ...base, cps: Math.max(TERMINAL.cps, needed * 1.4) } };
}

function terminalAt(frame: number, s: Session): TermAt {
  const lines: TermLine[] = [];
  const arrivals: number[] = [];
  let caretLine: number | undefined;
  let caretCol: number | undefined;
  let busy = false; // characters are still arriving: the caret does not blink

  const blocks = s.blocks;
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const override = block.src === s.typedOverrideIndex ? { start: TYPED.hostileCommand.start, opts: TYPED.hostileCommand.opts as TypingOpts } : null;
    const start = override ? override.start : block.start;
    if (frame < start) break;
    const next = b + 1 < blocks.length ? blocks[b + 1].start : Infinity;
    const limit = Number.isFinite(next) ? next - 1 : start + 600;

    if (block.typed) {
      const full = block.rows[0].text;
      const plan = typingPlan(full, start, limit, override);
      const end = Math.min(typingEndFrame(full, plan.start, plan.opts), Math.max(plan.start + 1, limit));
      const done = frame >= end;
      const shown = done ? full : typedText(full, frame, plan.start, plan.opts);
      lines.push({ text: shown, tone: block.rows[0].tone });
      arrivals.push(start);
      if (!done) {
        busy = true;
        caretLine = lines.length - 1;
        caretCol = len(shown);
        break;
      }
      for (let k = 1; k < block.rows.length; k++) {
        lines.push({ text: block.rows[k].text, tone: block.rows[k].tone });
        arrivals.push(end);
      }
    } else {
      const count = block.rows.length;
      const span = Math.min(TERMINAL.stream.max, Math.max(TERMINAL.stream.min, Math.round(count * TERMINAL.stream.perLine)));
      const end = Math.max(start + 1, Math.min(start + span, limit));
      const seed = mixSeed(block.src, 0x7e11);
      if (frame >= end) {
        const arr = count > 0 ? streamArrivals(block.rows, start, end, seed) : [];
        block.rows.forEach((r, k) => {
          lines.push({ text: r.text, tone: r.tone });
          arrivals.push(arr[k] ?? start);
        });
      } else {
        const res = streamLines(block.rows, frame, start, end, seed);
        const arr = streamArrivals(block.rows, start, end, seed);
        res.visibleLines.forEach((r, k) => {
          lines.push({ text: r.text, tone: r.tone });
          arrivals.push(arr[k] ?? start);
        });
        busy = true;
        caretLine = lines.length - 1;
        caretCol = res.caretCol;
        break;
      }
    }
  }

  if (caretLine === undefined && lines.length > 0) {
    caretLine = lines.length - 1;
    caretCol = len(lines[lines.length - 1].text);
  }
  return { lines, caretLine, caretCol, caretOn: busy ? true : caretVisible(frame), arrivals };
}

/** A command the terminal types: its text, the frame the first character lands on, the frame the whole text is visible on, and the options it types with. */
export interface TypedCommand {
  text: string;
  start: number;
  end: number;
  opts: TypingOpts;
}

/**
 * Patch 22 (sound). Every command the terminal of `s` types, with the SAME plan `terminalAt` uses (same start, same options, same end), so a key tick can land on
 * every frame on which a character arrives and never drift from the picture. Pure; it does not change what the terminal draws.
 */
export function typedCommands(s: Session): TypedCommand[] {
  const out: TypedCommand[] = [];
  const blocks = s.blocks;
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    if (!block.typed) continue;
    const override = block.src === s.typedOverrideIndex ? { start: TYPED.hostileCommand.start, opts: TYPED.hostileCommand.opts as TypingOpts } : null;
    const start = override ? override.start : block.start;
    const next = b + 1 < blocks.length ? blocks[b + 1].start : Infinity;
    const limit = Number.isFinite(next) ? next - 1 : start + 600;
    const text = block.rows[0].text;
    const plan = typingPlan(text, start, limit, override);
    const end = Math.min(typingEndFrame(text, plan.start, plan.opts), Math.max(plan.start + 1, limit));
    out.push({ text, start: plan.start, end, opts: plan.opts });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------- workspace

/** Which gauge lights up when this event lands (same rule as DevWorkspace, patch 06). */
function flashKeyOf(e: LedgerEvent): GaugeKey | null {
  switch (e.type) {
    case "egress.blocked":
    case "egress.allowed":
      return "net";
    case "policy.decision":
      return e.payload.action === "allow" ? null : "pol";
    case "canary.read":
    case "canary.tripped":
    case "canary.exposed":
    case "canary.copied":
    case "sandbox.audit":
      return "sec";
    case "sandbox.created":
    case "sandbox.destroyed":
    case "sandbox.recreated":
      return "sbx";
    default:
      return null;
  }
}

const inWindow = (frame: number, from: number, to: number): boolean => frame >= from && frame < to;

function scenarioOf(task: { scenario: string }): ScenarioInfo {
  const found = selectScenarios().find((x) => x.id === task.scenario);
  if (!found) fail(`evidence.scenarios has no entry for "${task.scenario}"`);
  return found;
}

function profileOf(events: readonly LedgerEvent[]): Profile {
  const p = events.find((e) => e.type === "task.start")?.payload.profile;
  if (p !== "strict" && p !== "observe") fail("the task.start event has no profile");
  return p;
}

function workspaceAt(frame: number, s: Session, isFix: boolean): WorkspaceState {
  const all = s.events;
  const efs = s.frames;
  const first = s.startEventFrame;
  const visibleIdx: number[] = [];
  efs.forEach((f, i) => {
    if (f <= frame) visibleIdx.push(i);
  });
  const events = visibleIdx.map((i) => all[i]);

  const startFrame = isFix ? FIX_RUN.pressAt + FIX_RUN.pressFrames : HOSTILE_RUN.startFrame;
  const submitted = frame >= startFrame;
  const ended = frame >= s.endEventFrame;
  const running = submitted && !ended;
  const reportIn = frame >= s.endEventFrame + s.reportLag;

  // gauges: what has something real to show, and when
  const auditIdx = all.findIndex((e) => e.type === "sandbox.audit");
  const auditAt = auditIdx >= 0 ? efs[auditIdx] : Infinity;
  const measuredAt: Record<GaugeKey, number> = { net: first, pol: first, time: first, sbx: first, fs: Infinity, sec: Infinity, cpu: Infinity };
  GAUGES.auditOrder.forEach((k, i) => (measuredAt[k] = auditAt + i * GAUGES.auditStagger));
  const reveal = GAUGE_KEYS.map((k) => (frame < measuredAt[k] ? 1 : riseProgress(frame, measuredAt[k], GAUGES.revealFrames)));

  let flash: GaugeKey | undefined;
  let flashFrame = -Infinity;
  for (const i of visibleIdx) {
    const k = flashKeyOf(all[i]);
    if (k && efs[i] >= flashFrame) {
      flash = k;
      flashFrame = efs[i];
    }
  }
  const flashAmount = flash ? 1 - clamp01((frame - flashFrame) / GAUGES.flashFrames) : 0;

  // the terminal and the transcript
  const term = terminalAt(frame, s);
  const steps = stepEvents(events);
  const progress = steps.map((e) => riseProgress(frame, s.frameOfId.get(e.id) ?? 0));

  // the form
  let form: TaskFormProps;
  if (isFix) {
    const task = selectTask();
    const profile = profileOf(all);
    if (FORM.profile !== profile) fail(`script FORM.profile is "${FORM.profile}" but the evidence task ran under "${profile}"`);
    const sc = scenarioOf(task);
    form = {
      scenario: frame >= FORM.selectAt ? { title: sc.title, task: sc.task } : null,
      hasScenarios: true,
      selectHover: inWindow(frame, FORM.selectHoverFrom, FORM.selectBlurAt),
      selectFocused: inWindow(frame, FORM.selectFocusFrom, FORM.selectBlurAt),
      profile,
      profileHover: inWindow(frame, FORM.profileHoverFrom, FORM.profileHoverTo) ? FORM.profile : undefined,
      holdSeconds: frame >= FORM.holdAt ? FORM.holdSeconds : 0,
      holdHover: inWindow(frame, FORM.holdHoverFrom, FORM.holdBlurAt),
      holdFocused: inWindow(frame, FORM.holdFocusFrom, FORM.holdBlurAt),
      running,
      spin: spinProgress(frame),
      runHover: inWindow(frame, FORM.runHoverFrom, startFrame),
      runPressed: inWindow(frame, FIX_RUN.pressAt, FIX_RUN.pressAt + FIX_RUN.pressFrames),
    };
  } else {
    const start = all.find((e) => e.type === "task.start");
    form = {
      scenario: null,
      hasScenarios: true,
      text: String(start?.payload.task ?? ""),
      profile: profileOf(all),
      holdSeconds: 0,
      running,
      spin: spinProgress(frame),
    };
  }

  return {
    form,
    steps: { events, progress },
    events,
    terminal: {
      lines: term.lines,
      caretLine: term.caretLine,
      caretCol: term.caretCol,
      caretOn: term.caretOn,
      scrollOffset: tailScrollOffset(frame, FPS, term.arrivals),
      tail: true,
      eventCount: events.length,
      ringTurn: frame / (40 * FPS),
    },
    blast: {
      events,
      running,
      report: reportIn ? { verified: s.report.ledger.verified, detail: s.report.ledger.detail, headHash: s.report.ledger.head_hash } : null,
      reveal,
      flash,
      flashAmount,
      pulse: pulsePhase(frame),
      breathe: dialPulsePhase(frame),
      scan: (frame / 90) % 1,
      scrollY: keyframeValue(BLAST_SCROLL, frame),
      progressOf: (id: number) => riseProgress(frame, s.frameOfId.get(id) ?? 0, RISE_FRAMES),
    },
  };
}

// ---------------------------------------------------------------------------------------------- attack lab

type StepKind = "write" | "wipe" | "rewind" | "cat" | "other";

/** What a result step is, from the step itself: a file write, a delete of the workspace, or a read of it. (A rewind has no step of its own in an AttackResult.) */
function stepKind(step: AttackResult["steps"][number]): StepKind {
  if (step.tool === "write_file") return "write";
  if (step.tool === "control") return "rewind";
  if (step.tool === "run_shell" && /\brm\s+-rf?\b|\brm\s+-fr\b/.test(step.text)) return "wipe";
  if (step.tool === "run_shell" && /^\s*cat\b/.test(step.text)) return "cat";
  return "other";
}

interface LabPlan {
  hero: AttackResult;
  heroIndex: number;
  /** The frame each result step appears on. */
  stepStart: number[];
  kinds: StepKind[];
  checks: ReturnType<typeof orderedChecks>;
}

let labPlan: LabPlan | null = null;
function getLabPlan(): LabPlan {
  if (labPlan) return labPlan;
  const catalog = selectAttackCatalog();
  const heroIndex = catalog.findIndex((a) => a.name === LAB.hero);
  if (heroIndex < 0) fail(`evidence.attackCatalog has no "${LAB.hero}" (script LAB.hero)`);
  const hero = selectAttack(LAB.hero);
  const kinds = hero.steps.map(stepKind);
  const stepStart: number[] = [];
  kinds.forEach((k, i) => {
    if (k !== "other") stepStart.push(LAB.stepAt[k]);
    else stepStart.push((i > 0 ? stepStart[i - 1] : LAB.resultAt) + LAB.stepFallbackGap);
  });
  for (let i = 1; i < stepStart.length; i++) {
    if (stepStart[i] < stepStart[i - 1]) fail(`LAB.stepAt: the "${kinds[i]}" step (f${stepStart[i]}) would appear before the step above it (f${stepStart[i - 1]})`);
  }
  // the wipe command is typed into its row and must be complete when its output lands
  hero.steps.forEach((st, i) => {
    if (kinds[i] !== "wipe") return;
    const win = typedWindow(st.text, TYPED.wipeCommand.start, TYPED.wipeCommand.opts);
    if (win.end >= LAB.wipeLandsAt) {
      fail(`TYPED.wipeCommand: the command would be typed by f${win.end}, but its output lands on f${LAB.wipeLandsAt} (LAB.wipeLandsAt). Raise its cps or start it earlier in src/config/script.ts.`);
    }
  });
  labPlan = { hero, heroIndex, stepStart, kinds, checks: orderedChecks(hero.checks) };
  return labPlan;
}

function labAt(frame: number): Omit<AttackLabScreenProps, "style"> {
  const catalog = selectAttackCatalog();
  const plan = getLabPlan();
  const hero = plan.hero;
  const running = inWindow(frame, LAB.runStart, LAB.resultAt);
  const resultIn = frame >= LAB.resultAt;
  const stamped = frame >= LAB.stampAt;

  const heroState: TileState = running ? "running" : stamped ? (hero.verdict as TileState) : "notrun";
  const tiles: AttackTile[] = catalog.map((a) => ({ name: a.name, state: a.name === LAB.hero ? heroState : "notrun" }));

  // the first available attack is selected when the screen opens (like the app); the hero from the click
  const firstAvailable = catalog.find((a) => a.available) ?? catalog[0];
  const selected = frame >= LAB.selectAt ? LAB.hero : firstAvailable.name;

  // hover: a tile, then the hero card's Run button
  let hoverTile: string | undefined;
  LAB.tileHovers.forEach((h, i) => {
    const to = i + 1 < LAB.tileHovers.length ? LAB.tileHovers[i + 1].from : LAB.listScrollFrom;
    if (!inWindow(frame, h.from, to)) return;
    const name = h.tile === "hero" ? LAB.hero : catalog[h.tile]?.name;
    if (name === undefined) fail(`LAB.tileHovers: tile ${String(h.tile)} is not in the attack catalog (${catalog.length} attacks)`);
    hoverTile = name;
  });
  const runHover = inWindow(frame, LAB.runHoverFrom, LAB.runStart);

  // the result as it builds: the wipe command types into its row, and its output lands on wipeLandsAt
  const steps = hero.steps.map((st, i) => {
    if (plan.kinds[i] !== "wipe") return st;
    const w = TYPED.wipeCommand;
    const win = typedWindow(st.text, w.start, w.opts);
    const shown = frame >= win.end ? st.text : typedText(st.text, frame, w.start, w.opts);
    return { ...st, text: shown, result: frame >= LAB.wipeLandsAt ? st.result : null };
  });
  const view: AttackResult = { ...hero, steps };

  const stepsVisible = plan.stepStart.filter((s) => frame >= s).length;
  const checkStarts = plan.checks.map((_, k) => LAB.checksFrom + k * LAB.checkEvery);
  const checksVisible = checkStarts.filter((c) => frame >= c).length;

  return {
    attacks: catalog,
    tiles,
    selected,
    runningName: running ? LAB.hero : null,
    results: { [LAB.hero]: resultIn ? view : undefined },
    stepsVisible,
    stepProgress: plan.stepStart.map((s) => riseProgress(frame, s)),
    checksVisible,
    checkProgress: checkStarts.map((c) => riseProgress(frame, c, 14)),
    verdictStamp: riseProgress(frame, LAB.stampAt, LAB.stampFrames),
    press: inWindow(frame, LAB.pressAt, LAB.pressAt + LAB.pressFrames) ? "run" : undefined,
    hover: { tile: hoverTile, run: runHover ? LAB.hero : undefined },
    spin: spinProgress(frame),
    pulse: pulsePhase(frame, 60),
    donutFill: stamped ? riseProgress(frame, LAB.stampAt, LAB.donutFrames) : 1,
    listScrollY: labListScrollAt(frame),
    detailScrollY: labDetailScrollOf(frame),
  };
}

/** Scroll (px) of the Attack Lab card list: it scrolls the hero's card to LAB.listMargin px under the top of the list. */
export function labListScrollAt(frame: number): number {
  return labListScrollOf(frame, getLabPlan().heroIndex);
}

// ---------------------------------------------------------------------------------------------- report and infra

function reportSession(): Session {
  return REPORT.source === "fix" ? getFixSession() : getHostileSession();
}

/** Scroll (px) of the Report page. */
export function reportScrollAt(frame: number): number {
  return reportScrollOf(frame);
}

function reportAt(frame: number): Omit<ReportScreenProps, "style"> {
  const s = reportSession();
  const dimKeys = Object.keys(s.report.dimensions);
  const runFrom = REPORT.pressAt + REPORT.pressFrames;
  const state = frame < runFrom ? "idle" : frame < REPORT.doneAt ? "running" : "done";
  return {
    report: s.report,
    reveal: dimKeys.map((_, i) => riseProgress(frame, REPORT.cardsFrom + i * REPORT.cardEvery, REPORT.cardFrames)),
    headReveal: riseProgress(frame, REPORT.headAt, REPORT.headFrames),
    verify: {
      state,
      progress: state === "running" ? (frame - runFrom) / (REPORT.doneAt - runFrom) : riseProgress(frame, REPORT.doneAt, REPORT.doneFrames),
      result: s.verify,
    },
    pressVerify: inWindow(frame, REPORT.pressAt, runFrom),
    hoverVerify: inWindow(frame, REPORT.verifyHoverFrom, runFrom),
    scrollY: reportScrollAt(frame),
  };
}

function infraAt(frame: number): Omit<InfraScreenProps, "style"> {
  const landAt = (i: number): number => (i === 0 ? INFRA.diagramAt : INFRA.panelsFrom + (i - 1) * INFRA.panelEvery);
  const idx = [0, 1, 2, 3, 4, 5, 6];
  return {
    infra: selectInfra(),
    reveal: idx.map((i) => riseProgress(frame, landAt(i), INFRA.riseFrames)),
    flash: idx.map((i) => stepPulse(frame, landAt(i) + INFRA.flashDelay, INFRA.flashFrames)),
    pulse: pulsePhase(frame),
    scrollY: 0,
  };
}

// ---------------------------------------------------------------------------------------------- screens, nav, header

function checkScreens(): void {
  for (const c of SCREEN_CHANGES) {
    if (c.to === "timeline" || c.to === "sessions") fail(`SCREEN_CHANGES goes to "${c.to}", which FilmApp does not draw (the film uses workspace, attackLab, report and infra)`);
  }
}

/** The nav underline position at a frame, as a fractional screen index. */
export function activeScreenAt(frame: number): number {
  let pos = SCREEN_INDEX[SCREEN_CHANGES[0].to];
  for (let i = 1; i < SCREEN_CHANGES.length; i++) {
    const c = SCREEN_CHANGES[i];
    if (frame < c.frame) break;
    const target = SCREEN_INDEX[c.to];
    const t = c.slide <= 0 ? 1 : clamp01((frame - c.frame) / c.slide);
    pos = pos + (target - pos) * signature(t);
    if (t < 1) break;
    pos = target;
  }
  return pos;
}

/** The screens that are mounted at a frame, bottom to top. Two while a swap cross-fades (centred on the change's swapAt). */
export function layersAt(frame: number): FilmLayer[] {
  const half = SWAP_FADE_FRAMES / 2;
  let cur = 0;
  for (let i = 1; i < SCREEN_CHANGES.length; i++) if (frame > SCREEN_CHANGES[i].swapAt - half) cur = i;
  const screen = SCREEN_CHANGES[cur].to;
  if (cur === 0) return [{ screen, opacity: 1 }];
  const t = clamp01((frame - (SCREEN_CHANGES[cur].swapAt - half)) / SWAP_FADE_FRAMES);
  const prev = SCREEN_CHANGES[cur - 1].to;
  if (t >= 1 || prev === screen) return [{ screen, opacity: 1 }];
  return [
    { screen: prev, opacity: 1 - t },
    { screen, opacity: t },
  ];
}

function paneTabAt(frame: number): PaneTab {
  let tab: PaneTab = "terminal";
  for (const c of SCREEN_CHANGES) if (c.to === "workspace" && frame >= c.frame) tab = c.paneTab ?? "terminal";
  return tab;
}

function tabHighlightAt(frame: number): number | undefined {
  for (let i = 1; i < SCREEN_CHANGES.length; i++) {
    const c = SCREEN_CHANGES[i];
    const lead = c.hoverLead ?? 0;
    if (lead > 0 && frame >= c.frame - lead && frame < c.frame + c.slide) return SCREEN_INDEX[c.to];
  }
  return undefined;
}

/**
 * The header chip. The real app ties it to the task the Workspace holds: idle before one exists, "running" with its id while it runs,
 * then the task's own end status. The Workspace holds the fix task until the hostile page run takes over (HOSTILE_RUN.startFrame).
 * On the Report and Infra screens it shows the run the Report is about (REPORT.source), so every id on screen belongs to one task.
 */
function headerAt(frame: number, content: ScreenName): HeaderState {
  const fix = getFixSession();
  const hostile = getHostileSession();
  const pulse = pulsePhase(frame);
  const chipOf = (s: Session, startFrame: number): HeaderState => {
    if (frame < startFrame) return { taskId: null, status: "idle", pulse };
    if (frame < s.endEventFrame) return { taskId: s.taskId, status: "running", pulse };
    const end = s.events.find((e) => e.type === "task.end");
    return { taskId: s.taskId, status: String(end?.payload.status ?? "done"), pulse };
  };
  if (content === "report" || content === "infra") {
    return REPORT.source === "fix" ? chipOf(fix, FIX_RUN.pressAt + FIX_RUN.pressFrames) : chipOf(hostile, HOSTILE_RUN.startFrame);
  }
  if (frame >= HOSTILE_RUN.startFrame) return chipOf(hostile, HOSTILE_RUN.startFrame);
  return chipOf(fix, FIX_RUN.pressAt + FIX_RUN.pressFrames);
}

// ---------------------------------------------------------------------------------------------- vultr beats

/**
 * The frame each assistant step (an `llm.response` of the fix run) lands on, in order. The chip of S2b pulses on these, and so does
 * `vultr.inferencePulse`: one derivation, from the clock (the pins in script.ts and the evidence), never typed by hand.
 */
export function assistantStepFrames(): number[] {
  const fix = getFixSession();
  const out: number[] = [];
  fix.events.forEach((e, i) => {
    if (e.type === "llm.response") out.push(fix.frames[i]);
  });
  return out;
}

/** 0..1: 1 on the frame an assistant step lands, easing to 0 over VULTR.inferencePulseFrames (the overlap of two steps keeps the larger). */
export function inferencePulseAt(frame: number): number {
  let pulse = 0;
  for (const f of assistantStepFrames()) pulse = Math.max(pulse, stepPulse(frame, f, VULTR.inferencePulseFrames));
  return pulse;
}

function vultrAt(frame: number): FilmState["vultr"] {
  // an assistant step of the real task (the fix run is model-driven; the hostile run is a scripted attacker and calls no model)
  const pulse = inferencePulseAt(frame);
  return {
    inferencePulse: pulse,
    chips: VULTR.chipFrames.map((f) => riseProgress(frame, f, VULTR.chipLightFrames)),
  };
}

// ---------------------------------------------------------------------------------------------- the one function

/** The complete state of the recreated app on a global film frame. Pure. */
export function useFilmState(rawFrame: number): FilmState {
  checkScreens();
  const frame = Math.min(APP_LAST_FRAME, Math.max(APP_FIRST_FRAME, Math.round(rawFrame)));
  const layers = layersAt(frame);
  const dominant = layers.reduce((a, b) => (b.opacity > a.opacity ? b : a)).screen;
  const hostileNow = frame >= HOSTILE_RUN.startFrame;
  const workspace = workspaceAt(frame, hostileNow ? getHostileSession() : getFixSession(), !hostileNow);
  return {
    frame,
    activeScreen: activeScreenAt(frame),
    tabHighlight: tabHighlightAt(frame),
    layers,
    paneTab: paneTabAt(frame),
    header: headerAt(frame, dominant),
    workspace,
    attackLab: labAt(frame),
    report: reportAt(frame),
    infra: infraAt(frame),
    vultr: vultrAt(frame),
    scroll: {
      blast: keyframeValue(BLAST_SCROLL, frame),
      labList: labListScrollAt(frame),
      labDetail: labDetailScrollOf(frame),
      report: reportScrollAt(frame),
      infra: 0,
    },
  };
}

export { useFilmState as filmStateAt };
