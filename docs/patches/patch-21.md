### PATCH 21 - S9 Outro (f4980-5099)

**Needs:** 12
**Paste existing:** `docs/PATCH_NOTES.md`, `src/scenes/S9Outro.tsx` (stub), `src/scenes/S1Title.tsx`, `src/ui/Mark.tsx`, `src/ui/RadiusDial.tsx`, `src/ui/VultrLogo.tsx`, `src/config/camera.ts`, `src/config/copy.ts`, `src/fx/KineticText.tsx`, `src/fx/GridPaper.tsx`
**Attach from BIBLE:** section 6 (S9), section 8

```
PATCH 21 - Scene S9 Outro. Replace src/scenes/S9Outro.tsx completely.

f4980-5019 the stage clears; the dial reforms and COLLAPSES into the Mark (reverse of S1) on the beat; f5010 lockup "MiniLocker"; f5025 tagline "See exactly what it could not touch."; f5040-5099 a quiet block: demo URL (host from evidence.meta.baseUrl, mono), repo URL (copy.ts), "MIT licensed", and "Built on Vultr" with VultrLogo. NO fade to black: the last 30 frames are a clean, thumbnail-worthy hold with the dial glow breathing very slowly. Provide S9_CAMERA (tiny push), S9_CURSOR (empty), overlay. Caption none.

CHECK: npx tsc --noEmit ; stills at f4990, f5020, f5050, f5075, f5099.
```
