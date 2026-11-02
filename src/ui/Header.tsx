// MiniLocker film: the app header (patch 05), ported from frontend/src/App.tsx (the <header> JSX and the SCREENS array).
// Left: round Mark badge, wordmark, small-caps subtitle. Middle: six screens, each with an italic index number; the active one
// is bold with a 3 px accent underline and glow. Right: status chip (task id + status), theme button, API token field.
//
// Pure and props-driven (no frame reads). The wording is src/config/copy.ts `ui`; the task id and status are passed in by the
// caller (they come from the evidence through the selectors, never typed here).
//
// GEOMETRY. Every number is the real app at 1600 px wide (the xl: Tailwind variants are active), dark theme, 17 px root,
// MEASURED in a browser (patch 05), not read off the class names:
//   header 67.47 px = 65.47 inner + 1 px accent hairline + 1 px border; badge 42.5 px (h-10 at 17 px, not 40); nav starts at x 375.11.
//   The nav items are as wide as their content, and an item gets wider while it is the active (bold) one, which shifts the
//   items after it. The Header reproduces that exactly with fixed widths (NAV_W_REG / NAV_W_BOLD, measured with CMU Serif) so the
//   layout never depends on font loading, and so the underline can slide: `activeScreen` may be fractional.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { ui } from "../config/copy";
import { GRID, type Rect } from "../config/focus";
import { clamp01 } from "../lib/ease";
import { Mark } from "./Mark";
import { BAR, Chip, DISPLAY, HairlineAccent, Pulse, SMCP, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- nav geometry

/** Number of screens. */
export const SCREEN_COUNT = ui.screens.length;

/** Width of each nav item while it is NOT active (regular weight): padding 14.875 + index + gap + label + padding 14.875. */
export const NAV_W_REG = [125.953, 110.578, 130.453, 96.672, 105, 80.234] as const;
/** Width of each nav item while it IS active (bold label, so wider). */
export const NAV_W_BOLD = [140, 121.859, 143.75, 106.781, 115.656, 87.391] as const;
/** Space between nav items (gap-0.5). */
export const NAV_GAP = sp(0.5);
/** The underline is inset 8.5 px (inset-x-2) from both edges of its item. */
const UNDERLINE_INSET = sp(2);
/** Underline thickness. */
const UNDERLINE_H = 3;

const clampScreen = (a: number): number => Math.min(SCREEN_COUNT - 1, Math.max(0, a));

/**
 * Where each nav item sits, in window (logical) px, for a given active screen. `activeScreen` may be fractional: an item's
 * width grows from regular to bold while the underline moves onto it (linear blend), so a slide never jumps.
 * At an integer value this equals the real app exactly (checked against all 36 measured item rectangles).
 */
export function navLayout(activeScreen: number): { x: number; w: number }[] {
  const a = clampScreen(activeScreen);
  let x = GRID.navX;
  return NAV_W_REG.map((reg, j) => {
    const k = clamp01(1 - Math.abs(a - j));
    const w = reg + (NAV_W_BOLD[j] - reg) * k;
    const item = { x, w };
    x += w + NAV_GAP;
    return item;
  });
}

/** The accent underline's rectangle in window px (x, w; it is always 3 px tall and sits on the bottom edge of the nav). */
export function navUnderline(activeScreen: number): { x: number; w: number } {
  const a = clampScreen(activeScreen);
  const items = navLayout(a);
  const lo = Math.floor(a);
  const hi = Math.min(SCREEN_COUNT - 1, lo + 1);
  const t = a - lo;
  const left = items[lo].x + (items[hi].x - items[lo].x) * t;
  const right = items[lo].x + items[lo].w + (items[hi].x + items[hi].w - (items[lo].x + items[lo].w)) * t;
  return { x: left + UNDERLINE_INSET, w: right - left - 2 * UNDERLINE_INSET };
}

/**
 * The rectangle of one nav item in window (logical) px, for a cursor target or a click. By default the item is measured as the
 * active one (the cursor clicks the tab it is about to activate); pass `activeScreen` for any other moment.
 */
export function navItemRect(index: number, activeScreen: number = index): Rect {
  const it = navLayout(activeScreen)[index];
  return { x: it.x, y: 0, w: it.w, h: GRID.headerInnerH };
}

// ---------------------------------------------------------------------------------------------- status

/** The tone of the status chip (App.tsx `statusTone`). */
export function statusTone(status: string): Tint {
  if (status === "idle") return "mute";
  if (status === "running") return "info";
  if (status.startsWith("error")) return "bad";
  if (status.startsWith("halted")) return "warn";
  return "ok";
}

// ---------------------------------------------------------------------------------------------- icons (verbatim from App.tsx)

const Sun: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden style={{ display: "block" }}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

const Moon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
    <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.7 6.7 0 0 0 10.7 10.7Z" />
  </svg>
);

