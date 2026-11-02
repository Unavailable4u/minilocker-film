// A small glass callout: a chip (layered translucent fill + 1 px border), a thin leader line and a dot that points at something.
//
// - Lives in STAGE space: render it OUTSIDE <Camera>, in the global frame space. startFrame / endFrame are global frames.
// - TARGET. Either a named focus (src/config/focus.ts) or a point, both in LOGICAL window coordinates, together with the same
//   `camera` keyframes that <Camera> uses: the callout maps the target to the stage every frame, so the dot stays on the thing
//   while the camera moves. Without `camera` the target must be a point and is read as STAGE pixels (1920 x 1080).
// - NEVER COVERS ITS TARGET. For a focus the chip sits outside the focus rectangle, `lead` px beyond the edge on `side`
//   (default "top"); the dot sits just inside that edge. If the chip would leave the 96 px safe margin it flips to the opposite
//   side. Frame the shot with enough padding (about 170 px on the callout side) so a chip fits.
// - TEXT: 5 words at most (BIBLE 8); more throws. 22 to 26 px, CMU Serif italic by default, or mono.
// - MOTION: the dot pops in (uiPop spring), the leader draws on, the chip is revealed through a clip that grows from the dot's
//   side (a mask, not a fade). It leaves in the reverse order during the last 10 frames before endFrame.
// - VARIANTS: "note" (neutral), "ok" (blue, with a tick: contained / measured clean), "flag" (vermilion, hatched).

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CameraKeyframe } from "../config/camera";
import { focusRect, type FocusName } from "../config/focus";
import { alpha, fonts, layout, theme, type } from "../config/theme";
import { STAGE } from "../config/timeline";
import { clamp01, signature } from "../lib/ease";
import { spr } from "../lib/spring";
import { getCameraState, worldToStage } from "./Camera";
import { MONO_ADVANCE, SERIF_ADVANCE, checkRange, estimateWidth, inOut } from "./util";

export type CalloutVariant = "note" | "ok" | "flag";
export type CalloutSide = "top" | "bottom" | "left" | "right";

export interface CalloutProps {
  /** 5 words at most. */
  text: string;
  variant?: CalloutVariant;
  /** A named focus, or a point. LOGICAL coordinates when `camera` is given, STAGE pixels otherwise (points only). */
  target: FocusName | { x: number; y: number };
  /** The keyframes of the <Camera> on screen. Required for a named focus. */
  camera?: readonly CameraKeyframe[];
  /** Which side of the target the chip sits on. Default "top". */
  side?: CalloutSide;
  /** Distance in stage px from the target edge (or point) to the chip. Default 72. */
  lead?: number;
  /** For a focus target: where along the chosen edge the dot sits, 0..1. Default 0.5. */
  along?: number;
  /** Use the mono face instead of serif italic. */
  mono?: boolean;
  /** Font size in stage px; clamped to 22..26. Default 24. */
  size?: number;
  startFrame: number;
  /** Global frame at which the callout is gone (it starts leaving 10 frames earlier). */
  endFrame: number;
}

const OUT_FRAMES = 10;
const DOT_R = 5;
const INSET = 12;

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

const OPPOSITE: Record<CalloutSide, CalloutSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/** The chip's box in stage px when its attach point is `c` and it sits on `side`. */
function chipBox(c: { x: number; y: number }, side: CalloutSide, w: number, h: number): Box {
  switch (side) {
    case "top":
      return { l: c.x - w / 2, t: c.y - h, r: c.x + w / 2, b: c.y };
    case "bottom":
      return { l: c.x - w / 2, t: c.y, r: c.x + w / 2, b: c.y + h };
    case "left":
      return { l: c.x - w, t: c.y - h / 2, r: c.x, b: c.y + h / 2 };
    default:
      return { l: c.x, t: c.y - h / 2, r: c.x + w, b: c.y + h / 2 };
  }
}

function insideSafe(b: Box): boolean {
  const m = layout.safeMargin;
  return b.l >= m && b.t >= m && b.r <= STAGE.w - m && b.b <= STAGE.h - m;
}

