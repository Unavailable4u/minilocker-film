// Deck facts: the evidence values the slides print, read through src/data/select.ts and the film's own derivations. Nothing here is typed by hand
// (guide section 7, trap 2). A value the evidence does not hold makes the function throw and name the path, as select.ts does, so a slide can never
// print a number the capture does not contain.
import { s8 } from "../config/copy";
import { selectMeasured, selectTask } from "../data/select";
import { describe } from "../lib/derive";
import { s3Data } from "../scenes/s3/data";
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
