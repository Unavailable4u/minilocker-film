# MiniLocker x Vultr Agent Rush: Demo Film, Patch-by-Patch Build Guide

You have one film bible (**BIBLE**, the last half of this file). This guide splits the work into **25 small patches (00-24)**. Each patch is a separate prompt for a separate AI session. You apply each patch's output to a NEW repo (suggested name `minilocker-film`), run the Check, then move on. You render. The AI never renders.

---

## READ FIRST (what I found, and the choices I made for you)

**What the Vultr page says it wants (from your screenshot, and from your own repo docs):**

| Vultr page says | What it means for the film |
|---|---|
| "Containment-first is required. An agent that only chats is a demo; an agent that executes safely is a product." | The film must show an agent doing REAL work and being contained. Not a feature tour. |
| Challenge 1, "Blast Radius Zero". Submission expectation: **"One containment moment shown in the video"** (repeated in the Vultr-specific box: "demonstrate at least one containment moment in your demo video") | This is the one hard video requirement. The film shows three, in rising order: decoys + egress (S3), wipe-then-rewind (S4, the hero), hostile page (S5). |
| Pattern A "sandboxed code execution" (user asks, model writes code, code runs in a container, real output returns, errors fed back) and Pattern B "sandboxed browser use" (Playwright in a container, screenshots, human approval before final actions) | S2 is Pattern A, S5 is Pattern B. Their own words appear on screen so a judge ticks the box without thinking. |
| "Containment focus": process isolation, secret hygiene, resource limits, lifecycle discipline | One beat each: S3 (isolation, secrets, limits), S2 + S4 (lifecycle: destroyed after every task, fresh sandbox on rewind). |
| "Show how you used Vultr": services, backend/deployment architecture, how the agent executes real tasks | S8 is an animated architecture on the Vultr VM, naming Vultr VM, Serverless Inference, Object Storage. |
| Judging: Application of Technology, Presentation, Business Value, Originality | Mapped scene by scene in BIBLE section 1. Every scene earns at least one criterion. |
| "Real executed results rather than described ones" | See choice 1 below. This is the biggest design decision in the film. |

**Five choices I made (change any you disagree with):**

1. **The film is data-faithful, not mocked.** Your MiniMe film was 100% invented content. This one cannot be: your own demo script says "nothing on screen is mocked", and judges grade real execution. So the UI is rebuilt in code (crisp, camera-friendly) BUT every number, command, hash, host, verdict and ledger line comes from `src/data/evidence.json`, captured by a script from your live Vultr deployment. If a value is not in the evidence, it cannot be on screen. Patch 02 builds this.
2. **One recorded clip is allowed** (the rewind run on the live VM, S4b, about 10 s, badge "LIVE"). It is the proof shot. Everything else is code. If you do not record it, the film automatically shows a "RECONSTRUCTED FROM LEDGER" badge instead. This is the one change to your MiniMe rule "no video".
3. **Length 2:50 (5100 frames at 30 fps), hard cap 3:00**, same as `docs/DEMO_SCRIPT.md` and `docs/SUBMISSION.md`. 120 BPM, every cut on a beat. Works fully muted (captions carry the story); an optional voice-over track and script are included.
4. **Look = your real app**, not `docs/assets/cover.png`: graphite background, warm off-white ink, ONE crimson accent, CMU Serif + CMU Typewriter fonts (already vendored in your repo), and the concentric-ring Mark. In your app "clean" is BLUE (a gradient), not green; the film keeps that. (`cover.png` uses green; the cover for submission is regenerated from the film in Patch 23 so the two match.)
5. **The through-line object is the Blast Radius dial** (5 concentric arcs from `RadiusDial`). It is born from the logo in S1, docks into the Workspace panel in S2, fills as gauges are measured, and returns as the logo in S9.

**Dates (Bangladesh time).** Kickoff is Tue Nov 3, 10 PM. The page says "End of Submissions: Nov 9, 5:00 AM". The working deadline is Sunday Nov 8, 6 PM Bangladesh time (12:00 UTC); the hard limit is about 4 AM Nov 9. Submit well before the working deadline. Suggested plan:

