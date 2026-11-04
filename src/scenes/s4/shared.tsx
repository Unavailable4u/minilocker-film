// S4 shared layout and timing (patch 15a). The three parts of S4a (S4a1, S4a2, S4a3) import this file and never each other's internals, so a retime or a
// reframe is made in ONE place. 15b and 15c resend this file with their own sections added (every addition is marked with its patch number).
//
// WHERE THE FRAMES COME FROM. Every interaction frame of the Attack Lab (tile hovers, the select, the list scroll, Run's hover and press, the step
// frames, the wipe) lives in script.ts `LAB` and is read by filmState.ts to build the app's own screen. Nothing here retypes one: the camera and the
// cursor are computed FROM `LAB`, so a retime in script.ts moves them with it, and the import-time checks in S4a1.tsx throw when the two would disagree.
// What this file owns is only what script.ts does not know: when the camera moves.
//
// SPACE. The Attack Lab is the app, not an explainer: in 15a nothing is drawn in stage space (no scrim, no overlay); the app's own screen shows the
// verdict tiles, the donut and the card list, and the cursor works on it. The first stage-space objects of S4a arrive in 15b (the FileLattice over the
// left half, the SnapshotTimeline along the bottom).
//
// The shots of 15a (all in `attackLabPick`, src/config/focus.ts: window x 0-820, y 75-545):
//   landing   f2112-2154  from S3's pose on the nav (padding 96, zoom 2.56) down to the pick region, as the screen swaps in (script.ts SCREEN_CHANGES,
//                         swapAt f2112, cross-fade 8 f). The underline's slide (f2100-2124) is on the nav, where S3 left the camera, until the move starts.
//   push      f2154-2216  a slow 5 % push on the same region while the cursor sweeps the tiles, picks the hero and the list scrolls under it.
// Hand-off to 15b: its first camera keyframe starts at f2220 or later (this part ends on `attackLabPick`, padding 48, bias 1.05, arrived f2216);
// its first cursor waypoint is the click on Run at LAB.pressAt (f2220), at the position this part's last waypoint (f2216) already rests on.
import { SCREEN_CHANGES, LAB } from "../../config/script";
import { SCENES } from "../../config/timeline";

/** The attack screen's entry in SCREEN_CHANGES (the underline slides to "Attack Lab" from `frame`, the screens swap at `swapAt`). */
const LAB_SCREEN = SCREEN_CHANGES.find((c) => c.to === "attackLab");

/** Empty stage margin round `attackLabPick`: with the region's 820 x 470 it gives zoom 2.09, height-limited (the tiles are 34 px, 71 px on the stage). */
export const S4_PICK_PADDING = 48;

const LANDING_FROM = LAB_SCREEN ? LAB_SCREEN.swapAt : 2112;
const LANDING_FRAMES = 42;

export const S4_TIMING = {
  /** The first frame of S4 (S3 ends on f2099 with the camera on the nav). */
  sceneStart: SCENES.S4.start,
  /**
   * 15a: the camera leaves the nav on the frame the screens swap and arrives 42 frames later (f2154), 12 frames before the first tile hover: it lands, it
   * does not arrive while the cursor is already working. A signature move, like every other hand-over of the film.
   */
  landing: { from: LANDING_FROM, frames: LANDING_FRAMES },
  /** 15a: the push that follows, a 5 % bias on the same region; it starts as the landing arrives and arrives on LAB.listScrollTo (f2216), as the card has come to rest. */
  push: { from: LANDING_FROM + LANDING_FRAMES, frames: LAB.listScrollTo - (LANDING_FROM + LANDING_FRAMES), bias: 1.05 },
  /** 15a: the cursor appears (fades in over the 8 frames that end here) right of the tiles, 28 frames before the first hover; it is the first waypoint. */
  cursorEnter: 2138,
  /** The last frame 15a draws on. 15b's first camera keyframe and first overlay item start at f2220 or later (LAB.pressAt). */
  partEndA1: 2219,
} as const;

/** Where the cursor appears (window px): over the detail pane, right of the tiles' row (tiles end at x 771), at the height of the first card. */
export const S4_CURSOR_ENTER = { x: 800, y: 320 } as const;

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S4_TIMING;
  if (!LAB_SCREEN) throw new Error('S4: SCREEN_CHANGES has no entry for "attackLab" (script.ts): the landing is timed from its swapAt');
  if (!(t.sceneStart === LAB_SCREEN.frame)) throw new Error(`S4: the Attack Lab's underline slide starts on f${LAB_SCREEN.frame}, the scene on f${t.sceneStart}: S4 starts with that slide`);
  if (!(t.landing.from >= t.sceneStart)) throw new Error("S4: the landing cannot start before the scene (S3 owns the camera until f2099)");
  const landed = t.landing.from + t.landing.frames;
  if (!(landed <= LAB.tileHovers[0].from)) throw new Error(`S4: the camera must have landed (f${landed}) by the first tile hover (f${LAB.tileHovers[0].from})`);
  if (!(t.push.from >= landed)) throw new Error("S4: the push cannot start before the landing has arrived");
  if (!(t.push.from + t.push.frames <= t.partEndA1)) throw new Error("S4: the push must have arrived by the end of 15a");
  if (!(t.cursorEnter >= t.sceneStart + 8)) throw new Error("S4: the cursor fades in over 8 frames: its first waypoint must be at f2108 or later");
  if (!(t.cursorEnter < LAB.tileHovers[0].from)) throw new Error("S4: the cursor must appear before the first tile hover");
  if (!(t.partEndA1 < LAB.pressAt)) throw new Error("S4: 15a must end before the click on Run (LAB.pressAt): the click is 15b's first cursor waypoint");
})();
