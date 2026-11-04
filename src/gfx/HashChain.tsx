// HashChain: ledger events as horizontal linked blocks (patch 09, BIBLE 11 B).
//
// - Positioned in STAGE px by `x`, `y` (top-left of the first block). Pure and props-driven: nothing here reads the frame.
// - Each block shows the event type (in full), an optional detail line, the SHORT hash (8 hex) and the short hash of the PREVIOUS event. A thin
//   link joins it to the block before it and draws as the block appears. `revealProgress` is one LINEAR 0..1 for the whole chain.
// - Honest links: when the blocks are a selection of a longer ledger, set `gapBefore` (how many events were left out before this
//   one). That link is drawn dashed with "+N" over it, because the block's prevHash points at an event that is not on screen.
//   A link whose prevHash equals the previous block's hash is drawn solid. The component checks this itself.
// - `highlightIndex` marks the delete: vermilion with diagonal hatching, and it stays. `pulse` 0..1 (the scene drives it, for
//   example from a sine of the frame) breathes its glow.
// - `verifyProgress` 0..1 sweeps a scan line along the chain: links turn ok-blue behind it, each block gets a small check, and the
//   sweep finishes with a seal (a ring with a check) and `sealLabel` (the scene builds it from the evidence). The highlighted
//   block stays vermilion: the delete is verified, not hidden ("Undone, not erased").
// - Width: blocks are 220 px wide; the gap shrinks from 64 px to 28 px, which allows at most 7 blocks between the 96 px safe
//   margins. More than that throws; pick the events that matter and use `gapBefore`.
import React from "react";
import { alpha, fonts, layout, theme } from "../config/theme";
import { clamp01, easeOutBack, signature } from "../lib/ease";
import { STAGE } from "../config/timeline";
import { shortHash } from "../lib/hash";

export const CHAIN_BLOCK_W = 220;
export const CHAIN_BLOCK_H = 136;
export const CHAIN_GAP_MAX = 64;
export const CHAIN_GAP_MIN = 28;
/** Distance from the bottom of the chain to the middle of the seal. */
export const CHAIN_SEAL_DROP = 78;

const LINE = 1.5;
const PAD = 14;
const RADIUS = 14;
const SEAL_R = 32;

export type ChainTone = "plain" | "info" | "ok" | "warn" | "bad";

export interface ChainBlock {
  /** The event type, as the ledger spells it (tool.call, snapshot.created, timeline.rewound). */
  label: string;
  /** The event's own hash (full or short: 8 hex are shown). */
  hash: string;
  /** The event's prev_hash. */
  prevHash: string;
  /** Small status pin on the block's top-right corner. Default "plain" (no pin). */
  tone?: ChainTone;
  /** One short mono line under the type (an evidence value such as the command). Clipped to the block. */
  detail?: string;
  /** How many ledger events were left out between the previous block and this one. */
  gapBefore?: number;
}

export interface HashChainProps {
  x: number;
  y: number;
  blocks: readonly ChainBlock[];
  /** 0..1 linear reveal of the whole chain. */
  revealProgress: number;
  /** The block that is the delete. */
  highlightIndex?: number;
  /** 0..1 breathing of the highlighted block's glow. Default 0. */
  pulse?: number;
  /** 0..1 linear sweep of the verification. Default 0. */
  verifyProgress?: number;
  /** The line next to the seal, built by the scene from the evidence. */
  sealLabel?: string;
  /** copy.gfxB.hash */
  hashLabel: string;
  /** copy.gfxB.prev */
  prevLabel: string;
}

/** Gap, total width and height of a chain of `count` blocks. Throws when they do not fit between the safe margins. */
export function hashChainLayout(count: number): { gap: number; w: number; h: number; max: number } {
  const maxW = STAGE.w - 2 * layout.safeMargin;
  const max = Math.floor((maxW + CHAIN_GAP_MIN) / (CHAIN_BLOCK_W + CHAIN_GAP_MIN));
  if (!Number.isInteger(count) || count < 1) throw new Error(`HashChain: needs at least one block (got ${count})`);
  if (count === 1) return { gap: 0, w: CHAIN_BLOCK_W, h: CHAIN_BLOCK_H, max };
  const gap = Math.min(CHAIN_GAP_MAX, (maxW - count * CHAIN_BLOCK_W) / (count - 1));
  if (gap < CHAIN_GAP_MIN) {
    throw new Error(`HashChain: ${count} blocks do not fit between the safe margins (at most ${max}). Pass fewer blocks and use gapBefore.`);
  }
  return { gap, w: count * CHAIN_BLOCK_W + (count - 1) * gap, h: CHAIN_BLOCK_H, max };
}

