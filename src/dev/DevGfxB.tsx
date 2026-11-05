// DEV ONLY (patch 09). Plays the S4 "wipe, then rewind" explainer (src/gfx: FileLattice, HashTile, GhostContainer, SnapshotTimeline,
// HashChain) over DEV_GFX_B_FRAMES frames, in the timing of BIBLE 6 S4 (scene frame = frame + 2160), using the evidence of the
// attack `rewind_after_rm_rf`.
//   f60..100    the FileLattice arrives (scene f2220); caption "Real work. Snapshot after every step."
//   f72, f96    snapshot 0 and snapshot 1 land on the SnapshotTimeline (snapshot 1 with its real 8-hex hash); the playhead follows
//   f130..      the real wipe command types large in mono (right column)
//   f180..210   THE WIPE: tiles shatter outward (30 f), colour drains to 70% saturation; caption "Everything gone."
//   f186        snapshot 2 (taken after the wipe) lands
//   f212        the real output WIPED_0 appears huge in vermilion (taken from the real step result)
//   f240        caption "Rewind."; f244..274 a pulse travels from snapshot 1 to the GhostContainer, which draws on f258..282
//   f276..298   snapshot 2 greys out; the blue "rewound" node arcs back to snapshot 1 ("restored into a fresh sandbox")
//   f300..360   the shards return along eased curves with a 4% overshoot, the colour comes back
//   f326..348   the restored hash locks left to right against the snapshot hash; f348.. the tick pops, the strip edge glows
//   f368        counter "{N} files re-hashed - all matched" (N from timeline.rewound.verified.files)
//   f420..      the real cat output prints (right column); f440 snapshot 3 (taken after the cat) lands
//   f600..650   the lattice scene fades out
//   f660..780   the HashChain of the attack's real ledger events builds; the delete block stays vermilion and hatched
//   f720..      callout "Undone, not erased."
//   f780..840   "Verify ledger" sweep; f852.. the seal and the line "intact - {events} events - head {8 hex}"
// Stills worth taking (use --browser-executable=/usr/bin/google-chrome when the Remotion browser cannot be downloaded):
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-intact.png      --frame=120   (intact, snapshot 1 landed)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-shatter.png     --frame=195   (mid-shatter)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-wiped.png       --frame=232   (empty: WIPED_0)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-rewind.png      --frame=290   (pulse, ghost container, rewound node)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-reassemble.png  --frame=322   (mid-reassemble)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-locking.png     --frame=338   (hash half locked)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-locked.png      --frame=380   (hashes locked, counter)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-chain.png       --frame=770   (chain built, delete block pulsing)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-verified.png    --frame=880   (chain verified, seal)
//   npx remotion still src/index.ts DevGfxB out/qa/gfxb-mismatch.png    --frame=380 --props='{"specimenMismatch":true}'   (the mismatch look)
// Everything shown comes from evidence.json through src/data/select.ts and from src/config/copy.ts. The only literals here are frame
// numbers, positions and developer notes.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { copy } from "../config/copy";
import { alpha, fonts, theme } from "../config/theme";
import { selectAttack, selectAttackEvents, selectAttackVerify } from "../data/select";
import type { LedgerEvent } from "../data/types";
import { parseArgs, toolLine } from "../lib/derive";
import { clamp01, signature } from "../lib/ease";
import { FontsReady } from "../lib/fonts";
import { shortHash } from "../lib/hash";
import { typedText } from "../lib/typing";
import { Caption } from "../fx/Caption";
import { Callout } from "../fx/Callout";
import { FileLattice, latticeSize } from "../gfx/FileLattice";
import { GhostContainer } from "../gfx/GhostContainer";
import { HashChain, hashChainLayout, type ChainBlock } from "../gfx/HashChain";
import { HashTile } from "../gfx/HashTile";
import { SnapshotTimeline, type SnapshotNode } from "../gfx/SnapshotTimeline";
import { STAGE } from "../config/timeline";

export const DEV_GFX_B_FRAMES = 900;

export type DevGfxBProps = {
  /** Dev only: change the last character of the restored hash, to look at the mismatch state. */
  specimenMismatch?: boolean;
};

const ATTACK = "rewind_after_rm_rf";

