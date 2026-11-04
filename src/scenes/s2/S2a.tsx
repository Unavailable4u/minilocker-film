// S2a (f600-780) "A real task" (BIBLE 6, S2). Patch 13a: the setup half of S2.
//
// The window is on screen from f600 (S1's dial has just landed on the panel). The camera holds the whole window, eases to the task form
// (arrives f690) and pushes in on the Run button (arrives f744). The cursor enters from the bottom-right, opens the scenario select
// and picks the scenario, rests on the default profile, sets "hold 1 min" and presses "Run in sandbox" on f750. EVERY interaction frame
// is the one filmState.ts reads from script.ts (FORM / FIX_RUN): the cursor waypoints below are computed FROM those numbers, so a
// retime in script.ts moves the cursor with it, and a check at import time throws when the two would disagree.
//
// Overlay (stage space): the eyebrow badge (f600-720), the four-node flow strip in the left gutter with a packet travelling down it and
// the error loop back to the model (f660-780), and the caption "A real task. Real execution." (f660).
// The camera frames the form with a wide empty margin on the left (the form sits right of centre of the stage) so the strip has room and
// never covers the window.
import React from "react";
import { Badge, badgePulse } from "../../fx/Badge";
import { Caption } from "../../fx/Caption";
import { Packet } from "../../gfx/Packet";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { anchorPoint, workspaceAnchors } from "../../config/anchors";
import { copy } from "../../config/copy";
import { FORM, FIX_RUN } from "../../config/script";
import { alpha, fonts, theme } from "../../config/theme";
import { CUES } from "../../config/timeline";
import { clamp01, signature } from "../../lib/ease";
import type { SceneOverlayProps } from "../types";

const s2 = copy.s2;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

export const S2A_TIMING = {
  /** the badge draws on at CUES.s2.badge and is drawn off again over the 12 frames before `badgeEnd` */
  badgeEnd: 720,
  /** the camera holds the whole window until this frame (the pose S1's push ends on), then eases to the form */
  holdUntil: 660,
  /** the camera is on the form from this frame (a 30 f signature move that starts on holdUntil) */
  formArrive: 690,
  /** the camera starts the push towards Run; it is there on pushArrive, six frames after the hover starts and six before the press */
  pushStart: 722,
  pushArrive: 744,
  /** flow strip: node i draws on at nodes.start + i * nodes.every (16 f each); the strip leaves over the last 12 frames before `end` */
  nodes: { start: CUES.s2.caption, every: 8, len: 16 },
  /** the packet runs down the rail, then the error loop runs back up the dashed rail */
  packetDown: { start: 688, end: 740 },
  packetUp: { start: 742, end: 766 },
  end: 780,
  /** the caption leaves before the cursor reaches the Run button */
  captionEnd: 744,
} as const;

// ---------------------------------------------------------------------------------------------- camera

/**
 * f600 keeps S1's final pose (whole window, 60 px margin): the first keyframe is a no-op that makes the hold explicit.
 * Form shot: padding 265 gives zoom 1.25 (height-limited), which puts the form between y 265 and 815 and leaves the left 700 px of the
 * stage empty for the flow strip; the caption sits below it (y 890+). Run shot: padding 199 gives zoom 1.55; the Run button is then at
 * y 754-830 and clear of the caption, which has left by f744.
 */
export const S2A_CAMERA: readonly CameraKeyframe[] = [
  kf(600, "fullWindow", { padding: 60 }),
  kf(S2A_TIMING.holdUntil, "taskForm", { padding: 265, ease: "signature", frames: S2A_TIMING.formArrive - S2A_TIMING.holdUntil }),
  kf(S2A_TIMING.pushStart, "taskForm", { padding: 199, ease: "signature", frames: S2A_TIMING.pushArrive - S2A_TIMING.pushStart }),
];

// ---------------------------------------------------------------------------------------------- cursor

const centre = (r: { x: number; y: number; w: number; h: number }) => anchorPoint(r);

/**
 * The cursor, in LOGICAL window px, on the frames script.ts gives the form:
 *   enter from the bottom-right, arrive over the select on FORM.selectHoverFrom, click it open on FORM.selectFocusFrom, click the
 *   scenario on FORM.selectAt; strict on FORM.profileHoverFrom; the hold select on FORM.holdHoverFrom, open on holdFocusFrom, pick on
 *   holdAt; Run on FORM.runHoverFrom and the press on FIX_RUN.pressAt.
 * The native select's option list is not drawn by the recreated form, so the "pick" click lands a little below the select, where the
 * first option would be.
 */
