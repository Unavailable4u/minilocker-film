#!/usr/bin/env node
// Patch 23c: the text submission assets. Builds, under out/:
//   captions.srt              (key "srt")    wording from copy.ts, start frames from CUES in timeline.ts, evidence lines from evidence.json
//   voice-script.txt          (key "voice")  blocks V0..V9 of BIBLE 8 with timecodes
//   SUBMISSION_FILM_NOTES.md  (key "notes")  every evidence-derived value of the film with its evidence path
//
// Module contract (docs/patches/patch-23-split.md, section 4): exports run(ctx) -> { files, notes }.
// Run directly:  node scripts/submission/text-assets.mjs [--only=srt,voice,notes] [--concurrency=N] [--allow-sample] [--help]
// Run directly it builds its own ctx and does NOT run the evidence check (that is the job of make-submission-assets.mjs).
//
// Rules this file follows
//   - Plain Node 20 ESM, Node built-ins plus the `typescript` package (already installed). No shell, no bash.
//   - copy.ts and timeline.ts are import-free TypeScript: they are transpiled with the TypeScript API and imported through a data: URL.
//   - evidence.json is read with fs + JSON.parse. src/data/select.ts is never imported (it is TypeScript).
//   - No measured number is typed into any generated text: it comes from evidence.json, or it is a product limit already typed in copy.ts.
//   - Never writes outside out/. Never calls process.exit when imported.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const OWN_KEYS = ["srt", "voice", "notes"];
const ALL_KEYS = ["cover", "slides", ...OWN_KEYS];
const WPM = 150; // voice-over pace (BIBLE 8)
const SRT_MAX_FRAMES = 150; // a cue never stays longer than 5 s (contract 3.7)
const SRT_MIN_FRAMES = 30; // and never shorter than 1 s
const BANNED = /provably safe|zero risk|unhackable|\bsecure(?:d|ly)?\b/i; // honesty rule (copy.ts header)

// ---------------------------------------------------------------------------------------------------------------------
// Small helpers (inlined on purpose: the parts of patch 23 share no helper files)
// ---------------------------------------------------------------------------------------------------------------------

const rel = (root, file) => path.relative(root, file).split(path.sep).join("/");
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const pad = (n, w = 2) => String(n).padStart(w, "0");

function fail(message, fix) {
  return new Error(`${message}. Fix: ${fix}`);
}

/** Writes a text file under outDir (never anywhere else) and returns its path relative to root. */
function writeOut(ctx, name, text) {
  const file = path.resolve(ctx.outDir, name);
  if (path.relative(ctx.outDir, file).startsWith("..")) throw fail(`refusing to write ${file}, it is outside out/`, "this is a bug in text-assets.mjs, report it");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
  return rel(ctx.root, file);
}

/** 32-bit FNV-1a of a string, as 8 hex characters. Same as hashStringToSeed in src/lib/prng.ts (the film's "evidence id"). */
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------------------------------------------------
// Loading the film's config (TypeScript) and the evidence (JSON)
// ---------------------------------------------------------------------------------------------------------------------

async function loadTypeScript() {
  let mod;
  try {
    mod = await import("typescript");
  } catch {
    throw fail("the `typescript` package is not installed", "run `npm install`");
  }
  const ts = mod.default ?? mod;
  if (typeof ts.transpileModule !== "function") throw fail("the `typescript` package did not load as expected", "run `npm install`");
  return ts;
}

