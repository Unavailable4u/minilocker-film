// The virtual camera. Wraps the recreated app window (logical 1600 x 900) in ONE transform:
//   perspective(1800px) rotateX() rotateY() rotateZ() translate3d() scale()
// so all zooming is vector-sharp and the "camera" is a physical object: it springs between keyframes, drifts 2 px so a held
// shot never freezes, tilts slightly, shakes on impacts and blurs/dims everything outside the focus.
//
// HOW IT WORKS
//   - Each keyframe names a focus rectangle (src/config/focus.ts). Solving a keyframe gives a POSE: the world point to put in the
//     middle of the stage (the rectangle's centre), the zoom that fits the rectangle inside `padding` (times scaleBias, clamped to
//     1.0 .. 2.6), and the tilt.
//   - The pose at frame N is  pose[0] + sum over i >= 1 of (pose[i] - pose[i-1]) * progress_i(N).  progress_i is 0 before keyframe i
//     starts and rises to 1 (camera spring, or a signature/linear ramp). Every progress starts at 0 with zero velocity, so
//     overlapping moves and hand-offs between keyframes are continuous: no jitter.
//   - Zoom is blended in log space (a zoom feels even), the focus centre linearly in world space.
//   - Pure: same keyframes and frame, same picture. Randomness is the seeded PRNG only.
//
// GEOMETRY: world point p appears at stage point  T + s * p  (before tilt, drift and shake), where T = (960, 540) - s * centre.
// With the transform origin at the stage centre O = (960, 540) the translate that gives this is  T + (s - 1) * O.

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CAMERA_LIMITS, type CameraKeyframe } from "../config/camera";
import { focusRect } from "../config/focus";
import { FPS, LOGICAL, STAGE, sceneAt } from "../config/timeline";
import { clamp01, mapRange, signature } from "../lib/ease";
import { rand } from "../lib/prng";
import { spr } from "../lib/spring";

const ORIGIN = { x: STAGE.w / 2, y: STAGE.h / 2 } as const;

interface Pose {
  cx: number;
  cy: number;
  logScale: number;
  rx: number;
  ry: number;
  rz: number;
  /** size of the focus rectangle on screen, in stage px (for the depth-of-field hole) */
  fw: number;
  fh: number;
}

export interface CameraState {
  /** final zoom (world px to stage px) */
  scale: number;
  /** translate of the single CSS transform (stage px), already including drift and shake */
  tx: number;
  ty: number;
  /** tilt and roll in degrees, already clamped */
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** the parts that were added to tx, ty (drift and shake), for tests and for overlays that want to follow them */
  driftX: number;
  driftY: number;
  shakeX: number;
  shakeY: number;
  /** the focus rectangle's size on screen in stage px (blended between keyframes) */
  focusW: number;
  focusH: number;
}

export interface CameraOptions {
  /** force the S1/S9 tilt limits (14 deg) on or off. Default: decided by the scene the frame is in. */
  wideTilt?: boolean;
}

const clampTo = (v: number, lim: number): number => (v < -lim ? -lim : v > lim ? lim : v);

function poseOf(k: CameraKeyframe): Pose {
  const r = focusRect(k.target);
  const availW = STAGE.w - 2 * k.padding;
  const availH = STAGE.h - 2 * k.padding;
  if (!(availW > 0) || !(availH > 0)) throw new Error(`Camera: padding ${k.padding} leaves no room on the stage (keyframe at frame ${k.frame})`);
  if (!(k.scaleBias > 0)) throw new Error(`Camera: scaleBias must be > 0 (keyframe at frame ${k.frame})`);
  const fit = Math.min(availW / r.w, availH / r.h) * k.scaleBias;
  const s = Math.min(CAMERA_LIMITS.scaleMax, Math.max(CAMERA_LIMITS.scaleMin, fit));
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, logScale: Math.log(s), rx: k.rotateX, ry: k.rotateY, rz: k.rotateZ, fw: r.w * s, fh: r.h * s };
}

