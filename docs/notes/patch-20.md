# PATCH 20 - S8 On Vultr + limits (f4560-4979)

## Files
- `src/scenes/S8Vultr.tsx` - replaces the stub: timing, camera, cursor, overlay (diagram, limits card, caption).
- `src/scenes/stageState.ts` - `APP_RECEDE` + `appRecedeAmount()`; `appReveal()` applies it to the app's opacity (both branches).
- `src/scenes/appLook.ts` - the app-layer blur ramp for the step-back (`b8`).

## Timing (global frames)
| frames | what |
|---|---|
| 4560-4619 | the real Infra screen (script.ts already selects it and flashes its panels); overlay draws nothing |
| 4620-4649 | app steps back (dim to 15 %, blur 12 px), camera pulls back with it |
| 4620-4664 | ArchitectureDiagram builds (frame, 12 nodes, 12 edges) |
| 4650 / 4710 / 4770 | the three Vultr chips light (`VULTR.chipFrames` in script.ts) |
| 4665 / 4710 / 4755 | highlight path task, model, storage |
| 4785-4799 | diagram fades out |
| 4800 / 4845 / 4890 | LimitsCard heading + limit 1, limit 2, limit 3 |
| 4900 | caption (leaves at the cut) |
| 4920 | footnote `SECURITY.md` |

## Decisions
- The app stays stepped back through S9's clear (f4980-5004). `appReveal` multiplies the recede into BOTH its branches, otherwise the app would jump back to full opacity at f4980.
- Chip beats come from `VULTR.chipFrames` (script.ts), not retyped.
- Evidence checks (Vultr available, region/plan, inference host/model on Vultr, attached Vultr bucket) run when an S8 frame renders, not at import, so a missing capture breaks S8 only. Sample evidence is not refused here (the rest of the film accepts it; the render script refuses it).
- The Object Storage chip uses `copy.gfxC.storageFacts` ("S3-compatible bucket"). BIBLE 6 says "artifacts, SHA-256 in the ledger"; change `storageFacts` in copy.ts if you want that wording.
- S6's last cursor waypoint has no `hide`, so S8_CURSOR has one waypoint: the arrow fades out in place on f4560.
- Camera: a 30 f move onto the window (f4560), the 30 f step-back (f4620), then a 5 % linear push to f4979. `npm run motion` still lists one STILL run in S8 (the push is slow); the explainers move on stage (packets, reveals), as for S3/S6/S7.

## Checks
`npx tsc --noEmit` clean; `npm run motion` loads all scenes, no FAST or DEEP in S8. Stills looked at: f4580, f4640, f4700, f4780, f4786, f4960.