// layout (stage px)
const LATTICE = { x: 136, y: 146 };
const LAT_COUNT = 24;
const LAT_COLUMNS = 6;
const HERO_INDEX = 8; // row 1, column 2: a 2 x 2 block in the middle of the 6 x 4 lattice
const GHOST_PAD = 40;
const GHOST_PAD_BOTTOM = 76; // room for the lattice footnote inside the container
const RIGHT_X = 880;
const SLOTS = 5;

// timing (dev frame; scene frame = frame + 2160)
const LATTICE_IN = 60;
const LATTICE_IN_FRAMES = 40;
const NODE0 = 72;
const NODE1 = 96;
const WIPE_TYPE = 130;
const WIPE = 180;
const SHATTER_FRAMES = 30;
const DESAT_FRAMES = 12;
const NODE2 = 186;
const WIPED_OUT = 212;
const REWIND_CAPTION = 240;
const TETHER = 244;
const TETHER_FRAMES = 30;
const GHOST = 258;
const GHOST_FRAMES = 24;
const GREY2 = 276;
const REWOUND = 282;
const NODE_FRAMES = 18;
const REASSEMBLE = 300;
const REASSEMBLE_FRAMES = 60;
const HASH_IN = 322;
const LOCK = 326;
const LOCK_FRAMES = 22;
const COUNTER = 368;
const CAT = 420;
const NODE3 = 440;
const SCENE_OUT = 600;
const SCENE_OUT_FRAMES = 40;
const CHAIN = 660;
const CHAIN_FRAMES = 120;
const CALLOUT = 720;
const VERIFY = 780;
const VERIFY_FRAMES = 60;

const lin = (frame: number, start: number, len: number): number => clamp01((frame - start) / Math.max(1, len));

const mono = (px: number, color: string): React.CSSProperties => ({ fontFamily: fonts.mono, fontSize: px, color, lineHeight: 1.25 });

