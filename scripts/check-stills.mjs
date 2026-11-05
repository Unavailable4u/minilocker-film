// Renders PNG stills of the 25 check frames of MiniLockerFilm into out/stills/.
//   node scripts/check-stills.mjs                      the 25 default frames
//   node scripts/check-stills.mjs --frames=60,480      only these frames (integers, 0 to 5099)
//   node scripts/check-stills.mjs --scale=2            render at 2x (3840x2160)
//   node scripts/check-stills.mjs --concurrency=4      parallel renders (default: half of the CPUs)
//   node scripts/check-stills.mjs --help
// Exit codes: 0 success | 1 failure (a "Fix:" line is always printed) | 2 usage error.
// Pure Node 20+, ESM, Windows-friendly. Imports only node built-ins, @remotion/bundler and @remotion/renderer.
// Part 23b of patch 23. Owner: 23b. Does not run the evidence guard (stills may use SAMPLE evidence).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "out", "stills");
const COMPOSITION_ID = "MiniLockerFilm";
const TOTAL_FRAMES = 5100;

// Contract 3.5, in this order.
const DEFAULT_FRAMES = [
  60, 200, 330, 480, 760, 1000, 1260, 1700, 1900, 2230, 2350, 2560, 2780,
  2900, 3100, 3420, 3560, 3850, 4010, 4150, 4420, 4520, 4700, 4900, 5099,
];

// BIBLE 5, scene frame ranges (inclusive).
const SCENES = [
  { id: "S0", from: 0, to: 299 },
  { id: "S1", from: 300, to: 599 },
  { id: "S2", from: 600, to: 1499 },
  { id: "S3", from: 1500, to: 2099 },
  { id: "S4", from: 2100, to: 3299 },
  { id: "S5", from: 3300, to: 3719 },
  { id: "S6", from: 3720, to: 4259 },
  { id: "S7", from: 4260, to: 4559 },
  { id: "S8", from: 4560, to: 4979 },
  { id: "S9", from: 4980, to: 5099 },
];

const NEARLY_EMPTY_BYTES = 15 * 1024;

const USAGE = `Usage: node scripts/check-stills.mjs [--frames=60,200,...] [--scale=N] [--concurrency=N] [--help]

  --frames=a,b,c   replace the default list of 25 frames (integers from 0 to ${TOTAL_FRAMES - 1})
  --scale=N        render scale, default 1 (2 gives 3840x2160)
  --concurrency=N  parallel renders, default half of the CPUs (at least 1)
  --help           show this text

Writes out/stills/fNNNNN.png (frame padded to 5 digits). Exit codes: 0 ok, 1 failure, 2 usage error.`;

function usageError(message) {
  console.error(`Usage error: ${message}`);
  console.error(USAGE);
  console.error("Fix: run `node scripts/check-stills.mjs --help` and correct the flags.");
  process.exit(2);
}

function defaultConcurrency() {
  const n = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.floor(n / 2));
}

function parseArgs(argv) {
  const opts = { frames: null, scale: 1, concurrency: defaultConcurrency(), help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    const m = /^--([a-z0-9-]+)=(.*)$/.exec(arg);
    if (!m) usageError(`unknown or malformed argument "${arg}"`);
    const [, key, value] = m;
    if (key === "frames") {
      const parts = value.split(",").map((s) => s.trim());
      if (parts.length === 0 || parts.some((p) => p === "")) usageError(`--frames needs a comma-separated list of integers (got "${value}")`);
      const frames = [];
      for (const p of parts) {
        if (!/^\d+$/.test(p)) usageError(`--frames: "${p}" is not an integer`);
        const n = Number(p);
        if (n < 0 || n > TOTAL_FRAMES - 1) usageError(`--frames: ${n} is outside 0 to ${TOTAL_FRAMES - 1}`);
        if (!frames.includes(n)) frames.push(n);
      }
      opts.frames = frames;
    } else if (key === "scale") {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0 || n > 4) usageError(`--scale needs a number above 0 and at most 4 (got "${value}")`);
      opts.scale = n;
    } else if (key === "concurrency") {
      if (!/^\d+$/.test(value) || Number(value) < 1) usageError(`--concurrency needs an integer of at least 1 (got "${value}")`);
      opts.concurrency = Number(value);
    } else {
      usageError(`unknown flag --${key}`);
    }
  }
  return opts;
}

