# minilocker-film

A code-driven film for MiniLocker, made for the Vultr "Agent Rush" hackathon, Challenge 1 "Blast Radius Zero". It is
2:50 long (5100 frames at 30 fps, 1920x1080) and is built with Remotion: every scene is React code, the camera is a
virtual camera, and every number, hash, host, command and verdict on screen is read from a captured evidence file, not
typed by hand.

![preview](docs/preview.gif)

The image above does not show until `out/preview.gif` has been copied to `docs/preview.gif` once and committed
(`out/` is git-ignored, and no script copies files into `docs/`).

## Install

1. Node 20 or newer (tested on Node 22).
2. ffmpeg and ffprobe on PATH. On Windows: `winget install Gyan.FFmpeg`, then open a NEW terminal so PATH is refreshed.
3. git.
4. In this folder: `npm install`.
5. If you need the fonts or you are going to capture evidence, clone the `MiniLocker` repository next to this one:

```
git clone https://github.com/shaikh-dotcom/MiniLocker.git
```

## The whole flow

Run these in order. Each line says what the step produces.

1. `npm install`: installs the dependencies, including the Remotion bundler and renderer the scripts use.
2. `npm run assets`: copies the fonts into `public/fonts/` and writes `public/brand/manifest.json`. Run it again after you save the Vultr logo.
3. `npm run sfx`: synthesizes the 35 sound effects into `public/audio/` (the WAV files are not in git; `public/audio/manifest.json` is). `render` runs `npm run sfx:check` first and stops with a `Fix:` line when a sound file is missing or stale. Run it again after you add or remove `public/audio/music.mp3` or `voice.wav`.
4. Record the proof clip and save it as `public/proof/rewind.mp4`: 1920x1080, 30 fps, under 14 s, no audio (BIBLE 7). Without it the film shows the "RECONSTRUCTED FROM LEDGER" badge instead of "LIVE".
5. `npm run proof`: checks the clip (resolution, fps, duration) and writes the manifest the scene reads.
6. `npm run evidence`: captures `src/data/evidence.json` from the live deployment. Run it on the Vultr VM's frozen code, following BIBLE 7.2. Never commit the API token.
7. `npm run evidence:final-check`: exits 0 only when the evidence is real and complete, and prints exactly what to fix otherwise.
8. `npm run check`: renders the 25 check stills into `out/stills/` so you can look at them. It does not need real evidence.
9. `npm run render`: audits the camera motion, renders the film to `out/minilocker-demo.mp4`, normalises the loudness, verifies the file, and writes the poster and the preview GIF. **It refuses to run on sample or invalid evidence** (exit 1, with a `Fix:` line). `npm run render -- --allow-sample` runs it anyway for a test render, prints a `SAMPLE EVIDENCE: these files must NOT be submitted.` banner and writes `out/SAMPLE_EVIDENCE_WARNING.txt`. A run without `--allow-sample` that passes deletes that marker file.
10. `npm run submission`: builds the cover, the slides pack, the captions, the voice script and the film notes. **It refuses on sample or invalid evidence in the same way**, and `--allow-sample` behaves as in step 9.

Files made with `--allow-sample` must not be submitted.

## Light theme film

