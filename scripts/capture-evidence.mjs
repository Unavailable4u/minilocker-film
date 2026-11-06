#!/usr/bin/env node
// Captures src/data/evidence.json from a LIVE MiniLocker deployment (BIBLE 7.2). Pure Node 20 (fetch), no dependencies, works
// on Windows. Run it once, on frozen code, after filling evidence/measured.json by hand.
//
//   PowerShell:  $env:MINILOCKER_TOKEN="<token>"
//                npm run evidence -- --base https://<domain> --repo ..\MiniLocker --attacks all --takes 3
//   Measured numbers only (no capture, no token, no deployment):
//                npm run evidence -- --measured-only [--measured <file>] [--repo <path>] [--out <file>]
//   One core attack again (patch 26: the S5 fence needs the whole wrapper; everything else in the file is kept):
//                npm run evidence -- --refresh-attack hostile_page_injection --base https://<domain>
//
// Flags
//   --base <https://host>      the deployment (required, except with --measured-only)
//   --token <token>            API token; or the env var MINILOCKER_TOKEN. Never written anywhere.
//   --takes <n>                how many fix_repo_v2 attempts to make at most (default 3)
//   --attacks core|all         the 5 core attacks (default) or all 15 (needed for the "15/15" claim)
//   --measured <file>          the hand-filled numbers (default evidence/measured.json)
//   --out <file>               default src/data/evidence.json
//   --repo <path>              clone of the MiniLocker repo, to record its commit (git rev-parse HEAD)
//   --measured-only            do NOT capture: read the existing --out file, replace ONLY its `measured` block (and, with --repo,
//                              `ci` and `meta.commit`), write it back atomically. The only network call is the GitHub CI lookup,
//                              and only when --repo is given. If git or that lookup fails, `ci` and `meta.commit` are left as they were.
//   --refresh-attack <name>    run ONE core attack again on --base and replace only attacks.<name> (and the attackSummary counts if its
//                              verdict changed) in the existing --out file. Needs --base and the token; no fix_repo_v2 takes are made.
//
// What it does, in order: GET /api/infra, /api/scenarios, /api/attacks; run the attacks one at a time (waits out 429);
// for each attack GET its task, events (SSE replay), report and ledger verification; start fix_repo_v2 tasks until one has
// a passing hidden check AND a decoy read; fetch its events, report and verification; read measured.json; ask GitHub for the
// CI run of the commit; write the file; print the numbers you will see on screen.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORE = ["rewind_after_rm_rf", "hostile_page_injection", "credential_theft_exfil", "malicious_repo_hook", "exfil_unknown_domain"];
const TOOL_OUTPUT_MAX = 600;
/** The one exception to TOOL_OUTPUT_MAX: the untrusted-content wrapper of a browse result (S5 fence). */
const FENCE_OUTPUT_MAX = 6000;
const TASK_TIMEOUT_MS = 10 * 60 * 1000;
const CI_REPO = "shaikh-dotcom/MiniLocker";

// ---------- arguments -----------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { takes: 3, attacks: "core", measured: "evidence/measured.json", out: "src/data/evidence.json", repo: null, base: null, token: null, measuredOnly: false, refreshAttack: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) die(`${k} needs a value`);
      return argv[++i];
    };
    if (k === "--base") a.base = v();
    else if (k === "--token") a.token = v();
    else if (k === "--takes") a.takes = Number.parseInt(v(), 10);
    else if (k === "--attacks") a.attacks = v();
    else if (k === "--measured") a.measured = v();
    else if (k === "--out") a.out = v();
    else if (k === "--repo") a.repo = v();
    else if (k === "--measured-only") a.measuredOnly = true;
    else if (k === "--refresh-attack") a.refreshAttack = v();
    else if (k === "--help" || k === "-h") {
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 30).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
      process.exit(0);
    } else die(`unknown flag ${k} (try --help)`);
  }
  a.token = a.token || process.env.MINILOCKER_TOKEN || "";
  if (a.measuredOnly && a.refreshAttack) die("--measured-only and --refresh-attack cannot be used together");
  if (a.refreshAttack && !CORE.includes(a.refreshAttack)) die(`--refresh-attack takes one of the 5 core attacks: ${CORE.join(", ")}`);
  if (!a.measuredOnly) {
    if (!a.base) die("--base <https://host> is required (or use --measured-only to refresh only the measured numbers)");
    if (!/^https?:\/\//i.test(a.base)) die("--base must start with https:// (or http:// for a local test)");
  }
  if (a.base) a.base = a.base.replace(/\/+$/, "");
  if (!Number.isInteger(a.takes) || a.takes < 1 || a.takes > 20) die("--takes must be a whole number from 1 to 20");
  if (a.attacks !== "core" && a.attacks !== "all") die('--attacks must be "core" or "all"');
  return a;
}

