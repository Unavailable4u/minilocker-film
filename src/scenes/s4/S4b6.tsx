// S4b6 (f3030-3299) "The proof" (BIBLE 6, S4b; BIBLE 7.5). Patch 16f: the last sixth of S4b.
//
// What this part does (all in stage space, over the Attack Lab, which 16e left dimmed under its scrim)
//   - f3030-3041 the ledger layer (the chain, the seal, the callout, the button and 16e's scrim) leaves (`s4LedgerOpacity`); this part's own scrim (`S4b6Scrim`, mounted UNDER the
//     ledger layer in S4b.tsx) takes over frame for frame (`s4ProofScrim`), so the Lab behind stays dimmed to 95 % and the chain fades over it instead of being covered.
//   - f3030-3059 the PROOF GROUP rises (36 px, signature, complete on the caption's beat f3060): on the left 62 % a window (16:9, hairline frame), on the right 38 % a stack of
//     three StatNumerals. The group is one block in stage space, laid out so that it is still inside the 96 px safe margin after its 4 % push.
//   - THE WINDOW is one of two things, decided by public/proof/manifest.json (written by `npm run proof`, scripts/check-proof.mjs; imported at build time, no file system at render):
//       present   the recorded clip (`PROOF.file`, public/proof/rewind.mp4) plays through <OffthreadVideo>, muted (the clip's own audio is never used), cut to `PROOF.startFrom`-
//                 `PROOF.endAt` (script.ts). Badge: "LIVE - recorded on the Vultr VM - unedited" (copy.badges.proofLiveLine). While the window rises the first frame of the cut is held,
//                 the clip plays from the caption's beat f3060 for `endAt - startFrom` frames, and its last frame is held until the window leaves (at most 45 frames: S4 (16f) checks).
//       absent    a code replay of the real step timeline of the attack, read from the evidence (`data.chain`, the same ledger events as 16e's blocks): the write, the snapshot, the
//                 wipe and its output (vermilion), the verified rewind (the ledger's own line) and the files re-hashed, the cat and the restored line. Rows land on beats from f3075.
//                 Badge: "RECONSTRUCTED FROM LEDGER". The word LIVE appears nowhere in this branch (checked at import time).
//   - f3075, f3105, f3135 the three numerals count (30 frames each, StatNumeral's ease): files re-hashed (`data.outcome.files`), checks passed ("of" the total) and the run's seconds
//     (`data.outcome.seconds`, the AttackResult's `duration_s`). Their blocks rise on the same beats. All three are the attack's result, never typed.
//   - f3060-3285 the caption "Real wipe. Real rewind. Real hashes." (copy.s4.captionReal).
//   - f3030-3285 the group pushes in 4 % (linear, about its centre) while the app behind creeps out to `fullWindow` (padding 60): the explainer moves AND the app moves against it.
//   - f3285-3292 the group leaves (8 frames), f3285-3298 the scrim (14, signature); the app is bright and whole on f3299, the stage empty. S5 starts on the beat f3300 with its whip from `fullWindow`.
//
// The cursor: none (hidden since f2220; the part's cursor array is empty).
//
// Guards (import-time): the manifest and the trim agree (PROOF.endAt inside the clip when its length is known), the badge words are the true ones (LIVE only with the clip),
// the group is inside the safe margins at the end of its push and clear of the caption, the replay's rows fit the window, the camera's first keyframe starts after 16e's last frame
// and has arrived by f3299 with `fullWindow` inside the stage. `s4Data()` throws, naming what is missing, if the evidence cannot support the numerals or the replay.
//
// Hand-offs. 16e ended on `attackVerdict`, padding 96, bias 1.06 (arrived f3029): this part's one keyframe starts on f3030 from that pose (linear, 269 frames) and arrives on
// `fullWindow`, padding 60, on f3299 (S5's own interim pose, patch 17 and patch 25's note). S5 (f3300) whips from there. Nothing is drawn in stage space from f3299.
import React from "react";
import { Freeze, OffthreadVideo, Sequence, staticFile } from "remotion";
import { Badge, badgePulse, badgeReveal } from "../../fx/Badge";
import { Caption } from "../../fx/Caption";
import { getCameraState, worldToStage } from "../../fx/Camera";
import { StatNumeral } from "../../fx/StatNumeral";
import { MONO_ADVANCE, SERIF_ADVANCE } from "../../fx/util";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { copy } from "../../config/copy";
import { focusRect } from "../../config/focus";
import { PROOF } from "../../config/script";
import { alpha, fonts, hatch, layout, theme } from "../../config/theme";
import { SCENES, STAGE } from "../../config/timeline";
import { describe, toolLine } from "../../lib/derive";
import { riseProgress, riseStyle } from "../../lib/rise";
import type { LedgerEvent } from "../../data/types";
import type { SceneOverlayProps } from "../types";
import proofManifestJson from "../../../public/proof/manifest.json";
import { S4B1_CAMERA } from "./S4b1";
import { S4B2_CAMERA } from "./S4b2";
import { S4B3_CAMERA } from "./S4b3";
import { S4B4_CAMERA } from "./S4b4";
import { S4B5_CAMERA } from "./S4b5";
import { S4A3_CAMERA } from "./S4a3";
import { s4Data, type ChainRole } from "./data";
import { S4_TIMING, s4ProofGroupExit, s4ProofPush, s4ProofRise, s4ProofScrim } from "./shared";

