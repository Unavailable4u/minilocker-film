// S4b5 (f2820-3029) "The chain" (BIBLE 6, S4b). Patch 16e: the fifth sixth of S4b.
//
// What this part does (all in stage space, over the Attack Lab, which the checks left stamped and scrolled to the top)
//   - f2820-2831 a scrim (`theme.paper` at 95%) fades in over the app: the Lab is still there, behind, and the camera drifts in on it (bias 1.03 -> 1.06, f2820-3028).
//   - f2835-2894 the HashChain of the attack's REAL ledger events builds (`data.chain`, picked by what the events are, never by position): the write, the snapshot the rewind
//     went back to, the wipe (`rm -rf`) - vermilion, hatched, and pulsing, it stays - the rewind request, the fresh sandbox, the verified rewind and the cat. Each block
//     shows the event type, a detail from the event, its own 8-hex hash and the 8-hex hash of the event before it. Links are SOLID where a block's prev_hash is the hash of the
//     block before it, DASHED with "+N" where the ledger has N events in between (the HashChain checks this itself, from the hashes). Complete on the beat f2895.
//   - f2900 the callout "Undone, not erased." (copy.s4.calloutUndone) lands on the top edge of the delete block; it leaves on f2980 (f2990 - 10).
//   - f2924 the button "Verify ledger now" (copy.rep.verify, the Report page's own label) fades in under the chain; f2946 it is pressed (a squeeze and a ripple).
//   - f2950-2994 the verification sweeps the chain: links and blocks turn ok-blue behind the line, EXCEPT the delete block, which stays vermilion (it is verified, not hidden),
//     then the seal draws and the real line prints beside it: "intact - 29 events - head 0589fc3d" in the sample (`copy.rep.intact`, `data.seal.events`, `copy.rep.head`,
//     `data.seal.short`). The seal and its line hold to f3029.
//   - Cursor: none. The button is in stage space, so a cursor (which lives in the app's window space and follows the camera) could not land on it; the press is the squeeze and
//     the ripple. Caption: none (the next one is "Real wipe. Real rewind. Real hashes.", f3060).
//
// Guards (import-time): the chain's events fit between the safe margins (7 blocks do; `hashChainLayout` throws for more), the wipe is one of them, the seal's line fits
// between the button and the seal, and 16e's camera starts after 16d's last frame and has arrived by f3029. `s4Data()` already throws unless the ledger verified.
//
// Hand-offs. 16d ended on `attackVerdict`, padding 96, bias 1.03 (arrived f2819): this part's one keyframe starts on f2820 from that pose and drifts to bias 1.06 (arrives f3029).
// 16f (f3030) starts its camera, cursor and overlay items on f3030 or later, from that pose, and makes the ledger layer leave by editing `s4LedgerOpacity` in shared.tsx.
import React from "react";
import { Callout } from "../../fx/Callout";
import { MONO_ADVANCE } from "../../fx/util";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { copy } from "../../config/copy";
import { alpha, fonts, theme } from "../../config/theme";
import { STAGE } from "../../config/timeline";
import { CHAIN_BLOCK_H, HashChain, hashChainLayout, type ChainBlock } from "../../gfx/HashChain";
import { toolLine } from "../../lib/derive";
import type { LedgerEvent } from "../../data/types";
import type { SceneOverlayProps } from "../types";
import { s4Data, type ChainRole } from "./data";
import {
  S4_TIMING,
  s4ButtonIn,
  s4ChainPulse,
  s4ChainReveal,
  s4LedgerOpacity,
  s4PressRipple,
  s4PressSqueeze,
  s4ScrimProgress,
  s4VerifyProgress,
} from "./shared";

// ---------------------------------------------------------------------------------------------- camera and cursor

/** One keyframe, after f2819: a slow drift in on the Lab behind the scrim (linear, f2820-3029). */
export const S4B5_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.drift.from, "attackVerdict", { padding: 96, scaleBias: S4_TIMING.drift.bias, ease: "linear", frames: S4_TIMING.drift.frames }),
];

