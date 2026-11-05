## BIBLE 10. Recreated UI spec (what to port from the MiniLocker repo)

Rule: port faithfully, translate Tailwind to inline styles. 1rem = 17 px (html font-size 17px). Logical canvas 1600x900. Fidelity beats invention: if something is unclear, the pasted source file wins.

**10.1 Window and header** (`App.tsx` header, `ui.tsx`, `index.css`). Header height about 60 px, border-bottom rule, translucent paper. Left: 40 px circular badge (border rule-2, sheet fill, accent glow) holding the Mark at 30 px; wordmark "Mini" ink + "Locker" accent-ink at 1.55rem display; small-caps subtitle "a blast-radius ledger for AI agents". Nav: six items (Workspace, Timeline, Attack Lab, Report, Sessions, Infra), each with an italic index number and 1.04rem label; active = bold, 3 px accent underline (rounded top, glow 0 0 14px accent). Right: status Chip (task id + status), theme button, token field.

**10.2 Workspace** (`App.tsx` Workspace, `components.tsx`, `Terminal.tsx`). Grid 374 | 1fr | 459. Left: TaskForm on top (scenario select, free-text, quick-fill chips, strict/observe Segmented with italic help line, hold select, primary "Run in sandbox" button), then StepStream. Center: tab pills (terminal | browser | files) over a panel with the terminal (bg #08080b, CMU Typewriter). Right: BlastPanel: RadiusDial at top, two-column gauge cards in order Network, Policy, Filesystem, Secrets, Compute, Time, then the wide Sandboxes card. Gauge text must be exactly what `gaugesOf` produces (ported unchanged).

**10.3 Attack Lab** (`AttackLab.tsx`). Summary bar: Donut 116 px stroke 10 ("N of 15 contained"), 15 tiles 32 px (glyph per verdict: check, cross, question, exclamation, dash, dot), status sentences, the primary "Run all attacks" button. Body: attack cards (title, 2-line summary, category chip, status word, per-card Run) and the detail pane (steps, policy decisions, egress rows, checks with pass/fail/unproven marks). Verdict tones: contained = ok blue, breached = bad hatched, inconclusive = warn.

**10.4 Report** (`Report.tsx`). Header with task id and outcome; nine dimension cards in `Object.entries(report.dimensions)` order with the per-dimension Headline picture and a measured / not-measured chip; ledger block with the "Verify ledger now" button and its result line.

**10.5 Infra** (`Infra.tsx`). Numbered panels with section marks (italic section sign + number), badges, Gauge meters (disk, memory), a wiring diagram of nodes joined by arrows, and the Vultr panel (hostname, region, plan, instance id; the public IP is NOT shown in the film).

**10.6 Fidelity checklist.** Same type scale and weights; same chip tones; hatching on flagged; hairlines 1 px rule; accent underline glow; focus ring 2 px accent; gauge subtitles word for word; ">=" nothing invented. Compare a still against the live app before moving on.
