// S1 Title (f300-599) "Measured blast radius" (BIBLE 6). Patch 12c.
//
// STAGE-space overlay on the film's own stage (no opaque layer: S0's last frame and S1's first share the same gradient and glow).
// One storyline, all pure functions of the GLOBAL frame:
//   f300  the hook dot pulses (sub-impact), a shockwave leaves it and the Mark BUILDS around it: ring r6 f300-330, ring r10.4
//         f315-345, dotted ring f332-350 (Mark.tsx timings, started 10 f early so the rings land on the spec'd frames)
//   f345  the Mark MORPHS into the 5-arc dial: arcs sweep in 6 f apart (network, policy, filesystem, secrets, compute), the
//         centre disc grows out of the core dot, labels fade in. All arcs are drawn clean: the dial here is a PROMISE, not data,
//         so the verdict word is "measuring" and no value is shown.
//   f420  impact: the dial steps up, eyebrow chip, then "MiniLocker" (f435, masked rise) and the two-line tagline (f480-543)
//   f540  the MATCH CUT: the lockup leaves, the camera pushes in (S1_CAMERA), the app window rises from below the frame (appReveal in
//         stageState.ts) and the dial flies to the panel's dial socket. The dial follows the panel's REAL dial (measured anchor
//         `workspaceAnchors.dial()`, the camera at that frame and the window's rise offset), arrives at f590 when the window docks and
//         rides it exactly while the camera settles to f599. On the
//         way its arcs drain into the dotted "not measured" look the app shows before a task, so the last frame is the panel's own dial.
//   f592-599 the overlay dial fades out over the identical dial of the app (it hides the double blend of two semi-transparent dials).
//
// The camera is NOT used to move this scene's pixels (the app is not mounted before f540): the overlay takes only the camera's impact
// shake. S1_CAMERA matters from f540, when it flies the app window into its S2 pose.
import React from "react";
import { Badge, badgePulse, badgeReveal } from "../fx/Badge";
import { getCameraState, worldToStage } from "../fx/Camera";
import { KineticText } from "../fx/KineticText";
import { Mark, markProgress } from "../ui/Mark";
import { RadiusDial, type DialDim, type DialTone } from "../ui/RadiusDial";
import { dialDims } from "../ui/BlastPanel";
import { workspaceAnchors } from "../config/anchors";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { rectCenter } from "../config/focus";
import { alpha, fonts, theme } from "../config/theme";
import { FPS, STAGE } from "../config/timeline";
import { gaugesOf } from "../lib/gauges";
import { clamp01, signature } from "../lib/ease";
import { spr } from "../lib/spring";
import { appReveal } from "./stageState";
import { HOOK_DOT, S0_CAMERA } from "./S0Hook";
import type { SceneOverlayProps } from "./types";

const s1 = copy.s1;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

export const S1_TIMING = {
  /** the hook dot pulses; the Mark starts to build; the grid paper fades in */
  impact: 300,
  /** Mark build: progress 0 is this frame, so ring r6 draws f300-330 and ring r10.4 f315-345 (Mark.tsx: ring 1 starts at 10/60) */
  markBuildFrom: 290,
  /** the Mark's rings leave while the arcs come in */
  markOut: { start: 348, end: 380 },
  /** arc i starts at start + i * every and sweeps in over `sweep` frames */
  arcs: { start: 345, every: 6, sweep: 30 },
  /** the dial's labels fade in one after another */
  labels: { start: 372, end: 412 },
  /** the core dot shrinks away while the dial's centre disc grows in */
  coreOut: { start: 382, end: 404 },
  centreIn: { start: 388, end: 414 },
  /** impact: the dial steps up, the eyebrow chip draws on */
  lockup: 420,
  title: 435,
  tagline: 480,
  /** the lockup leaves */
  exit: { start: 540, end: 566 },
  /** the match cut: the dial flies to the panel (arrives when the window docks, f590); the camera pushes until f599, the dial rides it exactly */
  flight: { start: 540, end: 590 },
  /** arcs drain into the dotted "not measured" look: arc i drains at start + 2 i (8 f), then dots in (6 f); done at f594 */
  drain: { start: 572, every: 2, out: 8, dots: 6 },
  /** the verdict word changes from "measuring" to "no data" (what the panel says before a task) */
  verdictSwitch: 588,
  /** the overlay dial fades out over the app's identical dial */
  handoff: { start: 592, end: 599 },
} as const;

