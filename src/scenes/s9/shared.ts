// S9 Outro (f4980-5099): the CONTRACT shared by patches 21a and 21b. Written once by the split ("21-0").
// 21a and 21b NEVER edit this file. If a part needs another constant, it defines it locally and says so in PATCH_NOTES.
//
// The end card (what the last 30 frames show, f5070-5099), top to bottom, all centred on the stage:
//   the Mark (static, full)  ->  "MiniLocker"  ->  tagline  ->  hairline  ->  demo host  ->  repo URL  ->  "MIT licensed" + "Built on Vultr" + logo
//   21a owns everything down to and including the tagline (and the dial that collapses into the Mark).
//   21b owns the hairline and everything below it.
import { clamp01, signature } from "../../lib/ease";
import { STAGE } from "../../config/timeline";

export const S9_START = 4980;
export const S9_END = 5099;

/** Every frame of S9 that more than one part needs (GLOBAL frames). All reveals land on a beat (multiples of 15). */
export const S9_TIMING = {
  /** 21a. The app window fades out (stageState.appReveal, contract-owned) and the grid paper fades in (gridOpacity, f4980-5000). */
  appClear: { start: 4980, end: 5004 },
  /** 21a. The dial reforms on the cleared stage: its five arcs sweep in; fully formed ON the beat f4995. */
  reform: { start: 4980, end: 4995 },
  /** 21a. The dial collapses into the Mark (reverse of S1): arcs drain outermost first, the Mark's rings close; complete and punched ON the beat f5010. */
  collapse: { start: 4995, end: 5010 },
  /** 21a. "MiniLocker" rises on the beat f5010 (masked rise, 22 f). */
  lockup: 5010,
  /** 21a. The tagline (copy.s9.line) starts on the beat f5025 (also CUES.s9.line). */
  tagline: 5025,
  /** 21b. The hairline draws f5040-5052, the demo host reveals from f5040. */
  demo: 5040,
  /** 21b. The repo row starts on the beat f5055. */
  repo: 5055,
  /** 21b. The legal row ("MIT licensed", "Built on Vultr", the logo) starts 2 frames after the repo row. */
  legal: 5057,
  /** 21b. Frames one quiet-block row takes to reveal. */
  revealFrames: 12,
  /** 21b. Everything of the quiet block is settled from this frame. */
  settled: 5069,
  /** The clean hold: from this frame to the last NOTHING appears or moves except the Mark's breathing glow and the camera's push. */
  hold: 5070,
} as const;

const CX = STAGE.w / 2;

/** Stage geometry of the end card (stage px, 1920 x 1080; safe margin 96). `top` is the top edge, `h` the row's height. */
export const S9_LAYOUT = {
  cx: CX,
  /** The Mark, centred at (cx, cy). 21a. */
  mark: { cy: 262, size: 300 },
  /** The dial that collapses into the Mark, same centre as the Mark (its outer ticks stay inside the safe margin: 262 - 157 = 105). 21a. */
  dial: { cy: 262, size: 320 },
  /** "MiniLocker", CMU Serif 700, one line. 21a. */
  title: { top: 438, h: 130, fontSize: 124 },
  /** copy.s9.line, CMU Serif, ink-2, ONE line. 21a. */
  tagline: { top: 596, h: 56, fontSize: 44 },
  /** 21b. A 2 px hairline, 240 px wide, centred. */
  rule: { y: 700, w: 240 },
  /** 21b. The demo host: CMU Typewriter, 40 px, ink. */
  demo: { top: 744, h: 52, fontSize: 40 },
  /** 21b. The repo URL (copy.urls.repo, as written): CMU Typewriter, 30 px, ink-2. */
  repo: { top: 812, h: 40, fontSize: 30 },
  /** 21b. "MIT licensed" . "Built on Vultr" + VultrLogo (height 40): CMU Serif, 30 px, ink-3, on one line. */
  legal: { top: 896, h: 48, fontSize: 30, logoHeight: 40 },
  /** Nothing of S9 is drawn below this y or outside [safeX, STAGE.w - safeX]. */
  bottom: 984,
  safeX: 96,
} as const;

/** 0..1 signature ramp between two global frames. */
export const s9Ramp = (frame: number, a: number, b: number): number => signature(clamp01((frame - a) / (b - a)));

/** Frames of the Mark's glow cycle: very slow (4 s). */
export const S9_BREATH_FRAMES = 120;

/**
 * The breathing of the Mark's glow, as a multiplier around 1 (0.88 .. 1.12). Starts at 1 on the lockup beat and its amplitude is
 * fully in 30 frames later, so nothing pops. 21a multiplies its glow (box-shadow strength, wash opacity) by it from f5010 on.
 * It is the ONLY thing besides the camera that moves in the clean hold.
 */
export function s9Breath(frame: number): number {
  const t = frame - S9_TIMING.lockup;
  if (t <= 0) return 1;
  const amp = 0.12 * s9Ramp(frame, S9_TIMING.lockup, S9_TIMING.lockup + 30);
  return 1 + amp * Math.sin((2 * Math.PI * t) / S9_BREATH_FRAMES);
}

/** True when `frame` is a multiple of 15 (a beat). Part files call it in their import-time checks. */
export const onBeat = (frame: number): boolean => frame % 15 === 0;
