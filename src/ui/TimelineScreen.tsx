// MiniLocker film: the Timeline screen (patch 07), ported from frontend/src/Timeline.tsx. The film body does not cut to it (the
// rewind is told on the Attack Lab and the Workspace), but it is cheap, so it is built for real instead of stubbed.
//
// DUMB COMPONENT: the caller passes the nodes computed by `timeline(events)` (src/lib/derive.ts, the product's function, unchanged)
// and the task id from the evidence. Static wording: src/config/copy.ts `tl`. Motion: reveal[i] per node (rise), scrollY.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { tl } from "../config/copy";
import type { TimelineNode } from "../lib/derive";
import { riseStyle } from "../lib/rise";
import { Hash } from "./chrome";
import { BREAK_ALL, PageHead, TABULAR } from "./page";
import { Btn, Chip, SMCP, rem, sp } from "./primitives";

export interface TimelineScreenProps {
  taskId: string;
  nodes: readonly TimelineNode[];
  /** The agent has stopped and its sandbox is held open (derive.timeline().holding). */
  holding?: boolean;
  /** A rewind was requested and has not landed yet. */
  rewindPending?: boolean;
  /** The task is still running (the "Rewind here" buttons exist only then). Default false: the task has ended. */
  running?: boolean;
  /** Per node, 0..1 rise. A missing entry counts as 1. */
  reveal?: readonly number[];
  scrollY?: number;
  style?: React.CSSProperties;
}

const CHIP: Record<TimelineNode["kind"], { border: string; color: string }> = {
  start: { border: theme.rule2, color: theme.ink2 },
  tool: { border: alpha(theme.accent, 0.5), color: theme.accentInk },
  rewind: { border: alpha(theme.info, 0.55), color: theme.info },
};

const DOT: Record<TimelineNode["kind"], React.CSSProperties> = {
  start: { borderColor: theme.ink3, background: theme.paper },
  tool: { borderColor: theme.accent, background: theme.accent, boxShadow: `0 0 12px ${theme.accent}` },
  rewind: { borderColor: theme.info, background: theme.infoWash, boxShadow: `0 0 12px ${theme.info}` },
};

