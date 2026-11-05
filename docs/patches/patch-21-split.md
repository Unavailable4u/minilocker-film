### PATCH 21 (split) - S9 Outro in two parallel parts: 21a + 21b (f4980-5099)

Patch 21 is small in frames (120) but it has two independent halves, so it is built as **21-0 (the contract, already applied) + 21a + 21b**. Two sessions can work at the same time and the files they return never touch each other. A third part would only add seams: S9 is one card.

**Base:** repo head `76ebf7e` + patch 21-0 (the scaffold in this package: `patch-21-split.diff`). Apply 21-0 FIRST, then give BOTH models the same repo state.

| Part | You paste it into | Replaces | Frames | Draws |
|---|---|---|---|---|
| 21-0 | (done) | `S9Outro.tsx`, `stageState.ts`, new `s9/shared.ts`, stubs `s9/S9a.tsx` `s9/S9b.tsx` | all | the contract, the camera, the app fade-out |
| **21a** | model A | `src/scenes/s9/S9a.tsx` | f4980-5099 (top half) | dial reform, collapse into the Mark (beats f4995, f5010), "MiniLocker" f5010, tagline f5025, the Mark's breathing glow |
| **21b** | model B | `src/scenes/s9/S9b.tsx` | f5040-5099 (bottom half) | hairline, demo host, repo URL, "MIT licensed" + "Built on Vultr" + logo, the clean hold |

Each part returns 2 files (its scene file and `docs/notes/patch-21x.md`). **Neither returns `docs/PATCH_NOTES.md`** (two parallel patches would overwrite each other).

## The contract in one screen (the full text is `src/scenes/s9/shared.ts`)

End card at f5070-5099 (stage 1920 x 1080, everything centred, safe margin 96, bottom 984):

| Row | top / h | Owner | Content |
|---|---|---|---|
| Mark | cy 262, size 300 (dial 320) | 21a | the full Mark, crimson core, breathing glow |
| Title | 438 / 130 | 21a | MiniLocker, CMU Serif 700, 124 px |
| Tagline | 596 / 56 | 21a | `copy.s9.line`, 44 px, ink-2, one line |
| Hairline | y 700, 240 wide | 21b | 2 px, ink-3 |
| Demo host | 744 / 52 | 21b | host of `evidence.meta.baseUrl`, mono 40 |
| Repo URL | 812 / 40 | 21b | `copy.urls.repo`, mono 30, ink-2 |
| Legal | 896 / 48 | 21b | MIT licensed . Built on Vultr + logo (40 px high) |

| Beat | Frame | Part |
|---|---|---|
| app fades out (`appReveal`), grid in | f4980-5004 / f4980-5000 | 21-0 / existing |
| dial arcs sweep in, FORMED | f4980-4995 | 21a |
| dial collapses into the Mark, LANDED + impact + glow starts | f4995-5010 | 21a |
| "MiniLocker" | f5010 | 21a |
| tagline | f5025 (settled f5051) | 21a |
| hairline + demo host | f5040 | 21b |
| repo URL, legal row | f5055, f5057 | 21b |
| quiet block settled | f5069 | 21b |
| CLEAN HOLD: only the glow breathing and the camera move | f5070-5099 | none |

Decisions made for you (change one only in `shared.ts`, before either part starts):
1. The end state is the **full Mark**, not the dial. The dial reforms from real evidence (`dialDims(gaugesOf(selectTask().events))`, no labels, no verdict word) and collapses into it. `Mark mode="collapse"` is NOT used (it ends as a bare dot).
2. The demo row shows **only** `evidence.meta.baseUrl`'s host. On the SAMPLE (empty) the row is blank and a warning is logged; `npm run evidence:final-check` already refuses an empty baseUrl on a real capture. `copy.urls.demo` is not used.
3. **Camera** (patch 25 amendment) lives in `S9Outro.tsx`, identical for both parts: move 1 the pull-back into the wide tilt (8 / -6 deg, within the 14 deg S9 limit) f4980-5010 while the window falls away; move 2 the slow 4 % push f5010-5099. Two moves, as allowed. After f5004 the app is gone, so the camera carries nothing visible (the audit reads keyframes).
4. No caption in S9. No fade to black. The only crimson is the Mark's core, its glow and "Locker".
5. Assumption about patch 20 (S8): S8's overlay unmounts at the cut f4980. If S8's last frames still hold the LimitsCard, the cut is S8's job to soften; S9 works the same either way.

---

### PATCH 21a - S9 Outro, part A: collapse, lockup, tagline (f4980-5099, top half)

