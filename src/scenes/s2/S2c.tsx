// S2c (f1190-1499) "The finish" (BIBLE 6, S2). Patch 13c: the last third of S2.
//
// What the app does here is all filmState.ts (the hidden check's line lands on the hiddenCheck pin, f1200; the sandbox audit flips the
// Filesystem / Secrets / Compute gauges and lights the dial arcs on the audit pin, f1272; the sandbox is destroyed f1312 and the seal
// closes f1330). This file adds
//   - the CAMERA: the pull from the run shot (13b ends on runView, f1176) to the BLAST PANEL, which scrolls (BLAST_SCROLL, script.ts) so the
//     event log, where "Hidden check passed" lands, is in view; a slow push-in while the audit plays; the WIDEN to the whole window (f1380-1472);
//     and the WHIP onto the Secrets gauge that lands on the beat at f1500, where S3 takes over;
//   - the two CALLOUTS, which follow the panel's scroll and the camera every frame (they point at the measured row of the log and at the
//     Secrets gauge, and sit in the bare stage to the right of the window, so they never cover the panel);
//   - the closing CAPTION "Plan. Dispatch. Execute. Verify." (f1440).
//
// Hand-offs: 13b's last camera move ends on f1176 (runView) and its cursor is hidden from f1188; this part's first keyframe is f1190 and
// it has no cursor waypoints (the cursor stays hidden: BIBLE 5 shows it in S2 only until the run has played). The last keyframes put the camera on
// gaugeSecrets on f1500, so patch 14's first keyframe (f1500, gaugeSecrets) starts from where this part ends: no jump, no second whip.
//
// Cues (BIBLE 8 / CUES.s2) nudged so the pointing is true: the hidden-check callout starts f1215, the beat (the line lands f1200 while the camera is still
// arriving; on f1200 its row is not on the stage yet), the audit callout f1266 (the gauges flip f1272: the dot is on the card before it changes).
import React from "react";
import { Callout } from "../../fx/Callout";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { blastGaugeSecretsAnchor, blastLogTextAnchor } from "../../config/anchors";
import { copy } from "../../config/copy";
import { BLAST_LOG_SCROLL, FIX_RUN, type FixKey } from "../../config/script";
import { CUES, FPS, STAGE } from "../../config/timeline";
import { S2A_CAMERA } from "./S2a";
import { S2B_CAMERA } from "./S2b";
import type { SceneOverlayProps } from "../types";

const s2 = copy.s2;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

const pinAt = (key: FixKey): number => {
  const p = FIX_RUN.pins.find((q) => q.key === key);
  if (!p) throw new Error(`S2c: FIX_RUN has no "${key}" pin (src/config/script.ts)`);
  return p.frame;
};

export const S2C_TIMING = {
  /** the camera leaves the run shot for the Blast panel on the frame the panel starts to scroll (BLAST_LOG_SCROLL.from) and is there 34 frames later */
  pullStart: BLAST_LOG_SCROLL.from,
  pullFrames: 34,
  /** "A check it never sees": the dot on the line of the log. It leaves over its last 10 frames, as the panel scrolls back up. */
  check: { start: 1215, end: 1258 },
  /** "Audited as it is destroyed": the dot on the Secrets gauge. The gauges flip on the audit pin (f1272), the sandbox is destroyed f1312. */
  audit: { start: 1266, end: 1334 },
  /** two slow push-ins on the panel (about 4 % and 8 %), so no frame between the audit and the widen is still */
  creepA: { start: 1236, frames: 70 },
  creepB: { start: 1306, frames: 74 },
  /** the widen to the whole window: it arrives on f1464 and holds ten frames */
  widen: { start: 1380, frames: 84 },
  /** the closing caption (CUES.s2.captionSteps), gone before the whip lands */
  captionEnd: 1490,
  /** the whip onto the Secrets gauge (patch 25: 18 -> 26 frames, peak speed about 30 % lower): 26 frames, landing on the beat f1500; the roll (2.5 deg) leaves again over the last 9 */
  whip: { start: 1474, frames: 26, rollBack: 1491 },
} as const;

// ---------------------------------------------------------------------------------------------- camera

const PANEL_PADDING = 56;