/** Transpiles one import-free .ts file to JS and imports it through a data: URL. */
async function loadTsModule(root, relFile, ts) {
  const file = path.join(root, relFile);
  let source;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch {
    throw fail(`cannot read ${relFile}`, "run the script from the repository (src/config/ must exist)");
  }
  if (/^\s*import\s/m.test(source)) {
    throw fail(`${relFile} contains an import line`, "copy.ts/timeline.ts must stay import-free, or resend this script");
  }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, "utf8").toString("base64")}`);
}

function loadEvidence(root) {
  const file = path.join(root, "src/data/evidence.json");
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw fail("cannot read src/data/evidence.json", "restore it from git or run `npm run evidence`");
  }
  try {
    return { ev: JSON.parse(text) };
  } catch (e) {
    throw fail(`src/data/evidence.json is not valid JSON (${e.message})`, "restore it from git or run `npm run evidence`");
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Evidence paths. Plain dots, [0] indexes, and [key=value,key2=value2] selectors that pick the first array item whose
// (dotted) keys all equal the values: "task.events[type=egress.blocked].payload.host".
// ---------------------------------------------------------------------------------------------------------------------

function parsePath(p) {
  const out = [];
  const re = /\[([^\]]*)\]|([^.[\]]+)/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[2] !== undefined) out.push({ key: m[2] });
    else if (/^\d+$/.test(m[1])) out.push({ index: Number(m[1]) });
    else out.push({ where: m[1].split(",").map((part) => { const i = part.indexOf("="); return [part.slice(0, i).split("."), part.slice(i + 1)]; }) });
  }
  return out;
}

function getPath(root, p) {
  let cur = root;
  for (const t of parsePath(p)) {
    if (cur === null || cur === undefined) return undefined;
    if (t.key !== undefined) cur = typeof cur === "object" ? cur[t.key] : undefined;
    else if (t.index !== undefined) cur = Array.isArray(cur) ? cur[t.index] : undefined;
    else cur = Array.isArray(cur) ? cur.find((item) => t.where.every(([keys, value]) => String(getPath(item, keys.join("."))) === value)) : undefined;
  }
  return cur;
}

const missing = (v) => v === undefined || v === null || v === "";
const compact = (v) => (typeof v === "string" ? v : JSON.stringify(v));

// ---------------------------------------------------------------------------------------------------------------------
// captions.srt (contract 3.7)
// ---------------------------------------------------------------------------------------------------------------------

function srtTime(frame, fps) {
  const ms = Math.round((frame / fps) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/**
 * Timing constants of the film script (src/config/script.ts), read as text so that script.ts (which has imports) is never executed.
 * Used only for the evidence-derived lines of S6 and S8; falls back to the BIBLE 6 frames, and says which one it used.
 */
function readScriptFrames(root, tl) {
  const fallbackStart = tl.CUES.s8.lowerThirdsStart;
  const fallbackEnd = tl.CUES.s8.lowerThirdsEnd;
  const fallback = {
    chipFrames: [fallbackStart, Math.round((fallbackStart + fallbackEnd) / 2), fallbackEnd],
    claimsFrom: 4080, // BIBLE 6, S6: "f4080-4259 claims strip"
    chipSource: "BIBLE 6 / CUES.s8 (lowerThirdsStart, middle, lowerThirdsEnd)",
    claimsSource: "BIBLE 6 (f4080)",
  };
  let text = "";
  try {
    text = fs.readFileSync(path.join(root, "src/config/script.ts"), "utf8");
  } catch {
    return fallback;
  }
  const out = { ...fallback };
  const chips = /chipFrames:\s*\[([^\]]*)\]/.exec(text);
  if (chips) {
    const frames = chips[1].split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
    if (frames.length === 3 && frames.every((n) => n >= fallbackStart && n <= fallbackEnd)) {
      out.chipFrames = frames;
      out.chipSource = "src/config/script.ts VULTR.chipFrames";
    }
  }
  const claims = /claimsFrom:\s*(\d+)/.exec(text);
  if (claims && Number(claims[1]) >= tl.SCENES.S6.start && Number(claims[1]) <= tl.SCENES.S6.end) {
    out.claimsFrom = Number(claims[1]);
    out.claimsSource = "src/config/script.ts REPORT.claimsFrom";
  }
  return out;
}

/**
 * Cue frames that a scene patch nudged away from CUES so the callout points at something that is really on screen (S2c, S7).
 * They are read as text from the scene sources (the scenes import React and cannot be loaded here); a value that is missing or
 * more than 30 frames from its nominal cue is ignored and the nominal CUES frame is used.
 */
const NUDGE_SOURCES = [
  { key: "s2.calloutCheck", file: "src/scenes/s2/S2c.tsx", re: /\bcheck:\s*\{\s*start:\s*(\d+)/ },
  { key: "s2.calloutAudit", file: "src/scenes/s2/S2c.tsx", re: /\baudit:\s*\{\s*start:\s*(\d+)/ },
  { key: "s7.line", file: "src/scenes/S7Value.tsx", re: /\bline:\s*\{\s*from:\s*(\d+)/ },
];

function readSceneNudges(root, tl, notes) {
  const out = new Map();
  for (const n of NUDGE_SOURCES) {
    let text = "";
    try {
      text = fs.readFileSync(path.join(root, n.file), "utf8");
    } catch {
      continue;
    }
    const m = n.re.exec(text);
    if (!m) continue;
    const [sceneId, cueKey] = n.key.split(".");
    const nominal = tl.CUES[sceneId]?.[cueKey];
    const frame = Number(m[1]);
    if (!isNum(nominal) || Math.abs(frame - nominal) > 30) continue;
    if (frame !== nominal) {
      out.set(n.key, frame);
      notes.push(`srt: CUES.${n.key} = ${nominal} but ${n.file} starts it at f${frame}; the scene's frame is used`);
    }
  }
  return out;
}

