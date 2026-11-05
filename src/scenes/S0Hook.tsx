// S0 Hook (f0-299) "One bad page" (BIBLE 6). Patch 12b.
//
// STAGE-space overlay: one OPAQUE layer (so the glitch can add its three channel copies back together) holding the stage's own
// gradient and glow, the page card, the typed lines and the four terminal lines. The caption and the dot sit above it.
// Everything is a pure function of the GLOBAL frame. The film's camera is not used to move pixels here (the app is not mounted
// before f560): S0_CAMERA gives the 3% punches and the slow push, and this file applies the camera's scale and shake to its content.
import React from "react";
import { getCameraState } from "../fx/Camera";
import { KineticText } from "../fx/KineticText";
import { Spotlight } from "../fx/Spotlight";
import { StageGlow } from "../fx/StageGlow";
import { GlitchLayer } from "../ui/GlitchLayer";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { alpha, fonts, theme } from "../config/theme";
import { FPS, STAGE } from "../config/timeline";
import { clamp01, easeOutBack, signature } from "../lib/ease";
import { spr } from "../lib/spring";
import { typedText, typingEndFrame, type TypingOpts } from "../lib/typing";
import type { SceneOverlayProps } from "./types";

const s0 = copy.s0;
const MONO = fonts.mono;
const SERIF = fonts.serif;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

const AGENT_OPTS: TypingOpts = {};
const HIDDEN_OPTS: TypingOpts = { cps: 170, pausePunct: 0.5, pauseSpace: 0.2 };

export const S0_TIMING = {
  /** pure #050505 until this frame */
  coverEnd: 12,
  pageRise: { start: 12, end: 59 },
  agentLine: { start: 20, opts: AGENT_OPTS },
  scan: { start: 60, frames: 24 },
  hidden: { start: 66, opts: HIDDEN_OPTS },
  /** the four terminal hits, one per beat */
  hits: [105, 120, 135, 150] as const,
  /** the glitch: 12 frames in total, peaking in the middle */
  glitch: { start: 165, end: 177 },
  /** the page and terminal are gone from this frame */
  collapseEnd: 179,
  captionLine1: 180,
  captionLine2: 210,
  /** everything is pulled into the dot f270-285 and the dot holds until f299 */
  crush: { start: 270, end: 285 },
} as const;

/** The hook dot (the Mark's core in S1): stage centre, radius of the core at the 360 px logo (2.2 / 32 * 360). */
export const HOOK_DOT = { x: STAGE.w / 2, y: STAGE.h / 2, r: (2.2 / 32) * 360 } as const;

// ---------------------------------------------------------------------------------------------- camera / cursor

// Window focus with an 80 px margin gives a base zoom of 1.022; scaleBias 1.03 is then a 3% punch on that base.
export const S0_CAMERA: readonly CameraKeyframe[] = [
  kf(0, "fullWindow", { padding: 80 }),
  // Keep each impact move bounded before the next one starts; overlapping camera springs
  // compound their deltas and make the later slow push visibly lurch at the handoff.
  kf(60, "fullWindow", { padding: 80, scaleBias: 1.03, ease: "signature", frames: 45, shake: 5 }),
  kf(105, "fullWindow", { padding: 80, scaleBias: 1.045, ease: "signature", frames: 45, shake: 7 }),
  // a slow push through the caption
  kf(180, "fullWindow", { padding: 80, scaleBias: 1.06, ease: "linear", frames: 110 }),
];
export const S0_CURSOR: readonly CursorWaypoint[] = [];

const BASE_SCALE = getCameraState(0, [S0_CAMERA[0]]).scale;

// ---------------------------------------------------------------------------------------------- the page card

/** Stage rectangle of the generic article card. */
const PAGE = { x: 560, y: 110, w: 800, h: 440 } as const;
/** The terminal card, under the agent line. */
const TERM = { x: 630, y: 668, w: 660, h: 232 } as const;

const Bar: React.FC<{ w: number | string; h?: number; tone?: number }> = ({ w, h = 12, tone = 0.1 }) => (
  <div style={{ width: w, height: h, borderRadius: h / 2, background: `rgba(242,241,237,${tone})` }} />
);

