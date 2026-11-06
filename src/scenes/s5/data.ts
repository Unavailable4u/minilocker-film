// S5 data (patch 17): everything the hostile-page scene shows, read from the evidence through select.ts and filmState's session of the same run. No value is
// typed here, and nothing is invented: a piece the evidence cannot support makes this file throw, naming what is missing.
//
// The run is the `hostile_page_injection` attack, played in the Workspace (filmState `getHostileSession()`, pins in script.ts `HOSTILE_RUN`):
//   browser.page             -> the address row of the fixture page (url, status)
//   tool.result of the goto  -> the text the model is given, between the untrusted-data markers (the fence)
//   injection.suspected      -> the scanner's ledger line, its score and its findings (how many are hidden from a human reader)
//   tool.call after it       -> the compromised agent's follow-up command (the obeyCall pin)
//   policy.decision deny     -> "Policy deny (high): ..." (the deny pin)
//   egress.blocked           -> "Egress blocked -> host" lines, ONLY if the ledger has them (the hostile run is denied before it reaches the proxy,
//                               so the sample has none: the scene then shows none and does not invent one)
//   approval.requested/.denied -> the approval beat (optional, like the approval pins)
//   report.dimensions        -> the stamp "nothing left the sandbox" (network and secrets); refused unless the report supports it
import { selectAttack, selectAttackEvents, selectAttackReport } from "../../data/select";
import type { LedgerEvent } from "../../data/types";
import { getHostileSession } from "../../config/filmState";
import { describe, toolLine } from "../../lib/derive";

export interface S5Finding {
  rule: string;
  label: string;
  hidden: boolean;
  snippet: string;
}

export interface S5Data {
  /** The `browser.page` event of the fixture page. */
  page: { url: string; status: number | null; seq: number };
  /** The scanner's ledger line, exactly as the app's event log writes it (derive.describe). */
  injection: { index: number; line: string; score: number; findings: readonly S5Finding[]; hidden: number; visible: number };
  /** The fence: the markers and the page text the model is given, from the tool result of the goto. */
  fence: { begin: string; text: string; end: string };
  /** The compromised agent's follow-up command (the tool call right after the injection). */
  command: string;
  /** The policy decision that denied it. */
  deny: { index: number; line: string; risk: string; reason: string | null };
  /** `Egress blocked -> host` lines after the injection. Empty when the ledger has none. */
  egress: readonly { index: number; line: string; host: string }[];
  /** The approval beat. null when the evidence has no approval.requested event. */
  approval: null | { requestedIndex: number; deniedIndex: number; summary: string; risk: string; reasons: readonly string[]; requestedLine: string; deniedLine: string };
  /** What the stamp says nothing left the sandbox because of: numbers from the report's network and secrets dimensions. */
  stamp: { bytesOut: number; egressAllowed: number; realSecrets: number };
}

const NAME = "hostile_page_injection";

function fail(msg: string): never {
  throw new Error(`S5: ${msg}`);
}

