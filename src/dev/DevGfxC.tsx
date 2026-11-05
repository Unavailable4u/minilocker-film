// DEV ONLY (patch 10). Plays the S7 / S8 explainers (src/gfx: ArchitectureDiagram, CompareTable, LimitsCard) one after another, each building
// over 240 frames, DEV_GFX_C_FRAMES = 720 in all. Frame numbers below are GLOBAL (segment B starts at f240, segment C at f480).
//   Segment A, f0..239: the architecture
//     f0..30     the Vultr VM frame draws
//     f10..70    the 12 nodes land (4 f apart), f30..103 the 12 edges draw (5 f apart), packets start to run
//     f125..154  highlight "task" (browser to the egress proxy), chip 1 "Vultr VM" lit at f130
//     f155..189  highlight "model" (control plane to the LLM provider), chip 2 "Vultr Serverless Inference" lit at f160
//     f190..239  highlight "storage" (control plane to the artifact store), chip 3 "Vultr Object Storage" lit at f195
//   Segment B, f240..479: the comparison table. Heads f244, rows f254, f284, f314, then the product row f344; emphasis f350..374
//   Segment C, f480..719: the limits card. Heading f486, lines f504, f534, f564, footnote f594
// Stills worth taking:
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-arch-none.png    --frame=120   (everything built, no highlight)
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-arch-task.png    --frame=148   (highlight: task)
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-arch-model.png   --frame=180   (highlight: model)
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-arch-storage.png --frame=232   (highlight: storage)
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-table.png        --frame=470   (table with emphasis)
//   npx remotion still src/index.ts DevGfxC out/qa/gfxc-limits.png       --frame=640   (limits card)
// Everything drawn comes from src/config/copy.ts and from evidence.json through src/data/select.ts. The only literals here are frame numbers
// and developer notes.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { copy } from "../config/copy";
import { fonts, theme } from "../config/theme";
import { selectInfra, selectMeta } from "../data/select";
import { clamp01 } from "../lib/ease";
import { FontsReady } from "../lib/fonts";
import { ARCH_EDGE_IDS, ARCH_NODE_IDS, ArchitectureDiagram, type ArchChip, type ArchHighlight } from "../gfx/ArchitectureDiagram";
import { CompareTable } from "../gfx/CompareTable";
import { LimitsCard } from "../gfx/LimitsCard";

export const DEV_GFX_C_FRAMES = 720;

const SEGMENT = 240;

const lin = (frame: number, start: number, len: number): number => clamp01((frame - start) / Math.max(1, len));
const note = (px: number, color: string): React.CSSProperties => ({ fontFamily: fonts.mono, fontSize: px, color, lineHeight: 1.3 });

/**
 * The three chips of the architecture, from the evidence. Each Vultr claim is made only if /api/infra said it is true (BIBLE 10.9):
 * a deployment that is not a Vultr VM, or that does not use Vultr inference or storage, throws instead of drawing the chip.
 */
function architectureChips(): ArchChip[] {
  const infra = selectInfra();
  const vm = infra.vultr;
  if (!vm.available || !vm.hostname || !vm.region) {
    throw new Error("DevGfxC: evidence.infra.vultr has no hostname and region, so \"Vultr VM\" cannot be claimed. Re-capture from the Vultr VM with \"npm run evidence\".");
  }
  const inf = infra.inference;
  if (!inf.vultr || !inf.host || !inf.model) {
    throw new Error("DevGfxC: evidence.infra.inference is not Vultr Serverless Inference with a host and a model. Re-capture with \"npm run evidence\".");
  }
  if (!infra.storage.vultr || !infra.storage.attached) {
    throw new Error("DevGfxC: evidence.infra.storage is not an attached Vultr Object Storage. Re-capture with \"npm run evidence\".");
  }
  return [
    { name: copy.s8.lowerThirds[0], facts: vm.plan ? `${vm.hostname} · ${vm.region} · ${vm.plan}` : `${vm.hostname} · ${vm.region}` },
    { name: copy.s8.lowerThirds[1], facts: `${inf.host} · ${inf.model}` },
    { name: copy.s8.lowerThirds[2], facts: copy.gfxC.storageFacts },
  ];
}