/** The evidence-derived caption lines of S6 (claims strip) and S8 (lower-thirds). A value missing from evidence skips its line. */
function evidenceCues(ev, copy, tl, frames, warn, notes) {
  const cues = [];
  const skipped = (what, paths) => {
    warn(`captions: ${what} skipped, not in evidence: ${paths.join(", ")}`);
    notes.push(`srt: skipped ${what} (missing ${paths.join(", ")})`);
  };
  const pct = (x) => Math.round(x * 100);

  // S6 claims strip: four lines in one cue, from the first beat of the strip.
  const m = ev.measured ?? {};
  const lines = [];
  const fx = m.fixRepoV2;
  if (isObj(fx) && isNum(fx.passes) && isNum(fx.runs) && isNum(fx.ciLow) && isNum(fx.ciHigh)) {
    lines.push(`${fx.passes}/${fx.runs} finished (95% CI ${pct(fx.ciLow)}-${pct(fx.ciHigh)}%)`);
  } else {
    skipped("claim 'finished'", ["measured.fixRepoV2.passes", "measured.fixRepoV2.runs", "measured.fixRepoV2.ciLow", "measured.fixRepoV2.ciHigh"].filter((p) => !isNum(getPath(ev, p))));
  }
  const sum = ev.attackSummary;
  if (isObj(sum) && isNum(sum.contained) && isNum(sum.total)) lines.push(`${sum.contained}/${sum.total} attacks contained`);
  else skipped("claim 'attacks contained'", ["attackSummary.contained", "attackSummary.total"].filter((p) => !isNum(getPath(ev, p))));
  const hk = m.hookEscaped;
  if (isObj(hk) && isNum(hk.escaped) && isNum(hk.runs)) lines.push(`${hk.escaped}/${hk.runs} hook escapes`);
  else skipped("claim 'hook escapes'", ["measured.hookEscaped.escaped", "measured.hookEscaped.runs"].filter((p) => !isNum(getPath(ev, p))));
  const rs = m.realSecrets;
  if (isObj(rs) && isNum(rs.runsWithReal) && isNum(rs.runs)) {
    // "N real secrets in M runs" is only true as worded when no run had one; otherwise say what was counted (runs, not secrets).
    lines.push(rs.runsWithReal === 0 ? `0 real secrets in ${rs.runs} runs` : `${rs.runsWithReal} of ${rs.runs} runs had a real secret`);
  } else {
    skipped("claim 'real secrets'", ["measured.realSecrets.runsWithReal", "measured.realSecrets.runs"].filter((p) => !isNum(getPath(ev, p))));
  }
  if (lines.length) cues.push({ start: frames.claimsFrom, scene: "S6", rank: 2, lines });

  // S8 lower-thirds: product name from copy.ts, details from evidence.
  const names = copy.s8.lowerThirds;
  const vultr = ev.infra?.vultr;
  const inf = ev.infra?.inference;
  const sto = ev.infra?.storage;
  const lower = [
    { text: !missing(vultr?.region) && !missing(vultr?.plan) ? `${names[0]} - ${vultr.region} - ${vultr.plan}` : null, paths: ["infra.vultr.region", "infra.vultr.plan"] },
    { text: !missing(inf?.host) && !missing(inf?.model) ? `${names[1]} - ${inf.host} - ${inf.model}` : null, paths: ["infra.inference.host", "infra.inference.model"] },
    // BIBLE 6, f4770: "Vultr Object Storage - artifacts, SHA-256 in the ledger". Only said when the storage is really attached.
    { text: sto?.attached === true && sto?.vultr === true ? `${names[2]} - artifacts, SHA-256 in the ledger` : null, paths: ["infra.storage.attached", "infra.storage.vultr"] },
  ];
  lower.forEach((item, i) => {
    if (item.text) cues.push({ start: frames.chipFrames[i], scene: "S8", rank: 2, lines: [item.text] });
    else skipped(`S8 lower-third ${i + 1} (${names[i]})`, item.paths.filter((p) => missing(getPath(ev, p)) || getPath(ev, p) === false));
  });
  return cues;
}

function buildSrt({ copy, tl, ev, root, warn, notes }) {
  const fps = tl.FPS;
  const frames = readScriptFrames(root, tl);
  const nudges = readSceneNudges(root, tl, notes);
  const items = []; // { start, scene, rank, lines }

  for (const [sceneId, keys] of Object.entries(tl.CUES)) {
    const scene = tl.SCENES[sceneId.toUpperCase()];
    for (const [cueKey, nominalStart] of Object.entries(keys)) {
      const start = nudges.get(`${sceneId}.${cueKey}`) ?? nominalStart;
      if (cueKey === "badge" || cueKey.startsWith("lowerThirds")) continue; // badges are excluded; lower-thirds come from evidence below
      const copyKey = sceneId === "s1" && cueKey === "lockup" ? "tagline" : cueKey; // the S1 cue is named for the lockup, its words are the tagline
      const text = copy[sceneId]?.[copyKey];
      const lines = Array.isArray(text) ? text.filter((l) => typeof l === "string") : typeof text === "string" ? [text] : [];
      if (lines.length === 0) {
        warn(`captions: CUES.${sceneId}.${cueKey} has no text at copy.${sceneId}.${copyKey}, cue skipped`);
        notes.push(`srt: CUES.${sceneId}.${cueKey} has no copy text (skipped)`);
        continue;
      }
      if (start < scene.start || start > scene.end) warn(`captions: CUES.${sceneId}.${cueKey} = ${start} is outside scene ${scene.id} (${scene.start}-${scene.end})`);
      items.push({ start, scene: scene.id, rank: /^(callout)/.test(cueKey) ? 1 : 0, lines });
    }
  }
  items.push(...evidenceCues(ev, copy, tl, frames, warn, notes));
  notes.push(`srt: S8 lower-third frames from ${frames.chipSource}; S6 claims strip frame from ${frames.claimsSource}`);

  // Same start frame: one cue, caption line first, evidence-derived lines last.
  const byStart = new Map();
  items.forEach((it, order) => {
    const cue = byStart.get(it.start) ?? { start: it.start, scene: it.scene, parts: [] };
    cue.parts.push({ rank: it.rank, order, lines: it.lines });
    byStart.set(it.start, cue);
  });
  const cues = [...byStart.values()].sort((a, b) => a.start - b.start);
  if (cues.length === 0) throw fail("no caption could be built", "check CUES in src/config/timeline.ts and copy in src/config/copy.ts");

  const blocks = cues.map((cue, i) => {
    const sceneEnd = tl.SCENES[cue.scene].end + 1;
    const next = i + 1 < cues.length ? cues[i + 1].start : Infinity;
    let end = Math.min(next, sceneEnd, cue.start + SRT_MAX_FRAMES);
    if (end - cue.start < SRT_MIN_FRAMES) end = cue.start + SRT_MIN_FRAMES; // extend, shorten nothing else
    cue.end = end;
    const text = cue.parts.sort((a, b) => a.rank - b.rank || a.order - b.order).flatMap((p) => p.lines).join("\n");
    return `${i + 1}\n${srtTime(cue.start, fps)} --> ${srtTime(end, fps)}\n${text}`;
  });
  const span = { from: cues[0].start, to: cues[cues.length - 1].end };
  return { text: `${blocks.join("\n\n")}\n`, count: cues.length, span, fps };
}

