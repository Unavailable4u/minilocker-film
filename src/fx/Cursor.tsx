// The virtual cursor: a crisp white arrow with a soft shadow that follows curved Bezier paths between waypoints.
//
// HOW IT WORKS
//   - A CursorWaypoint says where the cursor ARRIVES and at which global frame (src/config/camera.ts). The cursor rests at the
//     previous waypoint, then departs so that it arrives exactly on the frame of the next one. The trip takes
//     clamp(distance / 22, 14, 48) frames (never longer than the gap between the two waypoints).
//   - The path is never a straight line: a cubic Bezier whose two control points are pushed sideways by seeded amounts
//     (the seed is made from the two waypoint frames, so the same film always draws the same curve).
//   - Timing along the path is the overshoot-and-correct curve of ease.ts: it runs about 5% past the target, then settles back.
//   - click: the arrow scales 1 -> 0.88 -> 1 over 4 frames and a crimson ring grows from radius 6 to 28 while fading .5 -> 0
//     over 14 frames.
//   - hide: the cursor fades out over 8 frames after that waypoint and stays hidden until it fades in over the 8 frames that
//     end on the next waypoint (no travel between them). Before the first waypoint the cursor is hidden and fades in the same way.
//   - Pure: the same waypoints and frame always give the same picture.
//
// Render <Cursor> INSIDE <Camera> (it lives in LOGICAL window coordinates and follows the camera), in the GLOBAL frame space.

import React from "react";
import { useCurrentFrame } from "remotion";
import type { CursorWaypoint } from "../config/camera";
import { theme } from "../config/theme";
import { clamp01, overshoot } from "../lib/ease";
import { randRange } from "../lib/prng";

export interface CursorState {
  /** position in LOGICAL window coordinates (can run slightly past the target while it overshoots) */
  x: number;
  y: number;
  /** true during the 4-frame press */
  pressed: boolean;
  /** the `hover` label of the waypoint the cursor rests at (or is travelling to); undefined while there is none */
  hover: string | undefined;
  /** 0..1 fade of the arrow (extra to the spec'd fields, used by <Cursor/>) */
  opacity: number;
  /** arrow scale: 1, down to 0.88 during a press */
  scale: number;
  /** the latest click ripple still playing, or null: position in LOGICAL space and its progress 0..1 over 14 frames */
  ripple: { x: number; y: number; t: number } | null;
}

export const CURSOR_CLICK_FRAMES = 4;
export const CURSOR_RIPPLE_FRAMES = 14;
export const CURSOR_FADE_FRAMES = 8;
const PRESS_SCALE = 0.88;

const TRAVEL_MIN = 14;
const TRAVEL_MAX = 48;
const PX_PER_FRAME = 22;
const OVERSHOOT_AMOUNT = 0.05;

interface Pt {
  x: number;
  y: number;
}

/** Throws a clear error if the waypoints are not in frame order. */
function validate(waypoints: readonly CursorWaypoint[]): void {
  for (let i = 1; i < waypoints.length; i++) {
    if (!(waypoints[i].frame >= waypoints[i - 1].frame)) {
      throw new Error(
        `Cursor: waypoints must be in frame order (waypoint ${i} at frame ${waypoints[i].frame} comes after frame ${waypoints[i - 1].frame})`,
      );
    }
  }
}

/** Cubic Bezier at parameter u (u may leave 0..1: the polynomial simply continues, which is how the overshoot works). */
function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** The curve between two waypoints: control points pushed sideways by seeded amounts, so it is never a straight line. */
function controls(a: CursorWaypoint, b: CursorWaypoint, index: number): { c1: Pt; c2: Pt } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { c1: { x: a.x, y: a.y }, c2: { x: b.x, y: b.y } };
  const nx = -dy / dist;
  const ny = dx / dist;
  const seed = a.frame * 31 + b.frame * 17 + index * 101 + 7;
  const sign = randRange(seed, 0, 1) < 0.5 ? -1 : 1;
  const off1 = dist * randRange(seed + 1, 0.12, 0.24) * sign;
  const off2 = dist * randRange(seed + 2, 0.03, 0.12) * sign;
  return {
    c1: { x: a.x + dx * 0.3 + nx * off1, y: a.y + dy * 0.3 + ny * off1 },
    c2: { x: a.x + dx * 0.72 + nx * off2, y: a.y + dy * 0.72 + ny * off2 },
  };
}

/** Frames the trip into `b` takes, given where it starts. */
function travelFrames(a: CursorWaypoint, b: CursorWaypoint): number {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const wanted = Math.round(Math.min(TRAVEL_MAX, Math.max(TRAVEL_MIN, dist / PX_PER_FRAME)));
  return Math.max(1, Math.min(wanted, b.frame - a.frame));
}

/**
 * The cursor at a global frame. Pure.
 * Returns { x, y, pressed, hover } as specified, plus the fade (opacity), the arrow scale and the active ripple for <Cursor/>.
 */
