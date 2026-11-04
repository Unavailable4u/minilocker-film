// FileLattice: a grid of file tiles that can shatter and come back (patch 09, BIBLE 11 B). The hero visual of S4.
//
// - Positioned in STAGE px by `x`, `y` (top-left of the lattice). Pure and props-driven: nothing here reads the frame, no CSS
//   transitions, no timers. Every random choice comes from the seeded PRNG (mixSeed per tile and per shard), so shard geometry is
//   the same on every frame and on every render.
// - Layout: `columns` tiles of 96 px with a 14 px gap. The hero tile (192 px, shows its file name in mono) takes the 2 x 2 block of
//   cells whose top-left cell is `heroIndex`; those four cells are not drawn as small tiles.
// - State, all LINEAR 0..1 values (the component applies its own easing; the scene passes lin = clamp01((frame - start) / len)):
//     intact      the tiles arrive (staggered rise). 1 = the full lattice. Default 1.
//     shatter     every tile breaks into 5-9 seeded shards that drift outward LINEARLY (5-14 px/frame at SHATTER_FRAMES = 30 frames
//                 for the full 0..1) with spin, fading out. At 1 nothing is left but the empty slots (WIPED).
//     reassemble  the shards come back from where they were scattered along eased curves into place, with a 4% overshoot. Use it
//                 only after `shatter` has reached 1. At 1 the tiles are whole again (drawn as whole tiles, no seams).
//     desaturate  0..1 drains the colour of the whole lattice (the film uses 0.3 for the wipe).
// - Words: the hero file name is a prop (an evidence value). The optional `footnote` is a prop (copy.gfxB.schematic).
// - Honesty: only the hero tile stands for a real file. The other tiles are an unlabelled schematic of "a workspace", and carry no
//   names, sizes or counts. Say so with `footnote`, and take every number shown with the lattice from the evidence.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, overshoot, signature } from "../lib/ease";
import { mixSeed, rand, randInt } from "../lib/prng";
import { MONO_ADVANCE, estimateWidth } from "../fx/util";

export const TILE = 96;
export const TILE_GAP = 14;
export const HERO_TILE = 192;
/** Frames the scene gives `shatter` for its full 0..1 (BIBLE 11 B: fade over 30 f). Also the frames the shards drift for. */
export const SHATTER_FRAMES = 30;
export const SHARDS_MIN = 5;
export const SHARDS_MAX = 9;
/** Outward drift speed of a shard in px per frame (BIBLE 11 B: 5-14). */
export const SHARD_SPEED_MIN = 5;
export const SHARD_SPEED_MAX = 14;
/** BIBLE 11 B: "eased return with 4% overshoot". */
export const REASSEMBLE_OVERSHOOT = 0.04;

const LINE = 1.5;
const TILE_RADIUS = 10;
const HERO_RADIUS = 16;
const SHATTER_STAGGER = 0.2; // share of the shatter progress that tiles start late (seeded per tile)
const REASSEMBLE_STAGGER = 0.3; // share of the reassemble progress spread over the tiles, in reading order
const ENTER_STAGGER = 0.5;
const HERO_LABEL_FONT = 22;
const FOOTNOTE_FONT = 20;

export interface FileLatticeProps {
  /** Top-left of the lattice in stage px. */
  x: number;
  y: number;
  /** Number of cells in the grid (the hero's 2 x 2 block is part of it). Default 24. */
  count?: number;
  /** Cells per row. Default 6 (a 6 x 4 lattice). */
  columns?: number;
  /** Cell index (row * columns + column) of the top-left cell of the hero's 2 x 2 block. Omit for no hero tile. */
  heroIndex?: number;
  /** The hero tile's file name (an evidence value). Required with `heroIndex`. */
  heroLabel?: string;
  /** 0..1 arrival of the tiles. Default 1. */
  intact?: number;
  /** 0..1 shatter progress. Default 0. */
  shatter?: number;
  /** 0..1 return progress (after `shatter` reached 1). Default 0. */
  reassemble?: number;
  /** 0..1 colour drain of the whole lattice. Default 0. */
  desaturate?: number;
  /** Seed of the tile art and the shards. Default 11. */
  seed?: number;
  /** A mono line under the lattice (copy.gfxB.schematic). Omitted = none. */
  footnote?: string;
}

/** Width and height of a lattice of `count` cells in `columns` columns, in px. */
export function latticeSize(count = 24, columns = 6): { w: number; h: number; rows: number } {
  const cols = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / Math.max(1, columns));
  return { w: cols * TILE + (cols - 1) * TILE_GAP, h: rows * TILE + (rows - 1) * TILE_GAP, rows };
}

