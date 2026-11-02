// MiniLocker film: the Workspace transcript, left column under the task form (patch 06). Ported from StepStream / Step / Entry
// in frontend/src/components.tsx: a vertical rail with one entry per step: "task started" divider, the agent's words, each tool
// call as a listing, the (closed) result disclosure, notable ledger lines (describe()), and the final task card.
// Pure and props-driven. Which events show is decided here exactly as the app does (STEP_TYPES); WHEN each one appears is the
// scene's: `progress[i]` is the rise (0..1) of the i-th visible step, from riseProgress(frame, startFrame).
//
// Scrolling: the app scrolls the list to the newest entry. The body is bottom-anchored (justify-content: flex-end, clipped), so
// the newest step always rests at the bottom with no measuring. `scrollLag` (px, <= 0 pushes content down) lets a scene ease it.
import React from "react";
import { theme, alpha } from "../config/theme";
import { ws } from "../config/copy";
import type { LedgerEvent } from "../data/types";
import { describe, toolLine } from "../lib/derive";
import { riseStyle } from "../lib/rise";
import { DOT, LISTING_STYLE, Md, NOTE, PaneHead } from "./chrome";
import { BAR, Chip, EDGE, INK, Label, WASH, rem, sp } from "./primitives";

const STEP_TYPES = new Set([
  "task.start", "llm.response", "tool.call", "tool.result", "policy.decision", "approval.requested", "approval.granted", "approval.denied", "task.end",
]);

/** The events the transcript lists (the app's `steps`), in order. progress[i] belongs to stepEvents(events)[i]. */
export function stepEvents(events: readonly LedgerEvent[]): LedgerEvent[] {
  return events.filter((e) => STEP_TYPES.has(e.type));
}

export interface StepStreamProps {
  /** Every ledger event so far (the component picks the ones the transcript shows). */
  events: readonly LedgerEvent[];
  /** Rise progress per visible step (index into stepEvents(events)); missing = 1 (settled). */
  progress?: readonly number[];
  /** Extra px the content sits lower than its resting place (<= 0 values move it up). Default 0. */
  scrollLag?: number;
  style?: React.CSSProperties;
}

const Rule: React.FC = () => <span style={{ height: 1, flex: "1 1 0%", background: theme.rule }} />;

/** `<li class="rise relative pl-5">` with the dot on the rail. */
const Entry: React.FC<{ dot?: string; p: number; children?: React.ReactNode }> = ({ dot = theme.rule2, p, children }) => (
  <li style={{ position: "relative", paddingLeft: sp(5), listStyle: "none", ...riseStyle(p) }}>
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: 1,
        top: rem(0.55),
        width: 9,
        height: 9,
        boxSizing: "border-box",
        borderRadius: 9999,
        border: `2px solid ${theme.paper}`,
        background: dot,
      }}
    />
    {children}
  </li>
);

interface StepProps {
  e: LedgerEvent;
  calls: number;
  lastText: string;
  p: number;
}