| When | What |
|---|---|
| Nov 3-4 | Patches 00-07 (look and UI kit). Uses the SAMPLE evidence, so no VM needed. |
| Nov 5 | Patches 08-11 (explainer graphics, script/state). |
| Nov 6 | Real-repo alignment (patch 26): the plans now point at the MiniLocker repository; apply the scene polish and render a test film. |
| Nov 7 | Final render and submission assets, upload to lablab, play the link logged out. |
| Nov 8 | Submit well before 6 PM Bangladesh time (12:00 UTC). The hard limit is about 4 AM Nov 9. |

---

## HOW TO USE (read once)

**For every patch, paste these 5 things into the AI, in this order:**

1. **CONTEXT HEADER** (section A below). Same text every time.
2. **Existing files** the patch lists under "Paste existing" (from YOUR new film repo). Always includes `docs/PATCH_NOTES.md`. For patch 00 there is nothing yet.
3. **Reference files from the `MiniLocker` repo** the patch lists under "Paste reference" (read-only: the AI ports them, it does not invent the UI). Patches 02 and 05-07 depend on this. Clone it: `git clone https://github.com/shaikh-dotcom/MiniLocker.git`.
4. **BIBLE sections** the patch lists under "Attach from BIBLE". Copy them straight out of the bottom half of this file.
5. **The patch prompt** (the box under that patch).

**Apply the result:** the AI returns *full files* with path headers (not diffs). Copy each file into your project at the exact path. A file with the same path simply replaces the old one.

**After each patch:** run the "Check" commands. If they pass, move on. If they fail, paste the error back into the same session and ask for a corrected full file.

**If the AI runs out of tokens mid-answer:** new session, paste the CONTEXT HEADER, say "Patch NN, your previous answer was cut off after file `<path>`. Resend only the files from `<path>` onward, complete." Then paste the same patch prompt.

**Switching AIs is safe** because `docs/PATCH_NOTES.md` carries everything the next AI needs (exports, prop names, decisions).

**Order matters.** Use the dependency table. Patches marked "parallel-safe" can be done in any order relative to each other.

---

## DEPENDENCY TABLE

| # | Patch | Needs | Size |
|---|---|---|---|
| 00 | Scaffold, config, core math | nothing | S |
| 01 | Brand: fonts, Mark, dial arcs, Vultr logo slot, asset script | 00 | M |
| 02 | Evidence pipeline: types, SAMPLE data, selectors, clock, capture + validate scripts | 00 | L |
| 03 | FX toolkit (camera, cursor, captions, callouts, numerals, overlays) | 00 | L |
| 04 | Text engines (typing, terminal, hash-lock text, counters) | 00 | M |
| 05 | UI kit A: window, header nav, primitives (Chip, Card, Meter, Donut, Btn) | 00, 01 | M |
| 06 | UI kit B: Workspace (TaskForm, StepStream, Terminal) + Blast panel + RadiusDial | 01, 02, 04, 05 | L |
| 07 | UI kit C: Attack Lab, Report, Infra screens | 02, 05 | L |
| 08 | Explainers A: hardened container, decoy rack, egress wall | 01, 03 | M |
| 09 | Explainers B: file lattice, hash lock, hash chain, snapshot timeline | 03, 04 | L |
| 10 | Explainers C: architecture on Vultr, competitive table, limits card | 01, 03 | M |
| 11 | Film script + persistent `<FilmApp/>` state | 02-07 | L |
| 12 | Master timeline + S0 Hook + S1 Title | 00-11 | M |
| 13 | S2 Real work (Pattern A) | 11, 12 | M |
| 14 | S3 Decoys + egress (containment 1) | 08, 11, 12 | M |
| 15 | S4a Rewind: Attack Lab, the wipe | 09, 11, 12 | M |
| 16 | S4b Rewind: restore, checks, ledger, proof clip | 15 | M |
| 17 | S5 Hostile page (Pattern B) + approval | 11, 12 | M |
| 18 | S6 Evidence report | 07, 11, 12 | M |
| 19 | S7 Value + competitive | 10, 12 | S |
| 20 | S8 On Vultr + limits | 10, 12 | M |
| 21 | S9 Outro | 12 | S |
| 22 | Audio (SFX synth, cue map, music + voice slots) | 12-21 | M |
| 23 | Render pipeline, submission assets (cover, SRT, slides pack), README | 12 | M |
| 24 | QA and polish (incl. honesty audit + rubric self-check) | all | M |

Parallel-safe groups: **02, 03, 04** (after 00/01). **08, 09, 10** (after 03/04). **13, 14, 15, 17, 18, 19, 20, 21** (after 11 and 12).

---
