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
//
// 15b (f2220-2299) adds the first stage-space objects of S4a: the persistent STAGE (a backing panel with the FileLattice, and the SnapshotTimeline rail
// along the bottom), drawn by S4Stage.tsx from the pure functions at the end of this file. Every addition below is marked "15b".
//   open      f2226-2250  the camera opens from `attackLabPick` (zoom 2.09) to `attackSteps` (zoom 1.19) on the beat f2250: the pane's step column is in
//                         the RIGHT half of the stage, the left half is free for the lattice. Then a 2 % push to f2299.
//   stage     f2240-2280  the panel fades in (f2240), the lattice builds (f2250-2280), the rail draws on (f2262-2280), snapshot node 1 lands on the beat f2280.
//   Hand-off to 15c: its first camera keyframe starts at f2300 or later (this part ends on `attackSteps`, padding 96, bias 1.02, arrived f2299); the
//   stage keeps drawing after f2299 (lattice intact) until 15c shatters it and patch 16 retires it.
//
// 15c (f2300-2399) extends the SAME stage (every addition below is marked "15c"): the wipe command types large in the blank band over the lattice
// (f2304-2336), THE WIPE lands on f2340 (the shards fly, the lattice drains to 30 %, a 3 % punch with a seeded shake that the stage shares with the camera),
// and on f2370 the real output of the wipe slams in huge, vermilion, in the empty lattice's place, in TOTAL SILENCE until f2399 (`S4_CUE_ANCHORS`).
//   Hand-off to patch 16 (S4b, f2400): this part ends on `attackSteps`, padding 96, bias 1.03 (arrived f2398); the stage keeps drawing the empty slots with
//   the huge token until patch 16 takes them over (the rewind: the pulse, the ghost container, the shards' return).
//
// 16a (f2400-2459) opens S4b ("Rewind.") and extends the SAME stage again (every addition below is marked "16a"): the slab of the wipe's output and the dimmed command
// retire (f2400-2413), snapshot 2, the work the rewind will throw away, lands greyed (f2406), a pulse leaves snapshot 1 on the beat f2415 for the fresh sandbox, the
// GhostContainer draws on round the empty lattice (f2421-2444, complete on the beat f2445), and the blue "rewound" node lands (f2437-2458).
//   Hand-off to 16b (f2460): this part ends on `attackSteps`, padding 96, bias 1.04 (arrived f2459); the stage keeps drawing the empty slots inside the ghost
//   container (the footnote is off for f2400-2459 and 16b brings it back), the greyed node and the rewound node. 16b fills `reassemble` in `s4LatticeState`.
//
// 16b (f2460-2579) is the return (every addition below is marked "16b"): the shards come back INTO the fresh sandbox with FileLattice's 4 % overshoot
// (f2460-2505, the colour comes back with them), then the HashTile of the restored snapshot appears in the free stage space under the steps column, its
// restored hash locks left to right against the snapshot's (f2528-2549), ONE tick pops on the beat f2550, and the counter "N file(s) re-hashed - all matched"
// rises beside it (f2552). The tile, the counter and the full hash are S4b2's own objects (S4b2.tsx); the lattice's return is the stage's (`s4LatticeState`).
//   Hand-off to 16c (f2580): this part ends on `attackSteps`, padding 96, bias 1.05 (arrived f2579); the lattice is whole and in colour inside the container,
//   the tile, the counter and the hash stay up until 16c steps them aside (`s4HashOpacity`, f2584) to leave their strip to the cat.
//
// 16c (f2580-2699) is the cat (every addition below is marked "16c"): the HashTile and the counter step aside (f2584-2593) and leave their strip, right of the
// panel, to the REAL cat: the command (`cat /workspace/precious.txt`) types (f2596-2607) and the restored file's first line prints under it (f2610-2639, complete on
// the beat f2640). It is drawn here, in stage space, because the app's own cat row is clipped below the window at `attackSteps` and cannot be shown there. Then
// the stage retires (f2655-2668: the panel, the lattice, the container, the rail, the nodes, the cat) while the camera moves from the steps to the detail pane
// (`attackDetail`, f2655-2684, arrives on the beat f2685), so the checks that start on f2700 are on the app's own screen.
//   Hand-off to 16d (f2700): this part ends on `attackDetail`, padding 96, bias 1, arrived f2684; the stage is GONE (nothing is drawn in stage space from f2669),
//   the cursor is still hidden, and the app's detail pane is scrolling (script.ts `LAB.detailScroll`) towards the checks. 16d's first camera keyframe, cursor
//   waypoint and overlay item start at f2700 or later.
//
// 16d (f2700-2819) is the checks (every addition below is marked "16d"): nothing is drawn in stage space, the app draws the screen from `LAB` (script.ts): the eight REAL
// checks light at f2700, 2710, ... 2770 (`LAB.checksFrom`, `checkEvery`), the verdict banner stamps in at f2780 (`LAB.stampAt`) while the hero's tile turns blue and
// the donut goes from 0 to 1 of 15. The part is camera and scroll: the camera pushes to the checks (`attackChecks`, f2700-2729), drifts (f2730-2763), sweeps to the
// verdict (`attackVerdict`, f2764-2779: the pane scrolls back to the top as it goes, `LAB.detailScroll` f2768-2780) and settles for the stamp, then pushes slowly (f2780-2818).
//   Hand-off to 16e (f2820): this part ends on `attackVerdict`, padding 96, bias 1.03 (arrived f2818); the stamp is down and the donut is full (f2800); the pane is at
//   scroll 0; the cursor is hidden. 16e's first camera keyframe, cursor waypoint and overlay item start at f2820 or later.
//
// 16e (f2820-3029) is the chain (every addition below is marked "16e"): a scrim dims the Attack Lab (f2820-2831), the HashChain of the attack's real ledger events builds
// (f2836-2895; the delete block is vermilion, hatched and pulsing), the callout "Undone, not erased." lands on f2900, a "Verify ledger now" button is pressed (f2946) and the
// verification sweeps the chain (f2950-2994) and ends on the seal and the real line "intact - 29 events - head 0589fc3d" (the sample's), which holds to f3029.
//   Hand-off to 16f (f3030): the scrim, the chain, the seal and its line are all still drawn on f3029, at full strength; the camera is on `attackVerdict`, padding 96, bias 1.06
//   (arrived f3029); the cursor is hidden. 16f makes the ledger layer leave by editing ONE function, `s4LedgerOpacity` (it returns 1 now), and starts its camera, cursor
//   waypoints and overlay items on f3030 or later.
//
// 16f (f3030-3299) is the proof (every addition below is marked "16f"): the ledger layer leaves (`s4LedgerOpacity`, f3030-3041) while S4b6's own scrim, mounted UNDER it, takes
// over by exactly the compensating amount (`s4ProofScrim`: the Lab behind stays dimmed to 95 %), the proof group (a window and three numerals) rises f3030-3059 and pushes in
// 4 % to f3285 (`s4ProofPush`), the clip (or the replay of the ledger's steps) plays from the caption's beat f3060, the numerals count on f3075, f3105 and f3135, the group
// leaves f3285-3292 and the scrim f3285-3298, so the app is bright and whole on f3299 and the stage is empty. The camera creeps out to `fullWindow` (S4b6.tsx).
//   Hand-off to S5 (f3300): the camera is on `fullWindow`, padding 60, bias 1 (arrived f3299); nothing is drawn in stage space from f3299.
import { WINDOW } from "../../config/focus"; // 15b
import { layout } from "../../config/theme"; // 15b
import { PROOF, SCREEN_CHANGES, LAB } from "../../config/script"; // 16f: PROOF
import { BEAT, CUES, SCENES, STAGE } from "../../config/timeline"; // 15b: BEAT, CUES; 16c: STAGE
import { SHATTER_FRAMES, latticeSize } from "../../gfx/FileLattice"; // 15b, 15c: SHATTER_FRAMES
import { GHOST_DRAW_FRAMES } from "../../gfx/GhostContainer"; // 16a
import { hashTileSize } from "../../gfx/HashTile"; // 16b
import { MONO_ADVANCE } from "../../fx/util"; // 15c
import { getCameraState } from "../../fx/Camera"; // 15c
import { kf } from "../../config/camera"; // 15c
import { TL_X0, TL_X1, TL_Y, timelineNodeX } from "../../gfx/SnapshotTimeline"; // 15b
import { clamp01, signature } from "../../lib/ease"; // 15b
import { LAB_LIST_W } from "../../ui/AttackLabScreen"; // 15b
import { rem, sp } from "../../ui/primitives"; // 15b

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

  // ---------------------------------------------------------------- 15b (f2220-2299)
  /**
   * 15b: the camera opens from the pick to the steps. It starts 6 frames after the click (the ripple is still playing, the app's busy ring has just
   * started) and takes 24 frames, so it ARRIVES on the beat f2250. A signature move, like every other hand-over of the film.
   */
  open: { from: LAB.pressAt + 6, frames: 24 },
  /** 15b: the slow push that follows, a 2 % bias on the same region; it arrives on the last frame of the part. */
  settle: { from: LAB.pressAt + 6 + 24, frames: 2299 - (LAB.pressAt + 6 + 24), bias: 1.02 },
  /** 15b: the backing panel fades in over the camera's last 10 frames; the stage is up from here. */
  panel: { from: 2240, frames: 12 },
  /** 15b: the FileLattice builds in (its own stagger: 24 tiles and the hero, a few frames apart) from the camera's arrival to the beat f2280. */
  lattice: { from: 2250, frames: 30 },
  /** 15b: the rail of the SnapshotTimeline draws on, finishing as the node lands. */
  rail: { from: 2262, frames: 18 },
  /** 15b: snapshot node 1 lands on a beat, with the first 8 hex of the real hash (its label reveals over the node's second half). */
  node: { at: 2280, frames: 14 },
  /** 15b: "The agent works. Snapshot after every step." (CUES.s4.captionWorks): it leaves (rising) over its last 12 frames, so it is gone by f2296. */
  caption: { start: CUES.s4.captionWorks, end: 2296 },
  /** 15b: the last frame 15b draws on. 15c's first camera keyframe, cursor waypoint and overlay item start at f2300 or later (LAB.stepAt.wipe). */
  partEndA2: 2299,

  // ---------------------------------------------------------------- 15c (f2300-2399)
  /** 15c: the command's line (rule + text) appears; the first item of 15c, on the frame after 15b's last. */
  cmdIn: { from: 2300, frames: 4 },
  /** 15c: the real wipe command types (linear, about 2.4 characters a frame) and is complete 4 frames before the wipe. */
  type: { from: 2304, frames: 32 },
  /** 15c: THE WIPE (script.ts LAB.wipeLandsAt, a beat): the shards fly for SHATTER_FRAMES, ending on the frame the silence starts. */
  wipe: { at: LAB.wipeLandsAt },
  shatter: { from: LAB.wipeLandsAt, frames: SHATTER_FRAMES },
  /** 15c: the lattice drains to `amount` (BIBLE: 30 %) over `frames`. */
  desat: { from: LAB.wipeLandsAt, frames: 12, amount: 0.3 },
  /** 15c: the command stays above as the cause, dimmed to `to` over `frames`. */
  dim: { from: LAB.wipeLandsAt, frames: 16, to: 0.35 },
  /** 15c: the punch: `extra` (3 %) on top of 15b's settled bias, in `frames`, with a seeded shake of `shake` stage px that the stage shares. Then `relax`. */
  punch: { at: LAB.wipeLandsAt, frames: 6, extra: 1.03, shake: 12 },
  /** 15c: after the punch the camera eases to `bias` and arrives on f2398 (patch 16's first keyframe starts at f2400 or later). */
  relax: { from: LAB.wipeLandsAt + 6, frames: 52, bias: 1.03 },
  /** 15c: the real output of the wipe slams in (CUES.s4.captionGone): opacity in 4 frames, scale from 1.1 in `frames`. */
  token: { at: CUES.s4.captionGone, frames: 10 },
  /** 15c: TOTAL SILENCE, inclusive (BIBLE: f2370-2399): no SFX, music ducked to nothing. Patch 22 reads it from `S4_CUE_ANCHORS`. */
  silence: { from: CUES.s4.captionGone, to: 2399 },
  /** 15c: "Everything gone." (CUES.s4.captionGone); it leaves over its last 12 frames and is gone when patch 16's "Rewind." (CUES.s4.captionRewind) starts. */
  captionGone: { start: CUES.s4.captionGone, end: CUES.s4.captionRewind },
  /** 15c: the last frame 15c draws on. Patch 16's first camera keyframe, cursor waypoint and overlay item start at f2400 or later. */
  partEndA3: 2399,

  // ---------------------------------------------------------------- 16a (f2400-2459)
  /** 16a: "Rewind." (CUES.s4.captionRewind) until f2456: it leaves over its last 12 frames, so it is gone before 16b's first frame (f2460). */
  captionRewind: { start: CUES.s4.captionRewind, end: 2456 },
  /** 16a: the slab with the wipe's output and the command (both already dimmed) leave: the empty slots under them are what the fresh sandbox is drawn round. */
  retire: { from: 2400, frames: 14 },
  /** 16a: the snapshots the rewind throws away land greyed on the rail, one after the other (`stagger` frames apart), each in `frames` (the first from f2406). */
  discarded: { from: 2406, frames: 14, stagger: 6 },
  /** 16a: the pulse leaves snapshot 1 on a beat and reaches the container in `frames` (f2437). */
  pulse: { from: 2415, frames: 22 },
  /** 16a: the GhostContainer draws on (BIBLE 11 B: GHOST_DRAW_FRAMES = 24 frames), complete on the beat f2445. */
  ghost: { from: 2421, frames: GHOST_DRAW_FRAMES },
  /** 16a: the blue "rewound" node: its arc leaves as the pulse arrives (f2437), the node itself lands from f2447 (SnapshotTimeline: after 45 % of `frames`), complete f2459. */
  rewound: { at: 2437, frames: 22 },
  /** 16a: a slow push, 3 % more than 15c's bias (1.03 -> 1.04), arriving on the last frame of the part. */
  rewindPush: { from: 2400, frames: 59, bias: 1.04 },
  /** 16a: the last frame 16a draws on. 16b's first camera keyframe, cursor waypoint and overlay item start at f2460 or later. */
  partEndB1: 2459,

  // ---------------------------------------------------------------- 16b (f2460-2579)
  /** 16b: the shards return into the container (FileLattice `reassemble`, linear 0..1; its own stagger and 4 % overshoot): the lattice is whole on the beat f2505. */
  reassemble: { from: 2460, frames: 45 },
  /** 16b: the HashTile appears (the snapshot's hash on top, the restored row still empty) once the lattice is whole. */
  hashReveal: { from: 2510, frames: 10 },
  /** 16b: the restored hash locks left to right (BIBLE: 20-24 frames a tile; one real tile here) and is locked on the beat f2550. */
  hashLock: { from: 2528, frames: 22 },
  /** 16b: the tick pops on the beat f2550 (patch 22's tick). */
  hashTick: { from: 2550, frames: 12 },
  /** 16b: the counter ("N file(s) re-hashed - all matched") and the full hash rise beside the tile. */
  counter: { from: 2552, frames: 12 },
  /** 16b: a slow push, 1 % more than 16a's (1.04 -> 1.05, the peak of 15c's punch), arriving on the last frame of the part. */
  returnPush: { from: 2460, frames: 119, bias: 1.05 },
  /** 16b: the last frame 16b draws on. 16c's first camera keyframe, cursor waypoint and overlay item start at f2580 or later. */
  partEndB2: 2579,

  // ---------------------------------------------------------------- 16c (f2580-2699)
  /** 16c: the HashTile and the counter step aside (a fade with a 10 px drop), after the counter has been up for 20 frames: they leave the strip to the cat. */
  hashOut: { from: 2584, frames: 10 },
  /** 16c: the cat command's line (rule + text) appears and the command types (linear): it is the strip's first item, after the tile has gone. */
  catCmd: { from: 2596, frames: 12 },
  /** 16c: the restored file's first line prints (linear, about 1.5 characters a frame) and is complete on the beat f2640. */
  catLine: { from: 2610, frames: 30 },
  /** 16c: the camera moves from the steps to the detail pane; it starts after the line is complete (held 15 frames) and ARRIVES on the beat f2685, 15 frames before the checks. */
  detailMove: { from: 2655, frames: 30 },
  /** 16c: the stage retires (panel, lattice, container, rail, nodes, the cat) as the camera starts to move; nothing is drawn in stage space from f2669. */
  stageOut: { from: 2655, frames: 14 },
  /** 16c: the last frame 16c draws on. 16d's first camera keyframe, cursor waypoint and overlay item start at f2700 or later (LAB.checksFrom). */
  partEndB3: 2699,

  // ---------------------------------------------------------------- 16d (f2700-2819)
  /** 16d: the camera moves from the detail pane to the checks, on the frame the first check lights; it ARRIVES on the beat f2730. */
  checksMove: { from: 2700, frames: 30 },
  /** 16d: the camera drifts in on the checks while rows 4-8 light (bias 1 -> 1.02), until the sweep to the verdict starts. */
  checksDrift: { from: 2730, frames: 34, bias: 1.02 },
  /** 16d: the sweep to the verdict, with the pane scrolling back to the top (`LAB.detailScroll` f2768-2780); it ARRIVES on the stamp (`LAB.stampAt`, f2780). */
  verdictMove: { from: 2764, frames: 16 },
  /** 16d: the slow push on the verdict until the end of the part (bias 1 -> 1.03). */
  verdictPush: { from: 2780, frames: 39, bias: 1.03 },
  /** 16d: the last frame 16d draws on. 16e's first camera keyframe, cursor waypoint and overlay item start at f2820 or later. */
  partEndB4: 2819,

  // ---------------------------------------------------------------- 16e (f2820-3029)
  /** 16e: the scrim that dims the Attack Lab behind the chain (to `scrimAlpha`), signature. */
  scrim: { from: 2820, frames: 12, alpha: 0.95 },
  /** 16e: the chain builds, ONE linear 0..1 for all its blocks (7 blocks, about 8.5 frames each); the delete block pulses from here. Complete on the beat f2895. */
  chain: { from: 2835, frames: 60 },
  /** 16e: the callout "Undone, not erased." (BIBLE: f2900). It leaves 10 frames before `to`, while the verification is still sweeping. */
  callout: { from: 2900, to: 2990 },
  /** 16e: the "Verify ledger now" button appears (an 8 frame fade). */
  buttonIn: { from: 2924, frames: 8 },
  /** 16e: the press on the button (a 4 frame squeeze and a ripple of 14 frames). */
  press: { at: 2946, frames: 4 },
  /** 16e: the verification sweeps the chain (linear, the HashChain's `verifyProgress`); the seal draws in its last 12%, so it is complete on f2995. */
  verify: { from: 2950, frames: 45 },
  /** 16e: the camera drifts in behind the scrim (bias 1.03 -> 1.06, linear): the screen is alive, not frozen. */
  drift: { from: 2820, frames: 209, bias: 1.06 },
  /** 16e: the last frame 16e draws on. 16f's first camera keyframe, cursor waypoint and overlay item start at f3030 or later. */
  partEndB5: 3029,

  // ---------------------------------------------------------------- 16f (f3030-3299)
  /** 16f: the ledger layer (the chain, the seal, the callout, the button and 16e's scrim) leaves, signature; S4b6's scrim takes over under it frame for frame. */
  ledgerOut: { from: 3030, frames: 12 },
  /** 16f: the proof group rises (36 px, signature) and is complete on the caption's beat, when the clip (or the replay) starts to play. */
  proofIn: { from: 3030, frames: 30 },
  /** 16f: the badge over the window reveals while the group rises. */
  badgeIn: { from: 3042, frames: 14 },
  /** 16f: the clip (or the replay) plays from the caption's beat (CUES.s4.captionReal), for `PROOF.endAt - PROOF.startFrom` frames. */
  play: { from: CUES.s4.captionReal },
  /** 16f: the three numerals (files re-hashed, checks passed, the run's seconds) rise and count, one after the other, each on a beat. */
  numerals: [3075, 3105, 3135],
  /** 16f: every numeral counts for this many frames (StatNumeral's own ease). */
  numeralFrames: 30,
  /** 16f: "Real wipe. Real rewind. Real hashes." (CUES.s4.captionReal); it leaves (rising) over its last 12 frames, as the group leaves. */
  proofCaption: { start: CUES.s4.captionReal, end: 3285 },
  /** 16f: the group pushes in `scale` (4 %) about its centre, linear, from the moment it rises to the moment it leaves. */
  proofPush: { from: 3030, frames: 255, scale: 1.04 },
  /** 16f: the group leaves (a fade with an 18 px drop), and the scrim after it: S4b6's scrim is gone on the last frame of S4. */
  proofOut: { from: 3285, frames: 8 },
  scrimOut: { from: 3285, frames: 14 },
  /** 16f: the last frame of S4. S5's first keyframe starts on f3300 (its whip), from the pose this part's camera arrives on. */
  partEndB6: 3299,
} as const;

