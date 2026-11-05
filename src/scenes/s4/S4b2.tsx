// S4b2 (f2460-2579) "The return" (BIBLE 6, S4b). Patch 16b: the second sixth of S4b.
//
// What this part does
//   - f2460-2505 the shards come back INTO the fresh sandbox (S4Stage.tsx, `s4LatticeState`: FileLattice's reassemble, eased, with its 4 % overshoot and
//     its reading-order stagger), and the colour the wipe drained comes back with them. The lattice is whole on the beat f2505.
//   - f2510-2519 the HashTile of the restored snapshot appears in the free stage space under the steps column: the snapshot's hash on top (first 16 hex),
//     the restored row empty.
//   - f2528-2549 the restored hash locks left to right out of scrambled hex (22 frames), a hairline joining every locked column: blue where the characters
//     are equal. BOTH rows are real: the top is `snapshot.created`'s sha256, the bottom is `timeline.rewound`'s snapshot_sha256, which the ledger's own
//     `verified` block says matched (data.ts throws otherwise).
//   - f2550 (a beat) ONE tick pops and the tile's edge glows. One tick, not one per file: the ledger records ONE tree hash, and `files` is a count.
//   - f2552-2563 the counter "N file(s) re-hashed - all matched" (N = `timeline.rewound.verified.files`, 1 in the sample) rises beside the tile, with the
//     restored hash in full under it (two lines of 32 hex).
//   - f2460-2579 a slow push on the steps (bias 1.04 -> 1.05). The cursor: none. No caption: the next one is "Real wipe. Real rewind. Real hashes." (f3060).
//
// Hand-offs. 16a ended on `attackSteps`, padding 96, bias 1.04 (arrived f2459): this part's one keyframe starts on f2460 and arrives f2579 on bias 1.05.
// 16c (f2580) starts its camera, cursor and overlay items on f2580 or later, from that pose. The tile, the counter and the full hash stay up (every value is
// clamped, so they hold) until 16c retires them with the stage; the lattice stays whole in colour inside the container.
import React from "react";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { WINDOW } from "../../config/focus";
import { alpha, fonts, layout, theme } from "../../config/theme";
import { copy } from "../../config/copy";
import { STAGE } from "../../config/timeline";
import { HashTile } from "../../gfx/HashTile";
import { MONO_ADVANCE, estimateWidth } from "../../fx/util";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import { S4A3_CAMERA } from "./S4a3";
import { S4B1_CAMERA } from "./S4b1";
import { S4_COLUMN, S4_COUNTER, S4_HASH, S4_HASH_BOX, S4_PANEL, S4_RAIL, S4_TIMING, s4CounterProgress, s4HashLock, s4HashOpacity, s4HashReveal, s4HashTick } from "./shared";

const gfxB = copy.gfxB;

// ---------------------------------------------------------------------------------------------- camera

/**
 * One keyframe, after f2459 (16a's arrives f2459 on `attackSteps`, padding 96, bias 1.04): the push goes on to bias 1.05 and arrives on the last frame of the
 * part. 1.05 is the peak of 15c's punch (1.02 x 1.03), where the steps column was already checked to clear the panel. No tilt.
 */
export const S4B2_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.returnPush.from, "attackSteps", { padding: 96, scaleBias: S4_TIMING.returnPush.bias, ease: "signature", frames: S4_TIMING.returnPush.frames }),
];

// ---------------------------------------------------------------------------------------------- cursor

/** No waypoints: the cursor has been hidden since the click on Run (f2220). */
export const S4B2_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- the words

/** "1 file re-hashed - all matched" / "12 files re-hashed - all matched". The count is the ledger's (`timeline.rewound.verified.files`). */
export function s4CounterText(files: number): string {
  return `${files} ${files === 1 ? gfxB.fileRehashed : gfxB.filesRehashed} - ${gfxB.allMatched}`;
}

/** The first `hexShown` hex of a hash, as the tile shows them. */
const shown = (hex: string): string => hex.slice(0, S4_HASH.hexShown);

/** The restored hash in lines of `S4_COUNTER.hexPerLine`. */
function hashLines(hex: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += S4_COUNTER.hexPerLine) out.push(hex.slice(i, i + S4_COUNTER.hexPerLine));
  return out;
}

// ---------------------------------------------------------------------------------------------- import-time checks

/** The steps column keeps this much stage between its left edge and the panel's right edge at the part's last pose (15c checks 4 px at the punch's peak). */
const COLUMN_PANEL_GAP = 4;
/** ... and between its right edge and the stage's. */
const COLUMN_EDGE = 24;
/** The window's bottom edge is at least this far above the HashTile's top at any pose of this part. */
const WINDOW_TILE_GAP = 8; // patch 25: 12 -> 8 and the tile 6 px lower (y 618), because the camera now floats up to ~7 px

