// ArchitectureDiagram: the README flowchart as an animated technical drawing inside a Vultr VM frame (patch 10, BIBLE 11 C).
//
// - A FULL-STAGE layer (absolute, 1920 x 1080, every coordinate is stage px), like EgressWall and SnapshotTimeline. The drawing is
//   about 1500 x 760: the VM frame is 1500 x 540, with a strip of outside nodes above it (Browser UI, LLM provider) and one below it
//   (Artifact store, Internet).
// - Pure and props-driven: nothing here reads the frame. A scene passes 0..1 progress values (nodeProgress[12], edgeProgress[12],
//   frameProgress, vultrChip[3], highlightAmount) and ONE running number, `clock` (the global frame), which only places the packets
//   that travel along the edges (linear motion, as BIBLE 5 allows for packets). No CSS transitions, no timers, no randomness.
// - Every word is a prop: node and edge words come from copy.gfxC, the three chip names from copy.s8.lowerThirds, and the facts on the
//   chips (hostname, region, plan, inference host, model) from the evidence through src/data/select.ts. Nothing measured is typed here.
// - Outside the VM (shape = pill): Browser UI, LLM provider, Artifact store, Internet. Inside: boxes; Host Docker and Ledger have a drum
//   lid; the two sandboxes have a double outline. One accent per drawing: crimson marks the highlighted path and the chips' attach dots.
import React, { useId } from "react";
import { alpha, fonts, theme } from "../config/theme";
import { STAGE } from "../config/timeline";
import { clamp01, signature } from "../lib/ease";
import { estimateWidth, MONO_ADVANCE, SERIF_ADVANCE } from "../fx/util";
import { VultrLogo } from "../ui/VultrLogo";

// ---------------------------------------------------------------------------------------------- identifiers

/** The 12 nodes, in the order of `nodeProgress`. */
export const ARCH_NODE_IDS = [
  "ui",
  "caddy",
  "api",
  "socket",
  "docker",
  "code",
  "browser",
  "proxy",
  "ledger",
  "llm",
  "artifact",
  "internet",
] as const;
export type ArchNodeId = (typeof ARCH_NODE_IDS)[number];

/** The 12 edges, in the order of `edgeProgress` (a natural build order). */
export const ARCH_EDGE_IDS = [
  "uiCaddy",
  "caddyApi",
  "apiSocket",
  "socketDocker",
  "dockerCode",
  "dockerBrowser",
  "codeProxy",
  "browserProxy",
  "proxyInternet",
  "apiLedger",
  "apiLlm",
  "apiArtifact",
] as const;
export type ArchEdgeId = (typeof ARCH_EDGE_IDS)[number];

export type ArchHighlight = "task" | "model" | "storage" | "none";

/** What each highlight lights: the nodes and the edges of the path. The task path ends at the egress proxy. */
export const ARCH_PATHS: Record<Exclude<ArchHighlight, "none">, { nodes: readonly ArchNodeId[]; edges: readonly ArchEdgeId[] }> = {
  task: {
    nodes: ["ui", "caddy", "api", "socket", "docker", "code", "proxy"],
    edges: ["uiCaddy", "caddyApi", "apiSocket", "socketDocker", "dockerCode", "codeProxy"],
  },
  model: { nodes: ["api", "llm"], edges: ["apiLlm"] },
  storage: { nodes: ["api", "artifact"], edges: ["apiArtifact"] },
};

// ---------------------------------------------------------------------------------------------- geometry (stage px)

export const ARCH_NODE_W = 220;
export const ARCH_NODE_H = 64;
/** The Vultr VM frame. */
export const ARCH_FRAME = { x: 210, y: 232, w: 1500, h: 540 } as const;
const FRAME_RADIUS = 24;

const COLS = [270, 657, 1044, 1431] as const;
const ROWS = [332, 478, 628] as const;
const STRIP_TOP = 104;
const STRIP_BOTTOM = 808;

type NodeShape = "box" | "drum" | "sandbox" | "pill";
interface NodeSpec {
  x: number;
  y: number;
  shape: NodeShape;
}

