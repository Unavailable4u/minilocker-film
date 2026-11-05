// S8 On Vultr (patch 20, f4560-4979) "Where it runs" (BIBLE 6, S8). Replaces the 12a stub completely.
//
//   f4560-4619  the real Infra screen. The app already switches to it (script.ts SCREEN_CHANGES f4560, INFRA panels land and flash by themselves),
//               so this overlay draws nothing yet. Camera: a 30 f move onto the window, tight enough to read the panels.
//   f4620-4649  the app steps back (stageState.APP_RECEDE: dim + blur on the app layer, read by appReveal / appLook) and the camera pulls back with it.
//   f4620-4664  ArchitectureDiagram builds inside the Vultr VM frame: frame, then the 12 nodes and 12 edges in flow order.
//   f4650 / f4710 / f4770  the three Vultr chips light (VULTR.chipFrames in script.ts, the same beats the Infra screen uses).
//   f4665 / f4710 / f4755  highlight path: task (UI -> control plane -> Docker -> sandbox -> egress), then model, then storage.
//   f4785-4799  the diagram leaves (a plain opacity fade, never a backdrop-filter).
//   f4800-4979  LimitsCard "Said plainly": heading + limit 1 on f4800, limit 2 on f4845, limit 3 on f4890, footnote on f4920.
//   f4900       caption (copy.s8.caption), it leaves at the cut (S9 starts f4980).
//   f4560       the stale cursor (S6's last waypoint never hides) fades out in place; S8_CURSOR has that one waypoint.
//
// Every word is copy.ts. What is measured (region, plan, inference host, model) comes from the evidence through selectInfra(), and the Vultr
// claims are only made if the evidence supports them: otherwise the S8 frames throw (the film must be captured on the real VM).
// The sample evidence is NOT refused here (the rest of the film accepts it; scripts/capture-evidence.mjs and the render script refuse it).
import React from "react";
import { holdShot, kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { VULTR } from "../config/script";
import { BEAT, SCENES } from "../config/timeline";
import { selectInfra } from "../data/select";
import { Caption } from "../fx/Caption";
import { ARCH_EDGE_IDS, ARCH_NODE_IDS, ArchitectureDiagram, type ArchChip, type ArchHighlight } from "../gfx/ArchitectureDiagram";
import { LimitsCard } from "../gfx/LimitsCard";
import { clamp01, signature } from "../lib/ease";
import { S6_CURSOR } from "./S6Evidence";
import { APP_RECEDE } from "./stageState";
import type { SceneOverlayProps } from "./types";

export const S8_TIMING = {
  /** The diagram starts to build when the app starts to step back. */
  build: { start: APP_RECEDE.start, end: 4665 },
  /** Highlight paths, in order. Each chip lands inside its own path's window: VM f4650 (just before task), inference f4710 (model), storage f4770 (storage). */
  paths: { task: 4665, model: 4710, storage: 4755 },
  /** The diagram fades out over these frames; the card takes the stage on f4800. */
  diagramOut: { start: 4785, end: 4800 },
  /** Heading + limit 1, limit 2, limit 3. */
  limits: [4800, 4845, 4890] as readonly number[],
  /** Intentionally off the beat grid: the storyboard cue (BIBLE 8). */
  caption: 4900,
  footnote: 4920,
} as const;

const T = S8_TIMING;

// diagram build: nodes then edges, staggered in flow order
const NODE_STEP = 2;
const NODE_DUR = 8;
const EDGE_START = T.build.start + 10;
const EDGE_STEP = 2;
const EDGE_DUR = 8;
const FRAME_DUR = 24;
const HIGHLIGHT_RAMP = 6;
// limits card reveals (the card applies its own signature ease on top of these linear 0..1 values)
const LINE_DUR = 30;
const TITLE_DUR = 20;
const FOOTNOTE_DUR = 20;

/** Stable global-frame anchors for the cue patches (22 and later). */
export const S8_CUE_ANCHORS = {
  build: T.build.start,
  nodesDone: T.build.start + (ARCH_NODE_IDS.length - 1) * NODE_STEP + NODE_DUR,
  chips: VULTR.chipFrames,
  paths: T.paths,
  limits: T.limits,
  caption: T.caption,
  footnote: T.footnote,
} as const;

// Import-time checks (they run while the film loads, so `npm run motion` reports them).
{
  const beats: ReadonlyArray<readonly [string, number]> = [
    ["build.start", T.build.start],
    ["build.end", T.build.end],
    ["paths.task", T.paths.task],
    ["paths.model", T.paths.model],
    ["paths.storage", T.paths.storage],
    ["diagramOut.start", T.diagramOut.start],
    ["diagramOut.end", T.diagramOut.end],
    ["limits.0", T.limits[0]],
    ["limits.1", T.limits[1]],
    ["limits.2", T.limits[2]],
    ["footnote", T.footnote],
  ];
  for (const [label, frame] of beats) {
    if (frame % BEAT !== 0) throw new Error(`S8: ${label} f${frame} is not on a beat (BEAT = ${BEAT})`);
  }
  if (VULTR.chipFrames.length !== 3) throw new Error("S8: VULTR.chipFrames needs 3 frames (VM, Serverless Inference, Object Storage)");
  const lastEdgeDone = EDGE_START + (ARCH_EDGE_IDS.length - 1) * EDGE_STEP + EDGE_DUR;
  const lastNodeDone = S8_CUE_ANCHORS.nodesDone;
  if (lastNodeDone > T.build.end || lastEdgeDone > T.build.end) {
    throw new Error(`S8: the diagram build (nodes done f${lastNodeDone}, edges done f${lastEdgeDone}) overruns f${T.build.end}`);
  }
  if (!(T.build.end <= T.paths.task && T.paths.task < T.paths.model && T.paths.model < T.paths.storage && T.paths.storage < T.diagramOut.start)) {
    throw new Error("S8: build, the three paths and the diagram exit are out of order");
  }
  if (!(T.diagramOut.end === T.limits[0] && T.limits[0] < T.limits[1] && T.limits[1] < T.limits[2] && T.limits[2] < T.caption && T.caption < T.footnote)) {
    throw new Error("S8: the exit, the limits, the caption and the footnote are out of order");
  }
  if (T.footnote + FOOTNOTE_DUR > SCENES.S8.end) throw new Error("S8: the footnote does not finish inside the scene");
  if (copy.s8.lowerThirds.length !== 3) throw new Error("S8: copy.s8.lowerThirds needs exactly 3 product names");
}

// ---------------------------------------------------------------------------------------------- camera

/**
 * Motion rules (patch 25): one 30 f move onto the window (the Infra screen's own slide is the whip; the pose is the S7 hand-over, no jump), the step-back
 * with the app (30 f, f4620-4649), then one slow linear push to the last frame, so neither explainer sits on a still camera.
 */
export const S8_CAMERA: readonly CameraKeyframe[] = [
  kf(SCENES.S8.start, "fullWindow", { padding: 48, scaleBias: 1.06, rotateX: 2, rotateY: -3, ease: "signature", frames: 30 }),
  ...holdShot(APP_RECEDE.start, SCENES.S8.end, "fullWindow", {
    padding: 96,
    arrive: APP_RECEDE.end - APP_RECEDE.start,
    push: 0.05,
    rotateX: 2,
    rotateY: -2,
  }),
];

/**
 * S6's last waypoint has no `hide`, so its arrow would stay on screen through S7 and S8 (over the diagram and the limits card). S8 fades it out on the cut,
 * in place (same x, y: it does not travel), and it stays hidden to the end of the film.
 */
const LAST_S6_WAYPOINT = S6_CURSOR[S6_CURSOR.length - 1];
export const S8_CURSOR: readonly CursorWaypoint[] = [{ frame: SCENES.S8.start, x: LAST_S6_WAYPOINT.x, y: LAST_S6_WAYPOINT.y, hide: true }];

// ---------------------------------------------------------------------------------------------- data

let chipCache: readonly ArchChip[] | null = null;

/** The three chips. Names are copy; the facts are measured. Throws (S8 frames only) if the evidence does not show Vultr. */
function chips(): readonly ArchChip[] {
  if (chipCache) return chipCache;
  const { vultr, inference, storage } = selectInfra();
  const text = (path: string, v: string | null | undefined): string => {
    if (typeof v !== "string" || v.trim() === "") throw new Error(`S8: ${path} is missing: capture the real Vultr VM (npm run evidence)`);
    return v;
  };
  if (!vultr.available) throw new Error(`S8: evidence.infra.vultr.available is false (${vultr.reason ?? "no reason"}): the film must be captured on the real VM`);
  if (!inference.vultr) throw new Error("S8: evidence.infra.inference.vultr is false: the inference service must be Vultr");
  if (!storage.attached || !storage.vultr) throw new Error("S8: evidence.infra.storage is not an attached Vultr bucket");
  const [vm, inf, obj] = copy.s8.lowerThirds;
  chipCache = [
    { name: vm, facts: `${text("infra.vultr.region", vultr.region)} - ${text("infra.vultr.plan", vultr.plan)}` },
    { name: inf, facts: `${text("infra.inference.host", inference.host)}/v1 - ${text("infra.inference.model", inference.model)}` },
    { name: obj, facts: copy.gfxC.storageFacts },
  ];
  return chipCache;
}

// ---------------------------------------------------------------------------------------------- progress

const ramp = (frame: number, start: number, duration: number): number => signature(clamp01((frame - start) / duration));
const linear = (frame: number, start: number, duration: number): number => clamp01((frame - start) / duration);

function highlightAt(frame: number): { highlight: ArchHighlight; amount: number } {
  const { task, model, storage } = T.paths;
  if (frame < task) return { highlight: "none", amount: 0 };
  // ramp in, hold, ramp out to 0 just before the next path starts (the path is switched while it is at 0)
  const seg = (highlight: ArchHighlight, start: number, next: number) => ({
    highlight,
    amount: Math.min(ramp(frame, start, HIGHLIGHT_RAMP), 1 - ramp(frame, next - HIGHLIGHT_RAMP, HIGHLIGHT_RAMP)),
  });
  if (frame < model) return seg("task", task, model);
  if (frame < storage) return seg("model", model, storage);
  return { highlight: "storage", amount: ramp(frame, storage, HIGHLIGHT_RAMP) };
}

// ---------------------------------------------------------------------------------------------- overlay

export const S8Vultr: React.FC<SceneOverlayProps> = ({ frame }) => {
  const showDiagram = frame >= T.build.start && frame < T.limits[0];
  const showCard = frame >= T.limits[0];
  const { highlight, amount } = highlightAt(frame);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {showDiagram ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(frame, T.diagramOut.start, T.diagramOut.end - T.diagramOut.start) }}>
          <ArchitectureDiagram
            nodeProgress={ARCH_NODE_IDS.map((_, i) => ramp(frame, T.build.start + i * NODE_STEP, NODE_DUR))}
            edgeProgress={ARCH_EDGE_IDS.map((_, i) => ramp(frame, EDGE_START + i * EDGE_STEP, EDGE_DUR))}
            frameProgress={ramp(frame, T.build.start, FRAME_DUR)}
            highlight={highlight}
            highlightAmount={amount}
            vultrChip={VULTR.chipFrames.map((f) => ramp(frame, f, VULTR.chipLightFrames))}
            chips={chips()}
            nodes={copy.gfxC.nodes}
            edgeLabels={copy.gfxC.edges}
            clock={frame}
          />
        </div>
      ) : null}
      {showCard ? (
        <LimitsCard
          title={copy.gfxC.limitsTitle}
          lines={copy.s8.limits}
          footnote={copy.gfxC.limitsFootnote}
          titleProgress={linear(frame, T.limits[0], TITLE_DUR)}
          lineProgress={T.limits.map((start) => linear(frame, start, LINE_DUR))}
          footnoteProgress={linear(frame, T.footnote, FOOTNOTE_DUR)}
        />
      ) : null}
      <Caption text={copy.s8.caption} highlight="does not" startFrame={T.caption} endFrame={SCENES.S8.end + 1} />
    </div>
  );
};

export default S8Vultr;
