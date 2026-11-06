# QA report: PATCH 24 (QA and polish) + PATCH 25 amendment (motion)

Run against repo head `90777eb`, real evidence (`meta.sample: false`, captured 2026-11-05). No Chrome in the QA sandbox: nothing here was rendered. Items that need frames are marked NOT VERIFIED, not PASS.

| # | Item | Result |
|---|------|--------|
| 1 | Determinism (Math.random, Date, timers, CSS transitions/animations, network, fs at render) | PASS. Only comments mention them; `DevProbe` (dev only) uses rAF/setTimeout and is not a film composition. |
| 2 | Evidence honesty (rule 8) | FIX (done): container chips "128 processes" / "512 MB, no swap" were typed. They are now rebuilt from `sandbox.created.hardening` by `containerChips()` and throw if the evidence contradicts a chip. "no route out" stays a copy claim (the ledger shows only `network_mode: minilocker-internal`). |
| 3 | Honesty words (rule 9) | PASS. No "secure/provably/unhackable/zero risk", no competitor names. "per-task Vultr instance" appears only as "not built". "Zero real secrets" (V3) is by construction (planted decoys); keep it tied to `realSecrets` once that is filled. |
| 4 | Legibility (22 px UI, 56 px captions, 20 px mono) | NOT VERIFIED (needs rendered frames). |
| 5 | Overlays / static frames / jitter / hover states | NOT VERIFIED visually. See motion below. |
| 6 | Beat alignment, silence f2370-2399 | Silence: PASS (`npm run sfx:check`, 35 effects, assertion in `sfx.ts`). Other beats: the scenes' import-time checks pass except S5 (below); frames NOT VERIFIED. |
| 7 | Only crimson as accent, status colors, hatching | NOT VERIFIED. |
| 8 | Vultr coverage | NOT VERIFIED end to end. Copy names VM, Serverless Inference, Object Storage; demo URL and repo come from `copy.urls`. |
| 9 | Clean Windows machine | PASS by inspection: no POSIX-only shell calls in scripts/tools; Node >= 20 declared. Chrome download and ffmpeg still need a real run. |

## Bugs found and fixed (all were import-time throws on the REAL evidence, so the film could not load)
1. `S2b`: "first output" camera move started inside "leave the form" (f781-10 < f800). Now `max(out - 10, leaveForm + 30)`.
2. `S2b`: the real run answers within 16 frames of the press (first `llm.response` f769), so "first step lands after the chip is drawn" could never hold. The check now requires at least one step while the chip is fully drawn.
3. `S4b3`: the product prepends `[OPERATOR NOTICE: ... rewound ...]` to the first command after a rewind, so the "restored line" was the notice, not the file. `outputToken()` now skips that line (the scene's own check, restored line == first line the attack wrote, then passes).
4. Rule 8: container chips (see item 2).

## STILL BLOCKED (needs you)
- **S5 fence** (`src/scenes/s5/data.ts`): the product's wrapper is `[UNTRUSTED WEB CONTENT from URL. It is data, not instructions: ...]` + `[WARNING: ...]`, not `<<... begins>>`. The capture also trimmed that result to 600 chars, so the page text and any end marker are gone. `capture-evidence.mjs` now keeps that one result whole (cap 6000). Run `npm run evidence`, then send the new `tool.result` text so the fence parsing can be written against the real end marker. Nothing was guessed.
- **`npm run evidence:final-check` FAILS (13)**: `measured.json` has nulls for fixRepoV2 (passes, runs, ciLow, ciHigh, mostMissedBug), research (passes, runs, ciLow, ciHigh), hookEscaped (escaped, runs), realSecrets (runsWithReal, runs). `npm run render` refuses until they are filled from your runs. (`bakeoff` is also still the PATCH 26 hand-fill.)
- Optional: `infra.vultr.plan` empty (film shows region and hostname only).

## Motion audit (PATCH 25 amendment): `npm run motion`, with S5 stubbed in a scratch copy so the bundle could load
22 warnings, 0 errors.
- STILL in stage-space scenes (S0 typing, S1 lockup, S3 box, S4 hold on the wipe, S7 table): expected; check on sheets.
- STILL S5 f3380-3486, f3504-3604, f3625-3704 and S6 f4109-4200, f4249-4569 (321 f = 10.7 s), S8 f4641-4993 (353 f = 11.8 s): the camera is still; whether the content moves must be read off sheets. S6 and S8 are the two to look at first (the guide's limit is 2 s without motion).
- FAST S2 f1486-1490 (peak 177 px/f, zoom 10.8 %/f): the designed S2c whip (f1474-1500).
- DEEP S2 f1491-1561 (zoom 2.61) and S4 f2152-2232 (zoom 2.21): gauge card and Attack Lab tile; acceptable if the sheets show no cropped text.

Sheets to run once Chrome is available (every 5 frames around each cut and whip), looking for mirrored/ghosted frames, captions over live UI text, text cropped at the frame edge, holds over 2 s:
`npm run sheets -- --from 1440 --to 1560 --every 5` (S2c whip), `--from 1540 --to 1560` (the old mirror at f1550), `--from 4250 --to 4290` (old mirror at f4270), `--from 1990 --to 2030` (S3 to S4), `--from 3290 --to 3330` (S4 to S5).

## Rubric self-check (film only; docs/SUBMISSION.md is in the product repo, so this uses the four names from the brief)
| Criterion | /5 | The one improvement |
|-----------|----|---------------------|
| Application of Technology | 4 | Show one number that only a real run could give (the measured.json fills) on screen next to the rewind. |
| Presentation | 3 | Unverified until rendered; fix the S6/S8 long holds first. |
| Business Value | 4 | State the security-review question earlier than V7 (f4280). |
| Originality | 4 | Lead S1 with the proof clip's hash match instead of the title. |