// ---------- small inlined helpers (contract 1, rule 3: no shared helper files) ----------

const pad5 = (n) => String(n).padStart(5, "0");

function sceneOf(frame) {
  const s = SCENES.find((x) => frame >= x.from && frame <= x.to);
  return s ? s.id : "S?";
}

function hintFor(err) {
  const m = String((err && err.message) || err);
  if (/out of memory|ENOMEM|heap|memory|Target closed|crashed|SIGKILL|SIGSEGV/i.test(m)) {
    return "Fix: run again with --concurrency=2 (or 1).";
  }
  if (/chrom|browser|download|ENOTFOUND|EAI_AGAIN|ECONNRE|ETIMEDOUT|proxy|socket hang up|fetch failed/i.test(m)) {
    return "Fix: check your connection and run again, or set a Chrome path with the browserExecutable option via the REMOTION_BROWSER_EXECUTABLE env var.";
  }
  return "Fix: open the frame in the Studio (npm run studio), read the error there, then run again.";
}

async function loadRemotion() {
  try {
    const [bundler, renderer] = await Promise.all([import("@remotion/bundler"), import("@remotion/renderer")]);
    return { bundle: bundler.bundle, renderer };
  } catch (err) {
    throw new Error(`Cannot load @remotion/bundler or @remotion/renderer (${err && err.message ? err.message : err}).\nFix: run \`npm install\` in the repo root, then run again.`);
  }
}

async function pool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

function readTextIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// ---------- main ----------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 20) {
    console.error(`Node ${process.versions.node} is too old.\nFix: install Node 20 LTS or newer.`);
    return 1;
  }

  const frames = opts.frames ?? DEFAULT_FRAMES;

  // Startup sanity checks (warnings only).
  const timeline = readTextIfExists(path.join(ROOT, "src", "config", "timeline.ts"));
  if (timeline === null) {
    console.warn("WARNING: src/config/timeline.ts not found, cannot confirm the film length: the frame list may be stale.");
  } else if (!/\bTOTAL\s*=\s*5100\b/.test(timeline)) {
    console.warn('WARNING: src/config/timeline.ts does not contain "TOTAL = 5100": the frame list may be stale.');
  }
  const evidenceText = readTextIfExists(path.join(ROOT, "src", "data", "evidence.json"));
  if (evidenceText !== null) {
    try {
      const evidence = JSON.parse(evidenceText);
      if (evidence && evidence.meta && evidence.meta.sample === true) {
        console.log("stills use SAMPLE evidence (fine for checking)");
      }
    } catch {
      console.warn("WARNING: src/data/evidence.json is not valid JSON (stills may fail). Run: node scripts/validate-evidence.mjs");
    }
  }

  let remotion;
  try {
    remotion = await loadRemotion();
  } catch (err) {
    console.error(err.message);
    return 1;
  }
  const { bundle, renderer } = remotion;
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

  // Remotion resolves public/ from the working directory: make the run independent of where it was started.
  process.chdir(ROOT);

  let serveUrl;
  let composition;
  let browser = null;
  try {
    console.log(`Bundling src/index.ts (once) ...`);
    let lastPct = -1;
    serveUrl = await bundle({
      entryPoint: path.join(ROOT, "src", "index.ts"),
      onProgress: (pct) => {
        const step = Math.floor(pct / 25) * 25;
        if (step !== lastPct && pct < 100) {
          lastPct = step;
          console.log(`  bundle ${step}%`);
        }
      },
    });
    console.log("Bundle ready.");

    if (typeof renderer.openBrowser === "function") {
      try {
        browser = await renderer.openBrowser("chrome", browserExecutable ? { browserExecutable } : {});
      } catch (err) {
        // A shared browser is only an optimisation: fall back to one browser per still.
        console.warn(`WARNING: could not open a shared browser (${err && err.message ? err.message : err}); rendering with one browser per frame.`);
        browser = null;
      }
    }

    composition = await renderer.selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps: {},
      ...(browserExecutable ? { browserExecutable } : {}),
      ...(browser ? { puppeteerInstance: browser } : {}),
    });
  } catch (err) {
    console.error(`Setup failed: ${err && err.message ? err.message : err}`);
    console.error(hintFor(err));
    if (browser) await browser.close({ silent: true }).catch(() => {});
    return 1;
  }

  const last = composition.durationInFrames - 1;
  const outOfRange = frames.filter((f) => f > last);
  if (outOfRange.length > 0) {
    console.error(`Frame(s) ${outOfRange.join(", ")} are beyond the last frame (${last}) of the composition "${COMPOSITION_ID}".`);
    console.error("Fix: pass --frames within the composition length, or update the default list if the film length changed.");
    if (browser) await browser.close({ silent: true }).catch(() => {});
    return 1;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Remove only the stale PNGs this run is about to rewrite.
  for (const frame of frames) {
    fs.rmSync(path.join(OUT_DIR, `f${pad5(frame)}.png`), { force: true });
  }

  const failures = [];
  const warnings = [];
  let done = 0;
  console.log(`Rendering ${frames.length} still(s) at scale ${opts.scale}, concurrency ${opts.concurrency} ...`);

  await pool(frames, opts.concurrency, async (frame) => {
    const name = `f${pad5(frame)}.png`;
    const output = path.join(OUT_DIR, name);
    try {
      await renderer.renderStill({
        composition,
        serveUrl,
        output,
        frame,
        imageFormat: "png",
        scale: opts.scale,
        overwrite: true,
        timeoutInMilliseconds: 120000,
        ...(browserExecutable ? { browserExecutable } : {}),
        ...(browser ? { puppeteerInstance: browser } : {}),
      });
      const bytes = fs.statSync(output).size;
      done += 1;
      const kb = (bytes / 1024).toFixed(0);
      console.log(`[${done + failures.length}/${frames.length}] ${name} (f${frame}, ${sceneOf(frame)}) ${kb} KB`);
      if (bytes < NEARLY_EMPTY_BYTES) {
        const msg = `${name}: frame looks nearly empty: check this frame in the Studio`;
        warnings.push(msg);
        console.warn(`WARNING: ${msg}`);
      }
    } catch (err) {
      const message = String((err && err.message) || err).split("\n")[0];
      failures.push({ frame, name, message, hint: hintFor(err) });
      console.error(`[${done + failures.length}/${frames.length}] ${name} (f${frame}, ${sceneOf(frame)}) FAILED: ${message}`);
    }
  });

  if (browser) await browser.close({ silent: true }).catch(() => {});

  console.log("");
  console.log(`Output folder: ${path.relative(ROOT, OUT_DIR).split(path.sep).join("/")}/`);
  console.log(`${done} of ${frames.length} still(s) written${warnings.length ? `, ${warnings.length} warning(s)` : ""}.`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} frame(s) failed:`);
    for (const f of failures) console.error(`  - f${f.frame} (${f.name}): ${f.message}`);
    const hints = [...new Set(failures.map((f) => f.hint))];
    for (const h of hints) console.error(h);
    return 1;
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
    // Remotion can leave a handle open: end the process shortly after the output has been flushed.
    setTimeout(() => process.exit(code), 1500).unref();
  })
  .catch((err) => {
    console.error(`Unexpected error: ${err && err.stack ? err.stack : err}`);
    console.error(hintFor(err));
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 1500).unref();
  });
