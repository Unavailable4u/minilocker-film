// The stage background (STAGE space, fills its parent): the picture named in src/config/background.ts, or the old graphite gradient with
// the drifting crimson glow when that file says `src: null`. Pure: the drift is a function of the GLOBAL frame, so the S0 copy and the film's
// copy of this layer are the same picture on the same frame (S0 draws its own, because its glitch needs an opaque layer).
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { STAGE_BACKGROUND } from "../config/background";
import { theme } from "../config/theme";
import { TOTAL } from "../config/timeline";
import { clamp01 } from "../lib/ease";
import { StageGlow } from "./StageGlow";

export const StageBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const b = STAGE_BACKGROUND;

  if (b.src === null) {
    return (
      <div style={{ position: "absolute", inset: 0, background: theme.stageGradient, overflow: "hidden" }}>
        <StageGlow />
      </div>
    );
  }

  const k = 1 + b.drift * clamp01(frame / (TOTAL - 1));
  return (
    <div style={{ position: "absolute", inset: 0, background: theme.hookBg, overflow: "hidden", pointerEvents: "none" }}>
      <Img
        src={staticFile(b.src)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: b.position,
          transformOrigin: "50% 50%",
          transform: `scale(${k.toFixed(5)})`,
          filter: b.blurPx > 0 ? `blur(${b.blurPx}px)` : undefined,
        }}
      />
      {b.dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(5,5,6,${b.dim})` }} />}
    </div>
  );
};