function progress(frame: number, k: CameraKeyframe, fps: number): number {
  const local = frame - k.frame;
  if (local <= 0) return 0;
  const mode = k.ease ?? "spring";
  if (mode === "spring") return local > CAMERA_LIMITS.springSettled ? 1 : spr(frame, fps, k.frame, "camera");
  const len = k.frames ?? CAMERA_LIMITS.defaultMoveFrames;
  return mapRange(frame, k.frame, k.frame + Math.max(1, len), 0, 1, mode === "signature" ? signature : (t) => t);
}

function validate(keyframes: readonly CameraKeyframe[]): void {
  if (keyframes.length === 0) throw new Error("Camera: at least one keyframe is required");
  for (let i = 1; i < keyframes.length; i++) {
    if (!(keyframes[i].frame >= keyframes[i - 1].frame)) {
      throw new Error(`Camera: keyframes must be in frame order (keyframe ${i} at frame ${keyframes[i].frame} comes after frame ${keyframes[i - 1].frame})`);
    }
  }
}

/** The impact shake at a frame: smooth decaying sines with seeded phases (no per-frame random jitter). */
function shakeAt(frame: number, keyframes: readonly CameraKeyframe[]): { x: number; y: number; rot: number } {
  let x = 0;
  let y = 0;
  let rot = 0;
  for (const k of keyframes) {
    if (!k.shake) continue;
    const local = frame - k.frame;
    if (local < 0 || local >= CAMERA_LIMITS.shakeFrames) continue;
    const t = local / CAMERA_LIMITS.shakeFrames;
    const decay = (1 - t) * (1 - t);
    const phaseX = rand(k.frame * 7 + 3) * Math.PI * 2;
    const phaseY = rand(k.frame * 13 + 5) * Math.PI * 2;
    const w = (Math.PI * 2) / 2.7; // about one swing every 2.7 frames
    x += k.shake * decay * Math.sin(w * local + phaseX);
    y += k.shake * decay * Math.sin(w * local * 1.13 + phaseY);
    rot += k.shake * decay * 0.04 * Math.sin(w * local * 0.9 + phaseX);
  }
  return { x, y, rot };
}

/** Float (patch 25): sinusoids with two slow periods (190 / 257 frames), so a held shot always visibly lives. */
function driftAt(frame: number): { x: number; y: number } {
  const a = CAMERA_LIMITS.driftPx;
  return {
    x: a * Math.sin((Math.PI * 2 * frame) / 190 + 0.7),
    y: a * Math.sin((Math.PI * 2 * frame) / 257 + 2.1),
  };
}

/** Slow zoom breathing (patch 25), multiplies the zoom; the focus centre stays put because tx/ty are solved from the final zoom. */
function breathAt(frame: number): number {
  return 1 + CAMERA_LIMITS.floatZoom * Math.sin((Math.PI * 2 * frame) / 310 + 1.3);
}

/** The camera at a frame. Pure; use it from scenes and overlays that must follow the camera (see worldToStage). */
export function getCameraState(frame: number, keyframes: readonly CameraKeyframe[], fps: number = FPS, opts: CameraOptions = {}): CameraState {
  validate(keyframes);
  const poses = keyframes.map(poseOf);
  const acc = { ...poses[0] };
  for (let i = 1; i < poses.length; i++) {
    const p = progress(frame, keyframes[i], fps);
    if (p === 0) continue;
    const a = poses[i - 1];
    const b = poses[i];
    acc.cx += (b.cx - a.cx) * p;
    acc.cy += (b.cy - a.cy) * p;
    acc.logScale += (b.logScale - a.logScale) * p;
    acc.rx += (b.rx - a.rx) * p;
    acc.ry += (b.ry - a.ry) * p;
    acc.rz += (b.rz - a.rz) * p;
    acc.fw += (b.fw - a.fw) * p;
    acc.fh += (b.fh - a.fh) * p;
  }
  const wide = opts.wideTilt ?? (() => {
    const id = sceneAt(frame).id;
    return id === "S1" || id === "S9";
  })();
  const limX = wide ? CAMERA_LIMITS.tiltXWide : CAMERA_LIMITS.tiltX;
  const limY = wide ? CAMERA_LIMITS.tiltYWide : CAMERA_LIMITS.tiltY;

  const scale = Math.exp(acc.logScale) * breathAt(frame);
  const sh = shakeAt(frame, keyframes);
  const dr = driftAt(frame);
  // T = O - s * centre;  translate = T + (s - 1) * O
  const tx = ORIGIN.x - scale * acc.cx + (scale - 1) * ORIGIN.x + dr.x + sh.x;
  const ty = ORIGIN.y - scale * acc.cy + (scale - 1) * ORIGIN.y + dr.y + sh.y;
  return {
    scale,
    tx,
    ty,
    rotateX: clampTo(acc.rx, limX),
    rotateY: clampTo(acc.ry, limY),
    rotateZ: clampTo(acc.rz, CAMERA_LIMITS.tiltZ) + sh.rot,
    driftX: dr.x,
    driftY: dr.y,
    shakeX: sh.x,
    shakeY: sh.y,
    focusW: acc.fw,
    focusH: acc.fh,
  };
}

