// E10 · The film's ArchitectureDiagram at its finished state (every node and edge drawn, all three Vultr chips lit, no highlighted path), scaled into a column.
// The diagram is a full 1920 x 1080 stage layer; its content (VM frame, nodes, chips, edge words) sits inside the box ARCH_BOX, so the layer is shifted by the
// box's origin and clipped to its size, then scaled to `width`. Nothing here reads the frame.
//
// The scale is below 0.7 at the column's width, so the film's own text (node titles 24 px, chip lines 20 px) lands at about 13 to 16 px on the slide. That is the
// product's own drawing, the same exception as the scaled film components of patches 3 to 5: everything a judge must read is in the table under the diagram
// (26 px or more), which prints the same three products with the same facts.
import React from "react";
import { copy } from "../../config/copy";
import { ARCH_EDGE_IDS, ARCH_NODE_IDS, ArchitectureDiagram, type ArchChip } from "../../gfx/ArchitectureDiagram";

/** The content's bounding box in stage px, read off a render of the finished diagram. */
export const ARCH_BOX = { x: 138, y: 90, w: 1582, h: 790 } as const;

export const archScaledHeight = (width: number): number => Math.round((ARCH_BOX.h * width) / ARCH_BOX.w);

export const ArchScaled: React.FC<{ width: number; chips: readonly ArchChip[]; showVultrLogo?: boolean }> = ({ width, chips, showVultrLogo = false }) => {
  const k = width / ARCH_BOX.w;
  return (
    <div style={{ position: "relative", width, height: archScaledHeight(width), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: ARCH_BOX.w, height: ARCH_BOX.h, transform: `scale(${k})`, transformOrigin: "0 0", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -ARCH_BOX.x, top: -ARCH_BOX.y, width: 1920, height: 1080 }}>
          <ArchitectureDiagram
            nodeProgress={ARCH_NODE_IDS.map(() => 1)}
            edgeProgress={ARCH_EDGE_IDS.map(() => 1)}
            frameProgress={1}
            highlight="none"
            vultrChip={[1, 1, 1]}
            chips={chips}
            nodes={copy.gfxC.nodes}
            edgeLabels={copy.gfxC.edges}
            clock={0}
            showVultrLogo={showVultrLogo}
          />
        </div>
      </div>
    </div>
  );
};
