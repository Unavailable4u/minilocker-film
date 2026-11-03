// DecoyRack: the decoy credential tiles, laid out 3 per row (patch 08, BIBLE 11 A).
//
// - Positioned with `x`, `y` in the coordinate space of its parent (inside ContainerBox's slot: box-local px).
// - Pure and props-driven: the scene passes, per tile, `reveal` (entrance), `stateProgress` (how far the current state has
//   developed: drives the light-up and the ripple) and `lineProgress` (the ledger line rises). Nothing reads the frame.
// - Every word is a prop: tile labels come from the canary.seeded event, the state words from copy.gfxA, the ledger line from
//   describe() of the real canary.read event. The icon is chosen from the item id, and is a drawing, not text.
// - States: idle = graphite; read = amber with a ripple; used = vermilion with diagonal hatching (status colors mean status only).
import React from "react";
import { alpha, fonts, hatch, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";

export type DecoyState = "idle" | "read" | "used";

export interface DecoyTile {
  /** Evidence item id (aws_secret, ssh_key, ...): picks the icon, never shown. */
  id: string;
  /** Evidence label ("SSH private key"). */
  label: string;
  state: DecoyState;
  /** 0..1 entrance of the tile. Default 1. */
  reveal?: number;
  /** 0..1 development of the current state (light-up, ripple). Default 1 (settled). Ignored for idle. */
  stateProgress?: number;
  /** The mono ledger line shown under the tile (for example the describe() text of its canary.read event). */
  line?: string;
  /** 0..1 rise of the ledger line. Default 0 (hidden). */
  lineProgress?: number;
}

export interface DecoyRackProps {
  x: number;
  y: number;
  tiles: readonly DecoyTile[];
  /** The three state words (copy.gfxA.decoyIdle / decoyRead / decoyUsed). */
  stateLabels: Record<DecoyState, string>;
  /** 0..1: the rack steps back (for example while the audit stamp is shown). Default 0. */
  dim?: number;
  /** Tiles per row. Default 3 (the spec'd 3 x 2). */
  columns?: number;
}

export const TILE_W = 300;
export const TILE_H = 160;
export const COL_GAP = 48;
export const ROW_GAP = 84;
/** Room under the last row for a ledger line (two mono lines). */
export const LINE_ROOM = 70;

const TILE_RADIUS = 12;
const LINE_BOX_H = 56;
const ICON = 52;

/** Size of the rack for `count` tiles: width, height of the tiles, and the extra room a ledger line needs under the last row. */
export function decoyRackSize(count: number, columns = 3): { w: number; h: number; lineRoom: number } {
  const cols = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / Math.max(1, columns));
  return { w: cols * TILE_W + (cols - 1) * COL_GAP, h: rows * TILE_H + (rows - 1) * ROW_GAP, lineRoom: LINE_ROOM };
}

