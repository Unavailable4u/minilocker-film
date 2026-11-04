// CompareTable: the competitive table of S7, 4 rows x 3 columns (patch 10, BIBLE 11 C).
//
// - Positioned in STAGE px by `x`, `y` (top-left of the table; default centred horizontally). The table is COMPARE_W (1500) wide; a row is
//   COMPARE_ROW_H (92) px tall; the last row is the product's own row and is the one `emphasis` grows (6% larger) and gives the accent edge.
// - Pure and props-driven: nothing here reads the frame. A scene passes 0..1 progress values (`headerProgress`, `rowProgress[i]`,
//   `emphasis`). No CSS transitions, no timers, no randomness.
// - Every word is a prop. Row labels and sentences come from copy.s7.rows, column heads, marks and legend from copy.gfxC. The marks are an
//   editorial judgement about GENERIC categories (never product names), not a measurement: they live in copy.ts and nowhere else.
// - Marks: a check (full), a half-filled ring (partial) or a dash (none). In the product row, at full emphasis, the checks become solid
//   crimson discs. The accent is the single color of the drawing.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { STAGE } from "../config/timeline";
import { clamp01, easeOutBack, signature } from "../lib/ease";

export type CompareMark = "full" | "partial" | "none";

export const COMPARE_W = 1500;
export const COMPARE_ROW_H = 92;
export const COMPARE_HEAD_H = 76;
/** Growth of the product row at emphasis 1 (BIBLE 11 C: 6% larger). */
export const COMPARE_GROW = 0.06;

const LABEL_W = 561;
const COL_W = 313; // LABEL_W + 3 * COL_W = COMPARE_W
const COLUMNS = 3;
const HEAD_GAP = 14;
const ROW_GAP = 12;
const LAST_GAP = 30; // the product row stands apart from the other categories
const LINE = 1.5;
const DIM_OTHERS = 0.36; // the other rows lose this much opacity at full emphasis

export interface CompareRowText {
  /** The category, e.g. copy.s7.rows[i].label */
  label: string;
  /** One sentence under it, e.g. copy.s7.rows[i].text */
  text: string;
}

export interface CompareTableProps {
  /** One entry per row. The LAST row is the product's own row (the one `emphasis` acts on). */
  rows: readonly CompareRowText[];
  /** Exactly 3 column heads (copy.gfxC.compareColumns). */
  columns: readonly string[];
  /** marks[row][column], same shape as rows x columns (copy.gfxC.compareMarks). */
  marks: readonly (readonly CompareMark[])[];
  /** 0..1 per row: the row rises in, then its marks pop one column after another. */
  rowProgress: readonly number[];
  /** 0..1: the product row grows 6%, gets the accent edge and outline; the other rows step back. */
  emphasis: number;
  /** 0..1: the column heads and their rule. Default 1. */
  headerProgress?: number;
  /** Words of the legend under the table (copy.gfxC.compareLegend). Omit for no legend. */
  legend?: Record<CompareMark, string>;
  /** Top-left corner in stage px. Default: centred horizontally, y = 200. */
  x?: number;
  y?: number;
}

/** Top of row `i` inside the table box, px. */
function rowTop(i: number, count: number): number {
  const extra = i === count - 1 && count > 1 ? LAST_GAP - ROW_GAP : 0;
  return COMPARE_HEAD_H + HEAD_GAP + i * (COMPARE_ROW_H + ROW_GAP) + extra;
}

/** Width and height of the table box for `count` rows (the legend is not counted). */
export function compareTableSize(count: number): { w: number; h: number } {
  return { w: COMPARE_W, h: rowTop(count - 1, count) + COMPARE_ROW_H };
}

// ---------------------------------------------------------------------------------------------- marks

const R = 17;

