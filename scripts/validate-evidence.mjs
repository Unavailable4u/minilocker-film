#!/usr/bin/env node
// Validates src/data/evidence.json (BIBLE 7). Prints exactly what to fix.
//
//   npm run evidence:check          structure and required paths; passes on the SAMPLE
//   npm run evidence:final-check    also fails on SAMPLE data and on any null in "measured" (run before the final render)
//
// Flags: --final, --file <path> (default src/data/evidence.json). The API token is read from the env var MINILOCKER_TOKEN
// (if set) so it can be searched for; it is never printed.
//
// Always a failure: infra.vultr.available false; attackSummary.total not 15; a ledger whose verification says "not verified";
// the string "[[" or "TODO" in any text; anything shaped like a private key, an AWS key id, an sk-/ghp_ token or your API token;
// missing required paths (a missing measured key too: use null until it is measured). The rewind verdict is a failure unless it is
// "breached", which is a loud warning (with --final it is a failure too: the film must not be made around it).
// With --final, measured.bakeoff must also be consistent: its model equals infra.inference.model, models is a whole number >= 1,
// usablePct is 0..100 and p50Seconds is above 0.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORE = ["rewind_after_rm_rf", "hostile_page_injection", "credential_theft_exfil", "malicious_repo_hook", "exfil_unknown_domain"];

const argv = process.argv.slice(2);
const FINAL = argv.includes("--final");
const fileFlag = argv.indexOf("--file");
const FILE = resolve(ROOT, fileFlag >= 0 && argv[fileFlag + 1] ? argv[fileFlag + 1] : "src/data/evidence.json");

const fails = [];
const warns = [];
const fail = (path, msg) => fails.push({ path, msg });
const warn = (path, msg) => warns.push({ path, msg });

let ev;
try {
  ev = JSON.parse(readFileSync(FILE, "utf8"));
} catch (e) {
  console.error(`evidence: cannot read ${FILE}: ${e.message}`);
  console.error("Fix: run `npm run evidence -- --base https://<domain> ...` to capture it (or restore the SAMPLE from git).");
  process.exit(1);
}

// ---------- helpers ---------------------------------------------------------------------------------------------------
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string";

/** Reads a path like "infra.vultr.available"; records a failure when any part is missing. */
function req(path, check, expectation) {
  let v = ev;
  for (const part of path.split(".")) {
    if (v === null || v === undefined || typeof v !== "object" || !(part in v)) {
      fail(path, "is missing");
      return undefined;
    }
    v = v[part];
  }
  if (check && !check(v)) {
    fail(path, `is ${JSON.stringify(v)?.slice(0, 60)} but should be ${expectation}`);
    return undefined;
  }
  return v;
}

function walk(v, path, visit) {
  visit(v, path);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, visit));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, visit);
}

// ---------- structure -------------------------------------------------------------------------------------------------
req("meta", isObj, "an object");
req("meta.sample", (v) => typeof v === "boolean", "true or false");
req("meta.capturedAt", isStr, "an ISO date string");
req("meta.note", isStr, "a string");
if (ev.meta?.sample === true && !/SAMPLE/.test(ev.meta.note ?? "")) {
  fail("meta.note", 'must say "SAMPLE - NOT REAL, DO NOT RENDER FOR SUBMISSION" when meta.sample is true');
}

req("infra", isObj, "an object (GET /api/infra)");
const vultr = req("infra.vultr", isObj, "an object");
if (vultr && vultr.available !== true) {
  fail("infra.vultr.available", `is ${JSON.stringify(vultr.available)}: the film claims a Vultr deployment. Capture from the real Vultr VM${vultr.reason ? ` (server says: ${vultr.reason})` : ""}.`);
}
if (vultr?.available === true) {
  if (!isStr(vultr.region) || !vultr.region) fail("infra.vultr.region", "is missing or empty");
  // The plan is optional: the metadata service of some instances does not return it (the real Infra screen then shows a dash).
  if (!isStr(vultr.plan) || !vultr.plan) warn("infra.vultr.plan", "is empty: the film shows the region and hostname only");
}
req("infra.inference.host", isStr, "a host name");
req("infra.inference.model", isStr, "a model name");
req("infra.storage.vultr", (v) => typeof v === "boolean", "true or false");
req("infra.egress", isObj, "an object");
req("infra.docker", isObj, "an object");
req("infra.host", isObj, "an object");