// ---------------------------------------------------------------------------------------------- the manifest (is there a clip?)

interface ProofManifest {
  present: boolean;
  durationFrames: number | null;
}

const manifest = proofManifestJson as ProofManifest;

/** True when public/proof/manifest.json (written by `npm run proof`) says public/proof/rewind.mp4 is there. Decided at build time, never from the file system while rendering. */
export const HAS_PROOF_CLIP: boolean = manifest.present === true;

/** How many film frames the clip (or the replay) plays: the cut's length. */
const PLAY_FRAMES = PROOF.endAt - PROOF.startFrom;

// ---------------------------------------------------------------------------------------------- camera and cursor

/** One keyframe, after f3029: a linear creep from 16e's pose out to the whole window (padding 60), arriving on the last frame of S4 (f3299). */
export const S4B6_CAMERA: readonly CameraKeyframe[] = [
  kf(S4_TIMING.ledgerOut.from, "fullWindow", { padding: 60, scaleBias: 1, ease: "linear", frames: S4_TIMING.partEndB6 - S4_TIMING.ledgerOut.from }),
];

/** No waypoints: the cursor stays hidden (see the header). */
export const S4B6_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- layout (stage px)

/**
 * The group's width at scale 1: with the 4 % push it is 1726 px at the end, inside the 1728 px between the safe margins. The window is 62 % of it, the numerals' column 38 %
 * (with a gutter inside the column, on its left).
 */
const GROUP_W = 1660;
const GROUP_X = Math.round((STAGE.w - GROUP_W) / 2);
const WINDOW_W = Math.round(GROUP_W * 0.62);
const WINDOW_H = Math.round((WINDOW_W * 9) / 16); // the clip is 16:9
const COLUMN_W = GROUP_W - WINDOW_W;
const GUTTER = 48;
const BADGE_H = 42; // Badge at size 22: height 1.9 x size
const BADGE_GAP = 22;
const GROUP_H = BADGE_H + BADGE_GAP + WINDOW_H;
/** Top of the group: centred in the band between the top safe margin and the caption's top (about 891 for one 72 px line 110 px above the bottom). */
const CAPTION_TOP = STAGE.h - layout.captionBottom - 80;
const GROUP_Y = Math.round(layout.safeMargin + (CAPTION_TOP - layout.safeMargin - GROUP_H) / 2);
const FRAME_R = 14;

const STAT_NUMERAL = 112;
const STAT_LABEL = 26;

// ---------------------------------------------------------------------------------------------- the reconstruction (the replay of the ledger's steps)

