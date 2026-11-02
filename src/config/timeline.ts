// MiniLocker film: every timing in one place. Frames at 30 fps, 120 BPM.
// All other files import from here; nothing else types a frame number for structure.

export const FPS = 30;
export const BEAT = 15; // 120 BPM: one beat = 0.5 s
export const BAR = 60; // 4 beats
export const TOTAL = 5100; // 170 s = 2:50, 85 bars

/** seconds to frames (rounded). */
export const sec = (s: number): number => Math.round(s * FPS);
/** n beats to frames. */
export const beat = (n: number): number => n * BEAT;
/** n bars to frames. */
export const bar = (n: number): number => n * BAR;
/** identity: marks a literal frame number so it reads as a frame at the call site. */
export const f = (n: number): number => n;

/** The app UI is designed at this logical size and centered on the stage; the virtual camera does all zooming. */
export const LOGICAL = { w: 1600, h: 900 } as const;
/** The film frame. */
export const STAGE = { w: 1920, h: 1080 } as const;

export type SceneKey = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";

export interface SceneRange {
  id: SceneKey;
  name: string;
  /** first frame (inclusive) */
  start: number;
  /** last frame (inclusive) */
  end: number;
  /** number of frames, end - start + 1 */
  duration: number;
}

function scene(id: SceneKey, name: string, start: number, end: number): SceneRange {
  return { id, name, start, end, duration: end - start + 1 };
}

export const SCENES: Record<SceneKey, SceneRange> = {
  S0: scene("S0", "Hook", 0, 299),
  S1: scene("S1", "Title", 300, 599),
  S2: scene("S2", "Work", 600, 1499),
  S3: scene("S3", "Decoys", 1500, 2099),
  S4: scene("S4", "Rewind", 2100, 3299),
  S5: scene("S5", "Page", 3300, 3719),
  S6: scene("S6", "Evidence", 3720, 4259),
  S7: scene("S7", "Value", 4260, 4559),
  S8: scene("S8", "Vultr", 4560, 4979),
  S9: scene("S9", "Outro", 4980, 5099),
};

export const SCENE_ORDER: readonly SceneKey[] = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];

/** The scene a global frame belongs to. Frames outside 0..TOTAL-1 clamp to S0 / S9. */
export function sceneAt(frame: number): SceneRange {
  const fr = Math.min(TOTAL - 1, Math.max(0, Math.floor(frame)));
  for (const key of SCENE_ORDER) {
    const s = SCENES[key];
    if (fr >= s.start && fr <= s.end) return s;
  }
  return SCENES.S9;
}

/** Frames where scene cuts, reveals, big camera moves and impacts land (BIBLE 5). Each is a beat. */
export const CUT_FRAMES: readonly number[] = [
  60, 180, 300, 420, 600, 1500, 2100, 2340, 2400, 3300, 3720, 4260, 4560, 4980,
];

/**
 * Nominal start frames of each caption, callout, badge and line (BIBLE 8).
 * Keys mirror `copy` in copy.ts. Scene patches may nudge a cue by a few frames to land on a beat.
 */
export const CUES = {
  s0: { caption: 180 },
  s1: { lockup: 420 },
  s2: { badge: 600, caption: 660, calloutCheck: 1200, calloutAudit: 1260, captionSteps: 1440 },
  s3: {
    caption: 1500,
    calloutRandom: 1620,
    calloutAlarm: 1700,
    captionPhoneHome: 1800,
    calloutAllowlist: 1840,
    captionBait: 1930,
  },
  s4: { captionWorks: 2220, captionGone: 2370, captionRewind: 2400, calloutUndone: 2900, captionReal: 3060 },
  s5: { badge: 3300, captionHijack: 3360, captionFlagged: 3480, captionHuman: 3600 },
  s6: { caption: 3720, calloutNotMeasured: 3880, captionMeasured: 4120 },
  s7: { line: 4260, caption: 4500 },
  s8: { lowerThirdsStart: 4650, lowerThirdsEnd: 4770, caption: 4900 },
  s9: { line: 5025 },
} as const;