const Page: React.FC<{ frame: number }> = ({ frame }) => {
  const rise = spr(frame, FPS, S0_TIMING.pageRise.start, "panel");
  const t = clamp01(rise);
  const hiddenShown = typedText(s0.hiddenText, frame, S0_TIMING.hidden.start, S0_TIMING.hidden.opts);
  const hiddenOn = hiddenShown.length > 0;
  return (
    <div
      style={{
        position: "absolute",
        left: PAGE.x,
        top: PAGE.y,
        width: PAGE.w,
        height: PAGE.h,
        opacity: clamp01(t * 1.4),
        transform: `translateY(${((1 - rise) * 120).toFixed(2)}px) perspective(1400px) rotateX(${((1 - rise) * 9).toFixed(3)}deg) rotateZ(${(-0.6 * rise).toFixed(3)}deg)`,
        transformOrigin: "50% 100%",
        borderRadius: 14,
        background: theme.sheet,
        border: `1px solid ${theme.rule2}`,
        boxShadow: "0 40px 100px rgba(0,0,0,.7)",
        overflow: "hidden",
      }}
    >
      {/* browser bar: three dots and an address, no real site */}
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: `1px solid ${theme.rule}`, background: theme.raised }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: theme.rule2 }} />
        ))}
        <div style={{ marginLeft: 14, flex: 1, height: 26, borderRadius: 6, background: theme.sunken, border: `1px solid ${theme.rule}`, display: "flex", alignItems: "center", padding: "0 12px", fontFamily: MONO, fontSize: 15, color: theme.ink3 }}>
          {s0.pageUrl}
        </div>
      </div>
      <div style={{ padding: "30px 44px" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, letterSpacing: "-0.012em", color: theme.ink }}>{s0.pageTitle}</div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 15, color: theme.ink3 }}>12 min read</div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 13 }}>
          <Bar w="96%" />
          <Bar w="91%" />
          <Bar w="94%" />
          <Bar w="58%" />
        </div>
        {/* the hidden text: invisible until the scan reveals it, then typed in crimson */}
        <div
          style={{
            marginTop: 26,
            minHeight: 84,
            padding: "12px 18px",
            borderRadius: 8,
            borderLeft: `3px solid ${theme.accent}`,
            background: hiddenOn ? alpha(theme.accent, 0.08) : "transparent",
            fontFamily: MONO,
            fontSize: 19,
            lineHeight: 1.45,
            color: theme.accentInk,
            wordBreak: "break-word",
            visibility: hiddenOn ? "visible" : "hidden",
          }}
        >
          {hiddenShown}
        </div>
        <div style={{ marginTop: 20 }}>
          <Bar w="93%" tone={0.07} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the terminal

