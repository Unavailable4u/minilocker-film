// MiniLocker film: shared parts of UI kit B (patch 06), ported from frontend/src/ui.tsx and components.tsx.
// PaneHead (the running head of a column), Hash, Seal (the ledger-chain medallion), FieldBox / FieldSelect (the app's FIELD
// class), LISTING_STYLE (a code listing) and Md (model text). Pure and props-driven, like primitives.tsx.
import React, { useId } from "react";
import { alpha, fonts, theme } from "../config/theme";
import type { Tone } from "../lib/derive";
import { BAR, EDGE, INK, Label, WASH, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- note colors

/** Notes and feed lines (components.tsx NOTE): "info" is neutral prose, not a colour. */
export const NOTE: Record<Tone, string> = { ok: theme.ok, bad: theme.bad, warn: theme.warn, info: theme.ink2 };
/** Dots of feed lines (components.tsx DOT): `bg-ok` is the blue gradient, `bg-ink-3` for info. */
export const DOT: Record<Tone, string> = { ok: BAR.ok, bad: BAR.bad, warn: BAR.warn, info: theme.ink3 };

// ---------------------------------------------------------------------------------------------- PaneHead

export interface PaneHeadProps {
  title: React.ReactNode;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}

/** A pane heading strip. Source: `flex shrink-0 items-center gap-2.5 border-b border-rule bg-sheet/60 px-4 py-2.5 backdrop-blur`. */
export const PaneHead: React.FC<PaneHeadProps> = ({ title, right, style }) => (
  <div
    style={{
      boxSizing: "border-box",
      flex: "none",
      display: "flex",
      alignItems: "center",
      gap: sp(2.5),
      borderBottom: `1px solid ${theme.rule}`,
      backgroundColor: alpha(theme.sheet, 0.6),
      backdropFilter: "blur(8px)",
      padding: `${sp(2.5)}px ${sp(4)}px`,
      ...style,
    }}
  >
    <span aria-hidden style={{ width: 3, height: sp(3.5), borderRadius: 9999, background: theme.accent }} />
    <Label style={{ fontSize: rem(0.92), color: theme.ink }}>{title}</Label>
    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: sp(2) }}>{right}</span>
  </div>
);

// ---------------------------------------------------------------------------------------------- Hash

/** A hash, shortened the app's way: 8 characters, an ellipsis, the last 4 (dimmed). */
export const Hash: React.FC<{ h: string | null | undefined; style?: React.CSSProperties }> = ({ h, style }) => {
  if (!h) return <span style={style}>—</span>;
  return (
    <span style={{ fontFamily: fonts.mono, ...style }}>
      {h.slice(0, 8)}
      <span style={{ opacity: 0.5 }}>…{h.slice(-4)}</span>
    </span>
  );
};

// ---------------------------------------------------------------------------------------------- fields

export interface FieldState {
  focused?: boolean;
  hover?: boolean;
}

/**
 * The app's FIELD class: `w-full rounded-[5px] border border-rule bg-sunken px-3 py-2 text-[0.95rem] text-ink outline-none
 * placeholder:text-ink-3 hover:border-rule-2 focus:border-accent focus:ring-2 focus:ring-accent/20`.
 */
export function fieldStyle({ focused = false, hover = false }: FieldState = {}): React.CSSProperties {
  return {
    boxSizing: "border-box",
    width: "100%",
    borderRadius: 5,
    border: `1px solid ${focused ? theme.accent : hover ? theme.rule2 : theme.rule}`,
    backgroundColor: theme.sunken,
    padding: `${sp(2)}px ${sp(3)}px`,
    fontSize: rem(0.95),
    color: theme.ink,
    boxShadow: focused ? `0 0 0 2px ${alpha(theme.accent, 0.2)}` : undefined,
  };
}

export interface FieldSelectProps extends FieldState {
  /** The text shown (the selected option). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** A closed `<select>`: FIELD plus the app's chevron (index.css: 10 x 6 px at .7rem from the right, padding-right 2rem). */
export const FieldSelect: React.FC<FieldSelectProps> = ({ focused, hover, children, style }) => (
  <div style={{ position: "relative", ...fieldStyle({ focused, hover }), paddingRight: rem(2), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style }}>
    {children}
    <svg
      aria-hidden
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      stroke={theme.ink3}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: "absolute", right: rem(0.7), top: "50%", marginTop: -3 }}
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  </div>
);

