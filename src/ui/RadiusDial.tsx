// The Blast Radius dial: five concentric arcs, outermost first (network, policy, filesystem, secrets, compute).
// Ported from RadiusDial in frontend/src/components.tsx: same CX/CY/RADII/TICKS and arc geometry, same encoding:
//   solid (blue gradient, 8 px)  = clean          dashed 9 4.5 (vermilion, pulsing) = flagged
//   dashed 13 5 (amber)          = review         dotted 0.1 7.4 (ink-3, 4 px)      = not measured
// Pattern and colour both carry the state, so it reads in greyscale.
//
// Pure and props-driven. It never reads the frame: draw, labels, glow, scan and pulse all come in as props.
import React, { useId } from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, mapRange } from "../lib/ease";

export type DialKey = "net" | "pol" | "fs" | "sec" | "cpu";
export type DialState = "clean" | "flag" | "review" | "unmeasured";
export type DialTone = "ok" | "bad" | "warn" | "info" | "mute";

export interface DialDim {
  key: DialKey;
  label: string;
  state: DialState;
  /** 0..1: how much of the arc is drawn, from 12 o'clock clockwise. */
  draw: number;
  /**
   * Optional measured value, already formatted by the caller (it comes from the evidence selectors, never typed here).
   * Shown after the label when the arc is measured. Unmeasured arcs show a dash instead.
   */
  value?: string;
}

export interface RadiusDialProps {
  dims: readonly DialDim[];
  /** The word in the centre: "clean", "flagged", "review", "measuring", "partial", "no data" (others show no icon). */
  verdictWord: string;
  verdictTone: DialTone;
  /** Rendered width and height in px (the dial is square). */
  size: number;
  /** 0..1: fades the arc labels in, one after the other. */
  showLabels: number;
  /** 0..1 (above 1 = hero moment): drop-shadow on measured arcs. 1 equals the real app. */
  glow: number;
  /** Flagged arcs breathe (opacity .55 to 1) following `pulsePhase`. */
  pulseFlagged: boolean;
  /** 0..1 position within one breathing cycle; see dialPulsePhase(). Default 0.5 (fully lit). */
  pulsePhase?: number;
  /** The scan highlight: a wedge sweeping around the dial. Value is the rotation in turns (0..1 = one full turn). Omit to hide it. */
  scan?: number;
  /** Opacity of the scan wedge, 0..1. Default 1. */
  scanOpacity?: number;
}

// ---------------------------------------------------------------------------------------------- geometry (verbatim from the source)

export const DIAL_KEYS: readonly DialKey[] = ["net", "pol", "fs", "sec", "cpu"];
export const CX = 120;
export const CY = 120;
export const RADII: readonly number[] = [104, 88, 72, 56, 40];
export const arcPath = (r: number): string => `M ${CX} ${CY - r} A ${r} ${r} 0 1 1 ${CX - r} ${CY}`;
export const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 * Math.PI) / 180;
  const long = i % 9 === 0;
  const r1 = long ? 111 : 113.5;
  const r2 = 118;
  return { x1: CX + r1 * Math.sin(a), y1: CY - r1 * Math.cos(a), x2: CX + r2 * Math.sin(a), y2: CY - r2 * Math.cos(a), long };
});

/** Length of the breathing cycle in frames: the app's 2.4 s breathe at 30 fps. */
export const DIAL_PULSE_FRAMES = 72;

/** frame -> 0..1 phase for `pulsePhase`. Call it from the scene, not from inside the dial. */
export function dialPulsePhase(frame: number, period: number = DIAL_PULSE_FRAMES): number {
  const m = frame % period;
  return (m < 0 ? m + period : m) / period;
}

const TONE_COLOR: Record<DialTone, string> = {
  ok: theme.ok,
  bad: theme.bad,
  warn: theme.warn,
  info: theme.info,
  mute: theme.ink3,
};