type Tone = "cmd" | "out" | "bad" | "info" | "ok";
interface ReplayRow {
  tone: Tone;
  text: string;
  /** Film frame at which the row lands (a beat). */
  at: number;
}

/** What a tool.call event ran: the shell command itself, or the tool and its path. */
function callText(e: LedgerEvent): string {
  const line = toolLine(e.payload);
  return e.payload.tool === "run_shell" ? String(line) : `${String(e.payload.tool)} ${String(line)}`;
}

/** The roles of 16e's chain, in the order the rows come: what each ledger event contributes to the replay. */
const ROW_AT: readonly number[] = [3075, 3090, 3105, 3120, 3150, 3165, 3195, 3210];

let cachedRows: ReplayRow[] | null = null;

/** The eight rows of the replay, read from the evidence (`s4Data().chain` is picked by what the events ARE). Throws, naming what is missing. */
function replayRows(): ReplayRow[] {
  if (cachedRows) return cachedRows;
  const d = s4Data();
  const ev = (role: ChainRole): LedgerEvent => {
    const found = d.chain.find((c) => c.role === role);
    if (!found) throw new Error(`S4b6: the chain has no ${role} event (the replay shows it)`);
    return found.event;
  };
  const rewound = describe(ev("rewound"));
  if (!rewound) throw new Error("S4b6: the timeline.rewound event has no ledger line (derive.describe)");
  const rehashed = `${d.rewound.files} ${d.rewound.files === 1 ? copy.gfxB.fileRehashed : copy.gfxB.filesRehashed} - ${copy.gfxB.allMatched}`;
  const rows: Omit<ReplayRow, "at">[] = [
    { tone: "cmd", text: `$ ${callText(ev("write"))}` },
    { tone: "info", text: `${copy.gfxB.snapshot} ${d.snapshot.n}  ${d.snapshot.short}` },
    { tone: "bad", text: `$ ${callText(ev("delete"))}` },
    { tone: "bad", text: d.wipe.token },
    { tone: "ok", text: rewound.text },
    { tone: "ok", text: rehashed },
    { tone: "cmd", text: `$ ${callText(ev("cat"))}` },
    { tone: "out", text: d.cat.line },
  ];
  cachedRows = rows.map((r, i) => ({ ...r, at: ROW_AT[i] }));
  return cachedRows;
}

const REPLAY = { font: 28, lineHeight: 1.45, padX: 36, padY: 26, header: 64 } as const;
const REPLAY_ROW_GAP = 6;

/** How many lines a row takes in the replay (it wraps; the wipe command is two lines in the sample). */
function rowLines(text: string): number {
  const perLine = Math.floor((WINDOW_W - 2 * REPLAY.padX - 24) / (REPLAY.font * MONO_ADVANCE));
  return Math.max(1, Math.ceil(text.length / perLine));
}

const TONE_COLOR: Record<Tone, string> = {
  cmd: theme.ink,
  out: theme.ink2,
  bad: theme.bad,
  info: theme.info,
  ok: theme.ok,
};

// ---------------------------------------------------------------------------------------------- import-time checks

/** The camera's rectangle, at the end, is inside the stage with at least this much stage round it. */
const RECT_EDGE = 24;

