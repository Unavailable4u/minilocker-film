#!/usr/bin/env node
// MiniLocker film: render pipeline (patch 23a). Pure Node 20 ESM, no shell strings, Windows-friendly.
//
//   npm run render                       evidence final check, then the full render: out/minilocker-demo.mp4, poster.png, preview.gif
//   npm run render -- --allow-sample     same, on SAMPLE evidence (test render only, never submit it)
//   npm run render:4k                    3840x2160 (Remotion scale 2): out/minilocker-demo-4k.mp4
//   npm run render:frames                PNG sequence of the whole film in out/frames (no audio)
//
// Flags: --allow-sample, --4k, --frames, --concurrency=N, --help.   Exit codes: 0 ok, 1 failure or refusal, 2 usage error.
// Method (split contract 3.4): @remotion/bundler + @remotion/renderer Node API. The API does not read remotion.config.ts,
// so its settings (JPEG frames at quality 95, yuv420p, overwrite) are passed explicitly below.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const COMP_ID = "MiniLockerFilm";
const POSTER_FRAME = 480; // contract 3.5: S1, title + dial
const GIF_FROM_FRAME = 2340; // contract 3.6: the wipe, 180 frames = 6 s
const GIF_FRAMES = 180;
const FPS = 30;
const MAX_SECONDS = 180;
const GIF_MAX_BYTES = 8 * 1024 * 1024;
const MARKER = path.join(OUT, "SAMPLE_EVIDENCE_WARNING.txt");
const SAMPLE_BANNER = "SAMPLE EVIDENCE: these files must NOT be submitted.";

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const say = (m = "") => console.log(m);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";

class Fail extends Error {
  constructor(message, fix) {
    super(message);
    this.fix = fix;
  }
}

// ---------- flags -------------------------------------------------------------------------------------------------------
const HELP = `Usage: node scripts/render.mjs [flags]

  --allow-sample     render even when the evidence is SAMPLE (test only; writes out/SAMPLE_EVIDENCE_WARNING.txt)
  --4k               3840x2160 render (Remotion scale 2) to out/minilocker-demo-4k.mp4 (no poster, no gif)
  --frames           PNG sequence of the whole film to out/frames (scale 1, no audio, no mp4)
  --concurrency=N    parallel browser tabs (default: half the CPU count, at least 1; lower it if you run out of memory)
  --help             this text

Normal run writes out/minilocker-demo.mp4 (H.264 crf 16, yuv420p, AAC 192 kbps, -16 LUFS, +faststart), out/poster.png
(frame ${POSTER_FRAME}) and out/preview.gif (720 px, 15 fps, at most 8 MB, the 6 s wipe excerpt).`;

function parseFlags(argv) {
  const o = { allowSample: false, k4: false, frames: false, concurrency: Math.max(1, Math.floor(os.cpus().length / 2)), help: false };
  for (const a of argv) {
    if (a === "--allow-sample") o.allowSample = true;
    else if (a === "--4k") o.k4 = true;
    else if (a === "--frames") o.frames = true;
    else if (a === "--help") o.help = true;
    else if (/^--concurrency=/.test(a)) {
      const n = Number(a.split("=")[1]);
      if (!Number.isInteger(n) || n < 1 || n > 64) usage(`--concurrency needs a whole number from 1 to 64 (got "${a.split("=")[1]}")`);
      o.concurrency = n;
    } else usage(`unknown flag ${a}`);
  }
  if (o.k4 && o.frames) usage("--4k and --frames cannot be combined");
  return o;
}
function usage(msg) {
  console.error(`render: ${msg}\n\n${HELP}`);
  process.exit(2);
}

const flags = parseFlags(process.argv.slice(2));
if (flags.help) {
  say(HELP);
  process.exit(0);
}

// ---------- small helpers -----------------------------------------------------------------------------------------------
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, windowsHide: true, ...opts });
}