interface ArcLook {
  /** a color, or "gradient" for the clean blue gradient */
  stroke: string;
  width: number;
  dash: string | undefined;
  glow: boolean;
  pulse: boolean;
  opacity: number;
  glowColor: string;
}

function arcLook(state: DialState): ArcLook {
  switch (state) {
    case "unmeasured":
      return { stroke: theme.ink3, width: 4, dash: "0.1 7.4", glow: false, pulse: false, opacity: 0.7, glowColor: theme.ink3 };
    case "flag":
      return { stroke: theme.bad, width: 8, dash: "9 4.5", glow: true, pulse: true, opacity: 1, glowColor: theme.bad };
    case "review":
      return { stroke: theme.warn, width: 8, dash: "13 5", glow: true, pulse: false, opacity: 1, glowColor: theme.warn };
    case "clean":
    default:
      return { stroke: "gradient", width: 8, dash: undefined, glow: true, pulse: false, opacity: 0.95, glowColor: theme.ok };
  }
}

// ---------------------------------------------------------------------------------------------- component

export const RadiusDial: React.FC<RadiusDialProps> = ({
  dims,
  verdictWord,
  verdictTone,
  size,
  showLabels,
  glow,
  pulseFlagged,
  pulsePhase = 0.5,
  scan,
  scanOpacity = 1,
}) => {
  // unique ids so several dials on one frame never share a gradient or mask
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `dial-ok-${uid}`;
  const maskId = (key: string) => `dial-m-${uid}-${key}`;

  const tint = TONE_COLOR[verdictTone];
  const breathe = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * pulsePhase));
  const g = Math.max(0, glow);
  const labelsShown = clamp01(showLabels);

  const ariaLabel =
    "Containment dial: " +
    DIAL_KEYS.map((k) => dims.find((d) => d.key === k))
      .filter((d): d is DialDim => !!d)
      .map((d) => `${d.label} ${d.state === "unmeasured" ? "not measured" : d.state === "flag" ? "flagged" : d.state}`)
      .join(", ") +
    `. Overall ${verdictWord}.`;

  return (
    <svg width={size} height={size} viewBox="0 0 240 240" role="img" aria-label={ariaLabel} style={{ display: "block", flex: "none", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.okA} />
          <stop offset=".55" stopColor={theme.okB} />
          <stop offset="1" stopColor={theme.okC} />
        </linearGradient>
        {DIAL_KEYS.map((key, i) => {
          const d = dims.find((x) => x.key === key);
          if (!d) return null;
          const draw = clamp01(d.draw);
          if (draw >= 1) return null;
          // The arc itself may be dashed or dotted, so its "draw on" is a mask: a thick solid stroke along the same path,
          // drawn to `draw` of its length. The arc spans 270 degrees, so its length is 1.5 * PI * r.
          const len = 1.5 * Math.PI * RADII[i];
          return (
            <mask key={key} id={maskId(key)} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
              <path d={arcPath(RADII[i])} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray={`${(draw * len).toFixed(4)} ${(len * 2).toFixed(4)}`} />
            </mask>
          );
        })}
      </defs>

      {/* ticks */}
      <g stroke={theme.ink3} strokeWidth={0.9} opacity={0.4} strokeLinecap="round">
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.long ? 1.5 : 0.8} />
        ))}
      </g>

      {/* scan highlight */}
      {scan !== undefined && scanOpacity > 0 && (
        <g aria-hidden transform={`rotate(${(scan * 360).toFixed(3)} ${CX} ${CY})`} opacity={clamp01(scanOpacity)}>
          <path
            d={`M ${CX} ${CY} L ${CX} 10 A 110 110 0 0 1 ${CX + 110 * Math.sin(Math.PI / 3)} ${CY - 110 * Math.cos(Math.PI / 3)} Z`}
            fill={theme.accent}
            opacity={0.13}
          />
          <line x1={CX} y1={CY} x2={CX + 110 * Math.sin(Math.PI / 3)} y2={CY - 110 * Math.cos(Math.PI / 3)} stroke={theme.accent} strokeWidth={1} opacity={0.7} />
        </g>
      )}

      {/* arcs, outermost first */}
      {DIAL_KEYS.map((key, i) => {
        const d = dims.find((x) => x.key === key);
        if (!d) return null;
        const r = RADII[i];
        const look = arcLook(d.state);
        const draw = clamp01(d.draw);
        const measured = d.state !== "unmeasured";
        const arcOpacity = look.opacity * (look.pulse && pulseFlagged ? breathe : 1);
        const stroke = look.stroke === "gradient" ? `url(#${gradId})` : look.stroke;
        const glowOn = look.glow && g > 0 && draw > 0;
        const filter = glowOn ? `drop-shadow(0 0 ${(3 * g).toFixed(2)}px ${alpha(look.glowColor, Math.min(0.9, 0.55 * g))})` : undefined;
        const labelT = mapRange(labelsShown, i * 0.12, i * 0.12 + 0.4, 0, 1);
        const valueColor = measured ? TONE_COLOR[d.state === "clean" ? "ok" : d.state === "flag" ? "bad" : "warn"] : theme.ink3;
        const valueText = measured ? d.value : "\u2014";

        return (
          <g key={key}>
            {/* the empty track */}
            <path d={arcPath(r)} fill="none" stroke={theme.rule} strokeWidth={8} strokeLinecap="round" opacity={0.85} />
            {draw > 0 && (
              <path
                d={arcPath(r)}
                fill="none"
                stroke={stroke}
                strokeWidth={look.width}
                strokeDasharray={look.dash}
                strokeLinecap="round"
                opacity={arcOpacity}
                mask={draw < 1 ? `url(#${maskId(key)})` : undefined}
                style={filter ? { filter } : undefined}
              />
            )}
            {labelT > 0 && (
              <text
                x={CX - 8}
                y={CY - r + 3.8}
                textAnchor="end"
                fontSize={11.5}
                fontFamily={fonts.serif}
                opacity={labelT}
              >
                <tspan fill={theme.ink2}>{d.label}</tspan>
                {valueText ? (
                  <tspan dx={6} fontWeight={700} fill={valueColor}>
                    {valueText}
                  </tspan>
                ) : null}
              </text>
            )}
          </g>
        );
      })}

      {/* centre: verdict */}
      <circle cx={CX} cy={CY} r={30} fill={theme.sheet} stroke={theme.rule2} strokeWidth={1} />
      <g
        stroke={tint}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.2}
        style={verdictTone !== "mute" && g > 0 ? { filter: `drop-shadow(0 0 ${(3 * Math.min(g, 1)).toFixed(2)}px ${alpha(tint, 0.55)})` } : undefined}
      >
        {verdictWord === "clean" && <path d={`M ${CX - 8} ${CY - 6} l 6 6.5 l 11 -12.5`} />}
        {(verdictWord === "flagged" || verdictWord === "review") && (
          <>
            <path d={`M ${CX} ${CY - 15} v 11`} />
            <circle cx={CX} cy={CY + 1} r={0.6} strokeWidth={4} />
          </>
        )}
        {(verdictWord === "measuring" || verdictWord === "partial") && (
          <g fill={tint} stroke="none">
            <circle cx={CX - 9} cy={CY - 7} r={2.4} />
            <circle cx={CX} cy={CY - 7} r={2.4} />
            <circle cx={CX + 9} cy={CY - 7} r={2.4} />
          </g>
        )}
        {verdictWord === "no data" && <path d={`M ${CX - 8} ${CY - 7} h 16`} />}
      </g>
      <text
        x={CX}
        y={CY + 17}
        textAnchor="middle"
        fontSize={10}
        fill={tint}
        fontFamily={fonts.serif}
        style={{ fontVariantCaps: "all-small-caps", letterSpacing: "0.08em", fontWeight: 500 }}
      >
        {verdictWord}
      </text>
    </svg>
  );
};