req("scenarios", (v) => Array.isArray(v) && v.length > 0, "a non-empty array");
if (Array.isArray(ev.scenarios) && !ev.scenarios.some((s) => s?.id === "fix_repo_v2")) fail("scenarios", "has no fix_repo_v2 entry");

req("s3Source", (v) => v === "task" || v === "attack:malicious_repo_hook", '"task" or "attack:malicious_repo_hook"');
if (ev.s3Source === "attack:malicious_repo_hook") {
  warn("s3Source", "is the malicious_repo_hook fallback (no take both passed the hidden check and read a decoy); scene S3's overlay must say so");
}

/** A ledger: ids 0..n-1 in order, each prev_hash equal to the previous hash. (Hashes are not recomputed: the capture trims long
 *  tool outputs, so the stored hashes cannot match the stored text; the server's own verification is in `verify`.) */
function checkLedger(path, events) {
  if (!Array.isArray(events) || events.length === 0) return fail(path, "must be a non-empty array of ledger events");
  const GENESIS = "0".repeat(64);
  let prev = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!isObj(e) || e.id !== i) return fail(`${path}[${i}].id`, `is ${JSON.stringify(e?.id)} but should be ${i} (events reordered or missing)`);
    if (e.prev_hash !== prev) return fail(`${path}[${i}].prev_hash`, "does not equal the previous event's hash (chain broken)");
    if (!isNum(e.ts) || !isStr(e.type) || !isObj(e.payload) || !/^[0-9a-f]{64}$/.test(e.hash ?? "")) {
      return fail(`${path}[${i}]`, "is not a ledger event (needs numeric ts, string type, object payload, 64-hex hash)");
    }
    prev = e.hash;
  }
  const ts = events.map((e) => e.ts);
  for (let i = 1; i < ts.length; i++) if (ts[i] < ts[i - 1]) return fail(`${path}[${i}].ts`, "goes backwards");
}

function checkVerify(path, verify, events) {
  if (!isObj(verify)) return fail(path, "is missing");
  if (verify.verified !== true) fail(`${path}.verified`, `is ${JSON.stringify(verify.verified)} (${verify.detail ?? "no detail"}): the ledger does NOT verify. Do not film this; find out why.`);
  if (Array.isArray(events) && verify.events !== events.length) fail(`${path}.events`, `says ${verify.events} events but the file holds ${events.length}`);
  if (Array.isArray(events) && events.length && verify.head_hash !== events[events.length - 1].hash) fail(`${path}.head_hash`, "is not the hash of the last stored event");
}

const task = req("task", isObj, "an object");
if (task) {
  req("task.id", isStr, "a task id");
  req("task.scenario", (v) => v === "fix_repo_v2", '"fix_repo_v2"');
  checkLedger("task.events", task.events);
  req("task.report", isObj, "a report object (GET /api/tasks/{id}/report)");
  req("task.report.dimensions", isObj, "an object of dimensions");
  checkVerify("task.verify", task.verify, task.events);
  req("task.end", isObj, "an object");
  req("task.end.status", isStr, "a status string");
  if (Array.isArray(task.events)) {
    const types = new Set(task.events.map((e) => e.type));
    for (const t of ["task.start", "sandbox.created", "tool.call", "tool.result", "sandbox.destroyed", "task.end"]) {
      if (!types.has(t)) fail("task.events", `has no ${t} event`);
    }
    if (!types.has("scenario.check")) warn("task.events", "has no scenario.check event: the hidden-check moment cannot be shown");
    if (!types.has("sandbox.audit")) warn("task.events", "has no sandbox.audit event: filesystem, secrets and compute would read as not measured");
  }
}

