// S3a (f1500-1679) "Containment, measured" and the box (BIBLE 6, S3). Patch 14a: the first third of S3.
//
// What this part does
//   - f1500-1548 the camera holds the Secrets card (S2c's whip lands on it at f1500) with a slow tilt, and the caption "Containment, measured."
//     is up. The card is the app's own gauge, drawn by filmState from the audited ledger: its line reads "{real} real in sandbox - {n} of
//     {planted} decoys read - {n} used" from the evidence; nothing is typed here.
//   - f1546-1562 the hand-over: the camera lets go of the card and pulls to the whole window while S3Scrim steps the app back (dimmed 55 %,
//     blurred 6 px). From f1560 the explainer owns the stage.
//   - f1560-1596 the ContainerBox draws on. Its six chips land on the beats f1575 / 1590 / 1605 / 1620 / 1635 / 1650, and from f1584 the six
//     decoys appear in the DecoyRack, planted (graphite), from the canary.seeded event. THE BOX IS NOT DRAWN HERE: it is S3Box.tsx, one object
//     for all three parts (S3Decoys.tsx assembles it); this file owns the camera, the captions and the callouts.
//   - f1620-1679 callout "Random per task", on the last decoy.
//
// Hand-offs. 14b starts at f1680: its first camera keyframe must start at f1680 or later (this part ends holding `fullWindow`, padding 60,
// arrived on f1586), its overlay items start at f1680 or later, and it adds the reads (S3Box turns the tiles amber), the module label (in the
// module band, shared.tsx), the Packet and the EgressWall. S3Scrim and S3Box are assembled by S3Decoys.tsx, so no part has to draw them.
import React from "react";
import { Callout } from "../../fx/Callout";
import { Caption } from "../../fx/Caption";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { copy } from "../../config/copy";
import type { SceneOverlayProps } from "../types";
import { s3Data } from "./data";
import { STAGE } from "../../config/timeline";
import { S3_TIMING, s3TileRect } from "./shared";

const s3 = copy.s3;

// ---------------------------------------------------------------------------------------------- timing

export const S3A_TIMING = {
  /** The camera lets go of the card and pulls to the whole window; it arrives on f1586, the box is then 3/4 drawn. */
  pull: { start: 1546, frames: 40 },
} as const;

// ---------------------------------------------------------------------------------------------- camera

/**
 * S2c's whip lands on `gaugeSecrets` at f1500 (13c2), so the first keyframe is that same pose: a hold (46 frames, with the camera's 2 px micro-drift;
 * the zoom cannot grow, `gaugeSecrets` is already at the 2.6 maximum, and a tilt at that zoom smears the text: the first try, 1.2 / -2.4 deg, did).
 * Then the pull to the whole window, padding 60 (the pose S1 and S2's widen use), which stays until 14b.
 */
export const S3A_CAMERA: readonly CameraKeyframe[] = [
  kf(1500, "gaugeSecrets", { padding: 96 }),
  kf(S3A_TIMING.pull.start, "fullWindow", { padding: 60, ease: "signature", frames: S3A_TIMING.pull.frames }),
];

/** No cursor in S3: it has been hidden since f1188 (13b) and S4 brings it back. */
export const S3A_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S3A_TIMING;
  if (S3A_CAMERA[0].frame !== 1500) throw new Error("S3a: the first keyframe must be f1500 (S2c's whip lands on gaugeSecrets there)");
  for (let i = 1; i < S3A_CAMERA.length; i++) {
    if (!(S3A_CAMERA[i].frame >= S3A_CAMERA[i - 1].frame)) throw new Error(`S3a: camera keyframe ${i} is out of order`);
  }
  if (!(t.pull.start + t.pull.frames <= S3_TIMING.partEnd)) throw new Error("S3a: the pull must have arrived by the end of this part");
  if (!(S3_TIMING.scrim.inFrom >= t.pull.start - 2 && S3_TIMING.scrim.inFrom <= t.pull.start + 2)) {
    throw new Error("S3a: the scrim must come in as the camera lets go of the card (a hand-over, not two events)");
  }
  s3Data(); // throws now, naming what is missing, if the evidence cannot support S3
})();

/**
 * The opening caption is drawn CAPTION_DROP px lower than the film's usual caption position. At zoom 2.6 the app window's bottom edge is on stage y ~928
 * (the camera cannot show more of the panel), and the usual position puts the 72 px caption's ink on y ~895-968, across that edge and over the Compute /
 * Time cards. Dropped by 48 it is on y ~943-1016: clear of the edge, 64 px above the stage's bottom edge.
 */
const CAPTION_DROP = 48;

// ---------------------------------------------------------------------------------------------- the overlay

export const S3a: React.FC<SceneOverlayProps> = ({ frame }) => {
  const data = s3Data();
  const t = S3_TIMING;
  const n = data.decoys.length;

  // the dot of "Random per task": the last decoy's right edge, halfway down (its chip sits right of the box, clear of the six container chips)
  const last = s3TileRect(n - 1, n);
  const randomAt = { x: last.x + last.w - 12, y: last.y + last.h / 2 };

  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, transform: `translateY(${CAPTION_DROP}px)`, pointerEvents: "none" }}>
        <Caption text={s3.caption} highlight="measured." startFrame={t.caption.start} endFrame={t.caption.end} />
      </div>
      <Callout text={s3.calloutRandom} variant="note" target={randomAt} side="right" lead={96} startFrame={t.calloutRandom.start} endFrame={t.calloutRandom.end} />
    </>
  );
};
