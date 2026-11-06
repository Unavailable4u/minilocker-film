// E5 · Three-panel storyboard (slide 07). The film's S4 on one page: three panels in time order (real work, everything gone, rewind) with a thin arrow
// between them, and ONE snapshot rail under all three, so each snapshot sits under the panel it belongs to: snapshots 0 and 1 under the real work, the
// snapshot taken after the wipe (greyed: the rewind threw it away) under the wipe, the blue rewound node under the rewind.
//
// It is the film's own FileLattice, GhostContainer, HashTile and SnapshotTimeline at their finished states, scaled into the panels; nothing here reads the
// frame. Only the hero tile of a lattice stands for a real file: the rest is a schematic of a workspace (copy.gfxB.schematic says so under panel 1).
// Every word is a prop (copy.ts / words.ts) and every hash, file name, command and count is a prop read from the evidence (src/deck/facts.ts).
//
// Where it differs from the film, on purpose:
//   - The lattice is 4 x 2 cells (the film's is 6 x 4): at the panel's width a 6 x 4 lattice would put the hero tile's file name at about 12 px.
//   - ONE rail under the three panels instead of one per panel. SnapshotTimeline's labels are one line of about 200 px each: three nodes do not fit in a
//     540 px panel without overlapping, but they fit and line up under the panels on a full-width rail.
import React from "react";
import { alpha, fonts, hatch, theme } from "../../config/theme";
import { FileLattice, latticeSize } from "../../gfx/FileLattice";
import { GhostContainer } from "../../gfx/GhostContainer";
import { HashTile, hashTileSize } from "../../gfx/HashTile";
import { SnapshotTimeline, timelineNodeX, type SnapshotNode } from "../../gfx/SnapshotTimeline";
import { Dot, Tag } from "../kit";

/** The lattice every panel draws: 8 cells in 4 columns, the hero tile (2 x 2 cells) starting at cell 1, so four small tiles surround it. */
const LATTICE = { count: 8, columns: 4, heroIndex: 1, seed: 11 } as const;
const LAT = latticeSize(LATTICE.count, LATTICE.columns);

export const STORY_ARROW_W = 54;
export const STORY_PANEL_H = 416;
/** The rail's own height below the panels: the arc and its callout above the line, the node labels and the rewound caption below it. */
export const STORY_RAIL_ZONE_H = 192;
/** Height of the whole drawing. */
export const STORY_H = STORY_PANEL_H + STORY_RAIL_ZONE_H;
/** Rail line, in the rail zone's own px (the arc is 66 px tall and the callout sits on its crown). */
const RAIL_Y = 100;
/** SnapshotTimeline's own slot count: kept + discarded snapshots fill the first slots, the rewound node takes the last. */
const RAIL_SLOTS = 5;

const PAD = 18;
const CAPTION_FONT = 34;

export interface Storyboard3Props {
  /** Width of the whole drawing in slide px (three panels and two arrows). */
  width: number;
  /** copy.s4.captionWorks / captionGone / captionRewind. */
  captions: readonly [string, string, string];
  /** The hero tile's label: the real file name (rewindStory().file). */
  file: string;
  /** "wrote" and the real path of the write_file step. */
  wrote: { word: string; path: string };
  /** The real wipe command (split at its ";" into lines) and the line it printed. */
  wipe: { command: string; token: string };
  /** copy.gfxB.schematic, printed under panel 1. */
  schematic: string;
  /** copy.gfxB.freshSandbox: the chip on the ghost container. */
  freshSandbox: string;
  /** The hash tile of panel 3: the first `hexShown` hex of the snapshot's hash and of the restored hash, and the film's three words. */
  hash: { snapshot: string; restored: string; hexShown: number; words: { snapshot: string; restored: string; mismatch: string } };
  /** "1 file re-hashed - all matched", already assembled (words from copy.gfxB, the count from the ledger). */
  counter: string;
  /** The rail: snapshots in time order (kept, then discarded) and the rewound node; the words are copy.gfxB.snapshot / restoredInto. */
  rail: { kept: readonly { n: number; hash: string }[]; discarded: readonly { n: number; hash: string }[]; restored: { n: number; hash: string }; nodeWord: string; rewoundLabel: string };
  /** copy.s4.calloutUndone, on the rewind's arc. */
  undone: string;
}

/** Width of one panel for a drawing `width` wide. */
export function storyPanelW(width: number): number {
  return Math.floor((width - 2 * STORY_ARROW_W) / 3);
}

/** Where the rail line sits, in slide px from the top of the drawing (the proof line in the slide hangs under it). */
export const STORY_RAIL_Y = STORY_PANEL_H + RAIL_Y;

