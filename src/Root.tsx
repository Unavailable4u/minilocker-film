import React from "react";
import { Composition } from "remotion";
import { MiniLockerFilm } from "./MiniLockerFilm";
import { FPS, STAGE, TOTAL } from "./config/timeline";

// Dev-only compositions (DevBrandSheet, DevFxSheet, DevText, DevShell, ...) are added by the
// patches that introduce them. Each of those patches resends this whole file.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MiniLockerFilm"
        component={MiniLockerFilm}
        durationInFrames={TOTAL}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      <Composition
        id="MiniLockerFilm-Preview"
        component={MiniLockerFilm}
        durationInFrames={TOTAL}
        fps={FPS}
        width={STAGE.w / 2}
        height={STAGE.h / 2}
      />
    </>
  );
};