const NodeRow: React.FC<{ n: TimelineNode; p: number; canRewind: boolean }> = ({ n, p, canRewind }) => (
  <div style={{ position: "relative", paddingBottom: sp(5), paddingLeft: sp(9), ...riseStyle(p) }}>
    <span
      aria-hidden
      style={{
        boxSizing: "border-box",
        position: "absolute",
        left: 0,
        top: rem(1.15),
        width: 18,
        height: 18,
        borderRadius: 9999,
        border: "2px solid",
        ...(n.undone ? { borderColor: alpha(theme.ink3, 0.5), background: theme.paper } : DOT[n.kind]),
      }}
    />
    <div
      style={{
        boxSizing: "border-box",
        borderRadius: 7,
        border: `1px solid ${n.kind === "rewind" ? alpha(theme.info, 0.5) : theme.rule}`,
        background: `linear-gradient(180deg, ${theme.raised}, ${theme.sheet} 42%)`,
        boxShadow: theme.panelShadow,
        padding: sp(3.5),
        opacity: n.undone ? 0.45 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: sp(3) }}>
        <div style={{ minWidth: 0, flex: "1 1 0%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: sp(2) }}>
            <span
              style={{
                ...SMCP,
                borderRadius: 4,
                border: `1px solid ${CHIP[n.kind].border}`,
                padding: `1px ${sp(1.5)}px`,
                fontSize: rem(0.82),
                color: CHIP[n.kind].color,
              }}
            >
              {n.label}
            </span>
            {n.undone && <Chip>{tl.undone}</Chip>}
            {n.snapshot !== null && !n.undone && (
              <span style={{ ...TABULAR, fontSize: rem(0.85), fontStyle: "italic", color: theme.ink2 }}>
                {tl.snapshot} {n.snapshot}
                {n.files !== null ? ` · ${n.files} ${n.files === 1 ? tl.fileOne : tl.fileMany}` : ""}
              </span>
            )}
          </div>
          <code
            style={{
              ...BREAK_ALL,
              display: "block",
              marginTop: sp(1.5),
              fontFamily: fonts.mono,
              fontSize: rem(0.84),
              lineHeight: 1.625,
              color: n.kind === "rewind" ? theme.info : theme.ink,
              textDecoration: n.undone ? "line-through" : undefined,
            }}
          >
            {n.detail}
          </code>
          {n.sha && (
            <div style={{ marginTop: sp(1), fontSize: rem(0.74), color: theme.ink3 }}>
              {tl.sha} <Hash h={n.sha} />
            </div>
          )}
        </div>
        {n.snapshot !== null && n.active && canRewind && (
          <Btn variant="info" size="sm" style={{ flex: "none" }}>
            <span aria-hidden>{tl.rewindMark}</span> {tl.rewindHere}
          </Btn>
        )}
      </div>
    </div>
  </div>
);

export const TimelineScreen: React.FC<TimelineScreenProps> = ({ taskId, nodes, holding = false, rewindPending = false, running = false, reveal, scrollY = 0, style }) => {
  const rewinds = nodes.filter((x) => x.kind === "rewind");
  const snaps = nodes.filter((x) => x.snapshot !== null && !x.undone).length;
  const canRewind = running && !rewindPending;
  const note: React.CSSProperties = { marginBottom: sp(4), borderRadius: 6, border: "1px solid", padding: `${sp(2.5)}px ${sp(3.5)}px`, fontSize: rem(0.92), lineHeight: 1.375 };
  return (
    <div style={{ display: "flex", flex: "1 1 0%", flexDirection: "column", minHeight: 0, overflow: "hidden", ...style }}>
      <div style={{ boxSizing: "border-box", padding: `${sp(7)}px ${sp(6)}px`, transform: scrollY ? `translateY(${-scrollY}px)` : undefined }}>
        <div style={{ maxWidth: rem(48), marginLeft: "auto", marginRight: "auto" }}>
          <PageHead
            style={{ marginBottom: sp(6) }}
            eyebrow={tl.eyebrow}
            title={tl.title}
            sub={
              <>
                <span style={{ fontFamily: fonts.mono, fontStyle: "normal" }}>{taskId}</span> ·{" "}
                <span style={TABULAR}>
                  {snaps} {tl.snapshotsWord} · {rewinds.length} {rewinds.length === 1 ? tl.rewindOne : tl.rewindMany}
                </span>
              </>
            }
            right={holding ? <Btn variant="warn">{tl.release}</Btn> : undefined}
          />
          {holding && <div style={{ ...note, borderColor: alpha(theme.warn, 0.5), backgroundColor: theme.warnWash, color: theme.ink }}>{tl.holding}</div>}
          {rewindPending && <div style={{ ...note, borderColor: alpha(theme.info, 0.5), backgroundColor: theme.infoWash, color: theme.ink }}>{tl.rewindPending}</div>}
          {!running && <div style={{ marginBottom: sp(4), fontSize: rem(0.92), fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>{tl.ended}</div>}
          <div style={{ position: "relative", marginLeft: sp(2) }}>
            <span
              aria-hidden
              style={{ position: "absolute", bottom: sp(2), left: 8, top: sp(3), width: 1, background: `linear-gradient(180deg, ${theme.accent}, ${theme.rule})` }}
            />
            {nodes.map((x, i) => (
              <NodeRow key={x.key} n={x} p={reveal?.[i] ?? 1} canRewind={canRewind} />
            ))}
          </div>
          <div style={{ marginTop: sp(2), borderTop: `1px solid ${theme.rule}`, paddingTop: sp(2.5), fontSize: rem(0.84), fontStyle: "italic", lineHeight: 1.375, color: theme.ink3 }}>
            <span style={{ marginRight: sp(1), fontStyle: "normal" }}>†</span>
            {tl.footnote}
          </div>
        </div>
      </div>
    </div>
  );
};