const attacks = req("attacks", isObj, "an object keyed by attack name");
if (attacks) {
  for (const name of CORE) {
    const a = attacks[name];
    if (!a) {
      fail(`attacks.${name}`, "is missing (the 5 core attacks are required)");
      continue;
    }
    const base = `attacks.${name}`;
    if (!isObj(a.result)) fail(`${base}.result`, "is missing");
    else {
      if (a.result.name !== name) fail(`${base}.result.name`, `is ${JSON.stringify(a.result.name)} but should be "${name}"`);
      if (!isStr(a.result.verdict)) fail(`${base}.result.verdict`, "is missing");
      if (!Array.isArray(a.result.checks) || a.result.checks.length === 0) fail(`${base}.result.checks`, "must be a non-empty array");
      if (!Array.isArray(a.result.steps) || a.result.steps.length === 0) fail(`${base}.result.steps`, "must be a non-empty array");
      if (a.result.verdict && a.result.verdict !== "contained" && name !== "rewind_after_rm_rf") {
        warn(`${base}.result.verdict`, `is "${a.result.verdict}", not "contained": the film shows it as such (amber for inconclusive)`);
      }
    }
    checkLedger(`${base}.events`, a.events);
    if (!isObj(a.report)) fail(`${base}.report`, "is missing");
    checkVerify(`${base}.verify`, a.verify, a.events);
  }
  const rewind = attacks.rewind_after_rm_rf?.result?.verdict;
  if (rewind && rewind !== "contained") {
    const sentence = "If rewind_after_rm_rf is not contained, STOP: the film's hero cannot be made. Fix it in the MiniLocker repo, freeze, recapture.";
    if (rewind === "breached" && !FINAL) warn("attacks.rewind_after_rm_rf.result.verdict", `is "breached". ${sentence}`);
    else fail("attacks.rewind_after_rm_rf.result.verdict", `is "${rewind}", not "contained". ${sentence}`);
  }
}

const catalog = req("attackCatalog", Array.isArray, "an array (the `attacks` of GET /api/attacks, 15 entries in lab order)");
if (catalog) {
  if (catalog.length !== 15) fail("attackCatalog", `has ${catalog.length} entries but the lab lists 15`);
  catalog.forEach((a, i) => {
    for (const k of ["name", "title", "category", "summary", "expected"]) if (!isStr(a?.[k]) || !a[k]) fail(`attackCatalog[${i}].${k}`, "must be a non-empty string");
    if (!Array.isArray(a?.checks)) fail(`attackCatalog[${i}].checks`, "must be an array");
  });
  for (const name of CORE) if (!catalog.some((a) => a?.name === name)) fail("attackCatalog", `has no entry for the core attack ${name}`);
}

const sum = req("attackSummary", isObj, "an object");
if (sum) {
  for (const k of ["total", "contained", "inconclusive", "breached", "error", "unavailable"]) req(`attackSummary.${k}`, (v) => Number.isInteger(v) && v >= 0, "a whole number");
  if (sum.total !== 15) fail("attackSummary.total", `is ${sum.total} but must be 15 (all attacks of the lab). Capture with --attacks all.`);
  const parts = ["contained", "inconclusive", "breached", "error", "unavailable"].reduce((n, k) => n + (isNum(sum[k]) ? sum[k] : 0), 0);
  if (isNum(sum.total) && parts > sum.total) fail("attackSummary", `counts add up to ${parts}, more than total ${sum.total}`);
  if (isNum(sum.total) && parts < sum.total) warn("attackSummary", `counts add up to ${parts} of ${sum.total}: some attacks were not run`);
  if (FINAL && sum.contained !== 15) warn("attackSummary.contained", `is ${sum.contained}, not 15: the film must not say "15/15"`);
}

// measured: shape always, nulls only in --final
const MEASURED_KEYS = {
  fixRepoV2: ["passes", "runs", "ciLow", "ciHigh", "mostMissedBug"],
  research: ["passes", "runs", "ciLow", "ciHigh"],
  hookEscaped: ["escaped", "runs"],
  realSecrets: ["runsWithReal", "runs"],
  bakeoff: ["model", "models", "usablePct", "p50Seconds"],
};
const measured = req("measured", isObj, "an object");
if (measured) {
  for (const [group, keys] of Object.entries(MEASURED_KEYS)) {
    if (!isObj(measured[group])) {
      fail(`measured.${group}`, "is missing");
      continue;
    }
    for (const k of keys) {
      const p = `measured.${group}.${k}`;
      if (!(k in measured[group])) fail(p, "is missing (use null until it is measured; `npm run evidence -- --measured-only` copies it from evidence/measured.json)");
      else if (measured[group][k] === null) {
        if (FINAL) fail(p, "is null. Fill it in evidence/measured.json (see its _how key) and run `npm run evidence -- --measured-only`.");
      }
    }
  }

  // The bake-off must describe the model the deployment really uses, with sane numbers (only when they are filled in: a null is reported above).
  if (FINAL && isObj(measured.bakeoff)) {
    const b = measured.bakeoff;
    const infraModel = ev.infra?.inference?.model;
    if (b.model != null && isStr(infraModel) && b.model !== infraModel) {
      fail("measured.bakeoff.model", `is ${JSON.stringify(b.model)} but infra.inference.model is ${JSON.stringify(infraModel)}. The bake-off must name the model the deployment uses: fix evidence/measured.json, then run \`npm run evidence -- --measured-only\`.`);
    }
    if (b.models != null && !(Number.isInteger(b.models) && b.models >= 1)) {
      fail("measured.bakeoff.models", `is ${JSON.stringify(b.models)} but should be a whole number of at least 1 (how many models the bake-off compared)`);
    }
    if (b.usablePct != null && !(isNum(b.usablePct) && b.usablePct >= 0 && b.usablePct <= 100)) {
      fail("measured.bakeoff.usablePct", `is ${JSON.stringify(b.usablePct)} but should be a number from 0 to 100 (percent of usable tool calls)`);
    }
    if (b.p50Seconds != null && !(isNum(b.p50Seconds) && b.p50Seconds > 0)) {
      fail("measured.bakeoff.p50Seconds", `is ${JSON.stringify(b.p50Seconds)} but should be a number above 0 (median seconds per model call)`);
    }
  }
}