/**
 * 15c: the frames patch 22 (the audio) hooks. The film's only silence is f2370-2399, so it lists the glass-shatter that ends the sound on f2340 and the
 * silence itself; patch 22 adds the sound that comes back on f2400 (S4b's). Frames, not seconds: they come from `S4_TIMING`, never typed twice.
 */
export const S4_CUE_ANCHORS = {
  glassShatter: { frame: S4_TIMING.wipe.at },
  silence: { from: S4_TIMING.silence.from, to: S4_TIMING.silence.to },
  // 16a: the sound returns on f2400; the pulse leaves snapshot 1 on a beat; the container is complete on a beat
  soundReturns: { frame: S4_TIMING.captionRewind.start },
  rewindPulse: { from: S4_TIMING.pulse.from, to: S4_TIMING.pulse.from + S4_TIMING.pulse.frames },
  ghostComplete: { frame: S4_TIMING.ghost.from + S4_TIMING.ghost.frames },
  // 16b: the shards' return, the hash lock (a rising scramble-to-lock) and THE tick (ONE tick: one real hash is compared, files = N is a count, not N tiles)
  reassemble: { from: S4_TIMING.reassemble.from, to: S4_TIMING.reassemble.from + S4_TIMING.reassemble.frames },
  hashLock: { from: S4_TIMING.hashLock.from, to: S4_TIMING.hashLock.from + S4_TIMING.hashLock.frames },
  hashTick: { frame: S4_TIMING.hashTick.from },
  // 16c: the cat command types, the restored line prints (patch 22's typing ticks) and the stage leaves
  catCommand: { from: S4_TIMING.catCmd.from, to: S4_TIMING.catCmd.from + S4_TIMING.catCmd.frames },
  catLine: { from: S4_TIMING.catLine.from, to: S4_TIMING.catLine.from + S4_TIMING.catLine.frames },
  stageOut: { from: S4_TIMING.stageOut.from, to: S4_TIMING.stageOut.from + S4_TIMING.stageOut.frames },
  // 16d: the checks light one by one (patch 22: a tick each), then the stamp lands with the tile and the donut (one hit)
  // (the first `outcome.checksTotal` of these are real; S4b4 throws if the evidence has more than `LAB.checksFit`)
  checkTicks: Array.from({ length: LAB.checksFit }, (_, k) => LAB.checksFrom + k * LAB.checkEvery),
  stamp: { frame: LAB.stampAt },
  // 16e: the chain's blocks land (a soft tick each), the callout, the press, the sweep (a rising tone), the seal (one hit)
  chainBuild: { from: S4_TIMING.chain.from, to: S4_TIMING.chain.from + S4_TIMING.chain.frames },
  callout: { from: S4_TIMING.callout.from },
  press: { frame: S4_TIMING.press.at },
  verifySweep: { from: S4_TIMING.verify.from, to: S4_TIMING.verify.from + S4_TIMING.verify.frames },
  seal: { frame: S4_TIMING.verify.from + Math.round(S4_TIMING.verify.frames * 0.88) },
  // 16f: the ledger layer leaves, the proof group rises, the clip (or the replay) starts on the caption's beat, the three numerals count, the group leaves
  ledgerOut: { from: S4_TIMING.ledgerOut.from, to: S4_TIMING.ledgerOut.from + S4_TIMING.ledgerOut.frames },
  proofRise: { from: S4_TIMING.proofIn.from, to: S4_TIMING.proofIn.from + S4_TIMING.proofIn.frames },
  proofPlay: { frame: S4_TIMING.play.from },
  numerals: [...S4_TIMING.numerals],
  proofOut: { from: S4_TIMING.proofOut.from, to: S4_TIMING.proofOut.from + S4_TIMING.proofOut.frames },
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

// ---------------------------------------------------------------------------------------------- 15b: layout

/**
 * The step column of the Attack Lab's detail pane, in WINDOW px, DERIVED from the app's own layout (AttackLabScreen.tsx: the pane is the second grid column,
 * after the card list of LAB_LIST_W; it pads sp(8) on each side; its content is one column of at most rem(48), centred). Nothing is typed: a change to the
 * screen's layout moves this, and the checks in S4a2.tsx tell you if the camera no longer leaves the column clear.
 */
const PANE_PAD = sp(8);
const PANE_INNER = WINDOW.w - LAB_LIST_W - 2 * PANE_PAD;
const COLUMN_W = Math.min(rem(48), PANE_INNER);
export const S4_COLUMN = { x: LAB_LIST_W + PANE_PAD + (PANE_INNER - COLUMN_W) / 2, w: COLUMN_W } as const;

/** 15b: the lattice. A 6 x 4 schematic of a workspace; the hero tile (2 x 2 cells, top-left cell `heroIndex`: row 1, column 2) is the real file. */
export const S4_LATTICE = { count: 24, columns: 6, heroIndex: 8, seed: 11 } as const;
const LATTICE_SIZE = latticeSize(S4_LATTICE.count, S4_LATTICE.columns);

/** FileLattice's footnote is one mono line of 20 px under the lattice, 22 px below it. */
const FOOTNOTE_GAP = 22;
const FOOTNOTE_H = 26;
/** Air under the footnote, inside the panel. 15c: 70 -> 40, which gives the wipe command the band above the lattice (96 px safe margin to the lattice). */
const PANEL_PAD_BOTTOM = 40;
const PANEL_W = 724;
/** The panel hangs from the top edge of the stage and ends here: 48 px above the rail's node ring (rail y 770, node radius 12 + 8 ring). */
const PANEL_BOTTOM = 722;
/** The panel's top is above the stage on purpose: only its bottom corners show, and none of the app's card list is left cropped over its top edge. */
const PANEL_TOP = -40;

/**
 * 15b: the backing panel of the explainer (stage px), a SOLID sheet (the page background, `theme.paper`) hanging from the top edge of the stage over the
 * left half. The app's card list is behind it, and the first version of this panel (a 92 % one, floating) let the card text show through the tiles and left a
 * card cropped over its top edge, so it is opaque and runs off the top. Its right edge is clear of the pane's step column (S4a2.tsx checks it at the camera's
 * pose); its left edge is the film's safe margin, which is also where the window's own left edge is at that pose.
 */
export const S4_PANEL = {
  x: layout.safeMargin,
  y: PANEL_TOP,
  w: PANEL_W,
  h: PANEL_BOTTOM - PANEL_TOP,
  radius: 20,
} as const;

/** 15b: the lattice's top-left on the stage: centred across the panel, with the footnote and the bottom air under it. Patch 16's reassemble and the hash tiles use the same place. */
export const S4_LATTICE_AT = {
  x: S4_PANEL.x + (S4_PANEL.w - LATTICE_SIZE.w) / 2,
  y: PANEL_BOTTOM - PANEL_PAD_BOTTOM - FOOTNOTE_H - FOOTNOTE_GAP - LATTICE_SIZE.h,
  w: LATTICE_SIZE.w,
  h: LATTICE_SIZE.h,
} as const;

/** 15b: the rail of the snapshot timeline (SnapshotTimeline's own defaults: y 770, x 96-1824); node `i` sits in slot i, so node 1 is slot 0. */
export const S4_RAIL = { y: TL_Y, x0: TL_X0, x1: TL_X1 } as const;
/** Where node `slot` sits on the stage (stage px). Patch 16's tether leaves from here. */
export const s4NodeX = (slot: number): number => timelineNodeX(slot, 5, S4_RAIL.x0, S4_RAIL.x1);

// ---------------------------------------------------------------------------------------------- 15b: the stage's state, per frame

/**
 * The persistent STAGE (S4Stage.tsx) is drawn from these pure functions of the global frame; they are the only place its timing lives. 15c adds the wipe
 * (the lattice's `shatter` and `desaturate`, and its camera punch) and patch 16 adds the rewind (`reassemble`, the ghost container, the rewound node) by
 * EXTENDING these functions and the S4Stage component, never by drawing a second lattice.
 */

/** 0..1, eased: the backing panel's entrance. */
export function s4PanelProgress(frame: number): number {
  return signature(clamp01((frame - S4_TIMING.panel.from) / S4_TIMING.panel.frames));
}

/** The four LINEAR 0..1 values FileLattice takes (it applies its own easing). 15b: `intact` moves; 15c adds `shatter` and `desaturate`; 16b fills `reassemble` (and drains `desaturate` back to 0 with it). */
export interface S4LatticeState {
  intact: number;
  shatter: number;
  reassemble: number;
  desaturate: number;
}

export function s4LatticeState(frame: number): S4LatticeState {
  const t = S4_TIMING.lattice;
  const sh = S4_TIMING.shatter;
  const ds = S4_TIMING.desat;
  // 15c: the shatter and the drain (linear: FileLattice applies its own easing)
  // 16b: `reassemble` is the shards' return (f2460-2505), and the colour comes back with it (the drain's 30 % falls to 0 over the same frames)
  const re = clamp01((frame - S4_TIMING.reassemble.from) / S4_TIMING.reassemble.frames);
  return {
    intact: clamp01((frame - t.from) / t.frames),
    shatter: clamp01((frame - sh.from) / sh.frames),
    reassemble: re,
    desaturate: ds.amount * clamp01((frame - ds.from) / ds.frames) * (1 - re),
  };
}

/** 0..1 linear: the rail draws on. */
export function s4RailProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.rail.from) / S4_TIMING.rail.frames);
}

