// MiniLocker film: the Report screen (patch 07), ported from frontend/src/Report.tsx. Top to bottom:
//   task id row       "Task id [8 hex] Load"
//   article           the "Blast Radius Report" header (task id, the task as a display headline, the abstract), the outcome stamp,
//                     the KPI strip, the ledger seal, the buttons (Verify ledger now, Refresh, Export HTML, Export JSON)
//   dimension cards   Object.entries(report.dimensions) IN ORDER (never re-sorted), two columns, each with its Headline picture
//   footnote          report.note
//
// DUMB COMPONENT: props in, pixels out. Every number, word and hash on this screen is read from the Report (and the Verification)
// the caller passes, which come from evidence through src/data/select.ts. The static wording is src/config/copy.ts `rep`.
//
// NOT MEASURED. A dimension whose status is "not_measured" is drawn in the dotted style (a dotted border, a "not measured" chip and
// the backend's own italic note) and NEVER with a zero or an empty picture. A status the app does not know ("not_used", the browser
// dimension of a task that never opened a page) is drawn as the app draws it: a mute chip with the status words and no picture.
//
// MOTION is passed in by the scene:
//   reveal[i]    0..1 per dimension card (in Object.entries order): the card flips in (opacity, a tilt about its top edge, a short rise);
//                a card at 0 keeps its space, so the grid never reflows while it fills
//   headReveal   0..1 entrance of the article (default 1)
//   verify       { state: "idle" | "running" | "done", progress, result }: "running" draws the busy ring (progress 0..1 = how far through
//                its turns, 3 turns in all); "done" draws the result line under the seal (progress 0..1 = that line's entrance)
//   pressVerify / hoverVerify   the button is pressed down (1 px) / the cursor is over it
//   scrollY      px the whole page is scrolled up (the app scrolls; the film frames the part it wants)
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { rep, ws } from "../config/copy";
import type { Dimension, Report, Verification } from "../data/types";
import { clamp01, signature } from "../lib/ease";
import { shortHash } from "../lib/hash";
import { riseStyle } from "../lib/rise";
import { Mark } from "./Mark";
import { Seal, fieldStyle } from "./chrome";
import { BREAK_ALL, Disclosure, Stat, TABULAR } from "./page";
import { BAR, Btn, Card, Chip, DISPLAY, EDGE, INK, Label, Meter, SMCP, Spin, VAR, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- helpers (Report.tsx)

/** Keys of a dimension that are not measurements (HIDDEN in the source). */
const HIDDEN = new Set(["status", "note", "evidence"]);

const STATUS_TONE: Record<string, Tint> = { measured: "ok", in_progress: "info", not_measured: "mute" };
const MIB = 1024 * 1024;
const n = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);

/** The card's flip-in. At 1 it carries no transform (so a settled card has no stacking context). */
function flipStyle(p: number): React.CSSProperties {
  const v = clamp01(p);
  if (v >= 1) return {};
  const e = signature(v);
  return {
    opacity: clamp01(v / 0.35),
    transform: `perspective(1400px) rotateX(${((1 - e) * -62).toFixed(2)}deg) translateY(${((1 - e) * 16).toFixed(2)}px)`,
    transformOrigin: "50% 0%",
  };
}

// ---------------------------------------------------------------------------------------------- Headline pictures

