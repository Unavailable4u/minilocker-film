// S0 Hook (f0-299) "Six agents, one bad day" (BIBLE 6; opening redrawn in patch 27).
//
// What you see
//   f12-60    six agent screens rise into a 3 x 2 grid under the line "Six agents. Six ordinary tasks." Each is given a plain job and types one command.
//   f105-150  the screens fail one by one, on the four beats f105 / f120 / f135 / f150 (the four `slam` sounds): a red flash and a verdict chip
//             ("read a private key", "deleted everything", ...). Two screens fail on the same beat as another (f120, f135).
//   f165-177  the glitch. The screens drop to 30 % and 2 px of blur under it, so they stay on stage as a texture.
//   f180-270  the caption lands ON TOP of the dimmed screens ("Agents with a shell and a browser / are one bad page away from a bad day.").
//   f248-272  the screens are gone; f270-285 the caption is drawn into the dot that S1 starts from (HOOK_DOT); the dot holds until f299.
//
// STAGE-space overlay: one OPAQUE layer (so the glitch can add its three channel copies back together) holding the stage background and the six screens.
// The caption, the tag and the dot sit above it. Everything is a pure function of the GLOBAL frame. The film's camera is not used to move pixels here
// (the app is not mounted before f540): S0_CAMERA gives the 3% punches and the slow push, and this file applies the camera's scale and shake to its content.
//
// Things other files read from here, which must keep their names and meaning: S0_CAMERA / S0_CURSOR (the camera chain of S1), HOOK_DOT (S1's dot),
// S0_TIMING.hits and S0_TIMING.glitch (the sound effects, src/config/sfx.ts).
import React from "react";
import { getCameraState } from "../fx/Camera";
import { KineticText } from "../fx/KineticText";
import { StageBackground } from "../fx/StageBackground";
import { GlitchLayer } from "../ui/GlitchLayer";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { copy } from "../config/copy";
import { alpha, fonts, theme } from "../config/theme";
import { FPS, STAGE } from "../config/timeline";
import { clamp01, easeOutBack, signature } from "../lib/ease";
import { spr } from "../lib/spring";
import { typedText, typingEndFrame, type TypingOpts } from "../lib/typing";
import { MONO_ADVANCE, estimateWidth } from "../fx/util";
import type { SceneOverlayProps } from "./types";

const s0 = copy.s0;
const MONO = fonts.mono;
const SERIF = fonts.serif;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

const TASK_OPTS: TypingOpts = { cps: 55 };
const COMMAND_OPTS: TypingOpts = { cps: 60, pausePunct: 0.8, pauseSpace: 0.3 };

