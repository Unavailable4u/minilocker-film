// S6 Evidence (f3720-4259) "Measured, not asserted" (BIBLE 6, S6). Patch 18. Replaces the stub of patch 12a completely.
//
// What the APP does here is all filmState.ts / script.ts: the header underline slides to Report (SCREEN_CHANGES f3720), the screens swap on f3732, the nine
// DimensionCards flip in on beats from REPORT.cardsFrom (f3780, one per beat, in the report's own order, with their real Headline pictures; a "not measured"
// card is drawn dotted with the backend's own italic note), the "Verify ledger now" button is pressed on f3960 (spinner, then the real line "intact - N events -
// head <8 hex>" on f4020). This file adds
//   - the CAMERA: the nav close-up (f3720), the wide shot of the report column (f3780), tiny breathing moves while the cards land, the pull to the ledger
//     block and the button (f3946), a slow push while it verifies, the pull-back for the claims (f4114), and the settle on the whole window (f4240-4259);
//   - the CURSOR: it enters in the empty margin of the page while the cards land, glides to the button (hover f3950), clicks f3960 (press + ripple), follows the
//     button the few px it drops when the seal gets its extra line, and rests;
//   - the CALLOUT "Not measured says so" on the first card whose status is "not_measured" (none when every dimension is measured: the chip then simply
//     does not exist; an `not_used` card is not "not measured" and gets none);
//   - the CLAIMS STRIP (f4080-4259): the app is dimmed, four StatNumerals count on beats from evidence.measured and evidence.attackSummary, each with a mono
//     label; a "CI green" chip only when evidence.ci.conclusion is "success"; the footer "numbers read from run <id> - commit <short sha>"; the caption
//     "Measured, not asserted.";
//   - the first CAPTION "Every run leaves evidence." with a soft floor behind it (the app is under it).
//
// Page scroll. The Report scrolls under the camera (REPORT_SCROLL in script.ts, edited in this patch): the nine cards sit in five rows and only a row and a
// half is on screen at the old scroll of 560, so the page now FOLLOWS the cards (each row arrives before it flips) and sweeps back to the ledger block before the
// cursor gets to the button. The callout and the cursor read the same function of the frame (anchors.ts), so they stay on their elements while the page moves.
//
// Evidence rules: every number on the claims strip is read through src/data/select.ts. A null measurement is drawn as "not measured", never as 0; a figure that
// is not flattering is shown anyway. The SAMPLE evidence (meta.sample) carries a "SAMPLE DATA" badge on this strip; the real capture does not.
//
// Hand-offs. The first camera keyframe is f3720 (S5's last keyframe holds until then; a stub S5 contributes none). The last keyframe is the whole window, at rest,
// arrived f4259: S7 (patch 19) starts from there. The cursor is last at the button; S7 hides it (it is shown in S2, S4a and S6 only, BIBLE 5).
import { Badge, badgeReveal } from "../fx/Badge";
import { Callout } from "../fx/Callout";
import { Caption } from "../fx/Caption";
import { StatNumeral } from "../fx/StatNumeral";
import { getCameraState, worldToStage } from "../fx/Camera";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../config/camera";
import { anchorPoint, reportCardAt, verifyButtonAnchor } from "../config/anchors";
import { copy } from "../config/copy";
import { REPORT, REPORT_SCROLL, keyframeValue } from "../config/script";
import { alpha, fonts, layout, theme } from "../config/theme";
import { CUES, FPS, SCENES, STAGE } from "../config/timeline";
import { selectCi, selectEvidenceShortId, selectMeasured, selectMeta, selectSummary, selectTask } from "../data/select";
import { clamp01, signature } from "../lib/ease";
const s6 = copy.s6;

// ---------------------------------------------------------------------------------------------- timing (all GLOBAL frames)