function buildCursor(): readonly CursorWaypoint[] {
  const sel = workspaceAnchors.taskSelect();
  const strict = workspaceAnchors.profileSegment();
  const hold = workspaceAnchors.holdSelect();
  const run = workspaceAnchors.runButton();
  const selP = { x: sel.x + sel.w * 0.62, y: centre(sel).y };
  const holdP = { x: hold.x + hold.w * 0.6, y: centre(hold).y };
  const runP = centre(run);
  const strictP = centre(strict);

  const wp: CursorWaypoint[] = [
    // bottom-right of the window, resting for a beat before it crosses
    { frame: FORM.selectHoverFrom - 60, x: 1500, y: 862, hover: "enter" },
    { frame: FORM.selectHoverFrom, ...selP, hover: "scenario-select" },
    { frame: FORM.selectFocusFrom, ...selP, click: true, hover: "scenario-select" },
    { frame: FORM.selectAt, x: selP.x, y: selP.y + 34, click: true, hover: "scenario-option" },
    { frame: FORM.profileHoverFrom, ...strictP, hover: "profile-strict" },
    { frame: FORM.holdHoverFrom, ...holdP, hover: "hold-select" },
    { frame: FORM.holdFocusFrom, ...holdP, click: true, hover: "hold-select" },
    { frame: FORM.holdAt, x: holdP.x, y: holdP.y + 24, click: true, hover: "hold-option" },
    { frame: FORM.runHoverFrom, ...runP, hover: "run-button" },
    { frame: FIX_RUN.pressAt, ...runP, click: true, hover: "run-button" },
  ];
  return wp;
}

export const S2A_CURSOR: readonly CursorWaypoint[] = buildCursor();

// Fail at import time, not on a still, if a retime in script.ts breaks the order of the gestures.
(() => {
  for (let i = 1; i < S2A_CURSOR.length; i++) {
    if (!(S2A_CURSOR[i].frame >= S2A_CURSOR[i - 1].frame)) {
      throw new Error(`S2a: cursor waypoint ${i} (f${S2A_CURSOR[i].frame}) is before waypoint ${i - 1} (f${S2A_CURSOR[i - 1].frame}); check FORM / FIX_RUN in src/config/script.ts`);
    }
  }
  if (S2A_CURSOR[0].frame < 600 + 8) throw new Error("S2a: the cursor must fade in after the window is on screen (f608 or later)");
  if (!(S2A_TIMING.pushArrive <= FIX_RUN.pressAt)) throw new Error("S2a: the push on the Run button must arrive before the press");
})();

// ---------------------------------------------------------------------------------------------- flow strip layout (stage px)

/**
 * The badge sits at y 140, just under the window's header (the whole-window shot puts the header at y 60-132, so a badge at the safe
 * margin would cover the logo). In the form shot it is in the empty left gutter, above the strip.
 */
const BADGE_TOP = 140;

const STRIP = {
  /** left gutter: the form sits right of x 670 in the Run shot, so everything here ends before x 650 */
  railX: 124,
  returnX: 100,
  cardX: 156,
  cardW: 480,
  top: 224,
  cardH: 112,
  gap: 52,
} as const;

const nodeTop = (i: number): number => STRIP.top + i * (STRIP.cardH + STRIP.gap);
const nodeMid = (i: number): number => nodeTop(i) + STRIP.cardH / 2;

const riseP = (frame: number, start: number, len: number): number => signature(clamp01((frame - start) / Math.max(1, len)));

/** 1 while the strip rests, 0 after it has left (a mask, like the badge and the callouts; never a fade). */
const stripOut = (frame: number): number => 1 - riseP(frame, S2A_TIMING.end - 12, 12);