function hexParts(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Straight blend of two hex colors, t = 0 gives a, t = 1 gives b. */
function lerpHex(a: string, b: string, t: number): string {
  const pa = hexParts(a);
  const pb = hexParts(b);
  const k = clamp01(t);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

type IconKind = "key" | "id" | "cloud" | "token" | "db" | "card" | "doc";

function iconFor(id: string): IconKind {
  const s = id.toLowerCase();
  if (s.includes("ssh")) return "key";
  if (s.includes("aws_key") || s.includes("key_id")) return "id";
  if (s.includes("aws") || s.includes("cloud")) return "cloud";
  if (s.includes("github") || s.includes("token")) return "token";
  if (s.includes("db") || s.includes("database")) return "db";
  if (s.includes("stripe") || s.includes("payment") || s.includes("card")) return "card";
  return "doc";
}

const Icon: React.FC<{ kind: IconKind; color: string }> = ({ kind, color }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: React.ReactNode;
  switch (kind) {
    case "key":
      body = (
        <>
          <circle cx="17" cy="26" r="8" {...common} />
          <path d="M25 26 H46 M38 26 V33 M44 26 V31" {...common} />
        </>
      );
      break;
    case "id":
      body = (
        <>
          <rect x="8" y="12" width="36" height="28" rx="4" {...common} />
          <circle cx="21" cy="24" r="4.5" {...common} />
          <path d="M14 34 a7 5 0 0 1 14 0 M32 22 H39 M32 28 H39" {...common} />
        </>
      );
      break;
    case "cloud":
      body = <path d="M16 37 H36 a8.5 8.5 0 0 0 1.5 -16.9 A11.5 11.5 0 0 0 16 22.5 A7.3 7.3 0 0 0 16 37 Z" {...common} />;
      break;
    case "token":
      body = (
        <>
          <path d="M26 7 L42 16.5 V35.5 L26 45 L10 35.5 V16.5 Z" {...common} />
          <circle cx="26" cy="26" r="4.5" {...common} />
        </>
      );
      break;
    case "db":
      body = (
        <>
          <ellipse cx="26" cy="14" rx="14" ry="6" {...common} />
          <path d="M12 14 V38 a14 6 0 0 0 28 0 V14 M12 26 a14 6 0 0 0 28 0" {...common} />
        </>
      );
      break;
    case "card":
      body = (
        <>
          <rect x="7" y="13" width="38" height="26" rx="4" {...common} />
          <path d="M7 22 H45 M13 32 H23" {...common} />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M14 8 H31 L40 17 V44 H14 Z M31 8 V17 H40" {...common} />
          <path d="M20 27 H34 M20 34 H34" {...common} />
        </>
      );
  }
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 52 52" style={{ display: "block", overflow: "visible" }}>
      {body}
    </svg>
  );
};

const TileView: React.FC<{ tile: DecoyTile; stateLabel: string }> = ({ tile, stateLabel }) => {
  const reveal = signature(clamp01(tile.reveal ?? 1));
  const raw = tile.state === "idle" ? 0 : clamp01(tile.stateProgress ?? 1);
  const p = signature(raw);
  const tone = tile.state === "used" ? theme.bad : theme.warn;
  const wash = tile.state === "used" ? theme.badWash : theme.warnWash;
  const iconColor = lerpHex(theme.ink2, tone, p);
  const wordColor = lerpHex(theme.ink3, tone, p);
  const lineP = signature(clamp01(tile.lineProgress ?? 0));
  const lineColor = tile.state === "used" ? theme.bad : theme.warn;

  // ripple: two rings leaving the icon when a decoy is read
  const rings: React.ReactNode[] = [];
  if (tile.state === "read" && raw > 0 && raw < 1) {
    [0, 0.22].forEach((delay, i) => {
      const rp = clamp01((raw - delay) / (1 - delay));
      if (rp <= 0) return;
      const eased = 1 - Math.pow(1 - rp, 3);
      const d = 2 * (18 + 120 * eased);
      rings.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: 22 + ICON / 2,
            top: 20 + ICON / 2,
            width: d,
            height: d,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `${i === 0 ? 2 : 1.5}px solid ${alpha(theme.warn, 0.75 * (1 - rp))}`,
          }}
        />,
      );
    });
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: TILE_W,
          height: TILE_H,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 16}px)`,
          // the mask opens from the bottom up; at rest it is 200 px wider than the tile on every side so the ripple is not cut
          clipPath: `inset(${-200 + (1 - reveal) * (TILE_H + 200)}px -200px -200px -200px)`,
        }}
      >
        {/* base surface */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxSizing: "border-box",
            borderRadius: TILE_RADIUS,
            border: `1.5px solid ${theme.rule2}`,
            background: theme.raised,
            boxShadow: theme.panelShadow,
          }}
        />
        {/* state surface */}
        {p > 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              borderRadius: TILE_RADIUS,
              border: `1.5px solid ${tone}`,
              background: wash,
              opacity: p,
              overflow: "hidden",
              boxShadow: `0 0 ${34 * p}px ${alpha(tone, 0.3)}`,
            }}
          >
            {tile.state === "used" ? <div style={{ position: "absolute", inset: 0, background: hatch(theme.bad, 0.2) }} /> : null}
          </div>
        ) : null}
        {rings}
        <div style={{ position: "absolute", left: 22, top: 20 }}>
          <Icon kind={iconFor(tile.id)} color={iconColor} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 20,
            top: 24,
            fontFamily: fonts.serif,
            fontSize: 22,
            fontVariantCaps: "all-small-caps",
            letterSpacing: "0.08em",
            fontWeight: 500,
            lineHeight: 1,
            color: wordColor,
          }}
        >
          {stateLabel}
        </div>
        <div
          style={{
            position: "absolute",
            left: 22,
            right: 18,
            bottom: 20,
            fontFamily: fonts.mono,
            fontSize: 22,
            lineHeight: 1.2,
            color: theme.ink,
          }}
        >
          {tile.label}
        </div>
      </div>
      {/* ledger line: rises out of a mask under the tile */}
      {tile.line && lineP > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: TILE_H + 14,
            width: TILE_W + COL_GAP - 8,
            height: LINE_BOX_H,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              paddingLeft: 12,
              borderLeft: `2px solid ${lineColor}`,
              fontFamily: fonts.mono,
              fontSize: 20,
              lineHeight: 1.25,
              color: theme.ink2,
              opacity: lineP,
              transform: `translateY(${(1 - lineP) * LINE_BOX_H}px)`,
            }}
          >
            {tile.line}
          </div>
        </div>
      ) : null}
    </>
  );
};

export const DecoyRack: React.FC<DecoyRackProps> = ({ x, y, tiles, stateLabels, dim = 0, columns = 3 }) => {
  const d = clamp01(dim);
  const size = decoyRackSize(tiles.length, columns);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size.w,
        height: size.h,
        opacity: 1 - 0.72 * d,
        pointerEvents: "none",
      }}
    >
      {tiles.map((tile, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return (
          <div key={tile.id} style={{ position: "absolute", left: col * (TILE_W + COL_GAP), top: row * (TILE_H + ROW_GAP), width: TILE_W, height: TILE_H }}>
            <TileView tile={tile} stateLabel={stateLabels[tile.state]} />
          </div>
        );
      })}
    </div>
  );
};