export const S0_TIMING = {
  /** pure #050505 until this frame */
  coverEnd: 12,
  /** screen i starts to rise on `start + i * stagger` */
  rise: { start: 12, stagger: 5 },
  /** the line over the grid */
  label: { start: 26 },
  /** screen i types its task from `start + i * stagger`, then its command 5 frames after the task is done */
  type: { start: 30, stagger: 6, taskOpts: TASK_OPTS, commandOpts: COMMAND_OPTS },
  /** the four beats the screens fail on (the `slam` sounds) */
  hits: [105, 120, 135, 150] as const,
  /** the frame screen i fails on, one of `hits` (2 and 5 fail with another screen) */
  landAt: [105, 120, 135, 150, 120, 135] as const,
  /** the glitch: 12 frames in total, peaking in the middle */
  glitch: { start: 165, end: 177 },
  /** the screens drop to `to` (0.3 = 30 %) of their opacity, and `blurPx` px of blur, between these frames; the caption lands on them. Raise `to` to see them more. */
  dim: { start: 165, end: 185, to: 0.3, blurPx: 2 },
  /** the screens leave completely, before the crush into the dot */
  out: { start: 248, end: 272 },
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

// ---------------------------------------------------------------------------------------------- the six screens

/** One screen (stage px) and the gaps of the 3 x 2 grid. The grid is centred left to right; its top leaves room for the line above it. */
const CARD = { w: 430, h: 250 } as const;
const GAP = 36;
const COLS = 3;
const GRID = {
  x: (STAGE.w - (COLS * CARD.w + (COLS - 1) * GAP)) / 2,
  y: 262,
} as const;
const LABEL_Y = 168;

const FONT = 17;
const PAD = 22;

const Screen: React.FC<{ frame: number; i: number }> = ({ frame, i }) => {
  const T = S0_TIMING;
  const spec = s0.screens[i];
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = GRID.x + col * (CARD.w + GAP);
  const y = GRID.y + row * (CARD.h + GAP);

  const riseStart = T.rise.start + i * T.rise.stagger;
  const rise = spr(frame, FPS, riseStart, "panel");
  if (rise <= 0.001) return null;

  const land = T.landAt[i];
  const failed = frame >= land;
  const flash = failed ? 1 - clamp01((frame - land) / 9) : 0;
  const chipK = failed ? easeOutBack(clamp01((frame - land) / 7)) : 0;

  const taskStart = T.type.start + i * T.type.stagger;
  const cmdStart = typingEndFrame(spec.task, taskStart, T.type.taskOpts) + 5;
  const task = typedText(spec.task, frame, taskStart, T.type.taskOpts);
  const cmd = typedText(spec.command, frame, cmdStart, T.type.commandOpts);

  // the bar creeps along while the agent works and stops where it failed
  const progress = 0.86 * clamp01((frame - riseStart - 10) / (land - riseStart - 10));
  const dots = ".".repeat(1 + (Math.floor(frame / 8) % 3));
  // a little knock on the failed screen
  const knock = failed ? Math.sin(((frame - land) / 9) * Math.PI * 2) * 3 * (1 - clamp01((frame - land) / 9)) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CARD.w,
        height: CARD.h,
        boxSizing: "border-box",
        borderRadius: 14,
        background: theme.sheet,
        border: `1.5px solid ${failed ? alpha(theme.bad, 0.35 + 0.6 * flash) : theme.rule2}`,
        boxShadow: `0 28px 70px rgba(0,0,0,.65), 0 0 ${(40 * flash).toFixed(1)}px ${alpha(theme.bad, 0.5 * flash)}, inset 0 0 ${(34 * flash).toFixed(1)}px ${alpha(theme.bad, 0.3 * flash)}`,
        opacity: clamp01(rise * 1.4),
        transform: `translate(${knock.toFixed(2)}px, ${((1 - Math.min(1, rise)) * 90).toFixed(2)}px)`,
        overflow: "hidden",
      }}
    >
      {/* header: a dot, the agent's name, its state */}
      <div style={{ height: 42, display: "flex", alignItems: "center", gap: 10, padding: `0 ${PAD}px`, borderBottom: `1px solid ${theme.rule}`, background: theme.raised }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: failed ? theme.bad : theme.ink3 }} />
        <div style={{ fontFamily: MONO, fontSize: 16, color: theme.ink2, letterSpacing: "0.04em" }}>{spec.agent}</div>
        <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 15, color: theme.ink3, whiteSpace: "pre" }}>{failed ? "" : `${s0.running}${dots}`}</div>
      </div>

      <div style={{ padding: `18px ${PAD}px 0`, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 24, fontFamily: MONO, fontSize: FONT, lineHeight: "24px", color: theme.ink2, whiteSpace: "pre" }}>
          <span style={{ color: theme.ink3 }}>{task.length > 0 ? "agent > " : ""}</span>
          {task}
        </div>
        <div style={{ height: 24, fontFamily: MONO, fontSize: FONT, lineHeight: "24px", color: theme.ink, whiteSpace: "pre" }}>
          {cmd.length > 0 ? (
            <>
              <span style={{ color: theme.accentInk }}>{cmd.slice(0, 2)}</span>
              {cmd.slice(2)}
            </>
          ) : null}
        </div>
        <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: theme.rule, overflow: "hidden" }}>
          <div style={{ width: `${(progress * 100).toFixed(2)}%`, height: "100%", borderRadius: 4, background: failed ? theme.bad : theme.ink3 }} />
        </div>
      </div>

      {/* the verdict: lands on the beat, hatched as well as red (red never carries the meaning alone) */}
      {failed && (
        <div
          style={{
            position: "absolute",
            left: PAD,
            bottom: 20,
            height: 38,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderRadius: 8,
            border: `1.5px solid ${theme.bad}`,
            background: `${theme.hatchBad}, ${theme.badWash}`,
            fontFamily: MONO,
            fontSize: FONT,
            color: theme.bad,
            whiteSpace: "nowrap",
            opacity: clamp01(chipK * 2),
            transformOrigin: "0 50%",
            transform: `scale(${(1.18 - 0.18 * chipK).toFixed(4)})`,
          }}
        >
          {spec.verdict}
        </div>
      )}
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

  // the screens: full -> dimmed under the glitch -> gone before the crush
  const dim = signature(clamp01((frame - T.dim.start) / (T.dim.end - T.dim.start)));
  const out = signature(clamp01((frame - T.out.start) / (T.out.end - T.out.start)));
  const screensOpacity = (1 - (1 - T.dim.to) * dim) * (1 - out);
  const screensBlur = T.dim.blurPx * dim;
  const screensScale = 1 - 0.05 * dim - 0.06 * out;
  const screensOn = frame < T.out.end;

  // crush into the dot
  const crush = signature(clamp01((frame - T.crush.start) / (T.crush.end - T.crush.start)));
  const dotOn = frame >= T.crush.start;
  const breathe = frame > T.crush.end ? 1 + 0.03 * Math.sin(((frame - T.crush.end) / 15) * Math.PI) : 1;

  const tagOpacity = clamp01((frame - 12) / 8) * (1 - clamp01((frame - 168) / 10));
  const labelIn = signature(clamp01((frame - T.label.start) / 16));
  const labelOpacity = labelIn * (1 - dim);
  const scale = zoom.toFixed(5);
  const shake = `translate(${cam.shakeX.toFixed(2)}px, ${cam.shakeY.toFixed(2)}px)`;

  // a soft dark pool behind the caption, so the words read over the dimmed screens
  const poolOpacity = clamp01((frame - 172) / 14) * (1 - crush);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <GlitchLayer strength={glitch} seed={11}>
        {/* the opaque layer: the stage background (the same picture the film draws, so S1 starts seamlessly) and the six screens */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <StageBackground />
          <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%", transform: `${shake} scale(${scale})` }}>
            {screensOn && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "50% 50%",
                  transform: `scale(${screensScale.toFixed(4)})`,
                  opacity: screensOpacity,
                  filter: screensBlur > 0.05 ? `blur(${screensBlur.toFixed(2)}px)` : undefined,
                }}
              >
                {labelOpacity > 0.001 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: LABEL_Y + (1 - labelIn) * 18,
                      width: STAGE.w,
                      textAlign: "center",
                      fontFamily: SERIF,
                      fontStyle: "italic",
                      fontWeight: 500,
                      fontSize: 40,
                      color: theme.ink2,
                      opacity: labelOpacity,
                    }}
                  >
                    {s0.label}
                  </div>
                )}
                {s0.screens.map((_, i) => (
                  <Screen key={i} frame={frame} i={i} />
                ))}
              </div>
            )}
          </div>
          {poolOpacity > 0.001 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: poolOpacity,
                background: "radial-gradient(ellipse 1250px 380px at 50% 50%, rgba(5,5,6,0.5), rgba(5,5,6,0) 72%)",
              }}
            />
          )}
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

