// MiniLocker film: UI primitives (patch 05), ported from the real app's frontend/src/ui.tsx and index.css.
//
// RULES FOR EVERYTHING IN THIS FILE
// - Pure and props-driven: no hooks that read the frame, no timers, no CSS transitions or animations, no Math.random.
//   Anything that moves in the real app (Spin, Pulse, the Donut and Meter fills) takes its state as a prop; the scene computes it.
// - The film has no Tailwind. Every Tailwind class of the source is translated to an explicit inline style at the real app's
//   17 px root: 1rem = 17 px, and one Tailwind spacing step (0.25rem) = 4.25 px. Use rem() and sp() for those two conversions,
//   so a value reads the same as the class it came from (px-1.5 -> sp(1.5), text-[0.84rem] -> rem(0.84)).
// - Colors come from src/config/theme.ts (the real app's dark theme), never from CSS variables, so a primitive renders the same
//   inside and outside .film-root. Elements are plain divs and spans (no UA button or input styles to reset).
// - Every primitive takes an optional `style` that is merged LAST, for position, width and the like.
import React, { useId } from "react";
import { Easing } from "remotion";
import { alpha, fonts, ROOT_PX, theme } from "../config/theme";
import type { Tone } from "../lib/derive";

// ---------------------------------------------------------------------------------------------- units

/** rem at the real app's 17 px root: rem(1.04) is the nav label size. */
export const rem = (n: number): number => n * ROOT_PX;
/** Tailwind spacing steps (0.25rem each) at the 17 px root: sp(1.5) is gap-1.5 / px-1.5, 6.375 px. */
export const sp = (n: number): number => n * 0.25 * ROOT_PX;

// ---------------------------------------------------------------------------------------------- shared text styles

/** `.smcp` of index.css: small-caps labels. */
export const SMCP: React.CSSProperties = {
  fontVariantCaps: "all-small-caps",
  letterSpacing: "0.08em",
  fontWeight: 500,
};

/** `.display` of index.css: headlines. */
export const DISPLAY: React.CSSProperties = {
  fontWeight: 700,
  letterSpacing: "-0.012em",
  lineHeight: 1.04,
};

// ---------------------------------------------------------------------------------------------- tone tables (ui.tsx)

/** A status tone, or "mute" for neutral. `Tone` is ok | bad | warn | info (src/lib/derive.ts). */
export type Tint = Tone | "mute";

/** Text color per tone (the source's `text-ok`, `text-bad`, ... `text-ink-3`). */
export const INK: Record<Tint, string> = {
  ok: theme.ok,
  bad: theme.bad,
  warn: theme.warn,
  info: theme.info,
  mute: theme.ink3,
};

/** Border color per tone (`border-ok/50`, `border-bad/55`, `border-warn/55`, `border-info/50`, `border-rule`). */
export const EDGE: Record<Tint, string> = {
  ok: alpha(theme.ok, 0.5),
  bad: alpha(theme.bad, 0.55),
  warn: alpha(theme.warn, 0.55),
  info: alpha(theme.info, 0.5),
  mute: theme.rule,
};

/** Wash (background) color per tone (`bg-ok-wash`, ... `bg-sunken`). */
export const WASH: Record<Tint, string> = {
  ok: theme.okWash,
  bad: theme.badWash,
  warn: theme.warnWash,
  info: theme.infoWash,
  mute: theme.sunken,
};

/**
 * Solid fill per tone, as a value for the CSS `background` shorthand (`bg-ok`, `bg-bad`, ... `bg-rule-2`).
 * In the real app a fill with tone "ok" is the blue gradient (index.css: `.bg-ok { background-image: var(--ok-grad) }`),
 * so BAR.ok is the gradient over the flat color. Use it for dots, meter fills and ticks.
 */
export const BAR: Record<Tint, string> = {
  ok: `${theme.okGradient}, ${theme.ok}`,
  bad: theme.bad,
  warn: theme.warn,
  info: theme.info,
  mute: theme.rule2,
};