export const S6_TIMING = {
  /** the nav close-up: the underline slides to Report (script.ts SCREEN_CHANGES f3720, 24 frames) */
  navFrom: 3720,
  /** the move to the wide shot starts here and arrives on REPORT.cardsFrom (f3780), when the first card flips */
  wideFrom: 3750,
  /** the first caption, "Every run leaves evidence." (CUES.s6.caption), gone before the cards are in */
  captionEnd: 3796,
  /** the camera leaves the cards for the ledger block (arrives 26 frames later, 4 before the cursor hovers the button) */
  pullFrom: 3920,
  pullFrames: 26,
  /** slow push on the ledger block while the click, the spinner and the result play */
  pushFrom: 3960,
  pushFrames: 100,
  /** the claims strip: the scrim, then one numeral per beat */
  claimsFrom: REPORT.claimsFrom,
  scrimFrames: 18,
  numeralEvery: 15,
  numeralFrames: 40,
  /** the camera pulls back to the whole window for the claims */
  claimsPull: { from: 4080, frames: 34 },
  /** a slow push during the claims, then the settle onto the rest pose that S7 starts from */
  creep: { from: 4160, frames: 78 },
  settle: { from: 4240, frames: 19 },
  /** "CI green" chip, and the footer, after the four numerals have landed */
  chipAt: 4150,
  footerAt: 4170,
  /** the closing caption (CUES.s6.captionMeasured), gone before the scene ends */
  captionEnd2: 4250,
} as const;

const SCENE = SCENES.S6;

// ---------------------------------------------------------------------------------------------- camera

const WIDE_PADDING = 96;
const PULL_PADDING = 96;

/**
 * Shots (zoom in brackets):
 *   nav            f3720  the six nav items, big (2.4): the underline slides to Report
 *   reportGrid     f3780  the article's column from the header's bottom to the window's bottom (1.07), the cards land; it breathes by 2 % on the beats of the
 *                         rows. No larger: the callout of a card in the right-hand column needs about 272 px of bare page between the card and the stage's
 *                         safe margin, which is what a zoom of 1.09 leaves.
 *   verifyButton   f3946  the seal and the button (1.59), slow push 4 % while the check runs
 *   fullWindow     f4114  the whole window for the claims strip (1.07), a 3 % creep, then the rest pose
 */
export const S6_CAMERA: readonly CameraKeyframe[] = [
  kf(S6_TIMING.navFrom, "nav", { padding: 110, ease: "signature", frames: 24 }),
  kf(S6_TIMING.wideFrom, "reportGrid", { padding: WIDE_PADDING, ease: "signature", frames: REPORT.cardsFrom - S6_TIMING.wideFrom }),
  kf(3806, "reportGrid", { padding: WIDE_PADDING, scaleBias: 1.02, ease: "signature", frames: 34 }),
  kf(3850, "reportGrid", { padding: WIDE_PADDING, scaleBias: 1.0, ease: "signature", frames: 34 }),
  kf(3888, "reportGrid", { padding: WIDE_PADDING, scaleBias: 1.02, ease: "signature", frames: 28 }),
  kf(S6_TIMING.pullFrom, "verifyButton", { padding: PULL_PADDING, ease: "signature", frames: S6_TIMING.pullFrames }),
  kf(S6_TIMING.pushFrom, "verifyButton", { padding: PULL_PADDING, scaleBias: 1.04, ease: "signature", frames: S6_TIMING.pushFrames }),
  kf(S6_TIMING.claimsPull.from, "fullWindow", { padding: 60, ease: "signature", frames: S6_TIMING.claimsPull.frames }),
  kf(S6_TIMING.creep.from, "fullWindow", { padding: 60, scaleBias: 1.03, ease: "signature", frames: S6_TIMING.creep.frames }),
  kf(S6_TIMING.settle.from, "fullWindow", { padding: 60, scaleBias: 1.0, ease: "signature", frames: S6_TIMING.settle.frames }),
];

/** The camera as the film has it from the nav shot on: what <Camera> renders in S6 once the first move has arrived (the callout and the checks read it). */
const POSE_CAMERA: readonly CameraKeyframe[] = [kf(0, "nav", { padding: 110 }), ...S6_CAMERA];

// ---------------------------------------------------------------------------------------------- cursor

/** Where the cursor enters: in the bare page to the right of the article, at the height of the first cards (logical window px). */
const CURSOR_ENTER = { x: 1420, y: 430 } as const;
const CURSOR_ENTER_FRAME = 3836;

function buildCursor(): readonly CursorWaypoint[] {
  const hover = REPORT.verifyHoverFrom;
  const press = REPORT.pressAt;
  const after = REPORT.doneAt + 14;
  return [
    { frame: CURSOR_ENTER_FRAME, ...CURSOR_ENTER, hover: "enter" },
    // the button rests on the same spot from the end of the page's sweep back up (f3946) to the click, so the hover and the click land on it
    { frame: hover, ...anchorPoint(verifyButtonAnchor(hover)), hover: "verify-button" },
    { frame: press, ...anchorPoint(verifyButtonAnchor(press)), click: true, hover: "verify-button" },
    // the seal gains a line on f4020 and the button drops a few px: the cursor follows it and rests
    { frame: after, ...anchorPoint(verifyButtonAnchor(after)), hover: "verify-button" },
  ];
}