// ---------------------------------------------------------------------------------------------------------------------
// voice-script.txt (contract 3.8)
// ---------------------------------------------------------------------------------------------------------------------

const NUM_WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

function loadVoiceBlocks(copy, root) {
  if (Array.isArray(copy.voiceBlocks) && copy.voiceBlocks.length > 0) {
    const blocks = copy.voiceBlocks.map((b) => ({ id: String(b.id), start: Number(b.start), text: String(b.text) }));
    return { blocks, source: "the voiceBlocks export of src/config/copy.ts" };
  }
  const file = path.join(root, "docs/bible/bible-08.md");
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw fail("copy.ts has no voiceBlocks export and docs/bible/bible-08.md cannot be read", "restore docs/bible/bible-08.md from git");
  }
  const blocks = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(V\d+)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (m) blocks.push({ id: m[1], start: Number(m[2]), text: m[3] });
  }
  const ids = blocks.map((b) => b.id).join(",");
  if (ids !== "V0,V1,V2,V3,V4,V5,V6,V7,V8,V9") {
    throw fail(`found voice blocks "${ids}" in docs/bible/bible-08.md, expected V0 to V9 in order`, "restore docs/bible/bible-08.md from git");
  }
  return { blocks, source: "the V0..V9 table of docs/bible/bible-08.md (copy.ts has no voiceBlocks export)" };
}

const countWords = (s) => (s.match(/\S+/g) ?? []).length;

function mss(seconds) {
  const tenths = Math.round(seconds * 10);
  return `${Math.floor(tenths / 600)}:${pad(Math.floor((tenths % 600) / 10))}.${tenths % 10}`;
}

/** Numbers said aloud are compared with the evidence: a table of phrases, then a sweep for any number left over. */
function checkSpokenNumbers(blocks, ev, s3Base, warn, notes) {
  const bugs = getPath(ev, "task.events[type=scenario.check].payload.facts.bugs");
  const dims = getPath(ev, "task.report.dimensions");
  const secrets = getPath(ev, `${s3Base}.report.dimensions.secrets`);
  const checks = [
    {
      block: "V2", re: /\b(\w+)\s+bugs\b/i, what: "bugs", where: "task.events[type=scenario.check].payload.facts.bugs",
      expected: isObj(bugs) ? Object.keys(bugs).length : undefined,
    },
    {
      block: "V3", re: /\b(zero)\s+real\s+secrets\b/i, what: "real secrets", where: `${s3Base}.report.dimensions.secrets.real_secrets_in_sandbox`,
      expected: secrets?.real_secrets_in_sandbox === false ? 0 : isObj(secrets?.real_secrets_found) && Object.keys(secrets.real_secrets_found).length > 0 ? Object.keys(secrets.real_secrets_found).length : undefined,
    },
    {
      block: "V6", re: /\b(\w+)\s+dimensions\b/i, what: "dimensions", where: "task.report.dimensions",
      expected: isObj(dims) ? Object.keys(dims).length : undefined,
    },
  ];
  const wordPattern = new RegExp(`\\b(?:${Object.keys(NUM_WORDS).filter((w) => w !== "one").join("|")})\\b|\\d+`, "gi");
  for (const b of blocks) {
    let text = b.spoken;
    for (const c of checks.filter((x) => x.block === b.id)) {
      const m = c.re.exec(text);
      if (!m) continue;
      const said = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1].toLowerCase()];
      if (said === undefined) continue; // the word before it is not a number ("a bugs ..."), nothing to check
      if (c.expected === undefined) warn(`voice: ${b.id} says "${m[0]}" but the evidence cannot confirm it (looked at ${c.where})`);
      else if (c.expected !== said) warn(`voice: ${b.id} says "${m[0]}" but the evidence has ${c.expected} (${c.where}). Change the wording or re-capture`);
      else notes.push(`voice: ${b.id} "${m[0]}" confirmed by ${c.where}`);
      text = text.replace(m[0], " ");
    }
    for (const hit of text.match(wordPattern) ?? []) warn(`voice: ${b.id} says the number "${hit}" and nothing in the evidence was checked against it`);
  }
}