/** 0..1 linear: snapshot node 1 lands (0 before f2280). */
export function s4NodeProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.node.at) / S4_TIMING.node.frames);
}

// ---------------------------------------------------------------------------------------------- 15c: the wipe command, the token, the shake

/**
 * 15c: the wipe command, typed large in mono on the stage, in the band between the top of the stage's safe margin and the lattice (the panel's blank top).
 * It is laid out FROM the evidence's command: the largest size in 24..34 px at which it wraps (at spaces, greedy) to at most two lines inside the panel.
 * A rule of 4 px in the colour of what it does (the wipe: `theme.bad`) stands to the left of the text.
 */
export const S4_COMMAND = { x: S4_PANEL.x + 40, top: layout.safeMargin, rule: 4, gap: 14, lineHeight: 1.45, rightPad: 40 } as const;

export interface S4CommandLayout {
  fontSize: number;
  lines: string[];
  /** where the text starts (stage px) and the height of the block */
  textX: number;
  y: number;
  h: number;
  /** the characters of the command shown across all lines (spaces at the breaks are not typed) */
  total: number;
}

function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if (next.length <= maxChars || cur === "") cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

export function s4CommandLayout(command: string): S4CommandLayout {
  const textX = S4_COMMAND.x + S4_COMMAND.rule + S4_COMMAND.gap;
  const avail = S4_PANEL.x + S4_PANEL.w - S4_COMMAND.rightPad - textX;
  let best: { fontSize: number; lines: string[] } | null = null;
  for (let f = 34; f >= 24; f--) {
    const lines = wrapWords(command, Math.floor(avail / (f * MONO_ADVANCE)));
    if (lines.length <= 2 && lines.every((l) => l.length * f * MONO_ADVANCE <= avail)) {
      best = { fontSize: f, lines };
      break;
    }
  }
  if (!best) throw new Error(`S4 (15c): the wipe command (${command.length} characters) does not wrap into two lines of at least 24 px in the panel (${avail}px wide)`);
  return {
    fontSize: best.fontSize,
    lines: best.lines,
    textX,
    y: S4_COMMAND.top,
    h: Math.round(best.lines.length * best.fontSize * S4_COMMAND.lineHeight),
    total: best.lines.reduce((n, l) => n + l.length, 0),
  };
}

