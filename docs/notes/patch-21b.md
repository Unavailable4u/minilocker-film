## Patch 21b - S9 Outro, part B: the quiet block and the clean hold (f5040-5099)

**Applies on top of** repo head `5ea5372` (patch 21-0 already applied). **Does not touch** `shared.ts`, `S9Outro.tsx`, `stageState.ts`, `src/config/*`, `MiniLockerFilm.tsx`.
**Changed files:** `src/scenes/s9/S9b.tsx` (the stub, replaced completely), **new:** `docs/notes/patch-21b.md` (this file; the merge step appends it to `docs/PATCH_NOTES.md` and deletes `docs/notes/`).

### What it contains

- Exports `S9b: React.FC<SceneOverlayProps>`, `S9B_CUE_ANCHORS` (`rule` 5040, `demo` 5040, `repo` 5055, `legal` 5057, `settled` 5069, all read from `S9_TIMING`, none typed twice) and `hostOf(baseUrl)` (exported so it can be tested).
- **Hairline** (f5040-5052): 2 px, `S9_LAYOUT.rule.w` wide, centred at (cx, `rule.y`), `theme.ink3` at 50 %, `scaleX` 0 -> 1 from its centre, signature ease, `S9_TIMING.revealFrames` (12 f). It occupies y 699-701.
- **Demo host** (row `S9_LAYOUT.demo`, from f5040): the host of `selectMeta().baseUrl`, CMU Typewriter, 40 px, `theme.ink`. `hostOf` uses `new URL(baseUrl).host` in a try/catch; if that throws, or returns an empty host, it strips the protocol and everything from the first `/` (also `?` and `#`) by hand. `copy.urls.demo` is never read. **On the SAMPLE evidence (`baseUrl` "") the row is not drawn, one `console.warn` is logged (module flag), and no other row moves.**
- **Repo URL** (row `repo`, from f5055): `copy.urls.repo` as written, CMU Typewriter, 30 px, `theme.ink2`.
- **Legal row** (row `legal`, from f5057): `copy.brand.license`, a 6 px round separator (a circle, `theme.ink3`), `copy.brand.builtOn`, then `<VultrLogo height={40}/>`, one centred flex line, CMU Serif 30 px, `theme.ink3`. Every text item has `line-height` = the logo height and the line is `align-items: center`, so text and logo share one centre. When `hasVultrLogo` is false the logo is left out (no "Built on Vultr Vultr").
- **Reveals**: each row is a masked rise (S1Title's `Title`): an overflow-hidden box at the row's fixed top and height, content `translateY` 108 % -> 0, signature ease, 12 f, from `S9_TIMING.demo` / `repo` / `legal`. Everything is settled at f5069. No glow, shadow, ring, counter, blur or fade.
- **Clean hold** (f5070-5099): the overlay reads `Math.min(frame, S9_TIMING.settled)`, so no animation can depend on a later frame. Server-rendered markup at f5069 is byte-identical to every frame f5070-f5099 (with and without a `baseUrl`).
- **Import-time checks** (throw `S9b: ...` with the numbers): demo and repo starts on a beat; every start inside f5040 and settled by f5069 (`start + revealFrames <= settled`); demo reveal done before the repo row; legal not before repo; `settled <= hold - 1`; `hold <= S9_END`; each row at or below `rule.y`, above `bottom` (984), and not overlapping the row above (the hairline counts as y 701); logo not taller than its row; hairline, demo host, repo URL (mono advance) and legal row (serif advance, logo counted as 2.2 x its height, 18 px gaps) each fit `1920 - 2 * safeX`; `copy.urls.repo` not empty.

Decisions the prompt left open: the 18 px gap is used between **all** legal items (the prompt fixes it only before the logo); the hairline's 12 f is `S9_TIMING.revealFrames` (not a second copy of 12); the legal start (f5057) is deliberately not required to be on a beat (the contract puts it at repo + 2).

### Seams with 21a

- No shared pixels: 21b draws only at or below y 699; 21a draws only above `rule.y` (700). Same centre `S9_LAYOUT.cx` (960) for every row.
- 21b does not read `s9Breath`, the dial, the Mark or anything of 21a's. The Mark's glow wash must not reach y 700 (merge checklist item 4); that cannot be checked until 21a is merged.
- Nothing was changed in `shared.ts`; no contract number needed to change.

### Verification

- `npx tsc --noEmit`: clean.
- `npm run motion`: the S9 line is `S9  120  1.07-1.11  27`, no STILL / FAST / DEEP in S9, no BACKDROP anywhere. The 22 warnings it lists are all in S0-S8 and were not touched by this patch.
- Import-time checks: 12 mutations of `shared.ts` (off-beat demo and repo, late reveal, late settled, late legal, hold past the scene, overlapping rows, row below the margin, row above the hairline, too-wide repo URL, taller logo, too-wide hairline) each threw `S9b: ...` with the offending numbers; the unmodified contract imports clean. (Done in a scratch copy; `shared.ts` is untouched.)
- `hostOf`: 12 cases (empty, whitespace, with and without path/query/port, no protocol, `host:port` without protocol, upper case) all correct.
- Server-rendered markup: empty at f5039; hairline only at f5040; repo row at f5055; legal row at f5057; f5069 == f5070..f5099. Re-run with a non-empty `baseUrl` (scratch copy of `evidence.json` only, `https://minilocker.example.com/app?x=1`): the row shows `minilocker.example.com` only.
- Stills rendered with Remotion and Chrome and looked at: f5040, f5048, f5060, f5075, f5099 (with the made-up `baseUrl` above) and f5099 on the SAMPLE evidence (demo row empty, hairline / repo / legal in place, nothing below y 984). The top 60 % is empty because 21a is not merged.
- **Not verified:** the seam with 21a (not merged); a real capture's `baseUrl` (only a made-up one was used); a full render of the clip in motion (only stills and a frame-by-frame markup check).

### Warnings (things outside 21b)

1. **The installed Vultr logo is the on-white variant.** `public/brand/vultr-logo.svg` is `logo__on-white` (wordmark fill `#142149`, dark navy). On the dark stage the "VULTR" wordmark is almost invisible; only the blue mark reads. Install the official white / monochrome-on-dark SVG and run `npm run assets`. 21b does not recolour it (the film never redraws the logo, and CSS filters are not allowed).
2. **A mouse cursor is visible through all of S9** (an arrow near x 527-533, y 641-648). It is also there at head `5ea5372` with the stub (checked), so it is not from 21b: the film-level `<Cursor>` in `MiniLockerFilm.tsx` stays on screen at its last waypoint and drifts with the camera's push, although `S9_CURSOR` is empty and the contract says the cursor is hidden. It will be in the last frame and the thumbnail, and it moves during the clean hold. The fix belongs to `MiniLockerFilm.tsx` or `fx/Cursor.tsx` (hide it from f4980), not to a part file.
3. `evidence.meta.baseUrl` is empty in the repo's SAMPLE evidence, so the demo row is empty in every render until a real capture is made. `npm run evidence:final-check` refuses an empty `baseUrl` on a real capture.

### Known issues

- The first frame of each row (f5040, f5055, f5057) is blank by design (progress 0: the content is fully below its mask).
- Row width is the estimate used by the contract (`estimateWidth`); a very long host (about 82 mono characters or more) would throw at import rather than shrink.