/** The event type is shown in full: 22 px, shrinking to 20 px for the longest ledger types (sandbox.recreated). */
const labelFont = (label: string): number => Math.max(20, Math.min(22, Math.floor((CHAIN_BLOCK_W - 2 * PAD) / (Math.max(1, label.length) * 0.525))));

const toneColor = (tone: ChainTone): string | null =>
  tone === "ok" ? theme.ok : tone === "bad" ? theme.bad : tone === "warn" ? theme.warn : tone === "info" ? theme.info : null;

export const HashChain: React.FC<HashChainProps> = ({
  x,
  y,
  blocks,
  revealProgress,
  highlightIndex,
  pulse = 0,
  verifyProgress = 0,
  sealLabel,
  hashLabel,
  prevLabel,
}) => {
  const n = blocks.length;
  const { gap, w, h } = hashChainLayout(n);
  const rev = clamp01(revealProgress);
  const vp = clamp01(verifyProgress);
  const sweepX = vp * w;
  const pulseK = clamp01(pulse);

  const links: React.ReactNode[] = [];
  const cards: React.ReactNode[] = [];

  blocks.forEach((b, i) => {
    const p = clamp01(rev * n - i);
    const left = i * (CHAIN_BLOCK_W + gap);
    const linkP = i === 0 ? 0 : signature(clamp01(p / 0.5));
    const blockP = i === 0 ? signature(clamp01(p / 0.65)) : signature(clamp01((p - 0.35) / 0.65));
    const hl = highlightIndex === i;
    const dot = toneColor(b.tone ?? "plain");

    if (i > 0 && linkP > 0) {
      const prev = blocks[i - 1];
      const solid = (b.gapBefore ?? 0) === 0 && b.prevHash.toLowerCase() === prev.hash.toLowerCase();
      const lx = left - gap;
      const drawW = gap * linkP;
      const okW = gap * clamp01((sweepX - lx) / gap);
      const dash = solid ? undefined : "6 6";
      links.push(
        <svg key={`l${i}`} width={drawW} height={4} viewBox={`0 0 ${drawW} 4`} style={{ position: "absolute", left: lx, top: h / 2 - 2 }}>
          <line x1={0} x2={gap} y1={2} y2={2} stroke={theme.ink3} strokeWidth={LINE} strokeDasharray={dash} />
          {vp > 0 ? <line x1={0} x2={okW} y1={2} y2={2} stroke={theme.ok} strokeWidth={2.5} strokeDasharray={dash} /> : null}
        </svg>,
      );
      if (!solid && b.gapBefore && b.gapBefore > 0 && linkP > 0.8) {
        links.push(
          <div
            key={`g${i}`}
            style={{
              position: "absolute",
              left: lx,
              top: h / 2 - 30,
              width: gap,
              textAlign: "center",
              fontFamily: fonts.mono,
              fontSize: 20,
              lineHeight: 1,
              color: theme.ink3,
              opacity: signature(clamp01((linkP - 0.8) / 0.2)),
            }}
          >
            +{b.gapBefore}
          </div>,
        );
      }
      // the crimson attach dot where the link meets this block (its prev_hash pointer)
      const dotP = signature(clamp01((p - 0.3) / 0.2));
      if (dotP > 0) {
        links.push(
          <div
            key={`d${i}`}
            style={{ position: "absolute", left: left - 5, top: h / 2 - 5, width: 10, height: 10, borderRadius: "50%", background: theme.accent, transform: `scale(${dotP})` }}
          />,
        );
      }
    }

    if (blockP <= 0) return;
    const checked = clamp01((sweepX - (left + CHAIN_BLOCK_W / 2)) / 44);
    const border = hl ? theme.bad : theme.rule2;
    const glow = hl ? `0 0 ${14 + 34 * pulseK}px ${alpha(theme.bad, 0.22 + 0.28 * pulseK)}` : theme.panelShadow;
    cards.push(
      <div
        key={`b${i}`}
        style={{
          position: "absolute",
          left,
          top: 0,
          width: CHAIN_BLOCK_W,
          height: CHAIN_BLOCK_H,
          boxSizing: "border-box",
          borderRadius: RADIUS,
          border: `${hl ? 2 : LINE}px solid ${border}`,
          background: hl ? theme.badWash : theme.sheet,
          boxShadow: glow,
          opacity: blockP,
          transform: `translateY(${(1 - blockP) * 18}px)`,
          overflow: "visible",
        }}
      >
        {hl ? <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS - 2, background: theme.hatchBad, opacity: 0.85 + 0.15 * pulseK }} /> : null}
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, height: 28, display: "flex", alignItems: "center" }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: labelFont(b.label),
              lineHeight: 1,
              color: hl ? theme.bad : theme.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {b.label}
          </div>
        </div>
        {dot ? (
          <div
            style={{
              position: "absolute",
              right: -6,
              top: -6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: dot,
              boxShadow: `0 0 0 3px ${theme.paper}`,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: PAD,
            right: PAD,
            top: PAD + 30,
            height: 24,
            fontFamily: fonts.mono,
            fontSize: 20,
            lineHeight: "24px",
            color: theme.ink3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {b.detail ?? ""}
        </div>
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD + 58, height: 30, display: "flex", alignItems: "baseline", gap: 10, fontFamily: fonts.mono, lineHeight: "30px" }}>
          <span style={{ fontSize: 20, color: theme.ink3, width: 52 }}>{hashLabel}</span>
          <span style={{ fontSize: 24, color: theme.ink }}>{shortHash(b.hash)}</span>
        </div>
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD + 88, height: 26, display: "flex", alignItems: "baseline", gap: 10, fontFamily: fonts.mono, lineHeight: "26px" }}>
          <span style={{ fontSize: 20, color: theme.ink3, width: 52 }}>{prevLabel}</span>
          <span style={{ fontSize: 20, color: theme.ink2 }}>{shortHash(b.prevHash)}</span>
        </div>
        {checked > 0 ? (
          <svg
            width={28}
            height={28}
            viewBox="-14 -14 28 28"
            style={{ position: "absolute", left: CHAIN_BLOCK_W / 2 - 14, top: CHAIN_BLOCK_H - 14, overflow: "visible" }}
          >
            <g transform={`scale(${Math.max(0, easeOutBack(checked))})`}>
              <circle r={11} fill={theme.okWash} stroke={theme.ok} strokeWidth={1.75} />
              <path d="M-4.5 0.5 L-1.5 4 L5 -4" fill="none" stroke={theme.ok} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        ) : null}
      </div>,
    );
  });

  // the sweep line
  const sweepOn = vp > 0 && vp < 1;
  const edge = Math.min(1, vp / 0.03, (1 - vp) / 0.03);

  // the seal: a ring that closes, a check, and the label to its left
  const sealP = signature(clamp01((vp - 0.88) / 0.12));
  const ringLen = 2 * Math.PI * SEAL_R;
  const sealCx = w - SEAL_R - 6;
  const sealCy = h + CHAIN_SEAL_DROP;

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none" }}>
      {links}
      {cards}
      {sweepOn ? (
        <>
          <div
            style={{
              position: "absolute",
              left: sweepX - 220,
              top: -20,
              width: 220,
              height: h + 40,
              opacity: edge,
              background: `linear-gradient(90deg, transparent, ${alpha(theme.ok, 0.1)})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: sweepX - 1,
              top: -20,
              width: 2,
              height: h + 40,
              opacity: edge,
              background: theme.ok,
              boxShadow: `0 0 18px ${alpha(theme.ok, 0.5)}`,
            }}
          />
        </>
      ) : null}
      {sealP > 0 ? (
        <>
          <svg
            width={SEAL_R * 2 + 24}
            height={SEAL_R * 2 + 24}
            viewBox={`${-SEAL_R - 12} ${-SEAL_R - 12} ${SEAL_R * 2 + 24} ${SEAL_R * 2 + 24}`}
            style={{ position: "absolute", left: sealCx - SEAL_R - 12, top: sealCy - SEAL_R - 12, overflow: "visible" }}
          >
            <circle r={SEAL_R} fill={alpha(theme.okWash, 0.9 * sealP)} />
            <circle
              r={SEAL_R}
              fill="none"
              stroke={theme.ok}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${ringLen * sealP} ${ringLen}`}
              transform="rotate(-90)"
              style={{ filter: `drop-shadow(0 0 ${14 * sealP}px ${alpha(theme.ok, 0.5)})` }}
            />
            <g transform={`scale(${Math.max(0, easeOutBack(clamp01((sealP - 0.4) / 0.6)))})`}>
              <path d="M-12 1 L-4 9 L13 -9" fill="none" stroke={theme.ok} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
          {sealLabel ? (
            <div
              style={{
                position: "absolute",
                right: w - (sealCx - SEAL_R - 22),
                top: sealCy - 15,
                height: 30,
                fontFamily: fonts.mono,
                fontSize: 26,
                lineHeight: "30px",
                color: theme.ok,
                whiteSpace: "nowrap",
                opacity: signature(clamp01((sealP - 0.3) / 0.7)),
              }}
            >
              {sealLabel}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