const Key: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2" />
  </svg>
);

// ---------------------------------------------------------------------------------------------- component

export interface HeaderProps {
  /**
   * The active screen as an index 0..5 (Workspace, Timeline, Attack Lab, Report, Sessions, Infra). May be FRACTIONAL: the accent
   * underline slides between tabs (the caller eases it), and the label that is nearest becomes the bold, accent-numbered one.
   */
  activeScreen: number;
  /** Index of the tab the cursor is over, drawn in the hover color (ink instead of ink-2). Omit for none. */
  tabHighlight?: number;
  /** The current task id (from the evidence), or null before a task exists (the chip then shows only the status). */
  taskId: string | null;
  /** "idle", "running", "done", "error..." or "halted..." (App.tsx statusTone decides the tone). */
  status: string;
  /** Draws the small blue tick at the end of the token field (a token is applied). */
  tokenApplied: boolean;
  /** How many masked characters the token field shows. 0 shows the "API token" placeholder. Default: 12 when applied, else 0. */
  tokenChars?: number;
  /** The token field has focus (accent border + 2 px accent ring). */
  tokenFocused?: boolean;
  /**
   * Which icon the theme button shows. The real app shows the icon of the theme you would SWITCH TO: in the dark theme (the film)
   * that is the sun. Default "sun". Pass "moon" to draw the paper-theme state.
   */
  themeIcon?: "sun" | "moon";
  /** The cursor is over the theme button (accent border, ink icon). */
  themeHover?: boolean;
  /** 0..1 inside the Pulse ping cycle of the "running" chip (use pulsePhase(frame)). Default 0. */
  pulse?: number;
}

