### PATCH 03 - FX toolkit

**Needs:** 00
**Paste existing:** `docs/PATCH_NOTES.md`, `src/config/theme.ts`, `src/config/timeline.ts`, `src/config/copy.ts`, `src/lib/ease.ts`, `src/lib/spring.ts`, `src/lib/prng.ts`
**Attach from BIBLE:** section 4 (motion language), section 5 (camera), section 8 (caption and callout rules)

```
PATCH 03 - FX toolkit.

GOAL: virtual camera, cursor, and all overlay components, each pure and frame-driven, with typed data contracts the scene patches will fill.

DEFINE TYPES (src/config/camera.ts, exported):
- CameraKeyframe { frame, target (FocusName), padding, scaleBias, rotateX, rotateY, rotateZ, ease?, shake? }
- CursorWaypoint { frame, x, y, click?: boolean, hover?: string }  (coordinates in the LOGICAL 1600x900 space)

CREATE:
- src/config/focus.ts: named focus rectangles in logical coordinates for BIBLE section 10 layouts: nav, taskForm, stepStream, terminal, blastPanel, dial, gaugeSecrets, gaugeNetwork, gaugeCompute, attackSummary, attackGrid, attackDetail, reportGrid, verifyButton, infraDiagram, fullWindow. Derive from the real layout (header about 60 px, columns 374 | 767 | 459). Comment that UI patches may refine them and must update this file.
- src/fx/Camera.tsx: wraps children in one transform translate3d + scale + rotateX/Y/Z with perspective 1800px. Solves translate+scale to frame the target rect with padding, springing between keyframes with the camera spring. 2 px sinusoidal micro-drift so held shots never freeze. Tilt limits: 6 deg X / 5 deg Y normally, 14 deg in S1/S9. Optional "shake" amplitude (seeded, decays over 8 f) for impacts. Depth-of-field illusion: light blur (max 1.2 px) and 12% dim outside the focus via an overlay mask. Deterministic, no jitter at keyframe handoffs.
- src/fx/Cursor.tsx: crisp white arrow with soft shadow; Bezier paths between waypoints with ease-in-out and a slight overshoot-and-correct; never a straight line (seeded control points). Click: scale 0.88 to 1 over 4 f, crimson ring ripple (radius 6 to 28, opacity .5 to 0, 14 f). Export getCursorState(frame, waypoints) returning { x, y, pressed, hover }.
- src/fx/Caption.tsx: one line, bottom-center safe area, masked line-rise reveal, CMU Serif 700, tracking -0.01em, 56-76 px at 1080p, key word in accent-ink; optional mono sub-line. Props: text, highlight, startFrame, endFrame.
- src/fx/KineticText.tsx: staggered masked word reveal (3 f stagger) with optional underline draw. Used for the hook sentence and the title.
- src/fx/Callout.tsx: small glass chip (layered translucent fill + 1 px border), CMU Serif italic or mono, 22-26 px at 1080p, 5 words max, thin leader line and dot anchored to a point or focus target; spring in/out; must never cover what it points to. Variants: "note", "ok", "flag" (hatched).
- src/fx/StatNumeral.tsx: big mono numerals that count up/lock (props value, from, unit, startFrame, durationFrames), tabular figures.
- src/fx/Glow.tsx (radial bloom pulse), Grain.tsx (seeded, 3% opacity, re-seeded per frame), Vignette.tsx (12%), Spotlight.tsx (specular sweep), GridPaper.tsx (the app's engineering-paper grid: 44 px lines of rgba(255,32,82,.03) over two soft glows, perspective optional), Toast.tsx, KeyCap.tsx, Badge.tsx (mono pill such as "LIVE" or "RECONSTRUCTED FROM LEDGER", with a pulsing dot driven by props).
- A dev-only composition "DevFxSheet" (register in Root.tsx, resend whole file) exercising the camera between 3 focus targets, a cursor path with a click, a caption, a callout (all 3 variants), numerals counting, a badge and the glitch-free shake.

CHECK: npx tsc --noEmit ; open DevFxSheet in the Studio: camera moves are smooth, cursor curves with overshoot and ripples on click, caption/callout reveals are masked not faded.
```