const FlowCard: React.FC<{ i: number; label: string; frame: number }> = ({ i, label, frame }) => {
  const t = S2A_TIMING;
  const inP = riseP(frame, t.nodes.start + i * t.nodes.every, t.nodes.len);
  const out = stripOut(frame);
  // the packet reaches node i at pass_i; a node stays lit once it has been reached
  const pass = t.packetDown.start + (i * (t.packetDown.end - t.packetDown.start)) / 3;
  const lit = riseP(frame, pass - 2, 8);
  // the loop lands on the first node again: it flashes warn-coloured when the error comes back
  const back = i === 0 ? riseP(frame, t.packetUp.end - 4, 8) * (1 - riseP(frame, t.packetUp.end + 2, 8)) : 0;
  const reveal = Math.min(inP, out);
  if (reveal <= 0) return null;
  const accent = theme.accent;
  const border = back > 0 ? alpha(theme.warn, 0.35 + 0.5 * back) : alpha(accent, 0.18 + 0.55 * lit);
  return (
    <div
      style={{
        position: "absolute",
        left: STRIP.cardX,
        top: nodeTop(i),
        width: STRIP.cardW,
        height: STRIP.cardH,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 22px",
        borderRadius: 18,
        border: `1px solid ${border}`,
        background: `linear-gradient(180deg, ${alpha(theme.ink, 0.07)}, ${alpha(theme.ink, 0.02)}), rgba(12,12,16,.74)`,
        boxShadow: `${theme.panelShadow}, 0 0 ${28 * lit}px -8px ${alpha(accent, 0.5 * lit)}`,
        clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0 round 18px)`,
        WebkitClipPath: `inset(0 ${(1 - reveal) * 100}% 0 0 round 18px)`,
        transform: `translateX(${(1 - reveal) * -28}px)`,
      }}
    >
      <div
        style={{
          flex: "none",
          width: 46,
          height: 46,
          borderRadius: 23,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: 24,
          color: lit > 0.5 ? theme.onAccent : theme.ink2,
          background: lit > 0.5 ? accent : alpha(theme.ink, 0.08),
          border: `1px solid ${alpha(accent, 0.3 + 0.5 * lit)}`,
          boxShadow: lit > 0.5 ? `0 0 18px ${alpha(accent, 0.6)}` : "none",
        }}
      >
        {i + 1}
      </div>
      <div style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: 31, lineHeight: 1.12, letterSpacing: "-0.005em", color: lit > 0.2 ? theme.ink : theme.ink2 }}>{label}</div>
    </div>
  );
};

const FlowStrip: React.FC<{ frame: number }> = ({ frame }) => {
  const t = S2A_TIMING;
  const labels = s2.flow;
  if (frame < t.nodes.start || frame >= t.end) return null;
  const out = stripOut(frame);
  const railIn = riseP(frame, t.nodes.start + 6, 34) * out;
  const y0 = nodeMid(0);
  const y3 = nodeMid(labels.length - 1);

  // packet positions (centre, stage px)
  const down = clamp01((frame - t.packetDown.start) / (t.packetDown.end - t.packetDown.start));
  const up = clamp01((frame - t.packetUp.start) / (t.packetUp.end - t.packetUp.start));
  const downOn = frame >= t.packetDown.start && frame < t.packetDown.end;
  const upOn = frame >= t.packetUp.start && frame < t.packetUp.end;
  const downY = y0 + (y3 - y0) * down;
  const upY = y3 + 18 + (y0 + 18 - (y3 + 18)) * up;
  const edge = (p: number) => Math.min(riseP(p * 100, 0, 8), 1 - riseP(p * 100, 92, 8));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* the main rail, drawn on top to bottom */}
      <div
        style={{
          position: "absolute",
          left: STRIP.railX - 1,
          top: y0,
          width: 2,
          height: y3 - y0,
          background: `linear-gradient(180deg, ${alpha(theme.accent, 0.7)}, ${alpha(theme.accent, 0.25)})`,
          clipPath: `inset(0 0 ${(1 - railIn) * 100}% 0)`,
          WebkitClipPath: `inset(0 0 ${(1 - railIn) * 100}% 0)`,
        }}
      />
      {/* stubs from the rail to each card */}
      {labels.map((_, i) => {
        const p = Math.min(riseP(frame, t.nodes.start + i * t.nodes.every, t.nodes.len), out);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: STRIP.railX,
              top: nodeMid(i) - 1,
              width: (STRIP.cardX - STRIP.railX) * p,
              height: 2,
              background: alpha(theme.accent, 0.55),
            }}
          />
        );
      })}
      {/* the error loop: a dashed rail from the last node back up to the first, drawn when the packet comes back */}
      {(() => {
        const p = riseP(frame, t.packetUp.start - 6, 10) * out;
        if (p <= 0) return null;
        return (
          <>
            <div
              style={{
                position: "absolute",
                left: STRIP.returnX - 1,
                top: y0 + 18,
                width: 0,
                height: y3 - y0,
                borderLeft: `2px dashed ${alpha(theme.warn, 0.7)}`,
                clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
                WebkitClipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
              }}
            />
            {[0, labels.length - 1].map((i) => (
              <div key={i} style={{ position: "absolute", left: STRIP.returnX, top: nodeMid(i) + 17, width: (STRIP.cardX - STRIP.returnX) * p, height: 2, background: alpha(theme.warn, 0.7) }} />
            ))}
          </>
        );
      })()}

      {labels.map((label, i) => (
        <FlowCard key={i} i={i} label={label} frame={frame} />
      ))}

      {/* the packet: down the rail (ink), then back up the dashed rail (warn: an error fed back to the model) */}
      {downOn ? (
        <div style={{ position: "absolute", left: STRIP.railX, top: downY, width: 0, height: 0, transform: "rotate(90deg)" }}>
          <Packet x={0} y={0} streak={64} color={theme.ink} opacity={edge(down) * out} />
        </div>
      ) : null}
      {upOn ? (
        <div style={{ position: "absolute", left: STRIP.returnX, top: upY, width: 0, height: 0, transform: "rotate(-90deg)" }}>
          <Packet x={0} y={0} streak={64} color={theme.warn} opacity={edge(up) * out} />
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S2a: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S2A_TIMING;
  const badgeIn = riseP(frame, CUES.s2.badge, 14);
  const badgeOut = 1 - riseP(frame, t.badgeEnd - 12, 12);
  const badge = Math.min(badgeIn, badgeOut);
  return (
    <>
      {frame < t.badgeEnd && badge > 0 ? (
        <div style={{ position: "absolute", left: 96, top: BADGE_TOP, pointerEvents: "none" }}>
          <Badge label={s2.badge} tone="accent" pulse={badgePulse(frame)} reveal={badge} />
        </div>
      ) : null}
      <FlowStrip frame={frame} />
      <Caption text={s2.caption} highlight="Real execution." startFrame={CUES.s2.caption} endFrame={t.captionEnd} />
    </>
  );
};
