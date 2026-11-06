// Deck kit: the pieces every slide uses. Colours and fonts come from src/config/theme.ts only (light film, src/index.light.ts).
import React from "react";
import { AbsoluteFill } from "remotion";
import { fonts, theme } from "../config/theme";
import { GridPaper } from "../fx/GridPaper";

export const DECK = { w: 1920, h: 1080, mx: 96, top: 72, footerH: 64, total: 12 } as const;

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.accentInk }}>{children}</div>
);

export const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 96 }) => (
  <div style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: 1.04, color: theme.ink, marginTop: 14 }}>{children}</div>
);

export const Lead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 40, lineHeight: 1.25, color: theme.ink2, marginTop: 18 }}>{children}</div>
);

/** A big number with a mono label under it. The value must come from src/data/select.ts, never typed. */
export const Numeral: React.FC<{ value: React.ReactNode; label: string; tone?: "ok" | "bad" | "ink" }> = ({ value, label, tone = "ink" }) => (
  <div>
    <div style={{ fontFamily: fonts.serif, fontSize: 88, lineHeight: 1, color: tone === "ok" ? theme.ok : tone === "bad" ? theme.bad : theme.ink }}>{value}</div>
    <div style={{ fontFamily: fonts.mono, fontSize: 24, color: theme.ink3, marginTop: 8 }}>{label}</div>
  </div>
);

/** "10 of 10" as a Numeral value: the first count big, "of N" smaller and quieter. Both counts and the word come from the evidence / copy.ts. */
export const Ratio: React.FC<{ a: number; of: string; b: number }> = ({ a, of, b }) => (
  <span>
    {a}
    <span style={{ fontSize: 48, color: theme.ink3 }}>
      {" "}
      {of} {b}
    </span>
  </span>
);

/**
 * A callout tag in the film's glass style: a crimson dot and a short serif-italic phrase (copy.ts, five words at most). `lead` draws a leader line of that
 * length to the left of the dot, so the tag can point at the numeral or line beside it.
 */
export const Tag: React.FC<{ children: string; lead?: number }> = ({ children, lead = 0 }) => (
  <div style={{ display: "inline-flex", alignItems: "center" }}>
    {lead > 0 ? <div style={{ width: lead, height: 3, borderRadius: 2, background: theme.accent }} /> : null}
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 16px", borderRadius: 999, background: theme.sheet,
        border: `1px solid ${theme.rule2}`, boxShadow: theme.panelShadow, fontFamily: fonts.serif, fontStyle: "italic", fontSize: 30, lineHeight: 1.1, color: theme.ink, whiteSpace: "nowrap",
      }}
    >
      <span style={{ flex: "none", width: 14, height: 14, borderRadius: 7, background: theme.accent }} />
      {children}
    </div>
  </div>
);

/** The numbered crimson dot on its own (inline use, e.g. in a note list). */
export const Dot: React.FC<{ n: number; size?: number }> = ({ n, size = 44 }) => (
  <div
    style={{
      flex: "none", width: size, height: size, borderRadius: size / 2, background: theme.accent, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.mono, fontSize: Math.round(size * 0.59),
      boxShadow: "0 6px 16px -6px rgba(217,15,61,.6)",
    }}
  >
    {n}
  </div>
);

/** A numbered crimson dot to put on a screenshot. `left` and `top` are the dot's CENTRE in slide-content px (see mapPoint in Shot.tsx). */
export const Pin: React.FC<{ n: number; left: number; top: number }> = ({ n, left, top }) => (
  <div style={{ position: "absolute", left: left - 22, top: top - 22 }}>
    <Dot n={n} />
  </div>
);

/** A numbered note beside a screenshot: dot, heading (serif 36), body (serif 30). Matches the Pin with the same number. */
export const Note: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
    <Dot n={n} />
    <div>
      <div style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 1.1, color: theme.ink }}>{title}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 1.25, color: theme.ink2, marginTop: 6 }}>{children}</div>
    </div>
  </div>
);

/** A mono pill (model name, host, licence). Text must come from copy.ts or the evidence selectors. */
export const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "inline-block", fontFamily: fonts.mono, fontSize: 26, color: theme.ink2, background: theme.sheet,
      border: `1px solid ${theme.rule2}`, borderRadius: 999, padding: "8px 22px", whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

/**
 * The slide shell: paper background, grid, footer. Children are positioned in slide px, inside a box that starts at (96, 72) and is 1728 x 920.
 * `backdrop` is drawn between the grid and the content (cover only). `footer` replaces the default footer text (cover only).
 */
export const Slide: React.FC<{ n: number; children: React.ReactNode; backdrop?: React.ReactNode; footer?: { left: React.ReactNode; right: React.ReactNode } }> = ({
  n,
  children,
  backdrop,
  footer,
}) => (
  <AbsoluteFill style={{ background: theme.paper, fontFamily: fonts.serif, color: theme.ink }}>
    <GridPaper />
    {backdrop}
    <div style={{ position: "absolute", left: DECK.mx, right: DECK.mx, top: DECK.top, bottom: DECK.footerH + 24 }}>{children}</div>
    <div
      style={{
        position: "absolute", left: DECK.mx, right: DECK.mx, bottom: 0, height: DECK.footerH, borderTop: `1px solid ${theme.rule}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 22, color: theme.ink3,
      }}
    >
      <span>{footer ? footer.left : "MiniLocker · Vultr Agent Rush · Blast Radius Zero"}</span>
      <span>{footer ? footer.right : `${n} / ${DECK.total}`}</span>
    </div>
  </AbsoluteFill>
);

/** Stands in for a slide that is not built yet, so slide N is always frame N in the Studio. make-deck.mjs skips these: they never reach the PDF. */
export const Pending: React.FC<{ n: number }> = ({ n }) => (
  <Slide n={n}>
    <Eyebrow>pending</Eyebrow>
    <Title>Slide {String(n).padStart(2, "0")} is not built yet</Title>
  </Slide>
);