/** No waypoints (see the header). */
export const S4B5_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- layout

/** Stage y of the top of the chain's blocks: the callout's chip sits above the delete block, the seal and the button below the chain. */
const CHAIN_Y = 430;
/** The HashChain's seal radius and the distance of the seal line from it (HashChain.tsx). */
const SEAL_R = 32;
const SEAL_DROP = 78;
const SEAL_GAP = 22;
const SEAL_FONT = 26;
const BUTTON = { h: 56, font: 26, padX: 28 } as const;

const baseName = (path: string): string => path.split("/").filter((p) => p.length > 0).pop() ?? path;

function need<T>(what: string, v: T | undefined | null): T {
  if (v === undefined || v === null) throw new Error(`S4b5: the ledger event has no ${what}`);
  return v;
}

/** The detail line of a block: what the event is about, from the event itself. */
function detailOf(role: ChainRole, e: LedgerEvent): string | undefined {
  const snapshotWord = copy.gfxB.snapshot;
  switch (role) {
    case "write":
      return baseName(toolLine(e.payload));
    case "delete":
    case "cat":
      return toolLine(e.payload);
    case "snapshot":
      return `${snapshotWord} ${need("payload.id", e.payload.id)}`;
    case "rewind":
      return `${snapshotWord} ${need("payload.snapshot", e.payload.snapshot)}`;
    case "rewound":
      return `${snapshotWord} ${need("payload.to_snapshot", e.payload.to_snapshot)}`;
    case "recreated":
      return undefined;
  }
}

/** The status pin of a block: the snapshot is info (blue-grey), the verified rewind is ok (S4 data throws unless it matched); the rest have none. */
function toneOf(role: ChainRole): ChainBlock["tone"] {
  return role === "snapshot" ? "info" : role === "rewound" ? "ok" : "plain";
}

interface Layout {
  blocks: ChainBlock[];
  deleteIndex: number;
  x: number;
  y: number;
  w: number;
  gap: number;
  sealLine: string;
  button: { x: number; y: number; w: number; h: number };
  callout: { x: number; y: number };
}

let cached: Layout | null = null;

/** Everything laid out from the evidence (cached: the evidence does not change between frames). */
function layoutOf(): Layout {
  if (cached) return cached;
  const data = s4Data();
  const lay = hashChainLayout(data.chain.length); // throws if the blocks do not fit between the safe margins
  const x = Math.round((STAGE.w - lay.w) / 2);
  const blocks: ChainBlock[] = data.chain.map(({ role, event }, i) => ({
    label: event.type,
    hash: event.hash,
    prevHash: event.prev_hash,
    tone: toneOf(role),
    detail: detailOf(role, event),
    gapBefore: i === 0 ? 0 : event.id - data.chain[i - 1].event.id - 1,
  }));
  const deleteIndex = data.chain.findIndex((c) => c.role === "delete");
  if (deleteIndex < 0) throw new Error("S4b5: the chain has no delete block (the wipe)");
  const sealLine = `${copy.rep.intact} \u00b7 ${data.seal.events} ${copy.gfxB.events} \u00b7 ${copy.rep.head} ${data.seal.short}`;

  const sealCy = CHAIN_Y + CHAIN_BLOCK_H + SEAL_DROP;
  const buttonW = Math.round(copy.rep.verify.length * BUTTON.font * MONO_ADVANCE + 2 * BUTTON.padX);
  const button = { x, y: sealCy - BUTTON.h / 2, w: buttonW, h: BUTTON.h };
  const deleteLeft = x + deleteIndex * (220 + lay.gap);

  // the seal's line must fit between the button and the seal (HashChain: its right edge is 22 px left of the seal's ring)
  const sealCx = x + lay.w - SEAL_R - 6;
  const lineRight = sealCx - SEAL_R - SEAL_GAP;
  const lineLeft = lineRight - sealLine.length * SEAL_FONT * MONO_ADVANCE;
  if (!(lineLeft >= button.x + button.w + 48)) {
    throw new Error(`S4b5: the seal's line (${sealLine.length} characters) runs from x ${lineLeft.toFixed(0)}, into the button (which ends at x ${button.x + button.w}): shorten it or move the button`);
  }
  cached = { blocks, deleteIndex, x, y: CHAIN_Y, w: lay.w, gap: lay.gap, sealLine, button, callout: { x: deleteLeft + 110, y: CHAIN_Y } };
  return cached;
}

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S4_TIMING;
  if (!(S4B5_CAMERA[0].frame > t.partEndB4)) throw new Error("S4b5: the first keyframe must start after 16d's last frame (f2819)");
  const last = S4B5_CAMERA[S4B5_CAMERA.length - 1];
  if (!(last.frame + (last.frames ?? 0) <= t.partEndB5)) throw new Error("S4b5: the camera must have arrived by the last frame of the part (f3029): 16f's first keyframe starts at f3030 or later");
  layoutOf(); // throws now, naming what is missing, if the evidence cannot make the chain, or the line does not fit
})();

