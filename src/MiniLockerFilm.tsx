import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "./ui/theme.css";
import { theme } from "./config/theme";
import { LOGICAL, SCENE_ORDER, SCENES, STAGE } from "./config/timeline";
import { FontsReady } from "./lib/fonts";
import { Camera, getCameraState } from "./fx/Camera";
import { Cursor } from "./fx/Cursor";
import { Grain } from "./fx/Grain";
import { GridPaper } from "./fx/GridPaper";
import { StageGlow } from "./fx/StageGlow";
import { Vignette } from "./fx/Vignette";
import { FilmApp } from "./ui/FilmApp";
import { FILM_CAMERA, FILM_CURSOR, SCENE_OVERLAYS } from "./scenes";
import { appReveal, CAMERA_DOF, gridOpacity } from "./scenes/stageState";

/**
 * The film (patch 12a). Layers, bottom to top:
 *   stage gradient + drifting crimson glow -> grid paper (S1 / S9 only) -> <Camera> { FilmApp, Cursor } -> scene overlays -> grain -> vignette.
 *
 * Everything that changes between scenes lives in src/scenes/*: this file imports them through the barrel (src/scenes/index.ts)
 * and is not edited again. Scenes are mounted by a FRAME TEST, not <Sequence from>: a Sequence would shift useCurrentFrame() to
 * local frames and break the film's global-frame convention.
 *
 * The Stage wrapper draws a fixed 1920x1080 stage and scales it to the composition size (so the 960x540 Preview works).
 */
const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  const scale = width / STAGE.w;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div
        className="film-root"
        style={{
          position: "relative",
          // flex: none, or the AbsoluteFill's flex layout shrinks the stage to the composition height in the 960x540 Preview
          flex: "none",
          width: STAGE.w,
          height: STAGE.h,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          background: theme.stageGradient,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const MiniLockerFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = getCameraState(frame, FILM_CAMERA, fps);
  const reveal = appReveal(frame);
  const grid = gridOpacity(frame);

  return (
    <FontsReady>
      <Stage>
        <StageGlow />
        {grid > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: grid }}>
            <GridPaper perspective />
          </div>
        )}

        <Camera keyframes={FILM_CAMERA} dof={CAMERA_DOF}>
          {reveal.mounted && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: LOGICAL.w,
                height: LOGICAL.h,
                opacity: reveal.opacity,
                transform: `translateY(${reveal.dy.toFixed(2)}px)`,
              }}
            >
              <FilmApp frame={frame} />
            </div>
          )}
          <Cursor waypoints={FILM_CURSOR} zoom={cam.scale} />
        </Camera>

        {SCENE_ORDER.map((id) => {
          const s = SCENES[id];
          if (frame < s.start || frame > s.end) return null;
          const Overlay = SCENE_OVERLAYS[id];
          return <Overlay key={id} frame={frame} />;
        })}

        <Grain />
        <Vignette />
      </Stage>
    </FontsReady>
  );
};
