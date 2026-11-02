### PATCH 00 - Scaffold, config, core math

**Needs:** nothing
**Paste existing:** nothing
**Paste reference:** nothing
**Attach from BIBLE:** sections 2, 3, 4 (tokens only), 5

```
PATCH 00 - Scaffold, config and core math.

GOAL: a clean, compiling Remotion project that opens in the Studio with the two correct empty compositions, plus every config file and core math helper later patches depend on.

CREATE (complete files):
- package.json: Node 20, deps remotion + @remotion/cli (4.x, same exact version), react 18, react-dom 18, typescript, @types/react, @types/node. No Tailwind. Scripts: studio, assets (node scripts/fetch-assets.mjs), evidence (node scripts/capture-evidence.mjs), evidence:check (node scripts/validate-evidence.mjs), evidence:final-check (node scripts/validate-evidence.mjs --final), proof (node scripts/check-proof.mjs), sfx (node scripts/make-sfx.mjs), check (node scripts/check-stills.mjs), render (node scripts/render.mjs), render:4k, render:frames, submission (node scripts/make-submission-assets.mjs). Scripts that point to files made in later patches are fine; add one line in PATCH_NOTES saying they are not runnable yet.
- tsconfig.json (strict, resolveJsonModule on), remotion.config.ts (pixel format yuv420p, jpeg quality high, overwrite output).
- src/index.ts and src/Root.tsx registering: MiniLockerFilm (1920x1080, 30 fps, 5100 frames) and MiniLockerFilm-Preview (960x540, same timeline). Both render src/MiniLockerFilm.tsx, a temporary component showing only the stage background gradient (#08080b to #121216) and the current frame number plus the scene name in a corner (clearly marked temporary).
- src/config/theme.ts: every color in BIBLE section 4 as typed constants (paper, sheet, raised, sunken, rule, rule2, ink, ink2, ink3, accent, accentInk, accent2, ok + okWash + the three-stop ok gradient, bad + badWash, warn + warnWash, info + infoWash, termBg, termFg), font stacks ("CMU Serif", "CMU Typewriter Text" with fallbacks), plus the hatching background for flagged things. Also src/ui/theme.css with the :root variables, body base, and the .smcp (all-small-caps, letter-spacing .08em, weight 500) and .display (weight 700, letter-spacing -.012em, line-height 1.04) rules translated from the source's index.css.
- src/config/timeline.ts: FPS=30, BEAT=15, BAR=60, TOTAL=5100; helpers sec(s), beat(n), bar(n), f(n); a SCENES object with start/end/duration for S0..S9 from the context header; logical UI size 1600x900 and stage size 1920x1080.
- src/config/copy.ts: ALL static on-screen text from BIBLE section 8 (captions, headline, eyebrow, callouts, closing lines, limits lines, URL/repo constants as plain strings that the user edits). It must NOT contain any measured value (those come from evidence, rule 8). Export typed groups per scene.
- src/lib/ease.ts: signature cubic-bezier(0.65,0,0.35,1) as an Easing function plus clamp01, mapRange, easeInOut, easeOutBack, overshoot, stepPulse(frame, start, len).
- src/lib/spring.ts: four named spring presets (uiPop, panel, camera, settle) and spr(frame, fps, startFrame, preset) returning 0..1.
- src/lib/prng.ts: mulberry32 PRNG, rand(seed), randRange, hashStringToSeed.
- src/lib/fonts.ts: loads the CMU fonts from public/fonts through FontFace with delayRender/continueRender; exports <FontsReady/> or a loader hook; fallback stacks. If the files are missing, fall back to Georgia/ui-monospace and log ONE clear warning telling me to run npm run assets.
- docs/PATCH_NOTES.md: create it with a short header and the first entry.

CONSTRAINTS: no CSS animations; everything pure and typed; small and boring code. Later patches use these exact names, so list them in PATCH_NOTES.

CHECK: npm install ; npx tsc --noEmit ; npm run studio opens with both compositions, 5100 frames, graphite stage visible, no console errors.
```