/**
 * Blast panel shot: padding 56 gives zoom 1.163 (height-limited: the panel is 832.5 px tall): the panel is 534 px wide on the stage, in the
 * middle (x 693-1227), and the window's right edge, which is the panel's, is at stage x 1227: the callouts live in the bare stage beyond it.
 * Closing widen: `closingWide` puts the window on the upper part of the stage at zoom 1.0 (y 20-920), so the caption has its strip.
 * Whip: gaugeSecrets is clamped to the maximum zoom (2.6) whatever the padding.
 */
export const S2C_CAMERA: readonly CameraKeyframe[] = [
  kf(S2C_TIMING.pullStart, "blastPanel", { padding: PANEL_PADDING, ease: "signature", frames: S2C_TIMING.pullFrames }),
  kf(S2C_TIMING.creepA.start, "blastPanel", { padding: PANEL_PADDING, scaleBias: 1.04, ease: "signature", frames: S2C_TIMING.creepA.frames }),
  kf(S2C_TIMING.creepB.start, "blastPanel", { padding: PANEL_PADDING, scaleBias: 1.08, ease: "signature", frames: S2C_TIMING.creepB.frames }),
  kf(S2C_TIMING.widen.start, "closingWide", { padding: 60, ease: "signature", frames: S2C_TIMING.widen.frames }),
  kf(S2C_TIMING.whip.start, "gaugeSecrets", { padding: 96, rotateZ: 2.5, ease: "signature", frames: S2C_TIMING.whip.frames }),
  kf(S2C_TIMING.whip.rollBack, "gaugeSecrets", { padding: 96, rotateZ: 0, ease: "signature", frames: S2C_TIMING.whip.start + S2C_TIMING.whip.frames - S2C_TIMING.whip.rollBack }),
];

/**
 * The closing caption is drawn CAPTION_DROP px lower than the film's usual caption position (theme `layout.captionBottom`). The widened window ends
 * on stage y 920 (`closingWide`); the 64 px caption at the usual position has its ink on y 905-968, across the window's bottom edge. Dropped by 40 it is
 * on y 945-1008: 25 px under the window, 72 px above the stage's bottom edge. (The camera cannot zoom out below 1.0, so the window cannot go higher.)
 */
const CAPTION_DROP = 40;

/** No cursor in this part: 13b hid it on f1188 and it stays hidden (a waypoint here would fade it back in). */
export const S2C_CURSOR: readonly CursorWaypoint[] = [];

/**
 * The camera as the film has it on a frame of S2 (what <Camera> renders), for the callouts that point at things inside the window. The film's
 * camera arrives at f600 on `fullWindow` with padding 60 (S1's last pose; 13a's first keyframe repeats it), so S2's own keyframes after that one keyframe
 * give the same pose on every frame of S2.
 */
