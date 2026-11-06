// E2 · Four-node loop (slide 04). Pattern A as the film's flow strip draws it (copy.s2.flow): the model writes code, it runs in a container, the real
// output returns, the model explains and any error is fed back. The last node loops to the first: the return arrow is the one crimson line.
//
// Static and props-driven: nothing reads the frame. Every word is a prop. The node that is the container (`contained`) takes the blue of "contained",
// because the status colours mean status only. Node text is serif 32 (above the deck's 28 px floor).
import React from "react";
import { fonts, theme } from "../../config/theme";

export interface LoopStripProps {
  /** copy.s2.flow: the node texts in order; the last one loops back to the first. */
  nodes: readonly string[];
  /** Width of the whole strip in slide px. */
  width: number;
  /** Index of the node that runs inside the container (drawn in the "contained" blue). */
  contained?: number;
}

export const LOOP_NODE_H = 104;
/** Room under the nodes for the return arrow. */
export const LOOP_RETURN_H = 40;
export const LOOP_H = LOOP_NODE_H + LOOP_RETURN_H;
const GAP = 76;

export const LoopStrip: React.FC<LoopStripProps> = ({ nodes, width, contained }) => {
  const n = nodes.length;
  if (n < 2) throw new Error("LoopStrip: needs at least two nodes");
  const nodeW = (width - (n - 1) * GAP) / n;
  const left = (i: number): number => i * (nodeW + GAP);
  const midY = LOOP_NODE_H / 2;
  const retY = LOOP_NODE_H + LOOP_RETURN_H - 8;
  const x1 = left(0) + nodeW / 2;
  const x4 = left(n - 1) + nodeW / 2;
  return (
    <div style={{ position: "relative", width, height: LOOP_H }}>
      {nodes.map((text, i) => {
        const isContained = i === contained;
        return (
          <div
            key={text}
            style={{
              position: "absolute",
              left: left(i),
              top: 0,
              width: nodeW,
              height: LOOP_NODE_H,
              boxSizing: "border-box",
              borderRadius: 14,
              padding: "0 22px 0 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: theme.sheet,
              border: `${isContained ? 2.5 : 1.5}px solid ${isContained ? theme.ok : theme.rule2}`,
              boxShadow: theme.panelShadow,
            }}
          >
            <span style={{ flex: "none", fontFamily: fonts.mono, fontSize: 28, color: isContained ? theme.ok : theme.ink3 }}>{i + 1}</span>
            <span style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 1.12, color: theme.ink }}>{text}</span>
          </div>
        );
      })}
      <svg width={width} height={LOOP_H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* forward arrows, between the nodes */}
        {nodes.slice(0, -1).map((_, i) => {
          const xa = left(i) + nodeW + 10;
          const xb = left(i + 1) - 12;
          return (
            <g key={i}>
              <line x1={xa} y1={midY} x2={xb - 6} y2={midY} stroke={theme.ink3} strokeWidth={2.5} strokeLinecap="round" />
              <polygon points={`${xb},${midY} ${xb - 13},${midY - 8} ${xb - 13},${midY + 8}`} fill={theme.ink3} />
            </g>
          );
        })}
        {/* the loop: from the last node, under the strip, back up into the first */}
        <path
          d={`M ${x4} ${LOOP_NODE_H + 2} L ${x4} ${retY} L ${x1} ${retY} L ${x1} ${LOOP_NODE_H + 16}`}
          fill="none"
          stroke={theme.accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points={`${x1},${LOOP_NODE_H + 4} ${x1 - 8},${LOOP_NODE_H + 18} ${x1 + 8},${LOOP_NODE_H + 18}`} fill={theme.accent} />
      </svg>
    </div>
  );
};