(() => {
  const t = S4_TIMING;
  const bad = (m: string): never => {
    throw new Error(`S4b6: ${m}`);
  };

  // the camera
  if (!(S4B6_CAMERA[0].frame > t.partEndB5)) bad("the first keyframe must start after 16e's last frame (f3029)");
  const last = S4B6_CAMERA[S4B6_CAMERA.length - 1];
  if (!(last.frame + (last.frames ?? 0) <= t.partEndB6)) bad("the camera must have arrived by the last frame of S4 (f3299): S5's first keyframe starts on f3300");
  const poses = [...S4A3_CAMERA, ...S4B1_CAMERA, ...S4B2_CAMERA, ...S4B3_CAMERA, ...S4B4_CAMERA, ...S4B5_CAMERA, ...S4B6_CAMERA];
  const cam = getCameraState(t.partEndB6, poses, undefined, { wideTilt: false });
  const r = focusRect("fullWindow");
  const a = worldToStage(cam, { x: r.x, y: r.y });
  const b = worldToStage(cam, { x: r.x + r.w, y: r.y + r.h });
  if (!(a.x >= RECT_EDGE && a.y >= RECT_EDGE && b.x <= STAGE.w - RECT_EDGE && b.y <= STAGE.h - RECT_EDGE)) {
    bad(`on f${t.partEndB6} \`fullWindow\` is at stage x ${a.x.toFixed(0)}-${b.x.toFixed(0)}, y ${a.y.toFixed(0)}-${b.y.toFixed(0)}: it must be inside the stage with ${RECT_EDGE} px round it`);
  }

  // the clip and the manifest agree
  if (HAS_PROOF_CLIP && typeof manifest.durationFrames === "number" && PROOF.endAt > manifest.durationFrames) {
    bad(`PROOF.endAt (${PROOF.endAt}) is past the end of the proof clip (${manifest.durationFrames} frames, public/proof/manifest.json): lower PROOF.startFrom / PROOF.endAt in src/config/script.ts, or record a longer clip, then run \`npm run proof\``);
  }
  if (!(PROOF.startFrom >= 0 && Number.isInteger(PROOF.startFrom))) bad("PROOF.startFrom must be a whole number of frames, 0 or more");

  // the badge says what is true
  if (!/\bLIVE\b/.test(copy.badges.proofLiveLine)) bad("the badge of the clip must say LIVE (copy.badges.proofLiveLine)");
  if (/\blive\b/i.test(copy.badges.proofReconstructed)) bad("the badge of the reconstruction must never contain the word LIVE (copy.badges.proofReconstructed)");

  // the group is inside the safe margins after its push, and clear of the caption
  const scale = t.proofPush.scale;
  const cx = GROUP_X + GROUP_W / 2;
  const cy = GROUP_Y + GROUP_H / 2;
  const left = cx - (GROUP_W / 2) * scale;
  const right = cx + (GROUP_W / 2) * scale;
  const top = cy - (GROUP_H / 2) * scale;
  const bottom = cy + (GROUP_H / 2) * scale;
  if (!(left >= layout.safeMargin - 2 && right <= STAGE.w - layout.safeMargin + 2)) bad(`the group runs from x ${left.toFixed(0)} to ${right.toFixed(0)} at the end of its push: it must stay inside the ${layout.safeMargin} px margins`);
  if (!(top >= layout.safeMargin && bottom <= CAPTION_TOP - 24)) bad(`the group runs from y ${top.toFixed(0)} to ${bottom.toFixed(0)} at the end of its push: it must stay below y ${layout.safeMargin} and 24 px above the caption (y ${CAPTION_TOP})`);

  // the caption fits one line
  const captionW = copy.s4.captionReal.length * 72 * SERIF_ADVANCE;
  if (!(captionW <= STAGE.w - 2 * layout.safeMargin)) bad("the caption does not fit one line at 72 px");

  // the evidence supports the numerals and the replay (s4Data throws, naming the missing path); the replay's rows fit the window and land after the window is up
  const d = s4Data();
  if (!(d.outcome.files >= 1 && d.outcome.checksTotal >= 1)) bad("the attack's result has no files re-hashed or no checks: the numerals would show nothing");
  const rows = replayRows();
  const capacity = Math.floor((WINDOW_H - REPLAY.header - 2 * REPLAY.padY) / (REPLAY.font * REPLAY.lineHeight + REPLAY_ROW_GAP / 2));
  const used = rows.reduce((n, row) => n + rowLines(row.text), 0);
  if (!(used <= capacity)) bad(`the replay needs ${used} lines and the window holds ${capacity}: shorten the commands or lower REPLAY.font`);
  for (let i = 0; i < rows.length; i++) {
    if (!(rows[i].at % 15 === 0)) bad(`replay row ${i} lands on f${rows[i].at}: every reveal lands on a beat`);
    if (!(rows[i].at >= t.proofIn.from + t.proofIn.frames && rows[i].at <= t.play.from + PLAY_FRAMES - 30)) bad(`replay row ${i} (f${rows[i].at}) must land after the window is up and 30 frames before the play ends`);
    if (i > 0 && !(rows[i].at > rows[i - 1].at)) bad(`replay row ${i} lands before row ${i - 1}`);
  }
})();