const NODES: Record<ArchNodeId, NodeSpec> = {
  ui: { x: COLS[0], y: STRIP_TOP, shape: "pill" },
  caddy: { x: COLS[0], y: ROWS[0], shape: "box" },
  api: { x: COLS[1], y: ROWS[0], shape: "box" },
  socket: { x: COLS[2], y: ROWS[0], shape: "box" },
  docker: { x: COLS[3], y: ROWS[0], shape: "drum" },
  code: { x: COLS[2], y: ROWS[1], shape: "sandbox" },
  browser: { x: COLS[3], y: ROWS[1], shape: "sandbox" },
  proxy: { x: COLS[2], y: ROWS[2], shape: "box" },
  ledger: { x: COLS[0], y: ROWS[1], shape: "drum" },
  llm: { x: COLS[1], y: STRIP_TOP, shape: "pill" },
  artifact: { x: COLS[1], y: STRIP_BOTTOM, shape: "pill" },
  internet: { x: COLS[2], y: STRIP_BOTTOM, shape: "pill" },
};

/** Top-left corner of a node, stage px (the node is ARCH_NODE_W x ARCH_NODE_H). For callouts and scene layout. */
export function archNodeRect(id: ArchNodeId): { x: number; y: number; w: number; h: number } {
  const n = NODES[id];
  return { x: n.x, y: n.y, w: ARCH_NODE_W, h: ARCH_NODE_H };
}

const cxOf = (id: ArchNodeId): number => NODES[id].x + ARCH_NODE_W / 2;
const midYOf = (id: ArchNodeId): number => NODES[id].y + ARCH_NODE_H / 2;
const rightOf = (id: ArchNodeId): number => NODES[id].x + ARCH_NODE_W;
const bottomOf = (id: ArchNodeId): number => NODES[id].y + ARCH_NODE_H;
const topOf = (id: ArchNodeId): number => NODES[id].y;
const leftOf = (id: ArchNodeId): number => NODES[id].x;

type Pt = readonly [number, number];
interface EdgeLabelSpec {
  /** Stage px. `y` is the vertical centre of the text. */
  x: number;
  y: number;
  anchor: "start" | "middle";
}
interface EdgeSpec {
  pts: readonly Pt[];
  dashed?: boolean;
  /** Default true. The ledger line is a plain connection. */
  arrow?: boolean;
  label?: EdgeLabelSpec;
}

const EDGES: Record<ArchEdgeId, EdgeSpec> = {
  uiCaddy: {
    pts: [
      [cxOf("ui"), bottomOf("ui")],
      [cxOf("caddy"), topOf("caddy")],
    ],
    label: { x: cxOf("ui") + 14, y: 200, anchor: "start" },
  },
  caddyApi: {
    pts: [
      [rightOf("caddy"), midYOf("caddy")],
      [leftOf("api"), midYOf("api")],
    ],
    label: { x: (rightOf("caddy") + leftOf("api")) / 2, y: 345, anchor: "middle" },
  },
  apiSocket: {
    pts: [
      [rightOf("api"), midYOf("api")],
      [leftOf("socket"), midYOf("socket")],
    ],
    label: { x: (rightOf("api") + leftOf("socket")) / 2, y: 345, anchor: "middle" },
  },
  socketDocker: {
    pts: [
      [rightOf("socket"), midYOf("socket")],
      [leftOf("docker"), midYOf("docker")],
    ],
  },
  dockerCode: {
    dashed: true,
    pts: [
      [1480, bottomOf("docker")],
      [1480, 437],
      [cxOf("code"), 437],
      [cxOf("code"), topOf("code")],
    ],
    label: { x: 1292, y: 458, anchor: "start" },
  },
  dockerBrowser: {
    dashed: true,
    pts: [
      [1590, bottomOf("docker")],
      [1590, topOf("browser")],
    ],
  },
  codeProxy: {
    pts: [
      [cxOf("code"), bottomOf("code")],
      [cxOf("proxy"), topOf("proxy")],
    ],
    label: { x: cxOf("code") + 14, y: 585, anchor: "start" },
  },
  browserProxy: {
    pts: [
      [cxOf("browser"), bottomOf("browser")],
      [cxOf("browser"), midYOf("proxy")],
      [rightOf("proxy"), midYOf("proxy")],
    ],
  },
  proxyInternet: {
    pts: [
      [cxOf("proxy"), bottomOf("proxy")],
      [cxOf("internet"), topOf("internet")],
    ],
    label: { x: cxOf("proxy") + 14, y: 790, anchor: "start" },
  },
  apiLedger: {
    arrow: false,
    pts: [
      [700, bottomOf("api")],
      [700, midYOf("ledger")],
      [rightOf("ledger"), midYOf("ledger")],
    ],
  },
  apiLlm: {
    pts: [
      [cxOf("api"), topOf("api")],
      [cxOf("llm"), bottomOf("llm")],
    ],
    label: { x: cxOf("api") + 14, y: 200, anchor: "start" },
  },
  apiArtifact: {
    pts: [
      [820, bottomOf("api")],
      [820, topOf("artifact")],
    ],
    label: { x: 834, y: 790, anchor: "start" },
  },
};