**Needs:** 12, 21-0
**Paste existing:** `docs/PATCH_NOTES.md` (with the 21-0 section), `src/scenes/s9/shared.ts`, `src/scenes/s9/S9a.tsx` (stub), `src/scenes/S9Outro.tsx`, `src/scenes/stageState.ts`, `src/scenes/S1Title.tsx`, `src/ui/Mark.tsx`, `src/ui/RadiusDial.tsx`, `src/ui/BlastPanel.tsx` (only `dialDims`), `src/lib/gauges.ts`, `src/data/select.ts`, `src/fx/KineticText.tsx`, `src/fx/util.ts`, `src/config/theme.ts`, `src/config/copy.ts`
**Attach from BIBLE:** section 6 (S9), section 4.3 (Mark and dial), section 8
**Prompt file:** `docs/patches/prompts/patch-21a.prompt.txt`

```
PATCH 21a - Scene S9 Outro, part A: the collapse, the lockup, the tagline. Replace src/scenes/s9/S9a.tsx completely. Also create docs/notes/patch-21a.md (your notes, in the style of docs/PATCH_NOTES.md: Changed files, What it contains, Seams with 21b, Known issues). Export `S9a: React.FC<SceneOverlayProps>` and `S9A_CUE_ANCHORS` (the frames patch 22 reads: formed 4995, markLanded 5010, lockup 5010, tagline 5025).

You own: the dial, the Mark, "MiniLocker", the tagline, the Mark's glow, f4980-5099. Everything is a pure function of the GLOBAL frame.

- f4980-4995 THE DIAL REFORMS on the cleared stage (the window is still fading out behind it until f5004; the dial is in front). RadiusDial at size S9_LAYOUT.dial.size, centred at (S9_LAYOUT.cx, S9_LAYOUT.dial.cy). dims = dialDims(gaugesOf(selectTask().events, false)) computed ONCE at module level: the dial is the real final dial of the film's main task (same function the Blast panel uses), never forced to "clean". showLabels = 0 and centerOpacity = 0 for the whole scene (no labels, no verdict word, no numbers). Its five arcs sweep in outermost first, 2 f apart, 7 f each (the fifth arc is complete at f4995); `draw` per arc, state from the evidence. The crimson core dot (r 2.2 of the Mark's 32 box, scaled to the Mark's size) grows at the centre f4984-4995 with easeOutBack. FORMED, ON THE BEAT f4995.
- f4995-5010 THE DIAL COLLAPSES INTO THE MARK (reverse of S1, see S1Title.tsx: markOut and the arc sweep). The five arcs drain, outermost first, starting 2 f apart from f4995, 8 f each (done by f5007), their `draw` going 1 -> 0 (state stays the evidence's). At the same time the finished Mark (<Mark mode="static" size={S9_LAYOUT.mark.size}>, same centre) comes IN: opacity 0 -> 1 and scale 1.2 -> 1 over f4995-5010 (the exact reverse of S1's markOut: `scale(1 + 0.2 * out)`, `opacity 1 - out`). DO NOT use Mark mode="collapse": it ends as a bare dot, and the end state here is the full Mark. The Mark is complete ON THE BEAT f5010.
- f5010 IMPACT. The Mark punches (scale 1 + 0.05 * exp(-(f - 5010) / 6)) and one thin crimson shock ring leaves its centre (S1's `Shock`: r0 150, r1 700, 30 f, strength 0.3; copy the recipe, S1Title does not export it). The glow starts: a soft crimson radial wash behind the Mark (radius about 260 px, alpha about 0.18) and the core's drop shadow, BOTH multiplied by s9Breath(frame) from s9/shared.ts. That is the "dial glow breathing very slowly" of the last 30 frames: it must be the only thing alive from f5070.
- f5010 "MiniLocker": copy.ui.wordmark.lead + copy.ui.wordmark.tail (the tail in theme.accentInk, as S1's lockup), CMU Serif 700, fontSize S9_LAYOUT.title.fontSize, one line, top S9_LAYOUT.title.top, masked rise over 22 f (S1Title's `Title` is the pattern). It is settled at f5032.
- f5025 the tagline: <KineticText text={copy.s9.line} startFrame={S9_TIMING.tagline} fontSize={S9_LAYOUT.tagline.fontSize} color={theme.ink2} align="center" stagger={2} riseFrames={14}/>, ONE line, top S9_LAYOUT.tagline.top. No highlight and no underline: the only crimson on the card is the Mark's core, its glow and "Locker". The last word has landed by f5051 (7 words: 5025 + 6 x 2 + 14).
- Nothing of yours is drawn at or below S9_LAYOUT.rule.y (the hairline of 21b), nor outside [safeX, 1920 - safeX]; the dial's outer ticks (118/120 of its half-size) stay inside the safe margin; the glow wash is clipped by the stage, never by a box.

Import-time checks to write: every beat above on a multiple of 15 (onBeat); reform < collapse < lockup < tagline in order and inside f4980-5099; the dial's top (dial.cy - 118/120 * size / 2) >= safeX; the title's estimated width (estimateWidth in src/fx/util.ts) fits 1920 - 2 * safeX; title bottom (top + h) <= tagline.top; tagline bottom < rule.y; selectTask() yields five measured-or-not dims (throw if a gauge is missing); the tagline's last word lands by f5051.

CHECK: npx tsc --noEmit ; npm run motion (paste the S9 line and any new STILL/FAST/BACKDROP/DEEP) ; stills of YOUR half at f4990, f5000, f5008, f5020, f5035 (top 60 % of the frame; the lower rows are 21b's and are empty until it is merged) and f5099 (the Mark, the title, the tagline, the glow at its breathing peak or trough).

------------------------------------------------------------
CONTRACT AND RULES (same text in 21a and 21b)
------------------------------------------------------------
You are one of TWO authors building patch 21 (Scene S9 Outro, f4980-5099) IN PARALLEL with another model. The repo already has the split contract applied (patch 21-0: see its section at the end of docs/PATCH_NOTES.md and the files src/scenes/s9/shared.ts, src/scenes/S9Outro.tsx, src/scenes/stageState.ts). Your result and the other part's result are merged without edits, so obey the contract exactly.

THE CONTRACT (read src/scenes/s9/shared.ts first; it is authoritative)
- NEVER edit: src/scenes/s9/shared.ts, src/scenes/S9Outro.tsx, src/scenes/stageState.ts, src/config/*.ts, src/scenes/index.ts, MiniLockerFilm.tsx. If you think one of them must change, do NOT change it: say so under "Warnings" in your notes.
- You return TWO files, complete: your scene file, and your notes file. Do NOT return docs/PATCH_NOTES.md (two parallel patches would overwrite each other); the merge step appends the notes.
- Every frame number and every rectangle comes from S9_TIMING / S9_LAYOUT (import them). You may define extra constants for things only you draw, but never a second copy of a contract value.
- The end card, top to bottom, centred: Mark -> "MiniLocker" -> tagline (part 21a) | hairline -> demo host -> repo URL -> "MIT licensed" + "Built on Vultr" + logo (part 21b). The two parts share no pixels: 21a draws only above S9_LAYOUT.rule.y, 21b only at or below it.
- The camera is done (S9_CAMERA in S9Outro.tsx: pull-back f4980-5010, slow push to f5099). The app is gone from f5004 (stageState.appReveal). From f5005 the stage is bare: gradient, glow, grid paper. Your overlay is stage space (1920 x 1080), `position: absolute`, NO opaque background, NO backdrop-filter, NO CSS filter blur (motion rule 5).
- S9 has NO caption (BIBLE 6). Do not use <Caption>.
- Everything that appears lands on a multiple of 15 (a beat) where the contract says so. Motion uses the signature ease (src/lib/ease.ts) except linear for creeps.
- NO NEW STRINGS: every word on screen comes from src/config/copy.ts (copy.s9.line, copy.ui.wordmark, copy.brand, copy.urls) or from evidence through src/data/select.ts. No typed hosts, numbers or names.
- The clean hold: from f5070 (S9_TIMING.hold) to f5099 nothing appears or moves except the Mark's breathing glow (s9Breath, owned by 21a) and the camera. No fade to black, ever.
- Import-time checks: your file THROWS at import, with the numbers, when one of its own beats is off a beat, outside its frame range, outside S9_LAYOUT, overlapping another row, or outside the safe margin (S9_LAYOUT.safeX, S9_LAYOUT.bottom). The other part's checks are theirs.
- You cannot render. Check with `npx tsc --noEmit` and `npm run motion` and say what you could not verify. Do not claim a still looks right if you did not look at one.
```