/** The dial is exactly on the panel's dial from this frame (the window is docked) and stays on it while the camera settles. */
export const S1_LANDING_FRAME = 590;

// ---------------------------------------------------------------------------------------------- camera / cursor

/**
 * f300: a wide, slightly tilted pose (nothing but the stage is on screen yet). f420: the same pose, only the impact shake.
 * f540: the push into the S2 pose. The move is a fixed 59-frame signature ramp, so its progress is exactly 1 on f599 (a spring would
 * not be settled yet) and the dial can land on the panel with the tilt at exactly 0. The final pose is the whole window with 60 px of
 * margin (zoom 1.067): the dial's anchor sits at the right of the frame, clear of the lockup that has just left.
 * The S2 patch must start its first keyframe at f600 or later.
 */
export const S1_CAMERA: readonly CameraKeyframe[] = [
  kf(300, "fullWindow", { padding: 96, rotateX: 7, rotateY: -5, shake: 6 }),
  kf(420, "fullWindow", { padding: 96, rotateX: 7, rotateY: -5, shake: 8 }),
  kf(540, "fullWindow", { padding: 60, ease: "signature", frames: 59 }),
];
export const S1_CURSOR: readonly CursorWaypoint[] = [];

/** S0 + S1 keyframes: the camera of every frame up to 599 (later scenes' keyframes start at f600 or later and cannot change it). */
const CAMERA_UP_TO_S2: readonly CameraKeyframe[] = [...S0_CAMERA, ...S1_CAMERA];

// ---------------------------------------------------------------------------------------------- layout (stage px)

const CX = STAGE.w / 2;
/** the dial's size and centre height in the title lockup; the Mark starts at HOOK_DOT (stage centre) */
const DIAL_SIZE = 420;
const DIAL_Y = 350;
/** logo size of the Mark build (the core dot is HOOK_DOT.r at this size) */
const MARK_SIZE = 360;
/** top edges of the lockup's three rows */
const CHIP_TOP = 590;
const TITLE_TOP = 658;
const TAGLINE_TOP = 846;

const decay = (frame: number, start: number, tau: number): number => (frame < start ? 0 : Math.exp(-(frame - start) / tau));
const ramp = (frame: number, a: number, b: number): number => signature(clamp01((frame - a) / (b - a)));

// ---------------------------------------------------------------------------------------------- the dial: pose and arcs

/** Where the panel's dial is on the stage on this frame (centre and size): the anchor, the window's rise and the camera. */
function panelDialOnStage(frame: number): { x: number; y: number; size: number } {
  const cam = getCameraState(frame, CAMERA_UP_TO_S2, FPS);
  const rect = workspaceAnchors.dial();
  const c = rectCenter(rect);
  const p = worldToStage(cam, { x: c.x, y: c.y + appReveal(frame).dy });
  return { x: p.x, y: p.y, size: rect.w * cam.scale };
}

interface DialPose {
  x: number;
  y: number;
  size: number;
  opacity: number;
  /** extra scale of the impact punch (1 = none) */
  punch: number;
}

function dialPose(frame: number): DialPose {
  const T = S1_TIMING;
  // f345-419 the dial is on the Mark's centre; f420 it steps up into the lockup with the panel spring (critically damped: no overshoot)
  const step = spr(frame, FPS, T.lockup, "panel");
  const title = { x: CX, y: HOOK_DOT.y + (DIAL_Y - HOOK_DOT.y) * step, size: DIAL_SIZE };
  const punch = 1 + 0.05 * decay(frame, T.lockup, 6);

  let x = title.x;
  let y = title.y;
  let size = title.size;
  if (frame >= T.flight.start) {
    // the flight: from the lockup to the panel's dial, which is itself still rising until f590 (the target is read every frame)
    const e = signature(clamp01((frame - T.flight.start) / (T.flight.end - T.flight.start)));
    const target = panelDialOnStage(frame);
    x = title.x + (target.x - title.x) * e;
    y = title.y + (target.y - title.y) * e;
    size = title.size + (target.size - title.size) * e;
  }
  const arrive = ramp(frame, T.arcs.start, T.arcs.start + 14);
  const handoff = 1 - ramp(frame, T.handoff.start, T.handoff.end);
  return { x, y, size, opacity: arrive * handoff, punch: frame >= T.flight.start ? 1 : punch };
}

