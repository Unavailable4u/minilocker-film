// Visual submission assets: out/cover.png and out/slides-pack/*.png (part 23b of patch 23).
//
//   import { run } from "./submission/visual-assets.mjs";      // used by scripts/make-submission-assets.mjs (23c)
//   node scripts/submission/visual-assets.mjs [--only=cover,slides] [--concurrency=N] [--allow-sample] [--help]
//
// run(ctx) follows the module contract (split contract section 4):
//   ctx = { root, outDir, concurrency, only: Set<string> | null, sample: boolean, log, warn }
//   returns { files: string[], notes: string[] }   (files relative to ctx.root, forward slashes)
// Handles the `only` keys "cover" and "slides"; ignores the others. Throws an Error ending with a "Fix:" hint on failure.
// Never calls process.exit when imported. Run directly it builds its own ctx and does NOT run the evidence check.
// Pure Node 20+ ESM. Imports only node built-ins, @remotion/bundler and @remotion/renderer.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "..", "..");
const COMPOSITION_ID = "MiniLockerFilm";
const POSTER_FRAME = 480; // contract 3.5: S1, eyebrow and title in, tagline starting, dial on screen
const OWN_KEYS = ["cover", "slides"];
const ALL_KEYS = ["cover", "slides", "srt", "voice", "notes"]; // accepted by the CLI like make-submission-assets.mjs
const EXPECTED_W = 1920;
const EXPECTED_H = 1080;
const NEARLY_EMPTY_BYTES = 15 * 1024;

// The 7 slides (contract 3.5, frames re-checked against the built scenes in patch 23). `why` says where the frame comes from, so a scene
// patch that moves a beat can be followed. `sources` are the scene files a human opens at that frame; a source with fewer than 15 lines or
// a first line containing "STUB" marks its scene as unfinished (the slide is then a placeholder and the script says so).
const SLIDES = [
  { file: "01-containers.png", frame: 1680, scene: "S3", shows: "the container with all six chips complete", why: "the last chip lands on f1650 + 22 = f1672 (src/scenes/s3/shared.tsx, S3_TIMING.chips); the hostile-module band enters from about f1690", sources: ["src/scenes/s3/shared.tsx"] },
  { file: "02-lattice.png", frame: 2485, scene: "S4b", shows: "the file lattice mid-reassemble", why: "the shards return over f2460-2505 (src/scenes/s4/shared.tsx, S4_TIMING.reassemble); f2485 is the middle of the move", sources: ["src/scenes/s4/S4b2.tsx", "src/scenes/s4/shared.tsx"] },
  { file: "03-hash-chain.png", frame: 3020, scene: "S4b", shows: "the hash chain, ledger verified", why: "the chain with every link checked, before the proof beat at f3030", sources: ["src/scenes/s4/S4b5.tsx", "src/scenes/s4/shared.tsx"] },
  { file: "04-report.png", frame: 3915, scene: "S6", shows: "the report with all nine cards", why: "the cards flip on f3780 + i * 15 (REPORT.cardsFrom, cardEvery), the ninth is down by f3916; the camera leaves for the ledger block from f3920 (S6_TIMING.pullFrom)", sources: ["src/scenes/S6Evidence.tsx"] },
  { file: "05-compare.png", frame: 4530, scene: "S7", shows: "the competitive table", why: "the table is built by f4500 and the closing caption has landed (S7_TIMING.caption)", sources: ["src/scenes/S7Value.tsx"] },
  { file: "06-architecture.png", frame: 4786, scene: "S8", shows: "the architecture on Vultr, all three chips lit", why: "the last frame where the third chip is fully lit (VULTR.chipFrames[2] f4770 + VULTR.chipLightFrames 16) while the diagram has only just begun to fade (S8_TIMING.diagramOut f4785-4800; the storage path is at full strength since f4761). f4790 is already a third faded out", sources: ["src/scenes/S8Vultr.tsx", "src/gfx/ArchitectureDiagram.tsx"] },
  { file: "07-limits.png", frame: 4950, scene: "S8", shows: "the limits card", why: "all three limits are down (S8_TIMING.limits f4800/4845/4890 + 30), the caption landed on f4900 and the footnote is complete (f4920 + 20 = f4940)", sources: ["src/scenes/S8Vultr.tsx", "src/gfx/LimitsCard.tsx"] },
];

