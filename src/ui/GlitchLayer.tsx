// RGB split + horizontal slice displacement, for the S0 hook. Seeded, deterministic, one SVG filter.
//
// <GlitchLayer strength={0..1}> wraps the content that glitches. At strength 0 it renders the children untouched
// (no filter at all). Above 0:
//   - RGB split: the red, green and blue channels are separated and the red and blue copies are shifted sideways
//     (up to about 12 px at strength 1, with a little vertical drift on the red copy);
//   - slice displacement: seeded horizontal bands (tens of px tall, hard edges between them) are pushed sideways
//     by up to about 70 px at strength 1;
//   - a few faint bars (accent, never above 12% opacity) make the glitch visible over flat dark content.
// The pattern changes every 2 frames (a glitch stutters) and is a pure function of (seed, frame).
//
// Notes
// - The three channel copies are ADDED back together, which is exact for OPAQUE content (the S0 stage is).
//   Wrap an opaque layer; semi-transparent content would come out denser than it went in.
// - `frame` defaults to the current frame (the GLOBAL frame when not inside a <Sequence> with an offset).
//   Pass it explicitly to glitch on a different clock.
// - The component sizes itself to its parent: put it in a positioned box (it is position:absolute, inset 0).

import React, { useId } from "react";
import { useCurrentFrame } from "remotion";
import { alpha, theme } from "../config/theme";
import { clamp01 } from "../lib/ease";
import { mixSeed, rand, randRange } from "../lib/prng";

export interface GlitchLayerProps {
  /** 0 = nothing, 1 = full glitch. */
  strength: number;
  /** Changes the pattern. Default 0. */
  seed?: number;
  /** Override the frame used for the pattern. */
  frame?: number;
  children?: React.ReactNode;
}

/** Frames per glitch pattern (it holds, then jumps). */
export const GLITCH_HOLD_FRAMES = 2;

export interface GlitchParams {
  /** Horizontal shift of the red copy in px (the blue copy gets the opposite). */
  splitX: number;
  /** Vertical shift of the red copy in px. */
  splitY: number;
  /** Peak horizontal displacement of a slice in px. */
  sliceScale: number;
  /** feTurbulence vertical base frequency (bands per px). */
  bandFreq: number;
  /** feTurbulence seed (integer). */
  noiseSeed: number;
  bars: { y: number; h: number; x: number; w: number; a: number }[];
}

/** The parameters of one glitch pattern: a pure function of (strength, seed, frame). Exported for checks. */
export function glitchParams(strength: number, seed: number, frame: number): GlitchParams {
  const s = clamp01(strength);
  const tick = Math.floor(frame / GLITCH_HOLD_FRAMES);
  const base = mixSeed(seed, tick);
  const sign = rand(mixSeed(base, 1)) < 0.5 ? -1 : 1;
  const barCount = s <= 0 ? 0 : Math.round(1 + 6 * s);
  const bars: GlitchParams["bars"] = [];
  for (let i = 0; i < barCount; i++) {
    const b = mixSeed(base, 100 + i);
    bars.push({
      y: randRange(mixSeed(b, 1), 0, 1),
      h: randRange(mixSeed(b, 2), 4, 26),
      x: randRange(mixSeed(b, 3), 0, 0.5),
      w: randRange(mixSeed(b, 4), 0.25, 0.6),
      a: 0.12 * s * randRange(mixSeed(b, 5), 0.5, 1),
    });
  }
  return {
    splitX: sign * s * randRange(mixSeed(base, 2), 6, 12),
    splitY: s * randRange(mixSeed(base, 3), -2.5, 2.5),
    sliceScale: s * randRange(mixSeed(base, 4), 36, 70),
    bandFreq: randRange(mixSeed(base, 5), 1 / 110, 1 / 30) / 2,
    noiseSeed: Math.floor(rand(mixSeed(base, 6)) * 100000),
    bars,
  };
}

const CHANNEL = (r: number, g: number, b: number): string => `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;

export const GlitchLayer: React.FC<GlitchLayerProps> = ({ strength, seed = 0, frame, children }) => {
  const current = useCurrentFrame();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = clamp01(strength);
  if (s <= 0.001) {
    return <div style={{ position: "absolute", inset: 0 }}>{children}</div>;
  }
  const p = glitchParams(s, seed, frame ?? current);
  const fid = `glitch-${id}`;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={fid} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            {/* slice map: noise that only varies with y, quantised into hard bands; G is held at 0.5 so there is no vertical push */}
            <feTurbulence type="fractalNoise" baseFrequency={`0 ${p.bandFreq}`} numOctaves={1} seed={p.noiseSeed} result="noise" />
            <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" result="map0" />
            <feComponentTransfer in="map0" result="map">
              <feFuncR type="discrete" tableValues="0.08 0.5 0.5 0.5 0.5 0.5 0.92 0.5 0.5 0.3 0.5 0.7" />
            </feComponentTransfer>
            <feDisplacementMap in="SourceGraphic" in2="map" scale={p.sliceScale} xChannelSelector="R" yChannelSelector="G" result="sliced" />
            {/* RGB split of the sliced picture */}
            <feColorMatrix in="sliced" type="matrix" values={CHANNEL(1, 0, 0)} result="r" />
            <feColorMatrix in="sliced" type="matrix" values={CHANNEL(0, 1, 0)} result="g" />
            <feColorMatrix in="sliced" type="matrix" values={CHANNEL(0, 0, 1)} result="b" />
            <feOffset in="r" dx={p.splitX} dy={p.splitY} result="ro" />
            <feOffset in="b" dx={-p.splitX} dy={0} result="bo" />
            <feComposite in="ro" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
            <feComposite in="rg" in2="bo" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: `url(#${fid})` }}>{children}</div>
      {p.bars.map((b, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${b.x * 100}%`,
            top: `${b.y * 100}%`,
            width: `${b.w * 100}%`,
            height: b.h,
            background: alpha(theme.accent, b.a),
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
};
