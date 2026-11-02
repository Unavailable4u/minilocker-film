import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "./ui/theme.css";
import { fonts, theme } from "./config/theme";
import { STAGE, TOTAL, sceneAt } from "./config/timeline";
import { FontsReady } from "./lib/fonts";

/**
 * TEMPORARY (patch 00). Shows only the graphite stage and a frame/scene label.
 * Patch 12 replaces the inside of <Stage> with the real film; the Stage wrapper itself stays:
 * it draws a fixed 1920x1080 stage and scales it to the composition size (so the 960x540 Preview works).
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
          width: STAGE.w,
          height: STAGE.h,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          background: theme.stageGradient,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: theme.appBackground,
            backgroundSize: theme.appBackgroundSize,
            opacity: 0.9,
          }}
        />
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const MiniLockerFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = sceneAt(frame);
  return (
    <FontsReady>
      <Stage>
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 72,
            fontFamily: fonts.mono,
            fontSize: 22,
            color: theme.ink2,
            lineHeight: 1.5,
          }}
        >
          <div>TEMPORARY SCAFFOLD (patch 00)</div>
          <div>
            frame {frame} / {TOTAL}
          </div>
          <div>
            {scene.id} {scene.name}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.serif,
            fontWeight: 700,
            fontSize: 96,
            letterSpacing: "-0.012em",
            color: theme.ink,
          }}
        >
          Mini<span style={{ color: theme.accentInk }}>Locker</span>
        </div>
      </Stage>
    </FontsReady>
  );
};