// ---------- small inlined helpers (contract 1, rule 3: no shared helper files) ----------

const toRel = (root, file) => path.relative(root, file).split(path.sep).join("/");

function fixError(message, hint) {
  return new Error(`${message}\n${hint}`);
}

function hintFor(err) {
  const m = String((err && err.message) || err);
  if (/out of memory|ENOMEM|heap|memory|Target closed|crashed|SIGKILL|SIGSEGV/i.test(m)) {
    return "Fix: run again with --concurrency=2 (or 1).";
  }
  if (/chrom|browser|download|ENOTFOUND|EAI_AGAIN|ECONNRE|ETIMEDOUT|proxy|socket hang up|fetch failed/i.test(m)) {
    return "Fix: check your connection and run again, or set a Chrome path with the browserExecutable option via the REMOTION_BROWSER_EXECUTABLE env var.";
  }
  return "Fix: open that frame in the Studio (npm run studio), read the error there, then run again.";
}

function describeFailure(what, err) {
  const text = String((err && err.message) || err);
  const fixLine = text.split("\n").filter((l) => l.startsWith("Fix:")).pop();
  return { what, message: text.split("\n")[0], hint: fixLine || hintFor(err) };
}

function defaultConcurrency() {
  const n = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.floor(n / 2));
}

/** Reads width and height from the PNG header (signature, then IHDR: width at byte 16, height at byte 20, big-endian). */
function readPngSize(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(24);
    const n = fs.readSync(fd, buf, 0, 24, 0);
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (n < 24 || !buf.subarray(0, 8).equals(signature) || buf.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error(`${file} is not a valid PNG (bad signature or IHDR chunk)`);
    }
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
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

/** A scene file is a stub when it has under 15 lines or "STUB" in its first line (23b prompt). null = file not found. */
function stubState(root, rel) {
  const text = readTextIfExists(path.join(root, rel));
  if (text === null) return null;
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] || "";
  return lines.length < 15 || firstLine.includes("STUB");
}

// ---------- reading the real text sizes from the S1 source (contract 6, decision 1) ----------

