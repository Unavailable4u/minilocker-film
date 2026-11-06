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
Text only, no measured values. `urls.demo` is `https://minilocker.duckdns.org`, a DuckDNS name that points at the Vultr VM (set in patch 26).

**src/lib/ease.ts**: `SIGNATURE_BEZIER`, `signature`, `easeInOut` (= signature), `clamp01`,
`mapRange(value, inMin, inMax, outMin, outMax, easing?)` (clamped), `easeOutBack(t, s?)`,
`overshoot(t, amount = 0.05)` (0 -> 1+amount at 70% -> exactly 1 at t=1), `stepPulse(frame, start, len)`
(0 before start, 1 at start, eases to 0 over len frames).

**src/lib/spring.ts**: `springPresets` { uiPop {18,170,0.9}, panel {22,120,1}, camera {26,90,1.1}, settle {14,220,1} },
`type SpringPresetName`, `interface SpringConfig`, `spr(frame, fps, startFrame, preset = "uiPop"): number`
(0 at or before startFrame, settles at 1; uiPop and settle may overshoot slightly).

**src/lib/prng.ts**: `mulberry32(seed): () => number` (sequential), `rand(seed): number` (stateless, [0,1)),
`randRange(seed, min, max)`, `randInt(seed, min, max)` (inclusive), `hashStringToSeed(text): number` (FNV-1a).