function buildVoice({ copy, tl, ev, root, s3Base, warn, notes }) {
  const { blocks, source } = loadVoiceBlocks(copy, root);
  const fps = tl.FPS;
  const prepared = blocks.map((b) => {
    // The inline marker "(silence f2370-2399)" becomes its own line; its length counts as time inside the block.
    const parts = [];
    let pauseSeconds = 0;
    let last = 0;
    const re = /\(silence f(\d+)-(\d+)\)/g;
    let m;
    while ((m = re.exec(b.text))) {
      parts.push({ say: b.text.slice(last, m.index).trim() });
      const a = Number(m[1]);
      const z = Number(m[2]);
      const secs = (z - a + 1) / fps;
      pauseSeconds += secs;
      parts.push({ pause: `(pause ${secs.toFixed(1)} s, frames ${a}-${z})` });
      last = m.index + m[0].length;
    }
    parts.push({ say: b.text.slice(last).trim() });
    const spoken = parts.filter((p) => p.say).map((p) => p.say).join(" ");
    return { ...b, parts: parts.filter((p) => p.pause || p.say), spoken, words: countWords(spoken), pauseSeconds };
  });

  const words = prepared.reduce((n, b) => n + b.words, 0);
  const totalSeconds = (words / WPM) * 60;
  const out = [`# Words: ${words} (spoken text only)`, `# Estimated at ${WPM} wpm: ${mss(totalSeconds).replace(/\.\d$/, "")} (${Math.round(totalSeconds)} s, without the pauses)`, ""];

  prepared.forEach((b, i) => {
    out.push(`[${b.id} | f${b.start} | ${mss(b.start / fps)}]`);
    for (const p of b.parts) out.push(p.pause ?? p.say);
    out.push("");
    const needs = (b.words / WPM) * 60 + b.pauseSeconds;
    const nextStart = i + 1 < prepared.length ? prepared[i + 1].start : tl.TOTAL;
    const room = nextStart / fps - b.start / fps;
    if (needs > room) {
      const nextName = i + 1 < prepared.length ? `${prepared[i + 1].id} (f${nextStart})` : `the end of the film (f${nextStart})`;
      warn(`voice: ${b.id} needs about ${needs.toFixed(1)} s at ${WPM} wpm but only ${room.toFixed(1)} s are free before ${nextName}; it runs ${(needs - room).toFixed(1)} s over`);
    }
  });
  checkSpokenNumbers(prepared, ev, s3Base, warn, notes);
  notes.push(`voice: blocks taken from ${source}`);
  return { text: `${out.join("\n").replace(/\n+$/, "")}\n`, words, totalSeconds, source };
}

// ---------------------------------------------------------------------------------------------------------------------
// SUBMISSION_FILM_NOTES.md (contract 3.9)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The static row list. Every row = what is shown or said, scene and frames (BIBLE 6, 8), and ONE evidence path.
 * `pick` lists fields of an object path to print as name=value; `format` is "len" (array), "keys" (object), "host" (URL).
 * S3 reads the run named by evidence.s3Source, S6 the report of the fix_repo_v2 task (REPORT.source "fix" in script.ts).
 */
