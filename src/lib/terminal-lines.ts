// Ledger events -> terminal rows, the way the app's Terminal.tsx render() and its repeated-egress folding do it.
// Ported with the same strings; ANSI colors became TermTone (G "$"/approved = cmd/ok, D = dim, R = err, Y = warn).
// Pure: the same events give the same rows. Each row remembers `src`, the index in the events list it came from, so a
// scene can give every row the frame of its event (for the tail scroll and for sounds).
import type { LedgerEvent } from "../data/types";
import type { TermLine } from "../ui/TerminalView";
import { parseArgs } from "./derive";

export interface TermRow extends TermLine {
  /** Index (in the events array passed in) of the event this row was written for. */
  src: number;
}

// Sandbox output is untrusted: strip control bytes (the app does the same). \n and \t survive here, then rows are split.
const clean = (s: string): string => s.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");

function rows(text: string, tone: TermLine["tone"], src: number, out: TermRow[]): void {
  for (const line of text.split("\n")) out.push({ text: line.replace(/\t/g, "    "), tone, src });
}

function renderEvent(e: LedgerEvent, src: number, out: TermRow[]): void {
  const p = e.payload;
  switch (e.type) {
    case "tool.call": {
      const a = parseArgs(p.args ?? "");
      if (p.tool === "run_shell") {
        const lines = clean(String(a?.cmd ?? p.args)).split("\n");
        lines.forEach((l, i) => out.push({ text: l.replace(/\t/g, "    "), tone: i === 0 ? "cmd" : "out", src }));
        return;
      }
      if (p.tool === "finish") return;
      if (p.tool === "browse") {
        out.push({ text: `# browse ${clean(String(a?.action ?? ""))} ${clean(String(a?.url ?? a?.selector ?? ""))}`, tone: "dim", src });
        return;
      }
      out.push({ text: `# ${p.tool} ${clean(String(a?.path ?? ""))}`, tone: "dim", src });
      return;
    }
    case "tool.result": {
      const raw = clean(String(p.result ?? ""));
      const m = raw.match(/^exit_code=(-?\d+)\n?([\s\S]*)$/);
      if (!m) {
        rows(raw, "out", src, out); // e.g. a policy block message
        return;
      }
      const body = m[2].replace(/\n+$/, "");
      if (body) rows(body, "out", src, out);
      out.push({ text: `[exit ${m[1]}]`, tone: m[1] === "0" ? "dim" : "err", src });
      return;
    }
    case "policy.decision":
      if (p.action !== "allow") {
        out.push({ text: `[policy:${p.action}] ${clean((p.reasons ?? []).join("; "))}`, tone: p.action === "deny" ? "err" : "warn", src });
      }
      return;
    case "injection.suspected":
      out.push({
        text: `[injection suspected] page ${clean(String(p.seq))} score ${clean(String(p.score))}: ${clean((p.findings ?? []).map((f: any) => String(f.label)).join("; "))}`,
        tone: "err",
        src,
      });
      return;
    case "egress.blocked":
      out.push({
        text: `[egress blocked${p.source === "browser" ? ": browser" : ""}] ${clean(String(p.host))} (${clean(String(p.reason ?? ""))})`,
        tone: "err",
        src,
      });
      return;
    case "approval.requested":
      out.push({ text: `[approval needed] ${clean(String(p.summary))}`, tone: "warn", src });
      return;
    case "approval.granted":
      out.push({ text: "[approved]", tone: "ok", src });
      return;
    case "approval.denied":
      out.push({ text: "[denied]", tone: "err", src });
      return;
    case "task.end":
      out.push({ text: `── task ${clean(String(p.status))} ──`, tone: "dim", src });
      return;
    default:
      return;
  }
}

/** All rows for the events given, in order. A page that loads 30 images from one blocked host is one red line plus a count. */
export function terminalRows(events: readonly LedgerEvent[]): TermRow[] {
  const out: TermRow[] = [];
  const seen = new Map<string, { n: number; label: string }>(); // repeated egress blocks
  const flush = (src: number) => {
    for (const v of seen.values()) {
      if (v.n) {
        out.push({ text: `  … ${v.n} more blocked request(s) → ${v.label}`, tone: "dim", src });
        v.n = 0;
      }
    }
  };
  events.forEach((ev, i) => {
    if (ev.type === "egress.blocked") {
      const key = `${ev.payload.source}|${ev.payload.host}|${ev.payload.reason}`;
      const hit = seen.get(key);
      if (hit) {
        hit.n++;
        return;
      }
      seen.set(key, { n: 0, label: `${clean(String(ev.payload.host))} (${clean(String(ev.payload.reason ?? ""))})` });
    } else if (ev.type === "tool.result" || ev.type === "task.end") {
      flush(i);
    }
    renderEvent(ev, i, out);
  });
  return out;
}
