import React from "react";
import { theme } from "../config/theme";
import { LOGICAL } from "../config/timeline";
import { useFilmState } from "../config/filmState";
import { FilmApp } from "../ui/FilmApp";

/** A live "screenshot": the real recreated app at GLOBAL film frame `at`, cropped to `crop` (logical px of the 1600x900 app), drawn `width` px wide. */
export interface ShotProps {
  at: number;
  crop?: { x: number; y: number; w: number; h: number };
  width: number;
  radius?: number;
  frame?: boolean;
  /** Draws a 100 px grid with coordinates (logical px) so a crop can be read off the picture. Turn it off for the deck. */
  grid?: boolean;
  style?: React.CSSProperties;
}

export const Shot: React.FC<ShotProps> = ({ at, crop = { x: 0, y: 0, w: LOGICAL.w, h: LOGICAL.h }, width, radius = 14, frame = true, grid = false, style }) => {
  const state = useFilmState(at);
  const k = width / crop.w;
  const height = Math.round(crop.h * k);
  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        borderRadius: radius,
        background: theme.paper,
        boxShadow: frame ? `0 0 0 1px ${theme.rule2}, 0 24px 48px -28px rgba(40,30,30,.5)` : undefined,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: LOGICAL.w, height: LOGICAL.h, transform: `scale(${k}) translate(${-crop.x}px, ${-crop.y}px)`, transformOrigin: "0 0" }}>
        <FilmApp frame={at} state={state} />
        {grid &&
          Array.from({ length: 17 }, (_, i) => i * 100).map((v) => (
            <React.Fragment key={v}>
              <div style={{ position: "absolute", left: v, top: 0, width: 1, height: LOGICAL.h, background: "rgba(200,0,60,.45)" }} />
              <div style={{ position: "absolute", left: v + 3, top: 2, fontSize: 14, color: "#c8003c", fontFamily: "monospace" }}>{v}</div>
              {v <= LOGICAL.h && (
                <>
                  <div style={{ position: "absolute", top: v, left: 0, height: 1, width: LOGICAL.w, background: "rgba(200,0,60,.45)" }} />
                  <div style={{ position: "absolute", top: v + 2, left: 3, fontSize: 14, color: "#c8003c", fontFamily: "monospace" }}>{v}</div>
                </>
              )}
            </React.Fragment>
          ))}
      </div>
    </div>
  );
};
