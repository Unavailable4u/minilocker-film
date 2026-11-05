// S4Stage (patch 15b): the persistent stage object of scene S4a, ONE object drawn from f2240 on. It is not part of S4a2 / S4a3 because all of them act on it
// (the way S3Box is shared by S3a, S3b and S3c): 15b builds it (the backing panel, the FileLattice intact, the SnapshotTimeline rail with node 1);
// 15c extends it with the wipe (the command typed above the lattice, the shatter and the drain, the huge output, the shake the stage shares with the camera);
// patch 16 extends it again with the rewind: 16a (f2400-2459) retires the slab and the command, adds the greyed snapshot(s), the pulse, the GhostContainer
// and the blue "rewound" node; 16b makes the lattice reassemble inside the container. Those patches resend THIS file and `shared.tsx`; every addition is marked
// with its patch.
//
// It draws in STAGE space, above the camera layer and below the captions. Everything it shows is a pure function of the global frame (shared.tsx
// `s4PanelProgress`, `s4LatticeState`, `s4RailProgress`, `s4NodeProgress`), and every word and number is the evidence's, through `s4Data()`:
//   - the hero tile's label is the file the attack writes (`data.write.path`, the file name only: the tile is 192 px wide);
//   - node 1 is the snapshot the rewind goes back to: its number and its real SHA-256 (the timeline prints the first 8 hex).
// The other 20 tiles are a schematic of "a workspace" and say so (copy.gfxB.schematic), as FileLattice requires.
import React from "react";
import { alpha, fonts, hatch, theme } from "../../config/theme";
import { copy } from "../../config/copy";
import { FileLattice } from "../../gfx/FileLattice";
import { GhostContainer } from "../../gfx/GhostContainer"; // 16a
import { SnapshotTimeline, type SnapshotNode } from "../../gfx/SnapshotTimeline";
import type { SceneOverlayProps } from "../types";
import { s4Data } from "./data";
import {
  S4_COMMAND,
  S4_GHOST, // 16a
  S4_LATTICE,
  S4_LATTICE_AT,
  S4_PANEL,
  S4_RAIL,
  S4_TETHER_TO, // 16a
  S4_TIMING,
  s4CommandChars,
  s4CommandCursor,
  s4CommandLayout,
  s4CommandOpacity,
  s4DiscardedProgress, // 16a
  s4FootnoteOn, // 16a
  s4GhostDraw, // 16a
  s4LatticeState,
  s4NodeProgress,
  s4PanelProgress,
  s4PulseProgress, // 16a
  s4RailProgress,
  s4RewoundProgress, // 16a
  s4Shake,
  s4TokenLayout,
  s4TokenState,
} from "./shared";

const gfxB = copy.gfxB;

