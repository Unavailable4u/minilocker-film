import React from "react";
import { Composition } from "remotion";
import { MiniLockerFilm } from "./MiniLockerFilm";
import { DevBrandSheet } from "./dev/DevBrandSheet";
import { DEV_FX_FRAMES, DevFxSheet } from "./dev/DevFxSheet";
import { DEV_TEXT_FRAMES, DevText } from "./dev/DevText";
import { DEV_SHELL_FRAMES, DevShell } from "./dev/DevShell";
import { DEV_WORKSPACE_FRAMES, DevWorkspace } from "./dev/DevWorkspace";
import { DEV_SCREENS_FRAMES, DevScreens } from "./dev/DevScreens";
import { DEV_GFX_A_FRAMES, DevGfxA } from "./dev/DevGfxA";
import { DEV_GFX_B_FRAMES, DevGfxB } from "./dev/DevGfxB";
import { DEV_GFX_C_FRAMES, DevGfxC } from "./dev/DevGfxC";
import { FPS, STAGE, TOTAL } from "./config/timeline";

// Dev-only compositions (DevBrandSheet, DevFxSheet, DevText, DevShell, DevWorkspace, DevScreens, DevGfxA, DevGfxB, DevGfxC, ...) are added by the
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
      {/* dev only (patch 07) */}
      <Composition
        id="DevScreens"
        component={DevScreens}
        durationInFrames={DEV_SCREENS_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
      {/* dev only (patch 08) */}
      <Composition
        id="DevGfxA"
        component={DevGfxA}
        durationInFrames={DEV_GFX_A_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
        defaultProps={{ specimenUsed: false }}
      />
      {/* dev only (patch 09) */}
      <Composition
        id="DevGfxB"
        component={DevGfxB}
        durationInFrames={DEV_GFX_B_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
        defaultProps={{ specimenMismatch: false }}
      />
      {/* dev only (patch 10) */}
      <Composition
        id="DevGfxC"
        component={DevGfxC}
        durationInFrames={DEV_GFX_C_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
      />
    </>
  );
};