interface Cell {
  key: number;
  /** lattice-local px */
  x: number;
  y: number;
  size: number;
  hero: boolean;
}

function layoutCells(count: number, columns: number, heroIndex: number | undefined): Cell[] {
  if (!Number.isInteger(count) || count < 1) throw new Error(`FileLattice: count must be a positive integer (got ${count})`);
  if (!Number.isInteger(columns) || columns < 1) throw new Error(`FileLattice: columns must be a positive integer (got ${columns})`);
  const step = TILE + TILE_GAP;
  const covered = new Set<number>();
  let hero: Cell | null = null;
  if (heroIndex !== undefined) {
    const col = heroIndex % columns;
    const row = Math.floor(heroIndex / columns);
    const block = [heroIndex, heroIndex + 1, heroIndex + columns, heroIndex + columns + 1];
    if (!Number.isInteger(heroIndex) || heroIndex < 0 || col + 1 >= columns || block.some((c) => c >= count)) {
      throw new Error(
        `FileLattice: heroIndex ${heroIndex} cannot hold the 2 x 2 hero tile in a lattice of ${count} cells with ${columns} columns`,
      );
    }
    for (const c of block) covered.add(c);
    const off = (2 * TILE + TILE_GAP - HERO_TILE) / 2;
    hero = { key: heroIndex, x: col * step + off, y: row * step + off, size: HERO_TILE, hero: true };
  }
  const out: Cell[] = [];
  for (let i = 0; i < count; i++) {
    if (covered.has(i)) {
      if (hero && i === heroIndex) out.push(hero);
      continue;
    }
    out.push({ key: i, x: (i % columns) * step, y: Math.floor(i / columns) * step, size: TILE, hero: false });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Shards
// ---------------------------------------------------------------------------------------------------------------------

interface Shard {
  /** polygon in tile-local px */
  points: [number, number][];
  /** centroid in tile-local px (the rotation centre) */
  cx: number;
  cy: number;
  /** unit direction of the outward drift */
  ux: number;
  uy: number;
  /** distance travelled at shatter = 1 (speed * SHATTER_FRAMES) */
  dist: number;
  /** total rotation at shatter = 1, degrees */
  spin: number;
  /** sideways bow of the return curve, as a share of `dist` (signed) */
  bend: number;
}

function perimeterPoint(t: number, size: number): [number, number] {
  const e = Math.floor(t) % 4;
  const f = t - Math.floor(t);
  if (e === 0) return [f * size, 0];
  if (e === 1) return [size, f * size];
  if (e === 2) return [size - f * size, size];
  return [0, size - f * size];
}

/**
 * 5-9 triangles that tile the square exactly: the four corners plus a few seeded points on the edges are joined to a seeded point
 * near the middle. Because every corner is a vertex, each triangle touches only one edge of the square.
 */
function makeShards(seed: number, size: number, baseAngle: number): Shard[] {
  const total = randInt(mixSeed(seed, 1), SHARDS_MIN, SHARDS_MAX);
  const ts: number[] = [0, 1, 2, 3];
  for (let j = 0; j < total - 4; j++) {
    for (let a = 0; a < 40; a++) {
      const t = rand(mixSeed(seed, 200 + j * 97 + a)) * 4;
      if (ts.every((o) => Math.min(Math.abs(t - o), 4 - Math.abs(t - o)) > 0.14)) {
        ts.push(t);
        break;
      }
    }
  }
  ts.sort((a, b) => a - b);

  const mid: [number, number] = [
    size * (0.5 + (rand(mixSeed(seed, 2)) - 0.5) * 0.24),
    size * (0.5 + (rand(mixSeed(seed, 3)) - 0.5) * 0.24),
  ];
  const shards: Shard[] = [];
  for (let i = 0; i < ts.length; i++) {
    const a = perimeterPoint(ts[i], size);
    const b = perimeterPoint(ts[(i + 1) % ts.length], size);
    const points: [number, number][] = [mid, a, b];
    const cx = (mid[0] + a[0] + b[0]) / 3;
    const cy = (mid[1] + a[1] + b[1]) / 3;
    const s = mixSeed(seed, 500 + i);
    // outward: away from the lattice centre, nudged by where the shard sits in its tile, with a seeded spread
    const ang = baseAngle + (rand(mixSeed(s, 1)) - 0.5) * 0.9;
    let vx = Math.cos(ang) + ((cx - size / 2) / size) * 1.6;
    let vy = Math.sin(ang) + ((cy - size / 2) / size) * 1.6;
    const len = Math.hypot(vx, vy) || 1;
    vx /= len;
    vy /= len;
    const speed = SHARD_SPEED_MIN + (SHARD_SPEED_MAX - SHARD_SPEED_MIN) * rand(mixSeed(s, 2));
    const spinPerFrame = (0.8 + 3.7 * rand(mixSeed(s, 3))) * (rand(mixSeed(s, 4)) < 0.5 ? -1 : 1);
    const bend = (rand(mixSeed(s, 5)) < 0.5 ? -1 : 1) * (0.18 + 0.22 * rand(mixSeed(s, 6)));
    shards.push({ points, cx, cy, ux: vx, uy: vy, dist: speed * SHATTER_FRAMES, spin: spinPerFrame * SHATTER_FRAMES, bend });
  }
  return shards;
}

// ---------------------------------------------------------------------------------------------------------------------
// Tile face
// ---------------------------------------------------------------------------------------------------------------------

/** A small drawing of a file: document, code, table or picture. Decoration only: it says nothing about the real workspace. */
const FaceIcon: React.FC<{ kind: number; size: number; color: string; strong: string }> = ({ kind, size, color, strong }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: React.ReactNode;
  switch (kind) {
    case 1:
      body = (
        <>
          <path d="M20 21 L12 28 L20 35 M32 21 L40 28 L32 35 M28 17 L24 39" {...common} />
        </>
      );
      break;
    case 2:
      body = (
        <>
          <rect x="9" y="12" width="34" height="28" rx="3" {...common} />
          <path d="M9 21 H43 M9 30 H43 M22 12 V40" {...common} />
        </>
      );
      break;
    case 3:
      body = (
        <>
          <rect x="9" y="12" width="34" height="28" rx="3" {...common} />
          <circle cx="19" cy="21" r="3" {...common} />
          <path d="M9 36 L21 27 L29 33 L35 28 L43 35" {...common} />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M14 7 H31 L40 16 V45 H14 Z M31 7 V16 H40" {...common} />
          <path d="M19 26 H35 M19 32 H35 M19 38 H29" {...common} stroke={strong} opacity={0.7} />
        </>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" style={{ display: "block" }}>
      {body}
    </svg>
  );
};

const TileFace: React.FC<{ size: number; hero: boolean; label?: string; kind: number; shadow: boolean }> = ({ size, hero, label, kind, shadow }) => {
  let labelFont = HERO_LABEL_FONT;
  if (hero && label) {
    const room = size - 28;
    if (estimateWidth(label, labelFont, MONO_ADVANCE) > room) {
      labelFont = Math.max(20, Math.floor(room / (label.length * MONO_ADVANCE)));
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        borderRadius: hero ? HERO_RADIUS : TILE_RADIUS,
        border: `${hero ? 2 : LINE}px solid ${hero ? theme.accent : theme.rule2}`,
        background: hero ? theme.raised : theme.sheet,
        boxShadow: hero
          ? `${shadow ? `${theme.panelShadow}, ` : ""}0 0 36px ${alpha(theme.accent, 0.14)}`
          : shadow
            ? theme.panelShadow
            : "none",
        overflow: "hidden",
      }}
    >
      {hero ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 22, display: "flex", justifyContent: "center" }}>
            <FaceIcon kind={0} size={104} color={theme.ink2} strong={theme.ink} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 16,
              fontFamily: fonts.mono,
              fontSize: labelFont,
              lineHeight: 1.1,
              color: theme.ink,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </div>
        </>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.62 }}>
          <FaceIcon kind={kind} size={50} color={theme.ink3} strong={theme.ink2} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------------------------------

export const FileLattice: React.FC<FileLatticeProps> = ({
  x,
  y,
  count = 24,
  columns = 6,
  heroIndex,
  heroLabel,
  intact = 1,
  shatter = 0,
  reassemble = 0,
  desaturate = 0,
  seed = 11,
  footnote,
}) => {
  if (heroIndex !== undefined && (heroLabel === undefined || heroLabel === "")) {
    throw new Error("FileLattice: heroLabel is required with heroIndex (the file name comes from the evidence)");
  }
  const cells = layoutCells(count, columns, heroIndex);
  const size = latticeSize(count, columns);
  const centre = { x: size.w / 2, y: size.h / 2 };
  const n = cells.length;
  const s = clamp01(shatter);
  const r = clamp01(reassemble);

  const slots: React.ReactNode[] = [];
  const tiles: React.ReactNode[] = [];

  cells.forEach((cell, idx) => {
    const tileSeed = mixSeed(seed, cell.key + 1);
    const enter = clamp01((clamp01(intact) - (idx / n) * ENTER_STAGGER) / (1 - ENTER_STAGGER));
    if (enter <= 0) return;
    const enterE = signature(enter);
    const sTile = clamp01((s - rand(mixSeed(tileSeed, 9001)) * SHATTER_STAGGER) / (1 - SHATTER_STAGGER));
    const rTile = clamp01((r - (n > 1 ? idx / (n - 1) : 0) * REASSEMBLE_STAGGER) / (1 - REASSEMBLE_STAGGER));
    const kind = randInt(mixSeed(tileSeed, 7), 0, 3);

    const whole = r > 0 ? rTile >= 1 : sTile <= 0;
    const groupStyle: React.CSSProperties = {
      position: "absolute",
      left: cell.x,
      top: cell.y,
      width: cell.size,
      height: cell.size,
      opacity: enterE,
      transform: `translateY(${(1 - enterE) * 16}px) scale(${0.94 + 0.06 * enterE})`,
    };

    if (whole) {
      tiles.push(
        <div key={`t${cell.key}`} style={groupStyle}>
          <TileFace size={cell.size} hero={cell.hero} label={heroLabel} kind={kind} shadow />
        </div>,
      );
      return;
    }

    // the empty slot the tile leaves behind (and returns to)
    const slotOp = (r > 0 ? 1 - signature(rTile) : signature(clamp01(sTile * 1.5))) * 0.7;
    if (slotOp > 0.003) {
      slots.push(
        <div
          key={`s${cell.key}`}
          style={{
            position: "absolute",
            left: cell.x,
            top: cell.y,
            width: cell.size,
            height: cell.size,
            boxSizing: "border-box",
            borderRadius: cell.hero ? HERO_RADIUS : TILE_RADIUS,
            border: `${LINE}px dashed ${alpha(theme.rule2, slotOp)}`,
          }}
        />,
      );
    }

    const baseAngle = Math.atan2(cell.y + cell.size / 2 - centre.y, cell.x + cell.size / 2 - centre.x);
    const angle = Math.hypot(cell.x + cell.size / 2 - centre.x, cell.y + cell.size / 2 - centre.y) < 1
      ? rand(mixSeed(tileSeed, 4)) * Math.PI * 2
      : baseAngle;
    const shards = makeShards(tileSeed, cell.size, angle);

    shards.forEach((sh, k) => {
      let dx: number;
      let dy: number;
      let rot: number;
      let op: number;
      if (r > 0) {
        // back along an eased curve with a small overshoot: a quadratic Bezier from the scattered spot to home
        const e = overshoot(rTile, REASSEMBLE_OVERSHOOT);
        const sx = sh.ux * sh.dist;
        const sy = sh.uy * sh.dist;
        const cx = sx / 2 - sh.uy * sh.bend * sh.dist;
        const cy = sy / 2 + sh.ux * sh.bend * sh.dist;
        const u = 1 - e;
        dx = u * u * sx + 2 * u * e * cx;
        dy = u * u * sy + 2 * u * e * cy;
        rot = sh.spin * u;
        op = signature(clamp01(rTile / 0.2));
      } else {
        // out along a straight line, spinning, fading linearly
        dx = sh.ux * sh.dist * sTile;
        dy = sh.uy * sh.dist * sTile;
        rot = sh.spin * sTile;
        op = 1 - sTile;
      }
      if (op <= 0.003) return;
      const poly = sh.points.map(([px, py]) => `${px.toFixed(2)}px ${py.toFixed(2)}px`).join(", ");
      tiles.push(
        <div key={`h${cell.key}-${k}`} style={groupStyle}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `polygon(${poly})`,
              opacity: op,
              transformOrigin: `${sh.cx}px ${sh.cy}px`,
              transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
            }}
          >
            <TileFace size={cell.size} hero={cell.hero} label={heroLabel} kind={kind} shadow={false} />
          </div>
        </div>,
      );
    });
  });

  const drain = clamp01(desaturate);
  const footOp = signature(clamp01(intact));

  return (
    <div style={{ position: "absolute", left: x, top: y, width: size.w, height: size.h, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: drain > 0.001 ? `saturate(${1 - drain}) brightness(${1 - 0.14 * drain})` : undefined,
        }}
      >
        {slots}
        {tiles}
      </div>
      {footnote ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: size.h + 22,
            width: size.w,
            fontFamily: fonts.mono,
            fontSize: FOOTNOTE_FONT,
            lineHeight: 1.3,
            color: theme.ink3,
            opacity: footOp,
          }}
        >
          {footnote}
        </div>
      ) : null}
    </div>
  );
};
