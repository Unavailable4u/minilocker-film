# MiniLocker slide deck: build guide

Target: a 12-slide, light-theme, 16:9 PDF for the Vultr Agent Rush submission (Challenge 1, "Blast Radius Zero"). Drop this file into `docs/guide/` of `minilocker-film`.

Deadline reminder from your own README: Sunday Nov 8, 6 PM Bangladesh time (12:00 UTC). The build order in section 9 puts the most important slides first, so a partial deck is still submittable.

---

## 0. The plan in one paragraph

Build the deck **inside the film repo, as code**, the same way the film is built. One new Remotion composition, `MiniLockerDeck`, has 12 frames, and frame N is slide N. Each slide is a React component that uses the film's light theme tokens, the film's explainer graphics (`src/gfx`), and **live "screenshots"**: the rebuilt app component (`FilmApp`) drawn at a chosen film frame and cropped to the part you want. Because the app is code, every screenshot is sharp at any size, always matches the evidence, and never needs a manual capture. A script renders the 12 stills and joins them into one PDF. For the few things the rebuilt app does not show (Timeline, Sessions, the 15-of-15 Attack Lab), you take real screenshots from your live app (section 6).

---

## 1. What I checked (so you can trust the steps below)

I cloned the repo, installed it, and rendered real frames in the **light** film (`src/index.light.ts`). Confirmed:

| Check | Result |
|---|---|
| Evidence | `meta.sample` is `false`, captured 2026-11-05 from `https://minilocker.duckdns.org`. Real data, so slide numbers are real. |
| Light theme | Works. The light "Paper" look (ivory, graphite ink, one crimson accent) renders cleanly. The terminal stays dark, as in the real app. |
| Camera-free app | The film frames are **zoomed** by the virtual camera, so they are bad screenshots. The `DevApp` composition draws the whole app with **no camera**. `FilmApp` does not read the composition clock, so it can be placed in any composition and shown at any film frame. |
| Live crop | `Shot` (code below) renders `FilmApp` at a global frame and crops it. Rendered and inspected. |
| Explainer graphics | `ContainerBox`, `DecoyRack`, `EgressWall`, `FileLattice`, `HashTile`, `SnapshotTimeline`, `GhostContainer`, `HashChain`, `ArchitectureDiagram`, `CompareTable`, `LimitsCard` all render in light. They are built to animate, but every one takes 0..1 progress props, so passing `1` gives a finished still. |
| PDF export | `scripts/make-deck.mjs` (below) rendered a still and wrote a 1920x1080 PDF page. |

Not available in `FilmApp`: the **Timeline** and **Sessions** screens. `FilmApp` only draws Workspace, Attack Lab, Report and Infra. Use a real screenshot for those two (section 6).

Rendering needs a Chrome. Remotion downloads one on first use. If that fails, set `REMOTION_BROWSER_EXECUTABLE` to any Chrome or Chromium path.

---

## 2. Files to add

```
src/deck/Shot.tsx          live screenshot (code in this folder: Shot.tsx)
src/deck/theme.ts          deck tokens and sizes (section 3)
src/deck/kit.tsx           Slide shell, Eyebrow, Title, Pin, Numeral, Footer
src/deck/slides/S01.tsx ... S12.tsx
src/deck/Deck.tsx          the composition: picks the slide for the current frame
scripts/make-deck.mjs      renders out/deck/NN.png and out/deck/MiniLocker-deck.pdf (code in this folder)
```

`package.json`:

```json
"scripts": {
  "deck": "node scripts/make-deck.mjs",
  "deck:hd": "node scripts/make-deck.mjs --scale=2"
},
"devDependencies": { "pdf-lib": "^1.17.1" }
```

`src/Root.tsx`: add inside `RemotionRoot`, in the FINAL group:

```tsx
import { Deck, DECK_SLIDES } from "./deck/Deck";
<Composition id="MiniLockerDeck" component={Deck} durationInFrames={DECK_SLIDES} fps={FPS} width={STAGE.w} height={STAGE.h} />
```

`src/deck/Deck.tsx`:

```tsx
import React from "react";
import { useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { FontsReady } from "../lib/fonts";
import { S01 } from "./slides/S01"; /* ... S12 */

const SLIDES = [S01 /* , S02 ... S12 */];
export const DECK_SLIDES = SLIDES.length;

export const Deck: React.FC = () => {
  const i = useCurrentFrame();
  const Slide = SLIDES[Math.min(i, SLIDES.length - 1)];
  return (
    <FontsReady>
      <Slide />
    </FontsReady>
  );
};
```

Commands:

```
npm install
npm run studio:light        # open the light Studio, pick MiniLockerDeck, scrub frame 0..11
npm run deck                # all slides -> out/deck/NN.png + out/deck/MiniLocker-deck.pdf
npm run deck -- --only=6    # re-render slide 6 only, then rebuild the PDF
npm run deck:hd             # 3840x2160 PNGs for a sharper PDF
```

Always work from `studio:light`, not `studio`. The light entry sets the theme before any module loads. Never import `themeMode` yourself.

---

## 3. Design system for the deck

Use the film's tokens so the deck and the film look like one product. Import `theme` and `fonts` from `src/config/theme.ts`; do not retype colors.

| Role | Token (light value) | Use |
|---|---|---|
| Page | `theme.paper` (#f2f0eb) | Slide background, with `GridPaper` at low opacity for the engineering-paper feel |
| Panels | `theme.sheet` (#faf9f6) | Cards, screenshot frames |
| Ink | `theme.ink` / `ink2` / `ink3` | Titles / body / captions |
| Accent | `theme.accent` (#d90f3d), `accentInk` | The one crimson: kicker numbers, the product row, key numerals |
| Contained, measured | `theme.ok` (#1d4ed8) | "Contained", "measured", clean arcs |
| Blocked, flagged | `theme.bad` (#c8321f) | Refused, flagged, denied. Always with hatching (`hatch()`), never color alone |
| Needs a human, decoy read | `theme.warn` (#9a5800) | Approval, decoys |
| Fonts | `fonts.serif` (CMU Serif), `fonts.mono` (CMU Typewriter) | Serif for words, mono for commands, hashes, hosts |

Type scale on the 1920x1080 slide (slides are read, not watched, but keep the film's floor of 28 px for anything a judge must read):

| Element | Size |
|---|---|
| Kicker (mono, uppercase, `§ 04 · PATTERN A`) | 24 |
| Title (serif) | 88 to 104, one line, two at most |
| Lead sentence (serif) | 40 |
| Body | 30 to 34 |
| Mono evidence (commands, hashes) | 26 to 30 |
| Footer | 22 (only exception) |

Grid: 96 px side margins, 72 px top. Title block top-left. Content area is 1728 x 760. Footer strip: `MiniLocker · Vultr Agent Rush · Blast Radius Zero` left, `n / 12` right, hairline above in `theme.rule`.

Slide recipe (use for every slide):
1. **Kicker + title** state one claim, not a topic. "Bait, not secrets" beats "Decoys".
2. **One hero visual** (screenshot or explainer) takes 55 to 60% of the width.
3. **One evidence strip**: two or three big numerals read from the evidence, each with a 24 px mono label.
4. **Pins**: numbered crimson dots on the screenshot with a 30 px label, so the picture explains itself.

Screenshot frame: `Shot` already draws a hairline and soft shadow. Keep the app's own header visible when the whole window is shown (it carries the brand and the nav); crop it away when you zoom on one panel.

Background: plain `paper` plus `GridPaper`. Use `public/backgrounds/stage-light.png` (the floral picture) only behind the cover, at reduced opacity, or skip it. It is too busy behind screenshots.

---

## 4. The `Shot` component

Full code is in `Shot.tsx` next to this file. Usage:

```tsx
<Shot at={3915} width={1000} />                                      // whole window at film frame 3915
<Shot at={1330} crop={{ x: 760, y: 60, w: 800, h: 560 }} width={880} />   // a region, 880 px wide
<Shot at={3915} width={1100} grid />                                  // overlay: read crop coordinates off the picture
```

- `at` is a **global film frame** (the same numbers as `script.ts`). Frames 600 to 4979 exist.
- `crop` is in the app's logical pixels (the app is 1600 x 900). Use `grid` to read coordinates, then turn it off.
- Measured element rectangles are in `src/config/anchors.measured.json` (dial, run button, lab tiles, report cards). The Workspace, Attack Lab and Infra ones are window px and usable as crops. The **Report** ones are page coordinates at scroll 0, so they do not match a scrolled frame: for the Report, read the crop off the picture with `grid`.
- Pins are a normal absolutely positioned `<div>` on top of the Shot. Convert a logical point to slide px with `slideX = shotLeft + (x - crop.x) * (width / crop.w)`.

### Frame table (verified by rendering)

These are the moments that show each screen in the state you want. Frames are global.

| Screenshot id | Frame | What it shows |
|---|---|---|
| `ws-form` | 700 | Workspace at rest: task form, strict/observe, empty transcript, "Nothing has run yet", empty dial |
| `ws-red` | 880 | Tests failing in the terminal |
| `ws-green` | 1100 | The patch applied, tests passing |
| `ws-done` | 1330 | Finished fix task: transcript, terminal, dial **flagged**, the blast cards |
| `hook` | 1000 | Terminal showing the poisoned module's own log (`read_ssh_key`, `read_aws_credentials`, `read_env` ok; `post_collect`, `direct_socket`, `write_etc`, `write_stdlib` all errors) |
| `lab-checks` | 2760 | Attack Lab, "Wipe the workspace, then rewind", Containment checks list visible |
| `lab-verdict` | 2900 | Same attack, big **Contained** verdict panel and "What happened" |
| `browser-hostile` | 3620 | Workspace browser tab, hostile page task, policy and approval lines in the transcript |
| `browser-after` | 3700 | Same task after the approval was handled |
| `report-top` | 3800 | Report header, abstract, five KPIs, "Ledger chain verified" seal |
| `report-cards` | 3915 | The nine dimension cards §1 to §9 |
| `report-verified` | 4150 | Report after "Verify ledger now" (seal shows the re-verified line) |
| `infra` | 4650 | Infrastructure: "How a task flows" strip, Host and Docker panels |

Crops: start from the whole window, then tighten with `grid`. Suggested first crops (logical px, tune by eye):

| Target | Start crop `{x, y, w, h}` |
|---|---|
| Containment dial (Workspace) | `{ x: 1195, y: 130, w: 400, h: 420 }` (dial anchor is `x 1230, y 173, 280 x 280`) |
| Terminal pane | `{ x: 380, y: 60, w: 660, h: 780 }` |
| Task form + transcript | `{ x: 0, y: 60, w: 375, h: 780 }` |
| Report KPI strip + seal | `{ x: 230, y: 0, w: 820, h: 620 }` at `report-top` (the report column spans about x 230 to 1040) |
| Infra flow strip | `{ x: 240, y: 130, w: 1120, h: 260 }` at `infra` |

---

## 5. Slide by slide (12)

Each slide: the claim, the layout, the screenshot, the explainer, the exact words, and the evidence. Words come from `src/config/copy.ts` where a key is named; keep that file's rules (no exclamation marks, no hype, never "provably safe", "zero risk", "secure", "unhackable").

Evidence values below are what the file reads **today**. Never type them: read them through `src/data/select.ts` (`selectMeasured()`, `selectSummary()`, `selectInfra()`, `selectTask()`, `selectAttack(name)`).

### 01 · Cover
- **Claim:** MiniLocker. See exactly what it could not touch.
- **Layout:** Centered. The `RadiusDial` large (about 520 px) over the wordmark (`ui.wordmark`: "Mini" ink, "Locker" crimson, serif at about 150 px), then the eyebrow chip `s1.eyebrow` (VULTR AGENT RUSH - BLAST RADIUS ZERO), then the two tagline lines `s1.tagline`.
- **Visual:** The film's own poster is frame 480 of the film, but the dial there says "measuring". For the deck set the dial to the finished look: `verdictWord="flagged"` is the honest state of the fix task, or `"clean"` if you want the calm cover. Use the `dims` pattern from `S1Title.tsx` and `showLabels={1}`, `glow={1}`, `pulseFlagged={false}`.
- **Footer links:** `urls.repo`, `urls.demo`, `brand.license`, `brand.builtOn`.
- **Optional:** `stage-light.png` behind at about 35% opacity.

### 02 · The problem
- **Claim:** "Agents with a shell and a browser are one bad page away from a bad day." (`s0.caption`, two lines).
- **Layout:** Left 60%: **Explainer E1, "six verdicts"** (below). Right 40%: a `FixturePage` (the hostile page, rendered at 620 x 460, `flagged`, `layers={[1,1,1]}`, `dim={0.5}`) with the three hiding places labeled: display:none block, off-screen text, HTML comment (`s5.fixture.hidden[].how`).
- **Words:** Kicker `§ 01 · THE PROBLEM`. Tag under the grid: `s0.tag` (WHAT AN UNCONSTRAINED AGENT COULD DO). This tag matters: it says the grid is an illustration, not a measurement.
- **Evidence:** none. This slide is generic on purpose.

### 03 · The product in one screen
- **Claim:** "Give an AI agent real work on untrusted inputs, and see exactly what it could not touch." (`s1.tagline`).
- **Layout:** One big annotated screenshot, about 1150 px wide, left. Right column: four numbered notes.
- **Screenshot:** `Shot at={1330}` whole window (header and nav visible).
- **Pins:** 1 the task form with strict / observe (`ws.taskForm.profileHelp` explains both). 2 the transcript. 3 the terminal ("everything it touches is measured and written to the ledger", `ws.terminal.emptyBody`). 4 the containment dial and blast cards.
- **Right column words:** the six screens as a small legend, from `ui.screens` (Workspace, Timeline, Attack Lab, Report, Sessions, Infra), with the three used in this deck underlined.
- **Evidence strip:** none, or the model chip: `${s2.inferenceChip} - ${infra.inference.model}` (Vultr Serverless Inference, mimo-v2.6-pro).

### 04 · Pattern A: a real task, real execution
- **Claim:** "A real task. Real execution." (`s2.caption`), then "Plan. Dispatch. Execute. Verify." (`s2.captionSteps`).
- **Layout:** Top: **Explainer E2, the four-node loop** (`s2.flow`: model writes code → runs in a container → real output returns → model explains, errors fed back, with the return arrow to node 1). Bottom: two screenshots side by side.
- **Screenshots:** left `ws-red` terminal crop (tests fail), right `ws-green` terminal crop (tests pass). Label them "before the patch" and "after the patch".
- **Callouts:** `s2.calloutCheck` (A check it never sees) pointing at the hidden check; `s2.calloutAudit` (Audited as it is destroyed).
- **Evidence strip:** fix task passes `measured.fixRepoV2.passes` of `runs` (10 of 10 today); the hidden check line comes from the ledger event `hiddenCheck`; model name and bake-off line from `s8.bakeoff` template (4 models, 100% usable tool calls, p50 0.89 s today).
- **Say:** "The model works only here. Every other scene uses scripted attackers, so no model is in the loop."

### 05 · Containment you can see
- **Claim:** "Containment, measured." (`s3.caption`).
- **Layout:** Hero: **Explainer E3, "cutaway"**. A `ContainerBox` (about 880 x 600) with the six chips (`s3.chips`: non-root, read-only root, no capabilities, 128 processes, 512 MB no swap, no route out) all at progress 1, a hostile module band inside (`s3.module` shows `shop/_telemetry.py`, blurb "Optional anonymous usage statistics"), and to its right an `EgressWall` with the allowlist plaque and one hatched refused packet.
- **Static settings:** `chipProgress={chips.map(() => 1)}`, `drawProgress={1}`, `sealProgress={1}`. For the wall: `reveal={1}`, one packet with `blocked: true` frozen at the wall (see `DevGfxA.tsx` for the packet shape and the frame-335 look).
- **Screenshot:** the Infra panel "Egress proxy" and the "How a task flows" strip (`infra`, crop `{x:240,y:130,w:1120,h:260}`). Crop **out** the Host panel's `Instance` row (see section 7).
- **Words:** `s3.captionPhoneHome` (It tried to phone home. Refused.), `s3.calloutAllowlist` (Allowlist only), plaque heading `gfxA.allowlist`.
- **Evidence:** allowed hosts from `infra.egress.allowed_hosts` (files.pythonhosted.org, pypi.org, wikipedia.org today); refused host from the ledger egress event, never typed.

### 06 · Bait, not secrets
- **Claim:** "Bait, not secrets." (`s3.captionBait`).
- **Layout:** Left: `DecoyRack` 3 x 2 (AWS access key id, AWS secret access key, GitHub token, SSH private key, database password, payment API key), two tiles in the `read` state, the rest `planted`. Right: **Explainer E4, "attempt table"** built from the real hook log.
- **Attempt table (new explainer):** seven rows, one per line of the poisoned module's own log in `hook`: `read_ssh_key ok`, `read_aws_credentials ok`, `read_env ok`, then `post_collect`, `direct_socket`, `write_etc`, `write_stdlib` each with their error. Left column attempt, right column outcome chip: "read a decoy" (warn) or "refused" (bad, hatched). Read the rows from the terminal events, do not retype.
- **Screenshot:** `Shot at={1000}` terminal crop, framed as the proof under the table. A second small crop: the Report §8 Secrets card (at `report-cards`, find it with `grid`): "6 decoys planted · 2 read · 0 used · no real secret in the sandbox".
- **Stamp:** `gfxA.stampSecrets` + the audit count (real secrets in sandbox: 0).
- **Words:** `s3.calloutRandom` (Random per task), `s3.calloutAlarm` (Reading one rings the alarm).
- **Evidence strip:** `measured.realSecrets.runsWithReal` of `runs` (0 of 26 today); `measured.hookEscaped.escaped` of `runs` (0 of 10 today).
- **Wording rule:** the decoys are worth nothing; say "planted", "read", "used". Never "stolen".

### 07 · Wipe, rewind, re-hash
- **Claim:** "Real wipe. Real rewind. Real hashes." (`s4.captionReal`), with "Undone, not erased." (`s4.calloutUndone`) as the subtitle.
- **Layout:** **Explainer E5, three-panel storyboard** across the full width (each panel about 540 px wide), then a one-row screenshot strip under it.
- **Storyboard panels (new, replaces the animation):**
  1. *Real work.* `FileLattice` intact, hero tile labeled with the real file (`precious.txt`), `SnapshotTimeline` with snapshot 0 and 1 and their 8-hex hashes. Caption `s4.captionWorks`.
  2. *Everything gone.* `FileLattice` with `shatter={0.7}`, `desaturate={0.7}`, the real command in mono and `WIPED_0` big in `theme.bad`. Caption `s4.captionGone`.
  3. *Rewind.* `FileLattice` with `reassemble={1}`, `GhostContainer` labeled `gfxB.freshSandbox`, the blue rewound node on `SnapshotTimeline` ("restored into a fresh sandbox"), and a `HashTile` with `lockProgress={1}`: snapshot hash over restored hash, tick, "N files re-hashed - all matched".
  Put thin arrows between the panels. Use `evidence.attacks.rewind_after_rm_rf` for every hash, file name and command (`selectAttack`, `selectAttackEvents`).
- **Screenshot strip:** `lab-verdict` crop of the **Contained** panel and the check list (`lab-checks`). Add the proof line from the attack result: "the file was gone after the delete and back after the rewind".
- **Evidence strip:** checks passed of total (from `selectAttack("rewind_after_rm_rf").checks`), files re-hashed, ledger events verified (30 today), seconds to run.
- **Say:** "The rewind replaces the sandbox. The ledger keeps everything, including what was undone." (`tl.footnote` says it formally.)

### 08 · Pattern B: a hostile page
- **Claim:** "A page tries to hijack the agent." then "Flagged. Denied. Nothing leaves." (`s5.captionHijack`, `s5.captionFlagged`).
- **Layout:** **Explainer E6, "defense path"** as a horizontal path across the top (about 1728 x 260), with two screenshots below it: the hostile page (`FixturePage`, flagged, layers revealed) and the approval moment (`browser-hostile` transcript crop).
- **Defense path (new):** a single line with a packet starting at "page" and five gates in order: **fence** (`s5.fenceLabel`: untrusted content, random nonce, invisible characters stripped) → **scanner flags the injection** → **policy denies the follow-up command** → **human approval, default no** (`s5.captionHuman`; unanswered requests default to a denial after 60 s, from `real-repo-facts.md`) → **egress wall**. The packet is drawn **stopped** at the gate where the ledger says it stopped. Under the path, the stamp `s5.stamp` (nothing left the sandbox) with its three facts (bytes out, egress allowed, real secrets in sandbox) read from the report.
- **Badge:** `badges.patternB`.
- **Wording rule:** say "a page", "a command", "the attack". Never "the agent chose to".

### 09 · The Attack Lab
- **Claim:** "Each attack is a scripted attacker driving the real agent loop, policy engine and Docker sandbox. No model is involved." (`lab.summary.explainLead`).
- **Layout:** Left 55%: a **real-app screenshot** of the Attack Lab after "Run all attacks" showing the donut and 15 tiles (section 6, shot R1), because the rebuilt film screen only shows the attacks the film ran. Right 45%: **Explainer E7, "fifteen by category"**: the 15 attack titles from `selectAttackCatalog()` grouped by `category`, small cards, no per-attack verdict (the evidence stores full results for only five).
- **Evidence strip:** `selectSummary()`: `contained` of `total` (15 of 15 today), breached 0. CI: `selectCi()` conclusion and the `pytest -m attacks` line (`lab.summary.explainCi`).
- **Wording rule:** the verdict words are Contained, Breached, Inconclusive (`lab.verdicts`). Do not invent others.

### 10 · Every run leaves evidence
- **Claim:** "Measured, not asserted." (`s6.captionMeasured`).
- **Layout:** Left: `HashChain` (about 900 px wide) built from the real ledger events of the rewind attack, the delete block highlighted in `bad` with hatching, the seal and the line "intact - 30 events - head xxxxxxxx". Right: the nine-card Report screenshot.
- **Screenshot:** `report-cards` crop `{ x: 180, y: 60, w: 860, h: 840 }` (the cards sit between about x 195 and 1020), with a pin on the **Browser — not used** card (`s6.calloutNotMeasured`: "Not measured says so").
- **Explainer E8, "tamper schematic"** (small, under the chain): three blocks, each showing `hash` and `prev`, with a dashed arrow from one block's `hash` to the next block's `prev`. Label it "schematic" (`gfxB.schematic` style, mono 22). Caption: "Change one event and every hash after it stops matching." This is how a hash chain works, not a demo you ran, so label it as a schematic.
- **Evidence strip (from the report, today):** Requests blocked 1 of 1 network attempts; Peak memory 10 of 512 MiB; Wall clock 80 s; ledger chain verified, event count and head.
- **Nine dimensions:** Network, Policy, Persistence, Time, Browser, Artifacts, Filesystem, Secrets, Compute. Show them as a 3 x 3 legend with a Measured / Not used chip each.

### 11 · Why this is different
- **Claim:** "A container gives you a promise. MiniLocker gives you a measurement." (`s7.caption`).
- **Layout:** `CompareTable` full width (about 1500 px), then the question in large serif underneath.
- **Table:** `rows={s7.rows}`, `columns={gfxC.compareColumns}`, `marks={gfxC.compareMarks}`, `rowProgress={[1,1,1,1]}`, `emphasis={1}`. Legend `gfxC.compareLegend`. The table is an editorial judgement about **generic categories**: no product names, ever.
- **Under the table:** `s7.line`: "Before you trust an AI agent, ask: what could it touch, and how would you know?" with "know?" underlined in crimson.
- **Evidence strip:** none. Opinion slides carry no numbers.

### 12 · Built on Vultr, limits said plainly
- **Claim:** "What it does, and what it does not." (`s8.caption`).
- **Layout:** Left 58%: `ArchitectureDiagram` at full progress with all three Vultr chips lit (nodes and edges at 1, `highlight` off or `"none"` as in `DevGfxC` frame 120, `vultrChip=[1,1,1]`). Right 42%: `LimitsCard` with the three limits (`s8.limits`), footnote `SECURITY.md`. Bottom bar: repo, demo, license.
- **Chips (from the evidence, never typed):** Vultr VM (region EWR, hostname), Vultr Serverless Inference (`api.vultrinference.com`, mimo-v2.6-pro, plus the bake-off line), Vultr Object Storage (`ewr1.vultrobjects.com`, bucket `minilocker-data`).
- **Links:** `urls.repo`, `urls.demo`, `brand.license` (MIT licensed). If you want a QR code, generate it from `urls.demo` into an SVG and inline it; do not load an image from the web.
- **Limits, exact:** The container shares the host kernel. The policy engine is an early warning, not the boundary. A per-task Vultr instance is the next step. Not built.
- **Logo:** `ArchitectureDiagram` has `showVultrLogo`. The installed `public/brand/vultr-logo.svg` is the on-white variant, which suits the light deck.

---

## 6. Real-app screenshots (the few you take yourself)

Take these from `https://minilocker.duckdns.org` on the frozen code. Use a Chrome window set to 1600 x 900 (DevTools device toolbar, "Responsive"), the **Paper** theme (the sun icon in the header), and save PNGs to `public/deck/`.

| Id | Screen | How to get it | Used on |
|---|---|---|---|
| R1 | Attack Lab, all 15 tiles contained, donut full | Attack Lab → **Run all attacks**, wait until it reads all contained, then capture. The browser and egress attacks need the egress proxy and browser image, which the VM has. | Slide 9 |
| R2 | Timeline with snapshots and the rewind node | Workspace → run the fix task with **hold 1 min** → Timeline screen → **Rewind here** on an earlier snapshot. Capture while the rewound node shows. | Slide 7 (optional second strip) |
| R3 | Sessions | Only if you want a "history" mention. Skip it if you are short on time. | none by default |

Rules for real screenshots:
- The token field shows dots, which is fine. Never show a revealed token, and never capture the browser address bar if it holds a token in the URL.
- Frame them with the same style as `Shot` (1 px `rule2`, 14 px radius, soft shadow) by wrapping in a `<div>` with the same styles around an `<img src={staticFile("deck/R1.png")} />`.
- Do not mix dark and light screenshots in one deck.

---

## 7. Traps that will cost you credibility

1. **No instance id, no IP, no token.** The Infra screen's Host panel ends with an `Instance` row that holds the Vultr instance id, and the evidence file holds the public IP. The film shows only region and hostname. Crop the row out (or crop to the flow strip and the Egress and Inference panels) and never print `infra.vultr.public_ipv4`.
2. **Evidence rule.** Every number, hash, host, file, command and verdict comes from `src/data/evidence.json` through `select.ts`. If you need a number the evidence does not have, capture again (`npm run evidence`), do not type it.
3. **Wording.** No exclamation marks. No "secure", "unhackable", "provably safe", "zero risk". The word "scripted" is accurate for the 15 attacks; "the agent chose" is not.
4. **Things that do not exist.** Do not show or imply a per-task Vultr instance, a Vultr firewall group, vision-model checks of screenshots, approve-before-submit for browser forms, gVisor or Kata. Slide 12 says the per-task instance is not built.
5. **Decoys are not secrets.** "Planted", "read", "used". The `real secrets in sandbox: 0` stamp is a measurement.
6. **Illustration vs measurement.** Slide 2's grid is an illustration (the tag says so). Slide 10's tamper drawing is a schematic (label it). Everything else is measured.
7. **Generic competitors.** The comparison table names categories only.
8. **Light only.** If a gfx component looks wrong in light (a glow that was tuned for dark), fix it with the tokens in `theme.ts` (`isLight` exists for shadows), not by hard-coding a color.
9. **Frames drift.** If a later film patch moves a beat, the frame numbers in section 4 move too. Re-check them with `<Shot grid />` in the Studio before the final render.

---

## 8. QA checklist (run before you upload)

- [ ] `npm run typecheck` passes.
- [ ] `npm run deck` writes 12 PNGs and one PDF; open the PDF and page through it at 100%.
- [ ] Every slide has one claim, one hero visual, and no more than three numerals.
- [ ] All body text is at least 28 px on the 1920 slide (footer excepted). Zoom out to 25% and check that the hero visual and the claim still read.
- [ ] Every number matches `evidence.json` (open it and tick them off). Slide 4, 6, 7, 9, 10, 12 carry numbers.
- [ ] No `Instance` row, IP, token, or sample banner anywhere. `meta.sample` is still `false`.
- [ ] Check the PDF page size is 1920 x 1080 pt (16:9) and the file is a sensible size (use `deck` first; `deck:hd` only if it stays under about 20 MB).
- [ ] Read slides 2, 5, 7 and 8 out loud against `docs/bible` voice rules (short, confident, concrete, true).
- [ ] Upload the PDF to the lablab form as "Slide deck: PDF". Keep the film and the cover as your other two assets.

---

## 9. Build order and paste-ready prompts (your patch workflow)

Do it as five small patches so a partial deck is always shippable. Each prompt is meant to be pasted into Copilot or Claude Code in the repo.

**D1: scaffold (30 min).** Slides 1 and 3 only, so the pipeline is proven.
> In `minilocker-film`, add `src/deck/Shot.tsx` and `scripts/make-deck.mjs` exactly as in docs/guide, the `MiniLockerDeck` composition in `Root.tsx`, the `deck` scripts and `pdf-lib`. Create `src/deck/kit.tsx` (Slide shell with the paper background and GridPaper, Eyebrow, Title, Pin, Numeral, Footer) using `theme` and `fonts` only. Build slide 01 (cover) and slide 03 (annotated product screen) per the guide. Run `npm run typecheck` and `npm run deck`. Do not touch the film.

**D2: the story slides.** 2, 4, 11 (they need the fewest new graphics).
> Add slides 02, 04 and 11 per docs/guide section 5. Slide 02 needs a new `SixVerdicts` explainer component in `src/deck/gfx/`; slide 04 needs a `LoopStrip` explainer. Every number comes from `select.ts`.

**D3: the proof slides.** 5, 6, 7 (the three explainers you must redraw).
> Add slides 05, 06 and 07. New components: `AttemptTable` (rows read from the hook log events), `Storyboard3` (three `FileLattice` states with `HashTile` and `SnapshotTimeline`). Pass progress props at 1 for finished states. Check each in the Studio with `<Shot grid />` where a screenshot is used.

**D4: hostile page, lab, evidence, Vultr.** 8, 9, 10, 12.
> Add slides 08, 09, 10 and 12. New components: `DefensePath` (gates with a stopped packet), `AttackCategories` (from `selectAttackCatalog()` grouped by category), `TamperSchematic`. Slide 09 uses the real screenshot `public/deck/R1.png`.

**D5: QA.**
> Run the section 8 checklist from docs/guide. List every number on every slide with its evidence path, and fix any that is typed by hand.

If you only have time for seven slides, ship: 01, 03, 04, 05, 07, 10, 12. Those cover the product, the real task, containment, rewind, evidence and Vultr.

---

## 10. The new explainer types (summary)

You said the scenes need redrawing for a page that does not move. These are the formats the guide uses. Three reuse your components with progress at 1; five are new.

| Id | Name | Replaces (film) | Built from |
|---|---|---|---|
| E1 | Six verdicts grid | S0 six agents | new, data from `copy.s0.screens` |
| E2 | Four-node loop | S2 flow strip | new, labels from `copy.s2.flow` |
| E3 | Cutaway | S3 box and wall | `ContainerBox` + `EgressWall`, progress 1 |
| E4 | Attempt table | S3 phone-home beat | new, rows from the hook log events |
| E5 | Three-panel storyboard | S4 wipe and rewind animation | `FileLattice` + `HashTile` + `SnapshotTimeline` + `GhostContainer`, three fixed states |
| E6 | Defense path | S5 hostile page | new, gates from `copy.s5` and ledger |
| E7 | Fifteen by category | S6/Attack Lab | new, data from `selectAttackCatalog()` |
| E8 | Tamper schematic | S4 hash chain | new, small, labeled "schematic" |

Principle for all of them: **show the end state, and show the one thing that stopped something.** A video can build suspense; a slide has to show the result and the mechanism together, so every explainer has the evidence (a hash, a host, a count) printed right next to the drawing.