/** A drawing of `w` x `h` px, scaled by `k` and placed at (`left`, `top`) in its parent. */
const Scaled: React.FC<{ left: number; top: number; w: number; h: number; k: number; children: React.ReactNode }> = ({ left, top, w, h, k, children }) => (
  <div style={{ position: "absolute", left, top, width: w * k, height: h * k }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `scale(${k})`, transformOrigin: "0 0" }}>{children}</div>
  </div>
);

const Panel: React.FC<{ left: number; width: number; n: number; caption: string; children: React.ReactNode }> = ({ left, width, n, caption, children }) => (
  <div
    style={{
      position: "absolute", left, top: 0, width, height: STORY_PANEL_H, boxSizing: "border-box", overflow: "hidden", borderRadius: 20,
      border: `1.5px solid ${theme.rule2}`, background: theme.sheet, boxShadow: theme.panelShadow,
    }}
  >
    <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, display: "flex", gap: 16, alignItems: "flex-start" }}>
      <Dot n={n} size={40} />
      <div style={{ fontFamily: fonts.serif, fontSize: CAPTION_FONT, lineHeight: 1.12, color: theme.ink, paddingTop: 1 }}>{caption}</div>
    </div>
    {children}
  </div>
);

/** A thin arrow between two panels, in the gap. */
const Arrow: React.FC<{ left: number }> = ({ left }) => (
  <svg width={STORY_ARROW_W} height={24} viewBox={`0 0 ${STORY_ARROW_W} 24`} style={{ position: "absolute", left, top: STORY_PANEL_H / 2 - 12 }}>
    <line x1={8} y1={12} x2={STORY_ARROW_W - 17} y2={12} stroke={theme.ink3} strokeWidth={2.5} strokeLinecap="round" />
    <polygon points={`${STORY_ARROW_W - 8},12 ${STORY_ARROW_W - 21},4 ${STORY_ARROW_W - 21},20`} fill={theme.ink3} />
  </svg>
);