/** A proportional bar made of labelled parts. Parts with no value are dropped, and no parts at all says so. */
const Parts: React.FC<{ parts: { v: number; tone: Tint; label: string }[]; empty: string }> = ({ parts, empty }) => {
  const used = parts.filter((p) => p.v > 0);
  const total = used.reduce((s, p) => s + p.v, 0);
  if (total === 0) return <div style={{ fontSize: rem(0.9), fontStyle: "italic", color: theme.ink3 }}>{empty}</div>;
  return (
    <div>
      <div style={{ display: "flex", height: sp(2.5), gap: 2, overflow: "hidden", borderRadius: 9999 }}>
        {used.map((p) => (
          <span key={p.label} style={{ background: BAR[p.tone], flexGrow: p.v, flexBasis: 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: sp(3.5), rowGap: sp(0.5), marginTop: sp(1.5), fontSize: rem(0.84), color: theme.ink2 }}>
        {used.map((p) => (
          <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: sp(1.5) }}>
            <i style={{ width: sp(2), height: sp(2), borderRadius: 9999, background: BAR[p.tone] }} />
            <b style={{ ...TABULAR, color: theme.ink }}>{p.v}</b> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** The one picture that summarises a dimension, drawn from the same numbers listed under it. Ported from Report.tsx `Headline`. */
export const Headline: React.FC<{ name: string; d: Dimension }> = ({ name, d }) => {
  const h = rep.headline;
  if (d.status === "not_measured") return null;
  if (name === "network")
    return (
      <Parts
        empty={h.noRequests}
        parts={[
          { v: n(d.allowed), tone: "ok", label: h.allowed },
          { v: n(d.blocked), tone: "bad", label: h.blocked },
        ]}
      />
    );
  if (name === "policy") {
    const a = (d.by_action ?? {}) as Record<string, number>;
    return (
      <Parts
        empty={h.noCommands}
        parts={[
          { v: n(a.allow), tone: "ok", label: h.allowed },
          { v: n(a.allow_in_sandbox), tone: "info", label: h.ranInSandbox },
          { v: n(a.require_approval), tone: "warn", label: h.neededApproval },
          { v: n(a.deny), tone: "bad", label: h.denied },
        ]}
      />
    );
  }
  if (name === "compute") {
    const mem = n(d.memory_limit_bytes) ? n(d.peak_memory_bytes) / n(d.memory_limit_bytes) : 0;
    const pid = n(d.pids_limit) ? n(d.peak_pids) / n(d.pids_limit) : 0;
    const line: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: sp(1), fontSize: rem(0.86), color: theme.ink2 };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: sp(2.5) }}>
        <div>
          <div style={line}>
            <span>{h.peakMemory}</span>
            <span style={{ ...TABULAR, color: theme.ink }}>
              <b>{Math.round(n(d.peak_memory_bytes) / MIB)}</b> {h.of} {Math.round(n(d.memory_limit_bytes) / MIB)} {h.mib}
            </span>
          </div>
          <Meter value={mem} tone={mem > 0.8 ? "warn" : "ok"} />
        </div>
        <div>
          <div style={line}>
            <span>{h.peakProcesses}</span>
            <span style={{ ...TABULAR, color: theme.ink }}>
              <b>{n(d.peak_pids)}</b> {h.of} {n(d.pids_limit)}
            </span>
          </div>
          <Meter value={pid} tone={pid > 0.8 ? "warn" : "ok"} />
        </div>
      </div>
    );
  }
  if (name === "time")
    return (
      <Parts
        empty={h.noTiming}
        parts={[
          { v: n(d.active_s), tone: "info", label: h.working },
          { v: n(d.approval_wait_s), tone: "warn", label: h.waiting },
        ]}
      />
    );
  if (name === "secrets") {
    const planted = n(d.decoys_planted);
    const read = (d.decoys_read ?? []).length;
    const tripped = (d.decoys_tripped ?? []).length;
    const dots = Array.from({ length: Math.max(planted, read) }, (_, i): Tint => (i < tripped ? "bad" : i < read ? "warn" : "ok"));
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: sp(1.5) }}>
          {dots.map((t, i) => (
            <span
              key={i}
              style={{
                boxSizing: "border-box",
                width: sp(3.5),
                height: sp(3.5),
                borderRadius: 9999,
                ...(t === "ok"
                  ? { border: `1px solid ${alpha(theme.ok, 0.6)}` }
                  : { border: "1px solid transparent", background: BAR[t], boxShadow: `0 0 8px ${VAR[t]}` }),
              }}
            />
          ))}
          {dots.length === 0 && <span style={{ fontSize: rem(0.9), fontStyle: "italic", color: theme.ink3 }}>{h.noDecoys}</span>}
        </div>
        <div style={{ marginTop: sp(1.5), fontSize: rem(0.84), color: theme.ink2 }}>
          {dots.length > 0 && (
            <>
              <b style={{ color: theme.ink }}>{planted}</b> {h.decoysPlanted} · <b style={{ color: theme.warn }}>{read}</b> {h.read} ·{" "}
              <b style={{ color: theme.bad }}>{tripped}</b> {h.used} ·{" "}
            </>
          )}
          <b style={{ color: d.real_secrets_in_sandbox ? theme.bad : theme.ok }}>{d.real_secrets_in_sandbox ? h.realFound : h.noReal}</b>
        </div>
      </div>
    );
  }
  if (name === "filesystem") {
    const w = d.workspace as { added_count?: number; modified_count?: number; deleted_count?: number } | null;
    const binds = (d.host_binds ?? []).length;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: sp(2), fontSize: rem(0.9) }}>
        <Chip tone={binds ? "bad" : "ok"} dot>
          {binds ? `${binds} ${h.hostPathsOne}` : h.noHostPaths}
        </Chip>
        <Chip>
          {n(d.rootfs_changes)} {h.systemFilesChanged}
        </Chip>
        {w && (
          <span style={{ fontFamily: fonts.mono, fontSize: rem(0.88) }}>
            <span style={{ color: theme.ok }}>+{n(w.added_count)}</span> <span style={{ color: theme.warn }}>~{n(w.modified_count)}</span>{" "}
            <span style={{ color: theme.bad }}>−{n(w.deleted_count)}</span> <span style={{ fontFamily: fonts.serif, color: theme.ink3 }}>{h.inWorkspace}</span>
          </span>
        )}
      </div>
    );
  }
  if (name === "persistence")
    return (
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: sp(5), rowGap: sp(1), fontSize: rem(0.9), color: theme.ink2 }}>
        <span>
          <b style={{ ...TABULAR, color: theme.ink }}>{n(d.snapshots_taken)}</b> {h.snapshots}
        </span>
        <span>
          <b style={{ ...TABULAR, color: theme.ink }}>{n(d.rewinds)}</b> {h.rewinds}
        </span>
        <span style={{ color: d.final_sandbox_destroyed ? theme.ok : theme.warn }}>{d.final_sandbox_destroyed ? h.destroyed : h.notConfirmed}</span>
      </div>
    );
  return null;
};

