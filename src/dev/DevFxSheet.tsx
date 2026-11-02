// DEV ONLY (patch 03). One composition that exercises the whole FX toolkit (360 frames, 12 s):
//   - the virtual camera moving between three focus targets (taskForm, blastPanel, dial) and back to the full window,
//     with tilt and a seeded 8-frame impact shake on f180 (a beat), plus the perspective grid on the first two seconds
//   - a cursor path with a click on f96 and another on the f180 impact, hidden for a while and shown again
//   - a caption (masked line-rise), a kinetic text line, the three callout variants (note, ok, flag) anchored to focus targets
//   - numerals counting, two badges with pulsing dots, a toast, a key cap, glow, spotlight sweep, grain and vignette
// The "window" is a stand-in made of the focus rectangles of src/config/focus.ts, so it needs no UI patch.
// Labels and values here are developer notes and made-up demo numbers; none of this is film copy or evidence.
// Check it with:  npx remotion studio src/index.ts   (open DevFxSheet, scrub the timeline)
//             or: npx remotion still src/index.ts DevFxSheet out/qa/fx.png --frame=200
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "../ui/theme.css";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { FOCUS, FOCUS_NAMES, rectCenter, rectPoint } from "../config/focus";
import { alpha, fonts, theme } from "../config/theme";
import { badges, s0, s2, s3, s4 } from "../config/copy";
import { STAGE } from "../config/timeline";
import { FontsReady } from "../lib/fonts";
import { Badge, badgePulse, badgeReveal } from "../fx/Badge";
import { Callout } from "../fx/Callout";
import { Camera, getCameraState } from "../fx/Camera";
import { Caption } from "../fx/Caption";
import { Cursor } from "../fx/Cursor";
import { Glow } from "../fx/Glow";
import { Grain } from "../fx/Grain";
import { GridPaper } from "../fx/GridPaper";
import { KeyCap } from "../fx/KeyCap";
import { KineticText } from "../fx/KineticText";
import { Spotlight } from "../fx/Spotlight";
import { StatNumeral } from "../fx/StatNumeral";
import { Toast } from "../fx/Toast";
import { Vignette } from "../fx/Vignette";

export const DEV_FX_FRAMES = 360;

/** The camera of the sheet. f180 is a beat: the push-in to the dial lands with a shake. */
export const DEV_FX_CAMERA: readonly CameraKeyframe[] = [
  kf(0, "fullWindow"),
  kf(60, "taskForm", { padding: 170, rotateY: -3, rotateX: 1.5 }),
  kf(120, "blastPanel", { padding: 120, rotateY: 3, rotateX: -1 }),
  kf(180, "dial", { padding: 200, rotateY: 2, shake: 8 }),
  kf(270, "fullWindow", { ease: "signature", frames: 40 }),
];

const FORM_RUN = rectPoint(FOCUS.taskForm, 0.5, 0.93);
const FORM_TOP = rectPoint(FOCUS.taskForm, 0.5, 0.3);
const DIAL_C = rectCenter(FOCUS.dial);
const NET_C = rectCenter(FOCUS.gaugeNetwork);
const TERM_C = rectPoint(FOCUS.terminal, 0.5, 0.5);

/** The cursor path: appears on the form, clicks Run on f96, glides to the dial and clicks on the f180 impact, hides, returns. */
export const DEV_FX_CURSOR: readonly CursorWaypoint[] = [
  { frame: 70, x: FORM_TOP.x, y: FORM_TOP.y, hover: "scenario" },
  { frame: 96, x: FORM_RUN.x, y: FORM_RUN.y, click: true, hover: "run-button" },
  { frame: 150, x: NET_C.x, y: NET_C.y, hover: "gauge-network" },
  { frame: 180, x: DIAL_C.x, y: DIAL_C.y, click: true, hover: "dial" },
  { frame: 215, x: DIAL_C.x + 40, y: DIAL_C.y + 30, hide: true },
  { frame: 300, x: TERM_C.x, y: TERM_C.y, hover: "terminal" },
];

const mono = (size: number, color: string = theme.ink2): React.CSSProperties => ({
  fontFamily: fonts.mono,
  fontSize: size,
  color,
  lineHeight: 1.2,
});

