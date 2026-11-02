// DEV ONLY (patch 06). Plays the evidence task through the Workspace screen over DEV_WORKSPACE_FRAMES frames, to prove that
// the gauges, the dial, the hash chain, the terminal and the transcript are all computed from real ledger events (gaugesOf,
// blast, measure, groupLines, terminalRows, describe) and that their wording matches the app.
//   frame 0..15    no task: the idle form, "no task yet" on every gauge, the empty terminal
//   frame 16..27   cursor over "Run in sandbox", then the press
//   frame 28       running (spinner); the first event lands at frame 40
//   frame 40..546  the task: events appear on a LedgerClock (real time 40..520, events at least 6 frames apart)
//   frame 534      the sandbox is audited as it is destroyed: Filesystem, Secrets and Compute stop saying "measured when the sandbox is destroyed"
//   frame 554..    the report is in: the seal says the chain is verified, the status chip says done
//   frame 566..598 the Blast panel scrolls down to its seal, hash chain and event log
// Stills worth taking:  npx remotion still src/index.ts DevWorkspace out/qa/ws-0.png --frame=0   (no task)
//                       ... --frame=300   (mid-run)      ... --frame=590   (after destroy)
// Everything drawn comes from evidence.json through src/data/select.ts. The only literals here are frame numbers and developer notes.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { fonts, theme } from "../config/theme";
import { FPS, LOGICAL, STAGE } from "../config/timeline";
import { selectScenarios, selectTask } from "../data/select";
import type { LedgerEvent } from "../data/types";
import { clamp01, mapRange, signature } from "../lib/ease";
import { FontsReady } from "../lib/fonts";
import { makeClock } from "../lib/clock";
import { GAUGE_KEYS, type GaugeKey } from "../lib/gauges";
import { RISE_FRAMES, riseProgress } from "../lib/rise";
import { tailScrollOffset } from "../lib/stream";
import { terminalRows } from "../lib/terminal-lines";
import { AppWindow } from "../ui/AppWindow";
import { dialPulsePhase } from "../ui/RadiusDial";
import { Header } from "../ui/Header";
import { stepEvents } from "../ui/StepStream";
import { Workspace } from "../ui/Workspace";
import { pulsePhase, spinProgress } from "../ui/primitives";

export const DEV_WORKSPACE_FRAMES = 600;

const RUN_PRESS = 24; // button pressed from here
const RUN_START = 28; // task submitted: the button shows the spinner
const SEG_FROM = 40; // first event
const SEG_TO = 520; // real time of the last event is played by here (dense bursts are pushed apart, to frame 546)
const REPORT_LAG = 8; // frames after task.end until the report (seal) arrives

/** Which gauge lights up when this event lands. */
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
      return "sec";
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

const note = (px: number, color: string): React.CSSProperties => ({ fontFamily: fonts.mono, fontSize: px, color, lineHeight: 1.3 });

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const task = selectTask();
  const scenario = selectScenarios()[0];
  const all = task.events;

  const clock = React.useMemo(
    () => makeClock(all, [{ fromTs: all[0].ts, toTs: all[all.length - 1].ts, startFrame: SEG_FROM, endFrame: SEG_TO }]),
    [all],
  );
  const efs = React.useMemo(() => clock.eventFrames(), [clock]);
  const frameOfId = React.useMemo(() => new Map(all.map((e, i) => [e.id, efs[i]] as const)), [all, efs]);

  // what the ledger has by this frame
  const visibleIdx: number[] = [];
  efs.forEach((f, i) => {
    if (f <= frame) visibleIdx.push(i);
  });
  const events = visibleIdx.map((i) => all[i]);

  const endIdx = all.findIndex((e) => e.type === "task.end");
  const endFrame = efs[endIdx];
  const ended = frame >= endFrame;
  const submitted = frame >= RUN_START;
  const running = submitted && !ended;
  const reportIn = frame >= endFrame + REPORT_LAG;

  // when each gauge first has something real to show
  const first = events.length ? efs[0] : Infinity;
  const auditIdx = all.findIndex((e) => e.type === "sandbox.audit");
  const audited = auditIdx >= 0 && efs[auditIdx] <= frame;
  const measuredAt: Record<GaugeKey, number> = {
    net: first, pol: first, time: first, sbx: first,
    fs: audited ? efs[auditIdx] : Infinity, sec: audited ? efs[auditIdx] : Infinity, cpu: audited ? efs[auditIdx] : Infinity,
  };
  const reveal = GAUGE_KEYS.map((k) => (frame < measuredAt[k] ? 1 : riseProgress(frame, measuredAt[k], 10)));

  // the gauge that changed most recently
  let flash: GaugeKey | undefined;
  let flashFrame = -Infinity;
  for (const i of visibleIdx) {
    const k = flashKeyOf(all[i]);
    if (k && efs[i] >= flashFrame) {
      flash = k;
      flashFrame = efs[i];
    }
  }
  const flashAmount = flash ? 1 - clamp01((frame - flashFrame) / 18) : 0;

  // terminal rows and the frame each one arrived on
  const rows = terminalRows(events);
  const arrivals = rows.map((r) => efs[visibleIdx[r.src]]);

  // transcript rows
  const steps = stepEvents(events);
  const progress = steps.map((e) => riseProgress(frame, frameOfId.get(e.id) ?? 0));


  return (
    <AbsoluteFill style={{ background: theme.stageGradient }}>
      <div style={{ position: "absolute", left: 40, top: 30, ...note(20, theme.ink2) }}>
        DevWorkspace · patch 06 · dev only · frame {frame} · {events.length} of {all.length} events
      </div>
      <div style={{ position: "absolute", left: (STAGE.w - LOGICAL.w) / 2, top: (STAGE.h - LOGICAL.h) / 2 }}>
        <AppWindow
          header={
            <Header
              activeScreen={0}
              taskId={submitted ? task.id : null}
              status={ended ? "done" : submitted ? "running" : "idle"}
              tokenApplied
              pulse={pulsePhase(frame)}
            />
          }
        >
          <Workspace
            form={{
              scenario: { title: scenario.title, task: scenario.task },
              running,
              spin: spinProgress(frame),
              runHover: frame >= 16 && !submitted,
              runPressed: frame >= RUN_PRESS && frame < RUN_START,
            }}
            steps={{ events, progress }}
            terminal={{
              lines: rows,
              scrollOffset: tailScrollOffset(frame, FPS, arrivals),
              tail: true,
              eventCount: events.length,
              ringTurn: frame / (40 * FPS),
            }}
            blast={{
              events,
              running,
              report: reportIn ? { verified: task.report.ledger.verified, detail: task.report.ledger.detail, headHash: task.report.ledger.head_hash } : null,
              reveal,
              flash,
              flashAmount,
              pulse: pulsePhase(frame),
              breathe: dialPulsePhase(frame),
              scan: (frame / 90) % 1,
              // after the report arrives, the panel scrolls down so the seal, the chain and the event log can be checked in a still
              scrollY: mapRange(frame, 566, 598, 0, 700, signature),
              progressOf: (id) => riseProgress(frame, frameOfId.get(id) ?? 0, RISE_FRAMES),
            }}
          />
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};

export const DevWorkspace: React.FC = () => (
  <FontsReady>
    <Scene />
  </FontsReady>
);