/** The tone as a plain color (`var(--ok)` ... `var(--ink-3)`), for strokes and glows. */
export const VAR: Record<Tint, string> = {
  ok: theme.ok,
  bad: theme.bad,
  warn: theme.warn,
  info: theme.info,
  mute: theme.ink3,
};

// ---------------------------------------------------------------------------------------------- color helper

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `color-mix(in srgb, a pctA%, b)` as a plain rgb() string (the film does not rely on color-mix). */
function mixHex(a: string, b: string, pctA: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const t = pctA / 100;
  const c = pa.map((v, i) => v * t + pb[i] * (1 - t));
  return `rgb(${c.map((v) => v.toFixed(2)).join(", ")})`;
}

/** Top of the `.panel` gradient: raised 70% over sheet. */
const PANEL_TOP = mixHex(theme.raised, theme.sheet, 70);

// ---------------------------------------------------------------------------------------------- Label

export interface LabelProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Small-caps label, the typeset replacement for UPPERCASE TRACKED TEXT: `smcp text-[0.84rem] text-ink-2`. */
export const Label: React.FC<LabelProps> = ({ children, style }) => (
  <span style={{ ...SMCP, fontSize: rem(0.84), color: theme.ink2, ...style }}>{children}</span>
);

// ---------------------------------------------------------------------------------------------- Chip