// ---------------------------------------------------------------------------------------------- the overlay

export const S4b5: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S4_TIMING;
  const layer = s4LedgerOpacity(frame);
  if (frame < t.scrim.from || layer <= 0) return null;
  const L = layoutOf();
  const press = s4PressSqueeze(frame);
  const ripple = s4PressRipple(frame);
  const buttonIn = s4ButtonIn(frame);
  const verifying = frame >= t.press.at;
  const b = L.button;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: layer, pointerEvents: "none" }}>
      {/* the scrim: the Lab stays behind it */}
      <div style={{ position: "absolute", inset: 0, background: theme.paper, opacity: s4ScrimProgress(frame) * t.scrim.alpha }} />

      {frame >= t.chain.from - 2 ? (
        <HashChain
          x={L.x}
          y={L.y}
          blocks={L.blocks}
          revealProgress={s4ChainReveal(frame)}
          highlightIndex={L.deleteIndex}
          pulse={s4ChainPulse(frame)}
          verifyProgress={s4VerifyProgress(frame)}
          sealLabel={L.sealLine}
          hashLabel={copy.gfxB.hash}
          prevLabel={copy.gfxB.prev}
        />
      ) : null}

      {/* the button: the Report page's own label, pressed once */}
      {buttonIn > 0 ? (
        <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, opacity: buttonIn * (verifying ? 0.6 : 1), transform: `scale(${(1 - 0.06 * press).toFixed(4)})` }}>
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              borderRadius: 10,
              border: `1.5px solid ${theme.rule2}`,
              background: alpha(theme.sheet, 0.95),
              boxShadow: theme.panelShadow,
              fontFamily: fonts.mono,
              fontSize: BUTTON.font,
              lineHeight: 1,
              color: theme.ink,
              whiteSpace: "nowrap",
            }}
          >
            {copy.rep.verify}
          </div>
          {ripple > 0 && ripple < 1 ? (
            <div
              style={{
                position: "absolute",
                left: b.w / 2 - (8 + 36 * ripple),
                top: b.h / 2 - (8 + 36 * ripple),
                width: 2 * (8 + 36 * ripple),
                height: 2 * (8 + 36 * ripple),
                borderRadius: "50%",
                border: `2px solid ${theme.accent}`,
                opacity: 0.5 * (1 - ripple),
              }}
            />
          ) : null}
        </div>
      ) : null}

      {/* "Undone, not erased." on the top edge of the delete block */}
      <Callout text={copy.s4.calloutUndone} variant="note" target={L.callout} side="top" startFrame={t.callout.from} endFrame={t.callout.to} />
    </div>
  );
};
