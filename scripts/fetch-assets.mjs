#!/usr/bin/env node
// Installs the offline assets the film needs. Pure Node (20+), no dependencies, Windows-friendly, idempotent.
//
//   npm run assets
//   npm run assets -- --from ../draft
//   npm run assets -- --force
//
// What it does
//   1. Copies the 7 CMU woff2 files and OFL.txt into public/fonts/.
//      Source order: (1) a local clone of the draft repo, given by --from <path> or the env var MINILOCKER_REPO
//      (files are read from <path>/frontend/src/fonts), else (2) download from
//      https://raw.githubusercontent.com/Unavailable4u/draft/main/frontend/src/fonts/<file>.
//      Every font file must be non-empty and start with the wOF2 magic bytes.
//   2. Creates public/brand/ and writes public/brand/manifest.json, which records whether
//      public/brand/vultr-logo.svg exists. src/ui/VultrLogo.tsx reads that manifest at build time, so nothing
//      touches the network or the file system while a frame renders.
//   3. Prints what is still missing (the official Vultr logo is never generated or redrawn).
//
// Re-run it after you save the Vultr logo, so the manifest picks the logo up.
import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "public", "fonts");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const LOGO_FILE = "vultr-logo.svg";
const MANIFEST = path.join(BRAND_DIR, "manifest.json");
const RAW_BASE = "https://raw.githubusercontent.com/Unavailable4u/draft/main/frontend/src/fonts/";

const FONT_FILES = [
  "cmu-serif-500-roman.woff2",
  "cmu-serif-500-italic.woff2",
  "cmu-serif-700-roman.woff2",
  "cmu-serif-700-italic.woff2",
  "cmu-typewriter-text-500-roman.woff2",
  "cmu-typewriter-text-500-italic.woff2",
  "cmu-typewriter-text-700-roman.woff2",
];
const LICENSE_FILE = "OFL.txt";
const WOFF2_MAGIC = Buffer.from("wOF2", "ascii");

// ---------------------------------------------------------------------------------------------- args

function parseArgs(argv) {
  const out = { from: process.env.MINILOCKER_REPO || "", force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--from") {
      const v = argv[i + 1];
      if (!v || v.startsWith("--")) fail("--from needs a path to a clone of the draft repo.");
      out.from = v;
      i++;
    } else if (a.startsWith("--from=")) out.from = a.slice("--from=".length);
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/fetch-assets.mjs [--from <path-to-draft-clone>] [--force]");
      process.exit(0);
    } else fail(`Unknown argument: ${a}`);
  }
  return out;
}

function fail(message) {
  console.error(`[assets] ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------- helpers

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** A font buffer is valid when it is non-empty and starts with the wOF2 magic bytes. */
function isWoff2(buf) {
  return buf.length > 4 && buf.subarray(0, 4).equals(WOFF2_MAGIC);
}

async function readValidFont(file) {
  try {
    const buf = await readFile(file);
    return isWoff2(buf) ? buf : null;
  } catch {
    return null;
  }
}

/** Where the fonts live inside a local clone. Accepts the repo root or the fonts folder itself. */
async function resolveLocalFontDir(from) {
  if (!from) return null;
  const base = path.resolve(from);
  const candidates = [path.join(base, "frontend", "src", "fonts"), base];
  for (const dir of candidates) {
    if (await exists(path.join(dir, FONT_FILES[0]))) return dir;
  }
  console.warn(`[assets] --from ${base}: no fonts found in frontend/src/fonts, will download instead.`);
  return null;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------------------------- fonts

async function installFonts({ from, force }) {
  await mkdir(FONT_DIR, { recursive: true });
  const localDir = await resolveLocalFontDir(from);
  let failed = 0;

  for (const name of [...FONT_FILES, LICENSE_FILE]) {
    const dest = path.join(FONT_DIR, name);
    const isFont = name !== LICENSE_FILE;

    // Idempotent: a valid file that is already there is left alone unless --force.
    if (!force) {
      if (isFont ? await readValidFont(dest) : await nonEmpty(dest)) {
        console.log(`[assets] ok       fonts/${name} (already present)`);
        continue;
      }
    }

    let done = false;

    if (localDir) {
      const src = path.join(localDir, name);
      if (await exists(src)) {
        const buf = await readFile(src);
        if (isFont ? isWoff2(buf) : buf.length > 0) {
          await copyFile(src, dest);
          console.log(`[assets] copied   fonts/${name} (local clone)`);
          done = true;
        } else {
          console.warn(`[assets] local ${name} is empty or not a valid file, trying download.`);
        }
      }
    }

    if (!done) {
      try {
        const buf = await download(RAW_BASE + name);
        if (isFont ? !isWoff2(buf) : buf.length === 0) throw new Error("downloaded file is empty or not a valid file");
        await writeFile(dest, buf);
        console.log(`[assets] download fonts/${name}`);
        done = true;
      } catch (err) {
        console.error(`[assets] FAILED   fonts/${name}: ${err.message}`);
      }
    }

    if (!done) failed++;
  }
  return failed;
}

async function nonEmpty(file) {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------- brand

async function logoPresent() {
  const file = path.join(BRAND_DIR, LOGO_FILE);
  if (!(await nonEmpty(file))) return false;
  const head = (await readFile(file, "utf8")).slice(0, 4096).toLowerCase();
  return head.includes("<svg");
}

async function writeManifest() {
  await mkdir(BRAND_DIR, { recursive: true });
  const present = await logoPresent();
  const manifest = { vultrLogo: present, vultrLogoFile: LOGO_FILE };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  return present;
}

// ---------------------------------------------------------------------------------------------- main

const args = parseArgs(process.argv.slice(2));
const failedFonts = await installFonts(args);
const hasLogo = await writeManifest();

console.log("");
console.log(`[assets] fonts:  ${FONT_FILES.length - failedFonts} of ${FONT_FILES.length} font files ready in public/fonts`);
console.log(`[assets] brand:  public/brand/manifest.json written (vultrLogo: ${hasLogo})`);

if (!hasLogo) {
  console.log("");
  console.log("  The official Vultr logo is not installed yet.");
  console.log("  Download the official Vultr logo (white or monochrome version) from Vultr's brand/press resources");
  console.log("  and save it as public/brand/vultr-logo.svg. Do not redraw it.");
  console.log("  Until then the film shows a plain text \"Vultr\" wordmark. Run \"npm run assets\" again after saving the file.");
}

if (failedFonts > 0) {
  console.error("");
  console.error(`[assets] ${failedFonts} file(s) could not be installed.`);
  console.error("  Clone the draft repo next to this one and run:  npm run assets -- --from ../draft");
  process.exit(1);
}