export interface ChipProps {
  /** Default "mute". */
  tone?: Tint;
  /** A small filled dot before the text. */
  dot?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Status chip: small caps, 1 px border, tone wash. Flagged ("bad") chips are hatched. Mute chips have no wash.
 * Source: `smcp inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 py-px text-[0.8rem] leading-tight`.
 */
export const Chip: React.FC<ChipProps> = ({ tone = "mute", dot = false, children, style }) => (
  <span
    style={{
      ...SMCP,
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      gap: sp(1.5),
      whiteSpace: "nowrap",
      borderRadius: 4,
      border: `1px solid ${EDGE[tone]}`,
      padding: `1px ${sp(1.5)}px`,
      fontSize: rem(0.8),
      lineHeight: 1.25,
      color: INK[tone],
      backgroundColor: tone === "mute" ? undefined : WASH[tone],
      backgroundImage: tone === "bad" ? theme.hatchBad : undefined,
      ...style,
    }}
  >
    {dot && <span aria-hidden style={{ width: sp(1.5), height: sp(1.5), borderRadius: 9999, background: BAR[tone] }} />}
    {children}
  </span>
);

// ---------------------------------------------------------------------------------------------- Card

export interface CardProps {
  /** Tints the frame only; the content carries the meaning. Default "mute". */
  tone?: Tint;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** A framed panel: a lit top edge, a hairline, a soft shadow (`.panel` of index.css). */
export const Card: React.FC<CardProps> = ({ tone = "mute", children, style }) => (
  <section
    style={{
      boxSizing: "border-box",
      border: `1px solid ${tone === "mute" ? theme.rule : EDGE[tone]}`,
      borderRadius: 7,
      background: `linear-gradient(180deg, ${PANEL_TOP}, ${theme.sheet} 42%)`,
      boxShadow: theme.panelShadow,
      ...style,
    }}
  >
    {children}
  </section>
);

// ---------------------------------------------------------------------------------------------- Btn

export type BtnVariant = "primary" | "ghost" | "danger" | "warn" | "info";

const BTN: Record<BtnVariant, { base: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    base: {
      borderColor: alpha(theme.accent, 0.8),
      backgroundColor: theme.accent,
      color: theme.onAccent,
      fontWeight: 700,
      boxShadow: `0 1px 0 rgba(255,255,255,.22) inset, 0 10px 26px -12px ${theme.accent}`,
    },
    hover: { filter: "brightness(1.1)" },
  },
  ghost: {
    base: { borderColor: theme.rule2, backgroundColor: theme.raised, color: theme.ink },
    hover: { borderColor: theme.ink3, backgroundColor: theme.sheet },
  },
  danger: {
    base: { borderColor: alpha(theme.bad, 0.6), backgroundColor: "transparent", color: theme.bad },
    hover: { backgroundColor: theme.badWash },
  },
  warn: {
    base: { borderColor: theme.warn, backgroundColor: theme.warn, color: theme.onWarn, fontWeight: 700 },
    hover: { filter: "brightness(1.05)" },
  },
  info: {
    base: { borderColor: alpha(theme.info, 0.6), backgroundColor: "transparent", color: theme.info },
    hover: { backgroundColor: theme.infoWash },
  },
};

export interface BtnProps {
  /** Default "ghost". */
  variant?: BtnVariant;
  /** Default "md". */
  size?: "sm" | "md";
  /** The press state (`active:translate-y-px`): the button sits 1 px lower. */
  pressed?: boolean;
  /** The cursor is over it (the source's `hover:` styles). */
  hover?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Button. Source: `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] border font-medium`,
 * md = `px-4 py-1.5 text-[0.98rem]`, sm = `px-2.5 py-0.5 text-[0.86rem]`, disabled = 40% opacity.
 */
export const Btn: React.FC<BtnProps> = ({
  variant = "ghost",
  size = "md",
  pressed = false,
  hover = false,
  disabled = false,
  children,
  style,
}) => {
  const v = BTN[variant];
  const sm = size === "sm";
  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: sp(1.5),
        whiteSpace: "nowrap",
        borderRadius: 5,
        border: "1px solid",
        fontWeight: 500,
        lineHeight: 1.45,
        padding: sm ? `${sp(0.5)}px ${sp(2.5)}px` : `${sp(1.5)}px ${sp(4)}px`,
        fontSize: sm ? rem(0.86) : rem(0.98),
        ...v.base,
        ...(hover && !disabled ? v.hover : null),
        transform: pressed && !disabled ? "translateY(1px)" : undefined,
        opacity: disabled ? 0.4 : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Segmented

export interface SegmentedOption {
  id: string;
  label: React.ReactNode;
}

export interface SegmentedProps {
  /** The selected option's id. */
  value: string;
  options: readonly SegmentedOption[];
  /** The id of the option the cursor is over (the source's `hover:` styles; ignored for the selected one). */
  hover?: string;
  style?: React.CSSProperties;
}

/** Radio-style segmented control (strict / observe). Source: `inline-flex gap-0.5 rounded-[6px] border border-rule bg-sunken p-0.5`. */
export const Segmented: React.FC<SegmentedProps> = ({ value, options, hover, style }) => (
  <div
    role="radiogroup"
    style={{
      boxSizing: "border-box",
      display: "inline-flex",
      gap: sp(0.5),
      borderRadius: 6,
      border: `1px solid ${theme.rule}`,
      backgroundColor: theme.sunken,
      padding: sp(0.5),
      ...style,
    }}
  >
    {options.map((o) => {
      const selected = o.id === value;
      const hovered = !selected && o.id === hover;
      return (
        <div
          key={o.id}
          role="radio"
          aria-checked={selected}
          style={{
            boxSizing: "border-box",
            borderRadius: 4,
            padding: `${sp(1)}px ${sp(3)}px`,
            fontSize: rem(0.9),
            ...(selected
              ? {
                  backgroundColor: theme.accent,
                  fontWeight: 700,
                  color: theme.onAccent,
                  // Tailwind shadow-sm
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                }
              : { color: hovered ? theme.ink : theme.ink2, backgroundColor: hovered ? theme.raised : undefined }),
          }}
        >
          {o.label}
        </div>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------------------------- SectionHead

/** The 1 px accent hairline (`.hairline-accent`): accent to accent-2 to nothing, at 60%. */
export const HairlineAccent: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      height: 1,
      background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2} 42%, transparent 82%)`,
      opacity: 0.6,
      ...style,
    }}
  />
);

export interface SectionHeadProps {
  /** The section number, drawn as an italic "§N" in accent-ink. */
  no?: string | number;
  title: React.ReactNode;
  /** One italic note after the title. */
  note?: React.ReactNode;
  /** Pushed to the right edge. */
  right?: React.ReactNode;
  style?: React.CSSProperties;
}

/** "§ 2  Title" with a hairline under it, the journal section heading. */
export const SectionHead: React.FC<SectionHeadProps> = ({ no, title, note, right, style }) => (
  <div style={style}>
    <div style={{ display: "flex", alignItems: "baseline", gap: sp(2.5), paddingBottom: sp(1.5) }}>
      {no !== undefined && <span style={{ fontStyle: "italic", color: theme.accentInk }}>§{no}</span>}
      <div style={{ fontSize: rem(1.12), fontWeight: 700, letterSpacing: "-0.025em", color: theme.ink }}>{title}</div>
      {note && <span style={{ fontSize: rem(0.85), fontStyle: "italic", color: theme.ink2 }}>{note}</span>}
      {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
    <HairlineAccent />
  </div>
);

// ---------------------------------------------------------------------------------------------- Kbd

export interface KbdProps {
  children?: React.ReactNode;
  /** Font size in px. Default rem(0.8): the size of the hint line it sits in ("Ctrl + Enter to run"). */
  size?: number;
  style?: React.CSSProperties;
}

/** A key cap in running text. Source (components.tsx): `rounded-[3px] border border-rule bg-sunken px-1 not-italic`, mono face. */
export const Kbd: React.FC<KbdProps> = ({ children, size = rem(0.8), style }) => (
  <kbd
    style={{
      boxSizing: "border-box",
      fontFamily: fonts.mono,
      fontSize: size,
      fontStyle: "normal",
      borderRadius: 3,
      border: `1px solid ${theme.rule}`,
      backgroundColor: theme.sunken,
      padding: `0 ${sp(1)}px`,
      ...style,
    }}
  >
    {children}
  </kbd>
);

// ---------------------------------------------------------------------------------------------- Pulse

/** One ping cycle of Tailwind's `animate-ping`: 1 s. */
export const PULSE_FRAMES = 30;

/** 0..1 position inside the ping cycle for a frame. */
export function pulsePhase(frame: number, period: number = PULSE_FRAMES): number {
  const p = (frame / period) % 1;
  return p < 0 ? p + 1 : p;
}

// animate-ping: 1s cubic-bezier(0, 0, 0.2, 1) infinite; keyframes `75%, 100% { transform: scale(2); opacity: 0 }`
const pingEase = Easing.bezier(0, 0, 0.2, 1);

export interface PulseProps {
  /** Default "warn". */
  tone?: Tint;
  /** 0..1 inside the 30-frame ping cycle (use pulsePhase(frame)). Default 0: the ring at rest, hidden behind the dot. */
  phase?: number;
}

/** Pulsing status dot: a solid 8.5 px dot with a ring that grows to 2x while fading from 60% to 0 over the first 75% of the cycle. */
export const Pulse: React.FC<PulseProps> = ({ tone = "warn", phase = 0 }) => {
  const t = Math.min(1, Math.max(0, phase) / 0.75);
  const e = pingEase(t);
  return (
    <span aria-hidden style={{ position: "relative", display: "inline-flex", width: sp(2), height: sp(2) }}>
      <span
        style={{
          position: "absolute",
          display: "inline-flex",
          width: "100%",
          height: "100%",
          borderRadius: 9999,
          background: BAR[tone],
          opacity: 0.6 * (1 - e),
          transform: `scale(${1 + e})`,
        }}
      />
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          width: sp(2),
          height: sp(2),
          borderRadius: 9999,
          background: BAR[tone],
        }}
      />
    </span>
  );
};

// ---------------------------------------------------------------------------------------------- Spin

/** One turn of Tailwind's `animate-spin`: 1 s, linear. */
export const SPIN_FRAMES = 30;

/** Turns (can exceed 1) for a frame: use it as the `progress` of Spin. */
export function spinProgress(frame: number, period: number = SPIN_FRAMES): number {
  return frame / period;
}

export interface SpinProps {
  /** Rotation in turns (1 = one full turn, can exceed 1). Default 0. */
  progress?: number;
  /** Ring color. Default currentColor, like the source (`border-current`). */
  color?: string;
  style?: React.CSSProperties;
}

/** A busy ring: 14.875 px, 2 px border with a transparent top. Source: `h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent`. */
export const Spin: React.FC<SpinProps> = ({ progress = 0, color, style }) => (
  <span
    aria-hidden
    style={{
      boxSizing: "border-box",
      display: "inline-block",
      width: sp(3.5),
      height: sp(3.5),
      borderRadius: 9999,
      border: `2px solid ${color ?? "currentColor"}`,
      borderTopColor: "transparent",
      transform: `rotate(${progress * 360}deg)`,
      ...style,
    }}
  />
);

// ---------------------------------------------------------------------------------------------- Meter

export interface MeterProps {
  /** 0..1 (clamped). A value above 0 is drawn at least 2% wide, like the source. */
  value: number;
  /** Default "ok". */
  tone?: Tint;
  style?: React.CSSProperties;
}

/** A thin horizontal meter. Source: `h-1.5 overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-rule`. */
export const Meter: React.FC<MeterProps> = ({ value, tone = "ok", style }) => {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      style={{
        boxSizing: "border-box",
        height: sp(1.5),
        overflow: "hidden",
        borderRadius: 9999,
        backgroundColor: theme.sunken,
        boxShadow: `inset 0 0 0 1px ${theme.rule}`,
        ...style,
      }}
    >
      <div style={{ height: "100%", borderRadius: 9999, background: BAR[tone], width: `${Math.max(v > 0 ? 2 : 0, v * 100)}%` }} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Donut

export interface DonutSegment {
  /** Share of `total`. Fractions are fine (a scene animates a segment by passing a growing value). */
  value: number;
  tone: Tint;
}

export interface DonutProps {
  /** Drawn in order from 12 o'clock, clockwise. Segments add up to at most `total`; the rest is the empty track. */
  segments: readonly DonutSegment[];
  total: number;
  /** Default 132 (the Attack Lab summary uses 116 with stroke 10). */
  size?: number;
  /** Default 11. */
  stroke?: number;
  /** The center slot (text, a numeral). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * A donut made of stacked arcs, ported from ui.tsx. The "ok" tone is the blue gradient; every arc has the dark theme's soft glow.
 * Arcs use explicit dash lengths (not pathLength), like the Mark and the dial. Each segment leaves a gap of 1.2% of the circle.
 */
export const Donut: React.FC<DonutProps> = ({ segments, total, size = 132, stroke = 11, children, style }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `mlk-ok-${uid}`;
  const r = 50 - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;

  const arcs: { key: number; tone: Tint; dash: number; offset: number }[] = [];
  if (total > 0) {
    let at = 0; // in percent of the circle
    segments.forEach((s, i) => {
      if (s.value <= 0) return;
      const len = (s.value / total) * 100;
      const dash = Math.max(0, len - 1.2);
      arcs.push({ key: i, tone: s.tone, dash: (dash / 100) * circ, offset: -(at / 100) * circ });
      at += len;
    });
  }

  return (
    <div style={{ position: "relative", flex: "none", width: size, height: size, ...style }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme.okA} />
            <stop offset=".55" stopColor={theme.okB} />
            <stop offset="1" stopColor={theme.okC} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke={theme.rule} strokeWidth={stroke} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={a.tone === "ok" ? `url(#${gradId})` : VAR[a.tone]}
            strokeWidth={stroke}
            strokeDasharray={`${a.dash.toFixed(4)} ${(circ - a.dash).toFixed(4)}`}
            strokeDashoffset={a.offset.toFixed(4)}
            strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 3px ${alpha(VAR[a.tone], 0.55)})` }}
          />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
};
