// A notification toast, like the app's own: a small card that slides in from the top-right corner of the stage, holds, and leaves.
//
// - STAGE space: render it OUTSIDE <Camera>, in the global frame space. startFrame / endFrame are global frames.
// - Motion: the card slides in with the panel spring and is clipped by the stage edge (a mask, not a fade); it leaves the same
//   way during the last 10 frames before endFrame.
// - `tone` is a STATUS and means status only: "ok" (contained), "bad" (flagged / denied, hatched), "warn" (needs a human,
//   decoy read), "info" (neutral).
// - The text is whatever the scene passes in; measured values must come from src/data/select.ts (evidence rule).

import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, fonts, layout, theme } from "../config/theme";
import { STAGE } from "../config/timeline";
import { signature, clamp01 } from "../lib/ease";
import { spr } from "../lib/spring";
import { checkRange } from "./util";

export type ToastTone = "ok" | "bad" | "warn" | "info";

export interface ToastProps {
  /** Small-caps title, for example "decoy read". */
  title: string;
  /** One line of detail (mono). */
  text?: string;
  tone?: ToastTone;
  startFrame: number;
  /** Global frame at which the toast is gone. */
  endFrame: number;
  /** Corner anchor. Default "tr" (top right). */
  corner?: "tr" | "tl" | "br" | "bl";
  /** Card width in stage px. Default 520. */
  width?: number;
}

const OUT_FRAMES = 10;

const TONES: Record<ToastTone, { c: string; wash: string }> = {
  ok: { c: theme.ok, wash: theme.okWash },
  bad: { c: theme.bad, wash: theme.badWash },
  warn: { c: theme.warn, wash: theme.warnWash },
  info: { c: theme.info, wash: theme.infoWash },
};

export const Toast: React.FC<ToastProps> = ({ title, text, tone = "info", startFrame, endFrame, corner = "tr", width = 520 }) => {
  checkRange("Toast", startFrame, endFrame);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame || frame >= endFrame) return null;

  const t = TONES[tone];
  const inP = Math.min(1.02, spr(frame, fps, startFrame, "panel"));
  const outP = signature(clamp01((frame - (endFrame - OUT_FRAMES)) / OUT_FRAMES));
  const travel = width + layout.safeMargin; // far enough to be fully off stage
  const dir = corner === "tr" || corner === "br" ? 1 : -1;
  const x = dir * travel * ((1 - inP) + outP);

  const top = corner === "tr" || corner === "tl";
  const edge = layout.safeMargin;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: STAGE.w,
        height: STAGE.h,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          ...(corner === "tr" || corner === "br" ? { right: edge } : { left: edge }),
          ...(top ? { top: edge } : { bottom: edge }),
          width,
          transform: `translateX(${x}px)`,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            padding: "16px 20px",
            borderRadius: 14,
            border: `1px solid ${alpha(t.c, 0.5)}`,
            background: `${tone === "bad" ? `${theme.hatchBad}, ` : ""}linear-gradient(180deg, ${alpha(t.c, 0.1)}, transparent), ${t.wash}`,
            boxShadow: "0 24px 50px -22px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.06) inset",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 5, background: t.c, marginTop: 9, flex: "none", boxShadow: `0 0 12px ${alpha(t.c, 0.6)}` }} />
          <div style={{ minWidth: 0 }}>
            <div className="smcp" style={{ fontFamily: fonts.serif, fontSize: 24, color: t.c, lineHeight: 1.2 }}>
              {title}
            </div>
            {text ? (
              <div style={{ fontFamily: fonts.mono, fontSize: 22, color: theme.ink, lineHeight: 1.35, marginTop: 4, wordBreak: "break-word" }}>{text}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