export const S6_CURSOR: readonly CursorWaypoint[] = buildCursor();

// ---------------------------------------------------------------------------------------------- the evidence the scene reads

interface Claim {
  key: "fix" | "attacks" | "hook" | "secrets";
  /** null = not measured: drawn as such, never as 0. */
  value: number | null;
  unit?: string;
  /** the mono label under the numeral */
  label: string;
  /** a second, dimmer mono line */
  sub?: string;
}

const pct = (x: number): string => String(Math.round(x * 100));

/** The four claims, from evidence.measured and evidence.attackSummary (BIBLE 6 S6). The exact figures; a null leaf is "not measured". */
function readClaims(): Claim[] {
  const m = selectMeasured();
  const a = selectSummary();
  const fix = m.fixRepoV2;
  const fixOk = fix.passes !== null && fix.runs !== null;
  const ci = fix.ciLow !== null && fix.ciHigh !== null ? `95% CI ${pct(fix.ciLow)}-${pct(fix.ciHigh)}%` : undefined;
  const hook = m.hookEscaped;
  const hookOk = hook.escaped !== null && hook.runs !== null;
  const sec = m.realSecrets;
  const secOk = sec.runsWithReal !== null && sec.runs !== null;
  return [
    { key: "fix", value: fixOk ? fix.passes : null, unit: fixOk ? `/${fix.runs}` : undefined, label: "fix_repo_v2 finished", sub: ci },
    { key: "attacks", value: a.contained, unit: `/${a.total}`, label: "attacks contained" },
    { key: "hook", value: hookOk ? hook.escaped : null, unit: hookOk ? `/${hook.runs}` : undefined, label: "hook escapes" },
    { key: "secrets", value: secOk ? sec.runsWithReal : null, label: secOk ? `real secrets in ${sec.runs} runs` : "real secrets in the runs" },
  ];
}

/** The footer line: "numbers read from run <evidenceId> - commit <short sha>". The commit clause is left out when the evidence records no commit. */
function footerText(): string {
  const sha = selectMeta().commit ?? selectCi().sha;
  const base = `numbers read from run ${selectEvidenceShortId()}`;
  return sha ? `${base} - commit ${sha.slice(0, 7)}` : base;
}

/** The index of the first dimension of the report whose status is "not_measured", or -1 (then there is no callout). */
function notMeasuredIndex(): number {
  return Object.values(selectTask().report.dimensions).findIndex((d) => d.status === "not_measured");
}

// ---------------------------------------------------------------------------------------------- import-time checks

/** A cursor target must be at least this far (stage px) inside the stage's edge at the camera pose of its frame. */
const CURSOR_EDGE = 40;