/** The CSS transform string for a camera state (origin must be the stage centre: "960px 540px"). */
export function cameraTransform(s: CameraState): string {
  return (
    `perspective(${CAMERA_LIMITS.perspective}px) rotateX(${s.rotateX.toFixed(4)}deg) rotateY(${s.rotateY.toFixed(4)}deg) ` +
    `rotateZ(${s.rotateZ.toFixed(4)}deg) translate3d(${s.tx.toFixed(3)}px, ${s.ty.toFixed(3)}px, 0) scale(${s.scale.toFixed(5)})`
  );
}

/** Where a LOGICAL (world) point lands on the 1920 x 1080 stage. Ignores the tilt (a few px at most): good for anchoring overlays. */
export function worldToStage(state: CameraState, p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: ORIGIN.x + state.tx + state.scale * (p.x - ORIGIN.x),
    y: ORIGIN.y + state.ty + state.scale * (p.y - ORIGIN.y),
  };
}

export interface CameraProps {
  keyframes: readonly CameraKeyframe[];
  /** Depth of field: 12% dim and up to 1.2 px blur outside the focus. Default true. */
  dof?: boolean;
  /** Force the wide (S1/S9) tilt limits on or off; default decided by the scene of the current frame. */
  wideTilt?: boolean;
  children?: React.ReactNode;
}

/**
 * Render inside the 1920 x 1080 stage. `children` are laid out in LOGICAL coordinates (1600 x 900, origin top-left of the window).
 * Overlays that live in stage space (captions, callouts, badges) go OUTSIDE the camera.
 */
export const Camera: React.FC<CameraProps> = ({ keyframes, dof = true, wideTilt, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = getCameraState(frame, keyframes, fps, { wideTilt });

  // Depth of field: an elliptical hole around the focus; outside it, a light blur and a dim. A mask, so nothing re-renders twice.
  const rx = Math.max(220, (state.focusW / 2) * 1.5);
  const ry = Math.max(140, (state.focusH / 2) * 1.5);
  const hole = `radial-gradient(ellipse ${rx.toFixed(1)}px ${ry.toFixed(1)}px at 50% 50%, transparent 62%, #000 100%)`;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: LOGICAL.w,
          height: LOGICAL.h,
          transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
          transform: cameraTransform(state),
        }}
      >
        {children}
      </div>
      {dof ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE.w,
            height: STAGE.h,
            pointerEvents: "none",
            background: `rgba(0,0,0,${CAMERA_LIMITS.dofDim})`,
            backdropFilter: `blur(${CAMERA_LIMITS.dofBlurPx}px)`,
            WebkitBackdropFilter: `blur(${CAMERA_LIMITS.dofBlurPx}px)`,
            maskImage: hole,
            WebkitMaskImage: hole,
          }}
        />
      ) : null}
    </div>
  );
};

/** 0..1 helper for scenes that want to ease something along with a camera move that starts at `frame` (same spring as the camera). */
export function cameraProgress(frame: number, startFrame: number, fps: number = FPS): number {
  return clamp01(spr(frame, fps, startFrame, "camera"));
}