function noteRows(ev) {
  const s3 = ev.s3Source === "task" || missing(ev.s3Source) ? "task" : `attacks.${String(ev.s3Source).replace(/^attack:/, "")}`;
  const A = "attacks.rewind_after_rm_rf";
  const H = "attacks.hostile_page_injection";
  const R = "task.report";
  return {
    s3Base: s3,
    rows: [
      // S2
      { shown: "Task id (running chip in the header)", at: "S2 f750-1199", path: "task.id" },
      { shown: "Scenario run", at: "S2 f690-749", path: "task.scenario" },
      { shown: "Inference model (chip \"Vultr Serverless Inference - model\")", at: "S2 f750-1199", path: "infra.inference.model" },
      // S3
      { shown: "Decoys planted (Secrets gauge, rack)", at: "S3 f1500-1799", path: `${s3}.report.dimensions.secrets.decoys_planted` },
      { shown: "Decoys read (tiles turn amber)", at: "S3 f1560-1799", path: `${s3}.report.dimensions.secrets.decoys_read`, format: "len" },
      { shown: "Blocked host (packet at the egress wall)", at: "S3 f1800-1929", path: `${s3}.events[type=egress.blocked].payload.host` },
      { shown: "Audit stamp: real secrets in sandbox", at: "S3 f1930-2039", path: `${s3}.report.dimensions.secrets.real_secrets_in_sandbox` },
      // S4
      { shown: "Donut total (\"0 of N contained\")", at: "S4 f2100-2159", path: "attackSummary.total" },
      { shown: "Snapshot hash restored against (8 hex shown)", at: "S4 f2220-2339", path: `${A}.events[type=timeline.rewound].payload.snapshot_sha256` },
      { shown: "Wipe output (WIPED_n)", at: "S4 f2340-2399", path: `${A}.result.steps[index=1].result` },
      { shown: "Files re-hashed", at: "S4 f2460-2579, f3030-3299", path: `${A}.events[type=timeline.rewound].payload.verified.files` },
      { shown: "Checks passed", at: "S4 f2700-2819, f3030-3299", path: `${A}.result.counts.pass` },
      { shown: "Ledger verify (events, head hash)", at: "S4 f2820-3029", path: `${A}.verify`, pick: ["verified", "events", "head_hash"] },
      { shown: "Seconds (the run's duration)", at: "S4 f3030-3299", path: `${A}.result.duration_s` },
      // S5
      { shown: "Injection score", at: "S5 f3360-3479", path: `${H}.events[type=injection.suspected].payload.score` },
      { shown: "Denied command: risk", at: "S5 f3480-3599", path: `${H}.events[type=policy.decision,payload.action=deny].payload.risk` },
      // Shown only when the ledger has the event: the hostile run is usually denied before it reaches the proxy (src/scenes/s5/data.ts).
      { shown: "Blocked host (\"Egress blocked -> host\", only if the ledger has it)", at: "S5 f3480-3599", path: `${H}.events[type=egress.blocked].payload.host`, optional: true },
      // S6: the nine headlines, in the report's own order
      { shown: "Headline: network", at: "S6 f3780-3959", path: `${R}.dimensions.network`, pick: ["status", "attempts", "allowed", "blocked"] },
      { shown: "Headline: policy", at: "S6 f3780-3959", path: `${R}.dimensions.policy`, pick: ["status", "decisions", "by_action", "approvals_requested"] },
      { shown: "Headline: persistence", at: "S6 f3780-3959", path: `${R}.dimensions.persistence`, pick: ["status", "snapshots_taken", "rewinds", "final_sandbox_destroyed"] },
      { shown: "Headline: time", at: "S6 f3780-3959", path: `${R}.dimensions.time`, pick: ["status", "wall_clock_s", "approval_wait_s"] },
      { shown: "Headline: browser", at: "S6 f3780-3959", path: `${R}.dimensions.browser`, pick: ["status", "pages", "injection_suspected"] },
      { shown: "Headline: artifacts", at: "S6 f3780-3959", path: `${R}.dimensions.artifacts`, pick: ["status", "stored", "bytes"] },
      { shown: "Headline: filesystem", at: "S6 f3780-3959", path: `${R}.dimensions.filesystem`, pick: ["status", "rootfs_changes", "workspace.files"] },
      { shown: "Headline: secrets", at: "S6 f3780-3959", path: `${R}.dimensions.secrets`, pick: ["status", "decoys_planted", "real_secrets_in_sandbox"] },
      { shown: "Headline: compute", at: "S6 f3780-3959", path: `${R}.dimensions.compute`, pick: ["status", "peak_memory_bytes", "memory_limit_bytes", "peak_pids", "pids_limit"] },
      { shown: "Verify ledger result (events, head hash)", at: "S6 f3960-4079", path: "task.verify", pick: ["verified", "events", "head_hash"] },
      { shown: "Claim: tasks finished (with 95% CI)", at: "S6 f4080-4259", path: "measured.fixRepoV2", pick: ["passes", "runs", "ciLow", "ciHigh"] },
      { shown: "Claim: attacks contained", at: "S6 f4080-4259", path: "attackSummary", pick: ["contained", "total"] },
      { shown: "Claim: hook escapes", at: "S6 f4080-4259", path: "measured.hookEscaped", pick: ["escaped", "runs"] },
      { shown: "Claim: real secrets", at: "S6 f4080-4259", path: "measured.realSecrets", pick: ["runsWithReal", "runs"] },
      { shown: "\"CI green\" chip (only when true)", at: "S6 f4080-4259", path: "ci.conclusion" },
      { shown: "Footer: commit", at: "S6 f4080-4259", path: "meta.commit" },
      { shown: "Footer: run id (evidence id)", at: "S6 f4080-4259", computed: true },
      // S8
      { shown: "Vultr VM: region", at: "S8 f4650", path: "infra.vultr.region" },
      { shown: "Vultr VM: plan", at: "S8 f4650", path: "infra.vultr.plan" },
      { shown: "Inference host", at: "S8 f4710", path: "infra.inference.host" },
      { shown: "Inference model", at: "S8 f4710", path: "infra.inference.model" },
      { shown: "Object Storage attached", at: "S8 f4770", path: "infra.storage.attached" },
      // S9
      { shown: "Demo host", at: "S9 f5040-5099", path: "meta.baseUrl", format: "host" },
      // Said aloud (BIBLE 8): numbers in the voice-over
      { shown: "Said (V2): \"three bugs\" in the library", at: "V2 f700", path: "task.events[type=scenario.check].payload.facts.bugs", format: "keys" },
      { shown: "Said (V3): \"zero real secrets\" in the sandbox", at: "V3 f1520", path: `${s3}.report.dimensions.secrets.real_secrets_in_sandbox` },
      { shown: "Said (V6): \"nine dimensions\" in the report", at: "V6 f3740", path: `${R}.dimensions`, format: "keys" },
    ],
  };
}