(() => {
  const t = S6_TIMING;
  if (!(S6_CAMERA[0].frame >= SCENE.start - 40)) throw new Error(`S6: the first camera keyframe (f${S6_CAMERA[0].frame}) must not start before f${SCENE.start - 40}`);
  for (let i = 1; i < S6_CAMERA.length; i++) {
    if (!(S6_CAMERA[i].frame >= S6_CAMERA[i - 1].frame)) throw new Error(`S6: camera keyframe ${i} (f${S6_CAMERA[i].frame}) is before keyframe ${i - 1} (f${S6_CAMERA[i - 1].frame})`);
  }
  const last = S6_CAMERA[S6_CAMERA.length - 1];
  if (!(last.frame + (last.frames ?? 0) <= SCENE.end)) throw new Error(`S6: the last camera move ends on f${last.frame + (last.frames ?? 0)}, after the scene's last frame (f${SCENE.end})`);
  for (let i = 1; i < S6_CURSOR.length; i++) {
    if (!(S6_CURSOR[i].frame >= S6_CURSOR[i - 1].frame)) throw new Error(`S6: cursor waypoint ${i} (f${S6_CURSOR[i].frame}) is before waypoint ${i - 1}; check REPORT in src/config/script.ts`);
  }
  if (!(S6_CURSOR.filter((w) => w.click).length === 1 && S6_CURSOR.find((w) => w.click)?.frame === REPORT.pressAt)) throw new Error("S6: the one click is on REPORT.pressAt");

  // the page has swept back up to the ledger block before the cursor hovers the button, and it does not move after that
  const sweepEnd = REPORT_SCROLL[REPORT_SCROLL.length - 1].frame;
  if (!(sweepEnd <= REPORT.verifyHoverFrom)) throw new Error(`S6: the page's scroll ends on f${sweepEnd}, after the cursor hovers the button (f${REPORT.verifyHoverFrom}); fix REPORT_SCROLL`);
  if (!(keyframeValue(REPORT_SCROLL, sweepEnd) === REPORT.verifyScroll)) throw new Error("S6: the page must come to rest on REPORT.verifyScroll, where the button and the seal are framed");
  if (!(t.pullFrom + t.pullFrames <= REPORT.verifyHoverFrom)) throw new Error("S6: the pull to the ledger block must have arrived when the cursor hovers the button");
  if (!(REPORT.doneAt < t.claimsPull.from && t.claimsFrom <= t.claimsPull.from)) throw new Error("S6: the verify result (REPORT.doneAt) must be in before the claims strip starts");
  if (!(CUES.s6.caption + 40 <= t.captionEnd && t.captionEnd <= REPORT.cardsFrom + 20)) throw new Error("S6: the first caption must stay up 40 frames and be gone as the cards land");
  if (!(CUES.s6.captionMeasured >= t.claimsFrom && CUES.s6.captionMeasured + 40 <= t.captionEnd2)) throw new Error("S6: the closing caption must come with the claims and stay up 40 frames");

  // every place the cursor works must be on the stage, with room, at the camera's pose on that frame
  for (const w of S6_CURSOR) {
    const cam = getCameraState(w.frame, POSE_CAMERA, FPS, { wideTilt: false });
    const p = worldToStage(cam, { x: w.x, y: w.y });
    if (!(p.x >= CURSOR_EDGE && p.x <= STAGE.w - CURSOR_EDGE && p.y >= CURSOR_EDGE && p.y <= STAGE.h - CURSOR_EDGE)) {
      throw new Error(`S6: the cursor's target "${w.hover ?? "?"}" on f${w.frame} lands on stage (${p.x.toFixed(0)}, ${p.y.toFixed(0)}), within ${CURSOR_EDGE} px of the edge or off it: reframe`);
    }
  }
  readClaims(); // throws now, naming what is missing, if the evidence cannot support the claims strip
})();

// ---------------------------------------------------------------------------------------------- the callout

/** Chip + dot for the first "not measured" card: it points at a spot inside the card that follows the page's scroll and the camera. */
const NotMeasuredCallout: React.FC<{ frame: number; index: number }> = ({ frame, index }) => {
  const flip = REPORT.cardsFrom + index * REPORT.cardEvery;
  // BIBLE 8 gives f3880 for this chip; the card is only on screen once it has flipped in, so it comes 1 beat after its own flip when that is later
  const start = Math.max(flip + REPORT.cardFrames, Math.min(CUES.s6.calloutNotMeasured, flip + 3 * REPORT.cardEvery));
  const end = Math.min(start + 84, S6_TIMING.pullFrom + 18);
  if (frame < start || frame >= end) return null;
  const col = index % 2; // the report's grid has two columns: the chip goes outward, into the bare page
  const card = reportCardAt(index, frame);
  const target = { x: col === 0 ? card.x + 6 : card.x + card.w - 6, y: card.y + 34 };
  const cam = getCameraState(frame, POSE_CAMERA, FPS);
  const dot = worldToStage(cam, target);
  return <Callout text={s6.calloutNotMeasured} variant="note" target={dot} side={col === 0 ? "left" : "right"} lead={14} startFrame={start} endFrame={end} />;
};

// ---------------------------------------------------------------------------------------------- the floor behind a caption