const FFMPEG_FIX = "install ffmpeg and add it to PATH (Windows: winget install Gyan.FFmpeg, then open a NEW terminal)";
function ffmpeg(args, what) {
  const r = run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args]);
  if (r.error) throw new Fail(`cannot run ffmpeg (${r.error.code || r.error.message})`, FFMPEG_FIX);
  if (r.status !== 0) {
    const tail = (r.stderr || "").trim().split(/\r?\n/).slice(-8).join("\n");
    throw new Fail(`ffmpeg failed while ${what}:\n${tail}`, "check the message above; if it mentions a missing filter or encoder, update ffmpeg to a recent full build");
  }
  return r;
}
function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
  if (r.error) throw new Fail(`cannot run ffprobe (${r.error.code || r.error.message})`, FFMPEG_FIX);
  if (r.status !== 0) throw new Fail(`ffprobe could not read ${rel(file)}:\n${(r.stderr || "").trim()}`, "the render did not produce a valid file; run again");
  return JSON.parse(r.stdout);
}
function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function stepper(label, step = 5) {
  const t0 = Date.now();
  let next = step;
  return (pct) => {
    if (pct >= next || pct >= 100) {
      const elapsed = Date.now() - t0;
      const eta = pct > 0 ? (elapsed * (100 - pct)) / pct : 0;
      say(`  ${label} ${String(Math.min(100, Math.floor(pct))).padStart(3)}%  elapsed ${fmtTime(elapsed)}  eta ${fmtTime(eta)}`);
      while (next <= pct) next += step;
    }
  };
}
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;

function explain(err) {
  // turns a Remotion / browser error into a message with a fix hint
  const msg = String(err && err.message ? err.message : err);
  if (err instanceof Fail) return { msg: err.message, fix: err.fix };
  if (/ENOMEM|out of memory|heap|Target closed|crash|SIGKILL|Protocol error/i.test(msg)) {
    return { msg, fix: "run again with --concurrency=2 (or 1); close other programs; the browser ran out of memory" };
  }
  if (/download|ENOTFOUND|ECONN|ETIMEDOUT|EAI_AGAIN|fetch failed|socket|certificate/i.test(msg)) {
    return {
      msg,
      fix: "check your connection and run again (Remotion downloads its own browser on first use), or set REMOTION_BROWSER_EXECUTABLE to the path of Chrome",
    };
  }
  if (/Cannot find module|ERR_MODULE_NOT_FOUND/i.test(msg)) return { msg, fix: "run npm install" };
  if (/webpack|bundl|Module not found|Can't resolve|TS\d{4}/i.test(msg)) {
    return { msg, fix: "the project does not bundle: run npx tsc --noEmit and fix the first error, then try again" };
  }
  return { msg, fix: "read the message above; run with the DEBUG env var set to see the full stack" };
}

// ---------- 1. preflight ------------------------------------------------------------------------------------------------
function preflight() {
  say("[1/8] preflight");
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) throw new Fail(`Node ${process.versions.node} is too old`, "install Node 20 LTS or newer");
  for (const bin of ["ffmpeg", "ffprobe"]) {
    const r = run(bin, ["-version"]);
    if (r.error || r.status !== 0) throw new Fail(`${bin} is not available on PATH`, FFMPEG_FIX);
  }
  if (!fs.existsSync(path.join(ROOT, "src/index.ts"))) throw new Fail("src/index.ts not found", "run this from the minilocker-film repo");
  if (!fs.existsSync(path.join(ROOT, "node_modules/@remotion/renderer")) || !fs.existsSync(path.join(ROOT, "node_modules/@remotion/bundler"))) {
    throw new Fail("@remotion/renderer or @remotion/bundler is not installed", "run npm install");
  }
  const fontDir = path.join(ROOT, "public/fonts");
  const fonts = fs.existsSync(fontDir) ? fs.readdirSync(fontDir).filter((f) => f.endsWith(".woff2")) : [];
  if (fonts.length < 7) say("  WARNING: fewer than 7 .woff2 files in public/fonts: the film would use fallback fonts. Fix: npm run assets");
  // The sound patch commits public/audio/manifest.json but not the WAVs it lists, so a manifest on disk does not mean the sounds are there.
  // `make-sfx.mjs --check` writes nothing and fails when the manifest or any file is stale or missing (the film would then fail on a missing file mid-render).
  const sfxScript = path.join(ROOT, "scripts/make-sfx.mjs");
  if (fs.existsSync(sfxScript)) {
    const sfx = run(process.execPath, [sfxScript, "--check"], { cwd: ROOT });
    if (sfx.status !== 0) {
      const detail = `${sfx.stdout || ""}${sfx.stderr || ""}`.trim().split("\n").slice(-3).join(" | ");
      throw new Fail(`the audio files are missing or stale (${detail})`, "npm run sfx (run it again after adding or removing public/audio/music.mp3 or voice.wav)");
    }
  } else if (!fs.existsSync(path.join(ROOT, "public/audio/manifest.json"))) {
    say("  WARNING: scripts/make-sfx.mjs and public/audio/manifest.json not found: the film has no sound effects (a silent audio track is still valid)");
  }
  say(`  node ${process.versions.node}, ffmpeg and ffprobe found`);
}