/** 0..1: the command's line is there (it appears at f2300 and is dimmed from the wipe). */
export function s4CommandOpacity(frame: number): number {
  const t = S4_TIMING;
  if (frame < t.cmdIn.from) return 0;
  const appear = clamp01((frame - t.cmdIn.from) / t.cmdIn.frames);
  const dim = clamp01((frame - t.dim.from) / t.dim.frames);
  // 16a: the command leaves with the slab (f2400-2413)
  return appear * (1 - (1 - t.dim.to) * signature(dim)) * (1 - s4RetireProgress(frame));
}

/** How many characters of the command are typed (0..total), linear. */
export function s4CommandChars(frame: number, total: number): number {
  const t = S4_TIMING.type;
  return Math.round(total * clamp01((frame - t.from) / t.frames));
}

/** The text cursor: there from the first frame of the command until the wipe. */
export function s4CommandCursor(frame: number): boolean {
  return frame >= S4_TIMING.cmdIn.from && frame < S4_TIMING.wipe.at;
}

/** 15c: the huge output (\"WIPED_0\"): the largest mono bold that fits the lattice's width with 24 px each side, at most 170 px. */
export function s4TokenLayout(token: string): { fontSize: number } {
  const fontSize = Math.min(170, Math.floor((S4_LATTICE_AT.w - 48) / (token.length * MONO_ADVANCE)));
  if (!(fontSize >= 48)) throw new Error(`S4 (15c): the wipe output "${token}" (${token.length} characters) does not fit the lattice's width at 48 px or more`);
  return { fontSize };
}

/** 15c: the token slams in on f2370: opacity in 4 frames, scale 1.1 -> 1 in `token.frames`. */
export function s4TokenState(frame: number): { opacity: number; scale: number } {
  const t = S4_TIMING.token;
  if (frame < t.at) return { opacity: 0, scale: 1.1 };
  // 16a: the slab leaves from f2400 (it is a function of the frame: the stage draws nothing once the opacity is 0)
  return { opacity: clamp01((frame - t.at) / 4) * (1 - s4RetireProgress(frame)), scale: 1.1 - 0.1 * signature(clamp01((frame - t.at) / t.frames)) };
}