// ---------------------------------------------------------------------------------------------- derived geometry

interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
}
interface EdgeGeom {
  spec: EdgeSpec;
  d: string;
  len: number;
  segs: Seg[];
  /** The tip of the arrowhead and its direction in degrees. */
  endX: number;
  endY: number;
  endDeg: number;
}

function buildGeom(spec: EdgeSpec): EdgeGeom {
  const segs: Seg[] = [];
  let len = 0;
  for (let i = 1; i < spec.pts.length; i++) {
    const [x0, y0] = spec.pts[i - 1];
    const [x1, y1] = spec.pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0, y0, x1, y1, len: l });
    len += l;
  }
  const last = segs[segs.length - 1];
  return {
    spec,
    d: spec.pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" "),
    len,
    segs,
    endX: last.x1,
    endY: last.y1,
    endDeg: (Math.atan2(last.y1 - last.y0, last.x1 - last.x0) * 180) / Math.PI,
  };
}

const GEOM: Record<ArchEdgeId, EdgeGeom> = Object.fromEntries(ARCH_EDGE_IDS.map((id) => [id, buildGeom(EDGES[id])])) as Record<
  ArchEdgeId,
  EdgeGeom
>;

/** Point and direction (degrees) at `dist` px along an edge. */
function pointAt(g: EdgeGeom, dist: number): { x: number; y: number; deg: number } {
  let rest = Math.max(0, Math.min(g.len, dist));
  for (const s of g.segs) {
    if (rest <= s.len || s === g.segs[g.segs.length - 1]) {
      const t = s.len === 0 ? 0 : Math.min(1, rest / s.len);
      return {
        x: s.x0 + (s.x1 - s.x0) * t,
        y: s.y0 + (s.y1 - s.y0) * t,
        deg: (Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180) / Math.PI,
      };
    }
    rest -= s.len;
  }
  return { x: g.endX, y: g.endY, deg: g.endDeg };
}

// ---------------------------------------------------------------------------------------------- shapes

const LINE = 1.5;