function die(msg) {
  console.error(`capture-evidence: ${msg}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const T0 = Date.now();
const elapsed = () => `${((Date.now() - T0) / 1000).toFixed(0)}s`;
const log = (msg) => console.log(`[${elapsed().padStart(5)}] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- HTTP ------------------------------------------------------------------------------------------------------
function authHeaders(extra = {}) {
  return { "Content-Type": "application/json", ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}), ...extra };
}

async function http(method, path, { body, timeoutMs = 60_000, accept } = {}) {
  const res = await fetch(args.base + path, {
    method,
    headers: authHeaders(accept ? { Accept: accept } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res;
}

async function getJson(path, opts) {
  const res = await http("GET", path, opts);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await detail(res)}`);
  return res.json();
}

async function detail(res) {
  try {
    const j = await res.clone().json();
    return j.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** POST that waits out 429 ("another one is running"). */
async function postWith429(path, body, timeoutMs) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await http("POST", path, { body, timeoutMs });
    if (res.status === 429) {
      const wait = Math.max(1, Number.parseInt(res.headers.get("retry-after") ?? "5", 10) || 5);
      log(`  429 on ${path}: another run is in progress, waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status} ${await detail(res)}`);
    return res.json();
  }
  throw new Error(`POST ${path}: still 429 after 60 tries`);
}

/** The ledger events of a task. Finished tasks replay from disk over the SSE endpoint and then send an "end" frame. */
async function fetchEvents(taskId) {
  const res = await http("GET", `/api/tasks/${taskId}/events?after=-1`, { accept: "text/event-stream", timeoutMs: 120_000 });
  if (!res.ok || !res.body) throw new Error(`GET /api/tasks/${taskId}/events -> ${res.status} ${await detail(res)}`);
  const events = [];
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) ev = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      if (ev === "end") return events;
      events.push(JSON.parse(data));
    }
  }
  return events;
}

// ---------- trimming (BIBLE 7.2: long tool outputs to 600 chars) ------------------------------------------------------
let trimmedCount = 0;
function trimEvents(events) {
  return events.map((e) => {
    if (e.type !== "tool.result") return e;
    const r = e.payload?.result;
    if (typeof r !== "string" || r.length <= TOOL_OUTPUT_MAX) return e;
    // S5 shows the fence: the page text the model is given. That result must reach the film whole (capped far higher), or the fence is cut mid-page.
    if (/\[UNTRUSTED WEB CONTENT/.test(r) && r.length <= FENCE_OUTPUT_MAX) return e;
    trimmedCount++;
    return { ...e, payload: { ...e.payload, result: `${r.slice(0, TOOL_OUTPUT_MAX)}\n...[film: trimmed ${r.length - TOOL_OUTPUT_MAX} chars]` } };
  });
}

// ---------- the steps -------------------------------------------------------------------------------------------------
async function captureAttackData(result) {
  const id = result.task_id;
  if (!id) return { result, events: [], report: null, verify: null };
  await getJson(`/api/tasks/${id}`); // the task must be known to the server; the body (a count) is not kept
  const [events, report, verify] = [await fetchEvents(id), await getJson(`/api/tasks/${id}/report`), await getJson(`/api/ledger/verify/${id}`)];
  return { result, events: trimEvents(events), report, verify };
}

async function waitForEnd(taskId) {
  const start = Date.now();
  for (;;) {
    const info = await getJson(`/api/tasks/${taskId}`);
    if (info.status && info.status !== "running") return info;
    if (Date.now() - start > TASK_TIMEOUT_MS) throw new Error(`task ${taskId} did not end within 10 minutes`);
    await sleep(3000);
  }
}

function analyseTake(events) {
  const check = events.find((e) => e.type === "scenario.check");
  const end = [...events].reverse().find((e) => e.type === "task.end");
  return {
    hiddenCheckPassed: check ? check.payload?.passed === true : null,
    canaryReads: events.filter((e) => e.type === "canary.read").length,
    status: end?.payload?.status ?? "incomplete",
  };
}

function gitCommit(repo) {
  if (!repo) return null;
  try {
    return execFileSync("git", ["-C", resolve(repo), "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    console.warn(`warning: could not run git rev-parse in ${repo}; meta.commit stays as it was`);
    return null;
  }
}

async function fetchCi(commit) {
  const empty = { conclusion: null, url: null, sha: null };
  try {
    const q = commit ? `per_page=1&head_sha=${commit}` : "per_page=1";
    const res = await fetch(`https://api.github.com/repos/${CI_REPO}/actions/runs?${q}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "minilocker-film-capture" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const run = (await res.json()).workflow_runs?.[0];
    if (!run) throw new Error(commit ? `no CI run found for commit ${commit.slice(0, 8)}` : "no CI runs found");
    return { conclusion: run.conclusion ?? null, url: run.html_url ?? null, sha: run.head_sha ?? null };
  } catch (e) {
    console.warn(`warning: could not read the CI status from GitHub (${e.message}); ci.conclusion stays null`);
    return empty;
  }
}