/** `.LISTING` of ui.tsx: `rounded-[5px] border border-rule bg-sunken font-mono text-[0.82rem] leading-relaxed text-ink`. */
export const LISTING_STYLE: React.CSSProperties = {
  boxSizing: "border-box",
  borderRadius: 5,
  border: `1px solid ${theme.rule}`,
  backgroundColor: theme.sunken,
  fontFamily: fonts.mono,
  fontSize: rem(0.82),
  lineHeight: 1.625,
  color: theme.ink,
};

// ---------------------------------------------------------------------------------------------- Seal

export interface SealProps {
  state: "ok" | "bad" | "idle";
  title: React.ReactNode;
  /** The words around the ring (wording: copy.ws.blast.ringOk / ringBad / ringIdle). */
  ringText: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** The ledger-chain medallion. Source: ui.tsx Seal. Flagged (bad) is hatched like every flagged thing. */
export const Seal: React.FC<SealProps> = ({ state, title, ringText, children, style }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tone: Tint = state === "ok" ? "ok" : state === "bad" ? "bad" : "mute";
  return (
    <div
      role="status"
      style={{
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: sp(4),
        borderRadius: 7,
        border: `1px solid ${EDGE[tone]}`,
        padding: sp(3.5),
        backgroundColor: state === "idle" ? theme.sheet : WASH[tone],
        backgroundImage: state === "bad" ? theme.hatchBad : undefined,
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" width={rem(5.6)} height={rem(5.6)} aria-hidden style={{ flex: "none", display: "block", color: INK[tone] }}>
        <defs>
          <path id={`${id}c`} d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0" />
        </defs>
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="1.2 2.3" />
        <circle cx="50" cy="50" r="25.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <text fontSize="8" letterSpacing="1.6" fontWeight="700" fill="currentColor" fontFamily={fonts.serif}>
          <textPath href={`#${id}c`} startOffset="25%" textAnchor="middle">
            {ringText}
          </textPath>
        </text>
        {state === "ok" && <path d="M38 51.5l8.5 8.5L63 42" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        {state === "bad" && <path d="M40 40l20 20M60 40L40 60" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
        {state === "idle" && (
          <g fill="currentColor">
            <circle cx="40" cy="50" r="2.8" />
            <circle cx="50" cy="50" r="2.8" />
            <circle cx="60" cy="50" r="2.8" />
          </g>
        )}
        <path d="M18 74.5l2.2 2.2M82 74.5l-2.2 2.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".6" />
      </svg>
      <div style={{ minWidth: 0, flex: "1 1 0%" }}>
        <div style={{ fontSize: rem(1.12), fontWeight: 700, lineHeight: 1.25, color: state === "idle" ? theme.ink2 : INK[tone] }}>{title}</div>
        {children && (
          <div style={{ marginTop: sp(1), overflowWrap: "break-word", fontSize: rem(0.86), lineHeight: 1.375, color: theme.ink2 }}>{children}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Md

/**
 * Model text. The app renders it with react-markdown; the film has no such dependency, so this draws the subset the agent's
 * sentences and summaries use: paragraphs (blank-line separated), **bold**, `inline code` and ``` fenced blocks. Headings,
 * lists, quotes and links are shown as plain text. Paragraph rhythm and the code chip are the app's (`my-1.5`, `rounded-[4px]
 * border border-rule bg-sunken px-1 py-px font-mono text-[0.84em]`).
 */
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let k = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(
        <strong key={k++} style={{ fontWeight: 700 }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      out.push(
        <code
          key={k++}
          style={{
            borderRadius: 4,
            border: `1px solid ${theme.rule}`,
            backgroundColor: theme.sunken,
            padding: `1px ${sp(1)}px`,
            fontFamily: fonts.mono,
            fontSize: "0.84em",
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const Md: React.FC<{ children: string }> = ({ children }) => {
  // split fenced blocks first, then paragraphs
  const parts = children.split(/```[^\n]*\n?/);
  const blocks: { code: boolean; text: string }[] = [];
  parts.forEach((p, i) => {
    if (i % 2 === 1) blocks.push({ code: true, text: p.replace(/\n$/, "") });
    else for (const para of p.split(/\n{2,}/)) if (para.trim()) blocks.push({ code: false, text: para.trim() });
  });
  return (
    <>
      {blocks.map((b, i) =>
        b.code ? (
          <pre
            key={i}
            style={{
              ...LISTING_STYLE,
              margin: `${sp(1.5)}px 0`,
              padding: sp(2.5),
              overflow: "hidden",
              whiteSpace: "pre",
            }}
          >
            {b.text}
          </pre>
        ) : (
          <p key={i} style={{ margin: `${i === 0 ? 0 : sp(1.5)}px 0 ${i === blocks.length - 1 ? 0 : sp(1.5)}px` }}>
            {inline(b.text)}
          </p>
        ),
      )}
    </>
  );
};