const SIZE_RE = /(?:fontSize|font-size|labelSize|\bsize)\s*[:=]\s*\{?\s*["']?(\d+(?:\.\d+)?)/g;

/** Lines of `text` that set a size under 28, with the nearest enclosing JSX tag name when one is found just above. */
function smallSizesIn(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  lines.forEach((line, i) => {
    SIZE_RE.lastIndex = 0;
    let m;
    while ((m = SIZE_RE.exec(line)) !== null) {
      const value = Number(m[1]);
      if (value >= 28) continue;
      let tag = null;
      for (let j = i; j >= Math.max(0, i - 8); j--) {
        const t = /<([A-Z][A-Za-z0-9]*)\b/.exec(lines[j]);
        if (t) {
          tag = t[1];
          break;
        }
      }
      found.push({ line: i + 1, value, tag, text: line.trim().slice(0, 110) });
    }
  });
  return found;
}

function resolveRelativeImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Text sizes under 28 px found by READING src/scenes/S1Title.tsx (and the files of the Badge and RadiusDial it imports). Never guessed. */
function findSmallTextOnCover(root) {
  const rel = "src/scenes/S1Title.tsx";
  const file = path.join(root, rel);
  const text = readTextIfExists(file);
  if (text === null) {
    return [`Text under 28 px on the cover: NOT DETERMINED, ${rel} was not found. Open frame 480 in the Studio and check the eyebrow chip and the dial labels by eye.`];
  }
  const out = [];
  const own = smallSizesIn(text);
  if (own.length === 0) {
    out.push(`${rel}: no literal size under 28 found in the file itself (sizes may come from the components or from config/theme.ts).`);
  }
  for (const f of own) {
    out.push(`${rel}:${f.line}: size ${f.value}${f.tag ? ` (inside <${f.tag}>)` : ""}: ${f.text}`);
  }
  // Follow the relative imports of the two components the contract names.
  const importRe = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g;
  let m;
  const wanted = new Set(["Badge", "RadiusDial"]);
  const seen = new Set();
  while ((m = importRe.exec(text)) !== null) {
    const names = [m[1], ...(m[2] || "").split(",").map((s) => s.trim().split(/\s+as\s+/).pop())].filter(Boolean);
    const hit = names.filter((n) => wanted.has(n));
    if (hit.length === 0) continue;
    const target = resolveRelativeImport(file, m[3]);
    if (!target) {
      out.push(`${hit.join(", ")} is imported from "${m[3]}", which could not be resolved from the file: open that component and read its size by hand.`);
      continue;
    }
    if (seen.has(target)) continue;
    seen.add(target);
    const targetText = fs.readFileSync(target, "utf8");
    const sizes = smallSizesIn(targetText);
    const tRel = toRel(root, target);
    if (sizes.length === 0) {
      out.push(`${tRel} (${hit.join(", ")}): no literal size under 28 found.`);
    } else {
      for (const f of sizes.slice(0, 12)) {
        out.push(`${tRel}:${f.line}: size ${f.value} (candidate default of ${hit.join(", ")}, not proven to be the value used at f${POSTER_FRAME}): ${f.text}`);
      }
      if (sizes.length > 12) out.push(`${tRel}: ${sizes.length - 12} more size lines under 28 not listed.`);
    }
  }
  out.push("These are logical sizes read from source, before the camera and the dial scaling of frame 480: the size on screen can differ. They are not pixel measurements.");
  return out;
}

// ---------- Remotion setup (contract 3.4) ----------

async function openRenderer(ctx) {
  let bundler;
  let renderer;
  try {
    [bundler, renderer] = await Promise.all([import("@remotion/bundler"), import("@remotion/renderer")]);
  } catch (err) {
    throw fixError(`Cannot load @remotion/bundler or @remotion/renderer (${err && err.message ? err.message : err}).`, "Fix: run `npm install` in the repo root, then run again.");
  }
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
  const previousCwd = process.cwd();
  process.chdir(ctx.root); // Remotion resolves public/ from the working directory
  let browser = null;
  try {
    ctx.log("Bundling src/index.ts (once) ...");
    let lastStep = -1;
    const serveUrl = await bundler.bundle({
      entryPoint: path.join(ctx.root, "src", "index.ts"),
      onProgress: (pct) => {
        const step = Math.floor(pct / 25) * 25;
        if (step !== lastStep && pct < 100) {
          lastStep = step;
          ctx.log(`  bundle ${step}%`);
        }
      },
    });
    if (typeof renderer.openBrowser === "function") {
      try {
        browser = await renderer.openBrowser("chrome", browserExecutable ? { browserExecutable } : {});
      } catch (err) {
        ctx.warn(`could not open a shared browser (${err && err.message ? err.message : err}); rendering with one browser per frame.`);
        browser = null;
      }
    }
    const common = { ...(browserExecutable ? { browserExecutable } : {}), ...(browser ? { puppeteerInstance: browser } : {}) };
    const composition = await renderer.selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: {}, ...common });
    return {
      composition,
      async still(frame, output, scale = 1) {
        if (frame > composition.durationInFrames - 1) {
          throw fixError(`frame ${frame} is beyond the last frame (${composition.durationInFrames - 1}) of ${COMPOSITION_ID}.`, "Fix: the film is shorter than the frame lists assume; check TOTAL in src/config/timeline.ts.");
        }
        await renderer.renderStill({
          composition,
          serveUrl,
          output,
          frame,
          imageFormat: "png",
          scale,
          overwrite: true,
          timeoutInMilliseconds: 120000,
          ...common,
        });
      },
      async close() {
        if (browser) await browser.close({ silent: true }).catch(() => {});
        process.chdir(previousCwd);
      },
    };
  } catch (err) {
    if (browser) await browser.close({ silent: true }).catch(() => {});
    process.chdir(previousCwd);
    if (/Fix:/.test(String((err && err.message) || ""))) throw err;
    throw fixError(`Remotion setup failed: ${err && err.message ? err.message : err}`, hintFor(err));
  }
}

// ---------- the module contract ----------

/**
 * @param {{root:string,outDir:string,concurrency:number,only:Set<string>|null,sample:boolean,log:(m:string)=>void,warn:(m:string)=>void}} ctx
 * @returns {Promise<{files:string[],notes:string[]}>}
 */
