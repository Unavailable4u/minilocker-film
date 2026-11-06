// Typed, pure selectors over src/data/evidence.json. This is the ONLY file that imports the JSON: scenes call these
// functions and never know whether the data is the SAMPLE or the real capture.
//
// Rules
//   - No value is invented here. A missing path throws an Error that names the path (e.g. "evidence.attacks.rewind_after_rm_rf.events").
//   - No Date, no randomness, no crypto: the same file always gives the same answers.
//   - Selectors return the data as stored (no copies); callers must not mutate it.

import raw from "./evidence.json";
import { hashStringToSeed } from "../lib/prng";
import type {
  AttackInfo,
  AttackResult,
  AttackSummary,
  Evidence,
  EvidenceAttack,
  EvidenceCi,
  EvidenceMeta,
  EvidenceTake,
  InfraStatus,
  LedgerEvent,
  Measured,
  Report,
  S3Source,
  ScenarioInfo,
  TaskEnd,
  Verification,
} from "./types";

const evidence = raw as unknown as Evidence;

function fail(path: string, why = "is missing"): never {
  throw new Error(`evidence: ${path} ${why}. Re-capture with "npm run evidence" or fix src/data/evidence.json.`);
}

/** Returns `value` or throws naming `path`. null and undefined both count as missing. */
function need<T>(path: string, value: T | null | undefined): T {
  if (value === null || value === undefined) return fail(path);
  return value;
}

function needArray<T>(path: string, value: T[] | null | undefined): T[] {
  const v = need(path, value);
  if (!Array.isArray(v)) return fail(path, "is not an array");
  return v;
}

// ---------------------------------------------------------------------------------------------------------------------
// Whole-file facts
// ---------------------------------------------------------------------------------------------------------------------

export function selectMeta(): EvidenceMeta {
  return need("evidence.meta", evidence.meta);
}

export function selectInfra(): InfraStatus {
  return need("evidence.infra", evidence.infra);
}

/** The scenario entries captured from /api/scenarios (fix_repo_v2 first). */
export function selectScenarios(): ScenarioInfo[] {
  return needArray("evidence.scenarios", evidence.scenarios);
}

export function selectSummary(): AttackSummary {
  return need("evidence.attackSummary", evidence.attackSummary);
}

/** The measured claims (BIBLE 7.2 step 3). Individual numbers can be null until the real capture: callers must handle that. */
export function selectMeasured(): Measured {
  return need("evidence.measured", evidence.measured);
}

export function selectCi(): EvidenceCi {
  return need("evidence.ci", evidence.ci);
}

/** Where scene S3 takes its data: the kept `task` take, or the `malicious_repo_hook` attack (BIBLE 7.3). */
export function selectS3Source(): S3Source {
  const v = need("evidence.s3Source", evidence.s3Source);
  if (v !== "task" && v !== "attack:malicious_repo_hook") return fail("evidence.s3Source", `is "${String(v)}" (expected "task" or "attack:malicious_repo_hook")`);
  return v;
}

/** The fix_repo_v2 attempts the capture made (summaries only). Empty when the file has none. */
export function selectTakes(): EvidenceTake[] {
  return evidence.takes ?? [];
}

// ---------------------------------------------------------------------------------------------------------------------
// The task (the kept take)
// ---------------------------------------------------------------------------------------------------------------------