function readMeasured(path) {
  const file = resolve(ROOT, path);
  const blank = {
    fixRepoV2: { passes: null, runs: null, ciLow: null, ciHigh: null, mostMissedBug: null },
    research: { passes: null, runs: null, ciLow: null, ciHigh: null },
    hookEscaped: { escaped: null, runs: null },
    realSecrets: { runsWithReal: null, runs: null },
    bakeoff: { model: null, models: null, usablePct: null, p50Seconds: null },
  };
  if (!existsSync(file)) {
    console.warn(`warning: ${path} not found; every measured number stays null (evidence:final-check will fail until it is filled)`);
    return blank;
  }
  const m = JSON.parse(readFileSync(file, "utf8"));
  const out = {};
  for (const k of Object.keys(blank)) out[k] = { ...blank[k], ...(m[k] ?? {}) };
  return out;
}

/** Writes `text` to `out` through a temporary file, so a failed write never leaves half a file behind. */
function writeAtomic(out, text) {
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, text + "\n", "utf8");
  renameSync(tmp, out);
}

/** The measured lines (and the CI line when `ci` is given), exactly as they will read on screen. */
function printMeasured(m, ci) {
  const fmt = (n, d) => (n === null || n === undefined ? "NOT SET" : `${n}${d === undefined ? "" : `/${d ?? "?"}`}`);
  console.log(`fix_repo_v2:     ${fmt(m.fixRepoV2.passes, m.fixRepoV2.runs)}  95% [${fmt(m.fixRepoV2.ciLow)}, ${fmt(m.fixRepoV2.ciHigh)}]  most missed: ${fmt(m.fixRepoV2.mostMissedBug)}`);
  console.log(`research:        ${fmt(m.research.passes, m.research.runs)}  95% [${fmt(m.research.ciLow)}, ${fmt(m.research.ciHigh)}]`);
  console.log(`hook escaped:    ${fmt(m.hookEscaped.escaped, m.hookEscaped.runs)}`);
  console.log(`real secrets:    ${fmt(m.realSecrets.runsWithReal, m.realSecrets.runs)} runs`);
  console.log(`bake-off model:  ${fmt(m.bakeoff.model)}  (${fmt(m.bakeoff.models)} models, ${fmt(m.bakeoff.usablePct)}% usable, p50 ${fmt(m.bakeoff.p50Seconds)} s)`);
  if (ci) console.log(`CI:              ${ci.conclusion ?? "unknown"}  ${ci.url ?? ""}`);
}

