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
| 5 | 08 hostile page, 09 Attack Lab | `DefensePath`, `AttackCategories`, `RealShot` | `public/deck/attacklab_complete.png` (patch 7: slide 09 uses it, cropped) | done |
| 6 | 10 evidence, 12 Vultr + limits | `TamperSchematic`, `HashChain` from the rewind events, `ArchitectureDiagram`, `LimitsCard` | nothing (confirm `urls.repo`, see notes) | done |
| 7 | 09 screenshot fix | `RealShot` `crop` prop; slide 09 reads `attacklab_complete.png` | nothing | done |

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

## Notes on patch 5

- **Slide 09 screenshot.** Patch 7 replaced the separate `R1.png` with the screenshot you already have: slide 09 draws `public/deck/attacklab_complete.png` through `RealShot` with a `crop` (`{ x: 0, y: 109, w: 1860, h: 971 }`), so the browser tabs, address bar and taskbar are cut off and nothing has to be re-shot. `NEEDS` at the top of `make-deck.mjs` lists the file.
- **Slide 08 path.** The guide draws one packet. The ledger of `hostile_page_injection` holds two follow-up attempts, so the path draws two, each stopped where the ledger stopped it: the `curl` command at the policy gate (`policy.decision` deny) and the navigation at the approval gate (`approval.requested` then `approval.denied`). The rail is dashed after the first stop because what follows is a second attempt, not the same packet. The egress wall has no `egress.blocked` line in this ledger (network attempts 0), so it is drawn as an outlined bar with no packet and the chip says "not reached". If a re-capture does hold egress lines, the gate turns into a stop with the hosts printed and the word "refused"; if it holds no approval event, the approval gate is left out. Nothing is drawn as a stop the ledger does not hold.
- **Scanner counts.** The page hides three layers, but the scanner reported 6 findings of which 2 are hidden (`injection.suspected`). The card prints the ledger's counts ("6 findings, 2 hidden"), not "three".
- **Fence evidence** is the BEGIN marker with the nonce the product chose for that call. The END marker is not in the ledger (the product clips a browse result before it writes it, see `s5/data.ts`), so it is not printed.
- **Approval crop** uses frame 3700, not 3620: at 3620 the transcript has the request but not the denial, and the denial is the stop. Crop `{ x: 0, y: 530, w: 400, h: 156 }`, read off `<Shot grid />`.
- **"60 s" is not printed.** The default-to-denial timeout is in `real-repo-facts.md` but not in the evidence. The card says what the film says ("Risky actions wait for a human. Default: no.").
- **Numerals.** Slide 08 has the stamp's three (bytes out, egress allowed, real secrets in sandbox; all read from the report through `s5Data()`). Slide 09 has two (contained of total, breached) and the CI conclusion as a pill. The small mono strings in the gate cards (counts, command, nonce) are evidence printed next to the drawing, not evidence-strip numerals.
- **Slide 09 right column** is the catalog grouped by category in lab order (`facts.attackGroups()`), titles only: the evidence holds a full result for five of the fifteen, so no per-attack verdict. The caption says "the attacks, by category" rather than a count, because a count typed in a caption is a number the evidence did not supply.
- **Slide 09 title** is the Attack Lab's own sentence (`lab.summary.explainLead`), at 56 px on two lines. It is the claim, so it is not shortened.
- **Section numbers** follow patch 1: "§ 07" and "§ 08".
- **Small text.** Gate evidence and chips are 26 px mono (inside the guide's 26 to 30 range for evidence), captions under crops are 24 px, and the page crop on slide 08 is a picture of a page, not text a judge has to read. Gate labels, titles, the claim and every numeral are 28 px or larger.
- **Rendering here.** `REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome npm run deck` (all built slides) and `npm run deck -- --only=8,9`.

## Notes on patch 6

- **Slide 10 ledger.** The film's own `HashChain` at its finished state (`verifyProgress` 1), three blocks picked by role from the rewind attack's ledger through `s4Data()` (`facts.ledgerChain()`): the snapshot the rewind goes back to, the delete, the verified rewind. They are a selection of a longer ledger, so the HashChain draws the links dashed with "+2" and "+8" (events left out): nothing is drawn as adjacent that is not. Three blocks are 788 px wide, scaled to 920 px (about 1.17), so the chain's own text lands at 23 to 30 px. Four blocks would have dropped it below 20 px. The seal line ("intact - 30 events - head bf7df3a5") is the film's own `sealLabel`, built like S4b5's, at about 30 px.
- **Tamper schematic.** `TamperSchematic` is a drawing of the mechanism, not a run: its hashes are the symbols h0 to h3, never real hashes, and the label over it says "schematic, not a run" (`words.s10.schematic`). The crossing on the broken link is drawn as two strokes, not a font glyph. Text is 28 px mono and 32 px serif.
- **Evidence strip (three numerals).** Network attempts blocked (1 of 1), MiB peak memory (10 of 512, rounded from 10223616 and 536870912 bytes, the way the Compute card rounds), wall clock (79.5 s).
- **Wall clock prints 79.5, not 80.** 79.5 is the evidence value and what the Time card in the screenshot prints; the Report's KPI strip rounds to 80. Printing 80 beside a card that says 79.5 would contradict itself on the slide.
- **Report crop shows eight cards, the legend carries nine.** The ninth card (Compute) is 198 px tall; the 900 px window cannot hold nine cards at any scroll (a `reportScroll` override at 1228 was tried and reverted). The crop is frame 3915, `{ x: 245, y: 102, w: 1111, h: 679 }`, read off `<Shot grid />`. The 3 x 3 legend lists every dimension in the Report's order with its status word, and `not used` is muted.
- **Tag wording.** The film deliberately gives a `not_used` card no "Not measured says so" (header of `src/scenes/S6Evidence.tsx`); `copy.s6.calloutNotMeasured` is for a `not_measured` card only. The Browser card is `not_used`, so its tag is a true deck phrase, `words.s10.notUsed` ("Not used says so"). The tag hangs off the card's lower edge: its body is only about 45 px tall on the slide, and a tag inside it would cover the card's title and status chip.
- **Pin placement.** `anchors.measured.json` is in page coordinates with an offset of about 131 px against window px, so `reportCardAt` is not used for the tag. Its position is hardcoded in app px read off `<Shot grid />` and guarded: the slide throws if the fifth dimension of the evidence is not `browser` and not measured.
- **Slide 12 diagram.** The film's `ArchitectureDiagram` at its finished state (all three chips lit, no path highlighted), cropped to its content (`ARCH_BOX` in `gfx/ArchScaled.tsx`: x 138, y 90, 1582 x 790 stage px) and scaled to 1000 px (0.63). `validateArchChips` runs inside the diagram and would throw if a chip did not fit.
- **Small text on slide 12.** The diagram's own labels (node titles 24 px, chip lines 20 px in the film) land at 11 to 16 px. They are the product's drawing, the same exception as the scaled film components of patches 3 to 5. What a judge must read is in the table under it (product 30 px, facts 26 px, bake-off line 24 px), which prints the same three products with the same facts from the same source (`facts.vultrFacts()`).
- **Vultr facts rule.** `facts.vultrFacts()` copies the rule of `src/scenes/S8Vultr.tsx`: the claims are only made when the evidence shows an available Vultr VM, Vultr inference and an attached Vultr bucket, and the bake-off line only when the evidence names the very model the deployment reports. Otherwise it throws and names the path.
- **Limits.** `LimitsCard` is fixed at 1440 px, nowrap, 40 px; scaled into a column its text would be about 18 px. `gfx/LimitsList.tsx` keeps its look (hatched vermilion rule, serif bold lines, small-caps heading, mono footnote) and wraps the three `copy.s8.limits` lines at 34 px in a 600 px column.
- **Links.** The repository (`urls.repo` without its scheme), the demo host (`selectMeta().baseUrl`, falling back to `urls.demo`) and `brand.license` are pills; the official Vultr logo is in the header. No QR code.
- **CHECK BEFORE SUBMISSION: `urls.repo`.** `src/config/copy.ts` has `urls.repo = "https://github.com/shaikh-dotcom/MiniLocker"`, and slide 12 prints it. Confirm that is the repository you actually submit before the deck ships. Nothing else in the patch depends on it.
- **Section numbers** follow patch 1: "§ 09" and "§ 11".
- **Rendering here.** `REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome npm run deck -- --only=10,12`.

## Notes on patch 7

- **No audit script.** Patch 7 is the slide 09 screenshot fix only. Your screenshot is taken as correct; nothing checks it.
- **Build the PDF:** `npm run deck` writes `out/deck/MiniLocker-deck.pdf` (12 pages, 1920 x 1080 pt). `npm run deck:hd` is the same at 2x sharpness.