**src/lib/fonts.ts**: `FONT_FILES` (the 7 woff2 files of the MiniLocker repo), `loadFonts(): Promise<void>` (never rejects,
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
- `urls.demo` is `https://minilocker.duckdns.org` (set in patch 26).
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
- `npm run assets -- --from <path-to-MiniLocker-clone>` or env `MINILOCKER_REPO` (reads `<path>/frontend/src/fonts`), else downloads
  from raw.githubusercontent.com/shaikh-dotcom/MiniLocker/main/frontend/src/fonts. `--force` overwrites files that are already valid.
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
python tools/sample/assemble.py --repo ../MiniLocker        # stage 2 -> src/data/evidence.json
```
Stage 2 builds every `report` and `verify` with the product's own `build_report` and `verify_events` (backend of the MiniLocker clone), and
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

**scripts/capture-evidence.mjs** (`npm run evidence -- --base https://<domain> --repo ..\MiniLocker --attacks all --takes 3`; token from
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

---

## Patch 11 - Film script and the persistent FilmApp

**New files:** `src/config/script.ts`, `src/config/anchors.ts`, `src/config/anchors.measured.json`, `src/config/filmState.ts`, `src/ui/FilmApp.tsx`, `src/dev/DevApp.tsx`, `src/dev/DevAnchors.tsx`, `src/dev/DevProbe.tsx`, `tools/measure-anchors.mjs`, `tools/sample/attack-catalog.json`.
**Changed files:** `src/Root.tsx` (DevApp registered), `src/data/types.ts` (`Evidence.attackCatalog`), `src/data/select.ts` (`selectAttackCatalog()`), `src/data/evidence.json` (SAMPLE now has `attackCatalog`), `scripts/capture-evidence.mjs` (stores `/api/attacks`), `scripts/validate-evidence.mjs` (checks it), `tools/sample/assemble.py`.

### PUBLIC API
- `useFilmState(frame): FilmState` (pure, global frame, clamped to 600..4979): `activeScreen` (fractional), `tabHighlight`, `layers` (one screen, or two cross-fading), `paneTab`, `header`, `workspace {form, steps, terminal, blast, events}`, `attackLab`, `report`, `infra`, `vultr {inferencePulse, chips}`, `scroll`. Also exports `getFixSession()`, `getHostileSession()`, `activeScreenAt`, `layersAt`, `labListScrollAt`, `reportScrollAt`.
- `<FilmApp frame state? style? />`: AppWindow + Header + the mounted screens. The Workspace "browser" tab is the app's plain tab (URL bar + pages from the ledger); the S5 page rebuild is a later patch.
- `anchors.ts`: `navTabAnchor(i)`, `navCursorAt(frame)`, `workspaceAnchors.{taskSelect, profileSegment, holdSelect, runButton, paneTab}`, `labTileAnchor(i)`, `labCardAnchor(i, hero, frame)`, `labRunAnchor(i, hero, frame)`, `verifyButtonAnchor(frame)`, `reportCardAnchor(frame)`, `infraCardAnchor()`. All rectangles are LOGICAL window px; scrolled ones are functions of the frame.
- `DevApp` composition (4380 f = global 600..4979; composition frame N = global 600+N). Props: `anchors` (draw every anchor), `probe` (measure the DOM).

### Decisions and conventions future patches must follow
1. Every frame number is in `script.ts`. Typed lines take their end frame from `typing.ts`; `filmState` THROWS if the wipe command is not typed before `LAB.wipeLandsAt` (f2340) or the hostile command before the next terminal block. Retiming a line therefore fails loudly.
2. Ledger events are found by RULE (`resolveFix`, `resolveHostile`), not by id. Pins that cannot be met throw a clear error; `approval*` pins are optional.
3. `HOSTILE_RUN.startFrame` is 3308 (swapAt 3312 minus half the cross-fade) so the cross-fade never shows the finished fix task.
4. The Report scrolls f3756-3780 (was planned for f3930): the dimension cards sit below the fold at scroll 0, so they would flip in off screen. The Verify button and the first card rows are both visible from f3780.
5. Anchors are MEASURED from the DOM (`node tools/measure-anchors.mjs --browser <chrome>`), never typed. Re-run it after any change to `src/ui/*` that moves a target and commit `anchors.measured.json`.
6. The attack catalog is now evidence (`evidence.attackCatalog`). `devCatalog.ts` is still a dev fixture, but `tools/sample/attack-catalog.json` (same content) feeds the SAMPLE. A real capture overwrites it from `GET /api/attacks`.

### Known issues
- Verified: `tsc --noEmit` clean; `useFilmState` runs for all 4380 frames without throwing; stills of DevApp at f760, 1000, 1260, 1700, 2230, 2350, 2700, 3500, 3900, 4100 were rendered (system-independent Chromium via `--browser-executable`) and f760, f1260, f2350, f3900 were looked at; anchor overlays at f745, 2150, 2350, 3900 match the pixels (Report within about 5 px while the page scrolls).
- NOT verified by eye: f1000, 1700, 2230, 2700, 3500, 4100 (rendered, not inspected), motion, and the cross-fades. The Report/Verify anchors depend on the page scroll and can be a few px off mid-scroll.
- The Workspace browser tab is a plain stand-in; the page and the untrusted fence are S5's job.
- Sample data only: the fix task's profile is `strict` (script `FORM.profile` must match, else it throws).

### Warnings for the next patch
- `src/Root.tsx` now contains ten Dev compositions: `DevBrandSheet`, `DevFxSheet`, `DevText`, `DevShell`, `DevWorkspace`, `DevScreens`, `DevGfxA`, `DevGfxB`, `DevGfxC` AND `DevApp`.
- `evidence.json` must keep `attackCatalog`; patches that regenerate it must too.

---

## Patch 12a - Master film shell, scene contract, stubs (first third of patch 12)

Patch 12 was split because it is too big for one session: **12a** (this) = the film shell, the scene contract and every scene stub; **12b** = S0 Hook (`S0Hook.tsx`, S0 strings in `copy.ts`, `SceneOverlayProps` already exists); **12c** = S1 Title (`S1Title.tsx`, the measured `workspace.dial` anchor, the match cut in `stageState.ts`).

**New files:** `src/fx/StageGlow.tsx`, `src/scenes/types.ts`, `src/scenes/index.ts`, `src/scenes/stageState.ts`, `src/scenes/S0Hook.tsx` ... `S9Outro.tsx` (all stubs, `S4Rewind.tsx` + `s4/S4a.tsx` + `s4/S4b.tsx` included).
**Changed files:** `src/MiniLockerFilm.tsx` (rewritten).

### PUBLIC API
- Each scene file exports `SnName` (overlay `React.FC<{frame}>`), `SN_CAMERA` (global frames) and `SN_CURSOR` (global frames, logical px). S4 exports `S4Rewind`, `S4_CAMERA`, `S4_CURSOR` and concatenates `S4A_*` / `S4B_*`; the halves export `S4a` / `S4b`.
- `src/scenes/index.ts`: `SCENE_OVERLAYS`, `FILM_CAMERA` (a `fullWindow` keyframe at frame 0 is prepended when the first scene keyframe is later), `FILM_CURSOR`.
- `src/scenes/stageState.ts`: `appReveal(frame)` (FilmApp mount f560, ready f600), `gridOpacity(frame)` (S1 and S9 only), `CAMERA_DOF`.

### Decisions and conventions future patches must follow
1. `MiniLockerFilm.tsx` is NOT edited again: replace a scene file and the barrel picks it up.
2. Scenes mount by a frame test (`SCENES[id].start..end`), not `<Sequence from>`, so `useCurrentFrame()` is always the GLOBAL frame.
3. Overlays are stage-space and sit above the camera; the app and the cursor sit inside it. The cursor is drawn at 1/zoom so it keeps its on-screen size.
4. The `Stage` wrapper has `flex: none`; without it the 960x540 Preview drew the stage at half height.

### Known issues
- `tsc --noEmit` clean. Stills of MiniLockerFilm-Preview at f0, 300, 560, 585, 600 were rendered and looked at: f300 shows the perspective grid on the stage glow, f585/f600 the app fading in over it.
- Depth of field is OFF (`CAMERA_DOF = false`): in the headless Chromium used for QA the blur layer drew mirrored ghost copies of the window. Check it in a normal Chrome; turn it on if it is clean.
- f0-559 is an empty stage (S0/S1 are stubs until 12b/12c); `appReveal` is a plain fade-and-rise that 12c replaces with the dial match cut.

---

## Patch 12b - S0 Hook (second third of patch 12)

**Changed files:** `src/scenes/S0Hook.tsx` (replaces the stub), `src/config/copy.ts` (`s0` extended: `pageTitle`, `pageUrl`, `agentLine`, `hiddenText`, `terminal`, `tag`; `caption` unchanged).

### PUBLIC API
- `S0Hook` overlay, `S0_CAMERA` (3% punches at f60 and f105, slow push from f180), `S0_CURSOR` (empty).
- `S0_TIMING` (every S0 frame number), `S0_TYPING_END`, `HOOK_DOT` ({x:960, y:540, r:24.75}: the core dot S1 must start from).

### Decisions and conventions future patches must follow
1. The S0 overlay draws ONE opaque layer (stage gradient + the same `<StageGlow/>`) inside `<GlitchLayer>`, so S1 starts seamlessly on the master's stage. Nothing in S0 is drawn by the film's `<Camera>` (the app is not mounted before f560); S0 applies the camera's relative scale (3% punches) and shake to its own content.
2. The hidden text is the REAL fixture string from Appendix B; the file throws at import time if the agent line is not typed by f52 or the hidden text by f96.
3. The caption is two `KineticText`s in fixed-height boxes (f180 and f210, `stagger` 4). A single `KineticText` with both lines exits word by word on the same stagger as its entry, so it cannot be used for a held caption. The highlight is `"bad day."` (the token includes the full stop; `"bad day"` never matches).
4. The glitch is 12 frames (f165-177), the page and terminal are gone from f179, the caption is drawn into the dot f270-285, the dot holds f285-299.

### Known issues
- `tsc --noEmit` clean. Stills of the Preview at f6, 40, 75, 96, 112, 150, 170, 195, 225, 280, 292 were rendered; f75, 96, 150, 170, 195, 225, 280 were looked at.
- NOT looked at: f6, 40, 112, 292 (rendered only), motion, and whether the beat hits feel right in the Studio.
- The terminal card sits under the agent line (not over the page), so all four lines stay readable; move `TERM` if you want it overlapping.


---

## Patch 12c - S1 Title and the dial match cut (last third of patch 12)

**Changed files:** `src/scenes/S1Title.tsx` (replaces the stub), `src/scenes/stageState.ts` (rewritten), `src/ui/RadiusDial.tsx` (one prop), `src/config/anchors.ts`, `src/config/anchors.measured.json`, `src/dev/DevProbe.tsx` (a measured `workspace.dial` entry).

### PUBLIC API
- `S1Title` overlay, `S1_CAMERA`, `S1_CURSOR` (empty), `S1_TIMING` (every S1 frame number), `S1_LANDING_FRAME` (590).
- `stageState.ts`: `appReveal(frame)` now rises the window from f540 (docked f590, lit f588, `APP_RISE_PX` 1000, dimmed to `APP_DIM` 0.28 while rising). `gridOpacity(frame)` fades in on the f300 impact (24 f) and out f540-599. New constants `APP_DOCKED_FRAME`, `APP_LIT_FRAME`, `APP_RISE_PX`, `APP_DIM`.
- `workspaceAnchors.dial()`: the BlastPanel dial's own box (280.5 px square at (1230.75, 173.81), window px), measured by `tools/measure-anchors.mjs`. Every other measured anchor is unchanged.
- `RadiusDial` has a new optional prop `centerOpacity` (default 1), so the centre disc can grow out of the core dot. The centre block is wrapped in a group, so the diff re-indents it.

### Decisions and conventions future patches must follow
1. The title dial follows the panel's REAL dial position every frame (measured anchor + camera + the window's `appReveal` offset). It lands at f590 when the window docks, then rides it while the camera settles; a 7-frame fade (f592-599) hides the double blend. Never retime `appReveal` or the S0/S1 camera keyframes without re-reading `S1Title.tsx`.
2. `APP_MOUNT_FRAME` changed from 560 to 540 so the window rises across the whole f540-599 push.
3. `S1_CAMERA` is a wide tilted pose, then a fixed 59-frame ramp (not a spring) to the flat final pose (whole window, 60 px margin, zoom about 1.067), so tilt is exactly 0 on f599.
4. The dial drains into the dotted "not measured" look the app shows before a task, so the last frame is the panel's own dial. The verdict word is "measuring" with no values.
5. For S2: the first camera keyframe must be at f600 or later (S1's dial placement reads only the S0 and S1 keyframes), and S2 starts from the zoom-1.067 pose, so a first keyframe with padding 96 would zoom out right after the push.

### Known issues
- `tsc --noEmit` clean, and `git apply --check` plus `tsc` pass on a fresh clone.
- Stills at f299-600 and full-res landing crops were looked at; a 33-frame sweep of S1 rendered without exceptions but those images were not looked at.
- NOT verified: motion feel, whether hits land on the beats in the Studio, and depth of field (still off).

---

## Patch 13a - S2 Real work, part 1 of 3: the setup (f600-780)

Patch 13 (S2, f600-1499) is split like S4: `S2Work.tsx` assembles `s2/S2a.tsx`, `s2/S2b.tsx`, `s2/S2c.tsx`.
- **13a (this patch):** camera f600-744, the whole cursor path up to the Run press, badge, flow strip + packet, first caption.
- **13b:** the run, f760-1200: the camera that follows the newest stream line, the Vultr inference chip that pulses on each assistant step, the cursor resting over the terminal.
- **13c:** the finish, f1200-1499: callouts "A check it never sees" (f1200) and "Audited as it is destroyed" (f1260), the pull to the blast panel, caption "Plan. Dispatch. Execute. Verify." (f1440), the widen and the whip towards S3.

**New files:** `src/scenes/s2/S2a.tsx` (real), `src/scenes/s2/S2b.tsx`, `src/scenes/s2/S2c.tsx` (stubs).
**Changed files:** `src/scenes/S2Work.tsx` (now the assembly), `src/config/copy.ts` (`s2.flow`: the four strip labels).

### PUBLIC API
- `S2a` overlay, `S2A_CAMERA`, `S2A_CURSOR`, `S2A_TIMING` (every S2a frame number).
- `S2_CAMERA` / `S2_CURSOR` concatenate S2A + S2B + S2C: each part's first keyframe / waypoint must come after the previous part's last one (13a's last camera keyframe starts f722, its last waypoint is the Run press f750).

### Decisions and conventions future patches must follow
1. The cursor waypoints are COMPUTED from `FORM` and `FIX_RUN` in script.ts and the measured anchors (select, strict, hold, Run), so the cursor cannot drift from what filmState draws; the file throws at import time if a retime breaks their order. The "pick" clicks (scenario f700, hold f730) land just under the select because the recreated form does not draw the option list.
2. Camera: f600 holds S1's final pose (whole window, padding 60). f660-690 a 30 f signature move to `taskForm` at padding 265 (zoom 1.25; the form is at y 265-815 and the left 700 px of the stage are empty). f722-744 a 22 f push to `taskForm` at padding 199 (zoom 1.55; Run button at y 754-830). After f744 the camera holds (micro-drift only) until 13b's first keyframe, which must start at f760 or later.
3. The flow strip is VERTICAL in the left gutter (x 96-636), not a horizontal strip: in the form shots the window leaves the left 700 px of the stage empty, so a column of four cards fits there without covering the app. Packet runs down the rail f688-740 (each card lights as it is reached), then back up a dashed warn-coloured rail f742-766 (the "errors fed back" loop); the strip leaves f768-780 through a mask.
4. The badge sits at y 140 (not at the 96 px safe margin) so that in the whole-window shot it does not cover the logo; it leaves f708-720.
5. The caption (f660-744) is gone before the cursor reaches the Run button; 13b/13c captions and callouts must keep clear of the form, the stream and the terminal in the same way.
6. The stage left gutter (x < 650) is free for 13b's inference chip.

### Known issues
- `tsc --noEmit` clean. Stills at f600, 628, 645, 655, 675, 690, 700, 735, 746, 752, 770 were rendered and looked at; f880, 1100, 1499 rendered without exceptions but were not looked at (S2b / S2c are stubs).
- The scenario title shown is the evidence's (`Fix a failing pricing library`), not the BIBLE's working title.
- During f655-660 the badge covers part of the "TERMINAL" pane tab in the whole-window shot (it is clear of the header).
- NOT verified: motion feel of the two camera moves and the cursor's crossing of the window, and whether the press on f750 lands on the beat in the Studio.


---

## Patch 13b - S2 Real work, part 2 of 3: the run (f760-1200)

Replaces the `s2/S2b.tsx` stub. `S2Work.tsx` and `S2a.tsx` are untouched.

**Changed files:** `src/scenes/s2/S2b.tsx` (real), `src/config/focus.ts` (three new focus names), `src/config/filmState.ts` (two exports, `vultrAt` now calls one of them), `src/config/copy.ts` (`s2.inferenceChip`).

### PUBLIC API
- `S2b` overlay, `S2B_CAMERA`, `S2B_CURSOR`, `S2B_TIMING` (leaveForm 770, chipIn 786, chipOut 1182, restAt 800, hideAt 1188, camEnd 1176).
- `focus.ts`: `runView`, `runLeft`, `runRight`. All three are 1100 x 690 logical px and differ only in x (10 / -50 / 75), so a move between them is a pan at the same zoom (about 1.45). They start at y 310, so the top of the panes is dropped, and they end about 100 px under the window: the shots show a strip of bare stage under the window.
- `filmState.ts`: `assistantStepFrames()` (the frame of each `llm.response` of the fix run) and `inferencePulseAt(frame)`. `vultr.inferencePulse` is now `inferencePulseAt`, so the chip and the state cannot disagree.

### What 13b contains
- **Camera** (8 keyframes, all signature-eased, padding 40, derived from `FIX_RUN.pins` and from the first block of terminal output the session builds): leave the form f770-800 to `runView`; `runRight` at the first output (f822); push in on the failing tests (f874, bias 1.03, then 1.06 f914); `runLeft` for the patch (f962, the agent's words and the write_file call land in the transcript); a 60 f creep through the re-runs (f1020); `runRight` pushed in on the green re-run (f1086); back to `runView` (f1146, arrives f1176 and holds). The longest stretch with no camera move is 48 f, and the transcript and the terminal move through all of it.
- **Cursor:** leaves the Run button once the press ripple has played (it departs about f762, the trip is 38 f), rests at the far right of the terminal from f800 (logical 1096, 700) and is HIDDEN from f1188 (it fades out by f1196).
- **Chip:** "Vultr Serverless Inference - {evidence.infra.inference.model}" (a `Badge`, tone info), drawn on f786-800, pulsing (scale, halo, dot) on each of the 10 assistant steps (f808, 838, 927, 974, 1017, 1043, 1064, 1084, 1140, 1165), drawn off f1182-1194. It throws if the evidence says the inference is not Vultr or has no model (like `DevGfxC`).

### Decisions and conventions future patches must follow
1. The chip sits in the BARE STAGE STRIP under the window (stage x 96, y 940-982), not in the left gutter as 13a's note 6 suggested: in the run shots the window fills the stage's width, and the first try at the top-left covered the idle form's text. Anything else that goes under the window in the run shots can use the same strip. In the shots after f1176 the strip is free, but only while the camera stays on `runView`.
2. 13c's first camera keyframe must start at f1190 or later; its first cursor waypoint at f1196 or later (the cursor is hidden: a waypoint of its own fades it in again). The S2c camera starts from `runView` at zoom 1.45 with the window's bottom edge at stage y about 895 (runView, bias 1).
3. The chip is gone at f1194, before the hidden-check callout (f1200). The pulses come from the clock: retime a pin in `script.ts` and the chip and the camera follow. The file throws at import time if a retime puts two camera moves out of order, a move past f1190, the first assistant step before the chip is drawn, or the cursor's departure inside the press ripple.
4. `scaleBias` on a run shot is at most 1.06 (zoom about 1.54): the chip's strip needs the window's bottom edge above stage y 940.

### Known issues
- `tsc --noEmit` clean. Stills at f700, 750, 790, 808, 860, 1000, 1100, 1142, 1150, 1190, 1196, 1300 and 1499 were rendered; f808, 860, 1000, 1100, 1150 and 1196 were looked at (f700, 750, 790, 1142, 1190, 1300, 1499 rendered without exceptions but were not looked at; 1300 and 1499 are 13c's stub, so the camera just holds the run shot).
- NOT verified: motion feel of the sways and pushes, the cursor's crossing from the form to the terminal, how the pulses look in motion, whether the beats land on the music in the Studio.
- f753-808 has an empty terminal and transcript (the sandbox is being created; the real first command types from f814). The camera move, the cursor's trip and the spinner on the button carry that stretch.
- The cursor can cover the last characters of a long terminal line (it rests where long lines are cut off with an ellipsis, but that is not a guarantee).
- The evidence is still the SAMPLE (`meta.sample`): the model name and every output line in these stills are sample data.


---

## Patch 13c1 - S2 Real work, part 3 of 3: the finish (f1190-1499), first cut

Replaces the `s2/S2c.tsx` stub. `S2Work.tsx`, `S2a.tsx` and `S2b.tsx` are untouched. A follow-up patch (13c2) fixes the Secrets gauge anchor (see Known issues).

**Changed files:** `src/scenes/s2/S2c.tsx` (real), `src/config/script.ts` (`BLAST_LOG_SCROLL`, new `BLAST_SCROLL`), `src/config/focus.ts` (`closingWide`), `src/config/anchors.ts` + `src/config/anchors.measured.json` (`blast` key), `src/dev/DevProbe.tsx` and `tools/measure-anchors.mjs` (a fifth probe frame, f1230).

### PUBLIC API
- `S2c` overlay, `S2C_CAMERA`, `S2C_CURSOR` (empty), `S2C_TIMING` (every S2c frame number).
- `script.ts`: `BLAST_LOG_SCROLL` { from 1190, shownAt 1224, leaveFrom 1250, backAt 1272, px 700 }. `BLAST_SCROLL` is now built from it: 0 until f1190, 700 by f1224, held to f1250, back to 0 by f1272, 0 after (so S5's hostile run still sees 0).
- `focus.ts`: `closingWide` (the window plus 100 px of height; the camera clamps it to zoom 1.0, window at stage y 40-940).
- `anchors.ts`: `blastScrollOf(frame)`, `blastLogRowAnchor(frame)`, `blastLogTextAnchor(frame)` (the line "Hidden check passed" in the Blast panel's event log, moving with the panel's scroll). `anchors.measured.json` gained `blast` (measured by `node tools/measure-anchors.mjs`; the four existing keys re-measured bit-identical).

### What 13c1 contains
- **Camera** (6 keyframes, all signature-eased): f1190-1224 pull from runView to `blastPanel` (padding 56, zoom 1.163); creeps f1236-1306 (bias 1.04) and f1306-1380 (bias 1.08); widen f1380-1472 to `closingWide`; whip f1482-1500 onto `gaugeSecrets` with a 2.5 deg roll that levels out f1491-1500. It lands on f1500, so patch 14's first keyframe (f1500, gaugeSecrets) starts from the landing pose.
- **Blast panel scroll:** the hidden check's line is only drawn in the panel's event log, below the fold at scroll 0, so the panel scrolls to it (f1190-1224) and back to the gauges before the audit flips them (f1250-1272).
- **Callouts** (stage space, chips in the bare stage right of the window, leader length computed per frame from the camera so the chip always clears the window edge): "A check it never sees" f1215-1258 (variant ok; the dot follows the measured row through the scroll); "Audited as it is destroyed" f1266-1334 (variant note; dot on the Secrets card).
- **Caption** "Plan. Dispatch. Execute. Verify." f1440-1490 (size 64, highlight "Verify.").
- **Cursor:** none; 13b hid it on f1188 and it stays hidden.
- **Import-time checks** throw if a retime in script.ts puts a callout before its line lands, leaves the panel not back on the gauges before the audit pin, ends the audit callout before the sandbox is destroyed, or moves the whip off f1500.

### Decisions and conventions future patches must follow
1. Cues nudged from CUES.s2: the hidden-check callout starts f1215 (a beat; on f1200 its row is not on the stage yet), the audit callout f1266 (the gauges flip f1272, so the dot is on the card before it changes).
2. The callouts get the film's camera as `[kf(0, fullWindow, padding 60), ...S2A, ...S2B, ...S2C]` (S2c imports S2a and S2b, never the barrel). That equals the film's camera on every S2 frame because S1 ends on that exact pose.
3. The event log shows the run's real ledger, so the "Decoy read" lines, the blocked telemetry host and "2 of 6 decoys read" are visible in S2's last shots. They are S3's material, previewed.

### Known issues
- **FIXED in 13c2: the Secrets gauge anchor.** `FOCUS.gaugeSecrets` (focus.ts) is a computed estimate and sits about 150 logical px above the rendered card. The audit callout's dot therefore lands below the dial, beside the legend, not on the Secrets card (seen at f1274), and the whip lands on that same rectangle. Fix: measure the real card in DevProbe and use it for the callout and the whip.
- `tsc --noEmit` clean; `git apply --check` + `tsc` pass on a fresh clone. Stills rendered with a headless Chromium: f1200, 1215, 1224, 1236, 1260, 1274, 1300, 1334, 1440, 1486, 1499. Looked at: f1200, 1236, 1274. The rest rendered without exceptions but were not looked at, so the caption's legibility over the widened window's bottom edge is unchecked.
- NOT verified: motion feel of the pull, the creeps, the widen and the whip; whether the roll reads as a whip; whether the beats land on the music.


---

## Patch 13c2 - S2 Real work, part 3 of 3: the finish, fixes (closes patch 13)

Fixes the open issue of 13c1 (the Secrets gauge anchor) and the closing caption, which the 13c1 stills had not shown. `S2Work.tsx`, `S2a.tsx` and `S2b.tsx` are untouched.

**Changed files:** `src/scenes/s2/S2c.tsx`, `src/config/focus.ts` (`gaugeSecrets` measured, `closingWide` taller), `src/config/anchors.ts` + `src/config/anchors.measured.json` (`blastGauges` key), `src/dev/DevProbe.tsx` and `tools/measure-anchors.mjs` (a sixth probe frame, f1340), `docs/PATCH_NOTES.md`.

### PUBLIC API
- `anchors.ts`: `blastGaugeSecretsAnchor(frame)` (the measured Secrets card, moving with the Blast panel's scroll); `MEASURED.blastGauges.secrets`.
- `focus.ts`: `FOCUS.gaugeSecrets` is now the measured card (x 1376.31, y 668.69, w 206.69, h 162.94), not the computed estimate (x 1376.5, y 432, w 207.5, h 96: about 237 px too high and 67 px too short). `closingWide` is the window plus 140 px of height (was 100).
- `anchors.measured.json` gained `blastGauges` (measured by `node tools/measure-anchors.mjs`; the five existing keys, `blast` included, re-measured bit-identical).

### What 13c2 contains
- **Audit callout:** "Audited as it is destroyed" (f1266-1334) now puts its dot on the Secrets card (`blastGaugeSecretsAnchor`: inside the card's right edge, halfway down), where it landed beside the dial legend in 13c1.
- **Whip:** f1482-1500 names `gaugeSecrets`, which is now the real card, so it lands with the card in the middle of the stage (its centre is within a few px of the stage centre on f1500). Nothing in the keyframes changed.
- **Closing caption:** "Plan. Dispatch. Execute. Verify." now sits in a strip under the widened window. At the film's usual caption position its ink (y 905-968) crossed the window's bottom edge (y 940 with 13c1's `closingWide`) and covered the terminal's last line and the Compute / Time cards. Now the window ends at y 920 (`closingWide` +140) and the caption is drawn 40 px lower (`CAPTION_DROP`, a wrapper in S2c.tsx; `fx/Caption.tsx` is untouched): ink on y 945-1008, 25 px under the window and 72 px above the stage's bottom edge. The camera cannot zoom out below 1.0, so the window could not simply be made smaller.

### Decisions and conventions future patches must follow
1. `FOCUS.gaugeSecrets` itself changed (no new focus name), so patch 14's first keyframe (f1500, gaugeSecrets) still starts from exactly the pose the whip lands on, and its holds and push-ins on `gaugeSecrets` frame the real card.
2. The card is measured on f1340, AFTER the audit, not on f1230 with the event log. The audit gives the Filesystem card a third line of text, and the two cards of a grid row are as tall as the taller one, so the Secrets card grows from 143.81 to 162.94 px at the audit (its top does not move). The state from f1500 on is the audited one. The audit callout starts 6 frames before the flip; its dot is inside the card both before and after.
3. `focus.ts` reads the measured card lazily (a getter on `FOCUS`), not when the file loads, so `tools/measure-anchors.mjs` can still bundle the project when `anchors.measured.json` has no `blastGauges` key yet. If the key is missing, the camera throws a message that says to run the tool.
4. The probe has two Blast frames: f1230 (before the audit, panel scrolled to the event log: the hidden-check callout) and f1340 (after the audit, panel not scrolled: the Secrets card). They are told apart by `BLAST_LOG_SCROLL.backAt`. Anything below the gauge grid in the Blast panel (seal, hash chain, event log) sits 19 px lower from the audit on than on f1230; the hidden-check callout is over before that (f1258).
5. 13c1's note about `closingWide` (window at stage y 40-940) is superseded: it is y 20-920 now. Anything that goes under the widened window uses the strip y 920-1080.

### Known issues
- `tsc --noEmit` clean; `git apply --check` + `tsc` pass on a fresh clone. Stills rendered with a headless Chromium: f1200, 1215, 1236, 1260, 1268, 1280, 1300, 1334, 1440, 1450, 1462, 1474, 1486, 1499, 1500. Looked at: f1215, 1236, 1260, 1268, 1280, 1334, 1450, 1474, 1486, 1499, 1500. Rendered without exceptions but not looked at in their final state: f1200, 1300, 1440, 1462.
- On f1486 the tips of the caption's descenders still show a few px over the window's bottom edge: the caption is leaving upwards (f1478-1490) while the whip has started and moves the window. It is 2-3 frames; the caption was not shortened because it is already up for only about 1.7 s.
- `gaugeNetwork` and `gaugeCompute` in focus.ts are still computed estimates (only DevFxSheet uses them); only the Secrets card was measured.
- NOT verified: motion feel of the pull, the creeps, the widen and the whip; whether the roll reads as a whip; whether the caption's exit and the whip's start read as one move; whether the beats land on the music.


---

## Patch 14a - S3 Decoys + egress, part 1 of 3: the box (f1500-1679)

Patch 14 (S3, f1500-2099) is split like S2: `S3Decoys.tsx` assembles `s3/S3a.tsx`, `s3/S3b.tsx`, `s3/S3c.tsx`, plus ONE persistent object, `s3/S3Box.tsx`, and the app scrim.
- **14a (this patch):** the camera on the Secrets card + caption "Containment, measured." (f1500), the hand-over to the explainer (app dimmed 55 %, blurred 6 px, f1546-1562), the ContainerBox with its six chips on the beats f1575-1650, the six decoys planted in the DecoyRack, callout "Random per task" (f1620). The shared layout, timing and evidence model for all three parts.
- **14b (f1680-1929):** the hostile module reaches for the decoys (S3Box turns each tile amber with its real ledger line; the module name in the module band; callout "Reading one rings the alarm" f1700), then the exfil attempt: Packet, EgressWall, the refusal, the Network gauge, caption "It tried to phone home. Refused." f1800, callout "Allowlist only" f1840.
- **14c (f1930-2099):** the teardown audit (scanning line, stamp "real secrets in sandbox: 0", caption "Bait, not secrets." f1930), the hand-back to the app (scrim out f2004-2018, camera on the gauges at f2010), the pull back, the sealing ring, the swing to the header nav, the landing on "Attack Lab" at f2100.

**New files:** `src/scenes/s3/data.ts`, `src/scenes/s3/shared.tsx`, `src/scenes/s3/S3Box.tsx`, `src/scenes/s3/S3a.tsx` (real), `src/scenes/s3/S3b.tsx`, `src/scenes/s3/S3c.tsx` (stubs).
**Changed files:** `src/scenes/S3Decoys.tsx` (now the assembly), `docs/PATCH_NOTES.md`. No config, fx, gfx, ui or data file is touched.

### PUBLIC API
- `S3a` overlay, `S3A_CAMERA` (3 keyframes: f1500 hold on `gaugeSecrets`, the pull to `fullWindow` f1546-1586), `S3A_CURSOR` (empty), `S3A_TIMING`.
- `S3_CAMERA` / `S3_CURSOR` concatenate S3A + S3B + S3C: each part's first keyframe must come after the previous part's last one. 14a's last keyframe starts f1546 (arrives f1586); **14b's first keyframe must start at f1680 or later**, 14c's at f1930 or later.
- `s3/data.ts`: `s3Data()` returns, from the evidence only: `source`, `events`, `tag`, `attackTitle`, `decoys` (id + label, ledger order), `planted`, `reads` (the `canary.read` events: event id, ts, decoy index, label, the `describe()` line), `blocked` (the first `egress.blocked`: host, reason, line), `allowedHosts`, `proxy`, `audit` (`realSecretsInSandbox`, `scanned`, `decoysRead`, `decoysUsed`). It throws, naming what is missing, if the evidence cannot support the scene (no `canary.seeded`, more than 6 decoys, no `egress.blocked`, no allowlist) and **if the audit found any real secret** (the film must not hide it: 14c's stamp relies on this).
- `s3/shared.tsx`: `S3_BOX` (stage x 160, y 190), `s3Rack(n)`, `S3_MODULE_BAND` (box-local y 520-580, reserved for 14b), `S3_EGRESS` (`fromX` 1260, `packetY` 490), `s3TileRect(i, n)` (stage rectangle of decoy tile i), `S3_TIMING` (every frame number of 14a, the scrim's out-frames for 14c), `s3ChipProgress`, `s3BoxDraw`, `s3DecoyReveal`, `s3ScrimAmount`, `S3_SCRIM`, `S3Scrim` (the dim + blur, a backdrop filter, drawn once by S3Decoys).
- `s3/S3Box.tsx`: `S3Box` overlay: the backing panel, the `ContainerBox` (chips from `copy.s3.chips`), the `DecoyRack`, and the tag. 14b and 14c resend THIS file (marked 14b / 14c in its comments) and leave S3a alone.

### What 14a contains
- **Camera:** f1500 holds S2c's landing pose on the real Secrets card (zoom 2.6, the card is centred); f1546-1586 a 40 f signature pull to `fullWindow` (padding 60) while the scrim comes in; it then holds, with the 2 px drift, until 14b.
- **The real Secrets line** is the app's own card (filmState, from the audited ledger): "real in sandbox . N of {planted} decoys read . N used". Nothing is retyped; `data.ts` throws if the audit found a real secret.
- **Scrim:** `rgba(paper, 0.55)` and `blur(6px)` over the camera layer, in over f1546-1562, out over f2004-2018 (14c's). A backdrop filter, so `MiniLockerFilm.tsx` and `FilmApp` are untouched.
- **Box:** draws f1560-1596 (outline, interior, the near-opaque backing panel), chips on f1575 / 1590 / 1605 / 1620 / 1635 / 1650 (22 f each, clockwise from the top left), six tiles rise one every 4 f from f1584 (idle, "planted"), labels from `canary.seeded`.
- **Callout:** "Random per task" f1620-1679 on the last tile's right edge, chip right of the box (x 1293-1503, clear of the "128 processes" chip).
- **Caption:** "Containment, measured." f1500-1548, drawn 48 px lower than the film's usual position (a wrapper in S3a.tsx, like S2c's): at zoom 2.6 the window's bottom edge is on stage y 928 and the usual position put the ink across it.
- **Tag:** when `evidence.s3Source` is "attack:malicious_repo_hook" the badge "Attack Lab - malicious_repo_hook" is drawn in the row of the top chips (right of "no capabilities"). Not visible with the SAMPLE (`s3Source` is "task"); checked by flipping the field in a temporary copy.
- **Import-time checks** throw if a chip is off a beat or out of order, the scrim is not in by the time the box draws, the opening caption overlaps the scrim, the pull overruns 14a, the scrim and the pull do not start together, the box's chips leave the safe margin or reach the caption's strip, or the evidence cannot support S3.

### Decisions and conventions future patches must follow
1. **No push-in on the Secrets card.** `gaugeSecrets` is already at the 2.6 zoom maximum, so a `scaleBias` cannot grow it, and a tilt (tried: 1.2 / -2.4 deg) rasterizes the text smeared at that zoom. The hold is 46 frames of micro-drift plus the caption's own reveal.
2. **The box is stage space, not inside the camera.** The scrim dims what the camera shows; the box, wall, packets, captions and callouts sit above it. 14b's Packet and EgressWall go in `S3b.tsx` (or `S3Box.tsx` if they must sit under the tiles) at `S3_EGRESS`: packets leave the box's right edge, x 1260, along y 490, to the wall at x 1500.
3. **Space plan.** Chips: top y 118-160 (x 250-1034 for the three, plus the tag), right x 1290-1475 at y 289-331, bottom y 820-862 (x 403-577 and 826-1034). Captions' ink starts at y ~905, so a caption never meets a chip. The box interior under the rack (box-local y 506-600, stage y 696-790) is free; the module band is box-local y 520-580.
4. **The reads are NOT at their S2 frames.** The `canary.read` events of the kept take played in S2 (f~1000), when the Secrets card already says "2 of 6 decoys read". S3 re-plays them on its own frames (14b decides them: the first read about f1690, so the callout "Reading one rings the alarm" lands at f1700); take their text from `s3Data().reads[i].line`. The tile of a read decoy is `reads[i].decoy`.
5. **The Network gauge** in the scrim-dimmed app already says "1 blocked" from f1500 (S2's ledger). 14b's "the real Network gauge value counts up" cannot be that card: count the value in the stage-space wall plaque / refusal tag instead, from `blocked`.
6. **S3's data source is `s3Data().events`**, which is the attack's ledger when `s3Source` is "attack:malicious_repo_hook"; the app behind the scrim always shows the kept take, so in that case the Secrets card (f1500) and the box tell two different runs. That is BIBLE 7.3's choice; the tag says so.
7. `S3Scrim` ends f2018: 14c must not start its "back to the app" camera move before f2004.

### Known issues
- `tsc --noEmit` clean; `git apply --check` + `tsc` pass on a fresh clone. A sweep of f1490-1700 (every frame, quarter scale) rendered without exceptions and no frame was looked at in that sweep. Full-size stills looked at: f1500, f1520, f1530, f1610, f1640, and f1640 with `s3Source` flipped to the attack. f1556 (the scrim ramp) and f1679 were looked at in an earlier iteration (before the S3Box extraction and the caption drop); f1562 was rendered and not looked at.
- NOT verified: motion feel of the pull and of the scrim's blur ramp, whether the chips land on the beats in the Studio, the box's draw-on over the dimmed window in motion.
- f1650-1679 is a calm shot (all chips landed, nothing moves but the camera drift): 29 frames, under the film's 1.5 s limit; 14b's first item can start earlier than f1680 if that reads as slack, but not its first camera keyframe.
- The evidence is still the SAMPLE (`meta.sample`): the decoy labels, the "2 of 6" and the "1 blocked" in these stills are sample data.

## Patch 14c - S3 Decoys + egress, part 3 of 3: the audit and the seal (f1930-2099), closes patch 14

**Changed files:** `src/scenes/s3/S3c.tsx` (the stub is now the real part), `src/scenes/s3/S3Box.tsx` (resent: audit, stamp, seal, pull-back, exit), `src/scenes/s3/shared.tsx` (14c timing, the pull-back pose, import-time checks), `docs/PATCH_NOTES.md`. No config, fx, gfx, ui or data file is touched; `S3a.tsx`, `S3b.tsx`, `data.ts` and `S3Decoys.tsx` are unchanged.

### What 14c contains
- **Caption** "Bait, not secrets." (highlight "Bait,") f1930-2016, at the film's usual position. The box is still full size while it is up (lowest chip ends y 862, the caption's ink starts y ~905); it is gone as the scrim has finished leaving (f2018).
- **Audit** f1935-1965: `ContainerBox`'s audit line sweeps the box (30 f, constant speed); its ruler stays on the bottom edge afterwards.
- **Stamp** on the beat f1965: `StampBox` (tone ok, 40 px) "real secrets in sandbox: {n}", `n = s3Data().audit.realSecretsInSandbox` (the app's own audited count, via `measure()`). The rack and the module plate step back to 28 % over f1958-1976 so the stamp does not lie over tile labels. The camera takes a 5 px impact on f1965 (a no-move keyframe: the dimmed app jolts, the stage-space box does not).
- **The film must not hide it:** `data.ts` already refuses to build S3 when the audit found a real secret; `S3c.tsx` (on import) and `S3Box.tsx` (on render) re-check the count, and `S3c.tsx` also throws when the ledger's audit never scanned the sandbox (a "0" without a measurement). Tested by injecting a real secret into a temporary copy of the evidence: the build throws and names it.
- **Hand-back to the app** f2004: the camera leaves the dimmed window for `blastPanel` (padding 96, zoom 1.067, arrives f2032) while the scrim leaves (f2004-2018). The live Secrets card is on screen, its "0 real in sandbox" next to the stamp's 0.
- **Pull-back** f2004-2032: the whole box group (chips, ring, stamp, tag) shrinks to scale 0.44 and rests at stage x 112, y 408 (`S3_PULLBACK`), in the strip left of the panel (the panel is stage x 715-1205; the box's right chip ends x ~691).
- **Seal ring** f2040-2066 closes on the pulled-back box (ContainerBox's own `sealProgress`); it holds sealed to f2078, then the box leaves (fade + 48 px drift left, f2078-2094).
- **Swing to the nav** f2052-2088 (`nav`, padding 96, zoom 2.56, no tilt); 11 frames of drift hold before the cut at f2100, where `script.ts` already starts the underline slide to "Attack Lab" (hover lead from f2080). The box is gone before the camera lands, so it never crosses the header.

### PUBLIC API
- `S3C_CAMERA` (3 keyframes: f1965 thud, f2004 `blastPanel`, f2052 `nav`), `S3C_CURSOR` (empty), `S3C_TIMING`, `S3c` (the caption).
- `shared.tsx`: `S3_TIMING.partEndB/audit/stamp/pullback/seal/exit`, `S3_PULLBACK`, `s3BoxPose(frame)`, `s3AuditProgress`, `s3StampProgress`, `s3SealProgress`, `s3ContentOpacity`.
- `S3Box`: now one wrapper `div` (stage-sized, `transform-origin 0 0`) around the backing panel, the ContainerBox and the tag; it returns null from f2094.

### Decisions and conventions future patches must follow
1. **S4a (patch 15):** its first camera keyframe starts at f2100 or later, from the pose S3 ends on (`nav`, padding 96, no tilt, no bias). Its first cursor waypoint arrives after f2100.
2. **The box is pulled back, not hidden, when the app returns.** At f2010+ the app is live and undimmed; anything S3 draws over it must stay out of stage x 715-1205 while the camera is on `blastPanel`.
3. The ring's stroke is ContainerBox's 3 px in box-local px, so at scale 0.44 it is ~1.3 px plus its glow. If that reads too thin, add a `sealStroke` prop to ContainerBox in a later patch rather than enlarging the box (which would reach the panel).
4. `S3_PULLBACK.to.x` is tied to two import-time checks (right chip at least 16 px clear of the panel, ring inside the 96 px safe margin): change it and the build tells you what moved.

### Known issues
- `tsc --noEmit` clean. All import-time checks run and pass on the SAMPLE evidence (audit: 0 real secrets, scanned). `S3Box` server-renders without an exception on every frame f1930-2099, and renders nothing from f2094.
- **NOT verified visually:** no still was rendered or looked at (the Remotion browser could not be downloaded in the session this patch was written in). Geometry was checked by arithmetic and by `getCameraState` / `worldToStage` at the real poses, not by eye. Run the CHECK stills at f1930, f1950, f1970, f1990, f2010, f2030, f2060, f2085 and look in particular at: the stamp's size against the dimmed rack (40 px mono, ~610 px wide, centred); the thinness of the seal ring at 0.44; the box against the terminal text under it at f2030-2078; the caption (f1930-2016) against the box's bottom chips; the ruler's ticks across the dimmed plate.
- The sample evidence has 2 of 6 decoys read, so the app's Secrets card at f2010 says "0 real in sandbox . 2 of 6 decoys read . 0 used" (sample data).

## Patch 15a - S4a Rewind: the Attack Lab and the wipe, part 1 of 3: the pick (f2100-2219)

**Changed files:** `src/scenes/s4/S4a.tsx` (now a thin assembly), `src/scenes/s4/S4a1.tsx` (new: camera, cursor), `src/scenes/s4/shared.tsx` (new: timing, import-time checks), `src/scenes/s4/data.ts` (new: the evidence S4a reads), `src/config/focus.ts` (one new focus, `attackLabPick`), `docs/PATCH_NOTES.md`. `S4Rewind.tsx` and `S4b.tsx` are untouched: `S4Rewind.tsx` already concatenates `S4A_*` / `S4B_*` and renders both overlays, and `S4a.tsx` keeps the three names it imports.

### What 15a contains
- **The screen is the app's own.** filmState already builds the Attack Lab from `LAB`: the underline slide (SCREEN_CHANGES f2100, swap f2112), the 15 tiles and the donut at "0 / 15 contained" (every tile is "not run" until the click), the hover rings (`LAB.tileHovers`), the select (f2200), the list scroll (f2201-2216) and Run's hover (f2212). Nothing is retyped; 15a adds only the camera and the cursor, and **draws nothing in stage space**.
- **Camera:** S3 leaves it on the nav. f2112 (the swap) a 42 f signature move to `attackLabPick` (padding 48, zoom 2.09), landed f2154; f2154-2216 a 5 % push on the same region, arrived as the card comes to rest. No tilt (text at zoom > 2).
- **Cursor** (window px, computed FROM `LAB` and the measured anchors): appears f2138 at (800, 320); tile 1 f2166, tile 4 f2174, tile 8 f2182, tile 13 f2190, the hero's tile (11) f2196; **f2200 the select is a hover-dwell, no click ripple** (the spec's only click is Run); f2212 and f2216 it rides the hero card's Run button up the list (`labRunAnchor` for the frame) and rests on it at (402, 366). **No waypoint after f2216, none with `click`:** the click on Run (LAB.pressAt, f2220) is 15b's first waypoint, on the position 15a rests on.
- **`data.ts` (`s4Data()`)** is written once for all of S4a (and S4b): the hero's catalog index, title, category; the write step (path, text); the wipe step (real command, raw result, and `token`, its output line, "WIPED_0"); the cat step; `rewind` (from the ledger's `rewind.requested`); and `snapshot` (the `snapshot.created` the rewind goes back to: id, sha256, `short` = 8 hex). It throws, naming what is missing, if any of these is absent. **There is no "snapshot 1" fallback**: the evidence has the hash, and a film that silently drops it would hide a capture problem.

### PUBLIC API
- `S4A1_CAMERA` (2 keyframes: f2112, f2154), `S4A1_CURSOR` (9 waypoints, f2138-2216), `S4a1` (null overlay); `S4A_CAMERA`, `S4A_CURSOR`, `S4a` in `S4a.tsx`.
- `shared.tsx`: `S4_TIMING` (`landing`, `push`, `cursorEnter`, `partEndA1`), `S4_PICK_PADDING`, `S4_CURSOR_ENTER`.
- `focus.ts`: `attackLabPick` {x 0, y 75.47, w 820, h 470}: the left of the summary bar (donut, tiles x 171-771) and the top of the card list. No existing focus holds both the 34 px tiles and the hero's card at a readable zoom (`attackSummary` and `attackGrid` are each half of it).

### Decisions and conventions future patches must follow
1. **15b's first camera keyframe starts at f2220 or later**, from `attackLabPick` (padding 48, bias 1.05); its first cursor waypoint is the Run click at f2220 on (402.3, 366.4). The camera in 15b/15c has to leave the steps pane (`attackDetail`, window x 760+) clear for the lattice's neighbour: the lattice sits over the LEFT half, so the pick region can no longer be the frame.
2. **Select is not a click.** If a second click is wanted, it is a `click: true` on the f2200 waypoint in `S4a1.tsx` and the "no click" check there goes with it; `script.ts` needs no change (the app's select state is not tied to a press).
3. **`S4_CUE_ANCHORS`** (the silence over f2370-2399 and the glass-shatter at f2340 that patch 22 reads) does not exist yet: it belongs to 15c, in `shared.tsx`.
4. **The persistent stage object** (lattice, timeline and wipe state, like `S3Box`) is 15b's to create and 15c's to extend; patch 16 drives reassemble, the ghost container and the "rewound" node on it. 15a leaves no stage-space object behind.
5. The cursor's frames are never typed in `S4a1.tsx`: change them in `script.ts` `LAB`, and the import-time checks tell you if the gestures no longer fit (cursor off the stage, appearing after the first hover, out of order, a click in 15a, a last waypoint at or after f2220).

### Known issues
- `tsc --noEmit` clean. Five deliberate breaks (cursor off the stage, cursor late, a tile that does not exist, no snapshot in the ledger, a wipe with no output) each throw with a message naming the cause.
- Stills looked at (full size): f2130 (mid-landing), f2170 (tile sweep), f2200 (the select), f2214 (Run arriving), f2219 (the last frame: cursor on Run, "NOT RUN"). The cursor rides the hover state by 2-4 frames (its overshoot curve): at f2170 it is on tile 4 while the ring is still on tile 1.
- **NOT verified:** motion (the landing's feel, the cursor's 12 f flick from the tile row to Run, which is 35 window px per frame and the film's fastest), and f2100-2112 (S3's nav hold with the underline mid-slide: unchanged by this patch).
- The window's left edge is 58-103 px inside the stage in this shot (`attackLabPick` is narrower than the stage's aspect): that strip is the stage background. It is intended; a wider region would shrink the tiles.
- The evidence is still the SAMPLE (`meta.sample`): the hash, the file text and "WIPED_0" are sample data.

## Patch 15b - S4a Rewind: the Attack Lab and the wipe, part 2 of 3: the agent works (f2220-2299)

**Changed files:** `src/scenes/s4/S4a.tsx` (resent: concatenates S4a1 + S4a2, mounts the stage under the captions), `src/scenes/s4/S4a2.tsx` (new: camera, the Run click, the caption, geometry checks), `src/scenes/s4/S4Stage.tsx` (new: the persistent stage object), `src/scenes/s4/shared.tsx` (15a's content untouched; a marked "15b" section added), `src/config/focus.ts` (one new focus, `attackSteps`), `docs/PATCH_NOTES.md`. `S4Rewind.tsx`, `S4b.tsx`, `data.ts` and `S4a1.tsx` are untouched.

### What 15b contains
- **Run click:** f2220 (`LAB.pressAt`), the only click of S4a, on the point 15a's last waypoint rests on. The cursor fades out over the following 8 frames (`hide`), so it does not sit under the panel. The app's own press, busy ring (f2223), write step (f2236) and result (f2232) are filmState's; 15b draws nothing over them.
- **Camera:** f2226 a 24 f signature move from `attackLabPick` to `attackSteps` (padding 96, zoom 1.19), arriving on the beat f2250; f2250-2299 a 2 % push (bias 1.02), arriving on the last frame of the part. No tilt.
- **The stage (`S4Stage.tsx`), one persistent object in stage space:**
  - a SOLID backing panel (`theme.paper`) hanging from the top edge over the left half (x 96-820, y -40 to 722), dropping in from f2240. It is opaque and runs off the top on purpose: a translucent floating version let the app's card text show through the tiles and left a card cropped over its top edge;
  - the `FileLattice`, 6 x 4, intact, building f2250-2280. The hero tile (2 x 2, `heroIndex` 8) is labelled with the real file name from the evidence (`precious.txt`); the other 20 tiles are a schematic and say so in the footnote (`copy.gfxB.schematic`);
  - the `SnapshotTimeline` rail (draws f2262-2280) with node 1 landing on the beat f2280, showing the first 8 hex of the real SHA-256 (`f546ce19` in the sample evidence).
- **Caption:** "Real work. Snapshot after every step." from `CUES.s4.captionWorks` (f2220), leaving by f2296.
- **`focus.ts` `attackSteps`:** {x 0, y 640, w 1450, h 432}. Not a retune of `attackDetail`: the step column is at window x 621.5-1437.5 (derived in `shared.tsx` `S4_COLUMN` from `LAB_LIST_W`, the pane padding and the column width), about 140 px left of where `attackDetail` assumes. The pane's title and italic summary are above the frame on purpose (a half-cut title reads as a mistake).
- **Pure stage functions** in `shared.tsx` (`s4PanelProgress`, `s4LatticeState`, `s4RailProgress`, `s4NodeProgress`) are the only place the stage's timing lives.

### PUBLIC API
- `S4A2_CAMERA` (2 keyframes: f2226, f2250), `S4A2_CURSOR` (1 waypoint: f2220, click, hide), `S4a2`; `S4Stage`.
- `shared.tsx`: `S4_TIMING` gains `open`, `settle`, `panel`, `lattice`, `rail`, `node`, `caption`, `partEndA2`; new `S4_COLUMN`, `S4_LATTICE`, `S4_PANEL`, `S4_LATTICE_AT`, `S4_RAIL`, `s4NodeX(slot)`, `S4LatticeState`.

### Decisions and conventions future patches must follow
1. **15c's first camera keyframe, cursor waypoint and overlay item start at f2300 or later** (`LAB.stepAt.wipe`). 15b ends on `attackSteps`, padding 96, bias 1.02 (arrived f2299): 15c's 3 % punch at f2340 is relative to that bias.
2. **15c and patch 16 EXTEND `S4Stage.tsx` and the functions in `shared.tsx`; they never draw a second lattice.** 15c fills `shatter` and `desaturate` in `s4LatticeState`; patch 16 fills `reassemble`, the ghost container and the rewound node (`s4NodeX(slot)` is where its tether leaves from).
3. **The app's own rows below the window are clipped.** At `attackSteps` the window's bottom edge is at stage y ~590, so the app's step rows after the wipe row (the cat at f2582) fall below it, and `LAB.detailScroll` only scrolls at f2660. Patch 16 has to show the cat output in stage space or scroll the pane earlier.
4. `S4_CUE_ANCHORS` (patch 22) is still 15c's.
5. The import-time checks in `S4a2.tsx` throw if the step column ever starts under the panel (12 px clear needed), ends within 48 px of the stage's edge, or if the window's bottom edge comes within 24 px of the rail. Change `attackSteps` or `S4_PANEL` and the build tells you which moved.

### Known issues
- `tsc --noEmit` clean; the import-time checks pass on the SAMPLE evidence.
- Stills looked at (half size, Remotion with the npm-packaged Chromium, `--gl=swangle`): f2219, f2225 (busy ring, cursor on Run), f2244 (camera mid-move, panel not yet visible), f2270 (lattice building, rail drawing), f2299 (the hand-off: lattice intact, node 1 with its hash, caption gone, the first step row on the right).
- **NOT verified:** motion (the camera's 24 f opening, and the cursor's fade-out), and the final render at full size. At zoom 1.19 the pane's step text is small; that is the cost of keeping the column in the right half, and 15c's wipe command is stage space, so it does not depend on that zoom.
- The lattice sits low in the panel (about 170 px of blank sheet above it at full size) and the top of the right half is blank pane. Both are intended: the panel hangs from the top edge, and the pane's title is kept out of the frame.
- The evidence is still the SAMPLE (`meta.sample`): the hash and the file name are sample data.

## Patch 15c - S4a Rewind: the Attack Lab and the wipe, part 3 of 3: the wipe (f2300-2399)

**Applies on top of 15b.** **Changed files:** `src/scenes/s4/S4a.tsx` (resent: concatenates S4a1 + S4a2 + S4a3), `src/scenes/s4/S4a3.tsx` (new: camera, cursor, caption, geometry checks), `src/scenes/s4/S4Stage.tsx` (the command, the token slab, the shared shake), `src/scenes/s4/shared.tsx` (a marked "15c" section; one 15b constant changed, see below), `docs/PATCH_NOTES.md`. `S4Rewind.tsx`, `S4b.tsx`, `data.ts`, `S4a1.tsx`, `S4a2.tsx`, `focus.ts` are untouched.

### What 15c contains
- **f2300-2339 the command.** The real wipe command (`s4Data().wipe.command`) types on the STAGE, in the blank band above the lattice, linear, f2304-2336 (about 2.4 characters a frame), with a block cursor; complete 4 frames before the wipe. It is laid out from the evidence (`s4CommandLayout`): the largest mono size in 24-34 px at which it wraps at spaces to two lines inside the panel (30 px in the sample: `rm -rf /workspace/* /workspace/.[!.]*;` / `echo WIPED_$(ls -A /workspace | wc -l)`), with a 4 px `theme.bad` rule to its left. The app's own wipe row appears on f2300 beside it (filmState's).
- **f2340 THE WIPE** (`LAB.wipeLandsAt`, a beat): the FileLattice shatters (`shatter` 0 to 1 over `SHATTER_FRAMES` = 30, ending on f2370) and drains to 30 % (`desaturate` 0 to 0.3 over 12 frames); the command dims to 35 %.
- **Camera:** f2340 the punch, 3 % on top of 15b's bias (1.02 x 1.03), 6 frames, with an impact shake of 12 px; f2346 a relax to bias 1.03 arriving f2398. The stage SHARES the shake (`s4Shake`: the same seeded sines as `Camera.tsx`, keyed on the keyframe's frame), so the panel, the shards and the token jolt with the app instead of standing still against it. The caption is not shaken.
- **f2370 silence and the token.** The real output (`s4Data().wipe.token`, `WIPED_0`) slams in (opacity in 4 frames, scale 1.1 to 1 in 10) at the size that fits the lattice's width (162 px in the sample, mono bold, `theme.bad`) on a hatched slab in the lattice's place; the empty slots show through it. Caption "Everything gone." from `CUES.s4.captionGone` (f2370) until "Rewind." (f2400): it leaves over f2388-2399.
- **Cursor:** none (`S4A3_CURSOR` is empty). 15b hid it after the click; S4a's only click is Run's.
- **`S4_CUE_ANCHORS`** (new, `shared.tsx`), for patch 22: `glassShatter` = {frame 2340} and `silence` = {from 2370, to 2399, inclusive}. Both are read from `S4_TIMING`, not typed again.

### 15b constant changed
`PANEL_PAD_BOTTOM` 70 -> 40. The lattice (and its footnote) sit 30 px lower in the panel (lattice y 178 -> 208), which gives the command its band (safe margin 96 to 16 px above the lattice) and also fixes the blank top of the panel that 15b's notes listed. The footnote still ends 24+ px inside the panel and the panel still ends 48 px above the rail.

### PUBLIC API
- `S4A3_CAMERA` (2 keyframes: f2340, f2346), `S4A3_CURSOR` (empty), `S4a3` (the caption); `S4_CUE_ANCHORS`.
- `shared.tsx`: `S4_TIMING` gains `cmdIn`, `type`, `wipe`, `shatter`, `desat`, `dim`, `punch`, `relax`, `token`, `silence`, `captionGone`, `partEndA3`; new `S4_COMMAND`, `S4CommandLayout`, `s4CommandLayout`, `s4CommandOpacity`, `s4CommandChars`, `s4CommandCursor`, `s4TokenLayout`, `s4TokenState`, `s4Shake`. `s4LatticeState` now returns `shatter` and `desaturate`.

### Decisions and conventions future patches must follow
1. **Patch 16's first camera keyframe, cursor waypoint and overlay item start at f2400 or later**, from `attackSteps`, padding 96, bias 1.03 (arrived f2398).
2. **Patch 16 EXTENDS `S4Stage.tsx` and `shared.tsx`; it does not draw a second lattice.** From f2400 the stage still draws: the panel, the empty slots under the hatched slab with `WIPED_0`, the dimmed command, the footnote and node 1. Patch 16 must retire or replace the slab and the command (they are functions of the frame: add its own fade-out in `s4TokenState` / `s4CommandOpacity`) and fill `reassemble` in `s4LatticeState` (the shards return from where `shatter` scattered them, which the lattice reproduces from its seeds).
3. **The punch brings the steps column within 4 px of the panel's right edge** for a few frames (it is 12 px clear at 15b's pose). `S4a3.tsx` checks it (4 px from the panel, 24 px from the stage's right edge, window bottom 24 px above the rail) at the punch's arrival, the relax's and f2399.
4. **The app's own rows below the window** (the rewind row f2400, the cat row f2582) are still clipped below the window's bottom edge at `attackSteps`; see 15b: patch 16 shows the cat output in stage space or scrolls the pane earlier.
5. The silence is f2370-2399 inclusive; the sound returns on f2400 (patch 16's first beat). Patch 22 reads `S4_CUE_ANCHORS`.

### Known issues
- `tsc --noEmit` clean; every import-time check runs and passes on the SAMPLE evidence.
- Stills looked at (half size): f2320 (typing, cursor on line 2), f2350 (shards mid-flight, camera punched, command dimming), f2380 (the token, the caption mid-rise), f2399 (the token held, the caption leaving). **NOT looked at:** f2300, f2336, f2340 and f2345 (the frames of the hit itself), and motion: the shake (12 px, 8 frames), the shards' drift across the pane (up to 14 px/frame, fading over 30 frames) and the token's slam.
- The shards fly over the steps column and the app's own wipe row for about 30 frames (intended: "tiles shatter outward"); they fade out.
- The drain (30 %) applies to the lattice only, which is mostly shards by the time it has reached its full value.
- The evidence is still the SAMPLE: the command, `WIPED_0` and the hash are sample data.

## PATCH 19 - S7 Value + competitive (f4260-4559)

**Needs:** patches 10 (`CompareTable`) and 12 (the scene contract). It does not depend on patches 16-18; it applies on top of 15c as the repo stands.
**Changed files:** `src/scenes/S7Value.tsx` (replaced completely, the 12a stub is gone), `src/config/copy.ts` (one new group, `copy.s7.ticket`), `docs/PATCH_NOTES.md`. Nothing else is touched: `MiniLockerFilm.tsx`, `src/scenes/index.ts`, `timeline.ts` and `CompareTable.tsx` are as they were.

### What S7 contains
- **f4260-4289 the app steps back.** `S7Scrim`, a stage-sized backdrop layer (the way `S3Scrim` is built): `backdrop-filter: blur(10px) brightness(.35)`, ramped over 30 frames with the signature ease (`s7ScrimAmount`). It stays at full strength to f4559, so the window and the cursor are a soft dark field under the text. MiniLockerFilm and FilmApp are untouched.
- **f4275-4379 the question.** `copy.s7.line`, split after its colon into two lines (never retyped), italic CMU Serif 500 at 68 px through `KineticText` (a masked word reveal, 3 frames between words; the last word has landed on f4335). "know?" is drawn in accent-ink and underlined. The first word is on the beat f4275, not on f4260: the first 15 frames belong to the app stepping back.
- **f4305 the ticket, f4320 the report, f4335-4364 the glide, f4365 the landing.** Two code-built cards (hairlines, skeleton bars, no screenshots). The ticket (right) is titled `copy.s7.ticket.title` and has a dashed slot labelled `copy.s7.ticket.attach` ("attach the report"). The report sheet (left) is titled `copy.rep.eyebrow` and shows the report's real layout as a schematic: the Mark, a 3 x 3 grid of dimension cards, a ledger bar. It has NO words, numbers or status colors in its body, so nothing measured appears. On f4335 it glides (30 f, a 36 px lift, a 3 degree roll to 0) into the slot and shrinks to a thumbnail; on the beat f4365 the dashed slot turns solid, the label brightens, the ticket bumps 4 px and a check pops (`settle` spring).
- **f4368-4379 the exit.** The question and both cards rise 36 px and fade together; the table starts on the next frame.
- **f4380-4559 the table.** `CompareTable` with `copy.s7.rows`, `copy.gfxC.compareColumns / compareMarks / compareLegend`. Heads draw f4380-4399. Category rows build on the beats f4380, f4410, f4440 (30 frames each: rise, then the three marks). The MiniLocker row rises on the beat f4455; on the beat f4470 `emphasis` goes 0 to 1 over 30 frames (the row grows 6 %, takes the accent edge and the crimson discs) and is complete on f4500. The whole table pushes in 1.8 % (and 6 px up) over f4380-4559, so nothing stands still for 1.5 s.
- **f4500 the caption.** `copy.s7.caption` as TWO lines (split after the first sentence; on one line it is 68 characters and cannot fit the 1728 px safe width at 56 px), "a measurement" in accent-ink. It leaves over f4548-4559 and is gone at the cut f4560.
- **Camera:** f4260 a 30 f signature move to `fullWindow`, padding 60; f4380 a 180 f linear drift to bias 1.025 with 0.6 / -1.2 degrees of tilt. No big moves. **Cursor:** none (`S7_CURSOR` is empty).

### PUBLIC API
- `src/scenes/S7Value.tsx` exports: `S7Value` (overlay), `S7_CAMERA` (2 keyframes: f4260, f4380), `S7_CURSOR` (empty), `S7_TIMING` (every frame of the scene), `S7_SCRIM` (`{ blurPx: 10, brightness: 0.35 }`), `s7ScrimAmount(frame): number` (0..1), `S7Scrim` (`React.FC<{ frame: number }>`).
- `copy.s7.ticket = { title: "Change ticket", attach: "attach the report" }`.

### Decisions and conventions future patches must follow
1. **S8 starts on a cut (f4560) with the app still under S7's full scrim state.** The scrim is drawn by S7's overlay, which is unmounted from f4560: if S8 shows the app, it appears at full brightness on that frame. That is a hard cut on a beat, which BIBLE 5 allows, but if patch 20 wants a ramp it can import `s7ScrimAmount` / `S7_SCRIM` and draw its own out-ramp (a layer whose amount is `1 - ramp`).
2. **S6's last cursor waypoint should carry `hide: true`**: S7 has no waypoints, so a visible cursor would stay on screen (blurred) through the whole scene.
3. S7's first camera keyframe is f4260 and its last is f4380, so the next scene's first keyframe must be f4560 or later (the f4380 drift is 180 f and ends on f4559).
4. The scene reads nothing from the evidence on purpose (it shows no measured value). Keep it that way: any number added here must come from `src/data/select.ts`.
5. The table's marks are an editorial judgement about generic categories (copy.gfxC). No competitor names anywhere, in code or copy.

### Interpretations of the spec (change them in `S7_TIMING` only)
- "typed by KineticText": `KineticText` is a staggered masked word reveal, not a character typewriter; it is used as the spec says.
- "rows on f4380, 4410, 4440, then the MiniLocker row grows at f4470": the three category rows are on those beats; the MiniLocker row rises on f4455 (a beat) and grows on f4470. If you want it to appear and grow together on f4470, set `table.product` to 4470.
- The question's first word is on f4275 rather than f4260 (`CUES.s7.line` in timeline.ts is still the nominal 4260; nothing reads it for placement).

### Known issues
- `npx tsc --noEmit` is clean and every import-time check in `S7Value.tsx` passes (beats, order of events, safe margins, legend clear of the caption). The scene was server-rendered (react-dom/server with a mocked frame) at 20 frames from f4260 to f4559 to confirm that nothing throws and that each element appears on its frame.
- **NOT looked at:** any rendered still or motion. No browser was available in the build environment. Please look at stills at f4290, f4350, f4400, f4440, f4480, f4540: expect, in order, the app dark and blurred under the two-line question with both cards up; the report mid-glide towards the ticket's slot; the table with two category rows (heads and rows 1-2 in); all three categories up and the MiniLocker row not yet raised; the MiniLocker row grown with its crimson edge and discs; the full table with the two-line caption.
- `backdrop-filter` is what `S3Scrim` already relies on. If a still shows ghost edges on the stage border (as the camera's DOF layer once did, see `CAMERA_DOF`), replace the scrim with a solid `theme.paper` layer at 65 % opacity: the blur is then lost but the dimming is identical.
- The report sheet is a schematic of the real Report screen (nine dimension cards, a ledger block); its tiles carry no names. That is deliberate (nothing measured), but it means the sheet reads as "a report" through its title and layout only.
- The evidence is still the SAMPLE (`meta.sample`); this scene does not use it.

## Patch 16a - S4b Rewind: restore, checks, ledger, proof clip, part 1 of 6: "Rewind." (f2400-2459)

**Applies on top of 15c** (repo head `d72aa1c`). Patch 16 is built in six parts (16a-16f), each applied on top of the previous, the way patches 12, 14 and 15 were. **Changed files:** `src/scenes/s4/S4b.tsx` (the stub is replaced by the S4b assembly, which concatenates the parts as they arrive), `src/scenes/s4/S4b1.tsx` (new: camera, caption, geometry checks), `src/scenes/s4/S4Stage.tsx` (the greyed and rewound nodes, the pulse, the GhostContainer), `src/scenes/s4/shared.tsx` (a marked "16a" section), `src/scenes/s4/data.ts` (extended ONCE for all of S4b, see below), `docs/PATCH_NOTES.md`. `S4Rewind.tsx`, `S4a*.tsx`, `copy.ts`, `focus.ts`, `script.ts` and `timeline.ts` are untouched (every word 16a shows is already in `copy.gfxB` / `copy.s4`).

### What 16a contains
- **f2400 "Rewind."** (`CUES.s4.captionRewind`), gone by f2456 (it leaves over its last 12 frames).
- **f2400-2413 the slab and the command retire.** The hatched slab with `WIPED_0` and the dimmed wipe command fade out (`s4RetireProgress`, multiplied into `s4TokenState` and `s4CommandOpacity`, as 15c's notes asked): what stays is the lattice's empty, dashed slots.
- **f2406 the greyed snapshot(s).** Every snapshot in `timeline.rewound.payload.discarded` lands greyed on the rail, 6 frames apart, with its real hash (snapshot 2, `819c3525`, in the sample).
- **f2415 the pulse** (a beat) leaves snapshot 1 (SnapshotTimeline's `tether`) and reaches the middle of the empty lattice at f2437; a faint line stays.
- **f2421-2444 the GhostContainer** draws on round the lattice (`S4_GHOST`: the lattice's place plus 14 px) in `GHOST_DRAW_FRAMES` = 24 frames, **complete on the beat f2445**, chip "fresh sandbox".
- **f2437-2458 the blue "rewound" node**: its arc leaves snapshot 1 as the pulse arrives, the node lands from f2447 with "restored into a fresh sandbox" under it. It carries snapshot 1's number and hash (`timeline.rewound.snapshot_sha256`, checked equal to the snapshot's).
- **Camera:** one keyframe, f2400, a slow push on `attackSteps` from bias 1.03 to 1.04, arriving f2459. **Cursor:** none.
- **The footnote** ("schematic: only the labelled tile is a real file") is off for f2400-2459 (`s4FootnoteOn`): the pulse's line crosses its place, and no tile is on show.

### data.ts (extended once for all of S4b)
New fields, all derived from the attack's ledger and result, each throwing (naming what is missing) if the evidence cannot support the scene:
- `rewound` {`toSnapshot`, `atStep`, `discarded[]` (n, hash, short), `restoredHash`, `files`}. The ledger has no separate "restored tree" hash: `restoredHash` is `timeline.rewound.snapshot_sha256`, and the scene **throws unless `verified.matches` is true** (and `missing` and `unexpected` are 0, and the hash equals the snapshot's). 16b's HashTile reads this.
- `cat.line` (16c): the restored file's first line, without the harness's `exit_code=` line.
- `chain` (16e): seven `{role, event}` entries picked by what the event IS, in ledger order (checked): `write` (tool.call write_file), `snapshot` (the snapshot the rewind goes back to), `delete` (tool.call with `rm -rf`), `rewind` (rewind.requested), `recreated` (sandbox.recreated), `rewound` (timeline.rewound), `cat` (tool.call cat). Sample: events 5, 6, 9, 13, 17, 18, 20.
- `seal` (16e): from the attack's `verify` payload: `verified`, `events`, `head`, `short` (sample: 29 events, head `0589fc3d`). Throws if the ledger did not verify.
- `outcome` (16f): `files`, `checksPassed`, `checksTotal`, `seconds` (`duration_s`), `verdict` (sample: 1, 8 of 8, 11.84 s, contained).

### PUBLIC API
- `S4B1_CAMERA` (1 keyframe: f2400), `S4B1_CURSOR` (empty), `S4b1`; `S4B_CAMERA`, `S4B_CURSOR` and `S4b` now concatenate the parts (only S4b1 so far).
- `shared.tsx`: `S4_TIMING` gains `captionRewind`, `retire`, `discarded`, `pulse`, `ghost`, `rewound`, `rewindPush`, `partEndB1`; new `S4_GHOST`, `S4_TETHER_TO`, `s4RetireProgress`, `s4GhostDraw`, `s4PulseProgress`, `s4DiscardedProgress(frame, i)`, `s4RewoundProgress`, `s4FootnoteOn`.
- `data.ts`: `S4Data` gains `rewound`, `chain`, `seal`, `outcome` and `cat.line`; new type `ChainRole`.

### Decisions and conventions future patches must follow
1. **16b's first camera keyframe, cursor waypoint and overlay item start at f2460 or later**, from `attackSteps`, padding 96, bias 1.04 (arrived f2459).
2. **16b EXTENDS `S4Stage.tsx` and `shared.tsx`; it does not draw a second lattice.** From f2460 the stage still draws the empty slots inside `S4_GHOST`, the greyed node(s) and the rewound node. 16b fills `reassemble` in `s4LatticeState` (the shards return INTO the container: the lattice sits at `S4_LATTICE_AT`, the container is the same place plus 14 px), brings the footnote back on f2460 (`s4FootnoteOn` is false until f2459), and lays its HashTiles out against `S4_LATTICE_AT` / `S4_GHOST`.
3. **The playhead of the timeline is unused so far** (`playhead` is omitted): 16b may use it for the hash-lock sweep.
4. `S4_CUE_ANCHORS` (patch 22) is unchanged; the sound returns on f2400. The beats of 16a (pulse f2415, container complete f2445) are in `S4_TIMING` for patch 22 to read.
5. The part's camera ends 1 % under 15c's punch peak (1.02 x 1.03 = 1.0506); `S4b1.tsx` checks the steps column against the panel (4 px), the stage's right edge (24 px) and the rail (24 px) at f2459.
6. The 16a part of `data.ts` is final for 16b-16f: if one of those patches needs another evidence value, it adds it there and says so.

### Known issues
- `tsc --noEmit` clean. The new `data.ts` fields were printed from the SAMPLE evidence and match the ledger (`rewound.restoredHash` = snapshot 1's hash, `seal` 29 events / `0589fc3d`, `chain` events 5, 6, 9, 13, 17, 18, 20).
- Stills looked at (half size, Remotion with the system Chrome, `--gl=swangle`): f2399 (the baseline: 15c's last frame), f2406 (slab retiring, caption rising), f2418 (the greyed node landing, the pulse leaving), f2430 (the container drawing on, the pulse crossing the slots), f2442 (container nearly complete, chip in, arc starting) and f2459 (the last frame: the container, the arc and the rewound node with its label).
- **NOT verified:** motion (the pulse's speed, the container's draw-on, the push), the full-size render, and f2400-2405 and f2410-2415 in particular. The frame f2406 still shows the slab almost opaque: `signature` starts slowly, so the retire only reads from about f2408.
- The greyed node's label (`snapshot 2  819c3525`, struck through, dimmed to 60 %) is faint on the dark stage by SnapshotTimeline's design ("work the rewind threw away"); it is legible at full size but not emphasised.
- The panel's left edge and the container's corner ticks are 11 px apart, inside the panel; the container's label chip sits 17 px above its top edge, 97 px below the top of the stage.
- The evidence is still the SAMPLE (`meta.sample`); the hashes, file name and counts are sample data.

## PATCH 25 - Motion polish: mirror bug, camera life, softer moves, rules for every later patch

**Why:** the first full review (all 5100 frames as contact sheets + a numeric audit of the camera) found mirrored upside-down frames at f1550 and f4270, a violent S2->S3 whip, a near-black 40 frames at the S3->S4 hand-over, long still shots, and 60 s of frozen camera on a cropped corner in the S4 tail / S5 / S6 stubs.

**Files created:** `src/scenes/appLook.ts`, `docs/guide/motion-rules.md`, `tools/audit-motion.mjs`, `scripts/make-sheets.mjs`.
**Files changed:** `src/MiniLockerFilm.tsx`, `src/ui/theme.css`, `src/config/camera.ts`, `src/fx/Camera.tsx`, `src/scenes/S1Title.tsx`, `src/scenes/S5Page.tsx`, `S6Evidence.tsx`, `S8Vultr.tsx`, `S9Outro.tsx` (interim cameras), `src/scenes/S7Value.tsx`, `src/scenes/s3/shared.tsx`, `s3/S3c.tsx`, `src/scenes/s2/S2c.tsx`, `src/scenes/s4/S4a1.tsx`, `s4/S4b2.tsx`, `s4/shared.tsx`, `package.json` (scripts `motion`, `sheets`), `docs/guide/context-header.md` (MOTION RULES block), `docs/patches/patch-16..18,20..24.md` and their `prompts/*.prompt.txt` (motion amendment each).

**PUBLIC API**
- `appLook(frame): { blurPx }` (`src/scenes/appLook.ts`): blur, in SCREEN px, of the app layer. MiniLockerFilm divides it by the camera zoom and applies it as a plain CSS `filter` on `.film-app-layer`. The S3 and S7 scrims are now dim-only overlays.
- `holdShot(frame, end, target, { padding, arrive, push, scaleBias, rotateX, rotateY }): CameraKeyframe[]` (`src/config/camera.ts`): ease to a shot, then a linear push to `end`. Spread into a scene's camera array.
- `CAMERA_LIMITS.driftPx` 2 -> 5 (periods 190 / 257 f) and new `CAMERA_LIMITS.floatZoom` 0.004 (period 310 f).
- `NAV_PADDING = 300` (`s3/shared.tsx`): the `nav` shot S3 ends on and S4a starts from (zoom ~1.96, was 2.56).
- `npm run motion` (`tools/audit-motion.mjs`, `--strict` exits 1 on warnings) and `npm run sheets` (`scripts/make-sheets.mjs`: `--from --to --every --zip`).

**Decisions / conventions:** see `docs/guide/motion-rules.md` (also in the context header). NEVER `backdrop-filter` (it mirrors the window in Chrome). The S2c whip is f1474-1500 (26 f, was 18) and the widen before it ends f1464. `S4_HASH.y` 612 -> 618 and `WINDOW_TILE_GAP` 12 -> 8 because the camera now floats up to ~7 px. The S1 lockup creeps in 4.5 % over its hold (the dial does not, so it parallaxes and still lands exactly on f590). `appLook` limits the S7 blur to S7's own frames (as the old scrim did).

**Known issues / not verified:** NOT rendered (this sandbox cannot fetch Chrome): the mirror fix is by cause (backdrop-filter + 3D camera), not yet confirmed on frames; check f1550, f4270 on new sheets. S2 run shots (f800-1190) still show a sliver of the Blast panel at the right edge (design choice, kept). The S4 tail f2580-3299 and S5-S9 are still stubs with interim cameras. `npm run motion` reports STILL for stage-space scenes (S0, S1, S3, S7) where the action is not the camera: expected.

**Warnings for the next patch:** replace the interim `holdShot` in S5/S6/S8/S9 completely; keyframes must cover the whole scene range; apply the MOTION AMENDMENT at the end of your patch file.
## Patch 16c - S4b Rewind: restore, checks, ledger, proof clip, part 3 of 6: "The cat" (f2580-2699)

**Applies on top of 16b** (repo head `fdbb285`). **Changed files:** `src/scenes/s4/S4b3.tsx` (new: camera, the cat overlay, geometry checks), `src/scenes/s4/S4b.tsx` (assembly: S4b3 added), `src/scenes/s4/S4Stage.tsx` (the stage retires), `src/scenes/s4/S4b2.tsx` (the HashTile and the counter step aside), `src/scenes/s4/shared.tsx` (a marked "16c" section), `docs/PATCH_NOTES.md`. `data.ts` is NOT touched (16a extended it once for all of S4b: `cat.line` is already there). `copy.ts`, `focus.ts` (`attackDetail` already exists), `script.ts` and `timeline.ts` are untouched: the part adds no word of its own, it prints the evidence's.

### What 16c contains
- **f2584-2593 the HashTile and the counter step aside** (`s4HashOpacity`: a fade with a 10 px drop, in S4b2's overlay). The counter has been up for 20 frames. From f2594 S4b2 draws nothing.
- **f2596-2607 the real cat command** (`data.cat.command`) types in the strip the tile has left (`S4_CAT`: the tile's own strip, x 868 to the right safe margin, y 612), 24 px mono in `theme.ink3`, behind a 4 px rule in `theme.ok` (clean is blue in the app).
- **f2610-2639 the real restored line prints** under it (`data.cat.line`, `three weeks of work that exists nowhere else` in the sample), linear (about 1.5 characters a frame), **complete on the beat f2640**. It is as large as fits the strip on ONE row with a character kept for the cursor (39 px in the sample); it wraps only if it cannot be set on one row at 26 px or more (`s4CatLayout`). The cursor types, then blinks at the end of the line until the stage leaves. The app's own cat row (it appears on f2582, `LAB.stepAt.cat`) is clipped below the window at `attackSteps`, which is why the line is drawn here.
- **The scene throws unless the restored line is the first line of the file the attack wrote** (`data.write.content`): the film says the work came back, so the evidence must say it did (S4b3 import-time check).
- **f2655-2668 the stage retires** (`s4StageOpacity`, ONE opacity on S4Stage's root: the panel, the lattice, the container, the rail, the nodes) and the cat leaves with it (`s4CatOpacity`). Nothing is drawn in stage space from f2669.
- **f2655-2684 the camera moves** from `attackSteps` to `attackDetail` (padding 96, bias 1, `signature`, 30 frames) and **arrives on the beat f2685**. No tilt. The stage retires on the SAME frame the camera starts (`S4_TIMING.stageOut.from === detailMove.from`, checked), which keeps the cross-dissolve short.
- **Cursor:** none (hidden since the click on Run, f2220). No caption.

### PUBLIC API
- `S4B3_CAMERA` (1 keyframe: f2655), `S4B3_CURSOR` (empty), `S4b3`; `S4B_CAMERA`, `S4B_CURSOR` and `S4b` concatenate S4b1, S4b2 and S4b3.
- `shared.tsx`: `S4_TIMING` gains `hashOut`, `catCmd`, `catLine`, `detailMove`, `stageOut`, `partEndB3`; `S4_CUE_ANCHORS` gains `catCommand`, `catLine`, `stageOut` (patch 22: typing ticks, the stage leaving); new `S4_CAT`, `S4CatLayout`, `s4CatLayout(command, line)`, `s4HashOpacity`, `s4StageOpacity`, `s4CatOpacity`, `s4CatCmdChars`, `s4CatLineChars`, `s4CatCursor`.

### Decisions and conventions future patches must follow
1. **16d's first camera keyframe, cursor waypoint and overlay item start at f2700 or later**, from `attackDetail`, padding 96, bias 1 (arrived f2684). The stage is gone: **16d draws nothing of it** (do not extend `S4Stage.tsx` again).
2. **The camera is on `attackDetail` at f2699, with the app's detail pane mid-scroll** (`LAB.detailScroll`: 0 until f2660, 520 by f2698). The pane under the cat row is EMPTY until the checks light on f2700 (`filmState` draws a check only once it is lit), so the last 15 frames of 16c show the steps and a blank below them. That is the room the checks light into.
3. **The next patch that touches the camera at f2700+ must look at the pane first** (see Known issues): `attackDetail` is the pane at scroll 0.
4. The strip (`S4_CAT`) is the HashTile's: 16e and 16f must not draw there before the stage has gone (f2669).

### Known issues
- `tsc --noEmit` clean; every import-time check of `shared.tsx` and `S4b3.tsx` passes (one of them caught a real layout bug while building: the first cat layout wrapped the restored line to two rows once a character was kept for the cursor; the layout now prefers one smaller row to a wrap).
- Stills looked at (half size, Remotion with an npm-packaged Chromium, `--gl=swangle`): f2590 (the tile fading), f2625 (the command typed, the line printing), f2645 (the line complete, cursor inside the right safe margin), f2662 (mid-retire), f2685 and f2699 (the camera arrived on the detail pane), and, for 16d's benefit, f2740 and f2790 with this part's camera held.
- **NOT verified:** motion (the typing speed, the 14-frame cross-dissolve of the stage into the app's card list, which is visible through the fading panel for about 6 frames), the full-size render, f2596-2609 and f2650-2660 in particular.
- **For 16d:** with this part's camera held, f2740 shows the first four checks lit under "Containment checks", and f2790 shows the list running past the window's bottom edge (stage y ~1002): the sixth check is cut, and the verdict banner is not on screen at the pane's scroll of 520. 16d needs its own focus rects for the checks and the verdict, and probably a retimed `LAB.detailScroll` (further down for the checks, back up for the stamp on f2780). None of that is in this patch.

## PATCH 26 - Repair of patches 16d-16e, 17, 18 as applied (and the missing notes for them)

**Why:** the applied state (HEAD `cf113bd`) did not compile. Found by `npx tsc --noEmit` and `node tools/audit-motion.mjs` on a fresh clone.

**Defects found and fixed**
1. `src/config/focus.ts` line 216 held ten literal PowerShell escapes (`` `r`n ``) where line breaks belong, so `reportGrid` and `verifyButton` (patch 18) and their comments were fused into one line and the file did not parse (22 syntax errors). Replaced with real line breaks.
2. `src/scenes/s4/S4b4.tsx` (patch 16d) did not exist, although `S4b.tsx` imports `S4B4_CAMERA` and `S4B4_CURSOR` from it. Created (camera only, as the header of `S4b.tsx` says): `attackChecks` arriving on the beat f2730, a 2 % drift to f2763, the sweep to `attackVerdict` arriving on the stamp f2780, a 3 % push to f2819; no cursor. Its import-time checks: ordering against 16c and 16e, every shot's rectangle inside the stage with 24 px round it, and the evidence's check count against `LAB.checksFit` (8).
3. `S5Page.tsx` and `S6Evidence.tsx` did not import `React` or `SceneOverlayProps`; `S5Page.tsx` did not export `S5_CURSOR` (which `scenes/index.ts` imports). Added (`S5_CURSOR = []`: no cursor in S5, BIBLE 5).
4. Both files also ended with a stray carriage return and have CRLF line endings (written by PowerShell). Kept CRLF so this patch's context lines match; the stray final CR is now a newline.
5. **backdrop-filter was back** (patch 25 rule 5): S5's scrim (stage-sized) and S6's claims strip drew the mirrored window again. Both are now dim-only; their blur goes through `appLook.ts`.
6. S6's opening `nav` shot ran at zoom 2.5 with a 149 px/frame pan; it now uses the shared `NAV_PADDING` (300, zoom ~1.96).

**Files created:** `src/scenes/s4/S4b4.tsx`. **Changed:** `src/config/focus.ts`, `src/scenes/S5Page.tsx`, `src/scenes/S6Evidence.tsx`, `src/scenes/appLook.ts`, `tools/audit-motion.mjs`, `docs/PATCH_NOTES.md`.

**PUBLIC API (the parts built by patches 16d-18, from the code, since their own notes were never appended)**
- `S4B4_CAMERA`, `S4B4_CURSOR` (S4b4, no overlay component); `S4B5_CAMERA`, `S4B5_CURSOR`, `S4b5` (16e, the chain, f2820-3029).
- `S5_TIMING`, `S5_CUE_ANCHORS`, `S5_CAMERA`, `S5_CURSOR`, `S5_SCRIM`, `s5ScrimAmount(frame)`, `S5Page`; `s5Data()` / `S5Data` / `S5Finding` (`src/scenes/s5/data.ts`); `FixturePage`, `FIXTURE`, `fixtureLayerTop` (`src/ui/FixturePage.tsx`).
- `S6_TIMING`, `S6_CAMERA`, `S6_CURSOR`, `s6ClaimsBlur(frame)`, `S6Evidence`.
- `appLook(frame)` now takes the maximum blur of S3, S5, S6 (claims strip) and S7.
- `tools/audit-motion.mjs` also reports `BACKDROP` for any `backdrop-filter` line in `src/scenes` or `src/gfx`.

**Known issues / not verified:** nothing was rendered (no Chrome in the sandbox): every change is checked by `tsc`, by the import-time checks of all scenes and by a full `remotion bundle`, not by frames. Still missing: S4b6 (16f, f3030-3299) and patches 20-24, so f3030-3299 holds the last pose (the audit reports it as STILL). `npm run motion` still reports long STILL runs in S5 (f3380-3704) and S6 (f4109-4200); both are scenes whose action is in stage space, so judge them on the sheets. Patch 16b, and patches 14b/16d/16e/17/18, still have no notes of their own.

## Patch 16f - S4b Rewind: restore, checks, ledger, proof clip, part 6 of 6: "The proof" (f3030-3299), closes patch 16

**Applies on top of** repo head `251a76a` (16e and patch 26 as applied). **Changed files:** `src/scenes/s4/S4b6.tsx` (new: camera, the scrim, the proof group, the clip and the replay, geometry checks), `src/scenes/s4/S4b.tsx` (assembly: S4b6 added; its scrim is mounted UNDER 16e's layer), `src/scenes/s4/shared.tsx` (a marked "16f" section), `src/config/script.ts` (`PROOF`), `src/config/copy.ts` (`badges.proofLiveLine`, `s4.proof`), `scripts/check-proof.mjs` (new), `public/proof/manifest.json` (new), `docs/PATCH_NOTES.md`. `data.ts` is NOT touched (16a extended it once for all of S4b: `outcome` and `chain` are already there), nor `package.json` (the `proof` script was already declared), `focus.ts` (`fullWindow` exists) or `timeline.ts` (`CUES.s4.captionReal`, f3060, exists).

### What 16f contains
- **f3030-3041 the ledger layer leaves.** `s4LedgerOpacity` (it returned 1) now fades the whole layer (the chain, the seal, the callout, the button and 16e's own scrim) over 12 frames, signature. S4b6's own scrim (`S4b6Scrim`, mounted before S4b5 in `S4b.tsx`, so UNDER the ledger layer) takes over frame for frame (`s4ProofScrim`): the Lab behind keeps letting through exactly 5 % (checked: the error of that product over f3029-3284 is 1e-16), so the chain fades over a dimmed Lab instead of a bright flash.
- **f3030-3059 the proof group rises** (36 px, signature), complete on the caption's beat f3060: on the left 62 % a 16:9 window, on the right 38 % three StatNumerals. It pushes in 4 % (linear, about its centre) to f3285 and stays inside the 96 px safe margins at the end of the push (S4b6 checks it) and 24 px above the caption.
- **THE WINDOW is decided by `public/proof/manifest.json`**, imported at build time (nothing reads the file system while rendering):
  - **clip present** - `PROOF.file` (`public/proof/rewind.mp4`) plays through `<OffthreadVideo>`, muted, cut to `PROOF.startFrom`-`PROOF.endAt`: the first frame of the cut is held while the window rises, the cut plays from f3060, its last frame is held until the window leaves. Badge: `LIVE - recorded on the Vultr VM - unedited` (`copy.badges.proofLiveLine`, tone `bad`).
  - **no clip** - a code replay of the real steps of the attack, read from the ledger (`data.chain`): the write, the snapshot, the wipe and its output (vermilion, hatched), the verified rewind (the ledger's own line), the files re-hashed, the cat and the restored line. Eight rows, on beats f3075, 3090, 3105, 3120, 3150, 3165, 3195, 3210. Badge: `RECONSTRUCTED FROM LEDGER`. The word LIVE is never in this branch (checked at import).
- **f3075, f3105, f3135 the three numerals count** (30 frames each, StatNumeral's ease; their blocks rise on the same beats): files re-hashed, checks passed ("of" the total) and the run's seconds. All three come from the attack's result (`data.outcome`); with the sample evidence they read 1 / 8 of 8 / 11.84 s, the same numbers the app's own verdict tile shows on f3299.
- **f3060-3285 the caption** "Real wipe. Real rewind. Real hashes." (`copy.s4.captionReal`).
- **f3285-3292 the group leaves** (an 18 px drop and a fade), **f3285-3298 the scrim fades out** (signature). The app is bright and whole on f3299 and the stage is empty.
- **Camera:** one keyframe, f3030, linear, from 16e's pose (`attackVerdict`, bias 1.06) to `fullWindow`, padding 60, bias 1, **arriving on f3299**. S5 whips from there on f3300. f3299 is the app bright and whole with nothing in stage space; f3300 differs from it only slightly (measured on the half-size stills: mean 0.5 / 255, no shift, 0.2 % of the pixels by more than 32, at text edges), which I read as the whip's first frame beginning to move, not as a jump; that was not isolated further.
- **Cursor:** none (hidden since f2220). `S4B6_CURSOR` is empty.

### `npm run proof` (scripts/check-proof.mjs)
Reads `PROOF` from `script.ts`, looks for the clip, probes it with `ffprobe` when installed (length, size, frame rate) and **writes `public/proof/manifest.json`**: `present`, `file`, `durationFrames` (floor of seconds x 30; null when ffprobe is missing or there is no clip) and, with a clip, `width`, `height`, `fps`, `bytes` and `sha256` (no timestamps: a second run changes nothing).
- `npm run proof -- --check` writes nothing and fails when the manifest is stale (the clip was added, removed or changed since the last run).
- `npm run proof -- --final` also fails when there is no clip: use it before a final render that is meant to show the recording. Without the flag a missing clip is not an error: the reconstruction ships, honestly badged.
- Always a failure: an unreadable `PROOF`; `startFrom` / `endAt` that are not whole frames or `endAt <= startFrom`; `endAt` past the clip's last frame. Warnings: no ffprobe, width under 1280, not 16:9 (the window crops with `object-fit: cover`), not 30 fps (Remotion resamples), an audio track (never used).
- **After you add, replace or remove `public/proof/rewind.mp4`, run `npm run proof`.** The manifest is what the film reads, so a clip dropped in without it is silently ignored (the replay shows, and it is badged as the replay).

### PUBLIC API
- `S4b6.tsx`: `S4B6_CAMERA` (1 keyframe), `S4B6_CURSOR` (empty), `S4b6`, `S4b6Scrim`, `HAS_PROOF_CLIP`. `S4B_CAMERA`, `S4B_CURSOR` and `S4b` in `S4b.tsx` now concatenate all six parts.
- `shared.tsx`: `S4_TIMING` gains `ledgerOut`, `proofIn`, `badgeIn`, `play`, `numerals`, `numeralFrames`, `proofCaption`, `proofPush`, `proofOut`, `scrimOut`, `partEndB6`; `S4_CUE_ANCHORS` gains `ledgerOut`, `proofRise`, `proofPlay`, `numerals`, `proofOut` (patch 22: the layer leaving, the clip starting, a tick per numeral); `s4LedgerOpacity` is now a real fade; new `s4ProofRise`, `s4ProofGroupExit`, `s4ProofPush`, `s4ProofScrim`.
- `script.ts`: `PROOF = { file, startFrom, endAt }` (also in `SCRIPT.proof`). Defaults: `proof/rewind.mp4`, 0, 210. `copy.ts`: `badges.proofLiveLine`, `s4.proof` (`checksOf`, `checks`, `secondsUnit`, `seconds`).

### Decisions and conventions future patches must follow
1. **The cut must be 188 to 225 frames** (`PROOF.endAt - PROOF.startFrom`): at least the replay's last row (f3210) plus 30, the clip's last frame held at most 45 frames before the group leaves (f3293), and the cut over before the group leaves. `shared.tsx` throws, with the numbers, when it is not (tried with 150).
2. **The badge must say what the window is.** LIVE is only ever shown with the clip, and the badge of the reconstruction can never contain it; both are import-time checks in S4b6. The manifest is the single switch.
3. **Nothing is drawn in stage space from f3299.** S5 (f3300) owns the camera from `fullWindow`, padding 60.
4. **Do not retime S4b6's beats by hand in S4b6.** The group, the numerals, the caption and the scrim all come from `S4_TIMING` (16f section); the replay's eight row frames are the one list kept in `S4b6.tsx` (`ROW_AT`), each checked to be on a beat and after the window is up.
5. The numerals' wording is `copy.s4.proof` (the label under the seconds, "to run the whole attack", is this patch's); "files re-hashed" is `gfxB`'s.

### Known issues
- `tsc --noEmit` clean. The module (S4b, S4b6, shared, data) was bundled with esbuild and loaded in Node in BOTH modes: every import-time check of S4b6 and of `shared.tsx` passes with and without a clip.
- Stills looked at (half size, Remotion with the system Chrome, `--gl=swangle`): replay mode f3038 (the ledger layer fading over the dimmed Lab), f3075, f3135, f3210, f3288 (mid-exit), f3299 and f3300 (the hand-off); clip mode f3045 (first frame held, group rising), f3120 (playing), f3280 (last frame held, caption leaving).
- **The clip mode was tested with a synthetic test-pattern clip (a burned-in timecode), which is NOT in this patch.** There is no recording of the hero attack in the repo: record it on the Vultr VM, save it as `public/proof/rewind.mp4`, trim with `PROOF.startFrom` / `endAt`, then run `npm run proof` and commit the manifest (and the clip, if you want the repo to render it).
- **NOT verified:** motion (nothing was rendered as a video, so the clip's playback in sequence, `OffthreadVideo`'s frame accuracy and the 4 % push have not been watched), the full-size and 4K renders, the audio hooks (patch 22 does not exist yet), and the look of a REAL recording in the window (a screen recording with a lot of small text may want a larger window than 62 %).
- `npm run motion` no longer reports f3060-3299 as one STILL run (the camera creeps out to `fullWindow`); the remaining S4 run, f2803-3060, is 16d and 16e, which live in stage space.

## Patch 21-0 - S9 Outro, the split contract (f4980-5099)

Patch 21 (S9) is built by TWO patches that can be written in parallel, 21a and 21b, on top of this contract. Guide: `docs/patches/patch-21-split.md`. **Applies on top of** repo head `76ebf7e`.
**Changed files:** `src/scenes/S9Outro.tsx` (now the assembly), `src/scenes/stageState.ts` (`APP_CLEAR`, `appReveal` fades the app out), **new:** `src/scenes/s9/shared.ts`, `src/scenes/s9/S9a.tsx` (stub), `src/scenes/s9/S9b.tsx` (stub), `docs/patches/patch-21-split.md`, `docs/patches/prompts/patch-21a.prompt.txt`, `docs/patches/prompts/patch-21b.prompt.txt`.

- `S9Outro.tsx` exports `S9_CAMERA` (`holdShot(4980, 5099, "fullWindow", { padding: 60, arrive: 30, push: 0.04, rotateX: 8, rotateY: -6 })`: move 1 the pull-back f4980-5010, move 2 the slow push to f5099), `S9_CURSOR` (empty) and `S9Outro`, which mounts `<S9a/>` then `<S9b/>` in one `inset: 0` box. **Neither part edits it.**
- `s9/shared.ts` is the contract: `S9_TIMING` (every frame both parts need), `S9_LAYOUT` (stage rectangles of every row of the end card), `s9Ramp`, `s9Breath` (the Mark's glow, 0.88-1.12, 120-frame cycle), `onBeat`. **Neither part edits it.**
- `stageState.appReveal`: from f4980 the app fades out (signature, f4980-5004) and is unmounted from f5004. `gridOpacity` (f4980-5000) was already there. From f5005 the stage is bare: gradient, glow, grid paper.
- The camera moves nothing a viewer can see after f5004 (the app is gone); `npm run motion` reads keyframes, so S9 is not a STILL.
- `tsc --noEmit` clean; `npm run motion` reports S9 at zoom 1.07-1.11 and no STILL.
- Each part writes its own notes to `docs/notes/patch-21a.md` / `patch-21b.md`; they are appended to this file once, in order, by the merge step of the guide (so two parallel patches never overwrite `PATCH_NOTES.md`).

## PATCH 22 - Audio

**Applies on top of** repo head `2493dba`.
**Changed files:** `src/MiniLockerFilm.tsx` (one import, one `<FilmAudio />`), `src/config/filmState.ts` (new export `typedCommands`), `src/config/copy.ts` (new export `voiceBlocks`), `package.json` (`sfx:check`). **New:** `scripts/make-sfx.mjs`, `src/config/sfx.ts`, `src/audio/FilmAudio.tsx`, `public/audio/manifest.json`.

### `npm run sfx` (scripts/make-sfx.mjs)
Pure Node, no dependencies. Synthesizes 35 WAVs (48 kHz, 16-bit, mono, 23.9 s in all) into `public/audio/` and writes `public/audio/manifest.json` (per file: seconds, frames, peak, sha256; plus whether the optional `music.mp3` and `voice.wav` exist). Noise is seeded by each sound's name, so the same Node version writes byte-identical files. Effects peak at -12 dBFS, key ticks at -24 dBFS; no samples, nothing copyrighted.
- `npm run sfx:check` (`--check`) writes nothing and fails when the manifest or a file is stale or missing.
- **The WAVs are not in the patch** (2.3 MB of binary): run `npm run sfx` once after applying it. The manifest IS in the patch, so `tsc` is clean before you do.
- **After you add or remove `public/audio/music.mp3` or `voice.wav`, run `npm run sfx` again.** The film reads presence from the manifest at build time and never looks at the disk while rendering.

### `src/config/sfx.ts` (the cue list)
`SFX_CUES: SfxCue[]` = `{ frame, file, volume }`, sorted by frame, built from the frames the scenes already export (`*_CUE_ANCHORS`, `*_TIMING`, `script.ts`, `typing.ts`, `hash.ts`); no scene frame is typed again. 295 cues in the sample evidence (S0 5, S1 10, S2 135, S3 6, S4 77, S5 31, S6 15, S7 2, S8 13, S9 1; the counts follow the evidence).
- **S0** slams on `S0_TIMING.hits`, glitch on f165. **S1** sub-impact f300, ticks as the rings and the five arcs draw, shimmer f420, soft whoosh f540. **S2** a key tick on every frame a character of a terminal command arrives (`typedCommands`, the terminal's own plan), click f750, a ledger tick per step line, chime at the hidden check pin, three flip ticks at the audit pin, whoosh f1474 (patch 25: peaks f1500). **S3** alarm blip per decoy read (`s3ReadFrames`), thud f1830, verify sweep f1935, stamp f1965, soft whoosh on the nav swing f2052. **S4** click f2220, key ticks for the wipe f2304-2335, glass-shatter f2340, riser f2400, eight `lock-k` plucks over the hash lock (one per two characters of the 16 shown), chime on THE tick f2550, key ticks for the cat command and line, a tick per real check, stamp f2780, a ledger tick per chain block, click f2946, long verify sweep f2950, hit on the seal f2990, a tick per numeral. **S5** whoosh peaking on the whip's landing (f3330), a hit per ledger line (injection f3435, deny f3525, each egress line), a low blip at the deny and at the approval denial, key ticks for the compromised agent's command, stamp f3555. **S6** a tick per report card, click f3960, success chord f4020, a tick per numeral. **S7** two ticks (f4305, f4320). **S8** a pop per diagram node (three pitches) under the pad swell, both from f4620. **S9** tail f5010 (90 frames: it ends on the last frame).
- **The silence is a rule, not a file.** `assertSfxRules` runs at import and throws when a cue starts in f2370-2399, when a cue that started earlier is still sounding on f2370 (glass-shatter is 29 frames: f2340-2368), when anything starts in S0's near-silence f285-299, or when a cue is off the timeline. It is exported for a check script. Also at import: the manifest must list exactly the files in `SFX_FILES`, and `tail.wav` must be exactly as long as the film's last 90 frames.
- Not in the BIBLE list, added on purpose: the S5 whip whoosh, the S3-to-S4 swing whoosh (patch 25 says that swing "keeps the same frames", so a cue was assumed), the click on the Attack Lab's Run and on the chain's Verify button, and key ticks for the hostile command. Delete the line in `build()` if you do not want one.

### `src/audio/FilmAudio.tsx` (the wiring)
One layer next to the Stage: every cue is `<Sequence from layout="none"><Audio/></Sequence>` (siblings of the visuals, so the global-frame convention is untouched).
- **music.mp3 (optional):** -18 dB, 1.5 s fade-in, -6 dB under `slam`, `sub-impact`, `thud`, `stamp` and `glass-shatter` (3 frames down, 12 held, 24 back), **0 on every frame of f2370-2399** (4 frames down before it, 6 back after), 2 s fade-out, and -9 dB under speech when `voice.wav` exists. One table of 5100 gains built at load: pure in the frame.
- **voice.wav (optional):** one full-length file from f0 at full level, aligned to `voiceBlocks`. The music duck under each block is a FIXED schedule: `block.start - 8` to `start + words x 60 / 150 x 30` frames, then 12 back.
- `copy.ts` `voiceBlocks` (V0-V9, BIBLE 8) is NOT part of `copy`. Check "three bugs" in V2 against the fixture before you record.

### Decisions and conventions future patches must follow
1. A retime of a scene moves its sound by itself; add a cue in `build()` from the scene's own export, never by typing the frame.
2. Add a new effect in `make-sfx.mjs` AND `SFX_FILES`, then `npm run sfx`: a manifest that disagrees with the list throws at import.
3. A new sound near f2370 must be over by f2369.

### Known issues
- `tsc --noEmit` clean; `sfx.ts` bundled with esbuild and loaded in Node (295 cues, `assertSfxRules` passes, and throws for a cue on f2380 and for a 29-frame whoosh on f2369).
- **Rendered and measured, not listened to.** Audio-only render of f2300-2460 (Remotion, system Chrome): f2370-2399 is exactly 0 (-180 dBFS) with and without a (synthetic) music.mp3; the music steps down before the silence and comes back on f2400; the loudest sample of the slice is -15 dBFS, no clipping. The levels in the render sit 3-4 dB under the files' own peaks, so the keys are about -28 dBFS and the glass-shatter -15 dBFS in the mix.
- **NOT verified:** the mix by ear, the Studio playing in sync (scrub it), the full 5100-frame render (only that slice was rendered), the loudness targets of BIBLE 9 (-16 LUFS voice, true peak -1.5 dB: `scripts/render.mjs` owns the loudness pass), and a real music or voice file (the music test used a sine).
- In the sample evidence there are two decoy reads and no egress lines after the injection, so S3 has two alarm blips and S5 no egress hits; a real capture adds them by itself.

## Patch 23 - Render pipeline, submission assets, README (one unified patch)

**Applies on top of** patch 22 (Audio) on repo head `2493dba` (patch 20 and patch 22 are both in; it was first written against `6fcdc72`). Replaces the four split parts (23a to 23d) and the split contract: nothing of the parallel machinery is added.
**Changed files:** `package.json` (the three scripts of this patch and the two dependencies; patch 22's `sfx:check` is kept), `package-lock.json` (the bundler and the renderer are now direct dependencies, pinned to 4.0.540 like the rest of Remotion), `src/Root.tsx` (a FINAL group, then a DEV ONLY group, comments only), `scripts/make-sheets.mjs` (also reads the PNG sequence), `README.md` (replaces the starter), **new:** `scripts/render.mjs`, `scripts/check-stills.mjs`, `scripts/make-submission-assets.mjs`, `scripts/submission/visual-assets.mjs`, `scripts/submission/text-assets.mjs`.

- `npm run render` (`scripts/render.mjs`): preflight (Node, ffmpeg, ffprobe, and the sound files through `make-sfx.mjs --check`), the evidence final check (refuses on sample or invalid evidence unless `--allow-sample`), the motion audit of patch 25, the bundle, the render through the Node API, two-pass loudnorm (I=-16, TP=-1.5, LRA=11; skipped with a message when the track is digital silence), `+faststart`, a verification of the file (h264, yuv420p, 1920x1080, 30 fps, aac, at most 180 s), the poster (frame 480) and the preview GIF (frames 2340-2519, 720 px, 15 fps, at most 8 MB, retried down a size ladder). `--4k`, `--frames` (PNG sequence), `--concurrency=N`, `--help`. Exit codes 0 / 1 (always with a `Fix:` line) / 2.
- `npm run check` (`scripts/check-stills.mjs`): the 25 default check frames into `out/stills/`, `--frames`, `--scale`, `--concurrency`.
- `npm run submission` (`scripts/make-submission-assets.mjs` with `scripts/submission/*`): `cover.png` (frame 480, unaltered), `slides-pack/` (7 stills), `captions.srt`, `voice-script.txt`, `SUBMISSION_FILM_NOTES.md`; refuses on sample evidence like `render`.

### What was corrected against the repo as it is now (the split parts were written before it)

- **Slide frames.** Checked by rendering them (all but 06 and 07, which were set after the rebase and not rendered): `01-containers` was f1665, where the last chip is still landing (it lands at f1672) -> **f1680**; `02-lattice` was f2520, where the lattice is already whole (the shards return over f2460-2505) -> **f2485**; `04-report` was f3955, which is the ledger-verify close-up -> **f3915**, the only frame where all nine cards are down and the camera is still on the grid. `03-hash-chain` (f3020) and `05-compare` (f4530) were right. `06-architecture` is now **f4786** and `07-limits` stays at **f4950**: S8 is built (patch 20), so both show the real scene instead of the Infra screen. The split contract's "move a frame by at most 20" rule is gone (these moves are 15, 35 and 40 frames); the reason for each frame is in the `SLIDES` list.
- **Colour.** `renderMedia` with JPEG frames produced `yuvj420p`, full range, tagged bt470bg, so the script's own verification failed. It now passes `colorSpace: "bt709"` and the file is yuv420p, limited range, bt709 (found by rendering; README's by-hand command has `--color-space=bt709`).
- **Concurrency.** A value above the core count made Remotion fail ("Maximum for --concurrency is 1"); it is now lowered to the core count with a message.
- **Motion audit.** `render` runs `tools/audit-motion.mjs` before bundling (patch 25 amendment) and prints its summary; it stops only if the film cannot load.
- **Captions.** The SRT uses the frames the scenes really use where they moved a cue: `s2.calloutCheck` f1215 and `s2.calloutAudit` f1266 (S2c), `s7.line` f4275 (S7); read from the scene sources, ignored if more than 30 frames from the nominal cue. Other cues use `CUES`.
- **Notes table.** The S5 blocked host is marked optional (the film draws it only when the ledger has the event), so it no longer raises a false warning.
- **Dependencies.** `@remotion/bundler` and `@remotion/renderer` were only transitive; `package.json` and `package-lock.json` now list them (without the lock change `npm ci` would refuse).
- **README.** Rewritten for the repo as it is: no `tools/merge-notes.mjs` (it does not exist), `npm run sfx` and `npm run sfx:check` documented, `npm run motion` and `npm run sheets` documented, the check and slide frames listed.

### Verification

- `npx tsc --noEmit` clean; `npm ci` consistent with the lock file.
- With a headless Chromium: `check-stills` (25 of 25), `visual-assets` and `text-assets` through `npm run submission -- --allow-sample` (cover, 7 slides, 31 caption cues, 43 note rows), the refusal without `--allow-sample` (exit 1), unknown flags (exit 2).
- A real render of frames 2300-2540 with a synthetic tone: 1920x1080 h264 yuv420p, loudness -16.1 LUFS, verification, poster and a 5.2 MB GIF all passed.
- **NOT verified:** the whole 5100-frame render and the 4K render (hours on the test machine), a render with the real sound effects (not run again after the rebase onto patch 22), Windows paths, and the real evidence (only the sample was available).
- **Rebased onto patch 22 (the changes made for that, none of them in the split parts):** (1) `render` preflight now runs `make-sfx.mjs --check` and stops with `Fix: npm run sfx` when a sound file is missing or stale, because patch 22 commits `public/audio/manifest.json` but not the WAVs, so a manifest on disk no longer means the sounds exist (before, `render` only warned about a missing manifest). (2) Slides 06 and 07 and the README no longer say S8 is a stub. (3) `text-assets.mjs` already reads `voiceBlocks` from `copy.ts` (patch 22 added the export), so the voice script no longer falls back to `docs/bible/bible-08.md`. (4) `PATCH_NOTES.md` is the one file both patches edit at the same place; this section sits after patch 22's.
- **Rebase checks:** patch 22 then patch 23 applies cleanly on `2493dba` (the notes hunk was merged by hand); `npm ci` ok; `npx tsc --noEmit` clean; `npm run sfx:check` ok after `npm run sfx`. **No browser was available for the rebase, so nothing was rendered**: the f4786 choice for slide 06 comes from reading S8's timing and easing, not from a frame, so open it in the Studio before submitting.
- Warnings that remain and are NOT bugs of this patch: the voice-over blocks V0, V5, V7 and V9 run 0.5, 1.2, 0.4 and 0.7 s over their slots at 150 words per minute (the words or the slots need a decision); `meta.baseUrl` is empty in the sample evidence, so the S9 demo host row is missing from the sample film; `docs/notes/patch-21a.md` and `patch-21b.md` are still waiting for the merge into this file.

---

## PATCH 26 - Real-repo alignment (applied directly) and marketing pass (prompt in docs/patches/patch-26.md)

**What changed, with no AI session needed**
- Every plan, script and prompt now points at the real product, https://github.com/shaikh-dotcom/MiniLocker, not `Unavailable4u/draft`
  (README, docs/guide, docs/bible, docs/patches and prompts, scripts/fetch-assets.mjs, scripts/capture-evidence.mjs, tools/make-prompt.mjs,
  tools/sample/assemble.py). `tools/make-prompt.mjs` takes `--repo <path>`; `--draft` still works as an alias.
- `copy.urls.repo` is the real repository; `copy.urls.demo` is `https://minilocker.duckdns.org`.
- The Vultr plan is optional: the real VM's metadata service returns none, so S8 and DevGfxC show the region (and hostname on the dev sheet) and
  `validate-evidence.mjs` warns instead of failing.
- Wording: the Attack Lab is scripted, so `s4.captionWorks` is "Real work. Snapshot after every step." and V4 says "A command wipes the entire
  workspace." The S0 tag is "WHAT AN UNCONSTRAINED AGENT COULD DO".
- Deadline and schedule in README and docs/guide: working deadline Sunday Nov 8, 6 PM Bangladesh time (12:00 UTC); hard limit about 4 AM Nov 9.
- New: docs/notes/real-repo-facts.md (what exists in the product and what must never appear on screen).

**Still to do: patch 26 prompt** (S8 inference chip with the bake-off line, S8 storage chip with host and bucket, S4/S5 wording audit, S9/S6 check).
Run `node tools/make-prompt.mjs 26 --repo ../MiniLocker` and paste the result into a new AI session.

**Warnings**
- `src/data/evidence.json` in git is still the SAMPLE file. Evidence captured before Object Storage was wired (product commit `be6ea6b`) shows
  `storage.vultr: false`, and S8 refuses to draw the chip: re-capture in that case.

## PATCH 24 + 25 amendment - QA pass on the real evidence (report in docs/QA_REPORT.md)

**Why:** the first `npm run motion` against the real capture (not the sample) threw at import time in three scenes, so no frame could render.

**Files changed:** `src/scenes/s2/S2b.tsx`, `src/scenes/s4/data.ts`, `src/data/select.ts`, `src/scenes/s3/S3Box.tsx`, `src/scenes/s3/S3c.tsx`, `src/dev/DevGfxA.tsx`, `src/scenes/s5/data.ts` (clearer error only), `scripts/capture-evidence.mjs`; created `docs/QA_REPORT.md`.

**PUBLIC API:** `containerChips(template): readonly string[]` (`src/data/select.ts`): the six S3 chips, numbers read from `sandbox.created.hardening`, throws on contradiction.

**Decisions:** S2b first-output move is clamped after the form exit; the S2b chip check needs one pulse while drawn; `outputToken()` skips `[OPERATOR NOTICE:` lines; `capture-evidence.mjs` keeps a `[UNTRUSTED WEB CONTENT` tool.result whole (cap 6000).

**Known issues / not verified:** S5 still throws on the real evidence (wrapper format differs, capture had trimmed it): re-run `npm run evidence`, then adapt the fence parsing. `evidence:final-check` fails on 13 nulls in `evidence/measured.json`. Nothing rendered; legibility, colors and beat alignment unverified.


---

## PATCH 27 - New opening, swappable stage background, clean S3 exit, public-facing S7 wording

**What changed**
- **S0 opening (f0-299, `src/scenes/S0Hook.tsx`, `copy.s0`).** The single page-and-terminal card is gone. Six agent screens (3 x 2) rise under the line
  "Six agents. Six ordinary tasks.", each types a task and one command, and they fail one by one on the four beats f105 / f120 / f135 / f150 (same
  `slam` sounds as before) with a verdict chip. The glitch (f165-177) drops the screens to 30 % opacity and 2 px blur, and the caption lands ON TOP of them
  (f180 / f210). The screens leave f248-272 and the caption is still drawn into the dot at f270-285, so S1 starts exactly as before.
  Kept untouched because other files read them: `S0_CAMERA`, `S0_CURSOR`, `HOOK_DOT`, `S0_TIMING.hits`, `S0_TIMING.glitch`. Removed: the page card, the
  scan spotlight, the typed agent line and the hidden-text block (`S0_TIMING.scan / hidden / agentLine / pageRise`, `S0_TYPING_END` is now an array, one entry per screen).
- **Stage background.** `src/config/background.ts` + `src/fx/StageBackground.tsx` + `public/backgrounds/stage.png`. The film (MiniLockerFilm.tsx) and S0
  both draw it; the red grid floor of S1 / S9 is no longer drawn (`GridPaper` and `gridOpacity` stay in the repo, unused). To swap it: overwrite
  `public/backgrounds/stage.png`, or change `STAGE_BACKGROUND.src`; `src: null` brings back the old graphite gradient with the crimson glow. `position`,
  `dim`, `blurPx` and `drift` are in the same file. The supplied picture is portrait 736 x 1288: it is cropped to 16:9 and upscaled about 2.6 x, so a
  landscape picture of 1920 x 1080 or more will render sharper.
- **S3 explainer exit (`src/scenes/s3/shared.tsx`, `S3Box.tsx`, `S3c.tsx`).** The box is no longer shrunk to 44 % and dragged left (`S3_PULLBACK`, `S3_TIMING.pullback`
  are gone). The seal ring now closes at full size f1984-2004, and the box dissolves in place f2004-2022 (fade, 3 % swell, 10 px blur) as the app comes back
  (the scrim leaves f2004-2018 and the camera goes to the Blast panel from f2004). f2004 is 1:06.8. `s3BoxPose` now also returns `blurPx`.
- **S7 wording (`copy.s7.line`, voice block V7).** "The reviewer's first question: ..." became "Before you trust an AI agent, ask: what could it touch, and how would you
  know?", said to the viewer. V7 says the same. The scene still splits the line after the colon and underlines "know?".

**Checked:** `npx tsc --noEmit` clean; `npm run sfx:check` ok (no sound moved); stills of f40, f110, f200, f235, f262, f292, f480, f1990, f2010, f2024, f4345 and f5060 rendered and looked at.

**Not verified / known issues**
- Not rendered as a film: only stills, on a scratch copy where `s5Data()` was stubbed, because **S5 still throws at import on the committed evidence** (the wrapper-format problem listed in the QA amendment above). That is not caused by this patch and is not fixed by it.
- The V0 voice-over (f20) still says "One hostile page, one poisoned package ...": it matches the new screens, but re-check its length against the new beats when you record.
- `drift` zooms the background 5 % over the whole film; on the small picture this adds a little softness at the end. Set `drift: 0` for a static background.
