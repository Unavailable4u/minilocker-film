// Ported from the product (frontend/src/components.tsx: type G, MIB, gaugesOf). LOGIC AND WORDING UNCHANGED, only the import of
// LedgerEvent moved and the keys got a name. Every number and subtitle of the Blast panel comes out of this function, from real
// ledger events (evidence rule): nothing in a component types a gauge value.
import type { LedgerEvent } from "../data/types";
import { blast, measure } from "./derive";
import type { Tone } from "./derive";

export type G = {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  sub: string;
  tone: Tone;
  measured: boolean;
  meter?: number;
};

/** The seven gauges in display order (the order gaugesOf returns). `reveal[]` of the BlastPanel is indexed like this. */
export const GAUGE_KEYS = ["net", "pol", "fs", "sec", "cpu", "time", "sbx"] as const;
export type GaugeKey = (typeof GAUGE_KEYS)[number];

const MIB = 1024 * 1024;

/** Every gauge, in display order. Until a sandbox has been audited (that happens as it is destroyed) the measured ones
 *  say so; they never show a zero that nothing measured. */
export function gaugesOf(events: readonly LedgerEvent[], running: boolean): G[] {
  // Before any task there is nothing to measure: say so everywhere instead of showing reassuring zeros.
  if (events.length === 0) {
    const none = (key: string, label: string): G => ({ key, label, value: "—", tone: "info", measured: false, sub: "no task yet" });
    return [none("net", "Network"), none("pol", "Policy"), none("fs", "Filesystem"), none("sec", "Secrets"), none("cpu", "Compute"),
      none("time", "Time"), none("sbx", "Sandboxes")];
  }
  const evs = events as LedgerEvent[];
  const m = blast(evs), x = measure(evs);
  const wait = running ? "measured when the sandbox is destroyed" : "not measured";
  const out: G[] = [
    { key: "net", label: "Network", value: m.blocked, tone: m.blocked ? "bad" : "ok", measured: true,
      sub: `blocked · ${m.allowed} allowed · ${m.hosts.size} host${m.hosts.size === 1 ? "" : "s"}` },
    { key: "pol", label: "Policy", value: m.denied, tone: m.denied ? "bad" : "ok", measured: true,
      sub: `denied · ${m.asked} approval${m.asked === 1 ? "" : "s"} · ${m.decisions} checked` },
  ];
  if (!x.audited) {
    out.push(
      { key: "fs", label: "Filesystem", value: "—", tone: "info", measured: false, sub: wait },
      { key: "sec", label: "Secrets", value: "—", tone: "info", measured: false, sub: wait },
      { key: "cpu", label: "Compute", value: "—", tone: "info", measured: false, sub: wait },
    );
  } else {
    const ws = x.workspace;
    out.push(
      { key: "fs", label: "Filesystem", value: x.hostBinds, tone: x.hostBinds ? "bad" : "ok", measured: true,
        sub: `host paths mounted · ${x.rootfsChanges} system files changed${ws ? ` · workspace +${ws.added} ~${ws.modified} −${ws.deleted}` : ""}` },
      { key: "sec", label: "Secrets", value: x.realSecrets.length, measured: true,
        tone: x.realSecrets.length ? "bad" : x.decoysTripped.size ? "warn" : "ok",
        sub: `real in sandbox${x.scanned ? "" : " (inside not scanned)"} · ${x.decoysRead.size} of ${x.decoysPlanted || "?"} decoys read · ${x.decoysTripped.size} used` },
      { key: "cpu", label: "Compute", value: Math.round(x.peakMem / MIB), unit: "MiB", measured: true,
        tone: x.oom ? "bad" : x.memLimit && x.peakMem / x.memLimit > 0.8 ? "warn" : "ok",
        meter: x.memLimit ? Math.min(1, x.peakMem / x.memLimit) : undefined,
        sub: `peak of ${Math.round(x.memLimit / MIB)} · ${x.peakPids}/${x.pidsLimit} pids · ${x.cpuS.toFixed(1)} s cpu${x.oom ? " · OOM killed" : ""}` },
    );
  }
  out.push(
    { key: "time", label: "Time", value: m.seconds.toFixed(0), unit: "s", tone: "info", measured: true, sub: running ? "so far" : "wall clock" },
    { key: "sbx", label: "Sandboxes", value: m.created, tone: "info", measured: true,
      sub: `created · ${m.destroyed} destroyed · ${m.forced} killed · ${m.rewinds} rewound` },
  );
  return out;
}

/** The dial's phase (components.tsx BlastPanel): "measuring" while the task runs, "idle" before any event, "partial" after. */
export type Phase = "idle" | "measuring" | "partial" | "done";

export function phaseOf(events: readonly LedgerEvent[], running: boolean): Phase {
  return running ? "measuring" : events.length === 0 ? "idle" : "partial";
}