The film also builds in a light look (the real app's "Paper" theme), from a second entry point, `src/index.light.ts`. Same scenes, timing and audio; the dark film is the default and is not changed.

- `npm run studio:light` opens the Studio on the light film.
- `npm run check:light` renders the check stills into `out/stills-light/`.
- `npm run render:light` (or `render:light:4k`) writes `out/minilocker-demo-light.mp4`, `poster-light.png` and `preview-light.gif`. The same flags as `render` apply (for example `-- --allow-sample`).
- The light stage picture is `public/backgrounds/stage-light.png`; swap it the same way as `stage.png` (see `src/config/background.ts`, `STAGE_BACKGROUND_LIGHT`).

## Commands reference

Pass flags after `--`, for example `npm run render -- --allow-sample`. An unknown flag is a usage error (exit code 2) for
the render, check and submission scripts. Exit codes: 0 success, 1 failure or refusal (always with a printed `Fix:`
line), 2 usage error.

| npm script | Runs | Flags |
|---|---|---|
| `npm run studio` | `remotion studio src/index.ts` | None. Opens the Remotion Studio for editing and preview. |
| `npm run typecheck` | `tsc --noEmit` | None. |
| `npm run assets` | `node scripts/fetch-assets.mjs` | `--from <path>` (a local clone of the MiniLocker repo), `--force`. |
| `npm run evidence` | `node scripts/capture-evidence.mjs` | `--base <https://host>` (required), `--token`, `--takes <n>`, `--attacks core\|all`, `--measured <file>`, `--out <file>`, `--repo <path>`. See BIBLE 7.2. |
| `npm run evidence:check` | `node scripts/validate-evidence.mjs` | `--file <path>`. Passes on the SAMPLE evidence. |
| `npm run evidence:final-check` | `node scripts/validate-evidence.mjs --final` | Exits 0 only for real, complete evidence. |
| `npm run proof` | `node scripts/check-proof.mjs` | None. |
| `npm run sfx` | `node scripts/make-sfx.mjs` | None. Writes `public/audio/*.wav` and `manifest.json`. |
| `npm run sfx:check` | `node scripts/make-sfx.mjs --check` | None. Writes nothing; exits 1 when the manifest or a sound file is stale or missing. |
| `npm run motion` | `node tools/audit-motion.mjs` | Prints the camera audit. `npm run render` runs it for you before it renders. |
| `npm run check` | `node scripts/check-stills.mjs` | `--frames=60,200,...` (replaces the default list), `--scale=N` (default 1), `--concurrency=N`, `--help`. |
| `npm run sheets` | `node scripts/make-sheets.mjs` | Contact sheets from `out/frames` (JPEG or PNG frames). See the header of the script. |
| `npm run render` | `node scripts/render.mjs` | `--allow-sample`, `--4k`, `--frames`, `--concurrency=N`, `--help`. Default concurrency: half of the CPU count, at least 1; a value above the CPU count is lowered to it. |
| `npm run render:4k` | `node scripts/render.mjs --4k` | The same flags as `render`. |
| `npm run render:frames` | `node scripts/render.mjs --frames` | The same flags as `render`. |
| `npm run submission` | `node scripts/make-submission-assets.mjs` | `--allow-sample`, `--only=cover,slides,srt,voice,notes` (any subset), `--concurrency=N`, `--help`. |

## Outputs

Everything is written under `out/`, which is git-ignored.

| File | Spec |
|---|---|
| `out/minilocker-demo.mp4` | H.264 (crf 16, yuv420p, limited range, tagged bt709), 1920x1080, 30 fps, AAC 192 kbps, loudness I=-16 TP=-1.5 LRA=11, `+faststart`, at most 3:00. |
| `out/minilocker-demo-4k.mp4` | The same encode at 3840x2160 (`npm run render:4k`). |
| `out/frames/` | PNG sequence of the whole film, scale 1, no audio (`npm run render:frames`). |
| `out/poster.png` | Frame 480 (title and dial), 1920x1080. |
| `out/preview.gif` | An excerpt, frames 2340 to 2519 (the wipe), 720 px wide, 15 fps, at most 8 MB. |
| `out/stills/f00060.png` and the rest | One PNG per check frame, named `f` plus the frame number zero-padded to 5 digits. |
| `out/cover.png` | 1920x1080, 16:9, frame 480, scale 1. |
| `out/slides-pack/NN-name.png` | The 7 slide stills, 1920x1080: `01-containers`, `02-lattice`, `03-hash-chain`, `04-report`, `05-compare`, `06-architecture`, `07-limits`. |
| `out/captions.srt` | Captions built from `src/config/copy.ts`, the start frames in `src/config/timeline.ts` (and the frames where a scene moved a cue), plus the evidence-derived lines. |
| `out/voice-script.txt` | The voice-over blocks V0 to V9 with their start frames and an estimated length. |
| `out/SUBMISSION_FILM_NOTES.md` | Every shown or spoken evidence-derived item with its scene, frames, evidence path and current value. |
| `out/SAMPLE_EVIDENCE_WARNING.txt` | A marker written when `--allow-sample` was used. If it exists, the files must not be submitted. |

The 25 check frames, in order: 60, 200, 330, 480, 760, 1000, 1260, 1700, 1900, 2230, 2350, 2560, 2780, 2900, 3100, 3420,
3560, 3850, 4010, 4150, 4420, 4520, 4700, 4900, 5099.

The slide frames are listed in `scripts/submission/visual-assets.mjs` (the `SLIDES` list, with the reason for each
frame). After a scene patch moves a beat, open the frame in the Studio and update that list. Slides 06 and 07 come
from the built Vultr scene (S8) and need the evidence to show a Vultr VM, inference host and bucket (the sample does).

## Where to edit

| What | File |
|---|---|
| Text on screen | `src/config/copy.ts` |
| Timings (the `sec`, `beat`, `bar` and `f` helpers, and `CUES`) | `src/config/timeline.ts` |
| Colors and fonts | `src/config/theme.ts` |
| Camera | `src/config/camera.ts` and the `SN_CAMERA` arrays of each scene |
| Focus names | `src/config/focus.ts` |
| The story script | `src/config/script.ts` |

**Not editable by hand:** every number, hash, host, file name, command, ledger line, verdict, model name, region and
plan on screen. They come from `src/data/evidence.json` through `src/data/select.ts`, and the only way to change them is
to capture again (`npm run evidence`). This is the evidence rule: if a value the film needs is missing, the build throws
an error that names the missing path (for example `evidence.attacks.rewind_after_rm_rf.events`) instead of showing a
guess. The sample evidence that ships with the repository is for development only.

## Rendering by hand

`scripts/render.mjs` drives Remotion through its Node API. The command that matches it is:

```
npx remotion render src/index.ts MiniLockerFilm out/raw.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --color-space=bt709 --audio-codec=aac --audio-bitrate=192k
```

Then the loudness and faststart step: two-pass `loudnorm` with the targets I=-16, TP=-1.5, LRA=11. The first pass measures
(it prints the measured values as JSON; copy them into the second pass in place of the placeholders):

```
ffmpeg -i out/raw.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -
```

```
ffmpeg -i out/raw.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true -c:v copy -c:a aac -b:a 192k -movflags +faststart out/minilocker-demo.mp4
```

**The pure ffmpeg route.** Run `npm run render:frames` to write the PNG sequence into `out/frames/`, then turn it into an
mp4 at 30 fps. The script prints the exact ffmpeg line for the file names it wrote (for the whole film they are
`element-0000.png` and up, so the pattern is `element-%04d.png`):

```
ffmpeg -framerate 30 -i out/frames/element-%04d.png -c:v libx264 -crf 16 -pix_fmt yuv420p -movflags +faststart out/frames-video.mp4
```

The frames carry no audio, so this file is silent; add the soundtrack separately.

## Troubleshooting

- **Chrome download fails** (offline or behind a proxy). Remotion downloads its own browser on first use. Check your connection and run again, or point to a Chrome you already have with the `REMOTION_BROWSER_EXECUTABLE` environment variable (the render, check and submission scripts pass it as the `browserExecutable` option).
- **Fonts missing.** Run `npm run assets`.
- **ffmpeg not found on Windows.** Run `winget install Gyan.FFmpeg`, then open a NEW terminal. `ffmpeg -version` and `ffprobe -version` must both work.
- **Out of memory.** Run again with `--concurrency=2`, or `--concurrency=1`.
- **Slow renders.** Close other apps. A lower concurrency is NOT faster: try the default first. While editing, use the Preview composition in the Studio (`npm run studio`) instead of rendering.
- **The render refuses on sample evidence.** That is the guard working. Capture real evidence (BIBLE 7) and run `npm run evidence:final-check`, or pass `--allow-sample` for a test render that must not be submitted.
- **The render stops with "the audio files are missing or stale".** The WAV files are generated, not committed: run `npm run sfx`, then render again. (If a render ever reports digital silence anyway, the loudness step is skipped and the mp4 keeps a silent track.)
- **The GIF is over 8 MB.** The script retries with fewer colors, then 12 fps, then 640 px, then 540 px, and fails loudly (with a `Fix:` line) if it is still over 8 MB.

## Licensing

Remotion has its own license, and companies may need a company license. See https://www.remotion.dev/license and decide
for your own case. The MiniLocker product repository carries its own LICENSE file: see the MiniLocker repository.

## The lablab checklist

Copied from the "Submission form" block of `docs/SUBMISSION.md` in the MiniLocker repository:

- [ ] Title, short and long description, tags.
- [ ] Cover image: PNG or JPG, 16:9 (`out/cover.png`).
- [ ] Video: MP4, up to 3 minutes, one containment moment, plays while logged out (`out/minilocker-demo.mp4`).
- [ ] Slide deck: PDF, built from `out/slides-pack`.
- [ ] Repository URL, application URL (https://minilocker.duckdns.org), demo platform = Vultr.
- [ ] Code frozen; submitted well before the deadline (Sunday Nov 8, 6 PM Bangladesh time, 12:00 UTC).

Viewing protocol before upload (BIBLE 12.3, item 12): watch it once muted at 100% on a laptop, once with sound on
headphones, and once on a phone; then upload to an unlisted link and play it logged out.

## Project layout

```
src/
  index.ts, Root.tsx, MiniLockerFilm.tsx   entry, compositions (final first, dev sheets after), the film
  config/                                  copy, timeline, theme, camera, focus, script
  data/                                    evidence.json, select.ts, types.ts
  scenes/                                  S0 to S9 (s2, s3, s4, s5 and s9 hold the split scenes)
  ui/, gfx/, fx/, lib/, dev/               UI kit, explainer graphics, effects, helpers, dev compositions
scripts/
  fetch-assets.mjs, capture-evidence.mjs, validate-evidence.mjs
  check-proof.mjs, make-sheets.mjs
  render.mjs, check-stills.mjs, make-submission-assets.mjs
  submission/                              visual-assets.mjs, text-assets.mjs
public/                                    fonts/, brand/, audio/, proof/
docs/                                      PATCH_NOTES.md, guide/, patches/, bible/
evidence/                                  measured.json (the hand-filled numbers)
tools/                                     audit-motion.mjs, make-prompt.mjs, measure-anchors.mjs, sample/
out/                                       generated, git-ignored
```

`scripts/make-sfx.mjs` writes `public/audio/`; the cue list is `src/config/sfx.ts` and the playback is `src/audio/FilmAudio.tsx`.

### History

The film was built patch by patch. `docs/PATCH_NOTES.md` is the handoff log, `docs/guide/` holds the guide,
`docs/patches/` holds the patches, and `node tools/make-prompt.mjs <patch>` builds a paste-ready prompt for any of them.
