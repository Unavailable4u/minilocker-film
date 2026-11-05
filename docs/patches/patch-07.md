### PATCH 07 - UI kit C: Attack Lab, Report, Infra

**Needs:** 02, 05
**Paste existing:** `docs/PATCH_NOTES.md`, `src/config/theme.ts`, `src/ui/primitives.tsx`, `src/lib/derive.ts`, `src/data/types.ts`, `src/data/select.ts`
**Paste reference (MiniLocker repo):** `frontend/src/AttackLab.tsx`, `frontend/src/Report.tsx`, `frontend/src/Infra.tsx`, `frontend/src/Timeline.tsx`
**Attach from BIBLE:** section 10 (Attack Lab, Report, Infra), Appendix D

```
PATCH 07 - UI kit C: AttackLab, Report and Infra screens as dumb components.

GOAL: the three screens the film cuts to, faithful to the source, driven by props computed from evidence.

CREATE:
- src/ui/AttackLabScreen.tsx: the summary bar (Donut "N of 15 contained", the 15 verdict tiles with glyphs, the status sentences, the "Run all attacks" primary button), the attack card list (title, summary clamp, category chip, status word, per-card Run button), and the detail pane for the selected attack (steps list with tool/text/result, policy decisions, egress rows, the checks list with pass / fail / unproven / skip marks). Props: { tiles: { name, state: "notrun"|"running"|"contained"|"breached"|"inconclusive" }[], selected, runningName, stepsVisible: number, stepProgress: number[], checksVisible: number, checkProgress: number[], verdictStamp: number /*0..1*/, press?: "runAll"|"run" }. All titles, summaries, step texts and check labels come from AttackResult/AttackInfo objects passed by the caller.
- src/ui/ReportScreen.tsx: header (task id, outcome, summary), the 9 DimensionCards in the real order and their Headline pictures (port the Headline function), the ledger block with "Verify ledger now" button and its result line (verified / not verified, events, head hash short), and the footer note. Props: { report, reveal: number[] /*per card 0..1*/, verify: { state:"idle"|"running"|"done", progress }, pressVerify }. "not measured" cards use the source's dotted style and italic note, never a zero.
- src/ui/InfraScreen.tsx: the numbered panels (section marks like the source), the wiring diagram nodes with arrows, host/docker/egress/inference/storage/vultr panels, the Gauge meters. Props { infra, reveal: number[] }.
- src/ui/TimelineScreen.tsx: only if cheap (it is not used in the film body); otherwise export a clear stub and say so in PATCH_NOTES.
- A dev-only composition "DevScreens" (register in Root.tsx, resend whole file) cycling through AttackLab (empty, 1 attack done, selected rewind with its steps and checks), Report (cards revealing), Infra.

CHECK: npx tsc --noEmit ; stills of DevScreens ; compare each to the real app screen: type scale, spacing, chip tones, hatching on flagged items.
```
