# Slide deck: patch plan and state

Source of truth for the content of each slide is `SLIDE_DECK_GUIDE.md` (section 5). This file says **in which order the slides are built** and **what the code already offers**. Update the status column when a patch lands.

## The split

Every patch leaves a valid, shippable PDF (`npm run deck` skips slides that are not built yet).

| Patch | Slides | New code | Needs from you | Status |
|---|---|---|---|---|
| 1 | 01 cover, 03 product screen | kit (Dot, Note, Pill, backdrop/footer), `words.ts`, stable numbering, `mapPoint` | nothing | done |
| 2 | 02 problem, 04 Pattern A, 11 why different | `SixVerdicts`, `LoopStrip`; `CompareTable` at progress 1; `facts.ts`; kit `Ratio`, `Tag` | nothing | done |
| 3 | 05 containment, 06 bait | cutaway (`ContainerBox` + `EgressWall`), `AttemptTable`, `DecoyRack` | nothing | todo |
| 4 | 07 wipe / rewind / re-hash | `Storyboard3` (`FileLattice`, `HashTile`, `SnapshotTimeline`, `GhostContainer`) | nothing | todo |
| 5 | 08 hostile page, 09 Attack Lab | `DefensePath`, `AttackCategories` | **`public/deck/R1.png`** (guide section 6) | todo |
| 6 | 10 evidence, 12 Vultr + limits | `TamperSchematic`, `HashChain` from the rewind events, `ArchitectureDiagram`, `LimitsCard` | nothing | todo |
| 7 | QA | evidence audit script, checklist run | nothing | todo |

If time runs out, the seven-slide cut from the guide is 01, 03, 04, 05, 07, 10, 12.

## Conventions set by patch 1 (keep them)

- **Slide N is frame N-1.** `Deck.tsx` has `BUILT` (slide number to component). A slide not in `BUILT` shows `<Pending/>` in the Studio and is skipped by `make-deck.mjs` (it reads `built` from the composition props), so it never reaches the PDF. To add a slide: create `slides/SNN.tsx`, import it, add one line to `BUILT`.
- **Wording.** Anything the film already says is imported from `src/config/copy.ts`. Wording that only the deck needs (kickers, titles, notes) lives in `src/deck/words.ts` under `W.sNN`, with the same rules as `copy.ts`: no measured value, no exclamation marks, never "secure", "unhackable", "provably safe", "zero risk".
- **Numbers** are read through `src/data/select.ts` and the film's own derivations (`gaugesOf`, `dialVerdict`, `dialDims`). Never typed.
- **Pins** are placed with `mapPoint(appPoint, shot)` from `Shot.tsx`, using app coordinates read off `<Shot grid />`, so they follow the picture if it is resized or re-cropped.
- **Layout box.** `Slide` children live in a box that starts at (96, 72) and is 1728 x 920. Use `position: absolute` inside a `position: relative; height: 100%` wrapper.

## Notes on patch 1

- The guide says to underline "the three screens used in this deck". The deck uses four (Workspace, Attack Lab, Report and Infra on slide 5), so the slide 3 legend underlines four.
- Slide 3's title is the film's second tagline line without "and" (derived from `s1.tagline` in `words.ts`); the first tagline line is the lead.
- The dial's own arc labels (Network, Policy, ...) are below the 28 px floor on the cover and in the screenshot. They are the product's own labels; the verdict word and the claim carry the slide.
- Rendering needs a Chrome. If Remotion cannot download one, set `REMOTION_BROWSER_EXECUTABLE`.

## Notes on patch 2

- **`src/deck/facts.ts`** is where evidence values for the slides are read (fix-task pass rate, the hidden check, sandbox destroyed, bake-off line, hostile page status). A missing value throws and names the evidence path. Later patches add their readers here.
- **Slide 04 frames.** The guide's frame table has drifted: frame 1100 now shows the poisoned module's log, not passing tests. "Before" uses frame 880, "after" uses frame 1330.
- **Hidden check.** The guide's `hiddenCheck` event is `scenario.check` in the ledger. The label is the app's own event-log line.
- **Slide 04 "say" line.** The guide says every other scene uses scripted attackers, but `evidence.s3Source` is `"task"`, so slides 05 and 06 show this same model-driven run. The line says what is true: a model drives this task, the Attack Lab's attacks are scripted.
- **Section numbers** follow patch 1 (section = slide number - 1).
- **Small text.** `CompareTable` row sentences on slide 11 are 22 px, below the 28 px floor. Left unscaled so the closing question fits.
