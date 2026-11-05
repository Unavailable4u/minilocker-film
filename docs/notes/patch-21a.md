## Patch 21a - S9 Outro, part A: collapse, lockup, tagline (f4980-5099, top half)

**Applies on top of** repo head `5ea5372` (patch 21-0 applied). **Does not touch** `shared.ts`, `S9Outro.tsx`, `stageState.ts`, `src/config/*`, `MiniLockerFilm.tsx`.
**Changed files:** `src/scenes/s9/S9a.tsx` (the stub, replaced completely), **new:** `docs/notes/patch-21a.md` (this file; the merge step appends it to `docs/PATCH_NOTES.md` and deletes `docs/notes/`).

### What it contains

- Exports `S9a: React.FC<SceneOverlayProps>` and `S9A_CUE_ANCHORS` (`formed` 4995, `markLanded` 5010, `lockup` 5010, `tagline` 5025, all read from `S9_TIMING`).
- **Dial reforms** (f4980-4995): `RadiusDial` at `S9_LAYOUT.dial.size`, centre (cx, `dial.cy`), from `dialDims(gaugesOf(selectTask().events, false))` computed once at module level (the real final dial of the main task, never forced to clean). `showLabels` 0, `centerOpacity` 0, no verdict word, no numbers (`value` is cleared). Arcs sweep in outermost first, 2 f apart, 7 f each; the fifth is whole at f4995. The ticks fade in over f4980-4986.
- **Core** (f4984-4995): the crimson dot (r 2.2 of the Mark's 32 box, with its r 4.4 wash disc) grows at the centre with `easeOutBack`.
- **Collapse into the Mark** (f4995-5010): the arcs drain outermost first (8 f each, `draw` 1 -> 0, state from the evidence); at the same time the finished Mark (`<Mark mode="static">`, not "collapse") comes in with opacity 0 -> 1 and scale 1.2 -> 1 (S1's `markOut`, reversed). The dial's ticks fade out f5002-5008.
- **Impact** (f5010): the Mark punches `1 + 0.05 * exp(-(f - 5010) / 6)`; one thin crimson ring leaves its centre (S1's `Shock` recipe: r 150 -> 700, 30 f, strength 0.3); the glow starts: a radial wash behind the Mark (radius 260 px, alpha 0.18, no box edge: the gradient is 0 at its own radius) and the core's drop shadow, both multiplied by `s9Breath(frame)`. They fade in over 15 f from f5010 so nothing pops.
- **"MiniLocker"** (f5010): `copy.ui.wordmark.lead` + tail (tail in `theme.accentInk`), CMU Serif 700, `title.fontSize`, one line, top `title.top`, masked rise over 22 f (S1Title's `Title`), settled f5032.
- **Tagline** (f5025): `KineticText`, `copy.s9.line`, `tagline.fontSize`, `theme.ink2`, centred, stagger 2, rise 14, one line, no highlight or underline. Last word lands f5051.
- **Import-time checks** (throw `S9a: ...` with the numbers): every beat on a multiple of 15 and inside f4980-5099; reform < collapse <= lockup < tagline, no overlap; the fifth arc whole by `reform.end` and empty by `collapse.end`; the dial's ticks (118/120 of half-size) inside the safe margin (top and sides); the Mark inside it; title and tagline widths fit `1920 - 2 * safeX`; Mark bottom above the title; title bottom <= tagline top; tagline bottom < `rule.y`; the glow wash stays above `rule.y`; title settled before the hold; tagline's last word by f5051; `gaugesOf` returns all five dial gauges.

### Decisions where the prompt contradicts itself

1. **Collapse stagger is 1 f, not 2.** "2 f apart, 8 f each, done by f5007" does not add up (4995 + 4 x 2 + 8 = f5011, after the Mark lands). With a 1 f stagger the fifth arc is empty at f5007, as the prompt's end frame says. To restore 2 f, shorten the arcs to 6 f.
2. **The shock ring is masked above `rule.y`.** The S1 recipe (r1 700 from y 262) would paint below the hairline, which the contract reserves for 21b. A vertical mask fades it out over the last 140 px above y 700 (a mask, not a hard clip). By f5040, when 21b starts, the ring is over (f5010 + 30).
3. **The Mark's own core is transparent** (`accent="transparent"`, as S1 does); the core and its wash are drawn by `S9a` so the dot can grow before the Mark exists, ride the Mark's scale and carry the breathing shadow without a double core.
4. The dial's ticks fade (in f4980-4986, out f5002-5008) because they are not part of an arc and would otherwise pop on and off.

### Seams with 21b

- No shared pixels: nothing of 21a is drawn at or below y 700 (the ring is masked, the wash ends at y 522, the tagline ends at y 652). The same centre `S9_LAYOUT.cx` for every row.
- From f5070 the only thing in this file that changes is the glow (`s9Breath`): the wash alpha and the core's shadow. The punch is cut at the hold (it is 2e-6 by then) and every reveal is done by f5051.
- Nothing in `shared.ts` was changed.

### Verification

- `npx tsc --noEmit`: clean. `npm run motion`: S9 line `S9  120  1.07-1.11  27`, no STILL / FAST / DEEP in S9, no BACKDROP; the same 22 warnings as before, all in S0-S8.
- Import-time checks: 8 mutations of `shared.ts` (off-beat reform and lockup, late tagline, overlapping collapse, dial past the margin, title over the tagline, tagline over the hairline, too-wide title) each threw with the numbers; the unmodified contract imports clean (scratch copy; `shared.ts` untouched).
- Stills rendered with Remotion and Chrome and looked at, with 21b merged and the SAMPLE evidence: f4990, f5000, f5008, f5020, f5035, f5099. f4990 shows the arcs sweeping in over the fading window; f5000 the arcs draining; f5008 the Mark; f5020 the ring, the glow and the title rising; f5035 the title settled and the tagline rising; f5099 the whole end card.
- **Not verified:** the clean hold by pixel (the glow's breathing is the only per-frame input after f5051 by construction; I did not diff f5070 against f5099); the 4K render; the Mark's glow at its breathing peak vs trough side by side.

### Known issues

- The cursor and the dark logo wordmark noted in the 21b notes are also visible in 21a's stills; neither is from this part.
- At f4980-5004 the dial sits over the fading app window, as specified; the dial's tick marks and the window text overlap for a few frames (f4990 still).
- The first arc (network) is drawn in the evidence's state, which on the SAMPLE evidence is flagged (red). On a real capture it is whatever the task measured.