/**
 * 15c: the camera's impact shake at a frame (stage px), the SAME seeded one the camera adds to the app (Camera.tsx `shakeAt` keys it on the keyframe's
 * frame), so the stage objects jolt with the app instead of standing still against it.
 */
export function s4Shake(frame: number): { x: number; y: number } {
  const cam = getCameraState(frame, [kf(0, "attackSteps"), kf(S4_TIMING.punch.at, "attackSteps", { ease: "linear", frames: 1, shake: S4_TIMING.punch.shake })], undefined, { wideTilt: false });
  return { x: cam.shakeX, y: cam.shakeY };
}

// ---------------------------------------------------------------------------------------------- 16a: the rewind opens

/** 16a: 0..1, eased: the slab with the wipe's output and the command leave (both multiply their opacity by 1 minus this). */
export function s4RetireProgress(frame: number): number {
  return signature(clamp01((frame - S4_TIMING.retire.from) / S4_TIMING.retire.frames));
}

/** Round the lattice the GhostContainer sits this far outside it (stage px): its corner ticks (14 px out) and echo outline (9 px out) stay inside the panel. */
const GHOST_PAD = 14;
const GHOST_CORNER_OFFSET = 14; // GhostContainer.tsx CORNER_OFFSET
const GHOST_CHIP_H = 34; // GhostContainer.tsx CHIP_H: the label chip straddles the top edge

/** 16a: the fresh sandbox: the empty lattice's place with `GHOST_PAD` round it (stage px). 16b's shards return INTO it and its HashTiles sit with it. */
export const S4_GHOST = {
  x: S4_LATTICE_AT.x - GHOST_PAD,
  y: S4_LATTICE_AT.y - GHOST_PAD,
  w: S4_LATTICE_AT.w + 2 * GHOST_PAD,
  h: S4_LATTICE_AT.h + 2 * GHOST_PAD,
  pad: GHOST_PAD,
  cornerOffset: GHOST_CORNER_OFFSET,
  chipH: GHOST_CHIP_H,
} as const;

/** 16a: where the pulse goes: the middle of the fresh sandbox (the empty slots the files come back to). */
export const S4_TETHER_TO = { x: S4_GHOST.x + S4_GHOST.w / 2, y: S4_GHOST.y + S4_GHOST.h / 2 } as const;

/** 16a: 0..1 linear: the GhostContainer draws on (it applies its own easing). */
export function s4GhostDraw(frame: number): number {
  return clamp01((frame - S4_TIMING.ghost.from) / S4_TIMING.ghost.frames);
}

/** 16a: 0..1 linear: the pulse from snapshot 1 to the container (SnapshotTimeline's `tether.progress`; once it is 1 a faint line stays). */
export function s4PulseProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.pulse.from) / S4_TIMING.pulse.frames);
}

/** 16a: 0..1 linear: discarded snapshot number `i` (0 = the first) lands greyed on the rail. */
export function s4DiscardedProgress(frame: number, i: number): number {
  const t = S4_TIMING.discarded;
  return clamp01((frame - (t.from + i * t.stagger)) / t.frames);
}

/** 16a: 0..1 linear: the blue "rewound" node (SnapshotTimeline: its arc is the first 55 %, then the node lands). */
export function s4RewoundProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.rewound.at) / S4_TIMING.rewound.frames);
}

/**
 * 16a: the lattice's footnote ("schematic: only the labelled tile is a real file") is off while the lattice is empty and the pulse crosses its place
 * (f2400-2459). 16b brings it back on f2460, when the tiles return.
 */
export function s4FootnoteOn(frame: number): boolean {
  return frame < S4_TIMING.captionRewind.start || frame > S4_TIMING.partEndB1;
}

// ---------------------------------------------------------------------------------------------- 16a: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (16a): ${m}`);
  };
  if (!(t.retire.from > t.partEndA3)) bad("16a's first item must start after 15c's last frame (f2399)");
  if (!(t.captionRewind.start === CUES.s4.captionRewind && t.captionRewind.start > t.partEndA3)) bad('"Rewind." starts on its cue (CUES.s4.captionRewind), after 15c\'s last frame');
  if (!(t.captionRewind.end <= t.partEndB1)) bad("the caption must be gone by the end of the part");
  if (!(t.retire.from + t.retire.frames <= t.discarded.from + t.discarded.frames)) bad("the slab must be gone before the greyed snapshot has landed");
  if (!(t.pulse.from % BEAT === 0 && t.pulse.from >= t.discarded.from)) bad("the pulse leaves snapshot 1 on a beat, after the greyed snapshot has started to land");
  if (!(t.ghost.frames === GHOST_DRAW_FRAMES)) bad("the GhostContainer draws on in GHOST_DRAW_FRAMES (BIBLE 11 B)");
  if (!(t.ghost.from > t.pulse.from && t.ghost.from < t.pulse.from + t.pulse.frames)) bad("the container starts to draw while the pulse is on its way");
  if (!((t.ghost.from + t.ghost.frames) % BEAT === 0)) bad(`the container must be complete on a beat (complete f${t.ghost.from + t.ghost.frames})`);
  if (!(t.rewound.at >= t.pulse.from + t.pulse.frames)) bad("the rewound node's arc starts when the pulse has arrived");
  if (!(t.rewound.at + t.rewound.frames <= t.partEndB1)) bad("the rewound node must have landed by the end of the part");
  if (!(t.rewindPush.from >= t.retire.from && t.rewindPush.from + t.rewindPush.frames === t.partEndB1)) bad("the push must arrive on the last frame of the part");
  const g = S4_GHOST;
  const pr = S4_PANEL.x + S4_PANEL.w;
  if (!(g.x - g.cornerOffset >= S4_PANEL.x + 4 && g.x + g.w + g.cornerOffset <= pr - 4)) bad("the container's corner ticks must be inside the panel");
  if (!(g.y - g.chipH / 2 >= layout.safeMargin)) bad(`the container's label chip (stage y ${g.y - g.chipH / 2}) must be inside the safe margin (${layout.safeMargin})`);
  if (!(g.y + g.h + g.cornerOffset <= S4_LATTICE_AT.y + S4_LATTICE_AT.h + FOOTNOTE_GAP + FOOTNOTE_H)) bad("the container must end above the footnote's end");
})();

// ---------------------------------------------------------------------------------------------- 16b: the HashTile and its counter

/**
 * 16b: where the HashTile of the restored snapshot sits (stage px): in the free stage space UNDER the steps column, right of the panel. At 16a/16b's poses the
 * window's bottom edge is at stage y ~593 and the rail at y 770, so a strip of 126 px fits between them with air on both sides (S4b2.tsx checks it against the
 * camera). The tile shows the first `hexShown` (16) hex of both hashes: the full 64-hex string would be 947 px wide. The two hashes are compared in full in
 * `data.ts` (the scene throws unless they are equal); the tile compares the 16 it shows.
 */
export const S4_HASH = { hexShown: 16, x: S4_PANEL.x + S4_PANEL.w + 48, y: 618 } as const;
const HASH_TILE_SIZE = hashTileSize(S4_HASH.hexShown);
export const S4_HASH_BOX = { x: S4_HASH.x, y: S4_HASH.y, w: HASH_TILE_SIZE.w, h: HASH_TILE_SIZE.h } as const;

/**
 * 16b: the counter and the full hash, right of the tile: the counter (mono, 30 px) in the tile's top half, the restored hash in full under it, in two lines of
 * 32 hex at 20 px (BIBLE: no mono under 20 px), `theme.ink3`.
 */
export const S4_COUNTER = {
  x: S4_HASH_BOX.x + S4_HASH_BOX.w + 32,
  y: S4_HASH.y + 8,
  font: 30,
  lineH: 40,
  hashFont: 20,
  hashLineH: 28,
  hexPerLine: 32,
} as const;

/** 16b: 0..1 linear: the shards' return (the lattice's own value, shared with `s4LatticeState`). */
export function s4ReassembleProgress(frame: number): number {
  return clamp01((frame - S4_TIMING.reassemble.from) / S4_TIMING.reassemble.frames);
}

/** 16b: 0..1 linear: the tile and its top row appear (HashTile applies its own easing). */
export function s4HashReveal(frame: number): number {
  return clamp01((frame - S4_TIMING.hashReveal.from) / S4_TIMING.hashReveal.frames);
}

/** 16b: 0..1 linear: how much of the restored hash is locked. */
export function s4HashLock(frame: number): number {
  return clamp01((frame - S4_TIMING.hashLock.from) / S4_TIMING.hashLock.frames);
}

/** 16b: 0..1 linear: the tick's pop and the tile's glow (0 until the hash is locked). */
export function s4HashTick(frame: number): number {
  return clamp01((frame - S4_TIMING.hashTick.from) / S4_TIMING.hashTick.frames);
}

