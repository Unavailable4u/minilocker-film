// DEV ONLY (patch 01). One still that shows every brand piece: the Mark in build / static / collapse, the RadiusDial in
// four states, the two font families at the sizes the film uses, and the Vultr logo slot.
// Check it with:  npx remotion still src/index.ts DevBrandSheet out/qa/brand.png --frame=0
// Labels on this sheet are developer notes, not film copy, and it shows no measured values (evidence rule).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { fonts, theme, type } from "../config/theme";
import { FontsReady } from "../lib/fonts";
import { Mark, type MarkMode } from "../ui/Mark";
import { RadiusDial, dialPulsePhase, type DialDim, type DialKey, type DialState, type DialTone } from "../ui/RadiusDial";
import { VultrLogo, hasVultrLogo } from "../ui/VultrLogo";

const LABELS: Record<DialKey, string> = { net: "Network", pol: "Policy", fs: "Filesystem", sec: "Secrets", cpu: "Compute" };
const KEYS: readonly DialKey[] = ["net", "pol", "fs", "sec", "cpu"];

function dims(spec: readonly { state: DialState; draw: number }[]): DialDim[] {
  return KEYS.map((key, i) => ({ key, label: LABELS[key], state: spec[i].state, draw: spec[i].draw }));
}

interface DialCase {
  title: string;
  dims: DialDim[];
  word: string;
  tone: DialTone;
  labels: number;
  scan?: boolean;
}

const CASES: readonly DialCase[] = [
  {
    title: "empty (draw 0)",
    dims: dims(KEYS.map(() => ({ state: "unmeasured" as const, draw: 0 }))),
    word: "no data",
    tone: "mute",
    labels: 0,
  },
  {
    title: "half drawn + scan",
    dims: dims([
      { state: "clean", draw: 1 },
      { state: "clean", draw: 0.62 },
      { state: "clean", draw: 0.3 },
      { state: "unmeasured", draw: 0 },
      { state: "unmeasured", draw: 0 },
    ]),
    word: "measuring",
    tone: "info",
    labels: 1,
    scan: true,
  },
  {
    title: "all clean",
    dims: dims(KEYS.map(() => ({ state: "clean" as const, draw: 1 }))),
    word: "clean",
    tone: "ok",
    labels: 1,
  },
  {
    title: "one flagged, one not measured",
    dims: dims([
      { state: "clean", draw: 1 },
      { state: "clean", draw: 1 },
      { state: "flag", draw: 1 },
      { state: "unmeasured", draw: 1 },
      { state: "clean", draw: 1 },
    ]),
    word: "flagged",
    tone: "bad",
    labels: 1,
  },
];

const MARK_ROWS: readonly { mode: MarkMode; note: string }[] = [
  { mode: "build", note: "build" },
  { mode: "static", note: "static (ignores progress)" },
  { mode: "collapse", note: "collapse" },
];
const PROGRESS = [0, 0.25, 0.5, 0.75, 1] as const;

const mono = (px: number, color: string = theme.ink3): React.CSSProperties => ({
  fontFamily: fonts.mono,
  fontSize: px,
  color,
  lineHeight: 1.3,
});

export const DevBrandSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const phase = dialPulsePhase(frame);

  return (
    <FontsReady>
      <AbsoluteFill className="film-root" style={{ background: theme.stageGradient, padding: 48 }}>
        <div style={mono(20, theme.ink2)}>DevBrandSheet · patch 01 · dev only</div>

        {/* top half: Marks (left) and type specimens (right) */}
        <div style={{ display: "flex", gap: 64, marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {MARK_ROWS.map((row) => (
              <div key={row.mode}>
                <div style={mono(18)}>{row.note}</div>
                <div style={{ display: "flex", gap: 28, marginTop: 6 }}>
                  {PROGRESS.map((p) => (
                    <div key={p} style={{ width: 96 }}>
                      <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Mark size={96} mode={row.mode} progress={p} />
                      </div>
                      <div style={{ ...mono(18), textAlign: "center", marginTop: 2 }}>{Math.round(p * 100)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={mono(18)}>CMU Serif 700, {type.title} px display</div>
            <div className="display" style={{ fontFamily: fonts.serif, fontSize: type.title, color: theme.ink, lineHeight: 1.04 }}>
              Mini<span style={{ color: theme.accentInk }}>Locker</span>
            </div>
            <div style={{ ...mono(18), marginTop: 14 }}>CMU Serif 500 italic, {type.captionMin} px caption</div>
            <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontWeight: 500, fontSize: type.captionMin, color: theme.ink, lineHeight: 1.15 }}>
              Bait, not secrets.
            </div>
            <div style={{ ...mono(18), marginTop: 14 }}>CMU Serif 500, {type.uiMin} px UI</div>
            <div style={{ fontFamily: fonts.serif, fontWeight: 500, fontSize: type.uiMin, color: theme.ink2 }}>
              The quick brown fox jumps over the lazy dog, 0123456789.
            </div>
            <div style={{ ...mono(18), marginTop: 14 }}>CMU Typewriter Text 500, 18 px mono</div>
            <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 18, color: theme.ink2 }}>
              $ docker run --read-only --cap-drop=ALL 0123456789
            </div>
          </div>
        </div>

        {/* bottom: dials (left) and the Vultr slot (right) */}
        <div style={{ display: "flex", gap: 40, marginTop: 28, alignItems: "flex-start" }}>
          {CASES.map((c) => (
            <div key={c.title} style={{ width: 300 }}>
              <RadiusDial
                dims={c.dims}
                verdictWord={c.word}
                verdictTone={c.tone}
                size={300}
                showLabels={c.labels}
                glow={1}
                pulseFlagged
                pulsePhase={phase}
                scan={c.scan ? frame / 90 : undefined}
              />
              <div style={{ ...mono(18), textAlign: "center", marginTop: 4 }}>{c.title}</div>
            </div>
          ))}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={mono(18)}>VultrLogo slot, height 64 ({hasVultrLogo ? "official logo installed" : "text fallback: logo not installed"})</div>
            <div
              style={{
                marginTop: 8,
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: theme.sheet,
                border: `1px solid ${theme.rule}`,
                borderRadius: 5,
              }}
            >
              <VultrLogo height={64} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </FontsReady>
  );
};
