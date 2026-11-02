// MiniLocker film: the app window (patch 05). The real app is a full-viewport page; the film draws it as a 1600 x 900 LOGICAL
// window (LOGICAL in timeline.ts) with rounded corners, a hairline border and a deep shadow, and no browser chrome. The virtual
// camera (src/fx/Camera.tsx) places and zooms it; this component knows nothing about the stage.
//
// Layout = the real app root (`flex h-full flex-col`): the header slot on top, then a body that fills the rest (`<main flex-1>`).
// The window paints the real body background: paper, two soft pools of light and the 44 px engineering grid (index.css). Base text
// styles of the app (font, color, line height, kerning) are set here too, so everything inside the window reads like the app.
//
// The 1 px border is drawn as an overlay INSIDE the 1600 x 900 box, so the content area is exactly the logical size and every
// rectangle in src/config/focus.ts stays valid. Pure and props-driven.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { LOGICAL } from "../config/timeline";

/** Corner radius of the window. */
export const WINDOW_RADIUS = 14;

const BASE_BORDER = "rgba(255,255,255,.08)";
const BASE_SHADOW = "0 40px 120px rgba(0,0,0,.65)";

export interface AppWindowProps {
  /** Normally `<Header ... />`. It sits at the top and keeps its own height (GRID.headerH). */
  header?: React.ReactNode;
  /** The body slot: fills the space under the header (832.53 px). */
  children?: React.ReactNode;
  /**
   * Faint crimson rim light, 0..1. 0 is the plain window; 1 tints the border crimson, adds a soft crimson halo outside it and a
   * whisper of crimson just inside the edge. Meant for a moment of attention, not for permanent use.
   */
  rim?: number;
  style?: React.CSSProperties;
}

export const AppWindow: React.FC<AppWindowProps> = ({ header, children, rim = 0, style }) => {
  const r = Math.min(1, Math.max(0, rim));
  const shadow = r > 0 ? `${BASE_SHADOW}, 0 0 ${(70 * r).toFixed(2)}px -6px ${alpha(theme.accent, 0.3 * r)}` : BASE_SHADOW;
  const border = r > 0 ? `1px solid ${alpha(theme.accent, 0.08 + 0.42 * r)}` : `1px solid ${BASE_BORDER}`;
  const inner = r > 0 ? `inset 0 0 ${(46 * r).toFixed(2)}px -14px ${alpha(theme.accent, 0.28 * r)}` : undefined;

  return (
    <div
      style={{
        position: "relative",
        width: LOGICAL.w,
        height: LOGICAL.h,
        flex: "none",
        borderRadius: WINDOW_RADIUS,
        boxShadow: shadow,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: WINDOW_RADIUS,
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.paper,
          backgroundImage: theme.appBackground,
          backgroundSize: theme.appBackgroundSize,
          color: theme.ink,
          fontFamily: fonts.serif,
          lineHeight: 1.45,
          fontFeatureSettings: '"kern", "liga", "onum" 0',
          textRendering: "optimizeLegibility",
        }}
      >
        {header}
        <main style={{ position: "relative", flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</main>
      </div>
      {/* border and rim light, above the content, inside the 1600 x 900 box */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          borderRadius: WINDOW_RADIUS,
          border,
          boxShadow: inner,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