/** 16b: 0..1, eased: the counter and the full hash rise (a masked rise of 12 px, with a fade). */
export function s4CounterProgress(frame: number): number {
  return signature(clamp01((frame - S4_TIMING.counter.from) / S4_TIMING.counter.frames));
}

// ---------------------------------------------------------------------------------------------- 16b: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (16b): ${m}`);
  };
  if (!(t.reassemble.from > t.partEndB1)) bad("16b's first item must start after 16a's last frame (f2459)");
  if (!((t.reassemble.from + t.reassemble.frames) % BEAT === 0)) bad(`the lattice must be whole on a beat (whole f${t.reassemble.from + t.reassemble.frames})`);
  if (!(t.hashReveal.from >= t.reassemble.from + t.reassemble.frames)) bad("the HashTile appears once the lattice is whole");
  if (!(t.hashLock.frames >= 20 && t.hashLock.frames <= 24)) bad("the hash locks in 20-24 frames (BIBLE 11 B)");
  if (!(t.hashLock.from >= t.hashReveal.from + t.hashReveal.frames)) bad("the hash starts to lock once the tile has appeared");
  if (!(t.hashTick.from === t.hashLock.from + t.hashLock.frames && t.hashTick.from % BEAT === 0)) bad("the tick pops on a beat, on the frame the hash is locked");
  if (!(t.counter.from > t.hashTick.from && t.counter.from + t.counter.frames <= t.partEndB2)) bad("the counter rises after the tick and is up by the end of the part");
  if (!(t.hashTick.from + t.hashTick.frames <= t.partEndB2)) bad("the tick's pop must be over by the end of the part");
  if (!(t.returnPush.from > t.partEndB1 && t.returnPush.from + t.returnPush.frames === t.partEndB2)) bad("the push must start after 16a's last frame and arrive on the last frame of the part");
  if (!(S4_HASH_BOX.x >= S4_PANEL.x + S4_PANEL.w + 24)) bad("the HashTile must be clear of the panel (24 px)");
  if (!(S4_HASH_BOX.y + S4_HASH_BOX.h <= S4_RAIL.y - 24)) bad(`the HashTile ends at stage y ${S4_HASH_BOX.y + S4_HASH_BOX.h}, within 24 px of the rail (y ${S4_RAIL.y})`);
})();

// ---------------------------------------------------------------------------------------------- 15c: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (15c): ${m}`);
  };
  if (!(t.cmdIn.from > t.partEndA2 && t.cmdIn.from >= LAB.stepAt.wipe)) bad("15c's first item must start after 15b's last frame, on the frame the app's wipe row appears (LAB.stepAt.wipe)");
  if (!(t.type.from >= t.cmdIn.from && t.type.from + t.type.frames < t.wipe.at)) bad("the command must be fully typed before the wipe lands (f2339 at the latest)");
  if (!(t.wipe.at === LAB.wipeLandsAt && t.wipe.at % BEAT === 0)) bad("the wipe must land on LAB.wipeLandsAt, on a beat");
  if (!(t.punch.at === t.wipe.at && t.punch.extra === 1.03)) bad("the camera punches 3 % on the frame of the wipe");
  if (!(t.shatter.frames === SHATTER_FRAMES && t.shatter.from + t.shatter.frames === t.token.at)) bad("the shatter must last SHATTER_FRAMES and end on the frame the token slams in");
  if (!(t.desat.amount === 0.3)) bad("the wipe drains the lattice to 30 %");
  if (!(t.punch.at + t.punch.frames <= t.relax.from)) bad("the relax must start after the punch has arrived");
  if (!(t.relax.from + t.relax.frames <= t.partEndA3)) bad("the camera must have arrived by the last frame of 15c, before patch 16's first keyframe (f2400)");
  if (!(t.token.at === CUES.s4.captionGone && t.token.at + t.token.frames <= t.partEndA3)) bad("the token slams in on the caption's cue and is complete before the part ends");
  if (!(t.silence.from === t.token.at && t.silence.to === t.partEndA3 && t.partEndA3 < CUES.s4.captionRewind)) bad("the silence is f2370 to the last frame of 15c, ending before \"Rewind.\" (CUES.s4.captionRewind)");
  if (!(t.captionGone.start === CUES.s4.captionGone && t.captionGone.end === CUES.s4.captionRewind)) bad("\"Everything gone.\" runs from its cue to the cue of \"Rewind.\"");
  // the band for the command: from the safe margin to 16 px above the lattice, inside the panel
  const band = S4_LATTICE_AT.y - 16 - S4_COMMAND.top;
  if (!(band >= 2 * 24 * S4_COMMAND.lineHeight)) bad(`the band above the lattice (${band.toFixed(0)} px, from the safe margin) cannot hold two lines of 24 px`);
})();

// ---------------------------------------------------------------------------------------------- 15b: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (15b): ${m}`);
  };
  if (!(t.open.from >= LAB.pressAt + LAB.pressFrames)) bad("the camera must not leave the Run button before its press has played");
  if (!(t.open.from > t.partEndA1)) bad("15b's first camera keyframe must start after 15a's last frame");
  if ((t.open.from + t.open.frames) % BEAT !== 0) bad(`the camera must arrive on a beat (arrives f${t.open.from + t.open.frames})`);
  if (!(t.settle.frames > 0 && t.settle.from + t.settle.frames === t.partEndA2)) bad("the settle push must arrive on the last frame of the part");
  if (!(t.panel.from >= t.open.from && t.panel.from + t.panel.frames <= t.lattice.from + 4)) bad("the panel must be in (within 4 frames) when the first tile shows, and not before the camera is moving");
  if (!(t.lattice.from >= t.open.from + t.open.frames)) bad("the lattice must not start building before the camera has arrived");
  if (!(t.lattice.from + t.lattice.frames <= t.node.at)) bad("the lattice must be complete when snapshot node 1 lands");
  if (!(t.rail.from >= t.panel.from && t.rail.from + t.rail.frames <= t.node.at)) bad("the rail must be drawn by the time node 1 lands");
  if (t.node.at % BEAT !== 0) bad(`snapshot node 1 must land on a beat (lands f${t.node.at})`);
  if (!(t.node.at >= LAB.stepAt.write)) bad(`the snapshot is taken AFTER the write (f${LAB.stepAt.write}), but node 1 lands on f${t.node.at}`);
  if (!(t.node.at + t.node.frames <= t.partEndA2)) bad("the node's landing must be over by the end of the part");
  if (!(t.caption.start === CUES.s4.captionWorks && t.caption.end <= t.partEndA2 && t.caption.end > t.node.at && t.caption.end <= CUES.s4.captionGone)) {
    bad("the caption must start on its cue, stay up while node 1 lands, and be gone by the end of the part");
  }
  if (!(t.partEndA2 < LAB.stepAt.wipe)) bad(`15b must end before the wipe command starts (LAB.stepAt.wipe, f${LAB.stepAt.wipe}): 15c's first item is on that frame`);

  // the panel and what is on it: hanging from the top edge, ending well above the rail; the lattice inside it and inside the safe margin; the footnote inside it
  const pr = S4_PANEL.x + S4_PANEL.w;
  const pb = S4_PANEL.y + S4_PANEL.h;
  if (!(S4_PANEL.x >= layout.safeMargin && S4_PANEL.y <= 0 && pb <= S4_RAIL.y - 40)) bad(`the panel (x ${S4_PANEL.x}-${pr}, y ${S4_PANEL.y}-${pb}) must hang from the top edge, start inside the safe margin and end at least 40 px above the rail (y ${S4_RAIL.y})`);
  if (!(S4_LATTICE_AT.x >= S4_PANEL.x + 24 && S4_LATTICE_AT.x + S4_LATTICE_AT.w <= pr - 24)) bad("the lattice must sit inside the panel with 24 px on each side");
  if (!(S4_LATTICE_AT.y >= layout.safeMargin)) bad(`the lattice starts at stage y ${S4_LATTICE_AT.y}, inside the safe margin (${layout.safeMargin})`);
  if (!(S4_LATTICE_AT.y + S4_LATTICE_AT.h + FOOTNOTE_GAP + FOOTNOTE_H <= pb - 24)) bad("the lattice and its footnote must fit in the panel");
  if (!(S4_LATTICE.heroIndex % S4_LATTICE.columns + 1 < S4_LATTICE.columns && S4_LATTICE.heroIndex + S4_LATTICE.columns + 1 < S4_LATTICE.count)) bad("the hero's 2 x 2 block does not fit the lattice");
})();

// ---------------------------------------------------------------------------------------------- 16c: the cat, and the stage retires