/** A soft dark floor at the bottom of the stage while a caption is up and the app is under it (the film's captions have no plate of their own). */
const CaptionFloor: React.FC<{ frame: number; from: number; to: number }> = ({ frame, from, to }) => {
  const a = Math.min(signature(clamp01((frame - from) / 14)), 1 - signature(clamp01((frame - (to - 14)) / 14)));
  if (!(a > 0)) return null;
  const h = 330;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: STAGE.h - h,
        width: STAGE.w,
        height: h,
        opacity: a,
        pointerEvents: "none",
        background: `linear-gradient(to bottom, ${alpha(theme.hookBg, 0)}, ${alpha(theme.hookBg, 0.86)} 70%, ${alpha(theme.hookBg, 0.9)})`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------------------------- the claims strip

const COLS = 4;
const STRIP_X = layout.safeMargin;
const STRIP_W = STAGE.w - 2 * layout.safeMargin;
const COL_GAP = 40;
const COL_W = (STRIP_W - (COLS - 1) * COL_GAP) / COLS;
const NUMERAL = 150;

const rise = (frame: number, start: number, frames = 14): number => signature(clamp01((frame - start) / frames));

const ClaimColumn: React.FC<{ frame: number; claim: Claim; index: number }> = ({ frame, claim, index }) => {
  const start = S6_TIMING.claimsFrom + 12 + index * S6_TIMING.numeralEvery;
  const r = rise(frame, start);
  const labelR = rise(frame, start + 8);
  return (
    <div style={{ position: "absolute", left: STRIP_X + index * (COL_W + COL_GAP), top: 330, width: COL_W }}>
      <div style={{ height: 2, width: COL_W * r, background: index === 0 ? theme.accent : theme.rule2, marginBottom: 30 }} />
      <div style={{ height: NUMERAL, opacity: r, transform: `translateY(${((1 - r) * 18).toFixed(2)}px)` }}>
        {claim.value === null ? (
          <div style={{ fontFamily: fonts.mono, fontSize: 44, lineHeight: `${NUMERAL}px`, color: theme.ink3 }}>not measured</div>
        ) : (
          <StatNumeral value={claim.value} unit={claim.unit} startFrame={start} durationFrames={S6_TIMING.numeralFrames} size={NUMERAL} hideBefore />
        )}
      </div>
      <div style={{ marginTop: 34, opacity: labelR, transform: `translateY(${((1 - labelR) * 10).toFixed(2)}px)`, fontFamily: fonts.mono, fontSize: 26, lineHeight: 1.3, color: theme.ink2 }}>
        {claim.label}
        {claim.sub ? <div style={{ fontSize: 24, color: theme.ink3, marginTop: 6 }}>{claim.sub}</div> : null}
      </div>
    </div>
  );
};

const ClaimsStrip: React.FC<{ frame: number }> = ({ frame }) => {
  const t = S6_TIMING;
  if (frame < t.claimsFrom) return null;
  const claims = readClaims();
  const scrim = signature(clamp01((frame - t.claimsFrom) / t.scrimFrames));
  const ci = selectCi();
  const meta = selectMeta();
  const footerR = rise(frame, t.footerAt);
  return (
    <>
      {/* the app drops back: dimmed and softened, so the numbers are the only thing that reads */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: scrim,
          background: alpha(theme.hookBg, 0.8),
          backdropFilter: "blur(7px)",
          WebkitBackdropFilter: "blur(7px)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, pointerEvents: "none" }}>
        {ci.conclusion === "success" && (
          <div style={{ position: "absolute", left: STRIP_X, top: 226 }}>
            <Badge label="CI green" tone="ok" size={24} reveal={badgeReveal(frame, t.chipAt)} />
          </div>
        )}
        {meta.sample && (
          <div style={{ position: "absolute", right: STRIP_X, top: 226 }}>
            <Badge label="SAMPLE DATA" tone="warn" size={24} reveal={badgeReveal(frame, t.claimsFrom + 6)} />
          </div>
        )}
        {claims.map((c, i) => (
          <ClaimColumn key={c.key} frame={frame} claim={c} index={i} />
        ))}
        <div
          style={{
            position: "absolute",
            left: STRIP_X,
            width: STRIP_W,
            top: 790,
            textAlign: "center",
            opacity: footerR,
            transform: `translateY(${((1 - footerR) * 10).toFixed(2)}px)`,
            fontFamily: fonts.mono,
            fontSize: 24,
            color: theme.ink3,
          }}
        >
          {footerText()}
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S6Evidence: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S6_TIMING;
  const nm = notMeasuredIndex();
  return (
    <>
      <CaptionFloor frame={frame} from={CUES.s6.caption} to={t.captionEnd} />
      <Caption text={s6.caption} highlight="evidence." startFrame={CUES.s6.caption} endFrame={t.captionEnd} />
      {nm >= 0 && <NotMeasuredCallout frame={frame} index={nm} />}
      <ClaimsStrip frame={frame} />
      <Caption text={s6.captionMeasured} highlight="Measured," startFrame={CUES.s6.captionMeasured} endFrame={t.captionEnd2} />
    </>
  );
};