/** The file name of an evidence path: "/workspace/precious.txt" -> "precious.txt". */
function baseName(path: string): string {
  const parts = path.split("/").filter((p) => p.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

/** The text a shell step printed, without the "exit_code=N" first line the sandbox adds. */
function shellOutput(result: string | null): string {
  return (result ?? "").replace(/^exit_code=\d+\n/, "").replace(/\n+$/, "");
}

function need<T>(what: string, v: T | undefined | null): T {
  if (v === undefined || v === null) throw new Error(`DevGfxB: evidence.attacks.${ATTACK} has no ${what}`);
  return v;
}

const Scene: React.FC<DevGfxBProps> = ({ specimenMismatch = false }) => {
  const frame = useCurrentFrame();

  // ---- evidence ----------------------------------------------------------------------------------------------------------
  const result = selectAttack(ATTACK);
  const events = selectAttackEvents(ATTACK);
  const verify = selectAttackVerify(ATTACK);

  const writeStep = need("write_file step", result.steps.find((s) => s.tool === "write_file"));
  const wipeStep = need("wipe step (run_shell)", result.steps.find((s) => s.tool === "run_shell" && /rm\s+-rf/.test(s.text)));
  const catStep = need("cat step (run_shell after the wipe)", result.steps.find((s) => s.tool === "run_shell" && s.index > wipeStep.index));
  const heroLabel = baseName(writeStep.text);
  const wipedToken = need("WIPED_ marker in the wipe step result", (wipeStep.result ?? "").match(/WIPED_\d+/)?.[0]);
  const catText = shellOutput(catStep.result);

  const snaps = events.filter((e) => e.type === "snapshot.created");
  const rewound = need("timeline.rewound event", events.find((e) => e.type === "timeline.rewound"));
  const ver = need("timeline.rewound.verified", rewound.payload.verified as { checked: boolean; matches: boolean; files: number; missing: number; unexpected: number } | undefined);
  if (!ver.checked) throw new Error("DevGfxB: the rewind did not re-hash the restored files, so \"restored hash\" is not measured");
  const toSnapshot = Number(rewound.payload.to_snapshot);
  const discarded = (rewound.payload.discarded ?? []) as number[];
  const snapById = (id: number): LedgerEvent => need(`snapshot.created event for snapshot ${id}`, snaps.find((e) => e.payload.id === id));
  const refSnap = snapById(toSnapshot);
  const afterRewind = need("snapshot.created event after the rewind (the restored workspace's hash)", snaps.find((e) => e.id > rewound.id));
  const refHex = String(refSnap.payload.sha256);
  let restoredHex = String(afterRewind.payload.sha256);
  if (specimenMismatch) restoredHex = restoredHex.slice(0, -1) + (restoredHex.endsWith("0") ? "1" : "0");
  const rehashed = ver.files;

  // ---- timeline nodes ------------------------------------------------------------------------------------------------------
  const snap0 = snapById(0);
  const snap1 = refSnap;
  const snap2 = snapById(discarded.length > 0 ? discarded[0] : 2);
  const snap3 = afterRewind;
  const nodeAt: number[] = [NODE0, NODE1, NODE2, REWOUND, NODE3];
  const shown: { node: SnapshotNode; at: number }[] = [];
  const stateOf = (which: number): SnapshotNode["state"] => {
    if (which === 0) return "taken";
    if (which === 1) return frame >= NODE2 ? "taken" : "current";
    if (which === 2) return frame >= GREY2 ? "greyed" : "current";
    if (which === 3) return "rewound";
    return "current";
  };
  const defs: SnapshotNode[] = [
    { n: Number(snap0.payload.id), hash: String(snap0.payload.sha256), state: stateOf(0) },
    { n: Number(snap1.payload.id), hash: String(snap1.payload.sha256), state: stateOf(1) },
    { n: Number(snap2.payload.id), hash: String(snap2.payload.sha256), state: stateOf(2) },
    { n: toSnapshot, hash: String(rewound.payload.snapshot_sha256), state: stateOf(3) },
    { n: Number(snap3.payload.id), hash: String(snap3.payload.sha256), state: stateOf(4) },
  ];
  defs.forEach((node, i) => {
    if (frame >= nodeAt[i]) shown.push({ node: i === 3 ? { ...node, state: "rewound" } : node, at: nodeAt[i] });
  });
  // while the rewound node is the newest, snapshot 3 is not on the rail yet, so nothing else changes state
  const nodes = shown.map((s) => s.node);
  const nodeProgress = shown.map((s) => lin(frame, s.at, NODE_FRAMES));

  // playhead: node 1, then 2 (after the wipe), then the rewound node, then snapshot 3
  const ease12 = (start: number, len: number) => signature(lin(frame, start, len));
  const playhead = frame < NODE1
    ? undefined
    : 1 + ease12(NODE2, 12) + ease12(REWOUND + 6, 14) + ease12(NODE3, 12);

  // ---- lattice -------------------------------------------------------------------------------------------------------------
  const lat = latticeSize(LAT_COUNT, LAT_COLUMNS);
  const intact = lin(frame, LATTICE_IN, LATTICE_IN_FRAMES);
  const shatter = lin(frame, WIPE, SHATTER_FRAMES);
  const reassemble = lin(frame, REASSEMBLE, REASSEMBLE_FRAMES);
  const desaturate = 0.3 * lin(frame, WIPE, DESAT_FRAMES) * (1 - signature(lin(frame, REASSEMBLE, REASSEMBLE_FRAMES)));
  const ghostW = lat.w + 2 * GHOST_PAD;
  const ghostH = lat.h + GHOST_PAD + GHOST_PAD_BOTTOM;
  const ghost = { x: LATTICE.x - GHOST_PAD, y: LATTICE.y - GHOST_PAD };

  // ---- hash tile -----------------------------------------------------------------------------------------------------------
  const lockP = lin(frame, LOCK, LOCK_FRAMES);
  const tickP = lin(frame, LOCK + LOCK_FRAMES + 2, 12);

  // ---- right column text ---------------------------------------------------------------------------------------------------
  const typedWipe = typedText(wipeStep.text, frame, WIPE_TYPE, { cps: 52 });
  const wipedP = signature(lin(frame, WIPED_OUT, 14));
  const typedCat = typedText(catText, frame, CAT, { cps: 40 });
  const counterP = signature(lin(frame, COUNTER, 14));
  // the counter says "all matched" only if the evidence says so AND the two hashes on screen are equal
  const allMatched = ver.matches && ver.missing === 0 && ver.unexpected === 0 && restoredHex.toLowerCase() === refHex.toLowerCase();
  const counterText = `${rehashed} ${rehashed === 1 ? copy.gfxB.fileRehashed : copy.gfxB.filesRehashed} — ${allMatched ? copy.gfxB.allMatched : copy.gfxB.mismatch}`;

  const sceneOut = 1 - signature(lin(frame, SCENE_OUT, SCENE_OUT_FRAMES));

  // ---- chain ---------------------------------------------------------------------------------------------------------------
  const pick = (what: string, e: LedgerEvent | undefined): LedgerEvent => need(what, e);
  const chosen: LedgerEvent[] = [
    pick("tool.call (write_file)", events.find((e) => e.type === "tool.call" && e.payload.tool === "write_file")),
    pick(`snapshot.created for snapshot ${toSnapshot}`, refSnap),
    pick("tool.call (the wipe)", events.find((e) => e.type === "tool.call" && e.payload.tool === "run_shell" && /rm\s+-rf/.test(String(parseArgs(String(e.payload.args ?? ""))?.cmd ?? e.payload.args)))),
    pick("rewind.requested", events.find((e) => e.type === "rewind.requested")),
    rewound,
    pick("task.end", events.find((e) => e.type === "task.end")),
  ].sort((a, b) => a.id - b.id);
  const detailOf = (e: LedgerEvent): string | undefined => {
    if (e.type === "tool.call") return toolLine(e.payload);
    if (e.type === "snapshot.created") return `${copy.gfxB.snapshot} ${e.payload.id}`;
    if (e.type === "rewind.requested") return `${copy.gfxB.snapshot} ${e.payload.snapshot}`;
    if (e.type === "timeline.rewound") return `${copy.gfxB.snapshot} ${e.payload.to_snapshot}`;
    if (e.type === "task.end") return String(e.payload.status);
    return undefined;
  };
  const toneOf = (e: LedgerEvent): ChainBlock["tone"] =>
    e.type === "snapshot.created" ? "info" : e.type === "timeline.rewound" ? (ver.matches ? "ok" : "bad") : e.type === "task.end" ? (e.payload.status === "finished" ? "ok" : "warn") : "plain";
  const blocks: ChainBlock[] = chosen.map((e, i) => ({
    label: e.type,
    hash: e.hash,
    prevHash: e.prev_hash,
    tone: toneOf(e),
    detail: detailOf(e),
    gapBefore: i === 0 ? 0 : e.id - chosen[i - 1].id - 1,
  }));
  const deleteIndex = chosen.findIndex((e) => e.type === "tool.call" && e.payload.tool === "run_shell");
  const chainLayout = hashChainLayout(blocks.length);
  const chainX = Math.round((STAGE.w - chainLayout.w) / 2);
  const chainY = 380;
  const chainRev = lin(frame, CHAIN, CHAIN_FRAMES);
  const pulse = 0.5 + 0.5 * Math.sin(((frame - CHAIN) / 30) * Math.PI);
  const verifyP = lin(frame, VERIFY, VERIFY_FRAMES);

  if (!verify.verified) throw new Error(`DevGfxB: the ledger of ${ATTACK} did not verify (${verify.detail}); the seal must not be shown`);
  const headHash = need("verify.head_hash", verify.head_hash);
  const sealLine = `${copy.rep.intact} · ${verify.events} ${copy.gfxB.events} · ${copy.rep.head} ${shortHash(headHash)}`;

  // where the callout points: the top edge of the delete block
  const deleteLeft = chainX + deleteIndex * (220 + chainLayout.gap);
  const calloutTarget = { x: deleteLeft + 110, y: chainY };

  // the pulse of the rewind ends at the bottom edge of the ghost container
  const tetherTo = { x: ghost.x + ghostW / 2, y: ghost.y + ghostH + 6 };

  return (
    <AbsoluteFill style={{ background: `${theme.appBackground}, ${theme.stageGradient}`, backgroundSize: `${theme.appBackgroundSize}, auto` }}>
      <div style={{ position: "absolute", left: 40, top: 30, ...mono(20, theme.ink2) }}>DevGfxB · patch 09 · dev only · frame {frame}</div>

      {/* S4a / S4b: lattice, ghost container, hash strip, timeline */}
      <div style={{ position: "absolute", inset: 0, opacity: sceneOut }}>
        <GhostContainer x={ghost.x} y={ghost.y} w={ghostW} h={ghostH} draw={lin(frame, GHOST, GHOST_FRAMES)} label={copy.gfxB.freshSandbox} />

        <FileLattice
          x={LATTICE.x}
          y={LATTICE.y}
          count={LAT_COUNT}
          columns={LAT_COLUMNS}
          heroIndex={HERO_INDEX}
          heroLabel={heroLabel}
          intact={intact}
          shatter={shatter}
          reassemble={reassemble}
          desaturate={desaturate}
          footnote={copy.gfxB.schematic}
        />

        {/* right column: the real commands and outputs (stand-ins for the scene's terminal text) */}
        <div style={{ position: "absolute", left: RIGHT_X, top: 150, width: STAGE.w - 96 - RIGHT_X, ...mono(32, theme.ink), whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {frame >= WIPE_TYPE && frame < REWIND_CAPTION ? typedWipe : ""}
        </div>
        {wipedP > 0 && frame < REWIND_CAPTION ? (
          <div
            style={{
              position: "absolute",
              left: RIGHT_X,
              top: 290,
              fontFamily: fonts.mono,
              fontWeight: 700,
              fontSize: 150,
              lineHeight: 1,
              color: theme.bad,
              opacity: wipedP,
              transform: `translateY(${(1 - wipedP) * 22}px)`,
              textShadow: `0 0 60px ${alpha(theme.bad, 0.35)}`,
            }}
          >
            {wipedToken}
          </div>
        ) : null}

        <HashTile
          x={RIGHT_X}
          y={150}
          finalHex={restoredHex}
          referenceHex={refHex}
          lockProgress={lockP}
          reveal={lin(frame, HASH_IN, 14)}
          tickProgress={tickP}
          clock={frame}
          seed={7}
          snapshotLabel={copy.gfxB.snapshot}
          restoredLabel={copy.gfxB.restored}
          mismatchLabel={copy.gfxB.mismatch}
        />
        <div
          style={{
            position: "absolute",
            left: RIGHT_X,
            top: 326,
            ...mono(30, allMatched ? theme.ok : theme.bad),
            opacity: counterP,
            transform: `translateY(${(1 - counterP) * 10}px)`,
          }}
        >
          {counterText}
        </div>
        <div style={{ position: "absolute", left: RIGHT_X, top: 420, width: STAGE.w - 96 - RIGHT_X, ...mono(34, theme.ink), whiteSpace: "pre-wrap" }}>
          {frame >= CAT ? typedCat : ""}
        </div>

        <SnapshotTimeline
          nodes={nodes}
          nodeProgress={nodeProgress}
          slots={SLOTS}
          railProgress={lin(frame, LATTICE_IN, 30)}
          playhead={playhead}
          tether={{ fromIndex: 1, toX: tetherTo.x, toY: tetherTo.y, progress: lin(frame, TETHER, TETHER_FRAMES) }}
          nodeWord={copy.gfxB.snapshot}
          rewoundLabel={copy.gfxB.restoredInto}
        />
      </div>

      {/* S4 ledger: the chain of the attack's real events */}
      {frame >= CHAIN - 2 ? (
        <HashChain
          x={chainX}
          y={chainY}
          blocks={blocks}
          revealProgress={chainRev}
          highlightIndex={deleteIndex}
          pulse={pulse}
          verifyProgress={verifyP}
          sealLabel={sealLine}
          hashLabel={copy.gfxB.hash}
          prevLabel={copy.gfxB.prev}
        />
      ) : null}

      <Caption text={copy.s4.captionWorks} startFrame={LATTICE_IN} endFrame={WIPE - 6} size={60} />
      <Caption text={copy.s4.captionGone} startFrame={WIPE} endFrame={REWIND_CAPTION} />
      <Caption text={copy.s4.captionRewind} startFrame={REWIND_CAPTION} endFrame={REWIND_CAPTION + 120} />
      <Callout text={copy.s4.calloutUndone} variant="note" target={calloutTarget} side="top" startFrame={CALLOUT} endFrame={CALLOUT + 140} />

      <div style={{ position: "absolute", left: 40, bottom: 30, ...mono(20, theme.ink3) }}>
        {specimenMismatch ? <div>dev specimen: the last character of the restored hash is changed to show the mismatch look</div> : null}
      </div>
    </AbsoluteFill>
  );
};

export const DevGfxB: React.FC<DevGfxBProps> = (props) => (
  <FontsReady>
    <Scene {...props} />
  </FontsReady>
);
