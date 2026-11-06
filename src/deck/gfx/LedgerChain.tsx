// E8a · The ledger strip of slide 10: the film's own HashChain at its finished state (every block shown, the verification swept to the end, the seal closed),
// scaled to the column. Nothing here reads the frame. The blocks come from facts.ledgerChain(), which picks them by role from the rewind attack's real ledger.
//
// Scaling: HashChain draws in stage px (blocks 220 x 136, text 20 to 26 px). Three blocks are 788 px wide, so at a 900 px column the text grows by about 1.14,
// which keeps every line of it at 22 px or more on the slide (the seal line, which a judge reads, is 26 x 1.14 = about 30 px). Four blocks would shrink it below that.
import React from "react";
import { gfxB } from "../../config/copy";
import { CHAIN_SEAL_DROP, HashChain, hashChainLayout, type ChainBlock } from "../../gfx/HashChain";

/** The seal ring's radius plus the glow it draws around itself (HashChain: SEAL_R 32 + 12). */
const SEAL_BELOW = 44;

export interface LedgerChainProps {
  /** Width of the drawing in slide px. */
  width: number;
  blocks: readonly ChainBlock[];
  deleteIndex: number;
  /** "intact · 30 events · head bf7df3a5" (facts.ledgerSealLine). */
  sealLine: string;
}

/** Height of the drawing for `count` blocks at `width` px: the blocks, the drop to the seal and the seal's own radius. */
export function ledgerChainHeight(count: number, width: number): number {
  const { w, h } = hashChainLayout(count);
  return Math.ceil(((h + CHAIN_SEAL_DROP + SEAL_BELOW) * width) / w);
}

export const LedgerChain: React.FC<LedgerChainProps> = ({ width, blocks, deleteIndex, sealLine }) => {
  const { w, h } = hashChainLayout(blocks.length);
  const k = width / w;
  const nativeH = h + CHAIN_SEAL_DROP + SEAL_BELOW;
  return (
    <div style={{ position: "relative", width, height: Math.ceil(nativeH * k) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: nativeH, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <HashChain
          x={0}
          y={0}
          blocks={blocks}
          revealProgress={1}
          highlightIndex={deleteIndex}
          pulse={0}
          verifyProgress={1}
          sealLabel={sealLine}
          hashLabel={gfxB.hash}
          prevLabel={gfxB.prev}
        />
      </div>
    </div>
  );
};
