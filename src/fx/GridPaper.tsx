// The app's engineering-paper background: 44 px lines of rgba(255,32,82,.03) over two soft pools of light.
//
// - Flat (default): the same layers as the real app's body background, scaled to fill the box it is placed in.
// - `perspective`: the grid lies on a floor that recedes (rotateX), for title and transition moments. The lines are drawn a
//   little stronger there (see `lines`) because perspective foreshortens them.
// - `speed`: px per frame the grid scrolls (0 = still). Pure: the offset is frame * speed.
// STAGE space by default; absolutely positioned, it fills its parent.

import React from "react";
import { useCurrentFrame } from "remotion";
import { alpha, theme } from "../config/theme";
import { STAGE } from "../config/timeline";

export interface GridPaperProps {
  /** Lay the grid on a receding floor instead of flat. */
  perspective?: boolean;
  /** Camera height of the perspective floor: tilt in degrees from face-on. Default 58. */
  tilt?: number;
  /** Scroll speed in px per frame. Default 0. */
  speed?: number;
  /** Line opacity, 1 = the app's .03. Default 1 (flat) or 3 (perspective). */
  lines?: number;
  /** Overall opacity 0..1. Default 1. */
  opacity?: number;
}

export const GridPaper: React.FC<GridPaperProps> = ({ perspective = false, tilt = 58, speed = 0, lines, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const k = lines ?? (perspective ? 3 : 1);
  const line = `rgba(255,32,82,${0.03 * k})`;
  const size = theme.gridSize;
  const offset = (frame * speed) % size;

  const glows =
    `radial-gradient(1100px 560px at 14% -10%, ${theme.glowA}, transparent 62%), ` +
    `radial-gradient(900px 500px at 104% 0%, ${theme.glowB}, transparent 60%)`;

  if (!perspective) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          pointerEvents: "none",
          backgroundImage: `${glows}, linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: `auto, auto, ${size}px ${size}px, ${size}px ${size}px`,
          backgroundPosition: `0 0, 0 0, 0 ${offset}px, ${offset}px 0`,
        }}
      />
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", overflow: "hidden" }}>
      {/* the pools of light stay flat behind the floor */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: glows }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: STAGE.w,
          height: STAGE.h,
          perspective: 1000,
          perspectiveOrigin: "50% 30%",
          // fade the far edge of the floor into the dark
          maskImage: "linear-gradient(180deg, transparent 0%, #000 38%, #000 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 38%, #000 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -STAGE.w,
            top: STAGE.h * 0.1,
            width: STAGE.w * 3,
            height: STAGE.h * 2,
            transformOrigin: "50% 0%",
            transform: `rotateX(${tilt}deg)`,
            backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
            backgroundSize: `${size}px ${size}px, ${size}px ${size}px`,
            backgroundPosition: `0 ${offset}px, ${offset}px 0`,
          }}
        />
      </div>
      {/* a thin accent horizon, so the floor reads as a floor */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: STAGE.h * 0.1,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${alpha(theme.accent, 0.12)}, transparent)`,
        }}
      />
    </div>
  );
};
