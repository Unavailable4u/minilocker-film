### PATCH 11 - Film script and the persistent FilmApp

**Needs:** 02-07 (and 08-10 for types)
**Paste existing:** `docs/PATCH_NOTES.md` and ALL files in `src/ui/`, `src/config/`, `src/data/`, `src/lib/`
**Attach from BIBLE:** section 6 (all scenes: the frame numbers), section 10, section 7 (evidence selectors)

```
PATCH 11 - The whole choreography as data, and the persistent FilmApp.

GOAL: one component, <FilmApp frame={...}/>, that shows the correct complete MiniLocker app state at ANY global frame from 600 to 3719 (S2 to S5 content) and the Report/Infra states for S6/S8, driven by script.ts + evidence. Scenes later only add camera, cursor and overlays.

CREATE:
- src/config/script.ts: the choreography as typed data with frame numbers from BIBLE section 6, split by scene but exported together: screen changes (workspace f600 / attack lab f2100 / browser tab f3300 / report f3720 / infra f4560 and the nav underline slide windows), TaskForm interactions (select, profile, hold, press at f750), the LedgerClock segments for the fix task (read, run tests red, patch, re-run green, finish, hidden check, destroy), per-gauge reveal windows, Attack Lab interactions (tile hover, select rewind_after_rm_rf, run f2220, step reveals, wipe f2340, rewind f2400, checks f2700, verdict f2780), hostile-page beats (f3360-f3719), Report beats (cards f3780, verify click f3960, claims f4080), the Vultr beats. Every number is in the data file so a non-expert can retime. Derive the end frames of typing from typing.ts helpers.
- src/config/anchors.ts: logical coordinates of the key UI targets over time as functions of frame (task select, profile segment, hold select, Run button, tile for each attack, Run-attack button, Verify ledger button, nav tabs 1-6, a card in each screen) for cursor and callouts.
- src/config/filmState.ts: useFilmState(frame) (pure) selecting from script.ts + evidence and returning one typed FilmState: activeScreen (fractional), header state, workspace state (form values, rows, terminal lines, caret, gauges reveal, events visible up to the clock), attack-lab state, report state, infra state, camera-independent scroll offsets.
- src/ui/FilmApp.tsx: composes AppWindow + Header + the active screen(s) from FilmState. During a screen change both screens may be mounted for the slide; the camera does the actual move (the nav underline slides, content swaps on the beat).
- A dev-only composition "DevApp" (register in Root.tsx, resend whole file) rendering <FilmApp/> from f600 to f4979 at full 1920x1080 without camera.

CHECK: npx tsc --noEmit ; stills of DevApp at f760, f1000, f1260, f1700, f2230, f2350, f2700, f3500, f3900, f4100 ; each must match the storyboard in BIBLE section 6 (screen, statuses, text), and every number visible must be traceable to evidence.json.
```
