// HashTile: the hash strip of one restored file (patch 09, BIBLE 11 B). "snapshot" hash on top, "restored" hash below it, character
// for character in the same columns, so a match is visible at a glance.
//
// - Positioned in STAGE px by `x`, `y` (top-left of the strip). Pure and props-driven: nothing here reads the frame.
// - The restored hash resolves left to right out of scrambled hex digits (src/lib/hash.ts lockHex). `lockProgress` 0..1 says how
//   much of it is locked (the film gives it 20-24 frames per tile). The scramble flickers with `clock` (pass the global frame; it
//   only drives the scramble, never the lock). Default clock is derived from `lockProgress`.
// - Between the two rows a hairline joins every locked column: blue where the characters are equal, vermilion where they differ.
// - When all of it is locked AND it matches, a check tick pops and the strip's edge glows ok-blue. `tickProgress` 0..1 drives the
//   pop (default: 1 once locked, 0 before). If the two hashes differ, the strip shows a hatched vermilion cross instead of a tick
//   and `mismatchLabel` under it. It never shows a reassuring tick for a mismatch.
// - Every word and every hash is a prop (copy.gfxB, evidence). Both hashes must have the same length.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, easeOutBack, signature } from "../lib/ease";
import { lockHex } from "../lib/hash";

export const HASH_FONT = 22;
/** Advance of one hex character at HASH_FONT: 22 px x 0.525 (CMU Typewriter). Every character gets a cell this wide. */
export const HASH_CH_W = 11.55;

const PAD = 16;
const LABEL_W = 100;
const LABEL_FONT = 20;
const GAP_X = 12;
const TICK_W = 64;
const ROW_H = 30;
const BRIDGE_H = 34;
const LINE = 1.5;
const RADIUS = 12;
/** Large start frame for lockHex when only the scrambled string is wanted. */
const NEVER = 1_000_000_000;

export interface HashTileProps {
  x: number;
  y: number;
  /** The restored hash (a SHA-256, 64 hex) that resolves. */
  finalHex: string;
  /** The snapshot hash it is compared with, shown on the top row. Same length as `finalHex`. */
  referenceHex: string;
  /** 0..1: how much of the restored hash is locked. */
  lockProgress: number;
  /** 0..1: the top row and the strip appear. Default 1. */
  reveal?: number;
  /** 0..1 pop of the tick and glow. Default 1 once `lockProgress` is 1, else 0. */
  tickProgress?: number;
  /** Flicker clock for the scrambled digits (the global frame). Default derived from `lockProgress`. */
  clock?: number;
  /** Seed of the scrambled digits. Default 0. */
  seed?: number;
  /** copy.gfxB.snapshot */
  snapshotLabel: string;
  /** copy.gfxB.restored */
  restoredLabel: string;
  /** copy.gfxB.mismatch: shown under the strip when the two hashes differ. */
  mismatchLabel: string;
}

/** Width and height of the strip for a hash of `hexLength` characters. */
export function hashTileSize(hexLength = 64): { w: number; h: number; hashW: number } {
  const hashW = hexLength * HASH_CH_W;
  return { w: PAD + LABEL_W + hashW + GAP_X + TICK_W + PAD, h: PAD + ROW_H + BRIDGE_H + ROW_H + PAD, hashW };
}

const Row: React.FC<{ chars: string; color: (i: number) => string; top: number; left: number }> = ({ chars, color, top, left }) => (
  <div style={{ position: "absolute", left, top, height: ROW_H, display: "flex", fontFamily: fonts.mono, fontSize: HASH_FONT, lineHeight: `${ROW_H}px` }}>
    {Array.from(chars).map((ch, i) => (
      <span key={i} style={{ display: "inline-block", width: HASH_CH_W, textAlign: "center", color: color(i) }}>
        {ch}
      </span>
    ))}
  </div>
);

