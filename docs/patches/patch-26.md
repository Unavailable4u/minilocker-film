### PATCH 26 - Real-repo marketing pass

**Needs:** all
**Paste existing:** `docs/PATCH_NOTES.md`, `docs/notes/real-repo-facts.md`, `src/config/copy.ts`, `src/data/types.ts`, `src/data/select.ts`, `src/scenes/S8Vultr.tsx`, `scripts/capture-evidence.mjs`, `scripts/validate-evidence.mjs`, `evidence/measured.json`
**Attach from BIBLE:** section 6 (storyboard), section 8 (captions)

```
PATCH 26 - Real-repo marketing pass.

Context: the film now targets the real product, https://github.com/shaikh-dotcom/MiniLocker (read docs/notes/real-repo-facts.md first; it lists what exists and what must never appear). Repo URL, demo URL, the S0 tag, the S4 caption, voice-over V4 and the optional Vultr plan are ALREADY changed in the files I paste. Do not redo them. Do not touch anything outside the four items below. Voice: short, confident, concrete, true. No new claims.

1. S8 inference chip: add a second line under "{host}/v1 - {model}", mono 20 px, ink-2: "picked from a {models}-model bake-off: {usablePct}% usable tool calls, p50 {p50Seconds} s". Every number comes from evidence.measured.bakeoff. Extend src/data/types.ts (bakeoff: { model, models, usablePct, p50Seconds } with null allowed), scripts/capture-evidence.mjs (read the four fields from measured.json), scripts/validate-evidence.mjs (final check: the model equals infra.inference.model, the numbers are finite, usablePct 0-100) and evidence/measured.json (add the keys, null by default). The second line is drawn ONLY when all four values are non-null; otherwise the chip looks exactly as before. Never type the numbers in a component. (I will fill measured.json by hand from the product repo's docs/notes/model-selection.md.)

2. S8 object-storage chip: replace the words-only facts "S3-compatible bucket" with "{storage.endpoint_host} - {storage.bucket}" read from evidence.infra.storage through selectInfra(). Keep copy.gfxC.storageFacts as the fallback when either value is missing. Keep the chip at most two lines at mono 20 px; shorten with an ellipsis in the middle of the host only if it does not fit, never the bucket. The VM chip keeps showing the region (the plan is optional now) so both chips read EWR / ewr1.

3. Wording audit of S4 and S5 (no new strings unless a line below fails): the Attack Lab attacks are scripted, so no caption, callout, voice-over line or comment in src/scenes/s4, src/scenes/s5, src/config/copy.ts may say or imply that the model or the agent chose to wipe, leak or obey. Allowed subjects: a command, a script, a page, the attack, the sandbox, MiniLocker. List every line you changed with its file and old/new text. S5's "the compromised agent runs" label may stay: it is the attack's own description.

4. S9 and S6 consistency check (read-only unless it fails): confirm the S9 end card still passes its own layout check with the longer repo URL, that it shows the demo host from evidence.meta.baseUrl (minilocker.duckdns.org) and the repo URL from copy.urls.repo, and that S6's "CI green" chip is drawn only when evidence.ci.conclusion is "success". Report PASS or the exact fix.

CHECK: npx tsc --noEmit ; npm run evidence:check ; npm run check -- --frames=4650,4720,4780,5060 ; open out/stills and confirm the two S8 chips, the S9 end card and that nothing overflows its box. Then `npm run render` as usual. Append a PATCH 26 entry to docs/PATCH_NOTES.md.
```
