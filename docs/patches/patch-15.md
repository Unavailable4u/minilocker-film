### PATCH 15 - S4a Rewind: Attack Lab and the wipe (f2100-2699)

**Needs:** 09, 11, 12
**Paste existing:** `docs/PATCH_NOTES.md`, `src/scenes/S4Rewind.tsx`, `src/scenes/s4/S4a.tsx`, `src/scenes/s4/S4b.tsx` (stubs), `src/config/script.ts`, `src/config/anchors.ts`, `src/config/filmState.ts`, `src/config/camera.ts`, `src/config/focus.ts`, `src/gfx/FileLattice.tsx`, `src/gfx/SnapshotTimeline.tsx`, `src/ui/AttackLabScreen.tsx`
**Attach from BIBLE:** section 6 (S4a), section 11 (B), section 8 (S4 copy), Appendix D

```
PATCH 15 - Scene S4 part A. Replace src/scenes/S4Rewind.tsx and src/scenes/s4/S4a.tsx completely; leave S4b untouched. S4Rewind.tsx concatenates S4A/S4B camera and cursor arrays, renders both overlays, and exports S4_CAMERA, S4_CURSOR, S4Rewind.

Part A covers f2100-f2699:
- f2100-2159 the header underline slides to "Attack Lab" (screen 3) while the camera lands on the screen: the verdict matrix (15 tiles, donut at "0 of 15 contained" before any run) and the card list.
- f2160-2219 cursor hovers across tiles (hover rings), selects rewind_after_rm_rf (title and category from evidence), clicks the card's Run at f2220.
- f2220-2339 the real steps appear one by one (write /workspace/precious.txt; the wipe command; rewind; cat) while the FileLattice stage appears over the left half: lattice intact, a snapshot node "1" lands on the SnapshotTimeline with the first 8 hex of the real snapshot hash (from the attack's events/report; if unavailable show only "snapshot 1"). Caption "Real work. Snapshot after every step."
- f2300-2339 the wipe command types out large in mono (the real command from the step).
- f2340-2399 THE WIPE: tiles shatter outward, 30% desaturation, 3% camera punch with a short seeded shake; at f2370 total audio silence (the audio patch hooks this frame; add it to the exported cue anchors list) and the real wipe output (WIPED_0 or whatever the step's result says) appears huge in vermilion; caption "Everything gone."
- f2400-2699 handled by S4b except the first 2 beats: f2400 caption slot "Rewind." is S4b's.
Export S4A_CAMERA, S4A_CURSOR and the overlay. Cursor arrives and leaves with organic curves; the only click is the Run button.

CHECK: npx tsc --noEmit ; stills at f2130, f2200, f2240, f2320, f2350, f2380.
```