/** Reads the existing evidence file for --measured-only and --refresh-attack, or stops with a clear message. */
function readExisting() {
  const out = resolve(ROOT, args.out);
  if (!existsSync(out)) die(`${args.out} does not exist. Capture it first: npm run evidence -- --base https://<domain> ...`);
  let ev;
  try {
    ev = JSON.parse(readFileSync(out, "utf8"));
  } catch (e) {
    die(`${args.out} is not valid JSON (${e.message}). Restore it from git or capture it again; nothing was written.`);
  }
  if (ev === null || typeof ev !== "object" || Array.isArray(ev)) die(`${args.out} is not a JSON object; nothing was written.`);
  return { out, ev };
}

// ---------- --measured-only -----------------------------------------------------------------------------------------
async function measuredOnly() {
  const { out, ev } = readExisting();
  ev.measured = readMeasured(args.measured);

  let ci = null;
  if (args.repo) {
    const commit = gitCommit(args.repo);
    if (commit) {
      ci = await fetchCi(commit);
      ev.ci = ci;
      ev.meta = { ...(ev.meta ?? {}), commit };
    } else {
      console.warn("warning: --repo was given but its commit could not be read: ci and meta.commit were NOT changed");
    }
  }

  const text = JSON.stringify(ev);
  if (args.token && text.includes(args.token)) die("the API token appears inside the evidence file; NOT writing it. Find what put it there and rotate the token.");
  writeAtomic(out, text);

  console.log("\n==================== MEASURED ONLY ====================");
  console.log(`file:            ${args.out} (${(text.length / 1024).toFixed(0)} KB); only "measured"${args.repo ? ", ci and meta.commit" : ""} were replaced`);
  printMeasured(ev.measured, ci ?? ev.ci ?? null);
  console.log("=======================================================");
  console.log("next: npm run evidence:check");
}

// ---------- --refresh-attack ------------------------------------------------------------------------------------------
async function refreshAttack() {
  const name = args.refreshAttack;
  const { out, ev } = readExisting();
  if (!ev.attacks?.[name]) die(`${args.out} has no attacks.${name}; capture the whole file first`);
  if (!args.token) console.warn("warning: no token given (--token or MINILOCKER_TOKEN); this only works if the server has no token set");
  const listed = ((await getJson("/api/attacks")).attacks ?? []).map((a) => a.name);
  if (!listed.includes(name)) die(`the server does not list the attack ${name}`);

  const old = ev.attacks[name];
  const oldVerdict = old.result?.verdict ?? null;
  const oldTrims = (old.events ?? []).filter((e) => typeof e.payload?.result === "string" && /\[film: trimmed \d+ chars\]/.test(e.payload.result)).length;

  log(`running ${name} again on ${args.base} ...`);
  const result = await postWith429(`/api/attacks/${name}/run`, undefined, 180_000);
  log(`  -> ${result.verdict} in ${Number(result.duration_s).toFixed(1)}s`);
  trimmedCount = 0;
  const fresh = await captureAttackData(result);
  if (!fresh.events.length) die(`the server returned no task for ${name}; nothing was written`);
  ev.attacks[name] = fresh;

  // keep the summary honest when the verdict changed (the counts always add up to what the file holds)
  if (ev.attackSummary && oldVerdict !== result.verdict) {
    const sum = ev.attackSummary;
    if (typeof oldVerdict === "string" && Number.isInteger(sum[oldVerdict]) && sum[oldVerdict] > 0) sum[oldVerdict] -= 1;
    sum[result.verdict] = (Number.isInteger(sum[result.verdict]) ? sum[result.verdict] : 0) + 1;
    console.warn(`warning: the verdict of ${name} changed from ${oldVerdict} to ${result.verdict}; attackSummary was adjusted`);
  }
  if (ev.meta && typeof ev.meta === "object") {
    const total = Math.max(0, (Number(ev.meta.trimmedToolOutputs) || 0) - oldTrims) + trimmedCount;
    if (total > 0) ev.meta.trimmedToolOutputs = total;
    else delete ev.meta.trimmedToolOutputs;
  }

  const text = JSON.stringify(ev);
  if (args.token && text.includes(args.token)) die("the API token appears inside the captured data; NOT writing the file. Tell the maintainer: something echoed the token.");
  writeAtomic(out, text);

  const wrapped = fresh.events.find((e) => e.type === "tool.result" && /<<<BEGIN UNTRUSTED [0-9a-f]{8}>>>/.test(String(e.payload?.result ?? "")));
  console.log("\n==================== REFRESH ATTACK ====================");
  console.log(`file:            ${args.out} (${(text.length / 1024).toFixed(0)} KB); only attacks.${name} was replaced`);
  console.log(`attack:          ${name}  ${oldVerdict} -> ${result.verdict}  task ${result.task_id}, ${fresh.events.length} events, ledger ${fresh.verify?.verified ? "verified" : "NOT VERIFIED"}`);
  const fenceText = String(wrapped?.payload?.result ?? "");
  const fenceNote = !wrapped ? "BEGIN marker NOT found in this attack's ledger" : fenceText.includes("<<<END UNTRUSTED ") ? "BEGIN and END markers present" : "BEGIN marker present; END marker absent (the product clips a browse result to 1500 characters in the ledger: the film rebuilds the END line from the nonce)";
  console.log(`fence wrapper:   ${fenceNote}`);
  console.log("========================================================");
  console.log("next: npm run evidence:check");
}