const MarkGlyph: React.FC<{ kind: CompareMark; pop: number; emphasis: number; size?: number }> = ({ kind, pop, emphasis, size = 44 }) => {
  const p = clamp01(pop);
  if (p <= 0.001) return null;
  const scale = Math.max(0, easeOutBack(p, 2.2));
  const e = clamp01(emphasis);
  return (
    <svg width={size} height={size} viewBox="-22 -22 44 44" style={{ display: "block", overflow: "visible", opacity: clamp01(p * 3), transform: `scale(${scale})` }}>
      {kind === "full" ? (
        <>
          <g opacity={1 - e}>
            <circle r={R} fill="none" stroke={theme.ink} strokeWidth={2} />
            <path d="M -7 0.5 L -2 6 L 8 -6" fill="none" stroke={theme.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {e > 0.001 ? (
            <g opacity={e} style={{ filter: `drop-shadow(0 0 8px ${alpha(theme.accent, 0.45)})` }}>
              <circle r={R + 1} fill={theme.accent} />
              <path d="M -7 0.5 L -2 6 L 8 -6" fill="none" stroke={theme.onAccent} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
        </>
      ) : null}
      {kind === "partial" ? (
        <>
          <circle r={R} fill="none" stroke={theme.ink2} strokeWidth={2} />
          <path d={`M 0 ${-R + 3} A ${R - 3} ${R - 3} 0 0 0 0 ${R - 3} Z`} fill={theme.ink2} opacity={0.85} />
        </>
      ) : null}
      {kind === "none" ? <line x1={-9} y1={0} x2={9} y2={0} stroke={theme.ink3} strokeWidth={2.6} strokeLinecap="round" /> : null}
    </svg>
  );
};

const SMALL_CAPS: React.CSSProperties = { fontVariantCaps: "all-small-caps", letterSpacing: "0.08em" };

// ---------------------------------------------------------------------------------------------- component

export const CompareTable: React.FC<CompareTableProps> = ({
  rows,
  columns,
  marks,
  rowProgress,
  emphasis,
  headerProgress = 1,
  legend,
  x = (STAGE.w - COMPARE_W) / 2,
  y = 200,
}) => {
  if (columns.length !== COLUMNS) throw new Error(`CompareTable: expected ${COLUMNS} column heads, got ${columns.length}`);
  if (rows.length < 2) throw new Error("CompareTable: needs at least 2 rows (the categories, then the product's own row)");
  if (marks.length !== rows.length) throw new Error(`CompareTable: marks needs one row per entry of rows (${rows.length}), got ${marks.length}`);
  marks.forEach((r, i) => {
    if (r.length !== COLUMNS) throw new Error(`CompareTable: marks[${i}] needs ${COLUMNS} marks, got ${r.length}`);
  });
  if (rowProgress.length !== rows.length) throw new Error(`CompareTable: rowProgress needs ${rows.length} values, got ${rowProgress.length}`);

  const count = rows.length;
  const last = count - 1;
  const e = signature(clamp01(emphasis));
  const head = signature(clamp01(headerProgress));
  const size = compareTableSize(count);

  return (
    <div style={{ position: "absolute", left: x, top: y, width: COMPARE_W, height: size.h, pointerEvents: "none" }}>
      {/* column heads */}
      {head > 0.001 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: COMPARE_W, height: COMPARE_HEAD_H, opacity: head }}>
          {columns.map((c, j) => (
            <div
              key={j}
              style={{
                position: "absolute",
                left: LABEL_W + j * COL_W,
                top: 0,
                width: COL_W,
                height: COMPARE_HEAD_H - 8,
                boxSizing: "border-box",
                padding: "0 14px 6px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: fonts.serif,
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1.2,
                color: theme.ink2,
                ...SMALL_CAPS,
                transform: `translateY(${(1 - head) * 10}px)`,
              }}
            >
              {c}
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: COMPARE_HEAD_H - 4,
              width: COMPARE_W,
              height: LINE,
              background: theme.rule2,
              transformOrigin: "left center",
              transform: `scaleX(${head})`,
            }}
          />
        </div>
      ) : null}

      {/* rows */}
      {rows.map((row, i) => {
        const rp = clamp01(rowProgress[i]);
        if (rp <= 0.001) return null;
        const isLast = i === last;
        const rise = signature(clamp01(rp / 0.45));
        const grow = isLast ? 1 + COMPARE_GROW * e : 1;
        const dim = isLast ? 1 : 1 - DIM_OTHERS * e;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: rowTop(i, count),
              width: COMPARE_W,
              height: COMPARE_ROW_H,
              boxSizing: "border-box",
              borderRadius: 14,
              border: `${LINE}px solid ${theme.rule2}`,
              background: isLast ? alpha(theme.raised, 0.92) : alpha(theme.sheet, 0.78),
              boxShadow: isLast && e > 0.001 ? `${theme.panelShadow}, 0 0 ${48 * e}px ${alpha(theme.accent, 0.16 * e)}` : theme.panelShadow,
              opacity: rise * dim,
              transformOrigin: "50% 50%",
              transform: `translateY(${(1 - rise) * 16}px) scale(${grow})`,
            }}
          >
            {/* accent outline and edge of the product row */}
            {isLast && e > 0.001 ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: -LINE,
                    borderRadius: 14,
                    border: `2px solid ${theme.accent}`,
                    opacity: e,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: 6,
                    borderRadius: 3,
                    background: theme.accent,
                    boxShadow: `0 0 18px ${alpha(theme.accent, 0.6)}`,
                    transformOrigin: "center",
                    transform: `scaleY(${e})`,
                  }}
                />
              </>
            ) : null}

            {/* label and sentence */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: LABEL_W,
                height: "100%",
                boxSizing: "border-box",
                padding: "0 24px 0 30px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 28, lineHeight: "31px", color: theme.ink, letterSpacing: "-0.01em" }}>
                {row.label}
              </div>
              <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontWeight: 500, fontSize: 22, lineHeight: "26px", color: theme.ink2 }}>
                {row.text}
              </div>
            </div>

            {/* marks */}
            {marks[i].map((m, j) => {
              const start = 0.4 + 0.14 * j;
              const pop = clamp01((rp - start) / 0.32);
              return (
                <React.Fragment key={j}>
                  <div
                    style={{
                      position: "absolute",
                      left: LABEL_W + j * COL_W,
                      top: 16,
                      bottom: 16,
                      width: 1,
                      background: theme.rule,
                      opacity: rise,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: LABEL_W + j * COL_W,
                      top: 0,
                      width: COL_W,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MarkGlyph kind={m} pop={pop} emphasis={isLast ? e : 0} />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        );
      })}

      {/* legend */}
      {legend && head > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: size.h + 40,
            width: COMPARE_W,
            display: "flex",
            justifyContent: "center",
            gap: 56,
            opacity: head * clamp01(rowProgress[last] * 2),
            fontFamily: fonts.mono,
            fontSize: 20,
            lineHeight: "24px",
            color: theme.ink3,
          }}
        >
          {(["full", "partial", "none"] as const).map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MarkGlyph kind={k} pop={1} emphasis={0} size={30} />
              <span>{legend[k]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
