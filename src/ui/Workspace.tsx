// MiniLocker film: the Workspace screen (patch 06): the real grid of Workspace() in frontend/src/App.tsx,
// `grid-cols-[22rem_minmax(0,1fr)_27rem]` = 374 | 767 | 459 at the 17 px root, filling the 832.53 px body of AppWindow.
//   left   : TaskForm over StepStream (border-r, paper at 40%)
//   centre : TerminalPane
//   right  : BlastPanel (border-l, paper at 40%)
// A pure composition: every prop of the four parts passes straight through. Put it in `<AppWindow header={<Header .../>}>`.
import React from "react";
import { alpha, theme } from "../config/theme";
import { BlastPanel, type BlastPanelProps } from "./BlastPanel";
import { StepStream, type StepStreamProps } from "./StepStream";
import { TaskForm, type TaskFormProps } from "./TaskForm";
import { TerminalPane, type TerminalPaneProps } from "./TerminalPane";
import { rem } from "./primitives";

export interface WorkspaceProps {
  form: TaskFormProps;
  steps: StepStreamProps;
  terminal: TerminalPaneProps;
  blast: BlastPanelProps;
  style?: React.CSSProperties;
}

const SIDE_BG = alpha(theme.paper, 0.4);

export const Workspace: React.FC<WorkspaceProps> = ({ form, steps, terminal, blast, style }) => (
  <div style={{ display: "grid", flex: "1 1 0%", minHeight: 0, gridTemplateColumns: `${rem(22)}px minmax(0, 1fr) ${rem(27)}px`, ...style }}>
    <section style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, borderRight: `1px solid ${theme.rule}`, backgroundColor: SIDE_BG }}>
      <TaskForm {...form} />
      <StepStream {...steps} />
    </section>
    <section style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      <TerminalPane {...terminal} />
    </section>
    <section style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, borderLeft: `1px solid ${theme.rule}`, backgroundColor: SIDE_BG }}>
      <BlastPanel {...blast} style={{ height: "auto", flex: "1 1 0%", ...blast.style }} />
    </section>
  </div>
);
