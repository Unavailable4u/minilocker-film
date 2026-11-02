import React from "react";
import { Composition } from "remotion";
import { MiniLockerFilm } from "./MiniLockerFilm";
import { DevBrandSheet } from "./dev/DevBrandSheet";
import { DEV_FX_FRAMES, DevFxSheet } from "./dev/DevFxSheet";
import { DEV_TEXT_FRAMES, DevText } from "./dev/DevText";
import { DEV_SHELL_FRAMES, DevShell } from "./dev/DevShell";
import { DEV_WORKSPACE_FRAMES, DevWorkspace } from "./dev/DevWorkspace";
import { FPS, STAGE, TOTAL } from "./config/timeline";

// Dev-only compositions (DevBrandSheet, DevFxSheet, DevText, DevShell, DevWorkspace, ...) are added by the
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
      {/* dev only (patch 01) */}
      <Composition
        id="DevBrandSheet"
        component={DevBrandSheet}
        durationInFrames={180}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      {/* dev only (patch 03) */}
      <Composition
        id="DevFxSheet"
        component={DevFxSheet}
        durationInFrames={DEV_FX_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      {/* dev only (patch 04) */}
      <Composition
        id="DevText"
        component={DevText}
        durationInFrames={DEV_TEXT_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      {/* dev only (patch 05) */}
      <Composition
        id="DevShell"
        component={DevShell}
        durationInFrames={DEV_SHELL_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      {/* dev only (patch 06) */}
      <Composition
        id="DevWorkspace"
        component={DevWorkspace}
        durationInFrames={DEV_WORKSPACE_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
    </>
  );
};