export async function run(ctx) {
  const log = ctx.log || ((m) => console.log(m));
  const warn = ctx.warn || ((m) => console.warn(`WARNING: ${m}`));
  const c = {
    ...ctx,
    root: ctx.root || DEFAULT_ROOT,
    outDir: ctx.outDir || path.join(ctx.root || DEFAULT_ROOT, "out"),
    concurrency: Number.isInteger(ctx.concurrency) && ctx.concurrency >= 1 ? ctx.concurrency : defaultConcurrency(),
    log,
    warn,
  };
  const wantCover = !c.only || c.only.has("cover");
  const wantSlides = !c.only || c.only.has("slides");
  const files = [];
  const notes = [];
  if (!wantCover && !wantSlides) return { files, notes };

  if (c.sample) log("stills use SAMPLE evidence: cover and slides are for checking only, do not submit them.");
  fs.mkdirSync(c.outDir, { recursive: true });

  const errors = [];
  const r = await openRenderer(c);
  try {
    // ---- cover ----
    if (wantCover) {
      const coverPath = path.join(c.outDir, "cover.png");
      log(`[1/1] cover.png (f${POSTER_FRAME}) ...`);
      fs.rmSync(coverPath, { force: true }); // never leave a stale cover behind when this render fails
      try {
        await r.still(POSTER_FRAME, coverPath, 1);
        const { width, height } = readPngSize(coverPath);
        if (width !== EXPECTED_W || height !== EXPECTED_H) {
          fs.rmSync(coverPath, { force: true }); // a wrong-size cover must not be picked up for the submission
          throw fixError(`out/cover.png is ${width}x${height}, expected ${EXPECTED_W}x${EXPECTED_H} (16:9).`, `Fix: check width and height of the ${COMPOSITION_ID} composition in src/Root.tsx (1920x1080), then run again.`);
        }
        const kb = Math.round(fs.statSync(coverPath).size / 1024);
        log(`      cover.png ok ${width}x${height} ${kb} KB`);
        files.push(toRel(c.root, coverPath));
        notes.push(`cover: frame ${POSTER_FRAME} of ${COMPOSITION_ID} rendered at scale 1, unaltered (nothing drawn on top), ${width}x${height} confirmed from the PNG header.`);
        for (const line of findSmallTextOnCover(c.root)) notes.push(`cover, text under 28 px: ${line}`);
      } catch (err) {
        errors.push(describeFailure("cover.png", err));
      }
    }

    // ---- slides ----
    if (wantSlides) {
      const dir = path.join(c.outDir, "slides-pack");
      fs.mkdirSync(dir, { recursive: true });
      // Remove only the 7 files this run rewrites.
      for (const s of SLIDES) fs.rmSync(path.join(dir, s.file), { force: true });

      // Stub detection (the part files of S4 are not pasted into this part's session: read them from disk).
      const stubScenes = new Set();
      for (const s of SLIDES) {
        for (const src of s.sources) {
          const state = stubState(c.root, src);
          if (state === null) {
            warn(`${src} not found: cannot check whether scene ${s.scene} is finished (slide ${s.file}).`);
          } else if (state) {
            stubScenes.add(s.scene);
          }
        }
      }
      for (const scene of stubScenes) {
        const msg = `scene ${scene} is still a stub: slide is a placeholder`;
        warn(msg);
        notes.push(msg);
      }

      const rendered = [];
      await pool(SLIDES, c.concurrency, async (slide, index) => {
        const outPath = path.join(dir, slide.file);
        log(`[${index + 1}/${SLIDES.length}] slides-pack ${slide.file} (f${slide.frame}) ...`);
        try {
          await r.still(slide.frame, outPath, 1);
          const { width, height } = readPngSize(outPath);
          if (width !== EXPECTED_W || height !== EXPECTED_H) {
            fs.rmSync(outPath, { force: true });
            throw fixError(`${slide.file} is ${width}x${height}, expected ${EXPECTED_W}x${EXPECTED_H}.`, `Fix: check width and height of the ${COMPOSITION_ID} composition in src/Root.tsx (1920x1080), then run again.`);
          }
          const bytes = fs.statSync(outPath).size;
          log(`      ${slide.file} ok ${Math.round(bytes / 1024)} KB`);
          if (bytes < NEARLY_EMPTY_BYTES) {
            const msg = `${slide.file}: frame ${slide.frame} looks nearly empty: check this frame in the Studio`;
            warn(msg);
            notes.push(msg);
          }
          rendered.push(slide);
          files.push(toRel(c.root, outPath));
        } catch (err) {
          errors.push(describeFailure(`slides-pack/${slide.file} (f${slide.frame})`, err));
        }
      });
      files.sort();

      notes.push(
        `slides: ${rendered.length} of ${SLIDES.length} rendered. The frames are fixed in the SLIDES list of this file and were checked by eye against the scenes as built in patch 23 (see each slide line); this script does not re-check them, so after a scene patch moves a beat open the frame in the Studio and update the list.`,
      );
      for (const s of SLIDES) {
        notes.push(`slide ${s.file} = f${s.frame} (${s.scene}): must show ${s.shows}. Why this frame: ${s.why}. Scene files: ${s.sources.join(", ")}`);
      }
    }
  } finally {
    await r.close();
  }

  if (errors.length > 0) {
    const hints = [...new Set(errors.map((e) => e.hint))];
    const err = new Error(`${errors.length} visual asset(s) failed:\n${errors.map((e) => `  - ${e.what}: ${e.message}`).join("\n")}\n${hints.join("\n")}`);
    err.partial = { files, notes };
    throw err;
  }
  return { files, notes };
}