// ---------------------------------------------------------------------------------------------- the window

const FRAME_STYLE: React.CSSProperties = {
  position: "relative",
  boxSizing: "border-box",
  width: WINDOW_W,
  height: WINDOW_H,
  borderRadius: FRAME_R,
  border: `1.5px solid ${theme.rule2}`,
  overflow: "hidden",
  background: theme.termBg,
  boxShadow: `${theme.liftShadow}, 0 0 0 1px ${alpha("#000000", 0.6)}`,
};

/** The recorded clip: the first frame of the cut held while the window rises, the cut played from the caption's beat, its last frame held until the window leaves. */
const Clip: React.FC = () => {
  const t = S4_TIMING;
  const src = staticFile(PROOF.file);
  const fit: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  const playEnd = t.play.from + PLAY_FRAMES;
  const sceneEnd = SCENES.S4.end + 1;
  return (
    <>
      <Sequence from={t.proofIn.from} durationInFrames={t.play.from - t.proofIn.from}>
        <Freeze frame={0}>
          <OffthreadVideo src={src} trimBefore={PROOF.startFrom} muted style={fit} />
        </Freeze>
      </Sequence>
      <Sequence from={t.play.from} durationInFrames={PLAY_FRAMES}>
        <OffthreadVideo src={src} trimBefore={PROOF.startFrom} durationInFrames={PLAY_FRAMES} muted style={fit} />
      </Sequence>
      <Sequence from={playEnd} durationInFrames={sceneEnd - playEnd}>
        <Freeze frame={0}>
          <OffthreadVideo src={src} trimBefore={PROOF.endAt - 1} muted style={fit} />
        </Freeze>
      </Sequence>
    </>
  );
};

