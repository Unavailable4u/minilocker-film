// E8b · Tamper schematic (slide 10). Three small blocks that show WHY the ledger above can be trusted: each block carries the hash of the block before it, so
// editing one event breaks every link after it. It is a drawing of the mechanism, not a run: the hashes are the symbols h0 to h3, never real hashes, and the
// label over it says so in words (words.s10.schematic). The middle block is the edited one (vermilion border and hatching, as the film marks a delete), the
// link it breaks is drawn in vermilion with a crossing drawn as lines (not a font glyph).
//
// Geometry is fixed in px (three blocks and two links across `width`), text is 28 px mono and 32 px serif, so nothing here depends on a scale factor.
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";

const BLOCK_H = 112;
const ROW_Y = [14, 62] as const; // top of the "hash" row and of the "prev" row inside a block
const ROW_H = 36;
const FONT = 28;
const PAD = 18;

export interface TamperSchematicProps {
  width: number;
  /** words.s10.schematic: says this is a drawing of the mechanism, not a run. */
  label: string;
  /** words.s10.tamperCaption. */
  caption: string;
  /** copy.gfxB.hash and copy.gfxB.prev: the film's own row labels. */
  hashWord: string;
  prevWord: string;
}

/** The symbols: block 1 hash h1 / prev h0; block 2 (edited) h2' / h1; block 3 h3 / h2. Never real hashes. */
const BLOCKS = [
  { hash: "h1", prev: "h0", edited: false },
  { hash: "h2'", prev: "h1", edited: true },
  { hash: "h3", prev: "h2", edited: false },
] as const;

export const TAMPER_LABEL_H = 34;
export const TAMPER_CAPTION_H = 46;
export const TAMPER_H = TAMPER_LABEL_H + BLOCK_H + 10 + TAMPER_CAPTION_H;

export const TamperSchematic: React.FC<TamperSchematicProps> = ({ width, label, caption, hashWord, prevWord }) => {
  const blockW = 250;
  const gap = (width - 3 * blockW) / 2;
  const top = TAMPER_LABEL_H;
  const left = (i: number): number => i * (blockW + gap);
  // a link leaves the right edge of block i at its hash row and arrives at the left edge of block i+1 at its prev row
  const link = (i: number): { x1: number; y1: number; x2: number; y2: number } => ({
    x1: left(i) + blockW,
    y1: top + ROW_Y[0] + ROW_H / 2,
    x2: left(i + 1),
    y2: top + ROW_Y[1] + ROW_H / 2,
  });
  const broken = 1; // the link from block index 1 (edited) to block index 2 no longer matches
  const mid = (i: number): { x: number; y: number } => {
    const l = link(i);
    return { x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2 };
  };
  const cross = mid(broken);

  return (
    <div style={{ position: "relative", width, height: TAMPER_H }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: TAMPER_LABEL_H, fontFamily: fonts.mono, fontSize: 24, lineHeight: `${TAMPER_LABEL_H}px`, color: theme.ink3 }}>{label}</div>

      {BLOCKS.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: left(i), top, width: blockW, height: BLOCK_H, boxSizing: "border-box", borderRadius: 14,
            border: `${b.edited ? 2 : 1.5}px solid ${b.edited ? theme.bad : theme.rule2}`, background: b.edited ? theme.badWash : theme.sheet,
            boxShadow: b.edited ? `0 0 22px ${alpha(theme.bad, 0.25)}` : theme.panelShadow,
          }}
        >
          {b.edited ? <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: theme.hatchBad }} /> : null}
          {[
            { word: hashWord, value: b.hash, y: ROW_Y[0], color: b.edited ? theme.bad : theme.ink },
            { word: prevWord, value: b.prev, y: ROW_Y[1], color: theme.ink2 },
          ].map((r) => (
            <div key={r.word} style={{ position: "absolute", left: PAD, right: PAD, top: r.y, height: ROW_H, display: "flex", alignItems: "baseline", gap: 14, fontFamily: fonts.mono, fontSize: FONT, lineHeight: `${ROW_H}px` }}>
              <span style={{ color: theme.ink3, width: 78 }}>{r.word}</span>
              <span style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
      ))}

      <svg width={width} height={TAMPER_H} viewBox={`0 0 ${width} ${TAMPER_H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {[0, 1].map((i) => {
          const l = link(i);
          const bad = i === broken;
          const color = bad ? theme.bad : theme.ink3;
          // arrowhead at (x2, y2), pointing along the link
          const a = Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
          const hx = l.x2 - 11 * Math.cos(a);
          const hy = l.y2 - 11 * Math.sin(a);
          const nx = -Math.sin(a) * 6;
          const ny = Math.cos(a) * 6;
          return (
            <g key={i}>
              <line x1={l.x1} y1={l.y1} x2={hx} y2={hy} stroke={color} strokeWidth={bad ? 3 : 2.25} strokeDasharray="8 7" strokeLinecap="round" />
              <path d={`M${l.x2} ${l.y2} L${hx + nx} ${hy + ny} L${hx - nx} ${hy - ny} Z`} fill={color} />
            </g>
          );
        })}
        {/* the crossing: two strokes, drawn, not a glyph */}
        <circle cx={cross.x} cy={cross.y} r={19} fill={theme.paper} stroke={theme.bad} strokeWidth={2.5} />
        <path d={`M${cross.x - 8} ${cross.y - 8} L${cross.x + 8} ${cross.y + 8} M${cross.x + 8} ${cross.y - 8} L${cross.x - 8} ${cross.y + 8}`} stroke={theme.bad} strokeWidth={4} strokeLinecap="round" />
      </svg>

      <div style={{ position: "absolute", left: 0, top: top + BLOCK_H + 10, height: TAMPER_CAPTION_H, fontFamily: fonts.serif, fontStyle: "italic", fontSize: 32, lineHeight: `${TAMPER_CAPTION_H}px`, color: theme.ink2, whiteSpace: "nowrap" }}>{caption}</div>
    </div>
  );
};