/** Where the chip attaches for a given side, from the edge point `e` (the point on the target's edge, or the point itself). */
function attach(e: { x: number; y: number }, side: CalloutSide, lead: number): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: e.x, y: e.y - lead };
    case "bottom":
      return { x: e.x, y: e.y + lead };
    case "left":
      return { x: e.x - lead, y: e.y };
    default:
      return { x: e.x + lead, y: e.y };
  }
}

/** Pulls the attach point so the chip stays inside the safe margin along the free axis. */
function clampAttach(c: { x: number; y: number }, side: CalloutSide, w: number, h: number): { x: number; y: number } {
  const m = layout.safeMargin;
  if (side === "top" || side === "bottom") {
    return { x: Math.min(STAGE.w - m - w / 2, Math.max(m + w / 2, c.x)), y: c.y };
  }
  return { x: c.x, y: Math.min(STAGE.h - m - h / 2, Math.max(m + h / 2, c.y)) };
}

const TRANSFORM: Record<CalloutSide, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};

/** clip-path that grows from the side facing the dot. p = 0 hides everything, p = 1 shows it all. */
function clipFor(side: CalloutSide, p: number): string {
  const hide = (1 - clamp01(p)) * 100;
  // the edge of the chip that faces the dot is where the reveal starts
  switch (side) {
    case "top":
      return `inset(${hide}% 0 0 0 round 12px)`;
    case "bottom":
      return `inset(0 0 ${hide}% 0 round 12px)`;
    case "left":
      return `inset(0 0 0 ${hide}% round 12px)`;
    default:
      return `inset(0 ${hide}% 0 0 round 12px)`;
  }
}

