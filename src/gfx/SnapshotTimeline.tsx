// SnapshotTimeline: the rail of snapshots along the bottom of S4 (patch 09, BIBLE 11 B).
//
// - A FULL-STAGE layer (absolute, 1920 x 1080): every coordinate is in stage px. The rail runs from `x0` to `x1` at `y`.
// - Pure and props-driven: nothing reads the frame. Progress values are LINEAR 0..1; the component applies its own easing.
// - Slots: nodes sit in fixed slots (`timelineNodeX(i, slots)`), so a node never moves when later ones arrive. A node's index in
//   `nodes` is its slot.
// - Node states: "taken" (a snapshot that was taken), "current" (the newest; crimson ring, the one accent), "greyed" (work that a
//   rewind threw away: dashed, struck through) and "rewound" (the blue node a rewind adds, with the caption slot
//   `rewoundLabel`, "restored into a fresh sandbox"). A rewound node is joined by a blue arc to the earlier node with the same `n`.
// - `playhead` is a fractional node index (1.5 = half way from node 1 to node 2). Omit it to hide the playhead.
// - `tether`: a pulse that travels from node `fromIndex` to a point in the picture (the GhostContainer). Linear, with a short
//   streak; once it has arrived a faint line stays.
// - Labels sit BELOW the rail ("snapshot 1  f546ce19" on one line, the rewound caption under it), so the rewind arc, the tether and the
//   playhead have the space above the rail to themselves.
// - Every word is a prop: `nodeWord` (copy.gfxB.snapshot), `rewoundLabel` (copy.gfxB.restoredInto). Hashes come from the evidence.
import React, { useId } from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, easeOutBack, signature } from "../lib/ease";
import { shortHash } from "../lib/hash";
import { STAGE } from "../config/timeline";

export type SnapshotState = "taken" | "current" | "greyed" | "rewound";

export interface SnapshotNode {
  /** The snapshot number (shown as "snapshot N"). For a rewound node it is the snapshot it went back to. */
  n: number;
  /** The snapshot's SHA-256 (8 hex are shown). */
  hash: string;
  state: SnapshotState;
}

export interface TimelineTether {
  /** Index of the node the pulse leaves from. */
  fromIndex: number;
  /** Where it goes, stage px. */
  toX: number;
  toY: number;
  /** 0..1 linear. */
  progress: number;
}

export interface SnapshotTimelineProps {
  nodes: readonly SnapshotNode[];
  /** 0..1 landing of each node (same length as `nodes`). Default 1 each. */
  nodeProgress?: readonly number[];
  /** Number of node slots on the rail. Default 5. */
  slots?: number;
  /** Rail height (stage y). Default 770. */
  y?: number;
  x0?: number;
  x1?: number;
  /** 0..1 the rail draws on. Default 1. */
  railProgress?: number;
  /** Fractional node index of the playhead; omit to hide it. */
  playhead?: number;
  tether?: TimelineTether;
  /** copy.gfxB.snapshot */
  nodeWord: string;
  /** copy.gfxB.restoredInto: the caption slot under the rewound node's label. */
  rewoundLabel: string;
}

export const TL_X0 = 96;
export const TL_X1 = STAGE.w - 96;
export const TL_Y = 770;
const PAD = 150;
const NODE_R = 12;
const LINE = 1.5;

/** Stage x of slot `i` (stable: it does not depend on how many nodes are shown). */
export function timelineNodeX(i: number, slots = 5, x0 = TL_X0, x1 = TL_X1): number {
  const span = (x1 - x0 - 2 * PAD) / Math.max(1, slots - 1);
  return x0 + PAD + i * span;
}

