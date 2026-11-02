// MiniLocker film: the Workspace right column, the Blast panel (patch 06). Ported from BlastPanel / GaugeCard / RadiusDial wrapper /
// ChainStrip in frontend/src/components.tsx. Top to bottom: the containment dial card, the gauge grid (Network, Policy, Filesystem,
// Secrets, Compute, Time, then the wide Sandboxes card), the ledger seal, the hash-chain strip and the event log.
//
// EVIDENCE RULE: nothing here types a number. Every gauge value and subtitle is computed by gaugesOf() (src/lib/gauges.ts, the
// product's function, unchanged) from the ledger events passed in; the dial arcs and the verdict word are derived from those
// gauges exactly as the app does. The static wording is src/config/copy.ts `ws.blast`.
//
// Pure and props-driven (no frame reads). The scene supplies motion:
//   reveal[i]       0..1 per gauge, indexed like GAUGE_KEYS (net, pol, fs, sec, cpu, time, sbx): the card's entrance (fade + 14 px rise)
//                   and, for the first five, how much of that gauge's dial arc is drawn
//   flash/flashAmount  one card lit in its tone for a moment (a number just changed)
//   pulse           0..1 phase of the "measuring" ping dots (pulsePhase(frame), 30-frame cycle)
//   breathe         0..1 phase of the flagged arcs' breathing (dialPulsePhase(frame), 72-frame cycle)
//   scan            rotation in turns of the dial's sweep while measuring
//   progressOf(id)  rise of one event's chain block and event-log row (riseProgress of that event's frame)
//   scrollY         px the whole body is scrolled up (the app scrolls; the film frames the part it wants)
import React from "react";
import { alpha, theme } from "../config/theme";
import { ws } from "../config/copy";
import type { LedgerEvent } from "../data/types";
import { describe, groupLines } from "../lib/derive";
import { GAUGE_KEYS, gaugesOf, phaseOf, type G, type GaugeKey, type Phase } from "../lib/gauges";
import { riseStyle } from "../lib/rise";
import { DOT, Hash, NOTE, PaneHead, Seal } from "./chrome";
import { RadiusDial, type DialDim, type DialKey, type DialState, type DialTone } from "./RadiusDial";
import { BAR, Card, Chip, DISPLAY, INK, Label, Meter, Pulse, SectionHead, VAR, rem, sp, type Tint } from "./primitives";

export interface BlastReport {
  verified: boolean;
  detail: string;
  headHash: string | null;
}