// ------------------------------------------------------------------------------------------ segment A: architecture

const HL_TASK = 125;
const HL_MODEL = 155;
const HL_STORAGE = 190;

const ArchitectureSegment: React.FC<{ f: number }> = ({ f }) => {
  const chips = architectureChips();

  let highlight: ArchHighlight = "none";
  let amount = 1;
  if (f >= HL_STORAGE) {
    highlight = "storage";
    amount = lin(f, HL_STORAGE, 12);
  } else if (f >= HL_MODEL) {
    highlight = "model";
    amount = Math.min(lin(f, HL_MODEL, 12), 1 - lin(f, HL_STORAGE - 8, 8));
  } else if (f >= HL_TASK) {
    highlight = "task";
    amount = Math.min(lin(f, HL_TASK, 12), 1 - lin(f, HL_MODEL - 8, 8));
  }

  return (
    <ArchitectureDiagram
      frameProgress={lin(f, 0, 30)}
      nodeProgress={ARCH_NODE_IDS.map((_, i) => lin(f, 10 + 4 * i, 16))}
      edgeProgress={ARCH_EDGE_IDS.map((_, i) => lin(f, 30 + 5 * i, 18))}
      highlight={highlight}
      highlightAmount={amount}
      vultrChip={[lin(f, 130, 16), lin(f, 160, 16), lin(f, 195, 16)]}
      chips={chips}
      nodes={copy.gfxC.nodes}
      edgeLabels={copy.gfxC.edges}
      clock={f}
    />
  );
};

// ------------------------------------------------------------------------------------------ segment B: table

const TableSegment: React.FC<{ f: number }> = ({ f }) => {
  const rows = copy.s7.rows;
  return (
    <CompareTable
      rows={rows}
      columns={copy.gfxC.compareColumns}
      marks={copy.gfxC.compareMarks}
      legend={copy.gfxC.compareLegend}
      headerProgress={lin(f, 4, 18)}
      rowProgress={[lin(f, 14, 24), lin(f, 44, 24), lin(f, 74, 24), lin(f, 104, 24)]}
      emphasis={lin(f, 110, 24)}
    />
  );
};

// ------------------------------------------------------------------------------------------ segment C: limits

const LimitsSegment: React.FC<{ f: number }> = ({ f }) => (
  <LimitsCard
    title={copy.gfxC.limitsTitle}
    lines={copy.s8.limits}
    footnote={copy.gfxC.limitsFootnote}
    titleProgress={lin(f, 6, 18)}
    lineProgress={[lin(f, 24, 18), lin(f, 54, 18), lin(f, 84, 18)]}
    footnoteProgress={lin(f, 114, 16)}
  />
);

// ------------------------------------------------------------------------------------------ composition

const NAMES = ["A architecture", "B comparison table", "C limits card"] as const;

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const seg = Math.min(2, Math.floor(frame / SEGMENT));
  const f = frame - seg * SEGMENT;
  const sample = selectMeta().sample;

  return (
    <AbsoluteFill style={{ background: `${theme.appBackground}, ${theme.stageGradient}`, backgroundSize: `${theme.appBackgroundSize}, auto` }}>
      <div style={{ position: "absolute", left: 40, top: 30, ...note(20, theme.ink2) }}>
        DevGfxC · patch 10 · dev only · {NAMES[seg]} · frame {frame}
        {sample ? " · SAMPLE evidence" : ""}
      </div>
      {seg === 0 ? <ArchitectureSegment f={f} /> : null}
      {seg === 1 ? <TableSegment f={f} /> : null}
      {seg === 2 ? <LimitsSegment f={f} /> : null}
    </AbsoluteFill>
  );
};

export const DevGfxC: React.FC = () => (
  <FontsReady>
    <Scene />
  </FontsReady>
);
