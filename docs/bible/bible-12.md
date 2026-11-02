## BIBLE 12. Render, deliverables, quality bar

**12.1 Deliverables**

| File | Spec | Used for |
|---|---|---|
| out/minilocker-demo.mp4 | H.264, 1920x1080, 30 fps, yuv420p, AAC 192 kbps, loudness -16 LUFS, +faststart, under 3:00 | lablab "Video presentation" (and an optional unlisted YouTube copy) |
| out/cover.png | 1920x1080, 16:9, from the title frame | lablab "Cover image" (replaces the green cover in docs/assets) |
| out/captions.srt | built from copy.ts | YouTube / accessibility |
| out/slides-pack/*.png | 7 key stills | the PDF slide deck |
| out/preview.gif | 720 px, 15 fps, under 8 MB | README header |
| out/SUBMISSION_FILM_NOTES.md | every spoken or shown number with its evidence path | your own audit |

**12.2 lablab form mapping** (from `docs/SUBMISSION.md`): video MP4 up to 3 minutes with one containment moment (three here), plays while logged out; cover image 16:9; slide deck PDF (build from slides-pack); repository URL; application URL (the Vultr domain); demo platform = Vultr.

**12.3 Quality bar (the checklist patch 24 walks)**
1. Total length 2:50, under 3:00; every scene boundary lands on its beat.
2. The film makes sense with sound off (captions carry it) and with sound on (VO and SFX add, never contradict).
3. At least one containment moment is unmistakable within the first 60% of the runtime (it is at 0:50).
4. Every number, hash, host, command and verdict traces to evidence; evidence is not sample; commit and CI match the frozen code.
5. No forbidden words (BIBLE 1.3); no competitor names; no claims beyond the evidence.
6. Legibility: key text at least 22 px at 1080p at the moment it matters; captions at least 56 px; nothing important under the lower 110 px.
7. No overlay covers what it describes; no static frame over 1.5 s; no camera jitter at handoffs.
8. The silence at f2370-2399 is truly silent.
9. Crimson only as accent; status colors only for status; every flagged item hatched.
10. The proof badge says exactly what is true (LIVE or RECONSTRUCTED FROM LEDGER).
11. Rubric self-check: Application of Technology, Presentation, Business Value, Originality, each at least 4 of 5 with one improvement named.
12. Viewing protocol before upload: once muted at 100% on a laptop, once with sound on headphones, once on a phone; upload to an unlisted link and play it logged out.