export interface BlastPanelProps {
  events: readonly LedgerEvent[];
  running: boolean;
  /** The finished task's report (the seal and the chain head). null before the task completes. */
  report?: BlastReport | null;
  reveal?: readonly number[];
  flash?: GaugeKey;
  flashAmount?: number;
  pulse?: number;
  breathe?: number;
  scan?: number;
  progressOf?: (eventId: number) => number;
  scrollY?: number;
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------------------------- gauge card

export interface GaugeCardProps {
  g: G;
  wide?: boolean;
  /** Entrance 0..1 (reveal). Default 1. */
  p?: number;
  /** 0..1: lights the card's frame and a halo in its tone. */
  flash?: number;
  style?: React.CSSProperties;
}

/** One gauge. Source: `rise relative overflow-hidden p-3.5` Card; `col-span-2` for the wide Sandboxes card. */
export const GaugeCard: React.FC<GaugeCardProps> = ({ g, wide = false, p = 1, flash = 0, style }) => {
  const neutral = g.tone === "info";
  const tint: Tint = !g.measured || neutral ? "mute" : g.tone;
  const lit = Math.max(0, Math.min(1, flash));
  const litColor = VAR[tint === "mute" ? "info" : tint];
  return (
    <Card
      style={{
        position: "relative",
        overflow: "hidden",
        padding: sp(3.5),
        gridColumn: wide ? "span 2" : undefined,
        ...(lit > 0 ? { borderColor: alpha(litColor, 0.2 + 0.7 * lit), boxShadow: `${theme.panelShadow}, 0 0 ${(26 * lit).toFixed(1)}px -4px ${alpha(litColor, 0.55 * lit)}` } : null),
        ...riseStyle(p),
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Label>{g.label}</Label>
        {g.measured && !neutral ? (
          <span aria-hidden style={{ width: sp(2), height: sp(2), borderRadius: 9999, background: BAR[g.tone], boxShadow: `0 0 8px ${VAR[g.tone]}` }} />
        ) : (
          <span aria-hidden style={{ boxSizing: "border-box", width: sp(2), height: sp(2), borderRadius: 9999, border: `1px solid ${alpha(theme.ink3, 0.7)}` }} />
        )}
      </div>
      <div style={wide ? { marginTop: sp(0.5), display: "flex", alignItems: "baseline", gap: sp(3) } : undefined}>
        <div
          style={{
            ...DISPLAY,
            fontVariantNumeric: "tabular-nums",
            fontSize: wide ? rem(1.7) : rem(2.4),
            marginTop: wide ? undefined : sp(1),
            color: g.measured ? (neutral ? theme.ink : INK[g.tone]) : theme.ink3,
          }}
        >
          {g.value}
          {g.unit && <span style={{ marginLeft: sp(1), fontSize: rem(1), fontWeight: 400, fontStyle: "italic", letterSpacing: "normal", color: theme.ink2 }}>{g.unit}</span>}
        </div>
        <div style={{ fontSize: rem(0.82), fontStyle: "italic", lineHeight: 1.375, color: theme.ink2, marginTop: wide ? undefined : sp(1.5) }}>{g.sub}</div>
      </div>
      {g.meter !== undefined && <Meter value={g.meter} tone={g.meter > 0.8 ? "warn" : "ok"} style={{ marginTop: sp(2.5) }} />}
      <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: tint === "mute" ? "transparent" : BAR[tint], opacity: 0.7 }} />
    </Card>
  );
};

// ---------------------------------------------------------------------------------------------- dial card

const DIAL_KEYS_ORDER: readonly DialKey[] = ["net", "pol", "fs", "sec", "cpu"];
/** max-w-[16.5rem] of the source: the dial's rendered size. */
export const DIAL_SIZE = rem(16.5);

/** The app's verdict, from the five dial gauges. */
export function dialVerdict(gauges: readonly G[], phase: Phase): { word: string; tone: DialTone } {
  const dims = DIAL_KEYS_ORDER.map((k) => gauges.find((g) => g.key === k)).filter((g): g is G => !!g);
  const flagged = dims.filter((d) => d.measured && d.tone === "bad").length;
  const review = dims.filter((d) => d.measured && d.tone === "warn").length;
  const unmeasured = dims.some((d) => !d.measured);
  if (flagged) return { word: "flagged", tone: "bad" };
  if (review) return { word: "review", tone: "warn" };
  if (!unmeasured) return { word: "clean", tone: "ok" };
  if (phase === "measuring") return { word: "measuring", tone: "info" };
  if (phase === "partial") return { word: "partial", tone: "warn" };
  return { word: "no data", tone: "mute" };
}

function dialState(g: G): DialState {
  if (!g.measured) return "unmeasured";
  if (g.tone === "bad") return "flag";
  if (g.tone === "warn") return "review";
  return "clean";
}

/** Gauges -> the dial's arcs. `reveal` is indexed like GAUGE_KEYS. */
export function dialDims(gauges: readonly G[], reveal?: readonly number[]): DialDim[] {
  return DIAL_KEYS_ORDER.map((key) => {
    const g = gauges.find((x) => x.key === key)!;
    const i = GAUGE_KEYS.indexOf(key);
    return {
      key,
      label: g.label,
      state: dialState(g),
      draw: reveal?.[i] ?? 1,
      value: g.measured ? `${g.value}${g.unit ? ` ${g.unit}` : ""}` : undefined,
    };
  });
}

const LEGEND: { text: string; color: string; dash?: string; w: number }[] = [
  { text: ws.blast.legendClean, color: theme.ok, w: 3.4 },
  { text: ws.blast.legendFlagged, color: theme.bad, dash: "5 3", w: 3.4 },
  { text: ws.blast.legendUnmeasured, color: theme.ink3, dash: "0.1 4.2", w: 3 },
];

const DialCard: React.FC<{ gauges: G[]; phase: Phase; reveal?: readonly number[]; pulse: number; breathe: number; scan?: number; p?: number }> = ({ gauges, phase, reveal, pulse, breathe, scan, p = 1 }) => {
  const v = dialVerdict(gauges, phase);
  return (
    <Card style={{ overflow: "hidden", padding: `${sp(4)}px ${sp(4)}px ${sp(3)}px`, ...riseStyle(p) }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Label style={{ fontSize: rem(0.9), color: theme.ink }}>{ws.blast.dialTitle}</Label>
        <Chip tone={v.tone} dot style={{ marginLeft: "auto" }}>
          {phase === "measuring" && <Pulse tone="info" phase={pulse} />}
          {v.word}
        </Chip>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: sp(1) }}>
        <RadiusDial
          dims={dialDims(gauges, reveal)}
          verdictWord={v.word}
          verdictTone={v.tone}
          size={DIAL_SIZE}
          showLabels={1}
          glow={1}
          pulseFlagged
          pulsePhase={breathe}
          scan={phase === "measuring" ? scan ?? 0 : undefined}
        />
      </div>
      <div
        style={{
          marginTop: sp(1),
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          columnGap: sp(4),
          rowGap: sp(0.5),
          borderTop: `1px solid ${theme.rule}`,
          paddingTop: sp(2),
          fontSize: rem(0.8),
          fontStyle: "italic",
          color: theme.ink2,
        }}
      >
        {LEGEND.map((k) => (
          <span key={k.text} style={{ display: "inline-flex", alignItems: "center", gap: sp(1.5) }}>
            <svg viewBox="0 0 24 6" width={sp(6)} height={sp(1.5)} aria-hidden style={{ display: "block" }}>
              <line x1="2" y1="3" x2="22" y2="3" stroke={k.color} strokeWidth={k.w} strokeDasharray={k.dash} strokeLinecap="round" />
            </svg>
            {k.text}
          </span>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------------------------- hash chain

const CHAIN_N = 28;

function blockColor(e: LedgerEvent): string {
  const d = describe(e);
  if (d && d.tone === "bad") return theme.bad;
  if (d && d.tone === "warn") return theme.warn;
  if (e.type === "tool.call") return theme.accent;
  if (e.type === "llm.response") return theme.ink3;
  return theme.rule2;
}

/** The ledger as the chain it is: one block per event, newest on the right. */
const ChainStrip: React.FC<{ events: readonly LedgerEvent[]; head: string | null; progressOf?: (id: number) => number }> = ({ events, head, progressOf }) => {
  const shown = events.slice(-CHAIN_N);
  const hidden = events.length - shown.length;
  const legend: [string, string][] = [
    [theme.accent, ws.blast.chainLegend[0]],
    [theme.warn, ws.blast.chainLegend[1]],
    [theme.bad, ws.blast.chainLegend[2]],
    [theme.ink3, ws.blast.chainLegend[3]],
  ];
  return (
    <Card style={{ padding: sp(3.5) }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: sp(2) }}>
        <Label style={{ color: theme.ink }}>{ws.blast.chainTitle}</Label>
        <span style={{ fontSize: rem(0.8), fontStyle: "italic", color: theme.ink3 }}>
          {events.length} {events.length === 1 ? ws.blast.chainEventOne : ws.blast.chainEventMany}
          {hidden > 0 ? ` · ${ws.blast.chainLast} ${shown.length} ${ws.blast.chainShown}` : ""}
        </span>
        <span style={{ marginLeft: "auto", fontSize: rem(0.78), color: theme.ink3 }}>
          {ws.blast.chainHead} <Hash h={head ?? events[events.length - 1]?.hash} style={{ color: theme.ink2 }} />
        </span>
      </div>
      <div style={{ position: "relative", marginTop: sp(3), display: "flex", alignItems: "center", gap: 3, height: sp(7) }}>
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: theme.rule2 }} />
        {shown.length === 0 && <span style={{ position: "relative", fontSize: rem(0.85), fontStyle: "italic", color: theme.ink3 }}>{ws.blast.chainEmpty}</span>}
        {shown.map((e) => (
          <span
            key={e.id}
            style={{
              position: "relative",
              flex: "1 1 0%",
              minWidth: 5,
              maxWidth: 13,
              height: sp(5),
              borderRadius: 2,
              background: blockColor(e),
              boxShadow: `0 0 0 2px ${theme.sheet}`,
              ...riseStyle(progressOf?.(e.id) ?? 1),
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: sp(2.5), display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: sp(3.5), rowGap: sp(0.5), fontSize: rem(0.76), fontStyle: "italic", color: theme.ink3 }}>
        {legend.map(([c, t]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: sp(1) }}>
            <i style={{ width: sp(2), height: sp(2), borderRadius: 2, background: c }} />
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------------------------- panel

export const BlastPanel: React.FC<BlastPanelProps> = ({
  events,
  running,
  report = null,
  reveal,
  flash,
  flashAmount = 1,
  pulse = 0,
  breathe = 0.5,
  scan,
  progressOf,
  scrollY = 0,
  style,
}) => {
  const gauges = gaugesOf(events, running);
  const feed = groupLines(events as LedgerEvent[]);
  const phase = phaseOf(events, running);
  const cards = gauges.filter((g) => g.key !== "sbx");
  const sbx = gauges.find((g) => g.key === "sbx")!;
  const at = (key: string): number => reveal?.[GAUGE_KEYS.indexOf(key as GaugeKey)] ?? 1;
  const lit = (key: string): number => (flash === key ? flashAmount : 0);
  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, ...style }}>
      <PaneHead
        title={ws.blast.title}
        right={
          running && (
            <Chip tone="info">
              <Pulse tone="info" phase={pulse} /> {ws.blast.measuring}
            </Chip>
          )
        }
      />
      <div style={{ boxSizing: "border-box", flex: "1 1 0%", minHeight: 0, overflow: "hidden" }}>
        <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", gap: sp(3), padding: sp(4), transform: scrollY ? `translateY(${(-scrollY).toFixed(2)}px)` : undefined }}>
          <DialCard gauges={gauges} phase={phase} reveal={reveal} pulse={pulse} breathe={breathe} scan={scan} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: sp(2.5) }}>
            {cards.map((g) => (
              <GaugeCard key={g.key} g={g} p={at(g.key)} flash={lit(g.key)} />
            ))}
            <GaugeCard g={sbx} wide p={at("sbx")} flash={lit("sbx")} />
          </div>
          {report ? (
            <Seal
              state={report.verified ? "ok" : "bad"}
              title={report.verified ? ws.blast.sealOk : ws.blast.sealBad}
              ringText={report.verified ? ws.blast.ringOk : ws.blast.ringBad}
            >
              {report.detail}
            </Seal>
          ) : (
            <Seal state="idle" title={ws.blast.sealIdleTitle} ringText={ws.blast.ringIdle}>
              {ws.blast.sealIdleBody}
            </Seal>
          )}
          <ChainStrip events={events} head={report?.headHash ?? null} progressOf={progressOf} />
          <div>
            <SectionHead
              title={ws.blast.logTitle}
              right={
                <span style={{ fontSize: rem(0.8), fontStyle: "italic", color: theme.ink3 }}>
                  {feed.length} {feed.length === 1 ? ws.blast.logLineOne : ws.blast.logLineMany}
                </span>
              }
            />
            <ul style={{ margin: `${sp(2.5)}px 0 0`, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: sp(2), fontSize: rem(0.88), lineHeight: 1.375 }}>
              {feed.length === 0 && <li style={{ fontStyle: "italic", color: theme.ink3 }}>{ws.blast.logEmpty}</li>}
              {feed.map((r) => (
                <li key={r.key} style={{ display: "flex", gap: sp(2.5), color: NOTE[r.tone], ...riseStyle(progressOf?.(r.key) ?? 1) }}>
                  <span aria-hidden style={{ flex: "none", marginTop: rem(0.5), width: sp(1.5), height: sp(1.5), borderRadius: 9999, background: DOT[r.tone] }} />
                  <span style={{ minWidth: 0, overflowWrap: "break-word" }}>
                    {r.text}
                    {r.count > 1 && (
                      <span style={{ marginLeft: sp(1.5), borderRadius: 3, backgroundColor: theme.sunken, padding: `0 ${sp(1)}px`, fontSize: rem(0.8), fontVariantNumeric: "tabular-nums", color: theme.ink2 }}>
                        ×{r.count}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