const Tick: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ flex: "none" }}>
    <circle cx="10" cy="10" r="9" fill="none" stroke={color} strokeWidth="1.5" opacity=".7" />
    <path d="M5.6 10.4 L8.7 13.4 L14.4 7.3" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Callout: React.FC<CalloutProps> = ({
  text,
  variant = "note",
  target,
  camera,
  side = "top",
  lead = 72,
  along = 0.5,
  mono = false,
  size = 24,
  startFrame,
  endFrame,
}) => {
  checkRange("Callout", startFrame, endFrame);
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 5) throw new Error(`Callout: "${text}" has ${words.length} words; 5 words at most (BIBLE 8)`);
  if (typeof target === "string" && !camera) {
    throw new Error(`Callout: the named focus "${target}" needs the camera keyframes (prop \`camera\`) to find it on the stage`);
  }

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame || frame >= endFrame) return null;

  const fontSize = Math.min(26, Math.max(type.callout - 2, size));
  const chipH = Math.round(fontSize * 1.3 + 22);
  const iconW = variant === "ok" ? fontSize * 0.8 + 8 : 0;
  const chipW = Math.round(estimateWidth(text, fontSize, mono ? MONO_ADVANCE : SERIF_ADVANCE) + 32 + iconW);

  // ---- where is the target on the stage, this frame
  const state = camera ? getCameraState(frame, camera, fps) : null;
  const toStage = (p: { x: number; y: number }): { x: number; y: number } => (state ? worldToStage(state, p) : p);

  // `edge(s)` is the point the leader attaches to for side s; `dot(s)` is where the dot is drawn
  let edge: (s: CalloutSide) => { x: number; y: number };
  let dot: (s: CalloutSide) => { x: number; y: number };
  if (typeof target === "string") {
    const r = focusRect(target);
    const a = toStage({ x: r.x, y: r.y });
    const b = toStage({ x: r.x + r.w, y: r.y + r.h });
    const f = Math.min(1, Math.max(0, along));
    edge = (s) => {
      switch (s) {
        case "top":
          return { x: a.x + (b.x - a.x) * f, y: a.y };
        case "bottom":
          return { x: a.x + (b.x - a.x) * f, y: b.y };
        case "left":
          return { x: a.x, y: a.y + (b.y - a.y) * f };
        default:
          return { x: b.x, y: a.y + (b.y - a.y) * f };
      }
    };
    dot = (s) => {
      const e = edge(s);
      switch (s) {
        case "top":
          return { x: e.x, y: e.y + INSET };
        case "bottom":
          return { x: e.x, y: e.y - INSET };
        case "left":
          return { x: e.x + INSET, y: e.y };
        default:
          return { x: e.x - INSET, y: e.y };
      }
    };
  } else {
    const p = toStage(target);
    edge = () => p;
    dot = () => p;
  }

  // ---- choose the side: the requested one, or the opposite if the chip would leave the safe area
  const fits = (s: CalloutSide): boolean => insideSafe(chipBox(attach(edge(s), s, lead), s, chipW, chipH));
  const useSide: CalloutSide = fits(side) || !fits(OPPOSITE[side]) ? side : OPPOSITE[side];

  const d = dot(useSide);
  const c = clampAttach(attach(edge(useSide), useSide, lead), useSide, chipW, chipH);

  // ---- motion
  const { outP } = inOut(frame, startFrame, endFrame, 1, OUT_FRAMES);
  const exit = 1 - outP;
  const dotScale = Math.max(0, spr(frame, fps, startFrame, "uiPop")) * exit;
  const lineP = signature(clamp01((frame - (startFrame + 2)) / 10)) * exit;
  const chipP = clamp01(spr(frame, fps, startFrame + 6, "uiPop")) * exit;
  const chipScale = 0.94 + 0.06 * Math.min(1.04, Math.max(0, spr(frame, fps, startFrame + 6, "uiPop")));

  const len = Math.hypot(c.x - d.x, c.y - d.y);

  // ---- look
  const tone =
    variant === "ok"
      ? { line: theme.ok, text: theme.okC, border: alpha(theme.okB, 0.55), dot: theme.ok }
      : variant === "flag"
        ? { line: theme.bad, text: theme.ink, border: alpha(theme.bad, 0.6), dot: theme.bad }
        : { line: theme.ink2, text: theme.ink, border: "rgba(255,255,255,.16)", dot: theme.ink };

  const base = "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.03))";
  const fill =
    variant === "ok"
      ? `${base}, linear-gradient(135deg, ${alpha(theme.okA, 0.4)}, ${alpha(theme.okB, 0.14)}), rgba(18,18,22,.74)`
      : variant === "flag"
        ? `${theme.hatchBad}, linear-gradient(180deg, ${alpha(theme.bad, 0.16)}, ${alpha(theme.bad, 0.08)}), rgba(30,16,18,.78)`
        : `${base}, rgba(18,18,22,.72)`;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, pointerEvents: "none" }}>
      <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", left: 0, top: 0 }}>
        {len > 0.5 ? (
          <line
            x1={d.x}
            y1={d.y}
            x2={c.x}
            y2={c.y}
            stroke={tone.line}
            strokeOpacity={0.8}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={len}
            strokeDashoffset={len * (1 - lineP)}
          />
        ) : null}
        <circle cx={d.x} cy={d.y} r={DOT_R * dotScale + 5 * dotScale} fill={tone.dot} opacity={0.18 * dotScale} />
        <circle cx={d.x} cy={d.y} r={DOT_R * dotScale} fill={tone.dot} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: c.x,
          top: c.y,
          transform: TRANSFORM[useSide],
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: chipH,
            padding: "0 16px",
            borderRadius: 12,
            border: `1px solid ${tone.border}`,
            background: fill,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px -12px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.08) inset",
            color: tone.text,
            fontFamily: mono ? fonts.mono : fonts.serif,
            fontStyle: mono ? "normal" : "italic",
            fontWeight: 500,
            fontSize,
            letterSpacing: mono ? "0" : "0.005em",
            whiteSpace: "nowrap",
            clipPath: clipFor(useSide, chipP),
            WebkitClipPath: clipFor(useSide, chipP),
            transform: `scale(${chipScale})`,
            transformOrigin:
              useSide === "top" ? "50% 100%" : useSide === "bottom" ? "50% 0" : useSide === "left" ? "100% 50%" : "0 50%",
          }}
        >
          {variant === "ok" ? <Tick color={theme.okC} size={fontSize * 0.8} /> : null}
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
};