function roundedPerimeter(w: number, h: number, r: number): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/** A rounded rectangle path starting at its top-left straight, drawn clockwise. */
function roundedPath(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------------------------- props

export interface ArchNodeText {
  title: string;
  /** Optional second line (mono 20 px). */
  sub?: string;
}

/** A Vultr product chip: the product name and one line of facts. */
export interface ArchChip {
  /** copy.s8.lowerThirds[i] */
  name: string;
  /** From the evidence (VM: hostname, region, plan; inference: host and model) or copy.gfxC.storageFacts. */
  facts: string;
}

export interface ArchitectureDiagramProps {
  /** 0..1 per node, in ARCH_NODE_IDS order (12): outline draws, then the fill and the words arrive. */
  nodeProgress: readonly number[];
  /** 0..1 per edge, in ARCH_EDGE_IDS order (12): the line draws on, then the arrowhead pops and the word fades in. */
  edgeProgress: readonly number[];
  /** Which path glows crimson. */
  highlight: ArchHighlight;
  /** 0..1 per Vultr chip (3: VM, Serverless Inference, Object Storage): the chip is lit. */
  vultrChip: readonly number[];
  /** The three chips' words, same order as `vultrChip`. */
  chips: readonly ArchChip[];
  /** copy.gfxC.nodes */
  nodes: Record<ArchNodeId, ArchNodeText>;
  /** copy.gfxC.edges */
  edgeLabels: Partial<Record<ArchEdgeId, string>>;
  /** 0..1: the VM frame draws on. Default 1. */
  frameProgress?: number;
  /** 0..1: strength of the highlight. Ramp it down, switch `highlight`, ramp it up to move between paths. Default 1. */
  highlightAmount?: number;
  /** The global frame; it only places the packets. Default 0. */
  clock?: number;
  /** Show the official Vultr logo in the top-left corner of the frame. Default false (the installed file is the on-white variant). */
  showVultrLogo?: boolean;
}

// ---------------------------------------------------------------------------------------------- nodes

const TITLE_MAX = 22;
const TEXT_MIN = 20;
const TEXT_ROOM = ARCH_NODE_W - 16;

const NodeView: React.FC<{ id: ArchNodeId; text: ArchNodeText; progress: number; hl: number }> = ({ id, text, progress, hl }) => {
  const np = clamp01(progress);
  if (np <= 0.001) return null;
  const spec = NODES[id];
  const draw = signature(clamp01(np / 0.6));
  const fill = signature(clamp01((np - 0.35) / 0.65));
  const w = ARCH_NODE_W;
  const h = ARCH_NODE_H;
  const r = spec.shape === "pill" ? h / 2 : 10;
  const path = roundedPath(0, 0, w, h, r);
  const perim = roundedPerimeter(w, h, r);

  if (estimateWidth(text.title, TEXT_MIN, MONO_ADVANCE) > TEXT_ROOM) {
    throw new Error(`ArchitectureDiagram: the title "${text.title}" of node ${id} is too long for a ${ARCH_NODE_W} px node`);
  }
  if (text.sub !== undefined && estimateWidth(text.sub, TEXT_MIN, MONO_ADVANCE) > TEXT_ROOM) {
    throw new Error(`ArchitectureDiagram: the sub line "${text.sub}" of node ${id} is too long for a ${ARCH_NODE_W} px node`);
  }
  const titleSize = Math.max(TEXT_MIN, Math.min(TITLE_MAX, Math.floor(TEXT_ROOM / (text.title.length * MONO_ADVANCE))));
  const hl01 = clamp01(hl);

  return (
    <div style={{ position: "absolute", left: spec.x, top: spec.y, width: w, height: h, pointerEvents: "none" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={path} fill={theme.sheet} opacity={fill} />
        {spec.shape === "drum" ? (
          <path d={`M 1 14 Q ${w / 2} 26 ${w - 1} 14`} fill="none" stroke={theme.ink3} strokeWidth={LINE} opacity={fill * 0.8} />
        ) : null}
        {spec.shape === "sandbox" ? (
          <path d={roundedPath(6, 6, w - 12, h - 12, 5)} fill="none" stroke={theme.ink3} strokeWidth={LINE} opacity={fill * 0.7} />
        ) : null}
        <path d={path} fill="none" stroke={theme.ink3} strokeWidth={LINE} strokeDasharray={`${perim * draw} ${perim}`} />
        {hl01 > 0.01 ? (
          <path
            d={path}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2.4}
            opacity={hl01 * draw}
            style={{ filter: `drop-shadow(0 0 ${10 * hl01}px ${alpha(theme.accent, 0.5 * hl01)})` }}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: fill,
          transform: `translateY(${(1 - fill) * 6}px)`,
          fontFamily: fonts.mono,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: titleSize, lineHeight: `${titleSize + 2}px`, color: theme.ink }}>{text.title}</div>
        {text.sub !== undefined ? (
          <div style={{ fontWeight: 500, fontSize: TEXT_MIN, lineHeight: "22px", color: theme.ink3 }}>{text.sub}</div>
        ) : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- chips

const CHIP_H = 72;
const CHIP_PAD_X = 18;
const CHIP_NAME_FONT = 24;
const CHIP_FACTS_FONT = 20;

type ChipDir = "down" | "right" | "left";

/** Where each chip attaches. The VM chip hangs below the top edge of the frame, at its top-right. */
const CHIP_ATTACH: readonly { dir: ChipDir; ax: number; ay: number; stem: number }[] = [
  { dir: "down", ax: 0, ay: ARCH_FRAME.y, stem: 14 },
  { dir: "right", ax: rightOf("llm"), ay: midYOf("llm"), stem: 70 },
  { dir: "left", ax: leftOf("artifact"), ay: midYOf("artifact"), stem: 70 },
];

const ChipView: React.FC<{ index: number; chip: ArchChip; progress: number }> = ({ index, chip, progress }) => {
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  const att = CHIP_ATTACH[index];
  const w = Math.ceil(
    Math.max(estimateWidth(chip.name, CHIP_NAME_FONT, SERIF_ADVANCE), estimateWidth(chip.facts, CHIP_FACTS_FONT, MONO_ADVANCE)) + CHIP_PAD_X * 2,
  );

  let left = 0;
  let top = 0;
  let ax = att.ax;
  const ay = att.ay;
  if (att.dir === "down") {
    left = ARCH_FRAME.x + ARCH_FRAME.w - 24 - w;
    top = ay + att.stem;
    ax = left + w / 2;
  } else if (att.dir === "right") {
    left = ax + att.stem;
    top = ay - CHIP_H / 2;
  } else {
    left = ax - att.stem - w;
    top = ay - CHIP_H / 2;
  }

  const stemP = signature(clamp01(p / 0.35));
  const bodyP = signature(clamp01((p - 0.2) / 0.8));
  const dotP = signature(clamp01(p / 0.2));
  const ringP = clamp01((p - 0.3) / 0.35);
  const rest = `${(1 - bodyP) * 100}%`;
  const clip = att.dir === "down" ? `inset(0 0 ${rest} 0)` : att.dir === "right" ? `inset(0 ${rest} 0 0)` : `inset(0 0 0 ${rest})`;

  const stemStyle: React.CSSProperties = { position: "absolute", background: theme.ink3 };
  if (att.dir === "down") Object.assign(stemStyle, { left: ax - LINE / 2, top: ay, width: LINE, height: att.stem * stemP });
  else if (att.dir === "right") Object.assign(stemStyle, { left: ax, top: ay - LINE / 2, width: att.stem * stemP, height: LINE });
  else Object.assign(stemStyle, { left: ax - att.stem * stemP, top: ay - LINE / 2, width: att.stem * stemP, height: LINE });

  return (
    <>
      <div style={stemStyle} />
      {ringP > 0 && ringP < 1 ? (
        <div
          style={{
            position: "absolute",
            left: ax,
            top: ay,
            width: 10 + 30 * ringP,
            height: 10 + 30 * ringP,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `${LINE}px solid ${alpha(theme.accent, 0.8 * (1 - ringP))}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: ax,
          top: ay,
          width: 10,
          height: 10,
          transform: `translate(-50%, -50%) scale(${dotP})`,
          borderRadius: "50%",
          background: theme.accent,
        }}
      />
      <div style={{ position: "absolute", left, top, width: w, height: CHIP_H, clipPath: clip }}>
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `${LINE}px solid ${theme.rule2}`,
            borderRadius: 10,
            background: theme.sheet,
            boxShadow: theme.panelShadow,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: CHIP_NAME_FONT, lineHeight: "28px", color: theme.ink }}>
            {chip.name}
          </div>
          <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: CHIP_FACTS_FONT, lineHeight: "24px", color: theme.ink2 }}>
            {chip.facts}
          </div>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------- frame

const FrameView: React.FC<{ progress: number; showLogo: boolean }> = ({ progress, showLogo }) => {
  const d = signature(clamp01(progress));
  if (d <= 0.001) return null;
  const { w, h } = ARCH_FRAME;
  const perim = roundedPerimeter(w, h, FRAME_RADIUS);
  const arm = 30;
  const off = 14;
  const corners: string[] = [
    `M ${-off} ${-off + arm} V ${-off} H ${-off + arm}`,
    `M ${w + off - arm} ${-off} H ${w + off} V ${-off + arm}`,
    `M ${w + off} ${h + off - arm} V ${h + off} H ${w + off - arm}`,
    `M ${-off + arm} ${h + off} H ${-off} V ${h + off - arm}`,
  ];
  return (
    <div style={{ position: "absolute", left: ARCH_FRAME.x, top: ARCH_FRAME.y, width: w, height: h, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: FRAME_RADIUS,
          opacity: d,
          background:
            `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px), ${alpha(theme.sheet, 0.45)}`,
          backgroundSize: `${theme.gridSize}px ${theme.gridSize}px, ${theme.gridSize}px ${theme.gridSize}px, auto`,
        }}
      />
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path
          d={roundedPath(0, 0, w, h, FRAME_RADIUS)}
          fill="none"
          stroke={theme.ink3}
          strokeWidth={LINE}
          strokeDasharray={`${perim * d} ${perim}`}
        />
        {corners.map((c, i) => (
          <path key={i} d={c} fill="none" stroke={theme.ink3} strokeWidth={LINE} strokeLinecap="square" strokeDasharray={`${arm * 2 * d} ${arm * 2}`} />
        ))}
      </svg>
      {showLogo ? (
        <div style={{ position: "absolute", left: 28, top: 22, opacity: d }}>
          <VultrLogo height={26} />
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- packets

const PACKET_SPEED = 7; // px per frame, linear
const PACKET_SPACING = 150; // about one packet per this many px of edge
const ARROW_LEN = 12;
const ARROW_HALF = 5;

const PacketGlyph: React.FC<{ x: number; y: number; deg: number; size: number; streak: number; color: string; gradId: string; opacity: number }> = ({
  x,
  y,
  deg,
  size,
  streak,
  color,
  gradId,
  opacity,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${deg})`} opacity={opacity}>
    <rect x={-streak} y={-1.5} width={streak} height={3} fill={`url(#${gradId})`} />
    <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={size * 0.22} fill={theme.sunken} stroke={color} strokeWidth={LINE} />
  </g>
);

// ---------------------------------------------------------------------------------------------- component

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  nodeProgress,
  edgeProgress,
  highlight,
  vultrChip,
  chips,
  nodes,
  edgeLabels,
  frameProgress = 1,
  highlightAmount = 1,
  clock = 0,
  showVultrLogo = false,
}) => {
  const uid = useId().replace(/:/g, "");
  if (nodeProgress.length !== ARCH_NODE_IDS.length) {
    throw new Error(`ArchitectureDiagram: nodeProgress needs ${ARCH_NODE_IDS.length} values (ARCH_NODE_IDS), got ${nodeProgress.length}`);
  }
  if (edgeProgress.length !== ARCH_EDGE_IDS.length) {
    throw new Error(`ArchitectureDiagram: edgeProgress needs ${ARCH_EDGE_IDS.length} values (ARCH_EDGE_IDS), got ${edgeProgress.length}`);
  }
  if (vultrChip.length !== CHIP_ATTACH.length || chips.length !== CHIP_ATTACH.length) {
    throw new Error(`ArchitectureDiagram: vultrChip and chips need ${CHIP_ATTACH.length} entries each (VM, Serverless Inference, Object Storage)`);
  }

  const amount = clamp01(highlightAmount);
  const path = highlight === "none" ? null : ARCH_PATHS[highlight];
  const nodeHl = (id: ArchNodeId): number => (path && path.nodes.includes(id) ? amount : 0);
  const edgeHl = (id: ArchEdgeId): number => (path && path.edges.includes(id) ? amount : 0);

  const gradInk = `${uid}gi`;
  const gradAcc = `${uid}ga`;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, pointerEvents: "none" }}>
      <FrameView progress={frameProgress} showLogo={showVultrLogo} />

      {/* edges and packets */}
      <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id={gradInk} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={theme.ink2} stopOpacity="0" />
            <stop offset="1" stopColor={theme.ink2} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={gradAcc} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={theme.accent} stopOpacity="0" />
            <stop offset="1" stopColor={theme.accent} stopOpacity="1" />
          </linearGradient>
          {ARCH_EDGE_IDS.map((id, i) => {
            const g = GEOM[id];
            if (!g.spec.dashed) return null;
            const p = signature(clamp01(edgeProgress[i]));
            return (
              <mask key={id} id={`${uid}m${i}`} maskUnits="userSpaceOnUse" x={0} y={0} width={STAGE.w} height={STAGE.h}>
                <path d={g.d} fill="none" stroke="#fff" strokeWidth={10} strokeDasharray={`${g.len * p} ${g.len + 4}`} />
              </mask>
            );
          })}
        </defs>

        {ARCH_EDGE_IDS.map((id, i) => {
          const g = GEOM[id];
          const ep = clamp01(edgeProgress[i]);
          const p = signature(ep);
          if (p <= 0.001) return null;
          const hl = edgeHl(id);
          const dashed = g.spec.dashed === true;
          const arrow = g.spec.arrow !== false;
          const arrowP = signature(clamp01((ep - 0.9) / 0.1));

          const stroke = (color: string, width: number, opacity: number, glow: boolean): React.ReactNode => {
            const common = {
              d: g.d,
              fill: "none",
              stroke: color,
              strokeWidth: width,
              strokeLinejoin: "round" as const,
            };
            const style = glow ? { filter: `drop-shadow(0 0 5px ${alpha(theme.accent, 0.6 * opacity)})` } : undefined;
            if (dashed) {
              return (
                <g mask={`url(#${uid}m${i})`} opacity={opacity} style={style}>
                  <path {...common} strokeDasharray="9 8" />
                </g>
              );
            }
            return <path {...common} strokeDasharray={`${g.len * p} ${g.len + 4}`} opacity={opacity} style={style} />;
          };

          return (
            <g key={id}>
              {stroke(theme.ink3, LINE, 1, false)}
              {hl > 0.01 ? stroke(theme.accent, 2.4, hl, true) : null}
              {arrow && arrowP > 0.001 ? (
                <g transform={`translate(${g.endX} ${g.endY}) rotate(${g.endDeg}) scale(${arrowP})`}>
                  <polygon points={`0,0 ${-ARROW_LEN},${-ARROW_HALF} ${-ARROW_LEN},${ARROW_HALF}`} fill={theme.ink3} />
                  {hl > 0.01 ? <polygon points={`0,0 ${-ARROW_LEN},${-ARROW_HALF} ${-ARROW_LEN},${ARROW_HALF}`} fill={theme.accent} opacity={hl} /> : null}
                </g>
              ) : null}
            </g>
          );
        })}

        {/* packets: only on solid edges that are fully drawn, linear motion driven by `clock` */}
        {ARCH_EDGE_IDS.map((id, i) => {
          const g = GEOM[id];
          if (g.spec.dashed || g.spec.arrow === false) return null;
          if (clamp01(edgeProgress[i]) < 1) return null;
          const hl = edgeHl(id);
          const count = Math.max(1, Math.round(g.len / PACKET_SPACING));
          const spacing = g.len / count;
          const phase = i * 37;
          const out: React.ReactNode[] = [];
          for (let k = 0; k < count; k++) {
            const dist = (((clock * PACKET_SPEED + phase + k * spacing) % g.len) + g.len) % g.len;
            const env = Math.min(1, dist / 18, (g.len - dist) / 18);
            if (env <= 0.02) continue;
            const pt = pointAt(g, dist);
            if (hl < 0.99) {
              out.push(
                <PacketGlyph key={`${id}n${k}`} x={pt.x} y={pt.y} deg={pt.deg} size={9} streak={26} color={theme.ink2} gradId={gradInk} opacity={0.6 * env * (1 - hl)} />,
              );
            }
            if (hl > 0.01) {
              out.push(
                <PacketGlyph key={`${id}a${k}`} x={pt.x} y={pt.y} deg={pt.deg} size={14} streak={38} color={theme.accent} gradId={gradAcc} opacity={env * hl} />,
              );
            }
          }
          return <g key={`pk-${id}`}>{out}</g>;
        })}
      </svg>

      {/* nodes */}
      {ARCH_NODE_IDS.map((id, i) => (
        <NodeView key={id} id={id} text={nodes[id]} progress={nodeProgress[i]} hl={nodeHl(id)} />
      ))}

      {/* edge words */}
      {ARCH_EDGE_IDS.map((id, i) => {
        const spec = EDGES[id].label;
        const text = edgeLabels[id];
        if (!spec || text === undefined) return null;
        const o = clamp01((clamp01(edgeProgress[i]) - 0.6) / 0.4);
        if (o <= 0.001) return null;
        return (
          <div
            key={`lb-${id}`}
            style={{
              position: "absolute",
              left: spec.x,
              top: spec.y,
              transform: `translate(${spec.anchor === "middle" ? "-50%" : "0"}, -50%)`,
              fontFamily: fonts.mono,
              fontSize: 20,
              lineHeight: "24px",
              color: theme.ink3,
              whiteSpace: "nowrap",
              opacity: signature(o),
            }}
          >
            {text}
          </div>
        );
      })}

      {/* the three Vultr chips */}
      {chips.map((chip, i) => (
        <ChipView key={i} index={i} chip={chip} progress={vultrChip[i]} />
      ))}
    </div>
  );
};