/**
 * 16c: the strip the cat is printed in (stage px): the HashTile's own strip (it steps aside first), from the tile's left edge to the film's right safe margin.
 * The app's cat row is clipped below the window at `attackSteps`, so the REAL command and the REAL restored line are drawn here instead. A rule of 4 px
 * in `theme.ok` (clean is blue in the app) stands to the left of the block, as the wipe command's red rule stood over the lattice.
 */
export const S4_CAT = {
  x: S4_HASH_BOX.x,
  y: S4_HASH_BOX.y,
  w: STAGE.w - layout.safeMargin - S4_HASH_BOX.x,
  h: S4_HASH_BOX.h,
  rule: 4,
  gap: 18,
  cmdFont: 24,
  cmdLineH: 36,
  /** air between the command row and the restored line */
  rowGap: 16,
  lineHeight: 1.3,
  /** the restored line is as large as fits, between these */
  outMin: 26,
  outMax: 40,
  /** the restored line wraps into at most this many lines (the sample's fits one at 40 px) */
  outMaxLines: 2,
} as const;

export interface S4CatLayout {
  /** the command row: its text and the size it is set in */
  cmd: string;
  cmdFont: number;
  /** the restored line: the largest size in `outMin..outMax` at which it wraps (at spaces, greedy) into at most `outMaxLines` lines inside the strip */
  outFont: number;
  outLines: string[];
  outLineH: number;
  /** where the text starts (stage px, absolute) and the block's size */
  textX: number;
  textW: number;
  y: number;
  h: number;
  /** the characters of the restored line across all its lines (the spaces at the breaks are not printed) */
  outTotal: number;
}

/** The strip's layout, laid out FROM the evidence's command and restored line: the restored line on ONE row if it fits at `outMin` px or more, else wrapped. Throws if it does not fit. */
export function s4CatLayout(command: string, line: string): S4CatLayout {
  const c = S4_CAT;
  const textX = c.x + c.rule + c.gap;
  const textW = c.x + c.w - textX;
  if (!(command.length * c.cmdFont * MONO_ADVANCE <= textW)) throw new Error(`S4 (16c): the cat command (${command.length} characters) does not fit the strip (${textW.toFixed(0)}px) at ${c.cmdFont} px`);
  // One line at the largest size that fits comes first; the line wraps only when it cannot be set on one line at `outMin` px or more.
  let best: { fontSize: number; lines: string[] } | null = null;
  for (let maxLines = 1; maxLines <= c.outMaxLines && !best; maxLines++) {
    for (let f = c.outMax; f >= c.outMin; f--) {
      // one character of room is kept for the text cursor, which stands at the end of the line when it is complete
      const lines = wrapWords(line, Math.floor(textW / (f * MONO_ADVANCE)) - 1);
      if (lines.length <= maxLines && lines.every((l) => (l.length + 1) * f * MONO_ADVANCE <= textW)) {
        best = { fontSize: f, lines };
        break;
      }
    }
  }
  if (!best) throw new Error(`S4 (16c): the restored line (${line.length} characters) does not wrap into ${c.outMaxLines} lines of at least ${c.outMin} px in the strip (${textW.toFixed(0)}px wide)`);
  const outLineH = Math.round(best.fontSize * c.lineHeight);
  return {
    cmd: command,
    cmdFont: c.cmdFont,
    outFont: best.fontSize,
    outLines: best.lines,
    outLineH,
    textX,
    textW,
    y: c.y,
    h: c.cmdLineH + c.rowGap + best.lines.length * outLineH,
    outTotal: best.lines.reduce((n, l) => n + l.length, 0),
  };
}

/** 0..1, eased: how much of the HashTile and the counter are still there (1 until f2584, 0 from f2594). */
export function s4HashOpacity(frame: number): number {
  const t = S4_TIMING.hashOut;
  return 1 - signature(clamp01((frame - t.from) / t.frames));
}

/** 0..1, eased: how much of the stage is still there (1 until f2655, 0 from f2669). The stage and the cat multiply their opacity by it. */
export function s4StageOpacity(frame: number): number {
  const t = S4_TIMING.stageOut;
  return 1 - signature(clamp01((frame - t.from) / t.frames));
}

/** 0..1: the cat's block (rule + the two rows) is there: it appears over 4 frames from f2596 and leaves with the stage. */
export function s4CatOpacity(frame: number): number {
  const t = S4_TIMING.catCmd;
  if (frame < t.from) return 0;
  return clamp01((frame - t.from) / 4) * s4StageOpacity(frame);
}

/** How many characters of the command are typed (0..total), linear. */
export function s4CatCmdChars(frame: number, total: number): number {
  const t = S4_TIMING.catCmd;
  return Math.round(total * clamp01((frame - t.from) / t.frames));
}

/** How many characters of the restored line are printed (0..total), linear. */
export function s4CatLineChars(frame: number, total: number): number {
  const t = S4_TIMING.catLine;
  return Math.round(total * clamp01((frame - t.from) / t.frames));
}

/**
 * Where the text cursor is: on the command row while it types, on the restored line while it prints, then it blinks (8 frames on, 8 off) at the end of the line
 * until the stage leaves. "none" before the command starts.
 */
export function s4CatCursor(frame: number, cmdTotal: number, outTotal: number): "none" | "cmd" | "out" | "blink" {
  if (frame < S4_TIMING.catCmd.from) return "none";
  if (s4CatCmdChars(frame, cmdTotal) < cmdTotal) return "cmd";
  if (frame < S4_TIMING.catLine.from) return "cmd";
  if (s4CatLineChars(frame, outTotal) < outTotal) return "out";
  return Math.floor((frame - (S4_TIMING.catLine.from + S4_TIMING.catLine.frames)) / 8) % 2 === 0 ? "blink" : "none";
}

// ---------------------------------------------------------------------------------------------- 16c: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (16c): ${m}`);
  };
  if (!(t.hashOut.from > t.partEndB2)) bad("16c's first item must start after 16b's last frame (f2579)");
  if (!(t.hashOut.from >= t.counter.from + t.counter.frames + 16)) bad("the counter must have been up for 16 frames (a read) before it leaves");
  if (!(t.catCmd.from >= t.hashOut.from + t.hashOut.frames)) bad("the cat's strip is the tile's: the tile must be gone before the command's line appears");
  if (!(t.catLine.from >= t.catCmd.from + t.catCmd.frames)) bad("the restored line prints after the command is typed");
  if (!(t.catLine.from >= LAB.stepAt.cat)) bad(`the stage prints the cat after the app's own cat row appears (LAB.stepAt.cat, f${LAB.stepAt.cat}), which is clipped below the window`);
  if (!((t.catLine.from + t.catLine.frames) % BEAT === 0)) bad(`the restored line must be complete on a beat (complete f${t.catLine.from + t.catLine.frames})`);
  if (!(t.detailMove.from >= t.catLine.from + t.catLine.frames)) bad("the camera leaves the steps after the restored line is complete");
  if (!(t.stageOut.from >= t.catLine.from + t.catLine.frames + BEAT)) bad("the restored line is held for at least a beat (15 frames) once complete, before the stage retires");
  if (!(t.stageOut.from === t.detailMove.from)) bad("the stage retires as the camera starts to move: on the same frame");
  if (!(t.stageOut.from + t.stageOut.frames <= t.detailMove.from + t.detailMove.frames)) bad("the stage must be gone by the time the camera has arrived");
  if (!((t.detailMove.from + t.detailMove.frames) % BEAT === 0)) bad(`the camera must arrive on a beat (arrives f${t.detailMove.from + t.detailMove.frames})`);
  if (!(t.detailMove.from + t.detailMove.frames <= t.partEndB3 && t.partEndB3 < LAB.checksFrom)) bad("the camera must have arrived by the last frame of 16c, before the checks light (LAB.checksFrom)");
  if (!(S4_CAT.y >= S4_HASH_BOX.y && S4_CAT.y + S4_CAT.h <= S4_RAIL.y - 24)) bad("the cat's strip must keep 24 px from the rail");
  if (!(S4_CAT.x + S4_CAT.w <= STAGE.w - layout.safeMargin)) bad("the cat's strip must stay inside the safe margin");
})();

// ---------------------------------------------------------------------------------------------- 16e: the ledger layer

/**
 * 16e: 0..1, how much of the ledger layer (the scrim, the chain, the seal, the callout and the button) is there. It is 1 on every frame of 16e.
 * 16f: it leaves as the proof window comes in (signature, f3030-3041, one multiplier on the whole layer, 16e's own scrim included).
 */
export function s4LedgerOpacity(frame: number): number {
  const t = S4_TIMING.ledgerOut;
  return 1 - signature(clamp01((frame - t.from) / t.frames));
}

/** 16e: 0..1, the scrim's fade-in (signature). */
export function s4ScrimProgress(frame: number): number {
  const t = S4_TIMING.scrim;
  return signature(clamp01((frame - t.from) / t.frames));
}