const Terminal: React.FC<{ frame: number }> = ({ frame }) => {
  const hits = S0_TIMING.hits;
  if (frame < hits[0]) return null;
  // the red edge flash of the most recent hit
  const last = hits.reduce((acc, h) => (frame >= h ? h : acc), hits[0]);
  const flash = 1 - clamp01((frame - last) / 8);
  return (
    <div
      style={{
        position: "absolute",
        left: TERM.x,
        top: TERM.y,
        width: TERM.w,
        height: TERM.h,
        borderRadius: 12,
        background: theme.sunken,
        border: `1px solid ${alpha(theme.accent, 0.25 + 0.6 * flash)}`,
        boxShadow: `0 30px 80px rgba(0,0,0,.7), 0 0 ${(46 * flash).toFixed(1)}px ${alpha(theme.accent, 0.55 * flash)}, inset 0 0 ${(40 * flash).toFixed(1)}px ${alpha(theme.accent, 0.35 * flash)}`,
        padding: "26px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflow: "hidden",
      }}
    >
      {s0.terminal.map((line, i) => {
        const h = hits[i];
        const p = clamp01((frame - h) / 6);
        if (frame < h) return <div key={i} style={{ height: 34 }} />;
        const k = easeOutBack(p);
        return (
          <div
            key={i}
            style={{
              height: 34,
              fontFamily: MONO,
              fontSize: 24,
              lineHeight: "34px",
              whiteSpace: "pre",
              color: theme.ink,
              opacity: clamp01(p * 2),
              transform: `scale(${(1.22 - 0.22 * k).toFixed(4)})`,
              transformOrigin: "0 50%",
            }}
          >
            <span style={{ color: theme.accentInk }}>{line.slice(0, 2)}</span>
            {line.slice(2)}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

const LINE_BOX = 98; // fixed height per caption line, so line 1 never jumps when line 2 mounts

export const S0Hook: React.FC<SceneOverlayProps> = ({ frame }) => {
  const T = S0_TIMING;
  const cam = getCameraState(frame, S0_CAMERA, FPS);
  const zoom = cam.scale / BASE_SCALE;

  // glitch: 0 -> 1 -> 0 over 12 frames
  const g = clamp01((frame - T.glitch.start) / (T.glitch.end - T.glitch.start));
  const glitch = frame < T.glitch.start || frame > T.glitch.end ? 0 : Math.sin(Math.PI * g) ** 0.6;
  // the page collapses while the glitch plays
  const collapse = signature(clamp01((frame - T.glitch.start) / (T.collapseEnd - T.glitch.start)));
  const pageOn = frame < T.collapseEnd;

  // crush into the dot
  const crush = signature(clamp01((frame - T.crush.start) / (T.crush.end - T.crush.start)));
  const dotOn = frame >= T.crush.start;
  const breathe = frame > T.crush.end ? 1 + 0.03 * Math.sin(((frame - T.crush.end) / 15) * Math.PI) : 1;

  const tagOpacity = clamp01((frame - 12) / 8) * (1 - clamp01((frame - 168) / 10));
  const scale = zoom.toFixed(5);
  const shake = `translate(${cam.shakeX.toFixed(2)}px, ${cam.shakeY.toFixed(2)}px)`;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <GlitchLayer strength={glitch} seed={11}>
        {/* the opaque layer: the stage's own gradient and glow (identical to the film's, so S1 starts seamlessly) */}
        <div style={{ position: "absolute", inset: 0, background: theme.stageGradient, overflow: "hidden" }}>
          <StageGlow />
          <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `${shake} scale(${scale})` }}>
            {pageOn && (
              <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `scale(${(1 - 0.3 * collapse).toFixed(4)})`, opacity: 1 - 0.85 * collapse }}>
                <Page frame={frame} />
                <Spotlight startFrame={T.scan.start} durationFrames={T.scan.frames} rect={PAGE} radius={14} intensity={0.2} />
                <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y + PAGE.h + 34, fontFamily: MONO, fontSize: 28, color: theme.ink2, whiteSpace: "pre" }}>
                  {typedText(s0.agentLine, frame, T.agentLine.start, T.agentLine.opts)}
                </div>
                <Terminal frame={frame} />
              </div>
            )}
          </div>
        </div>
      </GlitchLayer>

      {/* pure #050505 for the first 12 frames */}
      {frame < T.coverEnd && <div style={{ position: "absolute", inset: 0, background: theme.hookBg }} />}

      {/* the tag, bottom-left, for the whole beat */}
      {tagOpacity > 0 && (
        <div style={{ position: "absolute", left: 96, bottom: 72, fontFamily: MONO, fontSize: 20, letterSpacing: "0.06em", color: theme.ink3, opacity: tagOpacity }}>{s0.tag}</div>
      )}

      {/* the caption: two fixed-height lines, "bad day." in accent-ink, drawn into the dot at f270-285 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `${shake} scale(${scale}) scale(${(1 - crush).toFixed(4)})`, opacity: 1 - crush * 0.6, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ height: LINE_BOX, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KineticText text={s0.caption[0]} startFrame={T.captionLine1} fontSize={76} stagger={4} />
          </div>
          <div style={{ height: LINE_BOX, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KineticText text={s0.caption[1]} startFrame={T.captionLine2} fontSize={76} highlight="bad day." stagger={4} />
          </div>
        </div>
      </div>

      {/* the dot: the Mark's core, reached at f285 and held */}
      {dotOn && (
        <div
          style={{
            position: "absolute",
            left: HOOK_DOT.x - HOOK_DOT.r,
            top: HOOK_DOT.y - HOOK_DOT.r,
            width: HOOK_DOT.r * 2,
            height: HOOK_DOT.r * 2,
            borderRadius: "50%",
            background: theme.accent,
            opacity: clamp01(crush * 1.6),
            transform: `scale(${(crush * breathe).toFixed(4)})`,
            boxShadow: `0 0 ${(70 * crush).toFixed(1)}px ${alpha(theme.accent, 0.55)}, 0 0 ${(160 * crush).toFixed(1)}px ${alpha(theme.accent, 0.25)}`,
          }}
        />
      )}
    </div>
  );
};

/** Frames at which the typed lines finish (checks and later patches read them). */
export const S0_TYPING_END = {
  agent: typingEndFrame(s0.agentLine, S0_TIMING.agentLine.start, S0_TIMING.agentLine.opts),
  hidden: typingEndFrame(s0.hiddenText, S0_TIMING.hidden.start, S0_TIMING.hidden.opts),
} as const;

if (S0_TYPING_END.agent > 52 || S0_TYPING_END.hidden > 96) {
  throw new Error(`S0: typed lines must finish by f52 (agent) and f96 (hidden); got ${S0_TYPING_END.agent} and ${S0_TYPING_END.hidden}`);
}
