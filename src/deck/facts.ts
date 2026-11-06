// Deck facts: the evidence values the slides print, read through src/data/select.ts and the film's own derivations. Nothing here is typed by hand
// (guide section 7, trap 2). A value the evidence does not hold makes the function throw and name the path, as select.ts does, so a slide can never
// print a number the capture does not contain.
import { gfxB, gfxC, rep, s8, urls } from "../config/copy";
import { selectAttack, selectAttackCatalog, selectAttackEvents, selectCi, selectInfra, selectMeasured, selectMeta, selectSummary, selectTask } from "../data/select";
import { estimateWidth, MONO_ADVANCE } from "../fx/util";
import { ARCH_CHIP_FONT, archChipTextRoom, type ArchChip } from "../gfx/ArchitectureDiagram";
import type { ChainBlock } from "../gfx/HashChain";
import { describe } from "../lib/derive";
import { s3Data } from "../scenes/s3/data";
import { s4Data } from "../scenes/s4/data";
import { s5Data } from "../scenes/s5/data";

function fail(path: string, why: string): never {
  throw new Error(`deck: ${path} ${why}. Re-capture with "npm run evidence" or fix src/data/evidence.json.`);
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Runs of the fix task and how many passed the hidden check (evidence.measured.fixRepoV2). */
export function fixTaskRuns(): { passes: number; runs: number } {
  const m = selectMeasured().fixRepoV2;
  if (!isCount(m.passes) || !isCount(m.runs)) return fail("evidence.measured.fixRepoV2.passes / runs", "is missing or not a number");
  return { passes: m.passes, runs: m.runs };
}

/**
 * The hidden check of the kept fix-task run: the `scenario.check` event of the ledger (the film's `hiddenCheck` pin).
 * `line` is the app's own event-log line for it (derive.describe), `testsPassed` of `testsTotal` are the hidden tests the model never sees.
 */
export function hiddenCheck(): { passed: boolean; line: string; testsPassed: number; testsTotal: number } {
  const e = selectTask().events.find((x) => x.type === "scenario.check");
  if (!e) return fail("evidence.task.events", "has no scenario.check event (the hidden check)");
  const facts = e.payload.facts as Record<string, unknown> | undefined;
  const testsPassed = facts?.hidden_passed;
  const testsTotal = facts?.hidden_total;
  if (!isCount(testsPassed) || !isCount(testsTotal)) return fail("evidence.task.events[scenario.check].payload.facts.hidden_passed / hidden_total", "is missing or not a number");
  const line = describe(e)?.text;
  if (!line) return fail("evidence.task.events[scenario.check]", "has no event-log line");
  return { passed: e.payload.passed === true, line, testsPassed, testsTotal };
}

/** True when the report's persistence dimension says the final sandbox was destroyed (the Report's own headline, ReportScreen.tsx). */
export function finalSandboxDestroyed(): boolean {
  const d = selectTask().report.dimensions.persistence;
  if (!d) return fail("evidence.task.report.dimensions.persistence", "is missing");
  if (typeof d.final_sandbox_destroyed !== "boolean") return fail("evidence.task.report.dimensions.persistence.final_sandbox_destroyed", "is missing or not a boolean");
  return d.final_sandbox_destroyed;
}

/**
 * The bake-off line of the inference chip (copy.s8.bakeoff filled from evidence.measured.bakeoff), or null. Same rule as S8Vultr.tsx: it is only said when the
 * evidence holds all three numbers AND names the very model the deployment reports; otherwise nothing is claimed.
 */
export function bakeoffLine(inferenceModel: string | null): string | null {
  const b = selectMeasured().bakeoff;
  if (!b || inferenceModel === null || b.model !== inferenceModel || !isCount(b.models) || !isCount(b.usablePct) || !isCount(b.p50Seconds)) return null;
  const line = s8.bakeoff.replace("{models}", String(b.models)).replace("{usablePct}", String(b.usablePct)).replace("{p50}", String(b.p50Seconds));
  if (/[{}]/.test(line)) return fail("copy.s8.bakeoff", `still has an unfilled placeholder: "${line}"`);
  return line;
}

/**
 * The hostile page as the ledger saw it: the HTTP status of its `browser.page` event and whether the scanner reported hidden findings.
 * Read through the film's own S5 data (which also refuses an attack that was not contained), so the deck cannot show a page the film would not.
 */
export function hostilePage(): { status: number | null; flagged: boolean } {
  const d = s5Data();
  return { status: d.page.status, flagged: d.injection.hidden > 0 };
}

/** One line of the poisoned module's own log (`/tmp/.shop_hook.jsonl`): what it tried and whether the attempt went through (`ok`) or errored. */
export interface HookAttempt {
  attempt: string;
  ok: boolean;
}

/**
 * The attempts of the hostile module, in the order of its own log. The log is the output of the `cat /tmp/.shop_hook.jsonl` tool result in the ledger
 * (the lines the Workspace terminal prints, frame 1000): one JSON object per line, `k` the attempt, `o` its outcome ("ok" or "error:<Exception>").
 * The module's "start" line is not an attempt and is left out. Read from the same ledger the film's S3 uses (`s3Data().events`).
 */
export function hookAttempts(): HookAttempt[] {
  const out: HookAttempt[] = [];
  for (const e of s3Data().events) {
    if (e.type !== "tool.result" || typeof e.payload.result !== "string") continue;
    const rows: HookAttempt[] = [];
    let isLog = false;
    for (const line of e.payload.result.split("\n")) {
      if (!line.startsWith("{")) continue;
      let j: unknown;
      try {
        j = JSON.parse(line);
      } catch {
        continue;
      }
      const { k, o } = (j ?? {}) as { k?: unknown; o?: unknown };
      if (typeof k !== "string" || typeof o !== "string") continue;
      isLog = true;
      if (k !== "start") rows.push({ attempt: k, ok: o === "ok" });
    }
    if (isLog && rows.length > 0) {
      out.push(...rows);
      break;
    }
  }
  if (out.length === 0) return fail("evidence ledger (tool.result of `cat /tmp/.shop_hook.jsonl`)", "has no lines of the hostile module's log");
  return out;
}

/** The Report's Secrets card, as the film's S3 audit reads it: decoys planted, read, used, and whether any real secret was found inside the sandbox. */
export function secretsTally(): { planted: number; read: number; used: number; realInSandbox: number } {
  const d = s3Data();
  return { planted: d.planted, read: d.audit.decoysRead, used: d.audit.decoysUsed, realInSandbox: d.audit.realSecretsInSandbox };
}

/** Runs of the whole measurement in which a real secret was found inside a sandbox (evidence.measured.realSecrets). */
export function realSecretRuns(): { withReal: number; runs: number } {
  const m = selectMeasured().realSecrets;
  if (!isCount(m.runsWithReal) || !isCount(m.runs)) return fail("evidence.measured.realSecrets.runsWithReal / runs", "is missing or not a number");
  return { withReal: m.runsWithReal, runs: m.runs };
}

/** Runs of the hostile-hook attack in which the hook got anything out (evidence.measured.hookEscaped). */
export function hookEscapes(): { escaped: number; runs: number } {
  const m = selectMeasured().hookEscaped;
  if (!isCount(m.escaped) || !isCount(m.runs)) return fail("evidence.measured.hookEscaped.escaped / runs", "is missing or not a number");
  return { escaped: m.escaped, runs: m.runs };
}

/** One snapshot of the rewind attack's ledger: its number and its SHA-256 (64 hex). */
export interface SnapshotFact {
  n: number;
  hash: string;
}

/** What slide 07 reads about the rewind attack (`LAB.hero`, "rewind_after_rm_rf"), all through the film's own S4 data. */
export interface RewindStory {
  /** "precious.txt": the file the attack writes, wipes and gets back (the hero tile's label, as in the film). */
  file: string;
  /** The write_file step's path ("/workspace/precious.txt"). */
  writePath: string;
  /** The real wipe command and the line it prints ("WIPED_0"). */
  wipe: { command: string; token: string };
  /** Snapshots taken up to and including the one the rewind goes back to, oldest first (snapshot 0 is the start of the task). */
  kept: SnapshotFact[];
  /** Snapshots the rewind threw away (the ledger's `timeline.rewound.discarded`). */
  discarded: SnapshotFact[];
  /** The snapshot the rewind restored, with the hash the ledger recorded for the restored tree (s4Data refuses a restore that did not match). */
  restored: SnapshotFact;
  /** Files re-hashed after the restore (`timeline.rewound.verified.files`). */
  files: number;
  /** Checks passed of total, and the seconds the whole attack took (the AttackResult's `duration_s`). */
  checks: { passed: number; total: number };
  seconds: number;
  /** The attack's ledger as verified: how many events, and the head hash. */
  ledger: { events: number; head: string };
}

/**
 * The rewind attack as slide 07 draws it. Same data as the film's S4 (src/scenes/s4/data.ts, which throws when the evidence cannot support it: a restore
 * that did not match, a missing wipe, a ledger that does not verify). The only addition is the snapshots taken BEFORE the one the rewind goes back to
 * (snapshot 0, the start of the task), which the film does not draw: they are the `snapshot.created` events of the same ledger.
 */
export function rewindStory(): RewindStory {
  const d = s4Data();
  const kept: SnapshotFact[] = [];
  for (const e of selectAttackEvents(d.hero.name)) {
    if (e.type !== "snapshot.created") continue;
    const n = e.payload.id;
    const hash = e.payload.sha256;
    if (typeof n !== "number" || typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
      return fail(`evidence.attacks.${d.hero.name}.events[snapshot.created, event ${e.id}]`, "has no numeric id / 64-hex sha256");
    }
    if (n <= d.snapshot.n) kept.push({ n, hash });
  }
  if (kept.length === 0 || kept[kept.length - 1].n !== d.snapshot.n) {
    return fail(`evidence.attacks.${d.hero.name}.events[snapshot.created]`, `has no snapshot ${d.snapshot.n}, the one the rewind goes back to`);
  }
  const base = d.write.path;
  return {
    file: base.slice(base.lastIndexOf("/") + 1),
    writePath: base,
    wipe: { command: d.wipe.command, token: d.wipe.token },
    kept,
    discarded: d.rewound.discarded.map((x) => ({ n: x.n, hash: x.hash })),
    restored: { n: d.rewound.toSnapshot, hash: d.rewound.restoredHash },
    files: d.rewound.files,
    checks: { passed: d.outcome.checksPassed, total: d.outcome.checksTotal },
    seconds: d.outcome.seconds,
    ledger: { events: d.seal.events, head: d.seal.head },
  };
}

/**
 * The attack's own proof line for the delete: the label and detail of its first attack-scoped check ("Deleted file came back": "the file was gone after
 * the delete and back after the rewind"), as the Attack Lab prints them. Refuses a check that did not pass: the slide says the file came back.
 */
export function rewindProof(): { label: string; detail: string } {
  const name = s4Data().hero.name;
  const c = selectAttack(name).checks.find((x) => x.scope === "attack");
  if (!c) return fail(`evidence.attacks.${name}.result.checks`, "has no attack-scoped check (the proof that the deleted file came back)");
  if (c.status !== "pass") return fail(`evidence.attacks.${name}.result.checks[${c.label}]`, `is "${c.status}", not "pass": slide 07 says the file came back`);
  return { label: c.label, detail: c.detail };
}

/** What slide 08 reads about the hostile-page attack (`hostile_page_injection`), all through the film's own S5 data (src/scenes/s5/data.ts). */
export interface DefenseStory {
  /** The untrusted-data marker the page text was wrapped in, with the nonce the product chose for that call: "<<<BEGIN UNTRUSTED xxxxxxxx>>>". */
  fence: string;
  /** The scanner's ledger entry: how many findings, and how many of them hide from a human reader (display:none, off-screen text, comments). */
  scan: { findings: number; hidden: number };
  /** The compromised agent's follow-up command, and the risk of the policy decision that denied it. */
  command: { text: string; risk: string };
  /** The navigation the policy sent to a human (`approval.requested`) and how it ended. null when the ledger has no approval beat. */
  approval: null | { summary: string };
  /** The hosts of the run's `egress.blocked` lines. The film only draws these when the ledger has them: an empty list means nothing ever reached the wall. */
  egressHosts: string[];
  /** The report's three facts behind the stamp "nothing left the sandbox": bytes out, egress allowed, real secrets found in the sandbox. */
  stamp: { bytesOut: number; egressAllowed: number; realSecrets: number };
}

/**
 * The hostile-page run as slide 08's defense path draws it. s5Data() refuses an attack that was not contained, a ledger without the fence, the scanner or the
 * deny, and a report that does not support the stamp, so the slide cannot claim a stop the ledger does not hold. The only thing read here that the film does
 * not draw is the approval's summary (the film draws the whole modal; the path needs the one line).
 */
export function defenseStory(): DefenseStory {
  const d = s5Data();
  return {
    fence: d.fence.begin,
    scan: { findings: d.injection.findings.length, hidden: d.injection.hidden },
    command: { text: d.command, risk: d.deny.risk },
    approval: d.approval ? { summary: d.approval.summary } : null,
    egressHosts: d.egress.map((x) => x.host),
    stamp: { bytesOut: d.stamp.bytesOut, egressAllowed: d.stamp.egressAllowed, realSecrets: d.stamp.realSecrets },
  };
}

/** What slide 09 reads about the Attack Lab: the summary of the run of all attacks, and the conclusion of the CI run of the same definitions. */
export interface AttackLabFacts {
  total: number;
  contained: number;
  breached: number;
  inconclusive: number;
  /** The GitHub Actions conclusion of the capture's CI run ("success"), or null when the evidence has none. */
  ci: string | null;
}

export function attackLabFacts(): AttackLabFacts {
  const s = selectSummary();
  for (const [k, v] of Object.entries({ total: s.total, contained: s.contained, breached: s.breached, inconclusive: s.inconclusive })) {
    if (!isCount(v)) return fail(`evidence.attackSummary.${k}`, "is missing or not a number");
  }
  return { total: s.total, contained: s.contained, breached: s.breached, inconclusive: s.inconclusive, ci: selectCi().conclusion ?? null };
}

/**
 * The attacks of the Attack Lab grouped by category, in lab order (the capture's GET /api/attacks): the category's own word and the attack titles under it.
 * Titles only: the evidence stores a full result for five of the fifteen, so the slide shows no per-attack verdict.
 */
export function attackGroups(): { category: string; titles: string[] }[] {
  const out: { category: string; titles: string[] }[] = [];
  for (const a of selectAttackCatalog()) {
    if (!a.category || !a.title) return fail(`evidence.attackCatalog[${a.name}]`, "has no category or title");
    const g = out.find((x) => x.category === a.category);
    if (g) g.titles.push(a.title);
    else out.push({ category: a.category, titles: [a.title] });
  }
  if (out.length === 0) return fail("evidence.attackCatalog", "is empty");
  return out;
}

/**
 * What slide 10 draws as the ledger: three blocks of the rewind attack's own hash chain (the snapshot the rewind goes back to, the delete, the verified
 * rewind), picked by role from the film's S4 data, never by position. The links between them are honest: the blocks are a selection of a longer ledger,
 * so `gapBefore` counts the events left out and the HashChain draws that link dashed with "+N" (the block's prev_hash points at an event that is not drawn).
 * `seal` is the attack's real verification ("intact - N events - head 8 hex"), from `s4Data()`, which throws when the ledger does not verify.
 */
export interface LedgerChain {
  /** The attack's own title ("Wipe the workspace, then rewind"). */
  title: string;
  blocks: ChainBlock[];
  /** Index of the delete block (the one the HashChain keeps vermilion). */
  deleteIndex: number;
  seal: { events: number; short: string };
}

const LEDGER_ROLES = ["snapshot", "delete", "rewound"] as const;

export function ledgerChain(): LedgerChain {
  const d = s4Data();
  const at = LEDGER_ROLES.map((role) => {
    const i = d.chain.findIndex((c) => c.role === role);
    if (i < 0) return fail(`evidence.attacks.${d.hero.name}.events`, `has no "${role}" event for the ledger strip`);
    return i;
  });
  const need = (what: string, v: unknown): number => (isCount(v) ? v : fail(`evidence.attacks.${d.hero.name}.events[${what}]`, "is missing or not a number"));
  const blocks: ChainBlock[] = at.map((idx, k) => {
    const { role, event } = d.chain[idx];
    const detail =
      role === "delete" ? d.wipe.command : role === "snapshot" ? `${gfxB.snapshot} ${need("snapshot.created.payload.id", event.payload.id)}` : `${gfxB.snapshot} ${need("timeline.rewound.payload.to_snapshot", event.payload.to_snapshot)}`;
    return {
      label: event.type,
      hash: event.hash,
      prevHash: event.prev_hash,
      tone: role === "snapshot" ? "info" : role === "rewound" ? "ok" : "plain",
      detail,
      gapBefore: k === 0 ? 0 : event.id - d.chain[at[k - 1]].event.id - 1,
    };
  });
  if (!d.seal.verified) return fail(`evidence.attacks.${d.hero.name}.verify`, "does not say the ledger verified: slide 10 prints the seal");
  return { title: d.hero.title, blocks, deleteIndex: LEDGER_ROLES.indexOf("delete"), seal: { events: d.seal.events, short: d.seal.short } };
}

/** The seal line of the ledger strip, built exactly like the film's S4b5: "intact · 30 events · head bf7df3a5". */
export function ledgerSealLine(seal: { events: number; short: string }): string {
  return `${rep.intact} · ${seal.events} ${gfxB.events} · ${rep.head} ${seal.short}`;
}

/** The three numbers of slide 10's evidence strip, from the Report's Network, Compute and Time dimensions of the kept task run. */
export interface ReportEvidence {
  attempts: number;
  blocked: number;
  /** Peak memory and its limit in MiB, rounded to whole MiB (the Compute card rounds the same way). */
  peakMiB: number;
  limitMiB: number;
  /** Wall clock in seconds, exactly as the evidence has it (the Time card prints this value, so the strip must not round it). */
  wallSeconds: number;
}

export function reportEvidence(): ReportEvidence {
  const dims = selectTask().report.dimensions;
  const net = dims.network;
  const compute = dims.compute;
  const time = dims.time;
  if (!net || net.status !== "measured") return fail("evidence.task.report.dimensions.network", "is missing or not measured");
  if (!compute || compute.status !== "measured") return fail("evidence.task.report.dimensions.compute", "is missing or not measured");
  if (!time || time.status !== "measured") return fail("evidence.task.report.dimensions.time", "is missing or not measured");
  const num = (path: string, v: unknown): number => (isCount(v) ? v : fail(path, "is missing or not a number"));
  const MIB = 1024 * 1024;
  return {
    attempts: num("evidence.task.report.dimensions.network.attempts", net.attempts),
    blocked: num("evidence.task.report.dimensions.network.blocked", net.blocked),
    peakMiB: Math.round(num("evidence.task.report.dimensions.compute.peak_memory_bytes", compute.peak_memory_bytes) / MIB),
    limitMiB: Math.round(num("evidence.task.report.dimensions.compute.memory_limit_bytes", compute.memory_limit_bytes) / MIB),
    wallSeconds: num("evidence.task.report.dimensions.time.wall_clock_s", time.wall_clock_s),
  };
}

/** One dimension of the Report, as the legend of slide 10 lists it: the card's own title (key with "_" as a space) and the status word. */
export interface ReportCard {
  /** The dimension's key ("network"). */
  key: string;
  name: string;
  /** "measured", "not used", "not measured". */
  status: string;
  /** True only for "measured": a muted legend entry otherwise. */
  measured: boolean;
}

export function reportCards(): ReportCard[] {
  const entries = Object.entries(selectTask().report.dimensions);
  if (entries.length === 0) return fail("evidence.task.report.dimensions", "is empty");
  return entries.map(([key, v]) => {
    if (typeof v?.status !== "string") return fail(`evidence.task.report.dimensions.${key}.status`, "is missing");
    return { key, name: key.replace(/_/g, " "), status: v.status.replace(/_/g, " "), measured: v.status === "measured" };
  });
}

// ---------------------------------------------------------------------------------------------------------- slide 12: Vultr

const MAX_FACT_FONT = ARCH_CHIP_FONT;

/** Shortens the HOST in the middle with an ellipsis until "{host} - {bucket}" fits `room` px of mono. The bucket is never shortened. (Same rule as S8Vultr.tsx.) */
function fitHost(host: string, bucket: string, room: number): string {
  const tail = ` - ${bucket}`;
  if (estimateWidth(host + tail, MAX_FACT_FONT, MONO_ADVANCE) <= room) return host;
  const hostRoom = room - estimateWidth(tail, MAX_FACT_FONT, MONO_ADVANCE);
  const keep = Math.floor(hostRoom / (MAX_FACT_FONT * MONO_ADVANCE)) - 1;
  if (keep < 6) return fail("evidence.infra.storage", `bucket "${bucket}" alone leaves no room for the storage host on the chip (${Math.round(room)} px)`);
  const head = Math.ceil(keep / 2);
  const end = keep - head;
  return `${host.slice(0, head)}…${host.slice(host.length - end)}`;
}

/** The storage facts line: "{endpoint host} - {bucket}" from /api/infra, or the plain words when either is missing (same rule as S8Vultr.tsx). */
function storageFacts(): string {
  const { endpoint_host: host, bucket } = selectInfra().storage;
  if (typeof host !== "string" || host.trim() === "" || typeof bucket !== "string" || bucket.trim() === "") return gfxC.storageFacts;
  return `${fitHost(host, bucket, archChipTextRoom(2))} - ${bucket}`;
}

/** The three Vultr products as slide 12 states them: the diagram's chips and the table under it (same words and same facts, one source). */
export interface VultrFacts {
  chips: ArchChip[];
  /** Rows of the table under the diagram: product name, facts line, and the bake-off line under the inference row (null when the evidence does not hold it). */
  rows: { name: string; facts: string; note: string | null }[];
}

/**
 * The film's own rule (src/scenes/S8Vultr.tsx, `chips()`): the claims are only made when the evidence shows the real Vultr deployment, and the bake-off
 * line only when the evidence names the very model the deployment reports. Otherwise this throws and says which path to fix.
 */
export function vultrFacts(): VultrFacts {
  const { vultr, inference, storage } = selectInfra();
  const text = (path: string, v: string | null | undefined): string => (typeof v === "string" && v.trim() !== "" ? v : fail(path, "is missing: capture the real Vultr VM"));
  if (!vultr.available) return fail("evidence.infra.vultr.available", `is false (${vultr.reason ?? "no reason"}): slide 12 says Built on Vultr`);
  if (!inference.vultr) return fail("evidence.infra.inference.vultr", "is false: the inference service must be Vultr");
  if (!storage.attached || !storage.vultr) return fail("evidence.infra.storage", "is not an attached Vultr bucket");
  const model = text("evidence.infra.inference.model", inference.model);
  const note = bakeoffLine(model);
  const [vm, inf, obj] = s8.lowerThirds;
  const chips: ArchChip[] = [
    { name: vm, facts: vultr.plan ? `${text("evidence.infra.vultr.region", vultr.region)} - ${vultr.plan}` : text("evidence.infra.vultr.region", vultr.region) },
    { name: inf, facts: `${text("evidence.infra.inference.host", inference.host)}/v1 - ${model}`, ...(note !== null ? { note } : {}) },
    { name: obj, facts: storageFacts() },
  ];
  return { chips, rows: chips.map((c) => ({ name: c.name, facts: c.facts, note: c.note ?? null })) };
}

/** The links of slide 12's footer: the repository without its scheme, and the demo's host as the capture reported it (falls back to the copy's address). */
export function deckLinks(): { repo: string; demo: string } {
  const strip = (u: string): string => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const base = selectMeta().baseUrl;
  return { repo: strip(urls.repo), demo: strip(base && base.trim() !== "" ? base : urls.demo) };
}