const Step: React.FC<StepProps> = ({ e, calls, lastText, p: prog }) => {
  const p = e.payload;
  if (e.type === "task.start")
    return (
      <li style={{ display: "flex", alignItems: "center", gap: sp(2), fontSize: rem(0.84), fontStyle: "italic", color: theme.ink3, listStyle: "none", ...riseStyle(prog) }}>
        <Rule />
        {ws.steps.taskStarted} <Chip>{String(p.profile)}</Chip>
        <Rule />
      </li>
    );
  if (e.type === "llm.response")
    return p.text ? (
      <Entry dot={theme.accent} p={prog}>
        <div
          style={{
            boxSizing: "border-box",
            borderRadius: 6,
            border: `1px solid ${theme.rule}`,
            backgroundColor: alpha(theme.sheet, 0.8),
            padding: `${sp(2)}px ${sp(3)}px`,
            lineHeight: 1.625,
            color: theme.ink,
          }}
        >
          <Label style={{ display: "block", fontSize: rem(0.78), color: theme.accentInk }}>{ws.steps.agent}</Label>
          <Md>{String(p.text)}</Md>
        </div>
      </Entry>
    ) : null;
  if (e.type === "tool.call")
    return (
      <Entry dot={BAR.ok} p={prog}>
        <div style={{ marginBottom: sp(1), display: "flex", alignItems: "center", gap: sp(1.5), color: theme.ink2 }}>
          <Label style={{ fontSize: rem(0.86) }}>{String(p.tool)}</Label>
        </div>
        <code style={{ ...LISTING_STYLE, display: "block", padding: `${sp(1.5)}px ${sp(2.5)}px`, overflowWrap: "anywhere" }}>
          {p.tool === "run_shell" && <span style={{ color: theme.ok }}>$ </span>}
          {toolLine(p)}
        </code>
      </Entry>
    );
  if (e.type === "tool.result")
    return (
      <li style={{ position: "relative", paddingLeft: sp(5), fontSize: rem(0.85), color: theme.ink2, listStyle: "none", ...riseStyle(prog) }}>
        {/* a closed <details>: the disclosure triangle and the italic summary */}
        <span style={{ fontStyle: "italic" }}>
          <span aria-hidden style={{ display: "inline-block", width: "1.1em", fontSize: "0.7em", verticalAlign: "0.1em" }}>▶</span>
          {ws.steps.result}
        </span>
      </li>
    );
  if (e.type === "task.end") {
    // finished but nothing ran (e.g. the model refused): say so instead of a green success card
    const quiet = p.status === "finished" && calls === 0;
    const tone = quiet ? "mute" : p.status === "finished" ? "ok" : "warn";
    const summary = String(p.summary ?? "");
    const repeated = summary.slice(0, 200) === lastText.slice(0, 200); // the answer was already shown above
    return (
      <li
        style={{
          boxSizing: "border-box",
          borderRadius: 7,
          border: `1px solid ${EDGE[tone]}`,
          backgroundColor: WASH[tone],
          padding: sp(3.5),
          listStyle: "none",
          ...riseStyle(prog),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: sp(2) }}>
          <b style={{ fontSize: rem(1.1), color: quiet ? theme.ink : INK[tone] }}>{quiet ? ws.steps.answered : `${ws.steps.taskWord} ${p.status}`}</b>
          <span style={{ fontSize: rem(0.85), fontStyle: "italic", color: theme.ink2 }}>
            {String(p.steps)} {p.steps === 1 ? ws.steps.stepOne : ws.steps.stepMany}
          </span>
          <span aria-hidden style={{ marginLeft: "auto", fontSize: rem(1.1), color: quiet ? theme.ink3 : INK[tone] }}>
            {quiet ? "·" : p.status === "finished" ? "✓" : "!"}
          </span>
        </div>
        {summary && !repeated && (
          <div style={{ marginTop: sp(1.5), color: theme.ink }}>
            <Md>{summary}</Md>
          </div>
        )}
      </li>
    );
  }
  const d = describe(e);
  return d ? (
    <Entry dot={DOT[d.tone]} p={prog}>
      <div style={{ fontSize: rem(0.88), lineHeight: 1.375, color: NOTE[d.tone] }}>{d.text}</div>
    </Entry>
  ) : null;
};

export const StepStream: React.FC<StepStreamProps> = ({ events, progress, scrollLag = 0, style }) => {
  const steps = stepEvents(events);
  const calls = events.filter((e) => e.type === "tool.call").length;
  const lastText = String([...events].reverse().find((e) => e.type === "llm.response" && e.payload.text)?.payload.text ?? "");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0%", minHeight: 0, ...style }}>
      <PaneHead
        title={ws.steps.title}
        right={
          steps.length > 0 && (
            <span style={{ fontSize: rem(0.82), fontStyle: "italic", color: theme.ink3 }}>
              {calls} {calls === 1 ? ws.steps.toolCallOne : ws.steps.toolCallMany}
            </span>
          )
        }
      />
      <div style={{ boxSizing: "border-box", flex: "1 1 0%", minHeight: 0, overflow: "hidden", padding: `${sp(3)}px ${sp(4)}px` }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", transform: scrollLag ? `translateY(${(-scrollLag).toFixed(2)}px)` : undefined }}>
          {steps.length === 0 && (
            <div
              style={{
                boxSizing: "border-box",
                borderRadius: 6,
                border: `1px dashed ${theme.rule}`,
                padding: sp(3.5),
                fontSize: rem(0.92),
                lineHeight: 1.625,
                color: theme.ink3,
                alignSelf: "stretch",
                marginBottom: "auto",
              }}
            >
              <span style={{ fontStyle: "italic" }}>{ws.steps.emptyLead}</span>
              {ws.steps.emptyTail}
            </div>
          )}
          <ol style={{ position: "relative", flex: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: sp(3.5) }}>
            <span aria-hidden style={{ position: "absolute", top: sp(1), bottom: sp(1), left: 5, width: 1, background: theme.rule }} />
            {steps.map((e, i) => (
              <Step key={e.id} e={e} calls={calls} lastText={lastText} p={progress?.[i] ?? 1} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
