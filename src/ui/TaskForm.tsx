// MiniLocker film: the Workspace "New task" form (patch 06), ported from TaskForm in frontend/src/components.tsx.
// Pure and props-driven: the select values, focus, hover, press, the typed text and the spinner angle all come in as props.
// Wording: src/config/copy.ts `ws.taskForm`. The scenario title and task text are EVIDENCE (selectScenarios), passed in.
//
// Layout (source): `space-y-3 border-b border-rule p-4`, in the 374 px left column.
//   header row (label + "Ctrl + Enter to run") / scenario select / textarea (4 rows) / quick-fill chips (only while the
//   task is empty and no scenario is chosen) / [profile Segmented + hold select] / italic help line / full-width primary
//   button / error box.
import React from "react";
import { alpha, theme } from "../config/theme";
import { ws } from "../config/copy";
import type { Profile } from "../data/types";
import { FieldSelect, fieldStyle } from "./chrome";
import { Btn, Kbd, Label, Segmented, Spin, rem, sp } from "./primitives";

export interface TaskFormScenario {
  title: string;
  /** The task text the select puts in the (read-only) textarea. */
  task: string;
}

export interface TaskFormProps {
  /** A chosen scenario, or null/undefined for "Your own task". */
  scenario?: TaskFormScenario | null;
  /** The select exists only when the backend offered scenarios. Default true. */
  hasScenarios?: boolean;
  /** Free text typed so far (ignored while a scenario is chosen). */
  text?: string;
  /** The textarea has focus: accent border, 2 px ring and the caret. */
  textFocused?: boolean;
  /** Caret visible right now (blink). Default true. */
  caretOn?: boolean;
  /** Rows the text is scrolled up (a textarea scrolls to its caret). Default 0. */
  textScrollRows?: number;
  selectFocused?: boolean;
  selectHover?: boolean;
  profile?: Profile;
  /** The profile option the cursor is over (Segmented `hover`). */
  profileHover?: Profile;
  /** Hold select value in seconds: 0, 60, 180 or 600. Default 0. */
  holdSeconds?: keyof typeof ws.taskForm.holds;
  holdFocused?: boolean;
  holdHover?: boolean;
  /** Index of the quick-fill chip the cursor is over. */
  chipHover?: number;
  /** The task is running: the button is disabled and shows the spinner. */
  running?: boolean;
  /** Spinner rotation in turns (spinProgress(frame)). */
  spin?: number;
  runHover?: boolean;
  runPressed?: boolean;
  /** An error line under the button. */
  error?: string | null;
  style?: React.CSSProperties;
}

const ROWS = 4;
const TEXT_PX = rem(0.95);
const LINE_PX = TEXT_PX * 1.625; // leading-relaxed

/** Height of the textarea box: 4 rows + py-2 + 1 px borders. */
export const TEXTAREA_H = ROWS * LINE_PX + 2 * sp(2) + 2;