// the arc labels and keys come from the product's own gauges (no typed strings): all five are "not measured" before a task
const BASE_DIMS: readonly DialDim[] = dialDims(gaugesOf([], false));

function dimsAt(frame: number): DialDim[] {
  const T = S1_TIMING;
  return BASE_DIMS.map((d, i) => {
    const sweepStart = T.arcs.start + i * T.arcs.every;
    const sweep = ramp(frame, sweepStart, sweepStart + T.arcs.sweep);
    const drainStart = T.drain.start + i * T.drain.every;
    const out = ramp(frame, drainStart, drainStart + T.drain.out);
    if (out <= 0) return { ...d, state: "clean", draw: sweep, value: undefined };
    if (out < 1) return { ...d, state: "clean", draw: 1 - out, value: undefined };
    const dots = ramp(frame, drainStart + T.drain.out, drainStart + T.drain.out + T.drain.dots);
    return { ...d, state: "unmeasured", draw: dots, value: undefined };
  });
}

const DialLayer: React.FC<{ frame: number }> = ({ frame }) => {
  const T = S1_TIMING;
  if (frame < T.arcs.start) return null;
  const pose = dialPose(frame);
  if (pose.opacity <= 0) return null;
  const nodata = frame >= T.verdictSwitch;
  const word = nodata ? "no data" : "measuring";
  const tone: DialTone = nodata ? "mute" : "info";
  // the scan wedge turns slowly while the title holds (a held shot never freezes) and is gone before the arcs drain
  const scanOpacity = ramp(frame, T.arcs.start + 15, T.arcs.start + 35) * (1 - ramp(frame, T.drain.start - 16, T.drain.start));
  const scan = scanOpacity > 0 ? (frame - T.arcs.start) / 180 : undefined;
  return (
    <div
      style={{
        position: "absolute",
        left: pose.x - pose.size / 2,
        top: pose.y - pose.size / 2,
        width: pose.size,
        height: pose.size,
        opacity: pose.opacity,
        transform: pose.punch === 1 ? undefined : `scale(${pose.punch.toFixed(4)})`,
      }}
    >
      <RadiusDial
        dims={dimsAt(frame)}
        verdictWord={word}
        verdictTone={tone}
        size={pose.size}
        showLabels={clamp01((frame - T.labels.start) / (T.labels.end - T.labels.start))}
        glow={1.15}
        pulseFlagged={false}
        scan={scan}
        scanOpacity={scanOpacity}
        centerOpacity={ramp(frame, T.centreIn.start, T.centreIn.end)}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the Mark and the core dot

/** The Mark's rings (its core is drawn separately, see CoreDot). Builds f300-350, then grows and fades while the arcs sweep in. */
const MarkLayer: React.FC<{ frame: number }> = ({ frame }) => {
  const T = S1_TIMING;
  const out = ramp(frame, T.markOut.start, T.markOut.end);
  if (out >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: HOOK_DOT.x - MARK_SIZE / 2,
        top: HOOK_DOT.y - MARK_SIZE / 2,
        width: MARK_SIZE,
        height: MARK_SIZE,
        opacity: 1 - out,
        transform: `scale(${(1 + 0.2 * out).toFixed(4)})`,
      }}
    >
      <Mark size={MARK_SIZE} mode="build" progress={markProgress(frame, T.markBuildFrom, 60)} accent="transparent" />
    </div>
  );
};