const CALLOUT_CAMERA: readonly CameraKeyframe[] = [kf(0, "fullWindow", { padding: 60 }), ...S2A_CAMERA, ...S2B_CAMERA, ...S2C_CAMERA];

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S2C_TIMING;
  if (!(S2C_CAMERA[0].frame >= 1190)) throw new Error("S2c: the first camera keyframe must start at f1190 or later (13b holds runView until f1176 and hides the cursor from f1188)");
  for (let i = 1; i < S2C_CAMERA.length; i++) {
    if (!(S2C_CAMERA[i].frame >= S2C_CAMERA[i - 1].frame)) throw new Error(`S2c: camera keyframe ${i} (f${S2C_CAMERA[i].frame}) is before keyframe ${i - 1} (f${S2C_CAMERA[i - 1].frame})`);
  }
  const widenEnd = t.widen.start + t.widen.frames;
  if (!(widenEnd < t.whip.start)) throw new Error(`S2c: the widen ends on f${widenEnd}; the whip starts f${t.whip.start} and needs a beat of calm before it`);
  if (!(t.whip.start + t.whip.frames === 1500)) throw new Error("S2c: the whip must land on f1500 (the first frame of S3)");
  if (!(t.creepA.start >= t.pullStart + t.pullFrames)) throw new Error("S2c: the first creep must start after the pull has arrived");
  if (!(t.creepB.start >= t.creepA.start + t.creepA.frames)) throw new Error("S2c: the second creep must start after the first has ended");
  if (!(t.widen.start >= t.creepB.start + t.creepB.frames)) throw new Error("S2c: the widen must start after the second creep has ended");

  // the pins decide when the app shows what the callouts point at
  const check = pinAt("hiddenCheck");
  const audit = pinAt("audit");
  const destroyed = pinAt("destroyed");
  if (!(t.check.start >= check + 8)) throw new Error(`S2c: the hidden-check callout (f${t.check.start}) must start 8 frames after the line has landed (f${check}, script.ts)`);
  if (!(t.check.end <= BLAST_LOG_SCROLL.leaveFrom + 10 && t.check.end > t.check.start + 30)) throw new Error("S2c: the hidden-check callout must be on screen for at least 30 frames and be gone before the log has scrolled away");
  if (!(BLAST_LOG_SCROLL.shownAt <= t.check.start + 10)) throw new Error("S2c: the log must be (almost) scrolled into view when the hidden-check callout starts");
  if (!(BLAST_LOG_SCROLL.backAt <= audit)) throw new Error(`S2c: the Blast panel must be back on the gauges (f${BLAST_LOG_SCROLL.backAt}) before the audit flips them (f${audit}, script.ts)`);
  if (!(t.audit.start >= BLAST_LOG_SCROLL.backAt - 8 && t.audit.start <= audit)) throw new Error(`S2c: the audit callout (f${t.audit.start}) must start with the gauges back in view and before they flip (f${audit})`);
  if (!(t.audit.end > destroyed)) throw new Error(`S2c: the audit callout (to f${t.audit.end}) must still be up when the sandbox is destroyed (f${destroyed})`);
  if (!(t.check.end <= t.audit.start + 10)) throw new Error("S2c: the two callouts must not be up together for long");
  if (!(CUES.s2.captionSteps + 40 <= t.captionEnd && t.captionEnd + 8 <= 1500)) throw new Error("S2c: the closing caption must stay up 40 frames and be gone before f1500");
})();

// ---------------------------------------------------------------------------------------------- the callouts

/**
 * A callout that points at a spot INSIDE the window and whose chip sits in the bare stage to the right of the window (the Blast panel is
 * the right-hand column, so the window's right edge, logical x 1600, is the panel's). `world` is the spot in logical px on this frame; the
 * leader is as long as it takes the chip to clear the window edge by 28 px, whatever the zoom of the creep is.
 */
const PanelCallout: React.FC<{
  frame: number;
  text: string;
  variant: "note" | "ok";
  world: { x: number; y: number };
  startFrame: number;
  endFrame: number;
}> = ({ frame, text, variant, world, startFrame, endFrame }) => {
  const cam = getCameraState(frame, CALLOUT_CAMERA, FPS);
  const dot = worldToStage(cam, world);
  const edge = worldToStage(cam, { x: 1600, y: world.y });
  const lead = Math.max(72, Math.round(edge.x + 28 - dot.x));
  return <Callout text={text} variant={variant} target={dot} side="right" lead={lead} startFrame={startFrame} endFrame={endFrame} />;
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S2c: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S2C_TIMING;

  // the end of the words "Hidden check passed" in the log: the dot sits 12 px after the text, on its line
  const text = blastLogTextAnchor(frame);
  const checkAt = { x: text.x + text.w + 12, y: text.y + text.h / 2 };

  // the Secrets gauge (measured card, moving with the panel's scroll): the dot sits inside its right edge, halfway down
  const g = blastGaugeSecretsAnchor(frame);
  const auditAt = { x: g.x + g.w - 14, y: g.y + g.h / 2 };

  return (
    <>
      <PanelCallout frame={frame} text={s2.calloutCheck} variant="ok" world={checkAt} startFrame={t.check.start} endFrame={t.check.end} />
      <PanelCallout frame={frame} text={s2.calloutAudit} variant="note" world={auditAt} startFrame={t.audit.start} endFrame={t.audit.end} />
      {/* the caption sits CAPTION_DROP px lower than the film's usual position, in the strip under the widened window (see CAPTION_DROP) */}
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, transform: `translateY(${CAPTION_DROP}px)`, pointerEvents: "none" }}>
        <Caption text={s2.captionSteps} highlight="Verify." size={64} startFrame={CUES.s2.captionSteps} endFrame={t.captionEnd} />
      </div>
    </>
  );
};
