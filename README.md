# minilocker-film

Code-driven Remotion film (2:50, 1920x1080, 30 fps) for the Vultr "Agent Rush" hackathon,
Challenge 1 "Blast Radius Zero". Built patch by patch. This README is a temporary starter;
Patch 23 replaces it.

## What is in this starter

| Path | What |
|---|---|
| `docs/guide/` | The full guide, the "read first" notes, the checklist, and the CONTEXT HEADER (paste first in every AI session) |
| `docs/patches/` | One file per patch (00-24), plus `prompts/` with just the paste-ready prompt text |
| `docs/bible/` | The film bible, one file per section (`bible-01.md` ... `bible-12.md`, `appendix-A.md` ... `appendix-D.md`) |
| `tools/make-prompt.mjs` | Builds a ready-to-paste prompt for any patch |
| `public/`, `scripts/`, `src/`, `evidence/` | Empty folders the patches fill in |

## Workflow for each patch

1. Build the prompt:
   ```
   node tools/make-prompt.mjs 0
   node tools/make-prompt.mjs 2 --draft ../draft
   ```
   It writes `prompts-out/patch-NN.md` containing the context header, the files the patch needs
   (from this repo, and from the `draft` repo if you pass `--draft`), the BIBLE sections and the
   patch prompt, in the right order.
2. Paste that file into a NEW AI session.
3. Save every file the AI returns at the exact path it gives (same path = replace).
4. Run the CHECK commands the AI prints. If they fail, paste the error back into the same session.
5. Commit. Next patch.

If the AI is cut off, see "If the AI runs out of tokens" in `docs/guide/00-read-first.md`.

## Prerequisites

Node 20 LTS, ffmpeg on PATH, git. Clone the reference repo next to this one:

```
git clone https://github.com/Unavailable4u/draft.git
```