/** Real input width: `w-20 xl:w-24`. */
const TOKEN_W = sp(24);

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  tabHighlight,
  taskId,
  status,
  tokenApplied,
  tokenChars,
  tokenFocused = false,
  themeIcon = "sun",
  themeHover = false,
  pulse = 0,
}) => {
  const cur = Math.round(clampScreen(activeScreen));
  const items = navLayout(activeScreen);
  const ul = navUnderline(activeScreen);
  const hi = tabHighlight === undefined ? -1 : Math.round(tabHighlight);
  const chars = tokenChars ?? (tokenApplied ? 12 : 0);
  const running = status === "running";

  const padX = sp(5);
  const gap = sp(8); // xl:gap-8
  const leftW = GRID.navX - padX - gap;

  return (
    <header
      style={{
        position: "relative",
        zIndex: 10,
        flex: "none",
        boxSizing: "border-box",
        height: GRID.headerH,
        borderBottom: `1px solid ${theme.rule}`,
        backgroundColor: alpha(theme.paper, 0.75),
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ boxSizing: "border-box", display: "flex", alignItems: "stretch", gap, padding: `0 ${padX}px`, height: GRID.headerInnerH }}>
        {/* left: badge + wordmark + subtitle */}
        <div
          style={{
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: sp(3),
            padding: `${sp(2.5)}px 0`,
            width: leftW,
            flex: "none",
            color: theme.ink2,
          }}
        >
          <span
            style={{
              boxSizing: "border-box",
              display: "grid",
              placeItems: "center",
              flex: "none",
              width: sp(10),
              height: sp(10),
              borderRadius: 9999,
              border: `1px solid ${theme.rule2}`,
              backgroundColor: theme.sheet,
              boxShadow: `0 0 22px -6px ${theme.accent}`,
            }}
          >
            {/* the real Mark draws in currentColor, which here is ink-2 */}
            <Mark size={30} color={theme.ink2} />
          </span>
          <div style={{ lineHeight: 1 }}>
            <div style={{ ...DISPLAY, fontSize: rem(1.55), color: theme.ink, whiteSpace: "nowrap" }}>
              {ui.wordmark.lead}
              <span style={{ color: theme.accentInk }}>{ui.wordmark.tail}</span>
            </div>
            <div style={{ ...SMCP, marginTop: sp(1), fontSize: rem(0.74), color: theme.ink3, whiteSpace: "nowrap" }}>{ui.subtitle}</div>
          </div>
        </div>

        {/* middle: the six screens */}
        <nav aria-label="Screens" style={{ position: "relative", display: "flex", alignItems: "stretch", gap: NAV_GAP, flex: "none" }}>
          {ui.screens.map((label, j) => {
            const active = j === cur;
            const hover = !active && j === hi;
            return (
              <div
                key={label}
                style={{
                  boxSizing: "border-box",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: sp(1.5),
                  flex: "none",
                  width: items[j].w,
                  padding: `0 ${sp(3.5)}px`, // xl:px-3.5
                  whiteSpace: "nowrap",
                  fontSize: rem(1.04),
                  fontWeight: active ? 700 : undefined,
                  color: active || hover ? theme.ink : theme.ink2,
                }}
              >
                <span style={{ fontSize: rem(0.78), fontStyle: "italic", color: active ? theme.accentInk : theme.ink3 }}>{j + 1}</span>
                {label}
              </div>
            );
          })}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: ul.x - GRID.navX,
              bottom: 0,
              width: ul.w,
              height: UNDERLINE_H,
              borderRadius: `${UNDERLINE_H}px ${UNDERLINE_H}px 0 0`,
              backgroundColor: theme.accent,
              boxShadow: `0 0 14px ${theme.accent}`,
            }}
          />
        </nav>

        {/* right: status chip, theme button, token field */}
        <div style={{ boxSizing: "border-box", display: "flex", alignItems: "center", gap: sp(2.5), marginLeft: "auto", padding: `${sp(2)}px 0` }}>
          <Chip tone={statusTone(status)} dot={!running}>
            {running && <Pulse tone="info" phase={pulse} />}
            {taskId && <span style={{ fontFamily: fonts.mono, textTransform: "none", letterSpacing: "normal" }}>{taskId}</span>}
            {taskId && <span aria-hidden>·</span>}
            {status}
          </Chip>

          <div
            style={{
              boxSizing: "border-box",
              display: "grid",
              placeItems: "center",
              width: sp(8),
              height: sp(8),
              borderRadius: 5,
              border: `1px solid ${themeHover ? theme.accent : theme.rule}`,
              backgroundColor: theme.sheet,
              color: themeHover ? theme.ink : theme.ink2,
            }}
          >
            {themeIcon === "sun" ? <Sun /> : <Moon />}
          </div>

          <div
            style={{
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: sp(1.5),
              borderRadius: 5,
              border: `1px solid ${tokenFocused ? theme.accent : theme.rule}`,
              backgroundColor: theme.sheet,
              padding: `${sp(1)}px ${sp(2)}px`,
              color: theme.ink3,
              boxShadow: tokenFocused ? `0 0 0 2px ${alpha(theme.accent, 0.2)}` : undefined,
            }}
          >
            <Key />
            <span
              style={{
                display: "block",
                width: TOKEN_W,
                overflow: "hidden",
                whiteSpace: "nowrap",
                fontSize: rem(0.88),
                color: chars > 0 ? theme.ink : theme.ink3,
                // a password field's dots: the browser's own masking, so they look like the real input's
                ...(chars > 0 ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : null),
              }}
            >
              {chars > 0 ? "x".repeat(chars) : ui.tokenPlaceholder}
            </span>
            {tokenApplied && <span aria-hidden style={{ flex: "none", width: sp(1.5), height: sp(1.5), borderRadius: 9999, background: BAR.ok }} />}
          </div>
        </div>
      </div>
      <HairlineAccent />
    </header>
  );
};
