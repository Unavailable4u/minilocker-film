// The app's `rise` entrance (index.css: opacity 0 -> 1 and translateY 8 px -> 0, .5 s) as a pure function of the frame.
// The film plays it faster and a little deeper so a new row reads at video speed: 14 px over 8 frames, same curve
// (cubic-bezier(.2, .7, .2, 1)). No CSS animation: a component takes the 0..1 progress as a prop and applies riseStyle().
import type React from "react";
import { Easing } from "remotion";
import { clamp01 } from "./ease";

/** Length of one entrance, in frames. */
export const RISE_FRAMES = 8;
/** How far a row travels, in px. */
export const RISE_PX = 14;

const riseEase = Easing.bezier(0.2, 0.7, 0.2, 1);

/** 0..1 for a frame: 0 before `startFrame`, 1 from `startFrame + duration` on. */
export function riseProgress(frame: number, startFrame: number, duration: number = RISE_FRAMES): number {
  if (!(duration > 0)) return frame >= startFrame ? 1 : 0;
  return riseEase(clamp01((frame - startFrame) / duration));
}

/** The style of an element at progress `p` (empty at 1, so a settled row carries no transform and no stacking context). */
export function riseStyle(p: number, px: number = RISE_PX): React.CSSProperties {
  const v = clamp01(p);
  return v >= 1 ? {} : { opacity: v, transform: `translateY(${((1 - v) * px).toFixed(2)}px)` };
}
