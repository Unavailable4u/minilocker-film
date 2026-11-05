#!/usr/bin/env node
// `npm run submission`: the entry point of the submission assets (patch 23c).
//
//   node scripts/make-submission-assets.mjs [--allow-sample] [--only=cover,slides,srt,voice,notes] [--concurrency=N] [--help]
//
// What it does, in order:
//   1. Evidence guard (docs/patches/patch-23-split.md, 3.3): runs `scripts/validate-evidence.mjs --final`. Sample or invalid evidence is
//      REFUSED unless --allow-sample is given; then the validator runs without --final, a loud banner is printed and
//      out/SAMPLE_EVIDENCE_WARNING.txt is written. A passing run without --allow-sample deletes that marker.
//   2. Builds one `ctx` and calls run(ctx) of scripts/submission/text-assets.mjs (srt, voice, notes), then of
//      scripts/submission/visual-assets.mjs (cover, slides; part 23b). An error in one does not stop the other.
//   3. Prints every file with its size, every WARNING, every error. Exit code 1 if anything failed.
// It renders nothing itself. Exit codes: 0 success, 1 failure or refusal (with a "Fix:" line), 2 usage error.
// Plain Node 20 ESM, no dependencies, works on Windows (no shell, no bash).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const MARKER = path.join(OUT, "SAMPLE_EVIDENCE_WARNING.txt");
const BANNER = "SAMPLE EVIDENCE: these files must NOT be submitted.";
const TEXT_KEYS = ["srt", "voice", "notes"];
const VISUAL_KEYS = ["cover", "slides"];
const ALL_KEYS = [...VISUAL_KEYS, ...TEXT_KEYS];

const HELP = `Usage: node scripts/make-submission-assets.mjs [--allow-sample] [--only=LIST] [--concurrency=N] [--help]

Builds the submission assets under out/: cover.png and slides-pack/ (part 23b), captions.srt, voice-script.txt and
SUBMISSION_FILM_NOTES.md (part 23c). It renders nothing itself.

  --allow-sample     use sample evidence for a test run (writes out/SAMPLE_EVIDENCE_WARNING.txt; never submit those files)
  --only=LIST        any subset of ${ALL_KEYS.join(",")}
  --concurrency=N    parallel renders for the visual assets (default: half of the CPU count, at least 1)
  --help             this text

Exit codes: 0 success, 1 failure or refusal (a "Fix:" line says what to do), 2 usage error.`;