// ---------- direct run ----------

const USAGE = `Usage: node scripts/submission/visual-assets.mjs [--only=cover,slides] [--concurrency=N] [--allow-sample] [--help]

  --only=...       any subset of cover, slides (srt, voice, notes are accepted and ignored here)
  --concurrency=N  parallel renders, default half of the CPUs (at least 1)
  --allow-sample   mark the run as using sample evidence (this script does not run the evidence check)
  --help           show this text

Writes out/cover.png and out/slides-pack/01-containers.png ... 07-limits.png. Exit codes: 0 ok, 1 failure, 2 usage error.`;

function usageError(message) {
  console.error(`Usage error: ${message}`);
  console.error(USAGE);
  console.error("Fix: run `node scripts/submission/visual-assets.mjs --help` and correct the flags.");
  return 2;
}

async function directRun(argv) {
  let only = null;
  let concurrency = defaultConcurrency();
  let allowSample = false;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    }
    if (arg === "--allow-sample") {
      allowSample = true;
      continue;
    }
    const m = /^--([a-z0-9-]+)=(.*)$/.exec(arg);
    if (!m) return usageError(`unknown or malformed argument "${arg}"`);
    if (m[1] === "only") {
      const keys = m[2].split(",").map((s) => s.trim());
      const bad = keys.filter((k) => !ALL_KEYS.includes(k));
      if (keys.length === 0 || keys.some((k) => k === "") || bad.length) return usageError(`--only accepts ${ALL_KEYS.join(", ")} (got "${m[2]}")`);
      only = new Set(keys);
    } else if (m[1] === "concurrency") {
      if (!/^\d+$/.test(m[2]) || Number(m[2]) < 1) return usageError(`--concurrency needs an integer of at least 1 (got "${m[2]}")`);
      concurrency = Number(m[2]);
    } else {
      return usageError(`unknown flag --${m[1]}`);
    }
  }
  if (only && !OWN_KEYS.some((k) => only.has(k))) {
    console.log("Nothing selected for this module (it owns: cover, slides).");
    return 0;
  }
  let sample = allowSample;
  const evidenceText = readTextIfExists(path.join(DEFAULT_ROOT, "src", "data", "evidence.json"));
  if (evidenceText !== null) {
    try {
      if (JSON.parse(evidenceText)?.meta?.sample === true) sample = true;
    } catch {
      /* the render will report a broken evidence file itself */
    }
  }
  const ctx = {
    root: DEFAULT_ROOT,
    outDir: path.join(DEFAULT_ROOT, "out"),
    concurrency,
    only,
    sample,
    log: (msg) => console.log(msg),
    warn: (msg) => console.warn(`WARNING: ${msg}`),
  };
  try {
    const { files, notes } = await run(ctx);
    console.log("");
    console.log("Files:");
    for (const f of files) console.log(`  ${f}`);
    if (notes.length) {
      console.log("Notes:");
      for (const n of notes) console.log(`  - ${n}`);
    }
    return 0;
  } catch (err) {
    console.error("");
    console.error(String((err && err.message) || err));
    if (err && err.partial) {
      console.error("Files written before the failure:");
      for (const f of err.partial.files) console.error(`  ${f}`);
    }
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  directRun(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
    // Remotion can leave a handle open: end the process shortly after the output has been flushed.
    setTimeout(() => process.exit(code), 1500).unref();
  });
}