/** The file name of an evidence path: "/workspace/precious.txt" -> "precious.txt". The hero tile is 192 px wide, so it shows the name, not the path. */
function fileName(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

export const S4Stage: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S4_TIMING.panel.from) return null;
  const data = s4Data();
  const panel = s4PanelProgress(frame);
  const lat = s4LatticeState(frame);
  const shake = s4Shake(frame);
  const cmd = s4CommandLayout(data.wipe.command);
  const tok = s4TokenState(frame);
  const tokLayout = s4TokenLayout(data.wipe.token);

  // 15b: node 1, the snapshot the rewind goes back to, the newest of the kept ones: crimson ring.
  // 16a: then the snapshots the rewind threw away (greyed, with their real hashes), then the blue node the rewind adds (the same snapshot number and hash as
  // node 1, joined to it by its arc). Their progress is 0 before f2400, and SnapshotTimeline draws nothing for a node at 0.
  const nodes: SnapshotNode[] = [
    { n: data.snapshot.n, hash: data.snapshot.hash, state: "current" },
    ...data.rewound.discarded.map((d): SnapshotNode => ({ n: d.n, hash: d.hash, state: "greyed" })),
    { n: data.rewound.toSnapshot, hash: data.rewound.restoredHash, state: "rewound" },
  ];
  const nodeProgress = [s4NodeProgress(frame), ...data.rewound.discarded.map((_, i) => s4DiscardedProgress(frame, i)), s4RewoundProgress(frame)];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        // 15c: the camera's impact shake of the wipe, shared with the stage (zero outside f2340-2347)
        transform: `translate(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: S4_PANEL.x,
          top: S4_PANEL.y,
          width: S4_PANEL.w,
          height: S4_PANEL.h,
          boxSizing: "border-box",
          borderRadius: S4_PANEL.radius,
          border: `1.5px solid ${theme.rule2}`,
          background: theme.paper,
          boxShadow: theme.panelShadow,
          opacity: panel,
          // the sheet drops in from above (its top is off the stage)
          transform: `translateY(${((1 - panel) * -48).toFixed(2)}px)`,
        }}
      />
      {/* 16b: the timeline is drawn BEFORE the lattice (it used to follow the container): the pulse's faint line, which stays after it has arrived, then runs
          behind the tiles when they return instead of across them. Its nodes and rail are outside the panel, so nothing else overlaps. */}
      <SnapshotTimeline
        nodes={nodes}
        nodeProgress={nodeProgress}
        tether={{ fromIndex: 0, toX: S4_TETHER_TO.x, toY: S4_TETHER_TO.y, progress: s4PulseProgress(frame) }}
        y={S4_RAIL.y}
        x0={S4_RAIL.x0}
        x1={S4_RAIL.x1}
        railProgress={s4RailProgress(frame)}
        nodeWord={gfxB.snapshot}
        rewoundLabel={gfxB.restoredInto}
      />
      <FileLattice
        x={S4_LATTICE_AT.x}
        y={S4_LATTICE_AT.y}
        count={S4_LATTICE.count}
        columns={S4_LATTICE.columns}
        heroIndex={S4_LATTICE.heroIndex}
        heroLabel={fileName(data.write.path)}
        seed={S4_LATTICE.seed}
        intact={lat.intact}
        shatter={lat.shatter}
        reassemble={lat.reassemble}
        desaturate={lat.desaturate}
        footnote={s4FootnoteOn(frame) ? gfxB.schematic : undefined}
      />
      {/* 15c: the output of the wipe, huge, in the place of the lattice (a hatched slab: red never carries the meaning alone) */}
      {tok.opacity > 0 ? (
        <div
          style={{
            position: "absolute",
            left: S4_LATTICE_AT.x,
            top: S4_LATTICE_AT.y,
            width: S4_LATTICE_AT.w,
            height: S4_LATTICE_AT.h,
            boxSizing: "border-box",
            borderRadius: 16,
            border: `1.5px solid ${alpha(theme.bad, 0.55)}`,
            background: hatch(theme.bad, 0.12),
            opacity: tok.opacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontWeight: 700,
              fontSize: tokLayout.fontSize,
              lineHeight: 1,
              color: theme.bad,
              whiteSpace: "pre",
              textShadow: `0 0 36px ${alpha(theme.bad, 0.4)}`,
              transform: `scale(${tok.scale.toFixed(4)})`,
            }}
          >
            {data.wipe.token}
          </div>
        </div>
      ) : null}
      {/* 15c: the real wipe command, typed large, in the band above the lattice; dimmed from the wipe */}
      {s4CommandOpacity(frame) > 0 ? (
        <div style={{ position: "absolute", left: S4_COMMAND.x, top: cmd.y, width: S4_PANEL.x + S4_PANEL.w - S4_COMMAND.rightPad - S4_COMMAND.x, height: cmd.h, opacity: s4CommandOpacity(frame) }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: S4_COMMAND.rule, height: cmd.h, borderRadius: 2, background: theme.bad }} />
          <div style={{ position: "absolute", left: cmd.textX - S4_COMMAND.x, top: 0, fontFamily: fonts.mono, fontSize: cmd.fontSize, lineHeight: `${S4_COMMAND.lineHeight}`, color: theme.ink, whiteSpace: "pre" }}>
            {(() => {
              let left = s4CommandChars(frame, cmd.total);
              const typing = cmd.lines.findIndex((l, i) => {
                const before = cmd.lines.slice(0, i).reduce((n, x) => n + x.length, 0);
                return s4CommandChars(frame, cmd.total) < before + l.length;
              });
              const cursorLine = typing === -1 ? cmd.lines.length - 1 : typing;
              return cmd.lines.map((line, i) => {
                const shown = line.slice(0, Math.max(0, left));
                left -= line.length;
                return (
                  <div key={i} style={{ height: cmd.fontSize * S4_COMMAND.lineHeight }}>
                    {shown}
                    {s4CommandCursor(frame) && i === cursorLine ? (
                      <span style={{ display: "inline-block", width: cmd.fontSize * 0.5, height: cmd.fontSize * 0.9, marginLeft: 2, verticalAlign: "-0.12em", background: theme.ink }} />
                    ) : null}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : null}
      {/* 16a: the fresh sandbox, drawn round the empty lattice while the pulse arrives */}
      <GhostContainer x={S4_GHOST.x} y={S4_GHOST.y} w={S4_GHOST.w} h={S4_GHOST.h} draw={s4GhostDraw(frame)} label={gfxB.freshSandbox} />
    </div>
  );
};
