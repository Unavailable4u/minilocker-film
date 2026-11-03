// ContainerBox: the hardened sandbox drawn as a hairline "technical drawing" (patch 08, BIBLE 11 A).
//
// - Positioned in STAGE px (1920 x 1080) by `x`, `y`; the box itself is BOX_W x BOX_H (1100 x 600). Children are laid out in
//   BOX-LOCAL px (origin = the box's top-left corner), inside the box.
// - Pure and props-driven: nothing here reads the frame. A scene passes 0..1 progress values (drawProgress, chipProgress[6],
//   auditProgress, stampProgress, sealProgress). No CSS transitions, no timers, no randomness.
// - Every word is a prop: the chip texts come from copy.s3.chips (README hardening facts), the stamp content from the scene.
// - One accent per drawing: the crimson of the attach dots and the seal ring. Status colors only appear in the stamp.
import React, { useId } from "react";
import { alpha, fonts, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";
import { estimateWidth, MONO_ADVANCE } from "../fx/util";

export const BOX_W = 1100;
export const BOX_H = 600;
export const BOX_RADIUS = 24;

const LINE = 1.5;
const CHIP_FONT = 22; // CMU Typewriter, at least 20 (BIBLE 4.2)
const CHIP_H = 42;
const CHIP_PAD_X = 18;
const STEM = 30; // px between the box edge and the chip
const SEAL_GAP = 22; // px between the box edge and the seal ring
const TICK_STEP = 25;

type Edge = "top" | "right" | "bottom";

export interface ChipSlot {
  edge: Edge;
  /** top: fraction from the left. right: fraction from the top. bottom: fraction from the RIGHT (so the order stays clockwise). */
  at: number;
}

/** Where the six chips attach, in the order they land: clockwise from the top-left (3 on top, 1 on the right, 2 on the bottom). */
export const CHIP_SLOTS: readonly ChipSlot[] = [
  { edge: "top", at: 0.14 },
  { edge: "top", at: 0.42 },
  { edge: "top", at: 0.7 },
  { edge: "right", at: 0.2 },
  { edge: "bottom", at: 0.3 },
  { edge: "bottom", at: 0.7 },
];

export interface ContainerBoxProps {
  /** Top-left corner of the box in stage px. */
  x: number;
  y: number;
  /** The six chip texts (copy.s3.chips), in landing order. */
  chips: readonly string[];
  /** 0..1 per chip: stem draws, the chip is revealed from the stem side, the attach dot pops. Same length as `chips`. */
  chipProgress: readonly number[];
  /** 0..1: the outline, the corner ticks and the interior draw on. Default 1. */
  drawProgress?: number;
  /** 0..1: the seal ring closes around the box from its top centre to its bottom centre. Default 0. */
  sealProgress?: number;
  /** 0..1: the teardown audit line sweeps left to right (the scene gives it 40 frames). Default 0. */
  auditProgress?: number;
  /** The result stamp (use <StampBox>), shown at `stampAnchor`. Nothing is drawn while `stampProgress` is 0. */
  stamp?: React.ReactNode;
  stampProgress?: number;
  /** Where the stamp sits, as fractions of the box (0..1). Default the centre. */
  stampAnchor?: { x: number; y: number };
  /** Interior slot, in box-local px. */
  children?: React.ReactNode;
}

/** Perimeter of a rounded rectangle. */
function roundedPerimeter(w: number, h: number, r: number): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/** A rounded rectangle path starting at its top-left straight, drawn clockwise. */
function roundedPath(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

/** Position of a chip's attach point, in box-local px. */
function anchorOf(slot: ChipSlot): { ax: number; ay: number } {
  if (slot.edge === "top") return { ax: slot.at * BOX_W, ay: 0 };
  if (slot.edge === "right") return { ax: BOX_W, ay: slot.at * BOX_H };
  return { ax: BOX_W - slot.at * BOX_W, ay: BOX_H };
}

const Chip: React.FC<{ slot: ChipSlot; text: string; progress: number }> = ({ slot, text, progress }) => {
  const p = clamp01(progress);
  if (p <= 0) return null;
  const { ax, ay } = anchorOf(slot);
  const chipW = Math.round(estimateWidth(text, CHIP_FONT, MONO_ADVANCE) + CHIP_PAD_X * 2);
  const stemP = signature(clamp01(p / 0.35));
  const bodyP = signature(clamp01((p - 0.2) / 0.8));
  const dotP = signature(clamp01(p / 0.2));
  const ringP = clamp01((p - 0.3) / 0.35);

  let left = 0;
  let top = 0;
  let clip = "";
  let shift = "translate(0px, 0px)";
  const slide = (1 - bodyP) * 8;
  if (slot.edge === "top") {
    left = ax - chipW / 2;
    top = ay - STEM - CHIP_H;
    clip = `inset(${(1 - bodyP) * 100}% 0 0 0)`;
    shift = `translate(0px, ${slide}px)`;
  } else if (slot.edge === "bottom") {
    left = ax - chipW / 2;
    top = ay + STEM;
    clip = `inset(0 0 ${(1 - bodyP) * 100}% 0)`;
    shift = `translate(0px, ${-slide}px)`;
  } else {
    left = ax + STEM;
    top = ay - CHIP_H / 2;
    clip = `inset(0 ${(1 - bodyP) * 100}% 0 0)`;
    shift = `translate(${-slide}px, 0px)`;
  }

  const stemStyle: React.CSSProperties = { position: "absolute", background: theme.ink3 };
  if (slot.edge === "top") Object.assign(stemStyle, { left: ax - LINE / 2, top: ay - STEM * stemP, width: LINE, height: STEM * stemP });
  else if (slot.edge === "bottom") Object.assign(stemStyle, { left: ax - LINE / 2, top: ay, width: LINE, height: STEM * stemP });
  else Object.assign(stemStyle, { left: ax, top: ay - LINE / 2, width: STEM * stemP, height: LINE });

  return (
    <>
      <div style={stemStyle} />
      {/* attach pulse */}
      {ringP > 0 && ringP < 1 ? (
        <div
          style={{
            position: "absolute",
            left: ax,
            top: ay,
            width: 10 + 30 * ringP,
            height: 10 + 30 * ringP,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `${LINE}px solid ${alpha(theme.accent, 0.8 * (1 - ringP))}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: ax,
          top: ay,
          width: 10,
          height: 10,
          transform: `translate(-50%, -50%) scale(${dotP})`,
          borderRadius: "50%",
          background: theme.accent,
        }}
      />
      <div style={{ position: "absolute", left, top, width: chipW, height: CHIP_H, clipPath: clip, transform: shift }}>
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${LINE}px solid ${theme.rule2}`,
            borderRadius: 8,
            background: theme.sheet,
            boxShadow: theme.panelShadow,
            fontFamily: fonts.mono,
            fontSize: CHIP_FONT,
            lineHeight: 1,
            color: theme.ink,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
      </div>
    </>
  );
};

/** The result stamp: a double-bordered mono plate, slightly rotated. Put it in ContainerBox's `stamp` slot. */
export const StampBox: React.FC<{ children: React.ReactNode; tone?: "ok" | "bad" | "warn" | "info"; size?: number }> = ({
  children,
  tone = "ok",
  size = 30,
}) => {
  const color = theme[tone];
  const wash = tone === "ok" ? theme.okWash : tone === "bad" ? theme.badWash : tone === "warn" ? theme.warnWash : theme.infoWash;
  return (
    <div
      style={{
        boxSizing: "border-box",
        padding: "14px 28px",
        border: `3px solid ${color}`,
        borderRadius: 10,
        background: wash,
        boxShadow: `inset 0 0 0 4px ${wash}, inset 0 0 0 5px ${alpha(color, 0.6)}, 0 0 44px ${alpha(color, 0.22)}`,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: Math.max(24, size),
        lineHeight: 1.1,
        letterSpacing: "0.02em",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

const CORNER_ARM = 30;
const CORNER_OFFSET = 14;

export const ContainerBox: React.FC<ContainerBoxProps> = ({
  x,
  y,
  chips,
  chipProgress,
  drawProgress = 1,
  sealProgress = 0,
  auditProgress = 0,
  stamp,
  stampProgress = 0,
  stampAnchor = { x: 0.5, y: 0.5 },
  children,
}) => {
  const uid = useId().replace(/:/g, "");
  if (chips.length !== CHIP_SLOTS.length) {
    throw new Error(`ContainerBox: expected ${CHIP_SLOTS.length} chips, got ${chips.length}`);
  }
  if (chipProgress.length < chips.length) {
    throw new Error(`ContainerBox: chipProgress needs ${chips.length} values, got ${chipProgress.length}`);
  }

  const draw = signature(clamp01(drawProgress));
  const perim = roundedPerimeter(BOX_W, BOX_H, BOX_RADIUS);

  // corner ticks (outside the box, L-shaped)
  const arm = CORNER_ARM;
  const off = CORNER_OFFSET;
  const corners: string[] = [
    `M ${-off} ${-off + arm} V ${-off} H ${-off + arm}`,
    `M ${BOX_W + off - arm} ${-off} H ${BOX_W + off} V ${-off + arm}`,
    `M ${BOX_W + off} ${BOX_H + off - arm} V ${BOX_H + off} H ${BOX_W + off - arm}`,
    `M ${-off + arm} ${BOX_H + off} H ${-off} V ${BOX_H + off - arm}`,
  ];
  const cornerLen = arm * 2;

  // registration crosses at the edge midpoints
  const cross = 9;
  const crosses: string[] = [
    `M ${BOX_W / 2 - cross} 0 H ${BOX_W / 2 + cross} M ${BOX_W / 2} ${-cross} V ${cross}`,
    `M ${BOX_W / 2 - cross} ${BOX_H} H ${BOX_W / 2 + cross} M ${BOX_W / 2} ${BOX_H - cross} V ${BOX_H + cross}`,
    `M ${-cross} ${BOX_H / 2} H ${cross} M 0 ${BOX_H / 2 - cross} V ${BOX_H / 2 + cross}`,
    `M ${BOX_W - cross} ${BOX_H / 2} H ${BOX_W + cross} M ${BOX_W} ${BOX_H / 2 - cross} V ${BOX_H / 2 + cross}`,
  ];

  // seal ring: two halves from the top centre, clockwise and counter-clockwise, meeting at the bottom centre
  const seal = signature(clamp01(sealProgress));
  const sx0 = -SEAL_GAP;
  const sy0 = -SEAL_GAP;
  const sx1 = BOX_W + SEAL_GAP;
  const sy1 = BOX_H + SEAL_GAP;
  const sr = BOX_RADIUS + SEAL_GAP;
  const cx = BOX_W / 2;
  const half = (sx1 - sx0) / 2 - sr; // straight run from the centre to the start of a corner arc
  const halfLen = 2 * half + Math.PI * sr + (sy1 - sy0 - 2 * sr);
  const sealRight = [
    `M ${cx} ${sy0}`,
    `H ${sx1 - sr}`,
    `A ${sr} ${sr} 0 0 1 ${sx1} ${sy0 + sr}`,
    `V ${sy1 - sr}`,
    `A ${sr} ${sr} 0 0 1 ${sx1 - sr} ${sy1}`,
    `H ${cx}`,
  ].join(" ");
  const sealLeft = [
    `M ${cx} ${sy0}`,
    `H ${sx0 + sr}`,
    `A ${sr} ${sr} 0 0 0 ${sx0} ${sy0 + sr}`,
    `V ${sy1 - sr}`,
    `A ${sr} ${sr} 0 0 0 ${sx0 + sr} ${sy1}`,
    `H ${cx}`,
  ].join(" ");

  // audit scan
  const scanP = clamp01(auditProgress);
  const scanX = scanP * BOX_W;
  const scanEdge = Math.min(1, scanP / 0.04, (1 - scanP) / 0.04);
  const scanVisible = scanP > 0 && scanP < 1;
  const rulerOpacity = clamp01(scanP * 8);

  const stampP = clamp01(stampProgress);
  const stampScale = 1 + 0.18 * (1 - signature(clamp01(stampP / 0.6)));
  const stampOpacity = clamp01(stampP / 0.2);

  const ticks: number[] = [];
  for (let tx = TICK_STEP; tx < BOX_W; tx += TICK_STEP) ticks.push(tx);

  return (
    <div style={{ position: "absolute", left: x, top: y, width: BOX_W, height: BOX_H, pointerEvents: "none" }}>
      {/* interior surface with the engineering grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: BOX_RADIUS,
          opacity: draw,
          background:
            `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px), ${alpha(theme.sheet, 0.6)}`,
          backgroundSize: `${theme.gridSize}px ${theme.gridSize}px, ${theme.gridSize}px ${theme.gridSize}px, auto`,
        }}
      />
      {/* outline, corner ticks, registration crosses */}
      <svg
        width={BOX_W}
        height={BOX_H}
        viewBox={`0 0 ${BOX_W} ${BOX_H}`}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        <path
          d={roundedPath(0, 0, BOX_W, BOX_H, BOX_RADIUS)}
          fill="none"
          stroke={theme.ink3}
          strokeWidth={LINE}
          strokeDasharray={`${perim * draw} ${perim}`}
        />
        {corners.map((d, i) => (
          <path
            key={`c${i}`}
            d={d}
            fill="none"
            stroke={theme.ink3}
            strokeWidth={LINE}
            strokeLinecap="square"
            strokeDasharray={`${cornerLen * draw} ${cornerLen}`}
          />
        ))}
        {crosses.map((d, i) => (
          <path key={`x${i}`} d={d} fill="none" stroke={theme.rule2} strokeWidth={LINE} opacity={draw} />
        ))}
      </svg>

      {/* interior slot */}
      <div style={{ position: "absolute", left: 0, top: 0, width: BOX_W, height: BOX_H }}>{children}</div>

      {/* teardown audit: ruler, wash, line (clipped to the box) */}
      {scanP > 0 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: BOX_RADIUS, overflow: "hidden" }}>
          <svg width={BOX_W} height={BOX_H} viewBox={`0 0 ${BOX_W} ${BOX_H}`} style={{ position: "absolute", left: 0, top: 0, opacity: rulerOpacity }}>
            {ticks.map((tx, i) => {
              const major = i % 4 === 3;
              return (
                <line
                  key={tx}
                  x1={tx}
                  x2={tx}
                  y1={BOX_H - 20}
                  y2={BOX_H - 20 - (major ? 14 : 8)}
                  stroke={tx <= scanX ? theme.ink2 : theme.rule2}
                  strokeWidth={LINE}
                />
              );
            })}
          </svg>
          {scanVisible ? (
            <>
              <div
                style={{
                  position: "absolute",
                  left: scanX - 240,
                  top: 0,
                  width: 240,
                  height: BOX_H,
                  opacity: scanEdge,
                  background: `linear-gradient(90deg, transparent, ${alpha(theme.ink, 0.075)})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: scanX - 1,
                  top: 0,
                  width: 2,
                  height: BOX_H,
                  opacity: scanEdge,
                  background: theme.ink2,
                  boxShadow: `0 0 18px ${alpha(theme.ink, 0.4)}`,
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {/* chips */}
      {chips.map((text, i) => (
        <Chip key={i} slot={CHIP_SLOTS[i]} text={text} progress={chipProgress[i]} />
      ))}

      {/* seal ring */}
      {seal > 0 ? (
        <svg
          width={BOX_W}
          height={BOX_H}
          viewBox={`0 0 ${BOX_W} ${BOX_H}`}
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: `drop-shadow(0 0 ${14 * seal}px ${alpha(theme.accent, 0.55)})` }}
        >
          <defs>
            <linearGradient id={`seal-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={theme.accent} />
              <stop offset="1" stopColor={theme.accentInk} />
            </linearGradient>
          </defs>
          <path d={roundedPath(sx0, sy0, sx1 - sx0, sy1 - sy0, sr)} fill="none" stroke={theme.rule} strokeWidth={1} />
          <path d={sealRight} fill="none" stroke={`url(#seal-${uid})`} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${halfLen * seal} ${halfLen}`} />
          <path d={sealLeft} fill="none" stroke={`url(#seal-${uid})`} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${halfLen * seal} ${halfLen}`} />
          {seal > 0.97 ? <circle cx={cx} cy={sy1} r={5} fill={theme.accent} /> : null}
        </svg>
      ) : null}

      {/* result stamp */}
      {stamp && stampP > 0 ? (
        <div
          style={{
            position: "absolute",
            left: stampAnchor.x * BOX_W,
            top: stampAnchor.y * BOX_H,
            transform: `translate(-50%, -50%) rotate(-3deg) scale(${stampScale})`,
            opacity: stampOpacity,
          }}
        >
          {stamp}
        </div>
      ) : null}
    </div>
  );
};