/** The wipe command as the film types it: the real text, one line per command (split after each ";"), a vermilion rule beside it. */
const Command: React.FC<{ command: string; left: number; top: number; width: number }> = ({ command, left, top, width }) => {
  const lines = command.split(/(?<=;)\s+/);
  return (
    <div style={{ position: "absolute", left, top, width, display: "flex", gap: 14 }}>
      <div style={{ flex: "none", width: 4, borderRadius: 2, background: theme.bad }} />
      <div style={{ fontFamily: fonts.mono, fontSize: 24, lineHeight: 1.4, color: theme.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export const Storyboard3: React.FC<Storyboard3Props> = ({ width, captions, file, wrote, wipe, schematic, freshSandbox, hash, counter, rail, undone }) => {
  const pw = storyPanelW(width);
  const left = (i: number): number => i * (pw + STORY_ARROW_W);
  const inner = pw - 2 * PAD;

  // panel 1 and 2: the lattice at 0.9, centred in the panel
  const k1 = 0.9;
  const latW = LAT.w * k1;
  const latH = LAT.h * k1;
  const latLeft = (pw - latW) / 2;

  // panel 3: the lattice at 0.5 inside the fresh sandbox, then the hash tile and the counter
  const k3 = 0.5;
  const ghostPad = 14;
  const ghostW = LAT.w * k3 + 2 * ghostPad;
  const ghostH = LAT.h * k3 + 2 * ghostPad;
  const ghostTop = PAD + 44 + 12 + 16;
  const tileSize = hashTileSize(hash.hexShown);
  const tileTop = ghostTop + ghostH + 16;
  const counterTop = tileTop + tileSize.h + 10;

  // the rail: the kept and discarded snapshots in the first slots, the rewound node in the last (slots in between stay empty, nodeProgress 0)
  const real: SnapshotNode[] = [
    ...rail.kept.map((s, i): SnapshotNode => ({ n: s.n, hash: s.hash, state: i === rail.kept.length - 1 ? "current" : "taken" })),
    ...rail.discarded.map((s): SnapshotNode => ({ n: s.n, hash: s.hash, state: "greyed" })),
  ];
  if (real.length > RAIL_SLOTS - 1) throw new Error(`Storyboard3: ${real.length} snapshots do not fit the rail (${RAIL_SLOTS - 1} slots before the rewound node)`);
  const blank: SnapshotNode = { n: -1, hash: "0".repeat(64), state: "taken" };
  const nodes: SnapshotNode[] = [...real, ...Array.from({ length: RAIL_SLOTS - 1 - real.length }, () => blank), { n: rail.restored.n, hash: rail.restored.hash, state: "rewound" }];
  const nodeProgress = nodes.map((_, i) => (i < real.length || i === nodes.length - 1 ? 1 : 0));
  // the arc runs from the kept snapshot the rewind goes back to, to the rewound node: its crown is half way, 62 px above the rail
  const from = timelineNodeX(rail.kept.length - 1, RAIL_SLOTS, 0, width);
  const to = timelineNodeX(RAIL_SLOTS - 1, RAIL_SLOTS, 0, width);

  return (
    <div style={{ position: "relative", width, height: STORY_H }}>
      {/* 1 · real work */}
      <Panel left={left(0)} width={pw} n={1} caption={captions[0]}>
        <Scaled left={latLeft} top={PAD + 84 + 10} w={LAT.w} h={LAT.h} k={k1}>
          <FileLattice x={0} y={0} count={LATTICE.count} columns={LATTICE.columns} heroIndex={LATTICE.heroIndex} heroLabel={file} seed={LATTICE.seed} />
        </Scaled>
        <div style={{ position: "absolute", left: PAD, top: PAD + 84 + 10 + latH + 12, width: inner, fontFamily: fonts.mono, fontSize: 24, lineHeight: 1.3, color: theme.ink2, whiteSpace: "nowrap" }}>
          {wrote.word} <span style={{ color: theme.ink }}>{wrote.path}</span>
        </div>
        <div style={{ position: "absolute", left: PAD, top: PAD + 84 + 10 + latH + 12 + 40, width: inner, fontFamily: fonts.mono, fontSize: 22, lineHeight: 1.3, color: theme.ink3 }}>{schematic}</div>
      </Panel>

      <Arrow left={left(0) + pw} />

      {/* 2 · everything gone */}
      <Panel left={left(1)} width={pw} n={2} caption={captions[1]}>
        <Command command={wipe.command} left={PAD} top={PAD + 44 + 10} width={inner} />
        <div style={{ position: "absolute", left: 0, top: PAD + 44 + 10 + 76 + 14, width: pw, height: latH + 24, overflow: "hidden" }}>
          <Scaled left={latLeft} top={12} w={LAT.w} h={LAT.h} k={k1}>
            <FileLattice x={0} y={0} count={LATTICE.count} columns={LATTICE.columns} heroIndex={LATTICE.heroIndex} heroLabel={file} seed={LATTICE.seed} shatter={0.7} desaturate={0.7} />
          </Scaled>
          <div
            style={{
              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", boxSizing: "border-box", padding: "10px 30px", borderRadius: 16,
              border: `1.5px solid ${alpha(theme.bad, 0.6)}`, background: `${hatch(theme.bad, 0.14)}, ${alpha(theme.sheet, 0.94)}`,
              fontFamily: fonts.mono, fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: theme.bad, whiteSpace: "pre", boxShadow: `0 0 36px ${alpha(theme.bad, 0.22)}`,
            }}
          >
            {wipe.token}
          </div>
        </div>
      </Panel>

      <Arrow left={left(1) + pw} />

      {/* 3 · rewind */}
      <Panel left={left(2)} width={pw} n={3} caption={captions[2]}>
        <GhostContainer x={(pw - ghostW) / 2} y={ghostTop} w={ghostW} h={ghostH} draw={1} label={freshSandbox}>
          <Scaled left={ghostPad} top={ghostPad} w={LAT.w} h={LAT.h} k={k3}>
            <FileLattice x={0} y={0} count={LATTICE.count} columns={LATTICE.columns} heroIndex={LATTICE.heroIndex} heroLabel={file} seed={LATTICE.seed} shatter={1} reassemble={1} />
          </Scaled>
        </GhostContainer>
        <HashTile
          x={(pw - tileSize.w) / 2}
          y={tileTop}
          finalHex={hash.restored.slice(0, hash.hexShown)}
          referenceHex={hash.snapshot.slice(0, hash.hexShown)}
          lockProgress={1}
          tickProgress={1}
          snapshotLabel={hash.words.snapshot}
          restoredLabel={hash.words.restored}
          mismatchLabel={hash.words.mismatch}
        />
        <div style={{ position: "absolute", left: 0, top: counterTop, width: pw, textAlign: "center", fontFamily: fonts.mono, fontSize: 26, lineHeight: 1.3, color: theme.ok, whiteSpace: "nowrap" }}>{counter}</div>
      </Panel>

      {/* the rail: one for the three panels, snapshots in time order, the rewind as a blue arc back to the snapshot it restored */}
      <div style={{ position: "absolute", left: 0, top: STORY_PANEL_H, width, height: STORY_RAIL_ZONE_H }}>
        <SnapshotTimeline nodes={nodes} nodeProgress={nodeProgress} slots={RAIL_SLOTS} y={RAIL_Y} x0={0} x1={width} nodeWord={rail.nodeWord} rewoundLabel={rail.rewoundLabel} />
        <div style={{ position: "absolute", left: (from + to) / 2, top: RAIL_Y - 62, transform: "translate(-50%, -50%)" }}>
          <Tag>{undone}</Tag>
        </div>
      </div>
    </div>
  );
};