export const TaskForm: React.FC<TaskFormProps> = ({
  scenario = null,
  hasScenarios = true,
  text = "",
  textFocused = false,
  caretOn = true,
  textScrollRows = 0,
  selectFocused = false,
  selectHover = false,
  profile = "strict",
  profileHover,
  holdSeconds = 0,
  holdFocused = false,
  holdHover = false,
  chipHover,
  running = false,
  spin = 0,
  runHover = false,
  runPressed = false,
  error = null,
  style,
}) => {
  const sc = scenario;
  const ready = !!(sc || text.trim());
  const shown = sc ? sc.task : text;
  const showChips = !sc && !text;

  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: sp(3),
        borderBottom: `1px solid ${theme.rule}`,
        padding: sp(4),
        flex: "none",
        ...style,
      }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Label style={{ fontSize: rem(0.92), color: theme.ink }}>{ws.taskForm.title}</Label>
        <span style={{ fontSize: rem(0.8), fontStyle: "italic", color: theme.ink3 }}>
          <Kbd>Ctrl</Kbd> + <Kbd>↵</Kbd> {ws.taskForm.runHintTail}
        </span>
      </div>

      {/* scenario select */}
      {hasScenarios && (
        <FieldSelect focused={selectFocused} hover={selectHover}>
          {sc ? sc.title : ws.taskForm.ownTask}
        </FieldSelect>
      )}

      {/* textarea */}
      <div
        style={{
          ...fieldStyle({ focused: textFocused }),
          height: TEXTAREA_H,
          overflow: "hidden",
          lineHeight: 1.625,
          fontStyle: sc ? "italic" : undefined,
          color: sc ? theme.ink2 : theme.ink,
        }}
      >
        {shown ? (
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", transform: `translateY(${-(textScrollRows * LINE_PX).toFixed(2)}px)` }}>
            {shown}
            {textFocused && !sc && <Caret on={caretOn} />}
          </div>
        ) : (
          <div style={{ position: "relative", color: theme.ink3 }}>
            {ws.taskForm.placeholder}
            {textFocused && <Caret on={caretOn} atStart />}
          </div>
        )}
      </div>

      {/* quick-fill chips */}
      {showChips && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: sp(1.5) }}>
          <span style={{ fontSize: rem(0.82), fontStyle: "italic", color: theme.ink3 }}>{ws.taskForm.try}</span>
          {ws.taskForm.examples.map((label, i) => {
            const hovered = chipHover === i;
            return (
              <span
                key={label}
                style={{
                  boxSizing: "border-box",
                  borderRadius: 9999,
                  border: `1px solid ${hovered ? theme.accent : theme.rule}`,
                  backgroundColor: theme.raised,
                  padding: `${sp(0.5)}px ${sp(2.5)}px`,
                  fontSize: rem(0.84),
                  color: hovered ? theme.ink : theme.ink2,
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* profile + hold */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: sp(2) }}>
        <Segmented value={profile} hover={profileHover} options={ws.taskForm.profileOptions} />
        <FieldSelect focused={holdFocused} hover={holdHover} style={{ width: "auto", paddingTop: sp(1), paddingBottom: sp(1), fontSize: rem(0.9) }}>
          {ws.taskForm.holds[holdSeconds]}
        </FieldSelect>
      </div>

      <p style={{ margin: 0, fontSize: rem(0.82), fontStyle: "italic", lineHeight: 1.375, color: theme.ink3 }}>{ws.taskForm.profileHelp[profile]}</p>

      {/* primary button */}
      <Btn
        variant="primary"
        hover={runHover}
        pressed={runPressed}
        disabled={running || !ready}
        style={{ width: "100%", padding: `${sp(2)}px ${sp(4)}px`, fontSize: rem(1.04) }}
      >
        {running ? (
          <>
            <Spin progress={spin} /> {ws.taskForm.running}
          </>
        ) : (
          <>
            {ws.taskForm.run} <span aria-hidden>▸</span>
          </>
        )}
      </Btn>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            borderRadius: 5,
            border: `1px solid ${alpha(theme.bad, 0.5)}`,
            backgroundColor: theme.badWash,
            padding: `${sp(1.5)}px ${sp(2.5)}px`,
            fontSize: rem(0.88),
            color: theme.bad,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

/** The textarea caret: zero width, so blinking never moves text (the browser's caret is ink-colored, 1 px). */
const Caret: React.FC<{ on: boolean; atStart?: boolean }> = ({ on, atStart = false }) => (
  <span aria-hidden style={{ position: atStart ? "absolute" : "relative", left: atStart ? 0 : undefined, top: atStart ? 0 : undefined, display: "inline-block", width: 0, height: "1em" }}>
    <span style={{ position: "absolute", left: 0, top: "0.1em", width: 1.5, height: "1.2em", background: theme.ink, opacity: on ? 1 : 0 }} />
  </span>
);