/** 16e: 0..1, the chain's linear reveal (the HashChain's `revealProgress`). */
export function s4ChainReveal(frame: number): number {
  const t = S4_TIMING.chain;
  return clamp01((frame - t.from) / t.frames);
}

/** 16e: 0..1, the verification's linear sweep (the HashChain's `verifyProgress`). */
export function s4VerifyProgress(frame: number): number {
  const t = S4_TIMING.verify;
  return clamp01((frame - t.from) / t.frames);
}

/** 16e: 0..1 breathing of the delete block's glow, from the start of the chain's build (a sine of the frame, two seconds a cycle). */
export function s4ChainPulse(frame: number): number {
  return 0.5 + 0.5 * Math.sin(((frame - S4_TIMING.chain.from) / 30) * Math.PI);
}

/** 16e: 0..1, the button's fade-in. */
export function s4ButtonIn(frame: number): number {
  const t = S4_TIMING.buttonIn;
  return clamp01((frame - t.from) / t.frames);
}

/** 16e: 0..1 over the press's squeeze (0 before f2946 and after f2950), as a triangle; and the ripple's progress 0..1 over 14 frames (0 before the press). */
export function s4PressSqueeze(frame: number): number {
  const t = S4_TIMING.press;
  const k = (frame - t.at) / t.frames;
  return k < 0 || k > 1 ? 0 : 1 - Math.abs(2 * k - 1);
}
export function s4PressRipple(frame: number): number {
  return frame < S4_TIMING.press.at ? 0 : clamp01((frame - S4_TIMING.press.at) / 14);
}

// ---------------------------------------------------------------------------------------------- 16e: import-time checks

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (16e): ${m}`);
  };
  if (!(t.scrim.from > t.partEndB4)) bad("16e's first item must start after 16d's last frame (f2819)");
  if (!(t.chain.from >= t.scrim.from + t.scrim.frames)) bad("the chain builds on the scrim, after it has faded in");
  if (!((t.chain.from + t.chain.frames) % BEAT === 0)) bad("the chain must be complete on a beat");
  if (!(t.callout.from === 2900)) bad("the callout \"Undone, not erased.\" lands on f2900 (BIBLE)");
  if (!(t.callout.from >= t.chain.from + t.chain.frames)) bad("the callout points at a block that is fully built");
  if (!(t.buttonIn.from >= t.callout.from)) bad("the button comes after the callout has landed");
  if (!(t.press.at >= t.buttonIn.from + t.buttonIn.frames + 8)) bad("the button must be on the screen for 8 frames before it is pressed");
  if (!(t.verify.from >= t.press.at + t.press.frames)) bad("the sweep starts after the press");
  if (!(t.callout.to <= t.verify.from + t.verify.frames)) bad("the callout leaves by the end of the sweep (it must not sit on the seal's line)");
  if (!(t.verify.from + t.verify.frames + 30 <= t.partEndB5)) bad("the seal and its line must hold for at least 30 frames before the end of the part");
  if (!(t.drift.from === t.scrim.from && t.drift.from + t.drift.frames <= t.partEndB5)) bad("the drift runs from the scrim to the end of the part, no further");
})();

// ---------------------------------------------------------------------------------------------- 16f: the proof

/** 0..1, eased: the proof group rises (S4b6: 36 px and a fade; it is complete on the caption's beat f3060). */
export function s4ProofRise(frame: number): number {
  const t = S4_TIMING.proofIn;
  return signature(clamp01((frame - t.from) / t.frames));
}

/** 0..1, eased: the proof group leaves (S4b6: an 18 px drop and a fade, f3285-3292). */
export function s4ProofGroupExit(frame: number): number {
  const t = S4_TIMING.proofOut;
  return signature(clamp01((frame - t.from) / t.frames));
}

/** The group's scale: 1 when it rises, `proofPush.scale` (1.04) when it leaves, linear about its centre. */
export function s4ProofPush(frame: number): number {
  const t = S4_TIMING.proofPush;
  return 1 + (t.scale - 1) * clamp01((frame - t.from) / t.frames);
}

/**
 * 16f: the opacity of S4b6's own scrim (`theme.paper`). It is mounted UNDER the ledger layer, which carries 16e's scrim at `scrim.alpha` times `s4LedgerOpacity`. What the
 * Lab behind lets through is (1 - this) x (1 - alpha x layer); this is chosen so that product is the 5 % it let through all along (1 - alpha), and the Lab stays dimmed to
 * 95 % while the chain fades over it: `alpha (1 - layer) / (1 - alpha layer)` is 0 while the layer is whole and `alpha` when it has gone. From `scrimOut.from` it fades out
 * (signature) so the app is bright and whole on the last frame of S4.
 */
export function s4ProofScrim(frame: number): number {
  const a = S4_TIMING.scrim.alpha;
  const layer = s4LedgerOpacity(frame);
  const cover = (a * (1 - layer)) / (1 - a * layer);
  const t = S4_TIMING.scrimOut;
  return cover * (1 - signature(clamp01((frame - t.from) / t.frames)));
}

// ---------------------------------------------------------------------------------------------- 16f: import-time checks

/** The clip's last frame is held for at most this many frames before the group leaves (a longer hold would read as a frozen video). */
const PROOF_HOLD_MAX = 45;

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4 (16f): ${m}`);
  };
  if (!(t.ledgerOut.from > t.partEndB5)) bad("16f's first item must start after 16e's last frame (f3029)");
  if (!(t.proofIn.from >= t.ledgerOut.from)) bad("the group rises as the ledger layer leaves, not before");
  if (!(t.ledgerOut.from + t.ledgerOut.frames <= t.play.from)) bad("the ledger layer must be gone before the clip starts");
  if (!(t.play.from === CUES.s4.captionReal && t.play.from % BEAT === 0)) bad('the clip plays from the caption\'s beat (CUES.s4.captionReal), which is a beat');
  if (!(t.proofIn.from + t.proofIn.frames === t.play.from)) bad("the group is complete on the frame the clip starts to play");
  if (!(t.badgeIn.from >= t.proofIn.from && t.badgeIn.from + t.badgeIn.frames <= t.play.from)) bad("the badge reveals while the group rises and is complete before the clip plays");
  if (!(t.numeralFrames === 30)) bad("every numeral counts for 30 frames");
  for (let i = 0; i < t.numerals.length; i++) {
    const at = t.numerals[i];
    if (!(at % BEAT === 0)) bad(`numeral ${i} starts on f${at}: every reveal lands on a beat`);
    if (!(at >= t.play.from)) bad(`numeral ${i} (f${at}) starts before the clip does`);
    if (i > 0 && !(at >= t.numerals[i - 1] + t.numeralFrames)) bad(`numeral ${i} (f${at}) starts before numeral ${i - 1} has finished counting`);
    if (!(at + t.numeralFrames <= t.proofOut.from)) bad(`numeral ${i} (f${at}) is still counting when the group leaves`);
  }
  if (!(t.proofCaption.start === CUES.s4.captionReal && t.proofCaption.end === t.proofOut.from)) bad("the caption runs from its cue to the frame the group leaves");
  if (!(t.proofPush.from === t.proofIn.from && t.proofPush.from + t.proofPush.frames === t.proofOut.from)) bad("the push runs from the frame the group rises to the frame it leaves");
  if (!(t.proofPush.scale === 1.04)) bad("the group pushes in 4 %");
  if (!(t.scrimOut.from === t.proofOut.from && t.proofOut.from + t.proofOut.frames <= t.scrimOut.from + t.scrimOut.frames)) bad("the scrim leaves with the group and after it");
  if (!(t.scrimOut.from + t.scrimOut.frames <= t.partEndB6)) bad("the scrim must be gone by the last frame of S4 (f3299)");
  if (!(t.partEndB6 === SCENES.S4.end)) bad("this part ends on the last frame of S4");

  // the cut: whole frames, and long enough that the last row of the replay lands inside it, short enough that the window is up when it ends
  const frames = PROOF.endAt - PROOF.startFrom;
  if (!(Number.isInteger(PROOF.startFrom) && Number.isInteger(PROOF.endAt) && PROOF.startFrom >= 0)) bad("PROOF.startFrom and PROOF.endAt are whole frames (script.ts), startFrom 0 or more");
  const min = t.proofOut.from + t.proofOut.frames - PROOF_HOLD_MAX - t.play.from;
  const max = t.proofOut.from - t.play.from;
  if (!(frames >= min && frames <= max)) {
    bad(`the proof cut (PROOF.startFrom ${PROOF.startFrom} to PROOF.endAt ${PROOF.endAt}) is ${frames} frames: it must be ${min} to ${max} (the last frame is held at most ${PROOF_HOLD_MAX} frames before the group leaves, and the cut ends before it does). Change them in src/config/script.ts`);
  }
})();