(() => {
  const t = S4_TIMING;
  if (!(S4B2_CAMERA[0].frame > t.partEndB1)) throw new Error("S4b2: the first keyframe must start after 16a's last frame (f2459)");
  const last = S4B2_CAMERA[S4B2_CAMERA.length - 1];
  if (!((last.frame + (last.frames ?? 0)) <= t.partEndB2)) throw new Error("S4b2: the camera must have arrived by the last frame of the part (f2579): 16c's first keyframe starts at f2580 or later");
  const data = s4Data(); // throws now, naming what is missing, if the evidence cannot support the return

  // the two rows the tile compares: the same length, and each the start of a real 64-hex hash
  const top = shown(data.snapshot.hash);
  const bottom = shown(data.rewound.restoredHash);
  if (!(top.length === S4_HASH.hexShown && bottom.length === S4_HASH.hexShown)) throw new Error(`S4b2: the hashes are shorter than the ${S4_HASH.hexShown} hex the tile shows`);
  if (!(top === bottom)) throw new Error("S4b2: the restored hash does not start like the snapshot's (data.ts should have thrown)");

  // the counter and the full hash fit between the tile and the safe margin
  const counterW = estimateWidth(s4CounterText(data.rewound.files), S4_COUNTER.font, MONO_ADVANCE);
  const hashW = S4_COUNTER.hexPerLine * S4_COUNTER.hashFont * MONO_ADVANCE;
  const right = S4_COUNTER.x + Math.max(counterW, hashW);
  if (!(right <= STAGE.w - layout.safeMargin)) throw new Error(`S4b2: the counter block ends at stage x ${right.toFixed(0)}, inside the safe margin (${STAGE.w - layout.safeMargin})`);
  const lines = hashLines(data.rewound.restoredHash).length;
  const blockBottom = S4_COUNTER.y + S4_COUNTER.lineH + 16 + lines * S4_COUNTER.hashLineH;
  if (!(blockBottom <= S4_HASH_BOX.y + S4_HASH_BOX.h + 8)) throw new Error(`S4b2: the counter block ends at stage y ${blockBottom}, below the tile (${S4_HASH_BOX.y + S4_HASH_BOX.h})`);

  // The camera at the poses of this part: the base is where 16a ends.
  const poses = [...S4A3_CAMERA, ...S4B1_CAMERA, ...S4B2_CAMERA];
  const panelRight = S4_PANEL.x + S4_PANEL.w;
  for (let f = t.reassemble.from; f <= t.partEndB2; f += 10) {
    const cam = getCameraState(Math.min(f, t.partEndB2), poses, undefined, { wideTilt: false });
    const winBottom = worldToStage(cam, { x: 0, y: WINDOW.h }).y;
    if (!(winBottom + WINDOW_TILE_GAP <= S4_HASH_BOX.y)) throw new Error(`S4b2: on f${f} the window's bottom edge is at stage y ${winBottom.toFixed(0)}, within ${WINDOW_TILE_GAP} px of the HashTile (y ${S4_HASH_BOX.y}): lower the push or move S4_HASH`);
  }
  const cam = getCameraState(t.partEndB2, poses, undefined, { wideTilt: false });
  const colLeft = worldToStage(cam, { x: S4_COLUMN.x, y: 0 }).x;
  const colRight = worldToStage(cam, { x: S4_COLUMN.x + S4_COLUMN.w, y: 0 }).x;
  if (!(colLeft >= panelRight + COLUMN_PANEL_GAP)) throw new Error(`S4b2: on f${t.partEndB2} the steps column starts at stage x ${colLeft.toFixed(0)}, within ${COLUMN_PANEL_GAP} px of the panel (it ends x ${panelRight}): lower the push`);
  if (!(colRight <= STAGE.w - COLUMN_EDGE)) throw new Error(`S4b2: on f${t.partEndB2} the steps column ends at stage x ${colRight.toFixed(0)}, within ${COLUMN_EDGE} px of the stage's edge: lower the push`);
  if (!(S4_RAIL.y - (S4_HASH_BOX.y + S4_HASH_BOX.h) >= 24)) throw new Error("S4b2: the HashTile is within 24 px of the rail");
})();

// ---------------------------------------------------------------------------------------------- the overlay

/**
 * The HashTile, the counter and the full hash (the lattice's return is the stage's). They draw from f2510 and hold: every progress is clamped, so after f2579
 * they stay up until 16c steps them aside (f2584-2593, `s4HashOpacity`) to leave their strip to the cat; from f2594 nothing is drawn.
 */
export const S4b2: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S4_TIMING.hashReveal.from) return null;
  const away = s4HashOpacity(frame); // 16c
  if (away <= 0) return null;
  const data = s4Data();
  const counter = s4CounterProgress(frame);
  const lines = hashLines(data.rewound.restoredHash);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: away, transform: `translateY(${((1 - away) * 10).toFixed(2)}px)` }}>
      <HashTile
        x={S4_HASH_BOX.x}
        y={S4_HASH_BOX.y}
        finalHex={shown(data.rewound.restoredHash)}
        referenceHex={shown(data.snapshot.hash)}
        lockProgress={s4HashLock(frame)}
        reveal={s4HashReveal(frame)}
        tickProgress={s4HashTick(frame)}
        clock={frame}
        seed={data.snapshot.n}
        snapshotLabel={gfxB.snapshot}
        restoredLabel={gfxB.restored}
        mismatchLabel={gfxB.mismatch}
      />
      {counter > 0 ? (
        <div style={{ position: "absolute", left: S4_COUNTER.x, top: S4_COUNTER.y, opacity: counter, transform: `translateY(${((1 - counter) * 12).toFixed(2)}px)`, pointerEvents: "none" }}>
          <div style={{ fontFamily: fonts.mono, fontSize: S4_COUNTER.font, lineHeight: `${S4_COUNTER.lineH}px`, color: theme.ok, whiteSpace: "pre", textShadow: `0 0 24px ${alpha(theme.ok, 0.3)}` }}>
            {s4CounterText(data.rewound.files)}
          </div>
          <div style={{ marginTop: 16, fontFamily: fonts.mono, fontSize: S4_COUNTER.hashFont, lineHeight: `${S4_COUNTER.hashLineH}px`, color: theme.ink3, whiteSpace: "pre" }}>
            {lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
