### PATCH 09 - Explainers B: file lattice, hash lock, hash chain, snapshot timeline

**Needs:** 03, 04
**Paste existing:** `docs/PATCH_NOTES.md`, `src/config/theme.ts`, `src/lib/ease.ts`, `src/lib/prng.ts`, `src/lib/hash.ts`
**Attach from BIBLE:** section 11 (B), section 6 (S4)

```
PATCH 09 - Explainer graphics B (src/gfx): FileLattice, HashTile, HashChain, SnapshotTimeline. The hero visuals.

GOAL: the wipe-and-rewind explainer that carries the film's biggest moment.

CREATE:
- src/gfx/FileLattice.tsx: a grid of file tiles (props: count, heroIndex, heroLabel, columns). Props drive state: intact (0..1), shatter (0..1: tiles break into 5-9 seeded shards that drift outward linearly with spin and fade), reassemble (0..1: shards return along eased curves into place with a small overshoot), desaturate. The hero tile is larger and shows its file name in mono. Deterministic shard geometry from the PRNG seeded per tile.
- src/gfx/HashTile.tsx: a tile's hash strip: shows a SHA-256 (props: finalHex, lockProgress) resolving left to right via lockHex; when locked, a check tick pops and the tile edge glows ok-blue. Shows "snapshot" hash above and "restored" hash below, aligned so the match is visible at a glance.
- src/gfx/HashChain.tsx: horizontal linked blocks for ledger events (props: blocks { label, hash, prevHash, tone }[], revealProgress, highlightIndex). Each block shows the type, a short hash, and a thin link to the previous block (draws as the block appears). The highlighted block (the delete) pulses vermilion with hatching and stays; a "verified" sweep (prop verifyProgress) runs along the chain turning link lines ok-blue and finishes with a seal.
- src/gfx/SnapshotTimeline.tsx: a bottom rail with snapshot nodes (props: nodes {n, hash, state: "taken"|"current"|"greyed"|"rewound"}[]), a playhead, a "rewound" blue node that appears after a rewind with the caption slot "restored into a fresh sandbox".
- src/gfx/GhostContainer.tsx: an outlined container that draws on (prop draw) to show the fresh sandbox the files are restored into.
- A dev-only composition "DevGfxB" (register in Root.tsx, resend whole file): the full S4 explainer sequence over 900 frames.

CHECK: npx tsc --noEmit ; stills at intact, mid-shatter, empty (WIPED), mid-reassemble, hashes locked, chain verified.
```