// ---------- 2. evidence guard (contract 3.3) ---------------------------------------------------------------------------
function evidenceGuard() {
  say("[2/8] evidence check");
  const validator = path.join(ROOT, "scripts/validate-evidence.mjs");
  if (!fs.existsSync(validator)) throw new Fail("scripts/validate-evidence.mjs not found (patch 02)", "restore it from git");
  fs.mkdirSync(OUT, { recursive: true });
  const check = (extra) => run(process.execPath, [validator, ...extra], { cwd: ROOT });
  const printOut = (r) => {
    const t = `${r.stdout || ""}${r.stderr || ""}`.trim();
    if (t) say(t.split(/\r?\n/).map((l) => "  | " + l).join("\n"));
  };

  if (!flags.allowSample) {
    const r = check(["--final"]);
    if (r.status !== 0) {
      say("REFUSING: evidence is sample or invalid.");
      printOut(r);
      say("Fix: capture real evidence (BIBLE 7) or pass --allow-sample for a test render.");
      process.exit(1);
    }
    if (fs.existsSync(MARKER)) fs.rmSync(MARKER);
    say("  evidence is real and complete");
    return false;
  }
  const r = check([]);
  if (r.status !== 0) {
    say("REFUSING: the evidence is invalid even for a sample render.");
    printOut(r);
    say("Fix: repair src/data/evidence.json (or restore the sample from git).");
    process.exit(1);
  }
  let isSample = false;
  try {
    isSample = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/evidence.json"), "utf8")).meta?.sample === true;
  } catch {
    isSample = true;
  }
  if (isSample) {
    say("  " + "=".repeat(70));
    say("  " + SAMPLE_BANNER);
    say("  " + "=".repeat(70));
    fs.writeFileSync(MARKER, `${SAMPLE_BANNER} ${new Date().toISOString()}\n`);
  } else {
    if (fs.existsSync(MARKER)) fs.rmSync(MARKER);
    say("  --allow-sample was given but the evidence is real: nothing to warn about");
  }
  return isSample;
}

// ---------- 3. motion audit (patch 25) ---------------------------------------------------------------------------------
// tools/audit-motion.mjs samples the virtual camera on all frames and runs every scene's import-time checks. It informs (exit 0) and
// exits 1 only when the project does not load, which a render could not survive either. Not run with --strict: the stubs of unfinished
// scenes still produce STILL warnings. Add --strict to the spawn below once S4b-S9 are built.
function motionAudit() {
  say("[3/8] motion audit");
  const tool = path.join(ROOT, "tools/audit-motion.mjs");
  if (!fs.existsSync(tool)) {
    say("  WARNING: tools/audit-motion.mjs not found (patch 25): skipping the audit");
    return;
  }
  const r = run(process.execPath, [tool], { cwd: ROOT });
  const text = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (text) say(text.split(/\r?\n/).map((l) => "  | " + l).join("\n"));
  if (r.status !== 0) throw new Fail("the motion audit could not load the film", "fix the error printed above (try npx tsc --noEmit), then run again");
}

