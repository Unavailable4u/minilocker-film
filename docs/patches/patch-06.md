### PATCH 06 - UI kit B: Workspace and the Blast panel

**Needs:** 01, 02, 04, 05
**Paste existing:** `docs/PATCH_NOTES.md`, `src/config/theme.ts`, `src/ui/primitives.tsx`, `src/ui/RadiusDial.tsx`, `src/ui/TerminalView.tsx`, `src/lib/derive.ts`, `src/data/types.ts`
**Paste reference (MiniLocker repo):** `frontend/src/components.tsx` (all), `frontend/src/Terminal.tsx`, `frontend/src/App.tsx` (the Workspace function only)
**Attach from BIBLE:** section 10 (Workspace, Blast panel), Appendix C

```
PATCH 06 - UI kit B: Workspace (TaskForm, StepStream, Terminal pane) and the Blast panel with gauges and dial.

GOAL: the Workspace screen as dumb components. Every number in the gauges is computed by the PORTED derive functions from real events (rule 8), never typed.

CREATE:
- src/ui/TaskForm.tsx: faithful to the source: scenario select (value shown e.g. the scenario title), free-text area with placeholder "Describe a task for the agent...", the policy-profile Segmented (strict | observe) with its help line in italics, the hold select ("hold 1 min"), the primary button "Run in sandbox" with idle / press / running ("Running in sandbox" + spinner) states. Props carry the select values, focus, press and hover.
- src/ui/StepStream.tsx: the left-column step list. Rows come from events passed in (use groupLines/describe from derive and the tool calls from toolLine): each row shows a status glyph, the one-line description, tone colors with hatching for bad, and "x30" counts for merged lines. Props { rows, newestIndex, rowProgress[] } so rows slide in with a 14 px rise + fade over 8 f.
- src/ui/TerminalPane.tsx: the center pane: tab strip (terminal | browser | files, the active one a pill with accent border and glow) above a panel containing TerminalView. Props { tab, lines, caret... }.
- src/ui/BlastPanel.tsx: the right column exactly like the source: the RadiusDial on top (reuse src/ui/RadiusDial.tsx; map gauge tones to dial dim states), then the gauge cards in the source order (Network, Policy, Filesystem, Secrets, Compute, Time) and the wide Sandboxes card. Gauge values and subtitles come from a function gaugesOf(events, running) ported UNCHANGED from the source (move it into src/lib/gauges.ts). Unmeasured gauges show "-" and the source's exact subtitle ("measured when the sandbox is destroyed" / "no task yet"). Props: { events, running, reveal: number[] /*per gauge 0..1 for flip-in*/, flash?: key }.
- src/ui/Workspace.tsx: composes TaskForm + StepStream (left, 374), TerminalPane (center), BlastPanel (right, 459) in the real grid.
- A dev-only composition "DevWorkspace" (register in Root.tsx, resend whole file) that plays the sample task's events through the gauges and step stream over 600 frames using LedgerClock, to prove the derive port and the sub-text exactly.

CHECK: npx tsc --noEmit ; stills of DevWorkspace at no-task, mid-run, after destroy ; gauge subtitles must read exactly like the real app ("blocked - N allowed - N hosts", "real in sandbox - N of N decoys read - N used", "peak of 512 - N/128 pids - N s cpu").
```