export const HashTile: React.FC<HashTileProps> = ({
  x,
  y,
  finalHex,
  referenceHex,
  lockProgress,
  reveal = 1,
  tickProgress,
  clock,
  seed = 0,
  snapshotLabel,
  restoredLabel,
  mismatchLabel,
}) => {
  const n = finalHex.length;
  if (n === 0 || referenceHex.length !== n) {
    throw new Error(`HashTile: finalHex and referenceHex must be the same non-zero length (got ${n} and ${referenceHex.length})`);
  }
  const size = hashTileSize(n);
  const rev = signature(clamp01(reveal));
  if (rev <= 0.001) return null;

  const p = clamp01(lockProgress);
  const locked = p >= 1 ? n : Math.floor(p * n);
  const done = locked >= n;
  const scramble = lockHex(finalHex, clock ?? Math.round(p * 1000), NEVER, n, seed);
  const restored = finalHex.slice(0, locked) + scramble.slice(locked);
  const match = finalHex.toLowerCase() === referenceHex.toLowerCase();
  const tick = clamp01(tickProgress ?? (done ? 1 : 0));
  const good = done && match;
  const bad = done && !match;
  const rowOp = clamp01(p * 10);

  const left = PAD + LABEL_W;
  const topRow = PAD;
  const bottomRow = PAD + ROW_H + BRIDGE_H;
  const edge = good ? alpha(theme.ok, 0.35 + 0.65 * tick) : bad ? theme.bad : theme.rule2;
  const glow = good ? `0 0 ${36 * tick}px ${alpha(theme.ok, 0.3 * tick)}, inset 0 0 0 1px ${alpha(theme.ok, 0.25 * tick)}` : "none";

  const bridge: React.ReactNode[] = [];
  for (let i = 0; i < locked; i++) {
    const same = finalHex[i].toLowerCase() === referenceHex[i].toLowerCase();
    bridge.push(
      <line
        key={i}
        x1={i * HASH_CH_W + HASH_CH_W / 2}
        x2={i * HASH_CH_W + HASH_CH_W / 2}
        y1={2}
        y2={BRIDGE_H - 2}
        stroke={same ? alpha(theme.ok, 0.7) : theme.bad}
        strokeWidth={LINE}
      />,
    );
  }

  const markX = left + size.hashW + GAP_X + TICK_W / 2;
  const markY = bottomRow + ROW_H / 2;
  const pop = good ? Math.max(0, easeOutBack(tick)) : bad ? signature(tick) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size.w,
        height: size.h,
        boxSizing: "border-box",
        borderRadius: RADIUS,
        border: `${LINE}px solid ${edge}`,
        background: alpha(theme.sheet, 0.86),
        boxShadow: glow,
        opacity: rev,
        transform: `translateY(${(1 - rev) * 14}px)`,
        pointerEvents: "none",
      }}
    >
      {bad ? <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS, background: theme.hatchBad, opacity: tick * 0.8 }} /> : null}

      <div style={{ position: "absolute", left: PAD, top: topRow, height: ROW_H, fontFamily: fonts.mono, fontSize: LABEL_FONT, lineHeight: `${ROW_H}px`, color: theme.ink3 }}>
        {snapshotLabel}
      </div>
      <Row chars={referenceHex} color={() => theme.ink2} top={topRow} left={left} />

      <svg width={size.hashW} height={BRIDGE_H} viewBox={`0 0 ${size.hashW} ${BRIDGE_H}`} style={{ position: "absolute", left, top: topRow + ROW_H }}>
        {bridge}
      </svg>

      <div style={{ opacity: rowOp }}>
        <div style={{ position: "absolute", left: PAD, top: bottomRow, height: ROW_H, fontFamily: fonts.mono, fontSize: LABEL_FONT, lineHeight: `${ROW_H}px`, color: theme.ink3 }}>
          {restoredLabel}
        </div>
        <Row
          chars={restored}
          top={bottomRow}
          left={left}
          color={(i) => {
            if (i >= locked) return alpha(theme.ink3, 0.8);
            return finalHex[i].toLowerCase() === referenceHex[i].toLowerCase() ? theme.ink : theme.bad;
          }}
        />
      </div>

      {good && tick > 0 ? (
        <svg width={44} height={44} viewBox="-22 -22 44 44" style={{ position: "absolute", left: markX - 22, top: markY - 22, overflow: "visible" }}>
          <g transform={`scale(${pop})`}>
            <circle r={16} fill={alpha(theme.okWash, 0.9)} stroke={theme.ok} strokeWidth={2} />
            <path d="M-7 0.5 L-2 6 L8 -6" fill="none" stroke={theme.ok} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      ) : null}
      {bad && tick > 0 ? (
        <svg width={44} height={44} viewBox="-22 -22 44 44" style={{ position: "absolute", left: markX - 22, top: markY - 22, overflow: "visible" }}>
          <g transform={`scale(${pop})`}>
            <circle r={16} fill={theme.badWash} stroke={theme.bad} strokeWidth={2} />
            <path d="M-6 -6 L6 6 M6 -6 L-6 6" fill="none" stroke={theme.bad} strokeWidth={3} strokeLinecap="round" />
          </g>
        </svg>
      ) : null}
      {bad ? (
        <div
          style={{
            position: "absolute",
            right: PAD,
            top: size.h + 10,
            fontFamily: fonts.mono,
            fontSize: LABEL_FONT,
            lineHeight: 1,
            color: theme.bad,
            opacity: tick,
          }}
        >
          {mismatchLabel}
        </div>
      ) : null}
    </div>
  );
};
