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

/** A numbered crimson dot to put on a screenshot. Position it with left/top in slide px. */
export const Pin: React.FC<{ n: number; left: number; top: number }> = ({ n, left, top }) => (
  <div
    style={{
      position: "absolute", left, top, width: 44, height: 44, borderRadius: 22, background: theme.accent, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.mono, fontSize: 26,
      boxShadow: "0 6px 16px -6px rgba(217,15,61,.6)",
    }}
  >
    {n}
  </div>
);

/** The slide shell: paper background, grid, footer. Children are positioned in slide px (1920 x 1080). */
export const Slide: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <AbsoluteFill style={{ background: theme.paper, fontFamily: fonts.serif, color: theme.ink }}>
    <GridPaper />
    <div style={{ position: "absolute", left: DECK.mx, right: DECK.mx, top: DECK.top, bottom: DECK.footerH + 24 }}>{children}</div>
    <div
      style={{
        position: "absolute", left: DECK.mx, right: DECK.mx, bottom: 0, height: DECK.footerH, borderTop: `1px solid ${theme.rule}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 22, color: theme.ink3,
      }}
    >
      <span>MiniLocker · Vultr Agent Rush · Blast Radius Zero</span>
      <span>
        {n} / {DECK.total}
      </span>
    </div>
  </AbsoluteFill>
);