/** A stand-in for the app window: the header, the three columns, and every named focus rectangle outlined and labelled. */
const FakeWindow: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: 1600,
      height: 900,
      background: theme.paper,
      border: `1px solid ${theme.rule}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: theme.liftShadow,
    }}
  >
    <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 60, background: theme.sheet, borderBottom: `1px solid ${theme.rule}` }} />
    <div style={{ position: "absolute", left: 374, top: 60, width: 1, height: 840, background: theme.rule }} />
    <div style={{ position: "absolute", left: 1141, top: 60, width: 1, height: 840, background: theme.rule }} />
    {FOCUS_NAMES.filter((n) => n !== "fullWindow").map((name, i) => {
      const r = FOCUS[name];
      const tint = i % 2 === 0 ? theme.accent : theme.accent2;
      return (
        <div
          key={name}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: r.w,
            height: r.h,
            border: `1px dashed ${alpha(tint, 0.35)}`,
            background: alpha(tint, 0.035),
            borderRadius: 6,
          }}
        >
          <span style={{ position: "absolute", left: 8, top: 6, ...mono(20, theme.ink3) }}>{name}</span>
        </div>
      );
    })}
  </div>
);

/** The cursor, sized so it stays the same size on screen while the camera zooms. */
const CursorLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = getCameraState(frame, DEV_FX_CAMERA, fps, { wideTilt: false }).scale;
  return <Cursor waypoints={DEV_FX_CURSOR} zoom={zoom} />;
};

export const DevFxSheet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <FontsReady>
      <AbsoluteFill className="film-root" style={{ background: theme.stageGradient }}>
        {/* background: the grid on a receding floor for the first two seconds, then flat */}
        <GridPaper perspective={frame < 60} speed={frame < 60 ? 0.6 : 0} />

        {/* the camera and everything that lives in the window's logical space */}
        <Camera keyframes={DEV_FX_CAMERA} wideTilt={false}>
          <FakeWindow />
          <Glow x={DIAL_C.x} y={DIAL_C.y} radius={240} startFrame={170} endFrame={310} period={60} />
          <CursorLayer />
        </Camera>

        {/* everything below lives in STAGE space, outside the camera */}
        <Spotlight startFrame={6} durationFrames={44} />

        <div style={{ position: "absolute", left: 0, top: 96, width: STAGE.w, display: "flex", justifyContent: "center" }}>
          <KineticText text={[...s0.caption]} startFrame={4} endFrame={58} fontSize={56} highlight="bad" underline={{ word: "browser" }} />
        </div>

        {/* callouts: the three variants, anchored to focus targets, following the camera */}
        <Callout text={s3.calloutRandom} variant="note" target="dial" camera={DEV_FX_CAMERA} side="right" startFrame={130} endFrame={176} />
        <Callout text={s2.calloutCheck} variant="ok" target="gaugeNetwork" camera={DEV_FX_CAMERA} side="left" startFrame={138} endFrame={176} />
        <Callout text={s3.calloutAlarm} variant="flag" target="gaugeSecrets" camera={DEV_FX_CAMERA} side="right" startFrame={146} endFrame={176} />
        <Callout text={s4.calloutUndone} variant="ok" target="dial" camera={DEV_FX_CAMERA} side="top" startFrame={194} endFrame={250} />

        {/* captions */}
        <Caption text={s2.caption} highlight="Real" sub="masked line-rise, signature ease" startFrame={20} endFrame={116} />
        <Caption text={s4.captionReal} highlight="Real" startFrame={190} endFrame={290} />

        {/* status rail, top left */}
        <div style={{ position: "absolute", left: 40, top: 28, display: "flex", gap: 16, alignItems: "center" }}>
          <Badge label={badges.proofLive} tone="bad" pulse={badgePulse(frame)} reveal={badgeReveal(frame, 8)} />
          <Badge label={badges.proofReconstructed} tone="info" pulse={badgePulse(frame, 60)} reveal={badgeReveal(frame, 20)} />
        </div>
        <div style={{ position: "absolute", left: 40, top: 96, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={mono(20)}>dev numerals (made-up)</div>
          <StatNumeral value={12345} group startFrame={10} durationFrames={60} size={72} unit="events" />
          <StatNumeral value={87.5} decimals={1} startFrame={30} durationFrames={45} size={72} unit="%" />
        </div>

        <div style={{ position: "absolute", left: 40, bottom: 40, display: "flex", gap: 14, alignItems: "flex-end" }}>
          <KeyCap label="Enter" startFrame={70} pressAt={[96]} />
          <KeyCap label="Y" startFrame={74} pressAt={[96, 180]} />
        </div>

        <Toast title="decoy read" text="alarm raised (dev sample)" tone="warn" startFrame={196} endFrame={262} />
        <Toast title="denied" text="egress refused (dev sample)" tone="bad" startFrame={236} endFrame={300} corner="tl" width={460} />

        <Vignette />
        <Grain />
      </AbsoluteFill>
    </FontsReady>
  );
};