/** The reconstruction: the attack's real steps replayed as terminal rows (see the header). */
const Replay: React.FC<{ frame: number }> = ({ frame }) => {
  const d = s4Data();
  const rows = replayRows();
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: REPLAY.header,
          boxSizing: "border-box",
          padding: `0 ${REPLAY.padX}px`,
          display: "flex",
          alignItems: "center",
          gap: 18,
          borderBottom: `1px solid ${theme.rule}`,
          background: alpha(theme.sheet, 0.9),
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 28, color: theme.ink }}>{d.hero.title}</span>
        <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 22, color: theme.ink3 }}>{d.hero.name}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: REPLAY.header, bottom: 0, boxSizing: "border-box", padding: `${REPLAY.padY}px ${REPLAY.padX}px` }}>
        {rows.map((row, i) => {
          const p = riseProgress(frame, row.at, 8);
          if (p <= 0) return null;
          const isBad = row.tone === "bad";
          return (
            <div
              key={i}
              style={{
                ...riseStyle(p, 12),
                marginBottom: REPLAY_ROW_GAP,
                paddingLeft: isBad ? 14 : 0,
                borderLeft: isBad ? `4px solid ${theme.bad}` : undefined,
                background: isBad ? hatch(theme.bad, 0.1) : undefined,
                fontFamily: fonts.mono,
                fontWeight: row.tone === "out" || row.tone === "ok" || isBad ? 700 : 500,
                fontSize: REPLAY.font,
                lineHeight: REPLAY.lineHeight,
                color: TONE_COLOR[row.tone],
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
              }}
            >
              {row.text}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------- the numerals

interface Stat {
  at: number;
  value: number;
  decimals: number;
  unit?: string;
  label: string;
}

const StatBlock: React.FC<{ frame: number; stat: Stat; height: number; last: boolean }> = ({ frame, stat, height, last }) => {
  const p = riseProgress(frame, stat.at, 14);
  return (
    <div
      style={{
        ...riseStyle(p, 18),
        boxSizing: "border-box",
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 14,
        borderBottom: last ? undefined : `1px solid ${theme.rule}`,
      }}
    >
      <StatNumeral value={stat.value} unit={stat.unit} decimals={stat.decimals} startFrame={stat.at} durationFrames={S4_TIMING.numeralFrames} size={STAT_NUMERAL} hideBefore />
      <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: STAT_LABEL, letterSpacing: "0.04em", color: theme.ink2, whiteSpace: "nowrap" }}>{stat.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

/**
 * This part's scrim. It is mounted BEFORE 16e's overlay in S4b.tsx (so it is stacked under the ledger layer): the chain, the seal and the button fade over it while 16e's own
 * scrim (inside that layer) fades out and this one fades in by exactly the compensating amount (`s4ProofScrim`), so the Lab behind stays dimmed to 95 % throughout.
 */
export const S4b6Scrim: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S4_TIMING.ledgerOut.from) return null;
  const scrim = s4ProofScrim(frame);
  if (scrim <= 0.001) return null;
  return <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", background: theme.paper, opacity: scrim, pointerEvents: "none" }} />;
};

export const S4b6: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S4_TIMING;
  if (frame < t.proofIn.from) return null;
  const rise = s4ProofRise(frame);
  const exit = s4ProofGroupExit(frame);
  const groupOpacity = rise * (1 - exit);
  const d = s4Data();
  const o = d.outcome;
  const stats: Stat[] = [
    { at: t.numerals[0], value: o.files, decimals: 0, label: o.files === 1 ? copy.gfxB.fileRehashed : copy.gfxB.filesRehashed },
    { at: t.numerals[1], value: o.checksPassed, decimals: 0, unit: `${copy.s4.proof.checksOf} ${o.checksTotal}`, label: copy.s4.proof.checks },
    { at: t.numerals[2], value: o.seconds, decimals: 2, unit: copy.s4.proof.secondsUnit, label: copy.s4.proof.seconds },
  ];
  const statH = Math.floor(WINDOW_H / stats.length);
  const lift = (1 - rise) * 36 - exit * 18;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {groupOpacity > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: GROUP_X,
            top: GROUP_Y,
            width: GROUP_W,
            height: GROUP_H,
            opacity: groupOpacity,
            transform: `translateY(${lift.toFixed(2)}px) scale(${s4ProofPush(frame).toFixed(5)})`,
            transformOrigin: "50% 50%",
          }}
        >
          {/* the badge says what the window is: the clip is LIVE, the reconstruction is RECONSTRUCTED FROM LEDGER */}
          <div style={{ position: "absolute", left: 0, top: 0, height: BADGE_H }}>
            <Badge
              label={HAS_PROOF_CLIP ? copy.badges.proofLiveLine : copy.badges.proofReconstructed}
              tone={HAS_PROOF_CLIP ? "bad" : "info"}
              pulse={badgePulse(frame, 45)}
              reveal={badgeReveal(frame, t.badgeIn.from, t.badgeIn.frames)}
            />
          </div>

          {/* the window, 62 % */}
          <div style={{ position: "absolute", left: 0, top: BADGE_H + BADGE_GAP, width: WINDOW_W, height: WINDOW_H }}>
            <div style={FRAME_STYLE}>{HAS_PROOF_CLIP ? <Clip /> : <Replay frame={frame} />}</div>
          </div>

          {/* the numerals, 38 % */}
          <div style={{ position: "absolute", left: WINDOW_W + GUTTER, top: BADGE_H + BADGE_GAP, width: COLUMN_W - GUTTER, height: WINDOW_H }}>
            {stats.map((s, i) => (
              <StatBlock key={s.label} frame={frame} stat={s} height={statH} last={i === stats.length - 1} />
            ))}
          </div>
        </div>
      ) : null}

      <Caption text={copy.s4.captionReal} highlight="Real" startFrame={t.proofCaption.start} endFrame={t.proofCaption.end} />
    </div>
  );
};
