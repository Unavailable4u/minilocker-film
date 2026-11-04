// DEV ONLY (patch 11). <FilmApp/> at full 1920 x 1080 with no camera, from the first frame the app is on screen (f600) to the last (f4979):
//   f600-749    the Workspace at rest, then the form (select f700, profile f712, hold f730, Run f750)
//   f753-1322   the fix_repo_v2 task plays on the LedgerClock (tests red f880, patch f980, green f1100, hidden check f1200, audit f1272)
//   f2100-2219  the Attack Lab, the cursor hovers tiles and selects rewind_after_rm_rf; f2220 Run; the wipe f2340; the checks f2700
//   f3300-3719  the Workspace on its browser tab, the hostile page task (injection f3430, deny f3512, approval f3612)
//   f3720-4559  the Report (cards f3780, Verify f3960)   f4560-4979 Infra
// The composition starts at f0 = global frame 600, so a still at composition frame N shows global frame 600 + N (the label says which).
// Stills worth taking, as GLOBAL frames (use --frame=<global - 600>):
//   f760 f1000 f1260 f1700 f2230 f2350 f2700 f3500 f3900 f4100        e.g.  npx remotion still src/index.ts DevApp out/qa/app-760.png --frame=160
// Prop `anchors`: draws a box at every anchor of src/config/anchors.ts on the frame it is active, to check them against the pixels.
// Prop `probe`: logs the measured DOM rectangles (tools/measure-anchors.mjs).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { fonts, theme } from "../config/theme";
import { LOGICAL, STAGE } from "../config/timeline";
import { APP_FIRST_FRAME, APP_LAST_FRAME } from "../config/script";
import { useFilmState } from "../config/filmState";
import { FontsReady } from "../lib/fonts";
import { FilmApp } from "../ui/FilmApp";
import { DevAnchors } from "./DevAnchors";
import { DevProbe } from "./DevProbe";

export const DEV_APP_FRAMES = APP_LAST_FRAME - APP_FIRST_FRAME + 1;

export interface DevAppProps {
  anchors: boolean;
  /** Logs the measured rectangles of the DOM (tools/measure-anchors.mjs). */
  probe: boolean;
}

const Scene: React.FC<DevAppProps> = ({ anchors, probe }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const local = useCurrentFrame();
  const frame = APP_FIRST_FRAME + local;
  const state = useFilmState(frame);
  const left = (STAGE.w - LOGICAL.w) / 2;
  const top = (STAGE.h - LOGICAL.h) / 2;
  return (
    <AbsoluteFill style={{ background: theme.stageGradient }}>
      <div style={{ position: "absolute", left: 40, top: 30, fontFamily: fonts.mono, fontSize: 20, lineHeight: 1.3, color: theme.ink2 }}>
        DevApp · patch 11 · dev only · global frame {frame} · screens {state.layers.map((l) => l.screen).join(" > ")}
      </div>
      <div ref={rootRef} style={{ position: "absolute", left, top }}>
        <FilmApp frame={frame} state={state} />
        {anchors && <DevAnchors frame={frame} />}
        {probe && <DevProbe frame={frame} rootRef={rootRef} />}
      </div>
    </AbsoluteFill>
  );
};

export const DevApp: React.FC<Partial<DevAppProps>> = ({ anchors = false, probe = false }) => (
  <FontsReady>
    <Scene anchors={anchors} probe={probe} />
  </FontsReady>
);