/** The hook dot of S0 (same position, radius and glow), pulsing on the f300 impact, then handing over to the dial's centre disc. */
const CoreDot: React.FC<{ frame: number }> = ({ frame }) => {
  const T = S1_TIMING;
  const out = ramp(frame, T.coreOut.start, T.coreOut.end);
  if (out >= 1) return null;
  const pulse = 1 + 0.2 * decay(frame, T.impact, 4.5);
  const flash = 1 + 0.8 * decay(frame, T.impact, 8);
  const k = (1 - out) * pulse;
  const r = HOOK_DOT.r;
  const wash = r * 2; // the Mark's wash: r 4.4 against the core's 2.2
  return (
    <>
      <div style={{ position: "absolute", left: HOOK_DOT.x - wash, top: HOOK_DOT.y - wash, width: wash * 2, height: wash * 2, borderRadius: "50%", background: alpha(theme.accent, 0.2), transform: `scale(${k.toFixed(4)})`, opacity: 1 - out }} />
      <div
        style={{
          position: "absolute",
          left: HOOK_DOT.x - r,
          top: HOOK_DOT.y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          background: theme.accent,
          opacity: 1 - out,
          transform: `scale(${k.toFixed(4)})`,
          boxShadow: `0 0 ${(70 * flash).toFixed(1)}px ${alpha(theme.accent, Math.min(0.9, 0.55 * flash))}, 0 0 ${(160 * flash).toFixed(1)}px ${alpha(theme.accent, Math.min(0.5, 0.25 * flash))}`,
        }}
      />
    </>
  );
};

/** A thin crimson ring that leaves a point and fades: the sub-impact of f300 and the impact of f420. */
const Shock: React.FC<{ frame: number; start: number; x: number; y: number; r0: number; r1: number; frames: number; strength: number }> = ({ frame, start, x, y, r0, r1, frames, strength }) => {
  const t = clamp01((frame - start) / frames);
  if (frame < start || t >= 1) return null;
  const e = 1 - Math.pow(1 - t, 3);
  const r = r0 + (r1 - r0) * e;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `2px solid ${alpha(theme.accent, strength * (1 - t) * (1 - t))}`,
        boxShadow: `0 0 28px ${alpha(theme.accent, 0.5 * strength * (1 - t))}`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------- the lockup

const Title: React.FC<{ frame: number }> = ({ frame }) => {
  const p = ramp(frame, S1_TIMING.title, S1_TIMING.title + 22);
  if (frame < S1_TIMING.title) return null;
  const pad = 150 * 0.18;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TITLE_TOP, display: "flex", justifyContent: "center" }}>
      <div style={{ overflow: "hidden", padding: `${pad}px ${pad * 0.5}px`, margin: `${-pad}px ${-pad * 0.5}px` }}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 1.04,
            letterSpacing: "-0.012em",
            whiteSpace: "nowrap",
            color: theme.ink,
            transform: `translateY(${((1 - p) * 108).toFixed(3)}%)`,
          }}
        >
          Mini<span style={{ color: theme.accentInk }}>Locker</span>
        </div>
      </div>
    </div>
  );
};

const Lockup: React.FC<{ frame: number }> = ({ frame }) => {
  const T = S1_TIMING;
  if (frame < T.lockup) return null;
  const exit = ramp(frame, T.exit.start, T.exit.end);
  if (exit >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit, transform: `translateY(${(-40 * exit).toFixed(2)}px) scale(${(1 - 0.04 * exit).toFixed(4)})`, transformOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: CHIP_TOP, display: "flex", justifyContent: "center" }}>
        <Badge label={s1.eyebrow} tone="accent" size={24} pulse={badgePulse(frame)} reveal={badgeReveal(frame, T.lockup, 14)} />
      </div>
      <Title frame={frame} />
      <div style={{ position: "absolute", left: 0, right: 0, top: TAGLINE_TOP, display: "flex", justifyContent: "center" }}>
        <KineticText text={s1.tagline} startFrame={T.tagline} fontSize={44} color={theme.ink2} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S1Title: React.FC<SceneOverlayProps> = ({ frame }) => {
  const T = S1_TIMING;
  const cam = getCameraState(frame, CAMERA_UP_TO_S2, FPS);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${cam.shakeX.toFixed(2)}px, ${cam.shakeY.toFixed(2)}px)` }}>
      <Shock frame={frame} start={T.impact} x={HOOK_DOT.x} y={HOOK_DOT.y} r0={HOOK_DOT.r} r1={420} frames={24} strength={0.7} />
      <Shock frame={frame} start={T.lockup} x={CX} y={540} r0={180} r1={900} frames={30} strength={0.3} />
      <MarkLayer frame={frame} />
      <CoreDot frame={frame} />
      <Lockup frame={frame} />
      <DialLayer frame={frame} />
    </div>
  );
};