function cubicAt(t: number, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export const SnapshotTimeline: React.FC<SnapshotTimelineProps> = ({
  nodes,
  nodeProgress,
  slots = 5,
  y = TL_Y,
  x0 = TL_X0,
  x1 = TL_X1,
  railProgress = 1,
  playhead,
  tether,
  nodeWord,
  rewoundLabel,
}) => {
  const uid = useId().replace(/:/g, "");
  if (nodes.length > slots) throw new Error(`SnapshotTimeline: ${nodes.length} nodes do not fit in ${slots} slots`);
  if (nodeProgress && nodeProgress.length < nodes.length) {
    throw new Error(`SnapshotTimeline: nodeProgress needs ${nodes.length} values, got ${nodeProgress.length}`);
  }
  const np = (i: number): number => clamp01(nodeProgress ? nodeProgress[i] : 1);
  const px = (i: number): number => timelineNodeX(i, slots, x0, x1);
  const rail = signature(clamp01(railProgress));
  const railLen = x1 - x0;

  // minor ticks along the rail
  const ticks: number[] = [];
  for (let tx = x0 + 36; tx < x1; tx += 36) if ((tx - x0) <= railLen * rail) ticks.push(tx);

  const segs: React.ReactNode[] = [];
  const nodeEls: React.ReactNode[] = [];

  nodes.forEach((node, i) => {
    const p = np(i);
    if (p <= 0) return;
    const cx = px(i);
    const state = node.state;
    const rewound = state === "rewound";
    const greyed = state === "greyed";
    const current = state === "current";
    // a rewound node is reached by its arc first (the first 55% of its progress), then it lands
    const pl = rewound ? clamp01((p - 0.45) / 0.55) : p;
    const land = signature(pl);
    const pop = Math.max(0, easeOutBack(clamp01(pl / 0.8)));
    const drop = (1 - land) * -26;
    const labelP = signature(clamp01((pl - 0.5) / 0.5));

    // segment from the previous node (the rewound node is reached by an arc from its source instead)
    if (i > 0 && !rewound) {
      const prevX = px(i - 1);
      const w = (cx - prevX) * signature(clamp01(p / 0.8));
      segs.push(
        <line
          key={`seg${i}`}
          x1={prevX}
          y1={y}
          x2={prevX + w}
          y2={y}
          stroke={greyed ? theme.rule2 : theme.ink2}
          strokeWidth={greyed ? LINE : 2}
          strokeDasharray={greyed ? "6 6" : undefined}
        />,
      );
    }
    if (rewound) {
      const src = nodes.findIndex((o, k) => k < i && o.n === node.n && o.state !== "rewound");
      if (src >= 0) {
        const sx = px(src);
        const lift = 66;
        const d = `M ${sx} ${y - NODE_R} C ${sx} ${y - lift - NODE_R}, ${cx} ${y - lift - NODE_R}, ${cx} ${y - NODE_R}`;
        segs.push(
          <path
            key={`arc${i}`}
            d={d}
            fill="none"
            stroke={theme.ok}
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray={`${signature(clamp01(p / 0.55))} 1`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${alpha(theme.ok, 0.45)})` }}
          />,
        );
      } else if (i > 0) {
        segs.push(<line key={`seg${i}`} x1={px(i - 1)} y1={y} x2={cx} y2={y} stroke={theme.ok} strokeWidth={2.5} />);
      }
    }

    const hashColor = rewound ? theme.ok : greyed ? alpha(theme.ink3, 0.6) : current ? theme.ink : theme.ink2;
    const wordColor = greyed ? alpha(theme.ink3, 0.6) : theme.ink2;
    const nodeOpacity = greyed ? 0.7 : 1;
    nodeEls.push(
      <g key={`n${i}`} opacity={nodeOpacity}>
        <g transform={`translate(${cx} ${y + drop}) scale(${pop})`}>
          {rewound ? (
            <>
              <circle r={NODE_R + 8} fill={alpha(theme.ok, 0.16)} />
              <circle r={NODE_R + 2} fill={`url(#tlg${uid})`} stroke={theme.okC} strokeWidth={1.5} />
              <path d="M-5.5 0.5 L-1.5 4.5 L6 -4" fill="none" stroke={theme.onAccent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : greyed ? (
            <circle r={NODE_R} fill={theme.sunken} stroke={theme.rule2} strokeWidth={LINE} strokeDasharray="4 4" />
          ) : current ? (
            <>
              <circle r={NODE_R + 8} fill="none" stroke={alpha(theme.accent, 0.55)} strokeWidth={LINE} />
              <circle r={NODE_R} fill={theme.ink} stroke={theme.accent} strokeWidth={2} />
            </>
          ) : (
            <>
              <circle r={NODE_R} fill={theme.sunken} stroke={theme.ink2} strokeWidth={2} />
              <circle r={4} fill={theme.ink2} />
            </>
          )}
        </g>
        <g opacity={labelP}>
          <text
            x={cx}
            y={y + 42 - (1 - labelP) * 8}
            textAnchor="middle"
            fontFamily={fonts.mono}
            fontSize={20}
            textDecoration={greyed ? "line-through" : undefined}
          >
            <tspan fill={wordColor}>
              {nodeWord} {node.n}
            </tspan>
            <tspan dx={14} fill={hashColor}>
              {shortHash(node.hash)}
            </tspan>
          </text>
          {rewound ? (
            <text x={cx} y={y + 84} textAnchor="middle" fontFamily={fonts.serif} fontStyle="italic" fontSize={24} fill={theme.ok}>
              {rewoundLabel}
            </text>
          ) : null}
        </g>
      </g>,
    );
  });

  // playhead
  let head: React.ReactNode = null;
  if (playhead !== undefined && nodes.length > 0) {
    const i0 = Math.max(0, Math.min(slots - 1, Math.floor(playhead)));
    const i1 = Math.min(slots - 1, i0 + 1);
    const hx = px(i0) + (px(i1) - px(i0)) * (playhead - i0);
    head = (
      <g>
        <line x1={hx} y1={y - 26} x2={hx} y2={y + 26} stroke={theme.accent} strokeWidth={2} />
        <path d={`M ${hx - 9} ${y - 36} H ${hx + 9} L ${hx} ${y - 24} Z`} fill={theme.accent} />
      </g>
    );
  }

  // tether pulse
  let pulse: React.ReactNode = null;
  if (tether && tether.progress > 0 && tether.fromIndex >= 0 && tether.fromIndex < nodes.length) {
    const sx = px(tether.fromIndex);
    const p0: [number, number] = [sx, y - NODE_R - 4];
    const p1: [number, number] = [sx, y - 150];
    const p2: [number, number] = [tether.toX, tether.toY + 150];
    const p3: [number, number] = [tether.toX, tether.toY];
    const d = `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`;
    const t = clamp01(tether.progress);
    const tail = 0.2;
    const [hx, hy] = cubicAt(t, p0, p1, p2, p3);
    pulse = (
      <g>
        <path d={d} fill="none" stroke={alpha(theme.ok, 0.3)} strokeWidth={LINE} />
        {t < 1 ? (
          <>
            <path
              d={d}
              fill="none"
              stroke={theme.okC}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${Math.min(tail, t)} 1`}
              strokeDashoffset={-Math.max(0, t - tail)}
            />
            <circle cx={hx} cy={hy} r={7} fill={theme.okC} style={{ filter: `drop-shadow(0 0 10px ${alpha(theme.ok, 0.8)})` }} />
          </>
        ) : null}
      </g>
    );
  }

  return (
    <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}>
      <defs>
        <linearGradient id={`tlg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.okA} />
          <stop offset="0.55" stopColor={theme.okB} />
          <stop offset="1" stopColor={theme.okC} />
        </linearGradient>
      </defs>
      <line x1={x0} y1={y} x2={x0 + railLen * rail} y2={y} stroke={theme.rule2} strokeWidth={LINE} />
      {ticks.map((tx) => (
        <line key={tx} x1={tx} y1={y - 5} x2={tx} y2={y + 5} stroke={theme.rule} strokeWidth={LINE} />
      ))}
      {segs}
      {pulse}
      {nodeEls}
      {head}
    </svg>
  );
};
