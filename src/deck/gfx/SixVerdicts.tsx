// E1 · Six verdicts (slide 02). The finished state of the film's opening: six agent screens, each given an ordinary job, each stopped on the verdict
// of the one command it typed. It is an ILLUSTRATION of an agent with no limits, not a measurement and not a named product: the slide prints
// copy.s0.tag under it, and every word here is a prop (copy.s0.screens).
//
// Static and props-driven, like src/gfx: nothing reads the frame. Verdicts are vermilion AND hatched (red never carries the meaning alone).
// The terminal strip stays dark, as the terminal does in the real app (light theme).
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";

export interface VerdictScreen {
  readonly agent: string;
  readonly task: string;
  readonly command: string;
  readonly verdict: string;
}

export interface SixVerdictsProps {
  /** copy.s0.screens */
  screens: readonly VerdictScreen[];
  /** Width of the whole grid in slide px. */
  width: number;
  /** Default 2: a 2 x 3 grid keeps the commands at 26 px. */
  columns?: number;
  /** Default 24. */
  gap?: number;
}

const MONO = fonts.mono;

const Screen: React.FC<{ spec: VerdictScreen }> = ({ spec }) => {
  // The film types the command with a two-character prompt ("$ "): the prompt is dimmed, the command is the evidence.
  const prompt = spec.command.slice(0, 2);
  const rest = spec.command.slice(2);
  return (
    <div
      style={{
        boxSizing: "border-box",
        borderRadius: 14,
        background: theme.sheet,
        border: `1.5px solid ${alpha(theme.bad, 0.4)}`,
        boxShadow: theme.panelShadow,
        padding: "14px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 24, color: theme.ink3, letterSpacing: "0.04em" }}>{spec.agent}</span>
        <span style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 30, color: theme.ink2 }}>{spec.task}</span>
      </div>
      <div style={{ boxSizing: "border-box", borderRadius: 8, background: theme.termBg, padding: "9px 16px", fontFamily: MONO, fontSize: 26, lineHeight: "34px", color: theme.termFg, overflowWrap: "anywhere" }}>
        <span style={{ color: theme.termDim }}>{prompt}</span>
        {rest}
      </div>
      <div
        style={{
          alignSelf: "flex-start",
          boxSizing: "border-box",
          padding: "3px 16px",
          borderRadius: 8,
          border: `1.5px solid ${theme.bad}`,
          background: `${theme.hatchBad}, ${theme.badWash}`,
          fontFamily: MONO,
          fontSize: 26,
          lineHeight: "34px",
          color: theme.bad,
          whiteSpace: "nowrap",
        }}
      >
        {spec.verdict}
      </div>
    </div>
  );
};

export const SixVerdicts: React.FC<SixVerdictsProps> = ({ screens, width, columns = 2, gap = 24 }) => (
  <div style={{ width, display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
    {screens.map((s) => (
      <Screen key={s.agent} spec={s} />
    ))}
  </div>
);