export function selectTask(): { id: string; scenario: string; events: LedgerEvent[]; report: Report; verify: Verification; end: TaskEnd } {
  const t = need("evidence.task", evidence.task);
  return {
    id: need("evidence.task.id", t.id),
    scenario: need("evidence.task.scenario", t.scenario),
    events: needArray("evidence.task.events", t.events),
    report: need("evidence.task.report", t.report),
    verify: need("evidence.task.verify", t.verify),
    end: need("evidence.task.end", t.end),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Attacks
// ---------------------------------------------------------------------------------------------------------------------

function attackEntry(name: string): EvidenceAttack {
  const all = need("evidence.attacks", evidence.attacks);
  return need(`evidence.attacks.${name}`, all[name]);
}

/** The AttackResult (verdict, checks, steps) of one attack, e.g. selectAttack("rewind_after_rm_rf"). */
export function selectAttack(name: string): AttackResult {
  return need(`evidence.attacks.${name}.result`, attackEntry(name).result);
}

/** The ledger events of one attack's task. */
export function selectAttackEvents(name: string): LedgerEvent[] {
  return needArray(`evidence.attacks.${name}.events`, attackEntry(name).events);
}

export function selectAttackReport(name: string): Report {
  return need(`evidence.attacks.${name}.report`, attackEntry(name).report);
}

export function selectAttackVerify(name: string): Verification {
  return need(`evidence.attacks.${name}.verify`, attackEntry(name).verify);
}

/** What the Attack Lab lists: one AttackInfo per attack, in lab order (the capture's GET /api/attacks). */
export function selectAttackCatalog(): AttackInfo[] {
  return needArray("evidence.attackCatalog", evidence.attackCatalog);
}

/** Names of the attacks the file holds full data for, in file order. */
export function selectAttackNames(): string[] {
  return Object.keys(need("evidence.attacks", evidence.attacks));
}

// ---------------------------------------------------------------------------------------------------------------------
// Identity of the file
// ---------------------------------------------------------------------------------------------------------------------

/** First 8 hex characters of a 32-bit FNV-1a hash of the file's contents (JSON text), computed once at module load.
 *  A tiny stand-in for a checksum: same file, same id, so a frame can show which capture it came from. */
const SHORT_ID = hashStringToSeed(JSON.stringify(raw)).toString(16).padStart(8, "0");

export function selectEvidenceShortId(): string {
  return SHORT_ID;
}

// ---------------------------------------------------------------------------------------------------------------------
// Small helpers over event lists
// ---------------------------------------------------------------------------------------------------------------------

/** The events whose ts is <= `ts` (what the ledger had recorded at that moment), in order. Does not assume sorted input beyond ids. */
export function eventsUpTo(events: readonly LedgerEvent[], ts: number): LedgerEvent[] {
  return events.filter((e) => e.ts <= ts);
}

/** First event of a type, optionally also matching a predicate; undefined when there is none. */
export function firstByType(
  events: readonly LedgerEvent[],
  type: string,
  where?: (e: LedgerEvent) => boolean,
): LedgerEvent | undefined {
  return events.find((e) => e.type === type && (!where || where(e)));
}

/** Last event of a type, optionally also matching a predicate; undefined when there is none. */
export function lastByType(
  events: readonly LedgerEvent[],
  type: string,
  where?: (e: LedgerEvent) => boolean,
): LedgerEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === type && (!where || where(e))) return e;
  }
  return undefined;
}

/**
 * The six container chips of S3 (rule 8: no number is typed). Each chip is rebuilt from the `hardening` of the first `sandbox.created`
 * event of the attack ledgers; `template` (copy.s3.chips) supplies the words that are claims rather than measurements ("no route out").
 * Throws when the evidence contradicts a chip, because the film would then say something its own evidence does not.
 */
export function containerChips(template: readonly string[]): readonly string[] {
  if (template.length !== 6) throw new Error("containerChips: copy.s3.chips must have six entries");
  const names = selectAttackNames();
  let h: Record<string, unknown> | null = null;
  for (const n of names) {
    const ev = selectAttackEvents(n).find((e) => e.type === "sandbox.created");
    const hard = ev?.payload?.hardening;
    if (hard && typeof hard === "object") {
      h = hard as Record<string, unknown>;
      break;
    }
  }
  if (!h) return template; // no hardening in the evidence: the fallback is the words, as before
  const bad = (what: string): never => {
    throw new Error(`containerChips: the evidence's sandbox.created hardening says ${what}, which contradicts the chip; fix copy.s3.chips or re-capture`);
  };
  const user = String(h.user ?? "");
  if (user === "" || user === "root" || /^0(:|$)/.test(user)) bad(`user "${user}"`);
  if (h.read_only_rootfs !== true) bad("the root filesystem is not read-only");
  const drop = Array.isArray(h.cap_drop) ? (h.cap_drop as string[]) : [];
  const add = Array.isArray(h.cap_add) ? (h.cap_add as string[]) : [];
  if (!drop.includes("ALL") || add.length > 0 || h.privileged === true) bad("capabilities are not all dropped");
  const pids = h.pids_limit;
  if (typeof pids !== "number" || !Number.isFinite(pids) || pids <= 0) bad("no pids_limit");
  const mem = h.memory;
  if (typeof mem !== "number" || !Number.isFinite(mem) || mem <= 0) bad("no memory limit");
  if (h.memory_swap !== mem) bad("a swap allowance (memory_swap differs from memory)");
  const mb = Math.round((mem as number) / (1024 * 1024));
  return [template[0], template[1], template[2], `${pids} processes`, `${mb} MB, no swap`, template[5]];
}

