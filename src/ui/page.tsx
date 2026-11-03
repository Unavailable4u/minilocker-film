// MiniLocker film: shared parts of UI kit C (patch 07), ported from frontend/src/ui.tsx: PageHead (the heading of a whole screen),
// Row (key ........ value), Stat (a big numeral with a small-caps caption), Disclosure (a <details> drawn closed or open),
// plus the small style helpers the Attack Lab, Report, Infra and Timeline screens share.
//
// Pure and props-driven, like primitives.tsx: no hooks that read the frame, no timers, no CSS transitions. Plain divs and spans
// (no UA margins to reset). Tailwind classes of the source are translated with rem() / sp() at the real app's 17 px root.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { DISPLAY, HairlineAccent, INK, Label, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- style helpers

/** `tabular-nums`. */
export const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

/** `line-clamp-2`: two lines, then cut (Chromium, which Remotion renders with). */
export const CLAMP_2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/** `break-all` (code that must wrap anywhere). */
export const BREAK_ALL: React.CSSProperties = { wordBreak: "break-all", overflowWrap: "anywhere" };

/** `truncate`: one line, ellipsis. */
export const TRUNCATE: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** The source's text color for a tone, with `mute` meaning ink-3 (`INK`) but plain ink when a number should stay readable. */
export const inkOf = (tone: Tint): string => (tone === "mute" ? theme.ink : INK[tone]);

// ---------------------------------------------------------------------------------------------- PageHead

export interface PageHeadProps {
  /** Small-caps line above the title, in accent-ink. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** One italic sentence under the title. */
  sub?: React.ReactNode;
  /** Controls on the right edge (a live chip, a button). */
  right?: React.ReactNode;
  style?: React.CSSProperties;
}

/** The heading of a whole screen. Source: `relative flex items-end gap-4 pb-3` with an accent hairline on its bottom edge. */
export const PageHead: React.FC<PageHeadProps> = ({ eyebrow, title, sub, right, style }) => (
  <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: sp(4), paddingBottom: sp(3), ...style }}>
    <div style={{ minWidth: 0 }}>
      {eyebrow && <Label style={{ display: "block", fontSize: rem(0.86), color: theme.accentInk }}>{eyebrow}</Label>}
      <div style={{ ...DISPLAY, marginTop: sp(0.5), fontSize: rem(2.5), color: theme.ink }}>{title}</div>
      {sub && (
        <div style={{ marginTop: sp(1.5), maxWidth: rem(42), fontSize: rem(1.02), fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>{sub}</div>
      )}
    </div>
    {right && <div style={{ marginLeft: "auto", flex: "none", display: "flex", alignItems: "center", gap: sp(2.5), paddingBottom: sp(1) }}>{right}</div>}
    <HairlineAccent style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
  </div>
);

// ---------------------------------------------------------------------------------------------- Row

export interface RowProps {
  k: React.ReactNode;
  /** The value. null / undefined draws an em dash, like the source. */
  children?: React.ReactNode;
  mono?: boolean;
}

/** Key ........ value, with a dotted leader like a table of contents. */
export const Row: React.FC<RowProps> = ({ k, children, mono = false }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: sp(2), lineHeight: 1.375 }}>
    <div style={{ flex: "none", color: theme.ink2 }}>{k}</div>
    <span
      aria-hidden
      style={{
        flex: "1 1 0%",
        alignSelf: "flex-end",
        minWidth: sp(3),
        marginBottom: 3,
        borderBottom: `1px dotted ${alpha(theme.ink3, 0.5)}`,
      }}
    />
    <div
      style={{
        minWidth: 0,
        maxWidth: "68%",
        overflowWrap: "break-word",
        textAlign: "right",
        color: theme.ink,
        ...(mono ? { fontFamily: fonts.mono, fontSize: "0.85em" } : null),
      }}
    >
      {children ?? "—"}
    </div>
  </div>
);

// ---------------------------------------------------------------------------------------------- Stat

export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tint;
  /** Default "md" (2.3rem); "lg" is 3.4rem. */
  size?: "md" | "lg";
  style?: React.CSSProperties;
}

/** A big numeral with a small-caps caption: the unit of "show me the number". */
export const Stat: React.FC<StatProps> = ({ label, value, sub, tone = "mute", size = "md", style }) => (
  <div style={style}>
    <Label style={{ display: "block" }}>{label}</Label>
    <div style={{ ...DISPLAY, ...TABULAR, marginTop: sp(1), fontSize: size === "lg" ? rem(3.4) : rem(2.3), color: inkOf(tone) }}>{value}</div>
    {sub && <div style={{ marginTop: sp(1), fontSize: rem(0.84), fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>{sub}</div>}
  </div>
);

// ---------------------------------------------------------------------------------------------- Disclosure

export interface DisclosureProps {
  /** The summary line (the source draws it italic; pass the text only). */
  summary: React.ReactNode;
  /** Drawn open (the arrow turned down and the content shown), as if the viewer had clicked it. Default closed. */
  open?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  summaryStyle?: React.CSSProperties;
}

/**
 * A `<details>`. Source (index.css): `details > summary::before { content: "▸"; display: inline-block; width: 1.05em; color: ink-3 }`,
 * turned 90 degrees when open. The summary text takes the color of the surrounding text.
 */
export const Disclosure: React.FC<DisclosureProps> = ({ summary, open = false, children, style, summaryStyle }) => (
  <div style={style}>
    <div style={{ fontStyle: "italic", ...summaryStyle }}>
      <span aria-hidden style={{ display: "inline-block", width: "1.05em", color: theme.ink3, transform: open ? "rotate(90deg)" : undefined }}>
        ▸
      </span>
      {summary}
    </div>
    {open && children}
  </div>
);
