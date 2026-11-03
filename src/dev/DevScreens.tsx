// DEV ONLY (patch 07). Cycles through the three screens the film cuts to, over DEV_SCREENS_FRAMES frames, to prove they are dumb
// components driven by props computed from evidence:
//   frame 0..59     Attack Lab, empty: donut "0 of 15", 15 "not run" tiles, the first attack's preview
//   frame 60..89    the cursor is over Run, the press (f72..76), the attack runs (busy ring, pulsing tile)
//   frame 90..299   one attack done (rewind_after_rm_rf): its steps rise one by one, then the checks light one by one, the verdict
//                   stamps in (f236), the donut fills to "1/15"; f246..290 the pane scrolls down to the checks
//   frame 300..419  Report: header, then the nine dimension cards flip in, in the report's own order
//   frame 420..479  "Verify ledger now": pressed, spinning, then the result line "intact - N events - head 8 hex"
//   frame 480..599  Infra: the wiring diagram, then the six panels, each flashing once as it lands
// Stills worth taking:  npx remotion still src/index.ts DevScreens out/qa/screens-0.png --frame=0
//                       ... --frame=200 (steps and checks building)  ... --frame=290 (verdict and checks)
//                       ... --frame=400 (report)  ... --frame=470 (verified)  ... --frame=570 (infra)
// Everything drawn comes from evidence.json through src/data/select.ts, except the attack catalog (titles, summaries, tries of all 15
// attacks), which evidence does not hold yet: see devCatalog.ts. The only literals here are frame numbers and developer notes.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { fonts, theme } from "../config/theme";
import { LOGICAL, STAGE } from "../config/timeline";
import { selectAttack, selectInfra, selectTask } from "../data/select";
import type { AttackResult } from "../data/types";
import { mapRange, signature, stepPulse } from "../lib/ease";
import { FontsReady } from "../lib/fonts";
import { riseProgress } from "../lib/rise";
import { AppWindow } from "../ui/AppWindow";
import { AttackLabScreen, orderedChecks, type AttackTile, type TileState } from "../ui/AttackLabScreen";
import { Header } from "../ui/Header";
import { InfraScreen } from "../ui/InfraScreen";
import { ReportScreen } from "../ui/ReportScreen";
import { pulsePhase, spinProgress } from "../ui/primitives";
import { DEV_ATTACK_CATALOG } from "./devCatalog";

export const DEV_SCREENS_FRAMES = 600;

const HERO = "rewind_after_rm_rf";

// Attack Lab
/** px the card list scrolls so the 12th card (rewind_after_rm_rf) is in view (11 cards of about 156 px each, minus a margin). */
const LIST_SCROLL = 1580;
const RUN_HOVER = 66;
const RUN_PRESS = 72;
const RUN_START = 76; // the attack runs
const RUN_DONE = 90; // the result starts to build
const STEP_FROM = 94;
const STEP_EVERY = 22;
const CHECK_FROM = 164;
const CHECK_EVERY = 9;
const STAMP_AT = 236;
const SCROLL_FROM = 246;
const SCROLL_TO = 290;
// Report
const REPORT_FROM = 300;
const CARD_FROM = 312;
const CARD_EVERY = 6;
const VERIFY_PRESS = 424;
const VERIFY_RUN = 428;
const VERIFY_DONE = 452;
// Infra
const INFRA_FROM = 480;
const PANEL_FROM = 492;
const PANEL_EVERY = 10;