function formatValue(value, row) {
  if (row.pick) {
    const parts = [];
    for (const field of row.pick) {
      const v = getPath(value, field);
      if (v !== undefined) parts.push(`${field}=${compact(v)}`);
    }
    return parts.length ? parts.join(", ") : undefined;
  }
  if (row.format === "len") return Array.isArray(value) ? (value.length ? `${value.length}: ${value.join(", ")}` : "0") : undefined;
  if (row.format === "keys") return isObj(value) ? `${Object.keys(value).length}: ${Object.keys(value).join(", ")}` : undefined;
  if (row.format === "host") {
    try {
      return new URL(value).host;
    } catch {
      return String(value);
    }
  }
  return compact(value).replace(/\s+/g, " ").trim();
}

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function buildNotes({ copy, ev, evId, warn }) {
  const { rows, s3Base } = noteRows(ev);
  const meta = ev.meta ?? {};
  const out = [];
  if (meta.sample === true) out.push("SAMPLE EVIDENCE - NOT FOR SUBMISSION", "");
  out.push(
    "# Submission film notes",
    "",
    "Every value shown or said in the film that is read from evidence, with the path it comes from. Written by `scripts/submission/text-assets.mjs`.",
    "",
    `- Evidence id (run id on screen): \`${evId}\` (32-bit FNV-1a of src/data/evidence.json)`,
    `- Commit: ${missing(meta.commit) ? "not recorded" : `\`${meta.commit}\``}`,
    `- Captured: ${missing(meta.capturedAt) ? "not recorded" : meta.capturedAt}`,
    `- Deployment: ${missing(meta.baseUrl) ? "not recorded" : meta.baseUrl}`,
    `- Sample evidence: ${meta.sample === true ? "yes" : "no"}`,
    `- S3 reads from: \`${s3Base}\``,
    "",
    "## Evidence-derived items",
    "",
    "| Shown or said in the film | Scene and frames | Evidence path | Value now |",
    "|---|---|---|---|",
  );
  for (const row of rows) {
    let value;
    let pathText;
    if (row.computed) {
      value = evId;
      pathText = "(computed) FNV-1a of the text of src/data/evidence.json";
    } else {
      pathText = row.path;
      const raw = getPath(ev, row.path);
      value = missing(raw) ? undefined : formatValue(raw, row);
    }
    if ((value === undefined || value === "") && row.optional) {
      value = "not shown: this run's ledger has no such event";
    } else if (value === undefined || value === "") {
      warn(`notes: "${row.shown}" (${row.at}): ${pathText} is not in the evidence`);
      value = "NOT IN EVIDENCE";
    }
    out.push(`| ${cell(row.shown)} | ${cell(row.at)} | \`${cell(pathText)}\` | ${cell(value)} |`);
  }

  // Static wording: product limits typed in copy.ts. Compared with what the evidence measured, never presented as a measurement.
  out.push("", "## Static wording", "", "These limits are typed in `src/config/copy.ts` (`s3.chips`). They are product limits, not run measurements. The last column is what the run's own compute audit reported, for comparison.", "", "| Wording in the film | Where | Run's audit says |", "|---|---|---|");
  const compute = getPath(ev, "task.report.dimensions.compute");
  for (const chip of copy.s3.chips.filter((c) => /\d/.test(c))) {
    let audit = "n/a";
    let cmp = null;
    const proc = /(\d+)\s*processes/i.exec(chip);
    const mem = /(\d+)\s*MB/i.exec(chip);
    if (proc) cmp = { said: Number(proc[1]), got: compute?.pids_limit, path: "task.report.dimensions.compute.pids_limit", show: (v) => `${v} (pids_limit)` };
    else if (mem) cmp = { said: Number(mem[1]), got: isNum(compute?.memory_limit_bytes) ? compute.memory_limit_bytes / (1024 * 1024) : undefined, path: "task.report.dimensions.compute.memory_limit_bytes", show: (v) => `${v} MB (memory_limit_bytes)` };
    if (cmp) {
      if (!isNum(cmp.got)) {
        audit = "NOT IN EVIDENCE";
        warn(`notes: static wording "${chip}" cannot be compared, ${cmp.path} is not in the evidence`);
      } else {
        audit = cmp.show(cmp.got);
        if (cmp.got !== cmp.said) warn(`notes: static wording "${chip}" does not match the run's audit (${audit})`);
      }
    }
    out.push(`| ${cell(chip)} | copy.s3.chips | ${cell(audit)} |`);
  }
  return `${out.join("\n")}\n`;
}

// ---------------------------------------------------------------------------------------------------------------------
// run(ctx): the module contract
// ---------------------------------------------------------------------------------------------------------------------

/**
 * ctx = { root, outDir, concurrency, only: Set<string> | null, sample, log, warn }
 * returns { files: string[], notes: string[] }   (files relative to root, forward slashes)
 */