---

### PATCH 21b - S9 Outro, part B: the quiet block and the clean hold (f5040-5099, bottom half)

**Needs:** 12, 21-0
**Paste existing:** `docs/PATCH_NOTES.md` (with the 21-0 section), `src/scenes/s9/shared.ts`, `src/scenes/s9/S9b.tsx` (stub), `src/scenes/S9Outro.tsx`, `src/scenes/S1Title.tsx` (only the `Title` masked rise), `src/ui/VultrLogo.tsx`, `src/data/select.ts` (only `selectMeta`), `src/data/types.ts` (only `EvidenceMeta`), `src/fx/util.ts`, `src/config/theme.ts`, `src/config/copy.ts`
**Attach from BIBLE:** section 6 (S9), section 7.1 (evidence meta), section 8
**Prompt file:** `docs/patches/prompts/patch-21b.prompt.txt`

```
PATCH 21b - Scene S9 Outro, part B: the quiet block and the clean hold. Replace src/scenes/s9/S9b.tsx completely. Also create docs/notes/patch-21b.md (your notes, in the style of docs/PATCH_NOTES.md: Changed files, What it contains, Seams with 21a, Known issues). Export `S9b: React.FC<SceneOverlayProps>` and `S9B_CUE_ANCHORS` (the frames patch 22 reads: rule 5040, demo 5040, repo 5055, legal 5057, settled 5069).

You own: everything at or below S9_LAYOUT.rule.y, f5040-5099. Everything is a pure function of the GLOBAL frame. The other model builds the dial, the Mark, "MiniLocker" and the tagline above you; until it is merged the top of your stills is empty, that is expected.

- f5040 THE HAIRLINE: a 2 px line, S9_LAYOUT.rule.w wide, centred at (cx, rule.y), colour theme.ink3 at 50 % alpha, drawn from the centre outward (scaleX 0 -> 1, signature, 12 f: f5040-5052).
- f5040 THE DEMO HOST (row S9_LAYOUT.demo): the HOST of selectMeta().baseUrl (evidence.meta.baseUrl), CMU Typewriter (fonts.mono), fontSize demo.fontSize, theme.ink, centred. Host only: parse with `new URL(baseUrl).host` inside a try/catch; if that fails strip the protocol and everything from the first "/" by hand. Not copy.urls.demo (it is empty on purpose and must never be a second source). If baseUrl is "" (the SAMPLE evidence): draw NOTHING in this row, `console.warn` ONCE (module flag, like VultrLogo's warnOnce) saying the demo row is not drawn because evidence.meta.baseUrl is empty; the other rows do NOT move up (every row has a fixed top). `npm run evidence:final-check` already refuses an empty baseUrl on a real capture, so the final render always has it.
- f5055 THE REPO URL (row S9_LAYOUT.repo): copy.urls.repo exactly as written (with "https://"), CMU Typewriter, repo.fontSize, theme.ink2, centred.
- f5057 THE LEGAL ROW (row S9_LAYOUT.legal), one centred flex line: copy.brand.license ("MIT licensed"), a 6 px round separator in theme.ink3 (a circle, not a typed character), copy.brand.builtOn ("Built on Vultr"), then <VultrLogo height={legal.logoHeight}/> with an 18 px gap. Text CMU Serif, legal.fontSize, theme.ink3. VultrLogo draws the official logo from public/brand/ (already installed); when `hasVultrLogo` is false it would draw a text wordmark and the row would read "Built on Vultr Vultr", so in that case draw copy.brand.builtOn without the logo. Vertically centre the text on the logo.
- Reveal of each row: a masked rise (S1Title's `Title` is the pattern: an overflow hidden box, translateY from 108 % to 0, signature ease) over S9_TIMING.revealFrames (12 f). Demo from S9_TIMING.demo, repo from S9_TIMING.repo, legal from S9_TIMING.legal. Everything is settled by S9_TIMING.settled (f5069). Nothing else: no glow, no shadow, no shock ring, no counter. Quiet means the Mark's breathing is the only thing alive.
- f5070-5099 THE CLEAN HOLD: your layers are frozen: no animation depends on a frame after f5069. (The camera's push and the Mark's glow, which are not yours, move.) NO fade to black, no fade out of any kind.

Import-time checks to write: the demo, repo and legal starts are the contract's frames and demo + revealFrames <= repo, legal + revealFrames <= settled <= hold - 1; each row sits inside [rule.y, bottom] and the rows do not overlap each other (top + h <= next top); each row's estimated width (estimateWidth in src/fx/util.ts, mono advance for the two URL rows, SERIF_ADVANCE for the legal row, the logo's width counted as 2.2 x its height) fits 1920 - 2 * safeX; the repo URL is not empty.

CHECK: npx tsc --noEmit ; npm run motion (paste the S9 line and any new STILL/FAST/BACKDROP/DEEP) ; stills of YOUR half at f5040, f5048, f5060, f5075, f5099 (bottom 40 % of the frame: hairline, demo host, repo URL, legal row with the logo, all clear of the bottom margin) ; and one still of the SAMPLE evidence (baseUrl "") to show the demo row is empty and the other rows are in place.

------------------------------------------------------------
CONTRACT AND RULES (same text in 21a and 21b)
------------------------------------------------------------
You are one of TWO authors building patch 21 (Scene S9 Outro, f4980-5099) IN PARALLEL with another model. The repo already has the split contract applied (patch 21-0: see its section at the end of docs/PATCH_NOTES.md and the files src/scenes/s9/shared.ts, src/scenes/S9Outro.tsx, src/scenes/stageState.ts). Your result and the other part's result are merged without edits, so obey the contract exactly.

THE CONTRACT (read src/scenes/s9/shared.ts first; it is authoritative)
- NEVER edit: src/scenes/s9/shared.ts, src/scenes/S9Outro.tsx, src/scenes/stageState.ts, src/config/*.ts, src/scenes/index.ts, MiniLockerFilm.tsx. If you think one of them must change, do NOT change it: say so under "Warnings" in your notes.
- You return TWO files, complete: your scene file, and your notes file. Do NOT return docs/PATCH_NOTES.md (two parallel patches would overwrite each other); the merge step appends the notes.
- Every frame number and every rectangle comes from S9_TIMING / S9_LAYOUT (import them). You may define extra constants for things only you draw, but never a second copy of a contract value.
- The end card, top to bottom, centred: Mark -> "MiniLocker" -> tagline (part 21a) | hairline -> demo host -> repo URL -> "MIT licensed" + "Built on Vultr" + logo (part 21b). The two parts share no pixels: 21a draws only above S9_LAYOUT.rule.y, 21b only at or below it.
- The camera is done (S9_CAMERA in S9Outro.tsx: pull-back f4980-5010, slow push to f5099). The app is gone from f5004 (stageState.appReveal). From f5005 the stage is bare: gradient, glow, grid paper. Your overlay is stage space (1920 x 1080), `position: absolute`, NO opaque background, NO backdrop-filter, NO CSS filter blur (motion rule 5).
- S9 has NO caption (BIBLE 6). Do not use <Caption>.
- Everything that appears lands on a multiple of 15 (a beat) where the contract says so. Motion uses the signature ease (src/lib/ease.ts) except linear for creeps.
- NO NEW STRINGS: every word on screen comes from src/config/copy.ts (copy.s9.line, copy.ui.wordmark, copy.brand, copy.urls) or from evidence through src/data/select.ts. No typed hosts, numbers or names.
- The clean hold: from f5070 (S9_TIMING.hold) to f5099 nothing appears or moves except the Mark's breathing glow (s9Breath, owned by 21a) and the camera. No fade to black, ever.
- Import-time checks: your file THROWS at import, with the numbers, when one of its own beats is off a beat, outside its frame range, outside S9_LAYOUT, overlapping another row, or outside the safe margin (S9_LAYOUT.safeX, S9_LAYOUT.bottom). The other part's checks are theirs.
- You cannot render. Check with `npx tsc --noEmit` and `npm run motion` and say what you could not verify. Do not claim a still looks right if you did not look at one.
```