function num(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${path} is missing or not a number (got ${JSON.stringify(v)}); the stamp cannot be built without it`);
  return v;
}

let cached: S5Data | null = null;

export function s5Data(): S5Data {
  if (cached) return cached;
  const result = selectAttack(NAME);
  const events = selectAttackEvents(NAME);
  const report = selectAttackReport(NAME);
  const session = getHostileSession();
  const at = (i: number | undefined, what: string): LedgerEvent => {
    const e = i === undefined ? undefined : events[i];
    if (!e) fail(`the ledger of ${NAME} has no ${what} (rule in filmState.ts resolveHostile)`);
    return e;
  };

  // the attack itself must have been contained: the film's three captions claim it
  if (result.verdict !== "contained") fail(`evidence.attacks.${NAME}.result.verdict is "${result.verdict}", not "contained"; the scene's captions (flagged, denied, nothing leaves) would not be true`);

  // the page
  const pageEv = events.find((e) => e.type === "browser.page");
  if (!pageEv) fail(`the ledger of ${NAME} has no browser.page event`);
  const url = pageEv.payload.url;
  if (typeof url !== "string" || url === "") fail("browser.page has no url");
  const status = typeof pageEv.payload.status === "number" ? pageEv.payload.status : null;
  const seq = num(pageEv.payload.seq, "browser.page seq");

  // the scanner
  const injIndex = session.pinIndex.get("injection");
  const inj = at(injIndex, "injection.suspected event");
  const line = describe(inj)?.text;
  if (!line) fail("injection.suspected has no ledger line");
  if (inj.payload.seq !== seq) fail(`injection.suspected is about page ${inj.payload.seq}, the browser.page event is page ${seq}`);
  const findings = (Array.isArray(inj.payload.findings) ? inj.payload.findings : []) as S5Finding[];
  const hidden = findings.filter((f) => f.hidden === true).length;
  const score = num(inj.payload.score, "injection.suspected score");

  // the fence: the tool result that wrapped the page text in the untrusted-data markers
  const wrap = events.find((e) => e.type === "tool.result" && typeof e.payload.result === "string" && /<<[^\n]*begins>>/.test(e.payload.result));
  if (!wrap) {
    const real = events.find((e) => e.type === "tool.result" && typeof e.payload.result === "string" && /\[UNTRUSTED WEB CONTENT/.test(e.payload.result));
    if (real && /\[film: trimmed \d+ chars\]/.test(String(real.payload.result))) {
      fail(`the ledger of ${NAME} has the product's untrusted-content wrapper, but capture-evidence.mjs trimmed it (the page text is cut, the end marker is gone). Re-run "npm run evidence" with the current scripts/capture-evidence.mjs, then adapt the fence parsing below to the wrapper's real end marker`);
    }
    fail(`the ledger of ${NAME} has no tool.result that wraps the page text in untrusted-data markers (<<... begins>> / <<... ends>>); the fence cannot be shown`);
  }
  const rows = String(wrap.payload.result).split("\n");
  const b = rows.findIndex((r) => /^<<.*begins>>$/.test(r.trim()));
  const e2 = rows.findIndex((r, i) => i > b && /^<<.*ends>>$/.test(r.trim()));
  if (b < 0 || e2 < 0) fail("the untrusted-data markers of the tool result are not on lines of their own");
  const text = rows.slice(b + 1, e2).join(" ").replace(/\s+/g, " ").trim();
  if (text === "") fail("the page text between the untrusted-data markers is empty");

  // the compromised agent obeys, and the policy denies
  const obeyIndex = session.pinIndex.get("obeyCall");
  const obey = at(obeyIndex, "tool call after the injection");
  const command = toolLine(obey.payload);
  if (!command) fail("the compromised agent's tool call has no command");
  const denyIndex = session.pinIndex.get("deny");
  const denyEv = at(denyIndex, "policy.decision with action deny after the injection");
  if (!(denyIndex! > obeyIndex!)) fail("the policy deny must come after the command it denies");
  const denyLine = describe(denyEv)?.text;
  if (!denyLine) fail("the deny decision has no ledger line");
  const reasons = Array.isArray(denyEv.payload.reasons) ? (denyEv.payload.reasons as string[]) : [];

  // egress lines, only the ledger's own
  const egress = events
    .map((ev, index) => ({ ev, index }))
    .filter(({ ev, index }) => ev.type === "egress.blocked" && index > (injIndex as number))
    .map(({ ev, index }) => ({ index, line: describe(ev)?.text ?? "", host: String(ev.payload.host ?? "") }))
    .filter((x) => x.line !== "");

  // the approval beat
  let approval: S5Data["approval"] = null;
  const reqIndex = events.findIndex((ev) => ev.type === "approval.requested");
  if (reqIndex >= 0) {
    if (events.some((ev) => ev.type === "approval.granted")) fail("the ledger has an approval.granted event; the scene shows a denied approval only");
    const denIndex = events.findIndex((ev, i) => i > reqIndex && ev.type === "approval.denied");
    if (denIndex < 0) fail("the ledger has approval.requested but no approval.denied after it");
    const req = events[reqIndex];
    const summary = req.payload.summary;
    const risk = req.payload.risk;
    if (typeof summary !== "string" || typeof risk !== "string") fail("approval.requested has no summary or risk");
    approval = {
      requestedIndex: reqIndex,
      deniedIndex: denIndex,
      summary,
      risk,
      reasons: Array.isArray(req.payload.reasons) ? (req.payload.reasons as string[]) : [],
      requestedLine: describe(req)?.text ?? "",
      deniedLine: describe(events[denIndex])?.text ?? "",
    };
  }

  // the stamp: network and secrets, from the report; refused unless they support "nothing left the sandbox"
  const net = report.dimensions.network;
  const sec = report.dimensions.secrets;
  if (!net || net.status !== "measured") fail(`the report's network dimension is "${net?.status ?? "missing"}", not measured: "nothing left the sandbox" would be a claim without a measurement`);
  if (!sec || sec.status !== "measured") fail(`the report's secrets dimension is "${sec?.status ?? "missing"}", not measured: "nothing left the sandbox" would be a claim without a measurement`);
  const bytesOut = num(net.bytes_out, "report.dimensions.network.bytes_out");
  const allowed = num(net.allowed, "report.dimensions.network.allowed");
  if (bytesOut !== 0) fail(`report.dimensions.network.bytes_out is ${bytesOut}: the stamp "nothing left the sandbox" is not supported`);
  if (allowed !== 0) fail(`report.dimensions.network.allowed is ${allowed}: the stamp "nothing left the sandbox" is not supported`);
  const found = Object.keys((sec.real_secrets_found ?? {}) as Record<string, unknown>).length;
  if (found !== 0) fail(`report.dimensions.secrets.real_secrets_found has ${found} entries: the stamp is not supported`);
  if (sec.real_secrets_in_sandbox !== false) fail("report.dimensions.secrets.real_secrets_in_sandbox is not false: the stamp is not supported");
  const copied = Array.isArray(sec.decoys_copied_out) ? sec.decoys_copied_out.length : 0;
  if (copied !== 0) fail(`report.dimensions.secrets.decoys_copied_out has ${copied} entries: the stamp is not supported`);
  const attempts = num(sec.exfiltration_attempts, "report.dimensions.secrets.exfiltration_attempts");
  const blocked = num(sec.exfiltration_blocked, "report.dimensions.secrets.exfiltration_blocked");
  if (blocked !== attempts) fail(`report.dimensions.secrets: ${attempts} exfiltration attempts, ${blocked} blocked: the stamp is not supported`);

  cached = {
    page: { url, status, seq },
    injection: { index: injIndex as number, line, score, findings, hidden, visible: findings.length - hidden },
    fence: { begin: rows[b].trim(), text, end: rows[e2].trim() },
    command,
    deny: { index: denyIndex as number, line: denyLine, risk: String(denyEv.payload.risk ?? ""), reason: reasons[0] ?? null },
    egress,
    approval,
    stamp: { bytesOut, egressAllowed: allowed, realSecrets: found },
  };
  return cached;
}