export async function run(ctx) {
  const wanted = OWN_KEYS.filter((k) => !ctx.only || ctx.only.has(k));
  const files = [];
  const notes = [];
  if (wanted.length === 0) return { files, notes };

  // Every warning goes to the screen once and into `notes` (so the entry point can list them again at the end).
  const seen = new Set();
  const warn = (msg) => {
    if (seen.has(msg)) return;
    seen.add(msg);
    ctx.warn(msg);
    notes.push(`WARNING: ${msg}`);
  };
  const scan = (name, text) => {
    const bad = BANNED.exec(text);
    if (bad) warn(`${name}: contains the word "${bad[0]}", which the honesty rule forbids`);
    if (text.includes("!")) warn(`${name}: contains an exclamation mark, which the copy rules forbid`);
  };

  const ts = await loadTypeScript();
  const copyMod = await loadTsModule(ctx.root, "src/config/copy.ts", ts);
  const tl = await loadTsModule(ctx.root, "src/config/timeline.ts", ts);
  const copy = copyMod.copy ?? copyMod;
  if (!copy?.s3?.chips || !copy?.s8?.lowerThirds || !tl?.CUES || !tl?.SCENES) {
    throw fail("copy.ts or timeline.ts does not have the expected exports (copy, CUES, SCENES)", "restore src/config/copy.ts and src/config/timeline.ts from git");
  }
  // loadEvidence returns the parsed object; the evidence id is the hash of its JSON text (same as selectEvidenceShortId in select.ts).
  const { ev } = loadEvidence(ctx.root);
  const evId = fnv1a(JSON.stringify(ev));
  const { s3Base } = noteRows(ev);
  const total = wanted.length;
  let n = 0;

  if (wanted.includes("srt")) {
    ctx.log(`[${++n}/${total}] captions.srt ...`);
    const r = buildSrt({ copy, tl, ev, root: ctx.root, warn, notes });
    scan("captions.srt", r.text);
    files.push(writeOut(ctx, "captions.srt", r.text));
    const s = (f) => mss(f / r.fps).replace(/\.\d$/, "");
    ctx.log(`      ${r.count} cues, from ${s(r.span.from)} to ${s(r.span.to)} (f${r.span.from}-f${r.span.to})`);
    notes.push(`srt: ${r.count} cues, f${r.span.from}-f${r.span.to}`);
  }
  if (wanted.includes("voice")) {
    ctx.log(`[${++n}/${total}] voice-script.txt ...`);
    const r = buildVoice({ copy, tl, ev, root: ctx.root, s3Base, warn, notes });
    scan("voice-script.txt", r.text);
    files.push(writeOut(ctx, "voice-script.txt", r.text));
    ctx.log(`      ${r.words} words, about ${mss(r.totalSeconds).replace(/\.\d$/, "")} at ${WPM} wpm (source: ${r.source})`);
  }
  if (wanted.includes("notes")) {
    ctx.log(`[${++n}/${total}] SUBMISSION_FILM_NOTES.md ...`);
    const text = buildNotes({ copy, ev, evId, warn });
    scan("SUBMISSION_FILM_NOTES.md", text);
    files.push(writeOut(ctx, "SUBMISSION_FILM_NOTES.md", text));
    ctx.log(`      ${text.split("\n").filter((l) => l.startsWith("| ") && l.includes("`")).length} rows${ev.meta?.sample === true ? " (marked SAMPLE EVIDENCE)" : ""}`);
  }
  return { files, notes };
}

// ---------------------------------------------------------------------------------------------------------------------
// Direct run: node scripts/submission/text-assets.mjs [--only=...] [--concurrency=N] [--allow-sample] [--help]
// ---------------------------------------------------------------------------------------------------------------------

const HELP = `Usage: node scripts/submission/text-assets.mjs [--only=srt,voice,notes] [--concurrency=N] [--allow-sample] [--help]

Builds out/captions.srt, out/voice-script.txt and out/SUBMISSION_FILM_NOTES.md from copy.ts, timeline.ts and evidence.json.
Run directly it does NOT check the evidence (use "npm run submission" for the guarded run).

  --only=LIST        any subset of srt,voice,notes (cover and slides belong to visual-assets.mjs and are ignored here)
  --concurrency=N    accepted for symmetry, not used
  --allow-sample     accepted for symmetry (the notes file is marked by evidence.json's meta.sample, not by this flag)
  --help             this text`;

function usage(message) {
  console.error(message);
  console.error(HELP);
  return 2;
}

async function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  let only = null;
  let concurrency = Math.max(1, Math.floor(os.cpus().length / 2));
  let sample = false;
  for (const a of argv) {
    if (a === "--help") {
      console.log(HELP);
      return 0;
    } else if (a === "--allow-sample") sample = true;
    else if (a.startsWith("--only=")) {
      const keys = a.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
      const bad = keys.filter((k) => !ALL_KEYS.includes(k));
      if (keys.length === 0 || bad.length) return usage(`Bad --only value${bad.length ? ` (${bad.join(", ")})` : ""}. Allowed: ${ALL_KEYS.join(",")}.`);
      only = new Set(keys);
    } else if (a.startsWith("--concurrency=")) {
      const n = Number(a.slice(14));
      if (!Number.isInteger(n) || n < 1) return usage(`Bad --concurrency value "${a.slice(14)}": use a whole number of 1 or more.`);
      concurrency = n;
    } else return usage(`Unknown flag ${a}.`);
  }
  const ctx = {
    root,
    outDir: path.join(root, "out"),
    concurrency,
    only,
    sample,
    log: (m) => console.log(m),
    warn: (m) => console.warn(`WARNING: ${m}`),
  };
  try {
    const { files } = await run(ctx);
    if (files.length === 0) console.log("Nothing to do: none of the selected keys belongs to this module (srt, voice, notes).");
    for (const f of files) console.log(`  ${f}  ${(fs.statSync(path.join(root, f)).size / 1024).toFixed(1)} KB`);
    return 0;
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
