// MiniLocker film: the Workspace centre column (patch 06): the tab pills (terminal | browser | files) over one framed panel that
// holds the terminal. Ported from the centre `<section>` of Workspace in frontend/src/App.tsx and the window chrome of
// frontend/src/Terminal.tsx (traffic lights, "● sandbox · /workspace", the ledger-event count, the "Nothing has run yet" overlay).
// The terminal surface itself is TerminalView (patch 04); this file only wraps it.
//
// Pure and props-driven. TerminalView needs a logical width and height, so the pane takes ITS OWN size (default: the real centre
// column, 767 x 832.53) and derives the inner sizes with terminalPaneLayout(). Those derived heights come from the source classes
// (see the constants), not from a browser measurement: compare a still against the app and adjust TAB_BUTTON_H / CHROME_H here.
// The browser and files tabs are drawn by later patches: pass them as `children` and they replace the terminal when `tab` is not "terminal".
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { ws } from "../config/copy";
import { GRID, WINDOW } from "../config/focus";
import { riseStyle } from "../lib/rise";
import { Mark } from "./Mark";
import { TerminalView, type TermLine } from "./TerminalView";
import { SMCP, rem, sp } from "./primitives";

export type PaneTab = "terminal" | "browser" | "files";

export interface TerminalPaneProps {
  tab?: PaneTab;
  /** The tab the cursor is over (inactive tabs go from ink-3 to ink). */
  tabHover?: PaneTab;
  lines: readonly TermLine[];
  caretLine?: number;
  caretCol?: number;
  caretOn?: boolean;
  /** TerminalView scrollOffset (rows). For the tail, pass tailScrollOffset(). Default 0. */
  scrollOffset?: number;
  /** Newest row rests at the bottom. Default true (a real terminal). */
  tail?: boolean;
  /** The number in "N ledger events" (events.length of the task so far). */
  eventCount: number;
  /** Rise (0..1) of the empty-state card. Default 1. */
  emptyRise?: number;
  /** Rotation of the dashed ring of the empty state, in turns (the app turns once in 40 s). Default 0. */
  ringTurn?: number;
  /** Content of the browser / files tabs (later patches). */
  children?: React.ReactNode;
  /** Size of the whole pane in logical px. Default: the Workspace centre column. */
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------------------------- derived layout

/** Height of the Workspace body: the window minus the header. */
export const WORKSPACE_BODY_H = WINDOW.h - GRID.headerH; // 832.53
/** Width of the centre column: 1600 - 374 - 459. */
export const CENTER_W = GRID.colCenter; // 767

/** A tab pill: border 1 + py-1 (4.25 x 2) + one text line (0.95rem at line-height 1.45) + border 1. */
export const TAB_BUTTON_H = 2 + 2 * sp(1) + rem(0.95) * 1.45;
/** The tab strip: pt-3 over a pill. */
export const TAB_STRIP_H = sp(3) + TAB_BUTTON_H;
/** The panel is inset by p-3 on every side. */
export const PANEL_INSET = sp(3);
/** Terminal window chrome: py-2.5 around one 0.8rem line (line-height 1.45) + 1 px bottom border. */
export const CHROME_H = 2 * sp(2.5) + rem(0.8) * 1.45 + 1;

export interface PaneLayout {
  panelW: number;
  panelH: number;
  /** Size to give TerminalView. */
  termW: number;
  termH: number;
}

export function terminalPaneLayout(width: number = CENTER_W, height: number = WORKSPACE_BODY_H): PaneLayout {
  const panelW = width - 2 * PANEL_INSET;
  const panelH = height - TAB_STRIP_H - 2 * PANEL_INSET;
  return { panelW, panelH, termW: panelW - 2, termH: panelH - 2 - CHROME_H };
}

// ---------------------------------------------------------------------------------------------- tabs

const TabPill: React.FC<{ label: string; active: boolean; hover: boolean }> = ({ label, active, hover }) => (
  <div
    role="tab"
    aria-selected={active}
    style={{
      ...SMCP,
      boxSizing: "border-box",
      borderRadius: 9999,
      border: `1px solid ${active ? alpha(theme.accent, 0.7) : "transparent"}`,
      padding: `${sp(1)}px ${sp(4)}px`,
      fontSize: rem(0.95),
      lineHeight: 1.45,
      color: active || hover ? theme.ink : theme.ink3,
      backgroundColor: active ? alpha(theme.accent, 0.12) : undefined,
      boxShadow: active ? `0 0 18px -6px ${theme.accent}` : undefined,
    }}
  >
    {label}
  </div>
);

// ---------------------------------------------------------------------------------------------- component

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  tab = "terminal",
  tabHover,
  lines,
  caretLine,
  caretCol,
  caretOn = true,
  scrollOffset = 0,
  tail = true,
  eventCount,
  emptyRise = 1,
  ringTurn = 0,
  children,
  width = CENTER_W,
  height = WORKSPACE_BODY_H,
  style,
}) => {
  const L = terminalPaneLayout(width, height);
  const empty = eventCount === 0 && lines.length === 0;
  const tabs = ws.terminal.tabs as readonly PaneTab[];
  return (
    <div style={{ boxSizing: "border-box", width, height, display: "flex", flexDirection: "column", flex: "none", ...style }}>
      {/* tab strip */}
      <div role="tablist" style={{ boxSizing: "border-box", flex: "none", display: "flex", alignItems: "center", gap: sp(1), padding: `${sp(3)}px ${sp(4)}px 0` }}>
        {tabs.map((x) => (
          <TabPill key={x} label={x} active={tab === x} hover={tabHover === x} />
        ))}
      </div>

      {/* panel */}
      <div style={{ boxSizing: "border-box", flex: "1 1 0%", minHeight: 0, padding: PANEL_INSET }}>
        <div
          style={{
            position: "relative",
            boxSizing: "border-box",
            height: "100%",
            overflow: "hidden",
            borderRadius: 7,
            border: `1px solid ${theme.rule}`,
            backgroundColor: theme.sheet,
            boxShadow: theme.panelShadow,
          }}
        >
          {tab === "terminal" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: theme.termBg }}>
              {/* window chrome */}
              <div
                style={{
                  boxSizing: "border-box",
                  flex: "none",
                  height: CHROME_H,
                  display: "flex",
                  alignItems: "center",
                  gap: sp(3),
                  borderBottom: "1px solid rgba(255,255,255,.1)",
                  backgroundColor: "rgba(255,255,255,.025)",
                  padding: `${sp(2.5)}px ${sp(3.5)}px`,
                  color: theme.termDim,
                }}
              >
                <span aria-hidden style={{ display: "flex", gap: sp(1.5) }}>
                  {[theme.bad, theme.warn, theme.ok].map((c) => (
                    <i key={c} style={{ width: sp(2.5), height: sp(2.5), borderRadius: 9999, background: alpha(c, 0.8) }} />
                  ))}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: rem(0.8), lineHeight: 1.45 }}>
                  <span style={{ color: theme.ok }}>●</span> {ws.terminal.cwd} <span style={{ color: alpha(theme.termFg, 0.6) }}>·</span> {ws.terminal.path}
                </span>
                <span style={{ marginLeft: "auto", fontSize: rem(0.8), fontStyle: "italic", fontVariantNumeric: "tabular-nums" }}>
                  {eventCount} {eventCount === 1 ? ws.terminal.eventOne : ws.terminal.eventMany}
                </span>
              </div>

              {/* the terminal and its empty state */}
              <div style={{ position: "relative", flex: "none", width: L.termW, height: L.termH }}>
                <TerminalView lines={lines} caretLine={caretLine} caretCol={caretCol} caretOn={caretOn} scrollOffset={scrollOffset} tail={tail} width={L.termW} height={L.termH} />
                {empty && (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: sp(8), textAlign: "center" }}>
                    <div style={{ maxWidth: rem(24), color: theme.termFg, ...riseStyle(emptyRise) }}>
                      <div style={{ position: "relative", width: sp(24), height: sp(24), margin: `0 auto ${sp(4)}px`, display: "grid", placeItems: "center" }}>
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            boxSizing: "border-box",
                            borderRadius: 9999,
                            border: `1px dashed ${alpha("#ffffff", 0.2)}`,
                            transform: `rotate(${(ringTurn * 360).toFixed(3)}deg)`,
                          }}
                        />
                        <Mark size={56} color={theme.termDim} />
                      </div>
                      <div style={{ fontSize: rem(1.5), fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.04 }}>{ws.terminal.emptyTitle}</div>
                      <p style={{ margin: `${sp(1)}px 0 0`, lineHeight: 1.625, color: theme.termDim }}>{ws.terminal.emptyBody}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};