// ---------- 4. bundle ---------------------------------------------------------------------------------------------------
async function loadRemotion() {
  try {
    const bundler = await import("@remotion/bundler");
    const renderer = await import("@remotion/renderer");
    return { bundle: bundler.bundle, renderer };
  } catch (e) {
    throw new Fail(`cannot load Remotion (${e.message})`, "run npm install");
  }
}

async function prepare() {
  say("[4/8] bundling the project (first run is slow)");
  const { bundle, renderer } = await loadRemotion();
  const tick = stepper("bundle", 25);
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src/index.ts"),
    onProgress: (p) => tick(p),
  });
  const composition = await renderer.selectComposition({ serveUrl, id: COMP_ID, inputProps: {}, browserExecutable, logLevel: "warn" });
  if (composition.durationInFrames / composition.fps > MAX_SECONDS) {
    throw new Fail(
      `the composition is ${(composition.durationInFrames / composition.fps).toFixed(1)} s, over the ${MAX_SECONDS} s cap`,
      "shorten the film: the lablab cap is 3:00",
    );
  }
  say(`  composition ${composition.id}: ${composition.width}x${composition.height}, ${composition.durationInFrames} frames at ${composition.fps} fps`);
  // Remotion refuses a concurrency above the number of cores it sees (a 1-core CI box fails with "Maximum for --concurrency is 1").
  let max = os.cpus().length;
  try {
    const internal = renderer.RenderInternals?.getMaxConcurrency?.();
    if (Number.isInteger(internal) && internal >= 1) max = internal;
  } catch {
    // internal API not there: the core count is the same limit
  }
  if (Number.isInteger(max) && max >= 1 && flags.concurrency > max) {
    say(`  concurrency lowered from ${flags.concurrency} to ${max}: Remotion allows at most one tab per core on this machine`);
    flags.concurrency = max;
  }
  return { renderer, serveUrl, composition };
}

// ---------- 5. render the picture ---------------------------------------------------------------------------------------
async function renderVideo({ renderer, serveUrl, composition }, scale, rawFile) {
  say(`[5/8] rendering ${composition.durationInFrames} frames at scale ${scale} (${composition.width * scale}x${composition.height * scale}), concurrency ${flags.concurrency}`);
  const tick = stepper("render", 5);
  await renderer.renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    audioBitrate: "192k",
    enforceAudioTrack: true,
    imageFormat: "jpeg",
    jpegQuality: 95,
    // JPEG frames alone give yuvj420p, full range, tagged bt470bg (players show it washed out and the pixel-format check fails);
    // bt709 makes the file yuv420p, limited range, tagged bt709, which is what H.264 HD delivery and the check below expect.
    colorSpace: "bt709",
    scale,
    concurrency: flags.concurrency,
    outputLocation: rawFile,
    overwrite: true,
    inputProps: {},
    browserExecutable,
    logLevel: "warn",
    onProgress: (p) => tick(p.progress * 100),
  });
}

// ---------- 6. loudness + faststart + verification ---------------------------------------------------------------------
const LOUD = { I: -16, TP: -1.5, LRA: 11 };

function measureLoudness(file) {
  const r = ffmpeg(
    ["-i", file, "-vn", "-af", `loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}:print_format=json`, "-f", "null", "-"],
    "measuring loudness",
  );
  const text = r.stderr || "";
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Fail("could not read the loudness measurement from ffmpeg", "update ffmpeg to a build that includes the loudnorm filter");
  return JSON.parse(text.slice(start, end + 1));
}