// ---------------------------------------------------------------------------------------------- import-time checks

/** Frames at which each screen finishes typing its command (checks and later patches read them). */
export const S0_TYPING_END = s0.screens.map((spec, i) => {
  const T = S0_TIMING;
  const taskStart = T.type.start + i * T.type.stagger;
  const cmdStart = typingEndFrame(spec.task, taskStart, T.type.taskOpts) + 5;
  return typingEndFrame(spec.command, cmdStart, T.type.commandOpts);
});

(() => {
  const T = S0_TIMING;
  if (s0.screens.length !== T.landAt.length) throw new Error(`S0: ${s0.screens.length} screens in copy.ts but ${T.landAt.length} fail frames in S0_TIMING.landAt`);
  s0.screens.forEach((spec, i) => {
    if (!T.hits.includes(T.landAt[i] as (typeof T.hits)[number])) throw new Error(`S0: screen ${i + 1} fails on f${T.landAt[i]}, which is not one of the four beats ${T.hits.join(", ")}`);
    if (S0_TYPING_END[i] > T.landAt[i] - 6) throw new Error(`S0: screen ${i + 1} finishes typing on f${S0_TYPING_END[i]}, too close to its failure on f${T.landAt[i]}`);
    const inner = CARD.w - 2 * PAD;
    const w = estimateWidth(spec.command, FONT, MONO_ADVANCE);
    if (w > inner) throw new Error(`S0: the command "${spec.command}" is about ${Math.round(w)} px wide, more than the ${inner} px inside a screen`);
    const verdictW = estimateWidth(spec.verdict, FONT, MONO_ADVANCE) + 32;
    if (verdictW > inner) throw new Error(`S0: the verdict "${spec.verdict}" is about ${Math.round(verdictW)} px wide, more than the ${inner} px inside a screen`);
  });
  const gridBottom = GRID.y + 2 * CARD.h + GAP;
  if (!(gridBottom <= STAGE.h - 96 - 40)) throw new Error(`S0: the grid reaches y ${gridBottom}, into the tag's row`);
  if (!(T.glitch.start >= T.landAt[T.landAt.length - 1] + 6)) throw new Error("S0: the glitch must start after the last screen has failed");
  if (!(T.out.end <= T.crush.start + 2)) throw new Error("S0: the screens must be gone as the crush into the dot starts");
})();
