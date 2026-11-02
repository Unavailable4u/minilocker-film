### PATCH 05 - UI kit A: window, header nav, primitives

**Needs:** 00, 01
**Paste existing:** `docs/PATCH_NOTES.md`, `src/config/theme.ts`, `src/config/copy.ts`, `src/config/focus.ts`, `src/ui/Mark.tsx`, `src/ui/theme.css`
**Paste reference (draft repo):** `frontend/src/index.css` (all), `frontend/src/ui.tsx` (all), `frontend/src/App.tsx` (the header JSX and the SCREENS array only)
**Attach from BIBLE:** section 4, section 10 (Window and header)

```
PATCH 05 - UI kit A: AppWindow, header with 6-screen nav, and primitives (faithful MiniLocker look).

GOAL: the static, props-driven building blocks, pixel-faithful to the pasted source. No story logic. Translate every Tailwind class in the source to explicit inline styles using the theme constants (the film has no Tailwind).

CREATE (each a pure component; every visual state comes from props):
- src/ui/AppWindow.tsx: logical 1600x900, radius 14, 1 px border rgba(255,255,255,.08), shadow 0 40px 120px rgba(0,0,0,.65), the app background (paper + the two soft glows + the 44 px engineering grid, from index.css), no browser chrome. Layout: header (about 60 px) then a body slot. Prop-driven faint crimson rim light.
- src/ui/Header.tsx: exactly the source header: 40 px round Mark badge with accent glow, wordmark "Mini" ink + "Locker" accent-ink (CMU Serif 700, 1.55rem at 17 px root), the small-caps subtitle "a blast-radius ledger for AI agents", nav of the 6 screens (Workspace, Timeline, Attack Lab, Report, Sessions, Infra) each with its italic index number, the active one bold with a 3 px accent underline and glow. The underline must be able to SLIDE between tabs: props { active: number (fractional allowed), tabHighlight?: number }. Right cluster: status Chip (task id + status, running state with Pulse), theme toggle button (moon), API token field (masked dots, key icon, a small applied tick). Props drive all of it: { activeScreen, taskId, status, tokenApplied }.
- src/ui/primitives.tsx: Chip (tones mute/ok/bad/warn/info, small caps, hatch for bad), Card, Label, Btn (primary/ghost/sm, press state prop), Spin (progress-driven rotation by prop), Pulse, Meter, Donut (segments, center slot), Segmented, SectionHead, Kbd; plus the tone tables (INK, EDGE, WASH, BAR, VAR) ported from ui.tsx.
- If the real geometry differs from src/config/focus.ts, resend focus.ts corrected and note it.
- A dev-only composition "DevShell" (register in Root.tsx, resend whole file): the window with header at active = 0, 1.5, 2; every primitive in every tone; the Donut at 0, 9/15, 15/15.

CHECK: npx tsc --noEmit ; stills of DevShell ; side-by-side with the real app at 1920x1080 and 125% zoom: sizes, spacing, colors, the underline glow must match.
```