export function getCursorState(frame: number, waypoints: readonly CursorWaypoint[]): CursorState {
  validate(waypoints);
  const n = waypoints.length;
  if (n === 0) return { x: 0, y: 0, pressed: false, hover: undefined, opacity: 0, scale: 1, ripple: null };

  // index of the last waypoint that has already ARRIVED (frame <= current), -1 before the first
  let last = -1;
  for (let i = 0; i < n; i++) {
    if (waypoints[i].frame <= frame) last = i;
    else break;
  }

  // ---- click press and ripple: the latest click that is still playing
  let pressed = false;
  let scale = 1;
  let ripple: CursorState["ripple"] = null;
  for (let i = 0; i < n; i++) {
    const w = waypoints[i];
    if (!w.click) continue;
    const local = frame - w.frame;
    if (local >= 0 && local < CURSOR_CLICK_FRAMES) {
      pressed = true;
      scale = Math.min(scale, 1 - (1 - PRESS_SCALE) * Math.sin((Math.PI * local) / CURSOR_CLICK_FRAMES));
    }
    if (local >= 0 && local < CURSOR_RIPPLE_FRAMES) ripple = { x: w.x, y: w.y, t: local / CURSOR_RIPPLE_FRAMES };
  }

  // ---- before the first waypoint: hidden, fading in over the 8 frames that end on it
  if (last < 0) {
    const first = waypoints[0];
    const fadeIn = clamp01((frame - (first.frame - CURSOR_FADE_FRAMES)) / CURSOR_FADE_FRAMES);
    return { x: first.x, y: first.y, pressed, hover: undefined, opacity: fadeIn, scale, ripple };
  }

  const prev = waypoints[last];

  // ---- after the last waypoint
  if (last === n - 1) {
    const opacity = prev.hide ? 1 - clamp01((frame - prev.frame) / CURSOR_FADE_FRAMES) : 1;
    return { x: prev.x, y: prev.y, pressed, hover: prev.hover, opacity, scale, ripple };
  }

  const next = waypoints[last + 1];

  // ---- a hidden stretch: fade out at `prev`, fade in at `next`, no travel
  if (prev.hide) {
    const fadeOut = 1 - clamp01((frame - prev.frame) / CURSOR_FADE_FRAMES);
    const fadeIn = clamp01((frame - (next.frame - CURSOR_FADE_FRAMES)) / CURSOR_FADE_FRAMES);
    const comingIn = frame >= next.frame - CURSOR_FADE_FRAMES;
    const at = comingIn ? next : prev;
    return {
      x: at.x,
      y: at.y,
      pressed,
      hover: comingIn ? next.hover : prev.hover,
      opacity: Math.max(fadeOut, fadeIn),
      scale,
      ripple,
    };
  }

  // ---- rest, then travel along the curve so that the cursor arrives exactly on next.frame
  const trip = travelFrames(prev, next);
  const departAt = next.frame - trip;
  if (frame < departAt) {
    return { x: prev.x, y: prev.y, pressed, hover: prev.hover, opacity: 1, scale, ripple };
  }
  const t = clamp01((frame - departAt) / trip);
  const { c1, c2 } = controls(prev, next, last);
  const u = overshoot(t, OVERSHOOT_AMOUNT);
  const p = cubic({ x: prev.x, y: prev.y }, c1, c2, { x: next.x, y: next.y }, u);
  return { x: p.x, y: p.y, pressed, hover: t >= 1 ? next.hover : undefined, opacity: 1, scale, ripple };
}

export interface CursorProps {
  waypoints: readonly CursorWaypoint[];
  /** Arrow height in logical px at zoom 1. Default 26. */
  size?: number;
  /**
   * The camera zoom (getCameraState(...).scale). When given, the arrow is drawn 1/zoom as large so it keeps the same size
   * on screen while the camera zooms in. Omit it to let the arrow zoom with the window.
   */
  zoom?: number;
}

/** The arrow's tip is at (0, 0) of this 16 x 24 box. */
const ARROW_PATH = "M0 0 L0 20.2 L4.9 15.7 L8.1 23 L11.2 21.7 L8 14.5 L14.6 14.5 Z";

/** White arrow + click ripple, in LOGICAL window coordinates. Place it inside <Camera>. */
export const Cursor: React.FC<CursorProps> = ({ waypoints, size = 26, zoom }) => {
  const frame = useCurrentFrame();
  const s = getCursorState(frame, waypoints);
  const k = zoom && zoom > 0 ? 1 / zoom : 1;
  const h = size * k;
  const w = h * (16 / 24);

  const ring = s.ripple
    ? (() => {
        const t = s.ripple.t;
        const r = (6 + (28 - 6) * (1 - Math.pow(1 - t, 2))) * k;
        const o = 0.5 * (1 - t);
        return { r, o };
      })()
    : null;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, pointerEvents: "none", zIndex: 1000 }}>
      {ring && s.ripple ? (
        <div
          style={{
            position: "absolute",
            left: s.ripple.x - ring.r,
            top: s.ripple.y - ring.r,
            width: ring.r * 2,
            height: ring.r * 2,
            borderRadius: "50%",
            border: `${2 * k}px solid ${theme.accent}`,
            background: `radial-gradient(circle, rgba(240,26,73,${0.12 * (1 - s.ripple.t)}), transparent 70%)`,
            opacity: ring.o,
          }}
        />
      ) : null}
      {s.opacity > 0.001 ? (
        <svg
          width={w}
          height={h}
          viewBox="0 0 16 24"
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            overflow: "visible",
            opacity: s.opacity,
            transform: `scale(${s.scale})`,
            transformOrigin: "0 0",
            filter: `drop-shadow(0 ${2 * k}px ${5 * k}px rgba(0,0,0,.55)) drop-shadow(0 ${0.5 * k}px ${1 * k}px rgba(0,0,0,.7))`,
          }}
        >
          <path d={ARROW_PATH} fill="#ffffff" stroke="rgba(10,10,12,.85)" strokeWidth={1.1} strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
};