// ---------------------------------------------------------------------------------------------- one dimension card

export interface DimensionCardProps {
  /** The section number: 1-based position in report.dimensions. */
  no: number;
  /** The dimension key (network, policy, ...). */
  name: string;
  d: Dimension;
  /** 0..1 flip-in. Default 1. */
  reveal?: number;
  style?: React.CSSProperties;
}

export const DimensionCard: React.FC<DimensionCardProps> = ({ no, name, d, reveal = 1, style }) => {
  const tone = STATUS_TONE[d.status] ?? "mute";
  const notMeasured = d.status === "not_measured";
  const rows = Object.entries(d).filter(([k]) => !HIDDEN.has(k));
  return (
    <Card
      style={{
        padding: sp(4),
        // the dotted style: "not measured" is drawn as a dotted frame, like the dial's dotted arc
        ...(notMeasured ? { borderStyle: "dotted", borderColor: alpha(theme.ink3, 0.7) } : null),
        ...flipStyle(reveal),
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: sp(2.5) }}>
        <span style={{ fontStyle: "italic", color: theme.accentInk }}>§{no}</span>
        <div style={{ fontSize: rem(1.15), fontWeight: 700, textTransform: "capitalize", color: theme.ink }}>{name.replace(/_/g, " ")}</div>
        <Chip tone={tone} dot={d.status === "measured"} style={{ marginLeft: "auto" }}>
          {d.status.replace("_", " ")}
        </Chip>
      </div>
      <div style={{ marginTop: sp(3) }}>
        {notMeasured ? (
          <div style={{ fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>{d.note ?? rep.card.noClaim}</div>
        ) : (
          <Headline name={name} d={d} />
        )}
      </div>
      {!notMeasured && rows.length > 0 && (
        <Disclosure
          summary={`${rep.card.allMeasurements[0]} ${rows.length} ${rep.card.allMeasurements[1]}`}
          style={{ marginTop: sp(3), borderTop: `1px solid ${theme.rule}`, paddingTop: sp(2.5), fontSize: rem(0.9), color: theme.ink2 }}
        />
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------------------------- the screen

export interface ReportVerify {
  state: "idle" | "running" | "done";
  /** running: 0..1 through the busy ring's turns. done: 0..1 entrance of the result line. */
  progress: number;
  /** The server's re-verification (required to draw the "done" line). */
  result?: Verification | null;
}

export interface ReportScreenProps {
  report: Report;
  /** Per dimension card, in Object.entries(report.dimensions) order. A missing entry counts as 1. */
  reveal?: readonly number[];
  /** Entrance of the article (header, stamp, KPIs, seal, buttons). Default 1. */
  headReveal?: number;
  verify?: ReportVerify;
  /** "Verify ledger now" is pressed down / the cursor is over it. */
  pressVerify?: boolean;
  hoverVerify?: boolean;
  scrollY?: number;
  style?: React.CSSProperties;
}

/** Turns of the busy ring while verifying. */
const VERIFY_TURNS = 3;

type Kpi = { label: string; value: React.ReactNode; sub: string; tone: Tint };

/** The strip under the abstract: only dimensions that are measured contribute (Report.tsx `kpis`). */
function kpisOf(report: Report): Kpi[] {
  const k = rep.kpi;
  const dims = report.dimensions ?? {};
  const net = dims.network;
  const pol = dims.policy;
  const sec = dims.secrets;
  const cpu = dims.compute;
  const tim = dims.time;
  const out: (Kpi | null)[] = [
    net && net.status !== "not_measured"
      ? { label: k.requestsBlocked, value: n(net.blocked), sub: `${rep.headline.of} ${n(net.attempts)} ${k.ofAttempts}`, tone: n(net.blocked) ? "bad" : "ok" }
      : null,
    pol && pol.status !== "not_measured"
      ? {
          label: k.commandsDenied,
          value: n(pol.by_action?.deny),
          sub: `${rep.headline.of} ${n(pol.decisions)} ${k.checked} · ${n(pol.approvals_requested)} ${k.sentToHuman}`,
          tone: n(pol.by_action?.deny) ? "bad" : "ok",
        }
      : null,
    sec && sec.status !== "not_measured"
      ? {
          label: k.decoysUsed,
          value: (sec.decoys_tripped ?? []).length,
          sub: `${n(sec.decoys_planted)} ${k.planted} · ${n(sec.exfiltration_blocked)} ${k.exfiltrationBlocked}`,
          tone: (sec.decoys_tripped ?? []).length ? "warn" : "ok",
        }
      : null,
    cpu && cpu.status !== "not_measured"
      ? {
          label: k.peakMemory,
          value: `${Math.round(n(cpu.memory_peak_pct))}%`,
          sub: `${Math.round(n(cpu.peak_memory_bytes) / MIB)} ${rep.headline.of} ${Math.round(n(cpu.memory_limit_bytes) / MIB)} ${rep.headline.mib}`,
          tone: n(cpu.memory_peak_pct) > 80 ? "warn" : "ok",
        }
      : null,
    tim && tim.status !== "not_measured" && tim.wall_clock_s != null
      ? { label: k.wallClock, value: `${Math.round(n(tim.wall_clock_s))}s`, sub: `${Math.round(n(tim.active_s))}s ${k.working}`, tone: "mute" }
      : null,
  ];
  return out.filter((x): x is Kpi => x !== null);
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  report,
  reveal,
  headReveal = 1,
  verify = { state: "idle", progress: 0 },
  pressVerify = false,
  hoverVerify = false,
  scrollY = 0,
  style,
}) => {
  const busy = verify.state === "running";
  const quiet = report.complete && report.outcome === "finished" && report.tool_calls === 0;
  const outcomeTone: Tint = quiet ? "mute" : report.outcome === "finished" ? "ok" : report.complete ? "warn" : "info";
  const kpis = kpisOf(report);
  const ver = verify.state === "done" ? verify.result ?? null : null;
  const sealState = report.ledger.verified ? "ok" : "bad";

  return (
    <div style={{ display: "flex", flex: "1 1 0%", flexDirection: "column", minHeight: 0, overflow: "hidden", ...style }}>
      <div
        style={{
          boxSizing: "border-box",
          padding: `${sp(7)}px ${sp(6)}px`,
          transform: scrollY ? `translateY(${-scrollY}px)` : undefined,
        }}
      >
        <div style={{ maxWidth: rem(64), marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", gap: sp(5) }}>
          {/* task id row */}
          <div style={{ display: "flex", alignItems: "center", gap: sp(2.5) }}>
            <Label>{rep.taskId}</Label>
            <div style={{ ...fieldStyle(), width: rem(11), fontFamily: fonts.mono, fontSize: rem(0.88) }}>{report.task_id}</div>
            <Btn disabled={busy}>{rep.load}</Btn>
          </div>

          {/* the article */}
          <Card style={{ position: "relative", overflow: "hidden", padding: sp(8), ...riseStyle(headReveal) }}>
            <div style={{ position: "absolute", right: -sp(20), top: -sp(24), opacity: 0.045, pointerEvents: "none" }}>
              <Mark size={340} />
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: sp(8) }}>
              <div style={{ minWidth: 0, flex: "1 1 0%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: sp(2), color: theme.ink3 }}>
                  <Label style={{ fontSize: rem(0.95), color: theme.accentInk }}>{rep.eyebrow}</Label>
                  <span aria-hidden>·</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: rem(0.85) }}>{report.task_id}</span>
                </div>
                <div style={{ ...DISPLAY, marginTop: sp(2.5), fontSize: rem(2), lineHeight: 1.14, color: theme.ink }}>{report.task}</div>
                {report.summary && (
                  <div style={{ marginTop: sp(4), borderLeft: `2px solid ${alpha(theme.accent, 0.7)}`, paddingLeft: sp(4), lineHeight: 1.625, color: theme.ink2 }}>
                    <b style={{ marginRight: sp(1.5), fontWeight: 700, fontStyle: "normal", color: theme.ink }}>{rep.abstract}</b>
                    <span style={{ fontStyle: "italic" }}>{report.summary}</span>
                  </div>
                )}
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  flex: "none",
                  transform: "rotate(-3deg)",
                  borderRadius: 6,
                  border: `3px double ${outcomeTone === "mute" ? theme.rule2 : EDGE[outcomeTone]}`,
                  padding: `${sp(3)}px ${sp(5)}px`,
                  textAlign: "center",
                  boxShadow: outcomeTone === "mute" ? undefined : `0 0 30px -10px ${VAR[outcomeTone]}`,
                }}
              >
                <div style={{ ...DISPLAY, ...SMCP, fontSize: rem(1.7), color: INK[outcomeTone] }}>
                  {!report.complete ? rep.running : quiet ? rep.answered : report.outcome}
                </div>
                {quiet && <div style={{ ...SMCP, fontSize: rem(0.8), color: theme.ink2 }}>{rep.noCommands}</div>}
                <div style={{ ...TABULAR, marginTop: sp(0.5), fontSize: rem(0.85), color: theme.ink2 }}>
                  {report.steps} {rep.steps} · {report.tool_calls} {rep.toolCalls}
                </div>
              </div>
            </div>

            {kpis.length > 0 && (
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  columnGap: sp(6),
                  marginTop: sp(7),
                  borderTop: `1px solid ${theme.rule}`,
                  borderBottom: `1px solid ${theme.rule}`,
                  padding: `${sp(4)}px 0`,
                  gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`,
                }}
              >
                {kpis.map((k, i) => (
                  <Stat
                    key={k.label}
                    label={k.label}
                    value={k.value}
                    sub={k.sub}
                    tone={k.tone}
                    style={i > 0 ? { borderLeft: `1px solid ${theme.rule}`, paddingLeft: sp(5) } : undefined}
                  />
                ))}
              </div>
            )}

            <div style={{ position: "relative", marginTop: sp(6) }}>
              <Seal
                state={sealState}
                title={report.ledger.verified ? ws.blast.sealOk : ws.blast.sealBad}
                ringText={report.ledger.verified ? ws.blast.ringOk : ws.blast.ringBad}
              >
                {report.ledger.detail}
                <div style={{ ...BREAK_ALL, marginTop: sp(1), fontFamily: fonts.mono, fontSize: rem(0.78), color: theme.ink3 }}>
                  {rep.head} {report.ledger.head_hash}
                </div>
                {ver && (
                  <div style={{ marginTop: sp(1.5), fontWeight: 500, color: ver.verified ? theme.ok : theme.bad, ...riseStyle(verify.progress) }}>
                    {rep.reverified} {ver.verified ? rep.intact : rep.tampered} —{" "}
                    <span style={{ fontWeight: 400, color: theme.ink2 }}>
                      {ver.detail}
                      {ver.head_hash ? (
                        <>
                          {" "}
                          · {rep.head} <span style={{ fontFamily: fonts.mono, fontSize: "0.9em" }}>{shortHash(ver.head_hash, 8)}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                )}
              </Seal>
            </div>
            <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: sp(2), marginTop: sp(4) }}>
              <Btn variant="primary" pressed={pressVerify} hover={hoverVerify} disabled={busy}>
                {busy ? <Spin progress={verify.progress * VERIFY_TURNS} /> : <span aria-hidden>{rep.verifyMark}</span>} {rep.verify}
              </Btn>
              <Btn disabled={busy}>{rep.refresh}</Btn>
              <Btn style={{ marginLeft: "auto" }}>{rep.exportHtml}</Btn>
              <Btn>{rep.exportJson}</Btn>
            </div>
          </Card>

          {/* the nine dimension cards, in the report's own order */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: sp(4) }}>
            {Object.entries(report.dimensions).map(([k, d], i) => (
              <DimensionCard key={k} no={i + 1} name={k} d={d} reveal={reveal?.[i] ?? 1} />
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${theme.rule}`, paddingTop: sp(2.5), fontSize: rem(0.84), fontStyle: "italic", lineHeight: 1.375, color: theme.ink3 }}>
            <span style={{ marginRight: sp(1), fontStyle: "normal" }}>†</span>
            {report.note}
          </div>
        </div>
      </div>
    </div>
  );
};
