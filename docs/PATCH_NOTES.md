# PATCH NOTES (handoff log)

Every patch appends an entry here. A new AI session reads this file first; it is the memory of the project.
Project: minilocker-film (Remotion 4.0.540, React 18.3.1, TypeScript 5.9.3 strict). 5100 frames, 1920x1080, 30 fps.
Rules live in docs/guide/context-header.md and docs/bible/*.md.

---

## PATCH 00 - Scaffold, config, core math

**Files created**
package.json, package-lock.json, tsconfig.json, remotion.config.ts,
src/index.ts, src/Root.tsx, src/MiniLockerFilm.tsx,
src/config/theme.ts, src/config/timeline.ts, src/config/copy.ts,
src/ui/theme.css,
src/lib/ease.ts, src/lib/spring.ts, src/lib/prng.ts, src/lib/fonts.ts,
docs/PATCH_NOTES.md

**npm scripts that are NOT runnable yet** (their files come in later patches): `assets` (patch 01), `evidence`,
`evidence:check`, `evidence:final-check` (patch 02), `proof`, `check`, `sfx` (patch 22), `render`, `render:4k`,
`render:frames`, `submission` (patch 23). `studio` and `typecheck` work now.

### PUBLIC API

**src/config/timeline.ts**
- `FPS = 30`, `BEAT = 15`, `BAR = 60`, `TOTAL = 5100`
- `sec(s: number): number` (rounded), `beat(n)`, `bar(n)`, `f(n)` (identity, marks a literal frame)
- `LOGICAL = { w: 1600, h: 900 }`, `STAGE = { w: 1920, h: 1080 }`
- `type SceneKey = "S0" | ... | "S9"`; `interface SceneRange { id; name; start; end; duration }`
  (`end` is INCLUSIVE, `duration = end - start + 1`)
- `SCENES: Record<SceneKey, SceneRange>`, `SCENE_ORDER: readonly SceneKey[]`
- `sceneAt(frame: number): SceneRange` (clamps outside 0..TOTAL-1)
- `CUT_FRAMES: readonly number[]` (14 beat frames from BIBLE 5)
- `CUES`: nominal start frame of every caption/callout/badge/line from BIBLE 8. Keys mirror `copy`:
  `CUES.s2.calloutCheck` is the frame for `copy.s2.calloutCheck`. Scenes may nudge a cue to land on a beat.

**src/config/theme.ts**
- `theme` (flat object): paper, sheet, raised, sunken, rule, rule2, ink, ink2, ink3, accent, accentInk, accent2,
  onAccent, ok, okWash, okA, okB, okC, okGradient, bad, badWash, hatchBad, warn, warnWash, onWarn, info, infoWash,
  termBg, termFg, termDim, grid, glowA, glowB, stageTop, stageBottom, hookBg (#050505), stageGradient,
  appBackground, appBackgroundSize, gridSize (44), panelShadow, liftShadow
- `hatch(color?, alpha?)`: 135deg hatching string. `alpha(hex, a)`: rgba string from a hex color.
- `fonts.serif`, `fonts.mono` (CSS font stacks); `FAMILY_SERIF = "CMU Serif"`, `FAMILY_MONO = "CMU Typewriter Text"`
- `type` (hook 72, title 150, captionMin 56, captionMax 76, callout 24, uiMin 22, monoLabelMin 20),
  `layout` (safeMargin 96, captionBottom 110), `ROOT_PX = 17`
- Values match the real app's `[data-theme="dark"]` in frontend/src/index.css (verified against the source).

**src/ui/theme.css**: `:root` variables (dark theme), `.film-root` base text styles (scoped so Studio chrome is
untouched), `.smcp`, `.display`, `.hatch-bad`, `.bg-ok`. No transitions or animations.

**src/config/copy.ts**: `copy` (all groups), plus `urls`, `brand`, `badges`, `s0`..`s9`, `type Copy`.
Text only, no measured values. `urls.demo` is intentionally an empty string until the real Vultr domain is set.

**src/lib/ease.ts**: `SIGNATURE_BEZIER`, `signature`, `easeInOut` (= signature), `clamp01`,
`mapRange(value, inMin, inMax, outMin, outMax, easing?)` (clamped), `easeOutBack(t, s?)`,
`overshoot(t, amount = 0.05)` (0 -> 1+amount at 70% -> exactly 1 at t=1), `stepPulse(frame, start, len)`
(0 before start, 1 at start, eases to 0 over len frames).

**src/lib/spring.ts**: `springPresets` { uiPop {18,170,0.9}, panel {22,120,1}, camera {26,90,1.1}, settle {14,220,1} },
`type SpringPresetName`, `interface SpringConfig`, `spr(frame, fps, startFrame, preset = "uiPop"): number`
(0 at or before startFrame, settles at 1; uiPop and settle may overshoot slightly).

**src/lib/prng.ts**: `mulberry32(seed): () => number` (sequential), `rand(seed): number` (stateless, [0,1)),
`randRange(seed, min, max)`, `randInt(seed, min, max)` (inclusive), `hashStringToSeed(text): number` (FNV-1a).

**src/lib/fonts.ts**: `FONT_FILES` (the 7 woff2 files of the draft repo), `loadFonts(): Promise<void>` (never rejects,
one warning if files are missing), `<FontsReady>{children}</FontsReady>` (delayRender until loaded).
Files expected in public/fonts: cmu-serif-{500,700}-{roman,italic}.woff2,
cmu-typewriter-text-{500-roman,500-italic,700-roman}.woff2.

**src/MiniLockerFilm.tsx**: TEMPORARY content (graphite stage, frame number, scene name). Inside it, `Stage` draws a
fixed 1920x1080 stage and scales it to the composition width, which is how the 960x540 Preview works. Keep that wrapper
when the real film replaces the inside (patch 12).

**src/Root.tsx**: registers `MiniLockerFilm` (1920x1080) and `MiniLockerFilm-Preview` (960x540), both 30 fps, 5100 frames.
Each later patch that adds a Dev composition resends this whole file.

### Decisions and conventions future patches must follow
1. Frame numbers and sizes come from timeline.ts; colors and fonts from theme.ts; text from copy.ts.
2. `SCENES[x].end` is inclusive. Use `.duration` for sequence lengths.
3. Base text styles are scoped to `.film-root` (the Stage wrapper adds the class). A component rendered outside
   `Stage` does not get the base font or color. CSS variables are on `:root`.
4. Fonts: a missing woff2 file does not break anything, it only warns once. Real fonts need `npm run assets` (patch 01).
5. Dependencies are pinned exactly. `remotion` and `@remotion/cli` must stay on the same version (4.0.540).
6. Chip text with numbers (copy.s3.chips: 128 processes, 512 MB) are product limits from the README, not run
   measurements. If /api/infra exposes live limits, patch 14 should prefer those.
7. Voice-over text (BIBLE 8) is NOT in copy.ts: it is not on-screen text and parts of it quote measured numbers.
   Patch 22 owns it.

### Known issues
- `urls.demo` is empty. Set it to the real Vultr domain before the final render.
- Verified by `tsc --noEmit`, a webpack bundle of the project, and unit checks of the pure helpers. Not verified in
  the Studio or a real render (no browser was available in the build environment): please open the Studio.

### Warnings for the next patch
- Patch 01 must create public/fonts via `npm run assets` and public/brand/manifest.json.
- Patches 01 to 04 all edit src/Root.tsx when they add a Dev composition: paste the current file into the session.

---

## PATCH 01 - Brand: fonts, Mark, dial arcs, Vultr logo slot, asset script

**Files created**
scripts/fetch-assets.mjs, public/brand/manifest.json,
src/ui/Mark.tsx, src/ui/RadiusDial.tsx, src/ui/VultrLogo.tsx, src/dev/DevBrandSheet.tsx

**Files changed**
src/Root.tsx (registers `DevBrandSheet`), docs/PATCH_NOTES.md

`npm run assets` is now runnable (the script entry already existed in package.json).

### PUBLIC API

**scripts/fetch-assets.mjs** (`npm run assets`, pure Node 20, idempotent)
- `npm run assets -- --from <path-to-draft-clone>` or env `MINILOCKER_REPO` (reads `<path>/frontend/src/fonts`), else downloads
  from raw.githubusercontent.com/Unavailable4u/draft/main/frontend/src/fonts. `--force` overwrites files that are already valid.
- Copies the 7 CMU woff2 files and OFL.txt into public/fonts. Each font must be non-empty and start with the wOF2 magic bytes;
  an invalid file that is already there is replaced. Exit code 1 if any font could not be installed.
- Writes `public/brand/manifest.json` = `{ "vultrLogo": boolean, "vultrLogoFile": "vultr-logo.svg" }` (true only if
  public/brand/vultr-logo.svg exists, is non-empty and contains `<svg`). Prints the instruction to download the official logo.
  The manifest is committed with `vultrLogo: false`; re-run `npm run assets` after saving the logo.

**src/ui/Mark.tsx**
- `<Mark size progress? mode? color? accent? />`: `mode: "static" | "build" | "collapse"` (default "static"), `progress` 0..1
  (ignored when static), `color` default theme.ink, `accent` default theme.accent. Geometry, stroke widths and opacities are
  BIBLE Appendix A. At progress 1 (build) and progress 0 (collapse) the output equals the static mark.
- `MARK_BUILD_FRAMES = 60` (nominal length of a build or collapse), `markProgress(frame, startFrame, durationFrames = 60): number`.
- `MARK_BUILD` (progress terms, [start, end]): core [0, .25], ring1 (r 6) [.167, .667], ring2 (r 10.4) [.417, .917],
  dots (r 14.8) [.7, 1], and `ring2Offset` = 15 f / 60 = .25 (ring 2 starts 15 f after ring 1).
- `MARK_COLLAPSE`: dots [0, .4], ring2 [.12, .62], ring1 [.26, .86], punch [.7, 1]. Rings shrink into the dot while fading; the
  core gets a small punch (up to 1.18x) as the last ring lands. Only the core remains at progress 1.
- Rings draw clockwise from 12 o'clock.

**src/ui/RadiusDial.tsx**
- `<RadiusDial dims verdictWord verdictTone size showLabels glow pulseFlagged pulsePhase? scan? scanOpacity? />`
  - `dims: { key: "net"|"pol"|"fs"|"sec"|"cpu"; label: string; state: "clean"|"flag"|"review"|"unmeasured"; draw: number; value?: string }[]`
    (`value` is an optional extra: pre-formatted text from the evidence selectors, shown after the label; unmeasured arcs show a dash).
    Arcs sit at fixed radii by `key` (net 104, pol 88, fs 72, sec 56, cpu 40); a missing key draws nothing.
  - `verdictWord: string` (icons for "clean", "flagged", "review", "measuring", "partial", "no data"), `verdictTone: "ok"|"bad"|"warn"|"info"|"mute"`.
  - `showLabels` 0..1 fades the labels in one after another. `glow` 0..1 (1 = the real app's look, above 1 = hero moment).
  - `pulseFlagged` makes flagged arcs breathe (opacity .55..1) following `pulsePhase` (0..1 within a cycle; default .5 = fully lit).
  - `scan` = rotation in turns of the scan wedge (omit to hide); `scanOpacity` default 1.
- Also exported: `DIAL_KEYS`, `CX`, `CY`, `RADII`, `arcPath`, `TICKS` (verbatim from the source), `DIAL_PULSE_FRAMES = 72`,
  `dialPulsePhase(frame, period = 72)`, types `DialKey`, `DialState`, `DialTone`, `DialDim`, `RadiusDialProps`.
- Draw-on is an SVG mask along the arc, so dashed and dotted arcs draw on cleanly. The component never reads the frame.

**src/ui/VultrLogo.tsx**
- `<VultrLogo height opacity? />`, and `hasVultrLogo: boolean`. Uses `<Img src={staticFile("brand/vultr-logo.svg")}>` when the manifest
  says the file exists, else a text "Vultr" wordmark in the body font and ONE console warning. The manifest is imported at build
  time (`../../public/brand/manifest.json`): no fs or network access while rendering.

**src/dev/DevBrandSheet.tsx** + composition `DevBrandSheet` (1920x1080, 180 f): Mark in build/static/collapse at 0/25/50/75/100 %,
the dial in 4 states (empty, half drawn with scan, all clean, one flagged + one not measured), the type specimens
(150 / 56 / 22 / 18 px) and the Vultr slot. Frame 0 is the QA still; later frames only animate the scan and the pulse.

### Decisions and conventions future patches must follow
1. Partial arcs and rings use explicit dash lengths (circumference or 1.5 * PI * r), not `pathLength`, so every renderer agrees.
2. Every SVG id inside a component (gradient, masks) is built from `useId()`, so several dials or Marks can share one frame.
3. Dial motion is driven only by props. Scenes compute `draw`, `showLabels`, `glow`, `scan` and `pulsePhase` from the frame
   (`dialPulsePhase(frame)` for the breathing).
4. The dial uses the film's theme colors (blue gradient okA/okB/okC), not CSS variables, so it renders the same outside `.film-root`.
5. Dial label text (Network, Policy, Filesystem, Secrets, Compute) is passed in via `dims[].label`. It is not in copy.ts yet;
   patch 06 should pass the labels from the evidence/derive layer.

### Known issues
- Verified by `tsc --noEmit`, a Remotion bundle (`remotion bundle`), the asset script (local copy, download, logo detection, repair
  of a corrupt font) and a raster of server-rendered Mark and dial markup. NOT verified with `remotion still` (no browser in the
  build environment): please run the CHECK and look at out/qa/brand.png.
- The drop-shadow glow uses CSS `filter` on SVG paths, which Chrome (Remotion) supports but other renderers may ignore.
- The text "Vultr" fallback is a placeholder. The final render needs the official logo (public/brand/vultr-logo.svg).

### Warnings for the next patch
- Patches 02 to 04 each resend src/Root.tsx: it now contains the `DevBrandSheet` composition and must keep it.
- public/fonts/*.woff2 are produced by `npm run assets`; commit them or re-run the script on each machine.

---

## PATCH 02 - Evidence pipeline

**Files created**
src/data/types.ts, src/data/evidence.json (SAMPLE), src/data/select.ts, src/lib/derive.ts, src/lib/clock.ts,
scripts/capture-evidence.mjs, scripts/validate-evidence.mjs, evidence/measured.json,
tools/sample/gen-sample.mjs, tools/sample/assemble.py (throwaway builders of the SAMPLE, not part of the film)

**Files changed**
.gitignore (ignores the intermediate tools/sample/stage1.json), docs/PATCH_NOTES.md

`npm run evidence`, `evidence:check` and `evidence:final-check` are now runnable.

### The SAMPLE
`src/data/evidence.json` has `meta.sample = true` and `meta.note = "SAMPLE - NOT REAL, DO NOT RENDER FOR SUBMISSION"`. EVERY number in it
is made up (including the model name, region, plan, measured numbers and the CI link). 115 KB. It holds: a 62-event fix_repo_v2 task
(read README, failing run, decoy reads of the SSH key and the AWS secret, egress.blocked, fixes, passing run, hidden check, artifacts,
sandbox.audit, sandbox.destroyed, task.end), the five core attacks with full AttackResult, events, report and verify, and 15/15 contained.
Rebuild it (deterministic, no clock, no random):
```
node tools/sample/gen-sample.mjs                       # stage 1 -> tools/sample/stage1.json
python tools/sample/assemble.py --repo ../draft        # stage 2 -> src/data/evidence.json
```
Stage 2 builds every `report` and `verify` with the product's own `build_report` and `verify_events` (backend of the draft clone), and
refuses to write if a sample hash chain does not verify there: the JS-made chains are cross-checked against the Python code.

### Evidence shape (src/data/types.ts, BIBLE 7.1)
```
Evidence {
  meta:     { sample, capturedAt, commit|null, baseUrl, note, model?, trimmedToolOutputs? }
  infra:    InfraStatus                      // GET /api/infra
  scenarios: ScenarioInfo[]                  // the fix_repo_v2 entry of GET /api/scenarios
  task:     { id, scenario:"fix_repo_v2", events: LedgerEvent[], report: Report, verify: Verification, end: {status, error?, ledger_verified?} }
  takes?:   { id, status, hiddenCheckPassed|null, canaryReads, events, kept }[]   // summaries of every attempt
  s3Source: "task" | "attack:malicious_repo_hook"
  attacks:  { [name]: { result: AttackResult, events: LedgerEvent[], report: Report, verify: Verification } }   // the 5 core attacks at least
  attackSummary: { total, contained, inconclusive, breached, error, unavailable }
  measured: { fixRepoV2:{passes,runs,ciLow,ciHigh,mostMissedBug}, research:{passes,runs,ciLow,ciHigh}, hookEscaped:{escaped,runs},
              realSecrets:{runsWithReal,runs}, bakeoff:{model} }                    // every leaf may be null until measured
  ci:       { conclusion|null, url|null, sha|null }
}
```
Also exported from types.ts (copied from the product's api.ts): Profile, LedgerEvent, EndInfo, Dimension, Report, Verification,
AttackTry, AttackInfo, CheckStatus, AttackCheck, AttackStep, Verdict, AttackResult, ScenarioInfo, InfraStatus; and the Evidence parts
EvidenceMeta, TaskEnd, EvidenceTask, EvidenceTake, EvidenceAttack, AttackSummary, PassRate, Measured, EvidenceCi, S3Source.

### PUBLIC API

**src/data/select.ts** (the only importer of evidence.json; pure; a missing path throws `evidence: <path> is missing. Re-capture ...`,
no value is invented here). Arrays are typed mutable only so they pass straight into derive.ts.
- `selectMeta()`, `selectInfra()`, `selectScenarios()`, `selectSummary()`, `selectMeasured()`, `selectCi()`, `selectS3Source()`
- `selectTask()` -> `{ id, scenario, events, report, verify, end }`; `selectTakes()` (empty array when the file has none)
- `selectAttack(name)` -> AttackResult; `selectAttackEvents(name)`; `selectAttackReport(name)`; `selectAttackVerify(name)`; `selectAttackNames()`
- `selectEvidenceShortId()`: first 8 hex of a 32-bit FNV-1a hash of `JSON.stringify` of the file, computed once at module load
  (no crypto at render). Same file, same id.
- `eventsUpTo(events, ts)`: events with `ts <=` the given time. `firstByType(events, type, where?)`, `lastByType(events, type, where?)`: undefined when none.
- `measured` leaves can be null: scenes must handle null (show "not measured"), never default to a number.

**src/lib/derive.ts**: port of the product's derive.ts, logic unchanged, only the LedgerEvent import moved to ../data/types.
`describe`, `groupLines`, `blast`, `measure`, `browserPages`, `savedFiles`, `timeline`, `toolLine`, `parseArgs`, types `Tone`, `BrowserPage`,
`SavedFiles`, `TimelineNode`. `groupLines` returns NEWEST FIRST (as in the app); reverse it for a build-up.

**src/lib/clock.ts** (pure, documented in its header): `makeClock(events, segments)` -> `{ segments, frameOfTs(ts), tsOfFrame(frame), eventFrames(events?) }`;
`MIN_EVENT_SPACING = 6`; types `ClockSegment { fromTs, toTs, startFrame, endFrame, holdAt?: {ts, frames}[] }`, `ClockHold`, `LedgerClock`.
`frameOfTs(hold.ts)` is the FIRST frame of the hold; frames inside a hold all map back to `hold.ts`. Outside/between segments time clamps
(see the header). `eventFrames` can push a very dense burst past its segment's end: the scene decides what to do. Throws `LedgerClock: ...`
for empty, out-of-order, overlapping or over-held segments.

**scripts/capture-evidence.mjs** (`npm run evidence -- --base https://<domain> --repo ..\draft --attacks all --takes 3`; token from
`--token` or env `MINILOCKER_TOKEN`, never written; `--measured`, `--out` optional). Ledger events come from the SSE endpoint
(`/api/tasks/{id}/events`, which replays finished tasks), because `GET /api/tasks/{id}` only returns an event count. Waits out 429. Takes
run one at a time and stop at the first one with a passing hidden check AND a decoy read; otherwise the best take is kept and
`s3Source` becomes `attack:malicious_repo_hook`. Full data (events, report, verify) is stored for the 5 core attacks; with `--attacks all`
the other 10 only count in `attackSummary` (total = how many attacks the lab lists). Long `tool.result` outputs are trimmed to 600
chars, so those events' hashes no longer match their text; `meta.trimmedToolOutputs` counts them and `verify` is the server's own result.
CI: GitHub API for `head_sha=<commit>` when `--repo` is given, else the latest run; a failure leaves `ci.conclusion` null with a warning.

**scripts/validate-evidence.mjs** (`npm run evidence:check`, `npm run evidence:final-check`, optional `--file <path>`). Prints
`FAIL path: what to fix` / `WARN ...`, exit 1 on any FAIL. Always fails: missing required paths, `infra.vultr.available` false, `attackSummary.total`
not 15, rewind verdict not "contained" (for "breached" it is a loud WARN with the STOP sentence, but with `--final` it fails too),
any `verify.verified` false, a broken id/prev_hash chain or a `verify` that does not match the stored events, the strings `[[` or `TODO`
in any text, anything shaped like a private key block, `AKIA...`, `sk-...`, `ghp_...`, `github_pat_...` or the token in env MINILOCKER_TOKEN.
`--final` also fails on `meta.sample` true (message says "SAMPLE data") and on any null in `measured`.
Warns (does not fail) on: s3Source fallback, a core attack that is not contained, ci.conclusion null or not success, attack counts that do not add up to total.

**evidence/measured.json**: all-null template with a `_how` key (the exact commands from docs/SUBMISSION.md). Fill by hand after the runs.

### Decisions and conventions future patches must follow
1. Scenes read evidence ONLY through select.ts. They never import evidence.json or know if it is the SAMPLE.
2. Real ledger timestamps are seconds as floats; scene time comes from `makeClock`, never from Date or the frame counter alone.
3. The SAMPLE's tool outputs are clipped at 800 chars like the real ledger (so the "FAILED (...)" tail of a test run is not in the data).
4. A null measured number must render as "not measured", never as 0 or a made-up value.
5. The render script (patch 23) must refuse `meta.sample === true`: it can run `node scripts/validate-evidence.mjs --final`.

### Known issues
- The capture script was exercised against a local mock server built from the SAMPLE (429 retry, SSE replay, trimming, GitHub CI lookup,
  summary), NOT against a live MiniLocker deployment.
- The SAMPLE has 62 task events, not ~70; the 5 core attacks hold 19 to 29 each.
- Verified: `tsc --noEmit`, `npm run evidence:check` passes, `npm run evidence:final-check` fails with the SAMPLE message, unit checks of clock,
  selectors and derive on the sample, and eight deliberately broken copies of the file are rejected by the validator.

### Warnings for the next patch
- Nothing renders the SAMPLE visibly yet. Patches that show evidence data should put a "SAMPLE" mark on screen while `selectMeta().sample` is true.

---

## PATCH 03 - FX toolkit

**Files created**
src/config/camera.ts, src/config/focus.ts,
src/fx/Camera.tsx, Cursor.tsx, Caption.tsx, KineticText.tsx, Callout.tsx, StatNumeral.tsx, Glow.tsx, Grain.tsx, Vignette.tsx,
Spotlight.tsx, GridPaper.tsx, Toast.tsx, KeyCap.tsx, Badge.tsx, util.ts,
src/dev/DevFxSheet.tsx

**Files changed**
src/Root.tsx (registers `DevFxSheet`, 1920x1080, 360 f; keeps `DevBrandSheet`), docs/PATCH_NOTES.md

Everything here is pure and frame-driven (no CSS transitions, no timers, no Math.random). All frame arguments are GLOBAL film frames:
render these components in the global frame space, never inside a `<Sequence>` with a non-zero `from`.

### PUBLIC API

**src/config/camera.ts**
- `CameraEase = "spring" | "signature" | "linear"`; `CameraKeyframe { frame, target: FocusName, padding, scaleBias, rotateX, rotateY, rotateZ, ease?, frames?, shake? }`
- `CursorWaypoint { frame, x, y, click?, hover?, hide? }` (x, y in the LOGICAL 1600 x 900 space; `frame` is the frame the cursor ARRIVES)
- `CAMERA_LIMITS` (scale 1.0..2.6, tilt 6/5 deg, 14/14 in S1 and S9, roll 3, perspective 1800, drift 2 px, shake 8 f, DOF 1.2 px / 12%).
- `kf(frame, target, opts?)`: keyframe shorthand. Defaults: padding 96, scaleBias 1, no tilt, spring.

**src/config/focus.ts**
- `FocusName` (nav, taskForm, stepStream, terminal, blastPanel, dial, gaugeSecrets, gaugeNetwork, gaugeCompute, attackSummary, attackGrid,
  attackDetail, reportGrid, verifyButton, infraDiagram, fullWindow), `FOCUS_NAMES`, `FOCUS: Record<FocusName, Rect>`, `WINDOW`, `GRID`,
  `focusRect(name)` (throws on an unknown name), `rectCenter(rect)`, `rectPoint(rect, fx, fy)`, type `Rect`.
- The rectangles are CLOSE, not pixel-exact. UI patches 05-07 MAY REFINE THEM and MUST UPDATE THIS FILE (keep the names).

**src/fx/Camera.tsx**
- `<Camera keyframes dof? wideTilt?>`: children are laid out in LOGICAL coordinates; overlays in stage space go OUTSIDE it.
- `getCameraState(frame, keyframes, fps?, { wideTilt? }): CameraState` (`scale, tx, ty, rotateX/Y/Z, driftX/Y, shakeX/Y, focusW/H`),
  `cameraTransform(state)`, `worldToStage(state, {x, y})`, `cameraProgress(frame, startFrame, fps?)`.
- Geometry: world point p lands on the stage at `T + s * p`, `T = (960, 540) - s * rectCenter(target)`. At scale 1 the 1600 x 900 window is centred.
- A focus that fits at scale <= 1 is clamped to 1.0: it is centred, not zoomed (blastPanel is 840 px tall, so it frames at 1.0).
  Use `scaleBias` (> 1) to punch in, or a smaller `padding`.

**src/fx/Cursor.tsx** (inside `<Camera>`)
- `<Cursor waypoints size? zoom?>`: `size` is the arrow height in logical px (26); pass `zoom` (= `getCameraState(...).scale`) to keep the arrow the same size
  on screen while the camera zooms.
- `getCursorState(frame, waypoints): { x, y, pressed, hover, opacity, scale, ripple }`. The first four are the spec'd fields.
- Behaviour: rests at the last waypoint, departs so it arrives exactly on the next waypoint's frame (trip = clamp(distance / 22, 14, 48) frames,
  never longer than the gap), cubic Bezier with seeded control points (never straight), overshoot-and-correct (about 5%).
  Click: scale 1 -> .88 -> 1 over 4 f, crimson ring 6 -> 28 px, opacity .5 -> 0 over 14 f. `hide`: fades out 8 f after that waypoint, fades in over
  the 8 f ending on the next one, no travel. Before the first waypoint it is hidden. Out-of-order waypoints throw.
- Constants: `CURSOR_CLICK_FRAMES = 4`, `CURSOR_RIPPLE_FRAMES = 14`, `CURSOR_FADE_FRAMES = 8`.

**src/fx/Caption.tsx** (stage space): `<Caption text highlight? sub? startFrame endFrame size? />`. `text` is a string or an array of lines. CMU Serif 700, 56..76 px
(default 72, shrinks to fit the 1728 px safe width, never below 56), bottom-centre 110 px above the edge, masked line rise (20 f in, 12 f out upwards;
gone at `endFrame`). `highlight` is drawn in accent-ink; `sub` is a mono 24 px line.

**src/fx/KineticText.tsx** (stage space): `<KineticText text startFrame endFrame? fontSize? family? weight? italic? align? color? highlight? underline? stagger? riseFrames? />`.
Words rise out of their own masks, 3 f apart (`stagger`). `underline: { word, delay?, frames? }` draws a crimson line (the only glow) after the last word lands.
`endFrame` makes the words leave upwards in the same order. A word that is not in the text throws.

**src/fx/Callout.tsx** (stage space): `<Callout text variant? target camera? side? lead? along? mono? size? startFrame endFrame />`.
`variant`: "note" | "ok" | "flag". `target`: a `FocusName` or `{x, y}` in LOGICAL coordinates when `camera` (the same keyframes as the `<Camera>`) is given; without
`camera` only a stage-pixel point is allowed. The chip sits OUTSIDE the focus rectangle (`lead` = 72 px beyond the edge, dot 12 px inside it) and flips to the opposite
side if it would leave the 96 px safe margin. Text over 5 words throws. Dot pops, leader draws, chip is revealed by a clip from the dot's side; it leaves in reverse
during the last 10 f. Frame the shot with about 170 px of padding on the callout's side so a chip fits.

**src/fx/StatNumeral.tsx**: `<StatNumeral value from? unit? startFrame durationFrames? decimals? group? size? color? hideBefore? />`. Signature-ease count; digits that already
match the final value from the left are full ink, the rest dim; a 2.5% punch on landing. The caller must show "not measured" for a null measurement; never pass 0 for it.

**src/fx/Glow.tsx**: `<Glow x y radius? color? intensity? period? depth? startFrame? endFrame? fadeFrames? />` (radial bloom, cosine breath). Only for the accent underline, the dial and the decoys.
**src/fx/Grain.tsx**: `<Grain opacity? frequency? />` (3%, feTurbulence re-seeded per frame with `grainSeed(frame)`). **src/fx/Vignette.tsx**: `<Vignette strength? />` (12%).
**src/fx/Spotlight.tsx**: `<Spotlight startFrame durationFrames? rect? angle? band? intensity? radius? />` (one specular sweep).
**src/fx/GridPaper.tsx**: `<GridPaper perspective? tilt? speed? lines? opacity? />` (44 px engineering grid over the two glows; `perspective` lays it on a receding floor).
**src/fx/Toast.tsx** (stage space): `<Toast title text? tone? startFrame endFrame corner? width? />`, `tone`: "ok" | "bad" | "warn" | "info" (status only). Slides in from the stage edge (masked by it).
**src/fx/KeyCap.tsx**: `<KeyCap label startFrame? pressAt? size? />` (pressAt = global frames at which the key goes down, 6 f).
**src/fx/Badge.tsx**: `<Badge label tone? pulse? reveal? dot? size? />` is "dumb": scenes pass `pulse` (0..1) and `reveal` (0..1). Helpers `badgePulse(frame, period = 45)`, `badgeReveal(frame, startFrame, frames = 14)`.
`tone`: "accent" | "ok" | "bad" | "warn" | "info" | "mute". Mono, at least 20 px.
**src/fx/util.ts** (internal helpers): `inOut`, `estimateWidth`, `checkRange`, `splitHighlight`, `SERIF_ADVANCE`, `MONO_ADVANCE`.

**src/dev/DevFxSheet.tsx**: composition `DevFxSheet` (360 f). Exercises the camera over taskForm, blastPanel, dial and back (tilt, DOF, a shake on f180), a cursor path with clicks on
f96 and f180 and a hide/return, a caption, a kinetic line, the three callout variants plus an `ok` one on the dial, numerals, two badges, two toasts, key caps, glow, spotlight, grain and vignette.
Exports `DEV_FX_FRAMES`, `DEV_FX_CAMERA`, `DEV_FX_CURSOR`. Its labels and numbers are developer notes and made-up values, not film copy and not evidence.

### Decisions and conventions future patches must follow
1. Scene files export `SN_CAMERA: CameraKeyframe[]` and `SN_CURSOR: CursorWaypoint[]` and build keyframes with `kf(frame, "focusName", {...})`; nobody else types a UI coordinate.
2. Layers: window content and `<Cursor>` go INSIDE `<Camera>` (logical px). Captions, callouts, badges, toasts, KineticText, Grain and Vignette go OUTSIDE it (stage px).
   A callout follows the camera because it receives the same `camera` keyframes; give it the scene's `SN_CAMERA`.
3. Callouts are 5 words at most (it throws). Captions are one line: a caption that cannot fit 1728 px at 56 px must be given as two lines. `copy.s7.caption` (69 characters)
   is one: S7 should pass it as an array of two lines (split after "promise.").
4. Cursor visibility follows BIBLE 5: it is shown in S2, S4a and S6 only; elsewhere give no waypoints (nothing renders).
5. Impacts: put `shake` on a keyframe that lands on a beat (f180, f2340, ...). The shake is smooth, seeded, decays over 8 f and adds to the drift, so there is no jitter at hand-offs.

### Known issues
- Verified: `tsc --noEmit`; stills of `DevFxSheet` rendered with Remotion on a real Chrome at f30, 52, 100, 150, 170, 200, 232, 310 and inspected; numeric checks (not committed) of the cursor
  (arrives exactly on every waypoint frame, 4 f press at .88, 14 f ripple, curved with overshoot, hide/fade, determinism, out-of-order throws) and the camera (deterministic, shake lasts 8 f,
  tilt clamps at 5 deg Y and 14 deg when wide, scale within 1.0..2.6). NOT checked: motion by eye in the Studio, and the S1/S9 wide-tilt range in a real scene.
- The camera spring (BIBLE 5, {26, 90, 1.1}) is fast: a 1700 px pan peaks near 250 px/frame in the first frames. For long moves that should feel gentler use `ease: "signature", frames: 40`.
- `Grain` uses an SVG `feTurbulence` at 1920 x 1080 every frame; it is the slowest overlay in a render. If a render is slow, lower `frequency` or render it only on some scenes.
- `Spotlight` and `Badge` clip with `clip-path`, which also clips their own shadows.

### Warnings for the next patch
- Patches 05 to 07 build the real UI: if a panel's real position differs from `src/config/focus.ts`, update that file (the camera follows automatically).
- Patch 04 (text engines) and patches 05+ also edit `src/Root.tsx`: it now contains `DevBrandSheet` AND `DevFxSheet` and must keep both.

---

## PATCH 04 - Text engines

**Files created**
src/lib/typing.ts, src/lib/stream.ts, src/lib/hash.ts, src/ui/TerminalView.tsx, src/ui/GlitchLayer.tsx, src/dev/DevText.tsx

**Files changed**
src/lib/prng.ts (adds `mixSeed`, nothing else touched), src/Root.tsx (registers `DevText`, 1920x1080, 300 f; keeps `DevBrandSheet` and `DevFxSheet`), docs/PATCH_NOTES.md

Everything here is pure and deterministic (no frame reads in the libs, no timers, no Math.random, no CSS transitions). The libs take frames as
arguments (GLOBAL film frames); `TerminalView` never reads the frame; `GlitchLayer` reads `useCurrentFrame()` only to seed its noise (override with `frame`).

### PUBLIC API

**src/lib/prng.ts** (added): `mixSeed(a, b): number` mixes two integers into one well-spread 32-bit seed. Use `rand(mixSeed(seed, i))` for a stateless value per (seed, index).

**src/lib/typing.ts**
- `interface TypingOpts { cps?=38, jitter?=0.4, seed?, pausePunct?=2.6 (frames), pauseSpace?=0.7 (frames), fps?=30 }`
- `typedText(fullText, frame, startFrame, opts?): string` visible prefix. "" before `startFrame`; the first character lands ON `startFrame`.
- `typedCount(fullText, frame, startFrame, opts?): number` characters visible (code points).
- `typingEndFrame(fullText, startFrame, opts?): number` first frame on which the whole text is visible (empty text: `startFrame`).
- `caretVisible(frame): boolean` 16 frames on / 16 off, ON at frame 0.
- `typingCaret(fullText, frame, startFrame, opts?): boolean` solid while typing, then blinks starting ON on `typingEndFrame`.
- Speed: ~38 chars/s of base delay (+-40% jitter) PLUS the pauses, so the effective rate of ordinary prose is ~30 chars/s. Pass `cps` to retime a line.
- Default seed is derived from the text, so the same text always types the same way; pass `opts.seed` for a different rhythm. Use integer start frames.

**src/lib/stream.ts**
- `streamLines<T extends { text: string }>(lines, frame, startFrame, endFrame, seed): { visibleLines: T[]; caretLine: number; caretCol: number }`
  Reveals the lines in irregular bursts (stalls, trickles, floods), counted in characters, so the line being written is partial. Monotonic; everything is visible at `endFrame`.
  The last visible line is cut short while it arrives; other fields of a line (`tone`) are copied through. `caretLine` = last visible row, `caretCol` = its visible length.
  There is NO trailing newline: when the stream is done the caret sits at the end of the last line. A row is visible (maybe empty) as soon as the newline before it has been consumed. Throws if `endFrame <= startFrame`.
- `streamArrivals(lines, startFrame, endFrame, seed): number[]` first frame on which each line is visible (line 0 = `startFrame`). For per-line sound ticks and the tail scroll.
- `tailScrollOffset(frame, fps, arrivalFrames): number` (<= 0, in rows) spring-eased lag for `TerminalView tail`: every new row pushes the content up at once and this lets it settle on the "panel" spring. Pass the arrival frame of EVERY row in order.

**src/lib/hash.ts**
- `lockHex(finalHex, frame, startFrame, lockFrames, seed = 0): string` same length as `finalHex`; characters lock left to right, the rest are seeded hex digits that change every 2 frames (halves of the string alternate frames). Non-hex characters (separators) are always shown. Upper-case input gets upper-case scramble.
- `lockedCount(finalHex | length, frame, startFrame, lockFrames): number` 0 at or before `startFrame`, all from `startFrame + lockFrames`, linear between. Use it for sound cues (one tick per newly locked character).
- `shortHash(h, n = 8)`; `HASH_SCRAMBLE_FRAMES = 2`.

**src/ui/TerminalView.tsx**
- `<TerminalView lines caretLine? caretCol? caretOn? scrollOffset tail? width height />`; `TermLine { text: string; tone?: "out" | "cmd" | "err" | "dim" }`, `TermTone`, `TerminalViewProps`.
- Draws only the text surface (term-bg, term-fg, term-dim, CMU Typewriter 15 px, line height 1.45). NOT the window chrome (traffic lights, "sandbox - /workspace" strip, event count): the Workspace patch (06) wraps it.
- Tones: `out` = termFg, `dim` = termDim, `err` = bad (text color only, no hatching: the app's terminal does not hatch), `cmd` = termFg with a dim "$ " prompt drawn by the component (`text` is the command only, and `caretCol` counts the text only).
- Rows are exactly `TERM_LINE_PX` (21.75 px) tall, never wrap, clip with an ellipsis, and are clipped at the text area (padding `TERM_PAD_X` 13, `TERM_PAD_Y` 9), like the app's xterm.
- The caret is absolutely positioned in `ch` units (no layout effect). Blink it with `caretOn`, never by dropping `caretLine`: the row count includes the caret row, and the tail scroll depends on the row count. `caretLine` may equal `lines.length` (an empty row below the last line).
- Scroll, in ROWS: `tail=false`: `scrollOffset` = rows scrolled up from the top. `tail=true`: the newest row rests at the bottom and `scrollOffset` (<= 0, from `tailScrollOffset`) is added to that resting position.
- Control characters are stripped, tabs become 4 spaces (the app strips them too).
- Also exported: `TERM_FONT_PX`, `TERM_LINE_HEIGHT`, `TERM_LINE_PX`, `TERM_PAD_X`, `TERM_PAD_Y`, `TERM_PROMPT`, `terminalCapacity(height)`.

**src/ui/GlitchLayer.tsx**
- `<GlitchLayer strength seed? frame?>children</GlitchLayer>` (position:absolute, inset 0: put it in a positioned box). Strength 0 renders the children untouched, with no filter. Above 0: RGB split (up to ~12 px), hard-edged slice displacement (up to ~70 px), a few faint accent bars (<= 12% opacity). The pattern holds 2 frames (`GLITCH_HOLD_FRAMES`).
- `glitchParams(strength, seed, frame): GlitchParams` the pure parameters of one pattern (exported for checks).
- Wrap OPAQUE content: the three channel copies are added back together, which is exact for opaque pixels only.

**src/dev/DevText.tsx** + composition `DevText` (1920x1080, 300 f). Exports `DEV_TEXT_FRAMES`. A command typed into the terminal (f8 to ~f48), 12 lines streamed (to ~f150, 10-row terminal so the tail scroll shows), a 64-hex hash locking f170 to f266, the glitch at 0 / .5 / 1. Its text is developer notes, not film copy or evidence; the hash is the real SHA-256 of "abc".

### Decisions and conventions future patches must follow
1. Terminal rows come from `TermLine[]`. The Workspace terminal (patch 06) maps ledger events to lines the way the app's `render()` does (commands as `cmd`, `[exit N]` and policy lines as `dim`/`err`) and passes them in; it should NOT re-implement typing or streaming.
2. For a typed command followed by streamed output (S0, S2): render `[typed cmd line]` while typing, then `[full cmd, ...streamLines(...).visibleLines]` with `caretLine + 1`. `DevText.tsx` is the worked example, including the arrival list for the tail scroll.
3. A caret never blinks while characters arrive: use `typingCaret` for typed text, and `frame < endFrame ? true : caretVisible(frame - endFrame)` for a stream.
4. Hash text: show `lockHex(...)` in a monospace box of fixed width (it has the length of the final value, so nothing jumps) and tick sounds from `lockedCount`. Never type a hash in a component: the final hex comes from `src/data/select.ts`.
5. `mixSeed` is the way to derive per-index seeds. Do not use `seed + i`.
6. The S0 hook wraps its OPAQUE stage layer in `<GlitchLayer strength={...}>` (BIBLE 6: 0 to 1 over f165-179, then the collapse).

### Known issues
- Verified: `tsc --noEmit`; property checks of the pure helpers (monotonic, prefix-consistent, deterministic, exact at the endpoints, left-to-right locking, code points, bad range throws); stills of `DevText` rendered with Remotion on a real Chromium at f26 (mid-typing), f110 (mid-stream), f218 (mid-hash-lock, 32/64) and f290 (fully locked) and inspected. NOT checked: the motion by eye in the Studio.
- The glitch is cheap (one SVG filter, only while strength > 0), but it is a full-size feTurbulence + displacement filter: render it only on the frames that need it (S0 f165-179).
- The slice displacement pulls in transparent pixels at the right and left edges of the glitched box, which shows as thin dark bars. That is part of the look; put the layer over an opaque backdrop if it should not show.
- `TerminalView` measures columns with the 0.525 em advance of CMU Typewriter; with the fallback monospace font the caret still lines up (it uses `ch`), only the clamp of a caret past the right edge is approximate.

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet` AND `DevText`: every patch that adds a Dev composition must keep all three.
- Patch 06 builds the Workspace terminal around `TerminalView` and must pass `width`/`height` in logical px (the camera does the zooming).

## PATCH 05 - UI kit A: window, header nav, primitives

**New files:** `src/ui/AppWindow.tsx`, `src/ui/Header.tsx`, `src/ui/primitives.tsx`, `src/dev/DevShell.tsx` (+ composition `DevShell`, 1920x1080, 5 f).
**Changed files:** `src/config/focus.ts` (geometry corrected), `src/config/copy.ts` (new `ui` group), `src/Root.tsx` (DevShell registered).

### PUBLIC API

**src/ui/AppWindow.tsx**
- `<AppWindow header? rim? style?>body</AppWindow>`: the 1600 x 900 logical window (radius 14, 1 px border, deep shadow, app background, base text styles). The border is an overlay inside the box, so the content area is exactly 1600 x 900. `rim` 0..1 is the crimson rim light. The body slot is `<main>` (flex column, fills 832.53 px).
- `WINDOW_RADIUS`.

**src/ui/Header.tsx**
- `<Header activeScreen taskId status tokenApplied tokenChars? tokenFocused? tabHighlight? themeIcon? themeHover? pulse? />`. `activeScreen` may be fractional (the underline slides; the caller eases it).
- `navLayout(activeScreen)`, `navUnderline(activeScreen)`, `navItemRect(index, activeScreen?)` (window px, for cursor targets), `statusTone(status)`, `NAV_W_REG`, `NAV_W_BOLD`, `NAV_GAP`, `SCREEN_COUNT`.
- Nav widths are fixed numbers measured in a browser with CMU Serif, so layout never depends on font loading.

**src/ui/primitives.tsx**
- Units: `rem(n)` (n x 17 px), `sp(n)` (n x 4.25 px). Text styles: `SMCP`, `DISPLAY`.
- Tone tables: `INK`, `EDGE`, `WASH`, `BAR`, `VAR`; type `Tint` = `Tone | "mute"`.
- Components: `Label`, `Chip`, `Card`, `Btn` (variants primary/ghost/danger/warn/info, `pressed`, `hover`, `disabled`, sizes sm/md), `Segmented`, `HairlineAccent`, `SectionHead`, `Kbd`, `Pulse`, `Spin`, `Meter`, `Donut`.
- Frame helpers: `pulsePhase(frame)`, `PULSE_FRAMES` (30), `spinProgress(frame)`, `SPIN_FRAMES` (30).

### Decisions and conventions future patches must follow
1. Every primitive is pure: motion (Spin, Pulse, Meter and Donut fills) is passed in as a prop, computed by the scene. No hooks that read the frame, no CSS transitions.
2. Colors come from `theme`, never from CSS variables. Tailwind classes are translated with `rem()` / `sp()` at the 17 px root.
3. `focus.ts` was corrected: `GRID.headerH` 60 -> 67.47, new `GRID.headerInnerH` 65.47 and `GRID.navX` 375.11, and `FOCUS.nav` is now `{ x: 375.11, y: 0, w: 674, h: 65.47 }`. Every rect derived from `headerH` moved down by 7.47 px and the body is 832.53 px tall.
4. `copy.ts` has a new `ui` group (wordmark, subtitle, six screen names, token placeholder). It holds no measured value.
5. Place the window with `left: (STAGE.w - LOGICAL.w) / 2` etc. (see `DevShell.tsx`); the camera does the real placement.

### Known issues
- Verified: `tsc --noEmit` is clean. NOT verified here: stills of `DevShell` (no browser available in the build sandbox) and the side-by-side with the real app. Run `npx remotion still src/index.ts DevShell out/qa/shell-N.png --frame=N` for N = 0..4 and compare.
- `Header` masks the token with `-webkit-text-security: disc` (Chromium, which Remotion renders with).

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText` AND `DevShell`: every patch that adds a Dev composition must keep all four.

## PATCH 06 - UI kit B: Workspace and the Blast panel

**New files:** `src/ui/chrome.tsx`, `src/ui/TaskForm.tsx`, `src/ui/StepStream.tsx`, `src/ui/TerminalPane.tsx`, `src/ui/BlastPanel.tsx`, `src/ui/Workspace.tsx`, `src/lib/gauges.ts`, `src/lib/rise.ts`, `src/lib/terminal-lines.ts`, `src/dev/DevWorkspace.tsx` (+ composition `DevWorkspace`, 1920x1080, 600 f).
**Changed files:** `src/ui/TerminalView.tsx` (TermTone gains `warn` and `ok`), `src/config/copy.ts` (new `ws` group), `src/Root.tsx` (DevWorkspace registered).

### PUBLIC API

**src/lib/gauges.ts** (ported UNCHANGED from the product)
- `gaugesOf(events, running): G[]` (seven gauges in display order), `phaseOf(events, running)`, `GAUGE_KEYS`, types `G`, `GaugeKey`, `Phase`. Every gauge value and subtitle comes out of this function; nothing in a component types one.

**src/lib/rise.ts**
- `riseProgress(frame, startFrame, duration = RISE_FRAMES)`, `riseStyle(p, px = RISE_PX)`; `RISE_FRAMES` 8, `RISE_PX` 14, curve `cubic-bezier(.2,.7,.2,1)`. A settled row (p = 1) gets an empty style.

**src/lib/terminal-lines.ts**
- `terminalRows(events): TermRow[]`: ledger events -> terminal rows, same strings and the same repeated-egress folding as the app's Terminal.tsx. `TermRow.src` is the index of the source event (use it to give each row the frame of its event).

**src/ui/chrome.tsx**: `PaneHead`, `Hash`, `Seal`, `FieldSelect`, `fieldStyle`, `LISTING_STYLE`, `Md` (paragraphs, bold, inline code, fences), `NOTE`, `DOT`.

**src/ui/TaskForm.tsx**: `<TaskForm scenario hasScenarios text textFocused caretOn textScrollRows selectFocused selectHover profile profileHover holdSeconds holdFocused holdHover chipHover running spin runHover runPressed error />`, `TEXTAREA_H`.

**src/ui/StepStream.tsx**: `<StepStream events progress? scrollLag? />` (progress[i] = rise of `stepEvents(events)[i]`), `stepEvents(events)`. Bottom-anchored, so the newest step rests at the bottom with no measuring.

**src/ui/TerminalPane.tsx**: `<TerminalPane tab tabHover lines caretLine caretCol caretOn scrollOffset tail eventCount emptyRise ringTurn width height>{browser/files}</TerminalPane>`, `terminalPaneLayout(width, height)`, `WORKSPACE_BODY_H`, `CENTER_W`.

**src/ui/BlastPanel.tsx**: `<BlastPanel events running report? reveal? flash? flashAmount? pulse? breathe? scan? progressOf? scrollY? />`, `GaugeCard`, `dialVerdict(gauges, phase)`, `dialDims(gauges, reveal)`, `DIAL_SIZE`. `reveal[]` is indexed like `GAUGE_KEYS`: it is the card's entrance AND the draw of its dial arc. `report` is `{ verified, detail, headHash }`.

**src/ui/Workspace.tsx**: `<Workspace form steps terminal blast />`, the real grid 374 | 767 | 459 inside the AppWindow body.

### Decisions and conventions future patches must follow
1. The transcript is the app's transcript (rail, agent card, tool listing, closed "result", describe() lines, final task card), not a new design. `StepStream` decides WHICH events show (STEP_TYPES); the scene decides WHEN, through `progress[]`.
2. The dial is the patch 01 `RadiusDial`; `BlastPanel` maps gauge tones to dial states (bad -> flag, warn -> review, info/unmeasured -> unmeasured, else clean) and derives the verdict word exactly as the app does.
3. `TermTone` now has `warn` (amber) and `ok` (blue) for `[policy:ask]`, `[approval needed]` and `[approved]` rows.
4. Layout heights inside `TerminalPane` come from the source classes (see the constants at the top of the file), not from a browser measurement.
5. `copy.ts` has a new `ws` group. It holds no measured value.

### Known issues
- Verified: `tsc --noEmit` is clean, and stills of `DevWorkspace` at frames 0 (no task), 300 (mid-run), 590 (after destroy) and 599 (panel scrolled to the seal, chain and log) were rendered and read: the gauge subtitles read "blocked · N allowed · N host(s)", "denied · N approval(s) · N checked", "real in sandbox · N of N decoys read · N used" and "peak of 512 · N/128 pids · N s cpu". NOT verified: a side-by-side with the real app.
- `src/config/focus.ts` was NOT refined. The Blast panel's real dial is 16.5rem (280.5 px) and the gauge gap is 10.625 px (gap-2.5), so `GRID.dial` (232) and `GRID.gaugeGap` (12), and the focus rectangles derived from them (`dial`, `gaugeNetwork`, `gaugeSecrets`, `gaugeCompute`), are off by a few px to tens of px. Measure in a browser against the app, then update focus.ts (that is the camera's single source).
- The browser and files tabs are empty slots (`children` of `TerminalPane`) until their patch.
- `Md` draws paragraphs, bold, inline code and fences only (the app uses react-markdown).

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell` AND `DevWorkspace`: every patch that adds a Dev composition must keep all five.
- Rebuilding the stills needs a browser: `npx remotion still src/index.ts DevWorkspace out/qa/ws-300.png --frame=300`.

## PATCH 07 - UI kit C: Attack Lab, Report, Infra (+ Timeline)

**New files:** `src/ui/page.tsx`, `src/ui/AttackLabScreen.tsx`, `src/ui/ReportScreen.tsx`, `src/ui/InfraScreen.tsx`, `src/ui/TimelineScreen.tsx`, `src/dev/DevScreens.tsx` (+ composition `DevScreens`, 1920x1080, 600 f), `src/dev/devCatalog.ts` (dev-only fixture, see Warnings).
**Changed files:** `src/config/copy.ts` (new groups `lab`, `rep`, `inf`, `tl`; added to the `copy` object), `src/Root.tsx` (DevScreens registered), `docs/PATCH_NOTES.md`.

### PUBLIC API

**src/ui/page.tsx** (shared parts, ported from the app's ui.tsx): `PageHead { eyebrow, title, sub, right }`, `Row { k, mono }` (key ...... value), `Stat { label, value, sub, tone, size }`,
`Disclosure { summary, open }` (a `<details>` drawn closed or open), style helpers `TABULAR`, `CLAMP_2`, `BREAK_ALL`, `TRUNCATE`, `inkOf(tone)`. All pure.

**src/ui/AttackLabScreen.tsx**
- `<AttackLabScreen attacks tiles selected runningName results stepsVisible stepProgress checksVisible checkProgress verdictStamp press? hover? runAllRunning? spin? pulse? donutFill? openDetails? listScrollY? detailScrollY? />`
  - `attacks: AttackInfo[]` (lab order, BIBLE Appendix D): titles, summaries, categories, `tries`, `checks`, `expected` are DATA, never typed here.
  - `tiles: { name; state: "notrun"|"running"|"contained"|"breached"|"inconclusive"|"error"|"unavailable" }[]` (the spec'd five plus the app's `error` = "could not run" and `unavailable`). The donut, "N/15" and the status sentences are COUNTED from the tiles (`labTally`), as the app counts its runs.
  - `results: Record<name, AttackResult | undefined>`; the selected attack shows its result when one exists and any of stepsVisible / checksVisible / verdictStamp is > 0, otherwise its preview (what the attacker tries, what will be checked).
  - `stepsVisible` / `stepProgress[i]`: how many steps of the selected result are drawn and each row's rise 0..1. `checksVisible` / `checkProgress[i]`: same for the checks, in DISPLAY order (`orderedChecks(checks)`: the attack's own first, then "Checked on every attack"); a check rises over the first 0.4 of its progress, then its mark lights grey -> pass/fail/not-proven.
  - `verdictStamp` 0..1: the verdict banner lands (12% larger, settles). The banner keeps its space from the first result frame, so the pane never jumps (it is blank until the stamp starts).
  - `press: "runAll" | "run"` presses the summary button / the selected card's Run button. `hover: { tile?, card?, run?, runAll?, openReport? }`.
  - `donutFill` 0..1 grows the donut arcs; `listScrollY` / `detailScrollY` scroll the two columns (px).
- Also exported: `labTally(attacks, tiles)`, `orderedChecks(checks)`, `verdictOfTile(state)`, `LAB_LIST_W` (459), types `TileState`, `AttackTile`, `LabTally`, `AttackLabHover`, `AttackLabScreenProps`.
- Tone/chip rules are the app's: contained = blue, breached = bad + hatching (tile, banner, check mark), inconclusive = amber, only a denied command's output is open by default.

**src/ui/ReportScreen.tsx**
- `<ReportScreen report reveal? headReveal? verify? pressVerify? hoverVerify? scrollY? />`. `report: Report`. Cards come from `Object.entries(report.dimensions)` IN ORDER, never re-sorted; `reveal[i]` 0..1 per card (flip-in; a card at 0 keeps its space).
- `verify: { state: "idle" | "running" | "done"; progress; result?: Verification }`. running: busy ring (progress = 0..1 through 3 turns). done: the line "Re-verified just now from the stored ledger: intact - <detail> - head <8 hex>" under the seal (progress = its rise). Wording is the app's: "intact" / "TAMPERED".
- `Headline` is the app's function ported unchanged (network, policy, compute, time, secrets, filesystem, persistence; anything else draws no picture). `DimensionCard { no, name, d, reveal }` is exported.
- NOT MEASURED: `status: "not_measured"` is drawn in the dotted style (dotted frame, a "not measured" chip, the backend's own italic `note`), never a zero and never a picture. An unknown status such as `not_used` (the browser dimension of a task that never opened a page) is drawn as the app draws it: a mute chip with the status words and no picture.
- The KPI strip only includes dimensions that are measured. The "n measurements" disclosure is drawn closed.

**src/ui/InfraScreen.tsx**
- `<InfraScreen infra reveal? pulse? flash? scrollY? />`. `reveal[0]` = the wiring diagram, `reveal[1..6]` = panels §1..§6; `flash[i]` lights an item in its status tone for a moment. `Panel` and `Gauge` are exported.
- The Vultr public IP is never read (BIBLE 10.5) and the API key row only says "set (never shown)" / "not set".

**src/ui/TimelineScreen.tsx**: built for real (it was cheap), not a stub. `<TimelineScreen taskId nodes holding? rewindPending? running? reveal? scrollY? />`; `nodes` come from `timeline(events)` of src/lib/derive.ts. Not used in the film body.

**src/config/copy.ts**: `lab`, `rep`, `inf`, `tl`: static wording, word for word from AttackLab.tsx, Report.tsx, Infra.tsx, Timeline.tsx. No measured value in them.

**src/dev/DevScreens.tsx** + composition `DevScreens` (600 f): f0-59 Attack Lab empty (0/15, 15 "not run" tiles); f66-90 hover, press and run of rewind_after_rm_rf; f94-236 its steps rise, then the checks light one by one; f236 the verdict stamps, tile turns blue, donut 1/15; f246-290 the pane scrolls to the checks; f300-419 the Report, nine cards flip in; f424-452 "Verify ledger now" pressed, spinning, result line; f480-599 Infra, diagram then six panels, each flashing once.
Stills: `npx remotion still src/index.ts DevScreens out/qa/screens-N.png --frame=N` for N = 0, 80, 240, 290, 400, 470, 570.

### Decisions and conventions future patches must follow
1. Screens are dumb: no frame reads; every motion (rise, stamp, reveal, scroll, press, hover, spin, pulse) is a prop computed by the scene. Entrances use `riseProgress` / `riseStyle` from src/lib/rise.ts.
2. Screens fill the AppWindow body (`flex: 1 1 0%`). Put one inside `<AppWindow header={<Header activeScreen=2|3|5 .../>}>`.
3. Counts in the Attack Lab are derived from `tiles`; a scene that wants "N of 15" to animate passes tile states (and `donutFill`), it never types a number.
4. Report cards are drawn in the report's own key order; "not measured" is never turned into a number.
5. `src/dev/devCatalog.ts` must not be imported by a scene (see Warnings).

### Known issues
- Verified: `tsc --noEmit` is clean, and stills of DevScreens at f0, 80, 200, 240, 290, 400, 470 and 570 were rendered with Remotion on the system Chrome and read. NOT verified: a side-by-side with the live app (type scale, spacing and chip tones were ported from the class names, not measured), and the motion by eye in the Studio.
- The `write` tool word of an Attack Lab step (small caps in a `w-9` box, as in the source) is a little wider than its box, so it sits tight against the command text. It follows the source's classes; compare with the live app before changing it.
- `src/config/focus.ts` was NOT refined: the rectangles `attackSummary`, `attackGrid`, `attackDetail`, `reportGrid`, `verifyButton` and `infraDiagram` are still the patch 03 estimates. The real positions are now in the components (summary bar about 150 px under the header, card list 459 px wide, the Report page scrolls); measure in a browser and update focus.ts before the S4 / S6 / S8 camera work. The Report and Infra pages are scrolled with `scrollY`, so a camera focus on them also depends on the scene's scroll value.
- The Report's `Seal` shows the full head hash (as the app does); the 8-hex short head appears in the re-verified line.

### Warnings for the next patch
- EVIDENCE GAP: the attack CATALOG (title, summary, category, profile, expected, tries, check labels of all 15 attacks) is not in evidence.json: patch 02's capture keeps only `AttackResult`s of the 5 core attacks and `attackSummary` counts. The Attack Lab cards need an `AttackInfo` for every attack, so S4 needs `evidence.attackCatalog` (store the `attacks` array of GET /api/attacks in scripts/capture-evidence.mjs, add the type to types.ts and a `selectAttackCatalog()` to select.ts, and add it to the sample builders). Until then `src/dev/devCatalog.ts` holds the product's own `describe()` output for the 15 attacks as a DEV fixture. It is not evidence and must not reach a render.
- Tiles for the 10 non-core attacks have no `AttackResult` in the evidence: their state can only come from `attackSummary` (15/15 contained), so a scene that shows them as contained should say so from that summary rather than invent per-attack verdicts.
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell`, `DevWorkspace` AND `DevScreens`: every patch that adds a Dev composition must keep all six.

## PATCH 08 - Explainers A: hardened container, decoy rack, egress wall

**New files:** `src/gfx/Packet.tsx`, `src/gfx/ContainerBox.tsx`, `src/gfx/DecoyRack.tsx`, `src/gfx/EgressWall.tsx`, `src/dev/DevGfxA.tsx` (+ composition `DevGfxA`, 1920x1080, 600 f, default prop `specimenUsed: false`).
**Changed files:** `src/config/copy.ts` (new group `gfxA`, added to the `copy` object), `src/Root.tsx` (DevGfxA registered), `docs/PATCH_NOTES.md`.

Everything in `src/gfx` is pure and props-driven (nothing reads the frame, no CSS transitions, no timers, randomness only through `mixSeed`/`rand`). Scenes pass 0..1 progress values. Components apply their own easing to a LINEAR progress, so pass `lin = clamp01((frame - start) / len)`, not an eased value (the one exception is `auditProgress`, which is the sweep position: the scene eases it).

### PUBLIC API

**src/gfx/Packet.tsx**
- `<Packet x y streak? size? color? opacity? label? labelOpacity? />` stage px, `x`/`y` = centre of the glyph, the streak trails to its left. `label` is mono 20 px above it (an evidence host).
- `PACKET_SIZE = 22`, `PACKET_STREAK = 72`.

**src/gfx/ContainerBox.tsx**
- `<ContainerBox x y chips chipProgress drawProgress? sealProgress? auditProgress? stamp? stampProgress? stampAnchor? >children</ContainerBox>`
  - `x`, `y`: top-left of the 1100 x 600 box in STAGE px. `children`: BOX-LOCAL px (origin = box top-left).
  - `chips: readonly string[]` exactly 6 (pass `copy.s3.chips`), `chipProgress: readonly number[]` one 0..1 per chip. A wrong length throws. Landing order is clockwise from the top-left: 3 on the top edge, 1 on the right edge, 2 on the bottom edge (`CHIP_SLOTS`). Per chip: stem draws, chip is revealed from the stem side, the crimson attach dot pops with a ring.
  - `drawProgress` (default 1): outline, corner ticks, registration crosses and the grid interior draw on. `sealProgress` (default 0): the crimson seal ring closes from top centre to bottom centre, 22 px outside the box. `auditProgress` (default 0): scan line left to right with a trailing wash and a tick ruler that lights behind it. `stamp` + `stampProgress` + `stampAnchor` (default centre): the result stamp slot.
- `<StampBox tone? size?>text</StampBox>`: the stamp plate to put in the slot (`tone` "ok" | "bad" | "warn" | "info", default "ok").
- Exports `BOX_W = 1100`, `BOX_H = 600`, `BOX_RADIUS = 24`, `CHIP_SLOTS`, type `ChipSlot`, `ContainerBoxProps`.

**src/gfx/DecoyRack.tsx**
- `<DecoyRack x y tiles stateLabels dim? columns? />`, positioned in its parent's space (inside the box slot: box-local px). 3 columns by default (3 x 2 for six decoys).
  - `tiles: DecoyTile[]` = `{ id, label, state: "idle" | "read" | "used", reveal?, stateProgress?, line?, lineProgress? }`. `id` only picks the icon (key, id badge, cloud, token, database, card, document), it is never shown. `label` comes from the `canary.seeded` event. `stateProgress` 0..1 develops the current state: read = amber light-up and a two-ring ripple, used = vermilion with diagonal hatching (no ripple). `line` is the mono ledger line that rises under the tile (use `describe(event).text`), `lineProgress` 0..1 raises it. `reveal` 0..1 is the entrance.
  - `stateLabels: Record<DecoyState, string>`: pass `{ idle: copy.gfxA.decoyIdle, read: copy.gfxA.decoyRead, used: copy.gfxA.decoyUsed }`. `dim` 0..1 steps the whole rack back (used while the audit stamp is shown).
- Exports `decoyRackSize(count, columns?)` -> `{ w, h, lineRoom }` (tile area, plus the room a last-row ledger line needs), `TILE_W 300`, `TILE_H 160`, `COL_GAP 48`, `ROW_GAP 84`, `LINE_ROOM 70`, types `DecoyState`, `DecoyTile`, `DecoyRackProps`.

**src/gfx/EgressWall.tsx**
- `<EgressWall fromX allowedHosts plaqueTitle refusedLabel packets wallX? top? bottom? toX? proxyLabel? reveal? seed? />`: a FULL-STAGE layer (absolute, 1920 x 1080, all coordinates are stage px). Wall at `wallX` (default 1500), `top` 200, `bottom` 880. Plaque on its right with the allowed hosts (`infra.egress.allowed_hosts`), a heading (`copy.gfxA.allowlist`) and an optional proxy line (`infra.egress.proxy`).
  - `packets: EgressPacket[]` = `{ y, progress, label, blocked }`. `progress` = distance travelled / route length (`fromX` to `toX`, default 1800), NOT clamped at 1, so a refusal keeps playing after the route ends and its tag stays. Get it from `packetProgress(frame, startFrame, fromX, toX?)`, which moves at the BIBLE speed of 18 px/frame.
  - allowed: crosses the wall (the gate lights blue where it passes) and fades out near `toX`. blocked: stops at the wall; shockwave ring (radius 0 to 140 in 12 f) plus a thin second ring, 24 seeded shards (3 to 9 px/f, fade over 24 f, clipped to the container's side of the wall), a wall flash, a mark left on the wall, and a hatched tag with `refusedLabel` over the host that rises from frame 3 to 13 after the hit.
- Exports `packetProgress`, `packetWallFrame(startFrame, fromX, wallX?)` (frame at which a packet touches the wall), `PACKET_PX_PER_FRAME = 18`, `SHOCKWAVE_FRAMES = 12`, `SHOCKWAVE_RADIUS = 140`, `SHARD_COUNT = 24`, `SHARD_LIFE_FRAMES = 24`, `EGRESS_WALL_X = 1500`, `EGRESS_TO_X = 1800`, types `EgressPacket`, `EgressWallProps`.

**src/config/copy.ts**: new group `gfxA` = `decoyIdle` "planted", `decoyRead` "read", `decoyUsed` "used", `refused` "refused", `allowlist` "allowlist", `stampSecrets` "real secrets in sandbox". Words only: no host, label, hash or number.

**src/dev/DevGfxA.tsx** + composition `DevGfxA` (600 f, S3 timing of BIBLE 6 with scene frame = frame + 1500): f60 box draws, f75/90/105/120/135/150 the six chips, f158 decoys rise, f212 and f252 the two real `canary.read` events light their tiles with their `describe()` line, f270 wall and plaque, f300 the real `egress.blocked` packet (hit at about f312, tag complete at about f325), f360 an allowed packet, f450 to f490 the audit sweep, f496 the stamp, f540 to f585 the seal ring. Exports `DEV_GFX_A_FRAMES`, type `DevGfxAProps`.
Stills: `npx remotion still src/index.ts DevGfxA out/qa/gfxa-N.png --frame=N` for N = 165 (box-chips-complete), 262 (decoy-read), 335 (packet-refused), 515 (audit-stamp). The `used` look: `--frame=330 --props='{"specimenUsed":true}'`.

### Decisions and conventions future patches must follow
1. Layout (stage px) used by the S3 scene: box at (150, 240), so its right edge is x = 1250 and packets start there (`fromX`); wall at x = 1500; plaque and `toX` to the right. BIBLE 11 A says "about 1100 x 600 centered" and "wall at x = 1500", but a centred box would end at x = 1510 and sit ON the wall, so the box moves left. The size and the wall position are as specified.
2. The DecoyRack goes in the box's children slot (box-local px); the EgressWall is a separate full-stage layer ABOVE the box (it needs the stage-wide space to the right of it).
3. All words come from props. Chip texts: `copy.s3.chips` (its "512 MB, no swap" uses a comma where the spec text has a dash; copy.ts is the source). Decoy labels: the `canary.seeded` items. Ledger lines: `describe()` of `canary.read` / `canary.tripped`. Packet and tag hosts: `egress.blocked` / `egress.allowed` events. Allowlist: `infra.egress.allowed_hosts`.
4. The audit stamp is the scene's job, not the component's: build it only if `measure(events)` says the inside was scanned (`audited && scanned`) and found no real secrets, otherwise throw (BIBLE 6 S3). `DevGfxA` shows the pattern.
5. Do not put a packet on screen for an allowed request that is not in the ledger. The sample has no `egress.allowed` event, so `DevGfxA` flies an allowed packet labelled with the first allowlist host as a DEV DEMO and says so in a note. S3 must not copy that: it shows blocked packets from `egress.blocked` events and, if the evidence has any, allowed ones from `egress.allowed`.
6. Status colors: amber = a decoy was read, vermilion with hatching = used or refused, blue = allowed and the clean audit stamp, crimson = the one accent (attach dots, seal ring). Packets are neutral (ink).

### Known issues
- Verified: `tsc --noEmit` is clean and `remotion bundle` succeeds. A throwaway Node harness (not committed) rendered `DevGfxA` to markup for all 600 frames twice (no throw, identical output) and checked: all six chips present at f165 and attached one by one, the ledger line from `describe()` after the first read and not before, the refused tag with the real blocked host after the hit and not before, the stamp "real secrets in sandbox: 0" at f515 and not at f480, the plaque hosts, the `used` word only with the specimen, and the packet speed.
- NOT verified: stills and motion by eye. The build environment had no browser (the Remotion browser download is blocked), so none of the four stills was rendered. Please run the four still commands above and look at them. Things most likely to need a nudge: chip 4 (right edge) next to the wall, the tag position over the wall, the ripple size, and the density of the audit ruler.
- The plaque's right edge is at about x = 1823, just inside the 96 px safe margin (1824) for the three-host sample allowlist; a longer allowlist makes the plaque taller, and a longer host makes it wider than the margin.
- The seal ring and the stamp use CSS `filter: drop-shadow` / box-shadow glows, which Chrome (Remotion) renders; other renderers may ignore them.
- `ContainerBox` and `DecoyRack` throw on a wrong chip count only; a tile `id` that matches no icon rule draws the generic document icon.

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell`, `DevWorkspace`, `DevScreens` AND `DevGfxA`: every patch that adds a Dev composition must keep all seven.
- Patch 09 (explainers B) shares `src/gfx`; reuse `Packet` and the shard approach of `EgressWall` (`mixSeed` per index) rather than writing another particle helper.

---

## PATCH 09 - Explainers B: file lattice, hash lock, hash chain, snapshot timeline

**New files:** `src/gfx/FileLattice.tsx`, `src/gfx/HashTile.tsx`, `src/gfx/HashChain.tsx`, `src/gfx/SnapshotTimeline.tsx`, `src/gfx/GhostContainer.tsx`, `src/dev/DevGfxB.tsx` (+ composition `DevGfxB`, 1920x1080, 900 f, default prop `specimenMismatch: false`).
**Changed files:** `src/config/copy.ts` (new group `gfxB`, added to the `copy` object), `src/Root.tsx` (DevGfxB registered), `docs/PATCH_NOTES.md`.

Same conventions as patch 08: everything in `src/gfx` is pure and props-driven (nothing reads the frame, no CSS transitions, no timers, randomness only through `mixSeed`/`rand`/`randInt`). Scenes pass LINEAR 0..1 progress values; components apply their own easing.

### PUBLIC API

**src/gfx/FileLattice.tsx**
- `<FileLattice x y count? columns? heroIndex? heroLabel? intact? shatter? reassemble? desaturate? seed? footnote? />`, stage px, `x`/`y` = top-left.
  - `count` 24 and `columns` 6 by default (6 x 4). `heroIndex` = cell index of the TOP-LEFT cell of the hero's 2 x 2 block (192 px tile, mono file name); it throws if the block does not fit. `heroLabel` is required with `heroIndex` (an evidence file name: pass the basename of the `write_file` step path).
  - `intact` 0..1 staggered arrival. `shatter` 0..1: every tile breaks into 5-9 seeded triangular shards that drift outward LINEARLY (5-14 px/frame, spin, fade out); the scene gives it `SHATTER_FRAMES = 30` frames. At 1 only dashed empty slots remain (WIPED). `reassemble` 0..1 (use after shatter = 1): shards return along quadratic curves with a 4% overshoot (`overshoot(t, 0.04)`), tiles staggered in reading order; at 1 the tiles are drawn whole again. `desaturate` 0..1 drains colour (the film uses 0.3).
  - `footnote`: mono line under the lattice (pass `copy.gfxB.schematic`).
- Exports `latticeSize(count?, columns?)` -> `{ w, h, rows }`, `TILE 96`, `TILE_GAP 14`, `HERO_TILE 192`, `SHATTER_FRAMES 30`, `SHARDS_MIN 5`, `SHARDS_MAX 9`, `SHARD_SPEED_MIN 5`, `SHARD_SPEED_MAX 14`, `REASSEMBLE_OVERSHOOT 0.04`.

**src/gfx/HashTile.tsx**
- `<HashTile x y finalHex referenceHex lockProgress reveal? tickProgress? clock? seed? snapshotLabel restoredLabel mismatchLabel />`. "snapshot" hash (`referenceHex`) on top, "restored" hash (`finalHex`) below, in the same character columns (mono 22 px, 11.55 px per character), with a hairline per locked column (blue = equal, vermilion = different). The restored hash resolves left to right via `lockHex`; `lockProgress` is linear 0..1 (the film gives 20-24 f per tile); `clock` (the global frame) only drives the scramble flicker.
  - Both hashes must be the same non-zero length (throws). When fully locked AND equal: tick pops (`tickProgress`) and the edge glows ok-blue. When locked and different: hatched vermilion edge, a cross instead of a tick, and `mismatchLabel`. It never shows a tick for a mismatch.
- Exports `hashTileSize(hexLength?)` -> `{ w, h, hashW }`, `HASH_FONT 22`, `HASH_CH_W 11.55`.

**src/gfx/HashChain.tsx**
- `<HashChain x y blocks revealProgress highlightIndex? pulse? verifyProgress? sealLabel? hashLabel prevLabel />`.
  - `blocks: ChainBlock[]` = `{ label, hash, prevHash, tone?, detail?, gapBefore? }`. `label` = the event type in full; `hash`/`prevHash` show 8 hex; `tone` ("plain" | "info" | "ok" | "warn" | "bad") draws a small pin on the block's top-right corner; `detail` = one mono line (an evidence value). 220 x 136 px blocks.
  - Honest links: a link is drawn SOLID only when `gapBefore` is 0 and `prevHash` equals the previous block's `hash`; otherwise DASHED with "+N" (N = `gapBefore`), because the pointer reaches an event that is not on screen. Pass `gapBefore = e.id - previous.id - 1` when showing a selection of a longer ledger.
  - `revealProgress` 0..1 for the whole chain (blocks and links draw in order). `highlightIndex` = the delete block: vermilion + hatching, stays. `pulse` 0..1 breathes its glow (the scene drives it, e.g. from a sine). `verifyProgress` 0..1 sweeps a scan line: links turn ok-blue, each block gets a check, then a seal ring + tick and `sealLabel` (the scene builds it from `verify`). The highlighted block stays vermilion after verifying.
- Exports `hashChainLayout(count)` -> `{ gap, w, h, max }` (throws when `count` blocks do not fit between the 96 px safe margins: at most 7), `CHAIN_BLOCK_W 220`, `CHAIN_BLOCK_H 136`, `CHAIN_GAP_MAX 64`, `CHAIN_GAP_MIN 28`, `CHAIN_SEAL_DROP 78`, types `ChainBlock`, `ChainTone`.

**src/gfx/SnapshotTimeline.tsx**
- `<SnapshotTimeline nodes nodeProgress? slots? y? x0? x1? railProgress? playhead? tether? nodeWord rewoundLabel />`: a FULL-STAGE layer (SVG, 1920 x 1080, stage px). Rail at `y` 770 from x 96 to 1824.
  - `nodes: SnapshotNode[]` = `{ n, hash, state: "taken" | "current" | "greyed" | "rewound" }`. A node's index is its SLOT (`timelineNodeX(i, slots)`), so nodes never move when later ones arrive. `nodeProgress` 0..1 per node (landing). States: taken = ring, current = crimson ring (the one accent), greyed = dashed + struck-through (work a rewind threw away), rewound = blue gradient node with a check; it is reached by a blue arc from the earlier node with the same `n` (the arc draws first, then the node lands) and shows `rewoundLabel` under its label.
  - Labels sit BELOW the rail on one line: "snapshot 1  f546ce19"; the space above the rail belongs to the arc, the tether and the playhead.
  - `playhead`: fractional node index (omit to hide). `tether`: `{ fromIndex, toX, toY, progress }` a pulse from a node to a point (the GhostContainer), a faint line stays after it arrives.
- Exports `timelineNodeX(i, slots?, x0?, x1?)`, `TL_X0 96`, `TL_X1 1824`, `TL_Y 770`, types `SnapshotNode`, `SnapshotState`, `TimelineTether`.

**src/gfx/GhostContainer.tsx**
- `<GhostContainer x y w h draw label>children</GhostContainer>`: hairline outline + fainter echo outline + corner ticks draw on clockwise from the top-left (`draw` linear 0..1, `GHOST_DRAW_FRAMES = 24`), faint ok-blue wash, label chip on the top edge (`copy.gfxB.freshSandbox`). Children are in BOX-LOCAL px. Exports `GHOST_RADIUS 22`, `GHOST_DRAW_FRAMES 24`.

**src/config/copy.ts**: new group `gfxB` = `snapshot` "snapshot", `restored` "restored", `restoredInto` "restored into a fresh sandbox", `freshSandbox` "fresh sandbox", `mismatch` "mismatch", `fileRehashed` "file re-hashed", `filesRehashed` "files re-hashed", `allMatched` "all matched", `hash` "hash", `prev` "prev", `events` "events", `schematic` "schematic: only the labelled tile is a real file". Words only.

**src/dev/DevGfxB.tsx** + composition `DevGfxB` (900 f, S4 timing of BIBLE 6, scene frame = frame + 2160), evidence = attack `rewind_after_rm_rf`: f60 lattice arrives, f72/f96 snapshots 0 and 1, f130 the real wipe command types, f180 shatter (30 f), f212 `WIPED_0` huge in vermilion, f240 "Rewind.", f244 tether pulse, f258 ghost container draws (24 f), f276 snapshot 2 greys, f282 blue rewound node, f300 reassemble (60 f), f326 restored hash locks (22 f), f348 tick and glow, f368 counter, f420 the real `cat` output, f600 lattice scene leaves, f660 HashChain builds (6 real events of the attack), f720 callout "Undone, not erased.", f780 verify sweep, f852 seal + "intact · 29 events · head 0589fc3d". Exports `DEV_GFX_B_FRAMES`, type `DevGfxBProps`.
Stills: `npx remotion still src/index.ts DevGfxB out/qa/gfxb-N.png --frame=N` for N = 120 (intact), 195 (mid-shatter), 232 (empty, WIPED_0), 290 (rewind: ghost + arc), 322 (mid-reassemble), 338 (hash half locked), 380 (hashes locked), 770 (chain built), 880 (chain verified). Mismatch look: `--frame=380 --props='{"specimenMismatch":true}'`.

### Decisions and conventions future patches must follow
1. Honesty of the lattice: only the hero tile stands for a real file (its name is evidence). The other 20 tiles are an unlabelled schematic, and `FileLattice` takes a `footnote` that says so (`copy.gfxB.schematic`). The "N files re-hashed" counter uses `timeline.rewound.verified.files` (1 in the sample), never the tile count. S4 must keep the footnote or an equivalent.
2. The hash shown is the SHA-256 of the whole workspace snapshot (`snapshot.created.payload.sha256`), not of one file; that is why one HashTile is shown, not one per tile (the BIBLE's "one tick per tile" would claim hashes the ledger does not contain). The restored hash is the sha256 of the first `snapshot.created` event after `timeline.rewound`; `refSnap` is the snapshot named by `to_snapshot`. `DevGfxB` throws if the rewind was not re-hashed (`verified.checked` false).
3. The counter text says "all matched" only if the evidence says so AND the two hashes on screen are equal; otherwise it says "mismatch" in vermilion. Keep that rule in S4.
4. `HashChain` shows a SELECTION of the ledger (6 of 29 events), so five of its links are dashed with "+N" (that is correct: the prev-hash pointer reaches an event that is not on screen). Do not "fix" it by passing `gapBefore: 0`. The seal line comes from `verify` (`intact · {events} events · head {8 hex}`), and `DevGfxB` throws if the ledger did not verify.
5. Layout in stage px used by the S4 sketch: lattice at (136, 146) inside a ghost container with 40 px padding (76 px at the bottom, for the footnote); timeline rail at y = 770 with 5 slots; hash strip and counter in the right column from x = 880; chain centred at y = 380.
6. `SHATTER_FRAMES = 30` is exported by FileLattice: the scene must give `shatter` 30 frames, because shard distance is speed x 30.
7. The shard approach (5-9 triangles tiling the square, `mixSeed` per tile and per shard) is local to FileLattice; EgressWall's streak shards are a different thing (line segments) and were not reused.

### Known issues
- Verified: `tsc --noEmit` is clean. Stills were rendered with the system Chrome (`--browser-executable=/usr/bin/google-chrome`, the Remotion browser download is blocked in the build environment) and looked at: intact, mid-shatter, empty (WIPED_0), rewind (ghost + arc), mid-reassemble, hash half locked, hashes locked, chain built, chain verified, mismatch. The same frame rendered twice is byte-identical.
- NOT verified: motion by eye (only stills), and the 900 frames as a video. Most likely to need a nudge: shard density during shatter/reassemble (many dark shards on a dark stage; they read mostly through the hero tile's crimson edge and the glyph fragments), the tether curve under the ghost container, the greyed node's contrast (intentionally low), and the fade of the lattice scene at f600 (the chain scene starts from an empty stage).
- Shards are `clip-path` polygons of a full tile face, so every shard re-renders the tile art (24 tiles x up to 9 shards = about 200 small elements per frame at peak). It rendered fine in stills; if a full render is slow, lower `SHARDS_MAX` or skip shards for non-hero tiles.
- `HashChain` rejects more than 7 blocks (safe margins). A longer ledger must be reduced to the events that matter.
- Tile art is generic icons (document, code, table, picture) chosen by seed. It stands for nothing and carries no names or sizes.

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell`, `DevWorkspace`, `DevScreens`, `DevGfxA` AND `DevGfxB`: every patch that adds a Dev composition must keep all eight.
- `copy` now has the group `gfxB`; patches that resend `src/config/copy.ts` must keep it (and `gfxA`).
- Patch 10 (explainers C) shares `src/gfx`: `GhostContainer` and `ContainerBox` use the same outline construction; reuse `roundedPath`-style code from there rather than a third version.

---

## Patch 10 - Explainers C: architecture on Vultr, competitive table, limits card

**New files:** `src/gfx/ArchitectureDiagram.tsx`, `src/gfx/CompareTable.tsx`, `src/gfx/LimitsCard.tsx`, `src/dev/DevGfxC.tsx`.
**Changed files:** `src/config/copy.ts` (new group `gfxC`, added to the `copy` object), `src/Root.tsx` (DevGfxC registered), `docs/PATCH_NOTES.md`.

Same conventions as patches 08 and 09: everything in `src/gfx` is pure and props-driven (nothing reads the frame, no CSS transitions, no timers, no randomness). Scenes pass LINEAR 0..1 progress values; components apply their own easing.

### PUBLIC API

**src/gfx/ArchitectureDiagram.tsx**
- `<ArchitectureDiagram nodeProgress edgeProgress highlight vultrChip chips nodes edgeLabels frameProgress? highlightAmount? clock? showVultrLogo? />`: a FULL-STAGE layer (1920 x 1080, stage px). The Vultr VM frame is `ARCH_FRAME` (210, 232, 1500 x 540); Browser UI and the LLM provider sit above it, Artifact store and Internet below it.
  - `nodeProgress` (12, `ARCH_NODE_IDS` order) and `edgeProgress` (12, `ARCH_EDGE_IDS` order) throw on a wrong length. `highlight` is `"task" | "model" | "storage" | "none"` (`ARCH_PATHS` lists the nodes and edges each one lights; the task path ends at the egress proxy). `highlightAmount` 0..1: ramp down, switch `highlight`, ramp up to move between paths. `clock` (the global frame) only places the packets (7 px per frame, linear), which run on solid, fully drawn, arrowed edges only.
  - `vultrChip` (3) and `chips` (3: VM, Serverless Inference, Object Storage). A chip is `{ name, facts }`: names are `copy.s8.lowerThirds`, facts come from the evidence (VM: hostname, region, plan; inference: host, model) or `copy.gfxC.storageFacts`.
  - `nodes` = `copy.gfxC.nodes`, `edgeLabels` = `copy.gfxC.edges`. A node title or sub line wider than its 220 px node throws (title at most 19 characters in mono 20 px).
- Exports `archNodeRect(id)`, `ARCH_NODE_W 220`, `ARCH_NODE_H 64`, `ARCH_FRAME`, `ARCH_NODE_IDS`, `ARCH_EDGE_IDS`, `ARCH_PATHS`, types `ArchNodeId`, `ArchEdgeId`, `ArchHighlight`, `ArchNodeText`, `ArchChip`.

**src/gfx/CompareTable.tsx**
- `<CompareTable rows columns marks rowProgress emphasis headerProgress? legend? x? y? />`: 1500 px wide, rows 92 px; the LAST row is the product's own row. `emphasis` 0..1 grows it 6%, adds the accent outline and edge, turns its checks into crimson discs and dims the other rows by 36%. Throws if `columns` is not 3, `marks` is not rows x 3, or `rowProgress` does not match `rows`.
- Exports `compareTableSize(count)`, `COMPARE_W`, `COMPARE_ROW_H`, `COMPARE_HEAD_H`, `COMPARE_GROW`, type `CompareMark` (`"full" | "partial" | "none"`).

**src/gfx/LimitsCard.tsx**
- `<LimitsCard title lines footnote lineProgress titleProgress? footnoteProgress? x? y? />`: 1440 px wide; a vermilion hatched rule grows down the left side, one segment per line (vermilion is the status color for flagged, never the accent). Exports `limitsCardHeight(count)`, `LIMITS_W`, `LIMITS_LINE_H`, `LIMITS_TITLE_H`.

**src/config/copy.ts**: new group `gfxC` = `nodes`, `edges`, `storageFacts`, `compareColumns`, `compareMarks`, `compareLegend`, `limitsTitle`, `limitsFootnote`. Words only. `s7.rows`, `s8.lowerThirds` and `s8.limits` already existed and are reused.

**src/dev/DevGfxC.tsx** + composition `DevGfxC` (720 f = three 240 f segments): A architecture (frame f0, nodes f10.., edges f30.., highlight task f125, model f155, storage f190, chips f130/f160/f195), B comparison table (heads f4, rows f14/f44/f74/f104, emphasis f110..134 of the segment), C limits card (heading f6, lines f24/f54/f84, footnote f114 of the segment). Exports `DEV_GFX_C_FRAMES`.
Stills: `npx remotion still src/index.ts DevGfxC out/qa/gfxc-N.png --frame=N` for N = 120 (architecture built, no highlight), 148 (task), 180 (model), 232 (storage), 470 (table with emphasis), 640 (limits card).

### Decisions and conventions future patches must follow
1. Every Vultr claim on a chip is made only if `/api/infra` says so: `DevGfxC` throws if `infra.vultr` lacks hostname/region/plan, if inference is not Vultr with a host and a model, or if storage is not an attached Vultr bucket. S8 must keep these checks.
2. The comparison marks in `copy.gfxC.compareMarks` are an editorial judgement about generic categories (no product names), not a measurement. They live in copy.ts only. Review them before the final render.
3. The architecture shows the design (README flowchart). The edge words and node subs are wording, not evidence.
4. The Vultr logo is off by default (`showVultrLogo`): the installed file is the on-white variant.

### Known issues
- Verified: `tsc --noEmit` is clean.
- NOT verified: no stills were rendered (the build environment has no Chrome and the Remotion browser download is blocked), so the layout has not been looked at. Most likely to need a nudge: the edge words against the lines (`caddyApi`, `apiSocket`, `dockerCode` label placement), the VM chip overlapping the docker node's neighbourhood at the top-right of the frame, the third column head wrapping to two lines, and the LLM / Artifact chips extending past the right/left of their pills.
- The mask ids and edge labels were not collision-checked against the packets by eye.

### Warnings for the next patch
- `src/Root.tsx` now contains `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell`, `DevWorkspace`, `DevScreens`, `DevGfxA`, `DevGfxB` AND `DevGfxC`: every patch that adds a Dev composition must keep all nine.
- `copy` now has the group `gfxC` (and `gfxB`, `gfxA`); patches that resend `src/config/copy.ts` must keep them.