---

## Merge (after BOTH parts are back; the order does not matter, the files are disjoint)

1. Copy `src/scenes/s9/S9a.tsx` and `docs/notes/patch-21a.md` from 21a; `src/scenes/s9/S9b.tsx` and `docs/notes/patch-21b.md` from 21b.
2. `npx tsc --noEmit` and `npm run motion` (S9 must not be a STILL; no BACKDROP).
3. Stills at **f4990, f5000, f5010, f5020, f5050, f5075, f5099** (the patch-21 list plus the two beats). Then `npm run sheets -- --from 4980 --to 5099 --every 4` and look at the sheets.
4. Seam checklist: tagline bottom (y 652) is clear of the hairline (y 700); both halves use the same centre (x 960); the Mark's wash does not reach y 700; nothing in f5070-5099 moves except the glow; the last frame is a clean, thumbnail-worthy card; no fade to black.
5. Append the notes once: `node -e "const fs=require('fs');fs.appendFileSync('docs/PATCH_NOTES.md','\n'+fs.readFileSync('docs/notes/patch-21a.md','utf8')+'\n'+fs.readFileSync('docs/notes/patch-21b.md','utf8'))"` then delete `docs/notes/`.
6. If the halves disagree (a seam, a spacing), change the number in `src/scenes/s9/shared.ts` only, and tell the part that reads it. Never move a row inside a part file.

**Patch 25 amendment (motion):** already applied by the contract (`S9_CAMERA` in `S9Outro.tsx`). Parts must not add camera keyframes.