const ci = req("ci", isObj, "an object");
if (ci) {
  for (const k of ["conclusion", "url", "sha"]) if (!(k in ci)) fail(`ci.${k}`, "is missing (use null when unknown)");
  if (ci.conclusion === null) warn("ci.conclusion", "is null: the CI badge cannot say success. Re-run the capture with --repo so GitHub is asked for that commit.");
  else if (ci.conclusion !== "success") warn("ci.conclusion", `is "${ci.conclusion}", not "success"`);
}

if (FINAL && ev.meta?.sample === true) {
  fail("meta.sample", "is true: this is SAMPLE data, not a real capture. Run `npm run evidence -- --base https://<domain> --repo ..\\MiniLocker --attacks all` against your live deployment, then run this check again.");
}
if (FINAL && ev.meta?.sample === false && !ev.meta.baseUrl) fail("meta.baseUrl", "is empty on a real capture");
if (FINAL && ev.meta?.sample === false && !ev.meta.commit) warn("meta.commit", "is null: capture with --repo <MiniLocker clone> so the film can show the commit");

// ---------- text scan -------------------------------------------------------------------------------------------------
const token = (process.env.MINILOCKER_TOKEN ?? "").trim();
const SECRET_SHAPES = [
  [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/, "a private key block"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key id (AKIA...)"],
  [/\bsk-[A-Za-z0-9_-]{16,}/, 'a token starting with "sk-"'],
  [/\bghp_[A-Za-z0-9]{16,}/, 'a token starting with "ghp_"'],
  [/\bgithub_pat_[A-Za-z0-9_]{16,}/, 'a token starting with "github_pat_"'],
];
const seen = new Set();
walk(ev, "", (v, path) => {
  if (!isStr(v)) return;
  const key = (msg) => `${path}|${msg}`;
  if (v.includes("[[") && !seen.has(key("[["))) {
    seen.add(key("[["));
    fail(path, 'contains "[[" (an unfilled placeholder). Remove or replace it.');
  }
  if (/\bTODO\b/.test(v) && !seen.has(key("TODO"))) {
    seen.add(key("TODO"));
    fail(path, 'contains "TODO". Remove it.');
  }
  for (const [re, what] of SECRET_SHAPES) {
    if (re.test(v) && !seen.has(key(what))) {
      seen.add(key(what));
      fail(path, `contains ${what}. Evidence must never hold a secret: find where it came from, then recapture.`);
    }
  }
  if (token.length >= 8 && v.includes(token) && !seen.has(key("token"))) {
    seen.add(key("token"));
    fail(path, "contains your API token (MINILOCKER_TOKEN). Delete the file, find what echoed it, rotate the token, recapture.");
  }
});

// ---------- report ----------------------------------------------------------------------------------------------------
const rel = FILE.startsWith(ROOT) ? FILE.slice(ROOT.length + 1) : FILE;
const kind = ev.meta?.sample === true ? "SAMPLE data" : "captured data";
console.log(`evidence: ${rel} (${kind}${FINAL ? ", final check" : ""})`);
for (const w of warns) console.log(`  WARN  ${w.path}: ${w.msg}`);
for (const f of fails) console.log(`  FAIL  ${f.path}: ${f.msg}`);
if (fails.length) {
  console.log(`\n${fails.length} problem(s) to fix${warns.length ? `, ${warns.length} warning(s)` : ""}.`);
  process.exit(1);
}
console.log(`\nOK: structure and required paths are fine${warns.length ? ` (${warns.length} warning(s))` : ""}.`);
