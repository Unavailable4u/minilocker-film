### PATCH 19 - S7 Value + competitive (f4260-4559)

**Needs:** 10, 12
**Paste existing:** `docs/PATCH_NOTES.md`, `src/scenes/S7Value.tsx` (stub), `src/config/camera.ts`, `src/config/copy.ts`, `src/gfx/CompareTable.tsx`, `src/fx/KineticText.tsx`, `src/fx/Caption.tsx`
**Attach from BIBLE:** section 6 (S7), section 8

```
PATCH 19 - Scene S7 Value. Replace src/scenes/S7Value.tsx completely.

The app window defocuses and drops behind (blur ramp to 10 px, brightness .35) on f4260; text-only scene on the graphite stage.
- f4260-4379 (2 bars) italic CMU Serif line typed by KineticText: "The reviewer's first question: what could it touch, and how do you know?"; then a Blast Radius report document glides into a "change ticket" card (simple code-built cards, hairlines, labelled "attach the report" in copy.ts).
- f4380-4559 (3 bars) CompareTable builds row by row on beats (f4380, 4410, 4440), then the MiniLocker row grows with the accent edge at f4470 and the sentence "A container gives you a promise. MiniLocker gives you a measurement." lands as caption at f4500.
Provide S7_CAMERA (slow drift, no big moves), S7_CURSOR (empty), overlay. No competitor names anywhere; only generic categories from copy.ts.

CHECK: npx tsc --noEmit ; stills at f4290, f4350, f4400, f4440, f4480, f4540.
```
