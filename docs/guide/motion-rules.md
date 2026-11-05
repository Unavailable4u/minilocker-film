# MOTION RULES (patch 25)

These rules come from the first full review of the film (contact sheets of all 5100 frames, plus a numeric audit of the camera). Every scene patch obeys them.
They are also pasted into `docs/guide/context-header.md`, so `tools/make-prompt.mjs` puts them into every prompt.

1. **No shot is still.** A hold longer than 60 frames (2 s) needs a camera move: use `holdShot(frame, end, target, { push })` from `src/config/camera.ts`
   (ease in, then a slow linear push of 3-5 %). The float in `Camera.tsx` (5 px, 0.4 % breathing) is only the floor, not a substitute.
   In a scene whose action is in STAGE space (explainers), the explainer must move too (a slow push or a parallax against the app).
2. **Moves have length.** Camera moves take at least 24 frames; a whip (one per scene at most, only for a hand-over) at least 26. After a move the camera holds
   10 frames before the next one starts. Peak pan speed stays under 160 px/frame (`npm run motion` flags FAST).
3. **Zoom is for reading.** Any shot with text the viewer must read stays at zoom 2.0 or lower. 2.6 is for a single gauge card, for at most 60 frames, with the
   caption moved clear of the window edge. (`npm run motion` flags DEEP.)
4. **Frame the window, not a corner.** Every scene supplies keyframes for its WHOLE range, including its last frame. A scene with no keyframes inherits the
   previous scene's last pose (that is how S5/S6 sat on a cropped corner for 60 s). The first keyframe of a scene starts at or after the previous scene's
   last arrival, from the same pose: no jump.
5. **No `backdrop-filter`, anywhere.** In Chrome it draws a mirrored, upside-down copy of the window under the camera's 3D transform (seen at f1550 and f4270).
   Step the app back with `appLook(frame)` (`src/scenes/appLook.ts`: blur on the app layer) plus a plain dim overlay. `theme.css` switches `backdrop-filter`
   off inside `.film-app-layer`.
6. **Captions never sit on live UI text.** Use the strip under the window (`closingWide`, `CAPTION_DROP`) or move the camera, not the caption over a card.
7. **Every number on a beat.** Cuts, reveals, impacts land on multiples of 15. Moves use the signature ease; linear only for typing, packets, creeps.
8. **Check before you hand over.** Run `npm run motion` (no STILL over 75 f outside stage-space scenes, no unexplained FAST or DEEP) and
   `npm run sheets -- --from A --to B --every 4` on your range; look at the sheets. Paste the `npm run motion` summary in your reply.