// ---------- main ------------------------------------------------------------------------------------------------------
async function main() {
  if (!args.token) console.warn("warning: no token given (--token or MINILOCKER_TOKEN); this only works if the server has no token set");
  log(`capturing from ${args.base}`);

  const infra = await getJson("/api/infra");
  log(`infra: vultr=${infra.vultr?.available} region=${infra.vultr?.region ?? "?"} model=${infra.inference?.model ?? "?"}`);
  const sc = await getJson("/api/scenarios");
  const scenario = (sc.scenarios ?? []).find((s) => s.id === "fix_repo_v2");
  if (!scenario) die("the server has no fix_repo_v2 scenario");
  if (!scenario.available) console.warn(`warning: fix_repo_v2 reports available=false (missing hosts: ${(scenario.missing_hosts ?? []).join(", ") || "none"})`);
  const list = await getJson("/api/attacks");
  const attackCatalog = list.attacks ?? [];
  const listed = attackCatalog.map((a) => a.name);
  log(`the lab lists ${listed.length} attacks`);

  // ---- attacks, one at a time -----------------------------------------------------------------------------------
  const names = args.attacks === "all" ? listed : CORE;
  for (const n of CORE) if (!listed.includes(n)) die(`the server does not list the core attack ${n}`);
  const attacks = {};
  const verdicts = {};
  let i = 0;
  for (const name of names) {
    i++;
    log(`attack ${i}/${names.length}: ${name} ...`);
    const result = await postWith429(`/api/attacks/${name}/run`, undefined, 180_000);
    verdicts[name] = result.verdict;
    log(`  -> ${result.verdict} in ${Number(result.duration_s).toFixed(1)}s`);
    // The film needs full data for the core five; the rest only count in the summary.
    if (CORE.includes(name)) attacks[name] = await captureAttackData(result);
  }

  // ---- the fix_repo_v2 task ---------------------------------------------------------------------------------------
  const takes = [];
  let kept = null;
  let best = null;
  for (let t = 1; t <= args.takes; t++) {
    log(`take ${t}/${args.takes}: starting fix_repo_v2 ...`);
    const created = await postWith429("/api/tasks", { task: "", profile: "strict", hold_s: 0, scenario: "fix_repo_v2" }, 60_000);
    const id = created.task_id;
    const info = await waitForEnd(id);
    const events = trimEvents(await fetchEvents(id));
    const a = analyseTake(events);
    const qualifies = a.hiddenCheckPassed === true && a.canaryReads > 0;
    log(`  -> ${a.status}, hidden check ${a.hiddenCheckPassed === null ? "none" : a.hiddenCheckPassed ? "passed" : "failed"}, decoys read ${a.canaryReads}, ${events.length} events`);
    const summary = { id, status: a.status, hiddenCheckPassed: a.hiddenCheckPassed, canaryReads: a.canaryReads, events: events.length, kept: false };
    takes.push(summary);
    const candidate = { id, events, a, summary, end: { status: info.status, error: info.error ?? null, ledger_verified: info.result?.ledger_verified ?? null } };
    const rank = (c) => (c.a.hiddenCheckPassed === true ? 2 : 0) + (c.a.canaryReads > 0 ? 1 : 0);
    if (!best || rank(candidate) > rank(best)) best = candidate;
    if (qualifies) {
      kept = candidate;
      break;
    }
  }
  const chosen = kept ?? best;
  const s3Source = kept ? "task" : "attack:malicious_repo_hook";
  if (!kept) console.warn('warning: no take passed the hidden check AND read a decoy; keeping the best take and setting s3Source to "attack:malicious_repo_hook" (BIBLE 7.3)');
  chosen.summary.kept = true;
  const [report, verify] = [await getJson(`/api/tasks/${chosen.id}/report`), await getJson(`/api/ledger/verify/${chosen.id}`)];
  const task = { id: chosen.id, scenario: "fix_repo_v2", events: chosen.events, report, verify, end: chosen.end };

  // ---- the rest -----------------------------------------------------------------------------------------------------
  const measured = readMeasured(args.measured);
  const commit = gitCommit(args.repo);
  const ci = await fetchCi(commit);
  const count = (v) => Object.values(verdicts).filter((x) => x === v).length;
  const attackSummary = { total: listed.length, contained: count("contained"), inconclusive: count("inconclusive"), breached: count("breached"), error: count("error"), unavailable: count("unavailable") };

  const evidence = {
    meta: { sample: false, capturedAt: new Date().toISOString(), commit, baseUrl: args.base, note: "", model: infra.inference?.model ?? null, ...(trimmedCount ? { trimmedToolOutputs: trimmedCount } : {}) },
    infra,
    scenarios: [scenario],
    task,
    takes,
    s3Source,
    attacks,
    attackCatalog,
    attackSummary,
    measured,
    ci,
  };

  const text = JSON.stringify(evidence);
  if (args.token && text.includes(args.token)) die("the API token appears inside the captured data; NOT writing the file. Tell the maintainer: something echoed the token.");
  const out = resolve(ROOT, args.out);
  writeAtomic(out, text);

  // ---- what you will see on screen -----------------------------------------------------------------------------------
  console.log("\n==================== SUMMARY ====================");
  console.log(`file:            ${args.out} (${(text.length / 1024).toFixed(0)} KB), captured in ${elapsed()}`);
  console.log(`deployment:      ${args.base}   Vultr VM: ${infra.vultr?.available ? "yes" : "NO"} (${infra.vultr?.region ?? "-"}, ${infra.vultr?.plan ?? "-"})`);
  console.log(`inference:       ${infra.inference?.host ?? "-"}  model ${infra.inference?.model ?? "-"}   storage on Vultr: ${infra.storage?.vultr ? "yes" : "NO"}`);
  console.log(`attacks:         ${attackSummary.contained}/${attackSummary.total} contained` +
    ` (inconclusive ${attackSummary.inconclusive}, breached ${attackSummary.breached}, error ${attackSummary.error}, unavailable ${attackSummary.unavailable})` +
    (args.attacks === "core" ? "   <- only the 5 core attacks were run; use --attacks all for a 15/15 claim" : ""));
  console.log(`rewind verdict:  ${verdicts.rewind_after_rm_rf}`);
  console.log(`task:            ${task.id}  ${task.events.length} events, ledger ${verify.verified ? "verified" : "NOT VERIFIED"} (${verify.detail})`);
  console.log(`takes:           ${takes.length} made; S3 uses ${s3Source}`);
  printMeasured(measured, ci);
  if (trimmedCount) console.log(`note:            ${trimmedCount} long tool output(s) were trimmed to ${TOOL_OUTPUT_MAX} chars (their hashes no longer match; the server's own verification is stored in "verify")`);
  console.log("=================================================");
  console.log("next: npm run evidence:check   then   npm run evidence:final-check");
}

(args.measuredOnly ? measuredOnly() : args.refreshAttack ? refreshAttack() : main()).catch((e) => {
  console.error(`\ncapture-evidence failed after ${elapsed()}: ${e.message}`);
  process.exit(1);
});
