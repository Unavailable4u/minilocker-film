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
import { DEV_APP_FRAMES, DevApp } from "./dev/DevApp";
import { Deck, DECK_SLIDES } from "./deck/Deck";
import { FPS, STAGE, TOTAL } from "./config/timeline";

// Two groups, in this order:
//   1. FINAL: the film (MiniLockerFilm, what scripts/render.mjs renders) and its half-size Studio preview (MiniLockerFilm-Preview). Nothing else is final.
//   2. DEV ONLY: the Dev* sheets of patches 01-11, kept so a part of the film can be reviewed alone in the Studio. They are never rendered into the film.
// Each patch that adds a dev composition resends this whole file (the dev group grows at the bottom).
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ---- FINAL ---- */}
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
      {/* The slide deck (docs/guide/SLIDE_DECK_GUIDE.md): one frame per slide, 1920x1080. Built by scripts/make-deck.mjs, never part of the film. */}
      <Composition id="MiniLockerDeck" component={Deck} durationInFrames={DECK_SLIDES} fps={FPS} width={STAGE.w} height={STAGE.h} />
      {/* ---- DEV ONLY: review sheets, not part of the film ---- */}
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
      {/* dev only (patch 11): the persistent FilmApp, global frames 600..4979, no camera. Composition frame N = global frame 600 + N. */}
      <Composition
        id="DevApp"
        component={DevApp}
        durationInFrames={DEV_APP_FRAMES}
        fps={FPS}
        width={STAGE.w}
        height={STAGE.h}
        defaultProps={{ anchors: false, probe: false }}
      />
    </>
  );
};