const note = (px: number, color: string): React.CSSProperties => ({ fontFamily: fonts.mono, fontSize: px, color, lineHeight: 1.3 });

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const task = selectTask();
  const infra = selectInfra();
  const hero: AttackResult = selectAttack(HERO);

  const screen = frame < REPORT_FROM ? 2 : frame < INFRA_FROM ? 3 : 5;
  const running = frame >= RUN_START && frame < RUN_DONE;
  const done = frame >= RUN_DONE;

  // ---- Attack Lab
  const tiles: AttackTile[] = DEV_ATTACK_CATALOG.map((a) => {
    let state: TileState = "notrun";
    if (a.name === HERO) state = running ? "running" : done ? hero.verdict === "contained" ? "contained" : "inconclusive" : "notrun";
    return { name: a.name, state };
  });
  const stepStarts = hero.steps.map((_, i) => STEP_FROM + i * STEP_EVERY);
  const checkStarts = orderedChecks(hero.checks).map((_, i) => CHECK_FROM + i * CHECK_EVERY);
  const stepsVisible = stepStarts.filter((s) => frame >= s).length;
  const checksVisible = checkStarts.filter((s) => frame >= s).length;
  // the tile turns "contained" when the verdict stamps in, not before
  const stamped = frame >= STAMP_AT;
  const labTiles = tiles.map((t) => (t.name === HERO && done && !stamped ? { ...t, state: "notrun" as TileState } : t));

  // ---- Report
  const report = task.report;
  const dimKeys = Object.keys(report.dimensions);
  const reveal = dimKeys.map((_, i) => riseProgress(frame, CARD_FROM + i * CARD_EVERY, 16));
  const verifyState = frame < VERIFY_RUN ? "idle" : frame < VERIFY_DONE ? "running" : "done";

  // ---- Infra
  const infraReveal = [0, 1, 2, 3, 4, 5, 6].map((i) => riseProgress(frame, i === 0 ? INFRA_FROM + 4 : PANEL_FROM + (i - 1) * PANEL_EVERY, 14));
  const infraFlash = [0, 1, 2, 3, 4, 5, 6].map((i) => stepPulse(frame, (i === 0 ? INFRA_FROM + 4 : PANEL_FROM + (i - 1) * PANEL_EVERY) + 12, 16));

  return (
    <AbsoluteFill style={{ background: theme.stageGradient }}>
      <div style={{ position: "absolute", left: 40, top: 30, ...note(20, theme.ink2) }}>
        DevScreens · patch 07 · dev only · frame {frame} · {screen === 2 ? "Attack Lab" : screen === 3 ? "Report" : "Infra"}
      </div>
      <div style={{ position: "absolute", left: (STAGE.w - LOGICAL.w) / 2, top: (STAGE.h - LOGICAL.h) / 2 }}>
        <AppWindow
          header={
            <Header
              activeScreen={screen}
              taskId={screen === 2 ? (done ? hero.task_id : null) : task.id}
              status={screen === 2 ? (running ? "running" : done ? "done" : "idle") : "done"}
              tokenApplied
              pulse={pulsePhase(frame)}
            />
          }
        >
          {screen === 2 && (
            <AttackLabScreen
              attacks={DEV_ATTACK_CATALOG}
              tiles={labTiles}
              selected={HERO}
              runningName={running ? HERO : null}
              results={{ [HERO]: done ? hero : undefined }}
              stepsVisible={stepsVisible}
              stepProgress={stepStarts.map((s) => riseProgress(frame, s))}
              checksVisible={checksVisible}
              checkProgress={checkStarts.map((s) => riseProgress(frame, s, 14))}
              verdictStamp={riseProgress(frame, STAMP_AT, 12)}
              press={frame >= RUN_PRESS && frame < RUN_START ? "run" : undefined}
              hover={{ run: frame >= RUN_HOVER && frame < RUN_START ? HERO : undefined }}
              spin={spinProgress(frame)}
              pulse={pulsePhase(frame, 60)}
              donutFill={stamped ? riseProgress(frame, STAMP_AT, 20) : 1}
              listScrollY={mapRange(frame, 36, 58, 0, LIST_SCROLL, signature)}
              detailScrollY={mapRange(frame, SCROLL_FROM, SCROLL_TO, 0, 520, signature)}
            />
          )}
          {screen === 3 && (
            <ReportScreen
              report={report}
              reveal={reveal}
              headReveal={riseProgress(frame, REPORT_FROM + 2, 12)}
              verify={{
                state: verifyState,
                progress: verifyState === "running" ? (frame - VERIFY_RUN) / (VERIFY_DONE - VERIFY_RUN) : riseProgress(frame, VERIFY_DONE, 10),
                result: task.verify,
              }}
              pressVerify={frame >= VERIFY_PRESS && frame < VERIFY_RUN}
              hoverVerify={frame >= VERIFY_PRESS - 6 && frame < VERIFY_RUN}
              scrollY={mapRange(frame, 352, 410, 0, 560, signature)}
            />
          )}
          {screen === 5 && <InfraScreen infra={infra} reveal={infraReveal} flash={infraFlash} pulse={pulsePhase(frame)} />}
        </AppWindow>
      </div>
    </AbsoluteFill>
  );
};

export const DevScreens: React.FC = () => (
  <FontsReady>
    <Scene />
  </FontsReady>
);
