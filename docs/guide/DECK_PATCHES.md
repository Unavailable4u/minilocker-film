# Slide deck: patch plan and state

Source of truth for the content of each slide is `SLIDE_DECK_GUIDE.md` (section 5). This file says **in which order the slides are built** and **what the code already offers**. Update the status column when a patch lands.

## The split

Every patch leaves a valid, shippable PDF (`npm run deck` skips slides that are not built yet).

| Patch | Slides | New code | Needs from you | Status |
|---|---|---|---|---|
| 1 | 01 cover, 03 product screen | kit (Dot, Note, Pill, backdrop/footer), `words.ts`, stable numbering, `mapPoint` | nothing | done |
| 2 | 02 problem, 04 Pattern A, 11 why different | `SixVerdicts`, `LoopStrip`; `CompareTable` at progress 1; `facts.ts`; kit `Ratio`, `Tag` | nothing | done |
| 3 | 05 containment, 06 bait | `Cutaway` (`ContainerBox` + `EgressWall` + `DecoyRack`), `AttemptTable`; `facts.ts` readers for the hook log and secrets tally | nothing | done |
| 4 | 07 wipe / rewind / re-hash | `Storyboard3` (`FileLattice`, `HashTile`, `SnapshotTimeline`, `GhostContainer`); `facts.ts` readers for the rewind attack | nothing | done |
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

## Notes on patch 3

- **Cutaway.** The film's `ContainerBox`, `DecoyRack` and `EgressWall` at progress 1, laid out with the film's own geometry (`src/scenes/s3/shared.tsx`) and scaled by 0.88 into the slide. The guide says the box is about 880 x 600; the real `ContainerBox` is 1100 x 600, so it is scaled instead of redrawn. The wall is shortened to the box's height so it does not run past the bottom chips.
- **Slide 05 evidence.** Allowed hosts, refused host, module name and the Network gauge all come from `s3Data()`, the same data as the film's S3. The Infra screenshot the guide lists is not on the slide: no room beside a hero this size, and the plaque already prints the same allowlist.
- **Slide 06 attempt table.** Rows are parsed from the `cat /tmp/.shop_hook.jsonl` tool result in the ledger (`facts.hookAttempts`), the same lines the terminal crop shows at frame 1000. `ok` rows read "read a decoy", `error:*` rows read "refused". Three rows say "read a decoy" but the Secrets card counts two decoys read: the two file reads are caught by the canary (atime), `read_env` reads environment values, and the audit found no real secret in the sandbox, so what it read was bait.
- **Slide 06 Report crop.** The guide's second small crop (Report section 8 Secrets card) is replaced by the Report's own line, rebuilt in `copy.rep.headline` words ("6 decoys planted, 2 read, 0 used") plus the audit stamp.
- **Small text.** Labels inside the scaled film components (chips, decoy tiles, plaque hosts) are about 19 px on the slide, below the 28 px floor. They are the product's own drawing; the claim, the hosts that matter and every numeral are 24 px or larger.

## Notes on patch 4

- **Storyboard.** E5 is the film's own `FileLattice`, `GhostContainer`, `HashTile` and `SnapshotTimeline` at their finished states, scaled into three 540 px panels (real work, everything gone, rewind) with a thin arrow between them. The wipe panel uses the guide's `shatter 0.7` and `desaturate 0.7`, the real command (split after its `;`) and the line it printed; the rewind panel draws the reassembled lattice inside the fresh-sandbox ghost, the hash tile at progress 1 and "N file(s) re-hashed - all matched".
- **One rail, not three.** The guide puts a `SnapshotTimeline` in panels 1 and 3. Its labels are one 20 px line of about 200 px each, so three nodes overlap in a 540 px panel. The slide draws one full-width rail under the three panels instead: snapshots 0 and 1 sit under the real work, the greyed snapshot 2 (taken after the wipe, thrown away by the rewind) under the wipe, the blue rewound node under the rewind, with the film's arc back to snapshot 1. "Undone, not erased." (`s4.calloutUndone`) is drawn on the arc's crown, where the film has it.
- **Lattice is 4 x 2.** The film's lattice is 6 x 4. At the panel width that would put the hero tile's file name at about 12 px, so the deck lattice has 8 cells with the hero tile (2 x 2 cells) in the middle of four small ones. It is still only a schematic: the line under panel 1 is `gfxB.schematic`.
- **Evidence strip has three numerals.** The guide lists four values (checks, files re-hashed, ledger events, seconds) but the QA checklist allows at most three numerals. The strip shows checks passed of total, ledger events verified and seconds to run (13.48 s, two decimals as in the film's proof beat); files re-hashed is in panel 3's counter.
- **Screenshot strip is one crop.** The guide asks for the `lab-verdict` crop and the `lab-checks` crop. The checks list is about 9 px at any crop that fits the slide, so the slide shows the verdict crop (frame 2900, logical x 615-1446, y 419-568) and prints the attack's own proof line, read from its first attack-scoped check ("Deleted file came back: the file was gone after the delete and back after the rewind"), in readable type.
- **Snapshot 0.** The film's rail starts at the snapshot the rewind goes back to. The guide asks for snapshots 0 and 1, so `facts.rewindStory()` also reads the `snapshot.created` events of the same ledger that come before it. Everything else comes from the film's `s4Data()`, which still throws when the restore did not match or the ledger does not verify.
- **Section number** follows patch 1 (section = slide number - 1): "§ 06".
- **Not printed.** The guide's "say" line (the rewind replaces the sandbox, the ledger keeps everything) is spoken; "Undone, not erased." carries it on the slide.
- **Small text.** The rail's labels (20 px), the hash tile (22 px) and the schematic line (22 px) are below the 28 px floor; they are the film's own drawings and the guide's own sizes. The claim, the file name, the verdict word and every numeral are 24 px or larger.
- **Rendering here.** The workspace could not download Remotion's Chrome (host not reachable); `REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome npm run deck -- --only=7` rendered the slide.
