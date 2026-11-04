// MiniLocker film: THE PERSISTENT APP (patch 11). One component, <FilmApp frame={...}/>, that draws the complete recreated MiniLocker
// window (AppWindow + Header + the screen or screens that are mounted) for ANY global frame from APP_FIRST_FRAME to APP_LAST_FRAME.
//
// It owns no state and no timing: everything comes from useFilmState(frame) (src/config/filmState.ts), which reads the choreography
// (src/config/script.ts) and the evidence. Scenes put it inside the Camera and add the cursor, callouts and captions on top; they never
// compute app state themselves.
//
// During a screen change both screens are mounted for SWAP_FADE_FRAMES and cross-fade (the nav underline slides in the header; the
// content swaps on the beat while the camera moves). Each screen sits in its own absolutely positioned layer, so a fading screen never
// pushes the other one around.
import React from "react";
import { fonts, theme } from "../config/theme";
import { useFilmState, type FilmState } from "../config/filmState";
import { browserPages } from "../lib/derive";
import { AppWindow } from "./AppWindow";
import { AttackLabScreen } from "./AttackLabScreen";
import { Header } from "./Header";
import { InfraScreen } from "./InfraScreen";
import { ReportScreen } from "./ReportScreen";
import { Workspace } from "./Workspace";
import type { ScreenName } from "../config/script";
import { Chip, rem, sp } from "./primitives";

export interface FilmAppProps {
  /** The GLOBAL film frame. */
  frame: number;
  /** A state already computed for this frame (a scene that needs the state too passes it, so it is computed once). */
  state?: FilmState;
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------------------------- the browser tab

/**
 * The Workspace "browser" tab. The page of the hostile run is rebuilt by the S5 scene; the app's own tab is drawn here in its
 * plain form: the address bar and the pages the browser sandbox has visited so far, with what the scanner said about each. Every
 * value is read from the ledger events visible on this frame.
 */
const BrowserTab: React.FC<{ events: FilmState["workspace"]["events"] }> = ({ events }) => {
  const { pages } = browserPages(events as never);
  const page = pages[pages.length - 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: theme.sheet }}>
      <div style={{ display: "flex", alignItems: "center", gap: sp(2), borderBottom: `1px solid ${theme.rule}`, padding: `${sp(2.5)}px ${sp(3.5)}px` }}>
        <div
          style={{
            flex: 1,
            borderRadius: 5,
            border: `1px solid ${theme.rule}`,
            backgroundColor: theme.sunken,
            padding: `${sp(1)}px ${sp(3)}px`,
            fontFamily: fonts.mono,
            fontSize: rem(0.85),
            color: page ? theme.ink : theme.ink3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {page ? page.url : ""}
        </div>
        {page && <Chip tone={page.status !== null && page.status < 400 ? "ok" : "bad"}>{page.status ?? "-"}</Chip>}
      </div>
      <div style={{ padding: sp(5), display: "flex", flexDirection: "column", gap: sp(3), color: theme.ink }}>
        {pages.map((p) => (
          <div key={p.seq} style={{ display: "flex", alignItems: "center", gap: sp(3), borderBottom: `1px solid ${theme.rule}`, paddingBottom: sp(2) }}>
            <span style={{ fontFamily: fonts.mono, fontSize: rem(0.82), color: theme.ink3 }}>{p.seq}</span>
            <span style={{ fontSize: rem(1.05) }}>{p.title}</span>
            {p.flagged && <Chip tone="bad">{p.flagged.score}</Chip>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the screens

const ScreenOf: React.FC<{ screen: ScreenName; s: FilmState }> = ({ screen, s }) => {
  switch (screen) {
    case "workspace":
      return (
        <Workspace
          form={s.workspace.form}
          steps={s.workspace.steps}
          terminal={{ ...s.workspace.terminal, tab: s.paneTab, children: s.paneTab === "terminal" ? undefined : <BrowserTab events={s.workspace.events} /> }}
          blast={s.workspace.blast}
        />
      );
    case "attackLab":
      return <AttackLabScreen {...s.attackLab} />;
    case "report":
      return <ReportScreen {...s.report} />;
    case "infra":
      return <InfraScreen {...s.infra} />;
    default:
      return null;
  }
};

export const FilmApp: React.FC<FilmAppProps> = ({ frame, state, style }) => {
  const s = state ?? useFilmState(frame);
  return (
    <AppWindow
      style={style}
      header={
        <Header
          activeScreen={s.activeScreen}
          tabHighlight={s.tabHighlight}
          taskId={s.header.taskId}
          status={s.header.status}
          tokenApplied
          pulse={s.header.pulse}
        />
      }
    >
      {s.layers.map((l) => (
        <div key={l.screen} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", opacity: l.opacity }}>
          <ScreenOf screen={l.screen} s={s} />
        </div>
      ))}
    </AppWindow>
  );
};