function usage(message) {
  console.error(message);
  console.error(HELP);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------------------------------------------------

let allowSample = false;
let only = null;
let concurrency = Math.max(1, Math.floor(os.cpus().length / 2));
for (const a of process.argv.slice(2)) {
  if (a === "--help") {
    console.log(HELP);
    process.exit(0);
  } else if (a === "--allow-sample") allowSample = true;
  else if (a.startsWith("--only=")) {
    const keys = a.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
    const bad = keys.filter((k) => !ALL_KEYS.includes(k));
    if (keys.length === 0 || bad.length) usage(`Bad --only value${bad.length ? ` (${bad.join(", ")})` : ""}. Allowed: ${ALL_KEYS.join(",")}.`);
    only = new Set(keys);
  } else if (a.startsWith("--concurrency=")) {
    const n = Number(a.slice(14));
    if (!Number.isInteger(n) || n < 1) usage(`Bad --concurrency value "${a.slice(14)}": use a whole number of 1 or more.`);
    concurrency = n;
  } else usage(`Unknown flag ${a}.`);
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Evidence guard
// ---------------------------------------------------------------------------------------------------------------------

function validate(final) {
  const script = path.join(ROOT, "scripts", "validate-evidence.mjs");
  if (!fs.existsSync(script)) {
    console.error("ERROR: scripts/validate-evidence.mjs not found.");
    console.error("Fix: restore it from git (it comes from patch 02).");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, final ? [script, "--final"] : [script], { cwd: ROOT, encoding: "utf8" });
  if (r.error) {
    console.error(`ERROR: could not run the evidence validator: ${r.error.message}`);
    console.error("Fix: check that Node 20 or newer is installed and run again.");
    process.exit(1);
  }
  return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

if (allowSample) {
  const v = validate(false);
  if (!v.ok) {
    console.error("REFUSING: the evidence is invalid, even for a sample run.");
    if (v.output) console.error(v.output);
    console.error("Fix: correct the problems listed above (check with `npm run evidence:check`), then run again.");
    process.exit(1);
  }
  console.warn("==============================================================");
  console.warn(BANNER);
  console.warn("==============================================================");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MARKER, `${BANNER} ${new Date().toISOString()}\n`, "utf8");
} else {
  const v = validate(true);
  if (!v.ok) {
    console.error("REFUSING: evidence is sample or invalid.");
    if (v.output) console.error(v.output);
    console.error("Fix: capture real evidence (BIBLE 7) or pass --allow-sample for a test render.");
    process.exit(1);
  }
  fs.rmSync(MARKER, { force: true });
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. ctx and the two modules
// ---------------------------------------------------------------------------------------------------------------------

const warnings = new Set(); // WARNING texts, without the prefix
const infoNotes = [];
const files = [];
const errors = []; // { where, message }
const skipped = [];

const ctx = {
  root: ROOT,
  outDir: OUT,
  concurrency,
  only,
  sample: allowSample,
  log: (msg) => console.log(msg),
  warn: (msg) => {
    warnings.add(msg);
    console.warn(`WARNING: ${msg}`);
  },
};

const selected = (keys) => keys.some((k) => !only || only.has(k));

async function runModule(label, file, keys, { optional, partName }) {
  if (!selected(keys)) return;
  const abs = path.join(ROOT, "scripts", "submission", file);
  if (!fs.existsSync(abs)) {
    if (optional) {
      const msg = `${label} skipped: scripts/submission/${file} not found (${partName})`;
      console.warn(msg);
      skipped.push(msg);
    } else {
      errors.push({ where: label, message: `scripts/submission/${file} not found. Fix: restore it from git (${partName}).` });
      console.error(`ERROR (${label}): ${errors[errors.length - 1].message}`);
    }
    return;
  }
  try {
    const mod = await import(pathToFileURL(abs).href);
    if (typeof mod.run !== "function") throw new Error(`scripts/submission/${file} does not export run(ctx). Fix: restore it from git (${partName}).`);
    const result = (await mod.run(ctx)) ?? {};
    for (const f of result.files ?? []) if (!files.includes(f)) files.push(f);
    for (const n of result.notes ?? []) {
      const w = /^WARNING:\s*(.*)$/s.exec(n);
      if (w) warnings.add(w[1]);
      else infoNotes.push(n);
    }
  } catch (e) {
    const message = e?.message ?? String(e);
    errors.push({ where: label, message });
    console.error(`ERROR (${label}): ${message}`);
  }
}

await runModule("text assets", "text-assets.mjs", TEXT_KEYS, { optional: false, partName: "part 23c" });
await runModule("visual assets", "visual-assets.mjs", VISUAL_KEYS, { optional: true, partName: "part 23b" });

// ---------------------------------------------------------------------------------------------------------------------
// 3. Summary
// ---------------------------------------------------------------------------------------------------------------------

console.log("");
console.log("==== Submission assets ====");
if (files.length === 0) console.log("(no files were written)");
for (const f of files) {
  const abs = path.join(ROOT, f);
  try {
    console.log(`  ${f}  ${(fs.statSync(abs).size / 1024).toFixed(1)} KB`);
  } catch {
    console.log(`  ${f}  MISSING`);
    errors.push({ where: f, message: `${f} was reported but is not on disk. Fix: run again; if it repeats, report it with the output above.` });
  }
}
for (const s of skipped) console.log(`  (${s})`);
if (infoNotes.length) {
  console.log("");
  console.log("Notes:");
  for (const n of infoNotes) console.log(`  - ${n}`);
}
if (warnings.size) {
  console.log("");
  console.log(`WARNINGS (${warnings.size}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (allowSample) {
  console.log("");
  console.log(BANNER);
}
if (errors.length) {
  console.log("");
  console.error(`FAILED (${errors.length}):`);
  for (const e of errors) {
    console.error(`  - ${e.where}: ${e.message}`);
    if (!/Fix:/.test(e.message)) console.error("    Fix: read the message above, correct it and run again (use --only=... to rerun one part).");
  }
  process.exitCode = 1;
}
