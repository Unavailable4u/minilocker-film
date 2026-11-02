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
