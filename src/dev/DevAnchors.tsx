// DEV ONLY (patch 11): draws the rectangle of every anchor of src/config/anchors.ts that is relevant on a frame, in window px, over the app.
import React from "react";
import { fonts } from "../config/theme";
import { LAB, REPORT } from "../config/script";
import {
  labCardAnchor,
  labRunAnchor,
  labTileAnchor,
  navTabAnchor,
  reportCardAnchor,
  verifyButtonAnchor,
  workspaceAnchors,
  infraCardAnchor,
} from "../config/anchors";
import { selectAttackCatalog } from "../data/select";
import type { Rect } from "../config/focus";

const Box: React.FC<{ r: Rect; label: string; color?: string }> = ({ r, label, color = "#00e5ff" }) => (
  <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, boxSizing: "border-box", border: `1.5px solid ${color}`, pointerEvents: "none", zIndex: 50 }}>
    <span style={{ position: "absolute", left: 0, top: -14, fontFamily: fonts.mono, fontSize: 11, color, background: "rgba(0,0,0,.6)" }}>{label}</span>
    <span style={{ position: "absolute", left: r.w / 2 - 6, top: r.h / 2 - 0.5, width: 12, height: 1, background: color }} />
    <span style={{ position: "absolute", left: r.w / 2 - 0.5, top: r.h / 2 - 6, width: 1, height: 12, background: color }} />
  </div>
);

export const DevAnchors: React.FC<{ frame: number }> = ({ frame }) => {
  const hero = selectAttackCatalog().findIndex((a) => a.name === LAB.hero);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) out.push(<Box key={`nav${i}`} r={navTabAnchor(i)} label={`nav ${i + 1}`} color="#ffd400" />);
  if (frame < 2100) {
    out.push(<Box key="sel" r={workspaceAnchors.taskSelect()} label="select" />);
    out.push(<Box key="prof" r={workspaceAnchors.profileSegment()} label="profile" />);
    out.push(<Box key="hold" r={workspaceAnchors.holdSelect()} label="hold" />);
    out.push(<Box key="run" r={workspaceAnchors.runButton()} label="run" />);
  }
  if (frame >= 2100 && frame < 3300) {
    for (let i = 0; i < 15; i++) out.push(<Box key={`t${i}`} r={labTileAnchor(i)} label={`${i}`} />);
    out.push(<Box key="card" r={labCardAnchor(hero, hero, frame)} label="hero card" color="#7CFC00" />);
    out.push(<Box key="lrun" r={labRunAnchor(hero, hero, frame)} label="run" color="#ff66ff" />);
  }
  if (frame >= 3300 && frame < 3720) for (let i = 0; i < 3; i++) out.push(<Box key={`p${i}`} r={workspaceAnchors.paneTab(i)} label={`pane tab ${i}`} />);
  if (frame >= 3720 && frame < 4560) {
    out.push(<Box key="rc" r={reportCardAnchor(frame)} label="report card" />);
    out.push(<Box key="vb" r={verifyButtonAnchor(frame)} label={`verify (hover from ${REPORT.verifyHoverFrom})`} color="#ff66ff" />);
  }
  if (frame >= 4560) out.push(<Box key="ic" r={infraCardAnchor()} label="infra panel" />);
  return <>{out}</>;
};