function finalizeAudio(rawFile, finalFile) {
  say("[6/8] loudness normalisation (two passes), +faststart");
  const info = probe(rawFile);
  const hasAudio = info.streams.some((s) => s.codec_type === "audio");
  let loudnessOk = null;
  if (!hasAudio) {
    say("  WARNING: the render has no audio stream; remuxing with +faststart only");
    ffmpeg(["-i", rawFile, "-c", "copy", "-movflags", "+faststart", finalFile], "remuxing");
  } else {
    const m = measureLoudness(rawFile);
    const measured = Number(m.input_i);
    if (!Number.isFinite(measured)) {
      say("  the audio is digital silence (no sound effects yet): skipping normalisation, remuxing with +faststart");
      ffmpeg(["-i", rawFile, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", finalFile], "remuxing");
    } else {
      say(`  measured: ${m.input_i} LUFS, true peak ${m.input_tp} dBTP, LRA ${m.input_lra}`);
      const af =
        `loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}` +
        `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}` +
        `:offset=${m.target_offset}:linear=true:print_format=summary`;
      ffmpeg(["-i", rawFile, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", finalFile], "applying loudness normalisation");
      const after = Number(measureLoudness(finalFile).input_i);
      loudnessOk = Number.isFinite(after) && Math.abs(after - LOUD.I) <= 1;
      say(`  after: ${Number.isFinite(after) ? after.toFixed(1) : "n/a"} LUFS (target ${LOUD.I})`);
      if (!loudnessOk) say(`  WARNING: integrated loudness is more than 1 LU away from ${LOUD.I} LUFS. Check the music and voice levels in patch 22.`);
    }
  }
  fs.rmSync(rawFile);
  return loudnessOk;
}

function verify(file, width, height) {
  say("[7/8] verifying the file");
  const info = probe(file);
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const duration = Number(info.format.duration);
  const problems = [];
  if (!v) problems.push("no video stream");
  else {
    if (v.codec_name !== "h264") problems.push(`video codec is ${v.codec_name}, expected h264`);
    if (v.pix_fmt !== "yuv420p") problems.push(`pixel format is ${v.pix_fmt}, expected yuv420p`);
    if (v.width !== width || v.height !== height) problems.push(`size is ${v.width}x${v.height}, expected ${width}x${height}`);
    const [n, d] = String(v.avg_frame_rate).split("/").map(Number);
    if (!d || Math.abs(n / d - FPS) > 0.01) problems.push(`frame rate is ${v.avg_frame_rate}, expected ${FPS}`);
  }
  if (!a) problems.push("no audio stream");
  else if (a.codec_name !== "aac") problems.push(`audio codec is ${a.codec_name}, expected aac`);
  if (!Number.isFinite(duration)) problems.push("duration unknown");
  else if (duration > MAX_SECONDS) problems.push(`duration ${duration.toFixed(1)} s is over the ${MAX_SECONDS} s cap (Fix: shorten the film, the lablab cap is 3:00)`);
  if (problems.length) throw new Fail(`${rel(file)} failed verification:\n  - ${problems.join("\n  - ")}`, "see the list above; re-render after fixing the cause");
  say(`  ok: h264 yuv420p ${v.width}x${v.height}, ${FPS} fps, aac, ${duration.toFixed(1)} s, ${mb(fs.statSync(file).size)}`);
  return duration;
}

// ---------- 8. poster and gif ------------------------------------------------------------------------------------------
async function makePoster({ renderer, serveUrl, composition }) {
  const file = path.join(OUT, "poster.png");
  say(`[8/8] poster (frame ${POSTER_FRAME}) and preview gif`);
  await renderer.renderStill({
    composition,
    serveUrl,
    frame: POSTER_FRAME,
    output: file,
    imageFormat: "png",
    scale: 1,
    overwrite: true,
    inputProps: {},
    browserExecutable,
    logLevel: "warn",
  });
  say(`  ${rel(file)} ${mb(fs.statSync(file).size)}`);
  return file;
}

function makeGif(mp4) {
  const file = path.join(OUT, "preview.gif");
  const ladder = [
    { w: 720, fps: 15, colors: 256 },
    { w: 720, fps: 15, colors: 128 },
    { w: 720, fps: 15, colors: 64 },
    { w: 720, fps: 12, colors: 128 },
    { w: 640, fps: 12, colors: 128 },
    { w: 640, fps: 12, colors: 64 },
    { w: 540, fps: 12, colors: 64 },
  ];
  const start = GIF_FROM_FRAME / FPS;
  const length = GIF_FRAMES / FPS;
  for (const [i, s] of ladder.entries()) {
    const vf = `fps=${s.fps},scale=${s.w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${s.colors}[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`;
    ffmpeg(["-ss", String(start), "-t", String(length), "-i", mp4, "-an", "-filter_complex", vf, "-loop", "0", file], "making the gif");
    const size = fs.statSync(file).size;
    say(`  gif try ${i + 1}/${ladder.length}: ${s.w} px, ${s.fps} fps, ${s.colors} colours -> ${mb(size)}`);
    if (size <= GIF_MAX_BYTES) return file;
  }
  fs.rmSync(file);
  throw new Fail("preview.gif is still over 8 MB at 540 px, 12 fps, 64 colours", "shorten GIF_FRAMES in scripts/render.mjs or pick a calmer excerpt");
}

// ---------- frames mode -------------------------------------------------------------------------------------------------
async function renderFrameSequence({ renderer, serveUrl, composition }) {
  const dir = path.join(OUT, "frames");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  say(`[5/8] rendering ${composition.durationInFrames} PNG frames to ${rel(dir)}, concurrency ${flags.concurrency}`);
  const total = composition.durationInFrames;
  const tick = stepper("frames", 5);
  await renderer.renderFrames({
    composition,
    serveUrl,
    outputDir: dir,
    imageFormat: "png",
    scale: 1,
    concurrency: flags.concurrency,
    inputProps: {},
    browserExecutable,
    logLevel: "warn",
    muted: true,
    onStart: () => {},
    onFrameUpdate: (done) => tick((done / total) * 100),
  });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  if (files.length !== total) throw new Fail(`expected ${total} PNG files, found ${files.length}`, "run again; if it repeats, use --concurrency=2");
  const m = /^(.*?)(\d+)(\.png)$/.exec(files[0]);
  const pattern = m ? `${m[1]}%0${m[2].length}d${m[3]}` : "element-%04d.png";
  say(`  ${files.length} frames, first file ${files[0]}, last ${files[files.length - 1]}`);
  say("  to make a video from them (no audio):");
  say(`  ffmpeg -framerate ${FPS} -i out/frames/${pattern} -c:v libx264 -crf 16 -pix_fmt yuv420p -movflags +faststart out/frames-video.mp4`);
}

// ---------- main --------------------------------------------------------------------------------------------------------
async function main() {
  const t0 = Date.now();
  preflight();
  const sample = evidenceGuard();
  motionAudit();
  const ctx = await prepare();
  const made = [];

  if (flags.frames) {
    await renderFrameSequence(ctx);
    say(`\nDone in ${fmtTime(Date.now() - t0)}.`);
    if (sample) say(SAMPLE_BANNER);
    return;
  }

  const scale = flags.k4 ? 2 : 1;
  const raw = path.join(OUT, flags.k4 ? "raw-4k.mp4" : "raw.mp4");
  const final = path.join(OUT, flags.k4 ? "minilocker-demo-4k.mp4" : "minilocker-demo.mp4");
  await renderVideo(ctx, scale, raw);
  finalizeAudio(raw, final);
  const duration = verify(final, ctx.composition.width * scale, ctx.composition.height * scale);
  made.push(final);
  if (!flags.k4) {
    made.push(await makePoster(ctx));
    made.push(makeGif(final));
  } else {
    say("[8/8] 4K mode: no poster, no gif");
  }

  say(`\nDone in ${fmtTime(Date.now() - t0)}. Duration ${duration.toFixed(1)} s.`);
  for (const f of made) say(`  ${rel(f).padEnd(28)} ${mb(fs.statSync(f).size)}`);
  say("lablab: the upload size limit is not in this repo: check the form before uploading.");
  if (sample) {
    say("");
    say(SAMPLE_BANNER);
  }
}

function die(err) {
  const { msg, fix } = explain(err);
  console.error(`\nrender failed: ${msg}`);
  console.error(`Fix: ${fix}`);
  if (process.env.DEBUG && err && err.stack) console.error(err.stack);
  process.exit(1);
}
// Remotion's browser download can reject outside our await chain: route those into the same message.
process.on("unhandledRejection", die);
process.on("uncaughtException", die);
main().catch(die);
