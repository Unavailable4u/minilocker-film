// E4 · Attempt table (slide 06). The poisoned module's own log, one row per attempt: what it tried (mono, the log's own key) and how it ended.
// "read a decoy" is amber (the attempt went through, on a planted decoy); "refused" is vermilion AND hatched (it errored: the container or the egress
// proxy said no). Red never carries the meaning alone.
//
// Static and props-driven: nothing reads the frame. Rows come from the ledger (facts.hookAttempts); every word is a prop.
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";

export interface AttemptRow {
  attempt: string;
  /** true: the attempt went through (it only ever met decoys); false: it errored. */
  ok: boolean;
}

export interface AttemptTableProps {
  rows: readonly AttemptRow[];
  width: number;
  /** Column heads and the two outcome words. */
  heads: { attempt: string; outcome: string };
  words: { read: string; refused: string };
}

export const ATTEMPT_ROW_H = 54;
export const ATTEMPT_HEAD_H = 46;
const GAP = 6;

/** Height of the table for `n` rows. */
export function attemptTableHeight(n: number): number {
  return ATTEMPT_HEAD_H + n * (ATTEMPT_ROW_H + GAP);
}

const Chip: React.FC<{ ok: boolean; children: string }> = ({ ok, children }) => (
  <div
    style={{
      boxSizing: "border-box",
      padding: "0 16px",
      height: 40,
      display: "flex",
      alignItems: "center",
      borderRadius: 8,
      border: `1.5px solid ${ok ? theme.warn : theme.bad}`,
      background: ok ? theme.warnWash : `${theme.hatchBad}, ${theme.badWash}`,
      fontFamily: fonts.mono,
      fontSize: 28,
      lineHeight: 1,
      color: ok ? theme.warn : theme.bad,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

export const AttemptTable: React.FC<AttemptTableProps> = ({ rows, width, heads, words }) => (
  <div style={{ width }}>
    <div
      style={{
        height: ATTEMPT_HEAD_H,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "0 22px",
        borderBottom: `1.5px solid ${theme.rule2}`,
        fontFamily: fonts.mono,
        fontSize: 24,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: theme.ink3,
      }}
    >
      <span>{heads.attempt}</span>
      <span>{heads.outcome}</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: GAP, paddingTop: GAP }}>
      {rows.map((r) => (
        <div
          key={r.attempt}
          style={{
            height: ATTEMPT_ROW_H,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px 0 22px",
            borderRadius: 10,
            border: `1px solid ${theme.rule}`,
            background: alpha(theme.sheet, 0.9),
            boxShadow: theme.panelShadow,
          }}
        >
          <span style={{ fontFamily: fonts.mono, fontSize: 28, color: theme.ink }}>{r.attempt}</span>
          <Chip ok={r.ok}>{r.ok ? words.read : words.refused}</Chip>
        </div>
      ))}
    </div>
  </div>
);
