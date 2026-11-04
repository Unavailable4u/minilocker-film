// S3 data (patch 14a): everything the three parts of scene S3 show, read from the evidence through select.ts. No value is typed here.
//
// Where it comes from (BIBLE 7.3): `evidence.s3Source` is "task" (the kept fix_repo_v2 take, the same ledger the app played in S2) or
// "attack:malicious_repo_hook" (the Attack Lab run of the hostile repo hook). Both ledgers have the same events (canary.seeded,
// canary.read, egress.blocked, sandbox.audit), so the rest of S3 never asks which one it is. When the source is the attack, the film
// shows the tag "Attack Lab - malicious_repo_hook" and the attack's own title in place of the module name (14b).
//
// 14a uses `decoys`, `source`, `tag` and `planted`; 14b uses `reads`, `blocked`, `allowedHosts`, `proxy` and `module`; 14c uses `audit`.
// They are all derived here, once, so the three parts cannot disagree about what the evidence says.
import { selectAttack, selectAttackEvents, selectInfra, selectS3Source, selectTask } from "../../data/select";
import type { LedgerEvent } from "../../data/types";
import { copy } from "../../config/copy";
import { SCREEN_INDEX } from "../../config/script";
import { describe, measure } from "../../lib/derive";

export interface S3Decoy {
  /** Evidence item id (aws_secret, ssh_key, ...): picks the icon in DecoyRack, never shown. */
  id: string;
  /** Evidence label ("SSH private key"). */
  label: string;
}

export interface S3Read {
  /** The ledger event id of the canary.read. */
  eventId: number;
  /** The ledger's own timestamp (seconds), for ordering and for the clock. */
  ts: number;
  /** Index of the decoy in `decoys`. */
  decoy: number;
  label: string;
  /** describe() of the real event: "Decoy read: {label}". */
  line: string;
}

export interface S3Blocked {
  eventId: number;
  ts: number;
  host: string;
  reason: string;
  /** describe() of the real event: "Egress blocked -> {host} ({reason})". */
  line: string;
}

export interface S3Data {
  source: "task" | "attack:malicious_repo_hook";
  /** The ledger S3 is built from. */
  events: readonly LedgerEvent[];
  /** "Attack Lab - malicious_repo_hook" when S3 is built from the attack, else null (no tag). */
  tag: string | null;
  /** The attack's title when S3 is built from the attack ("Hostile repo hook"), else null: the module name is the film's (BIBLE 6, Appendix B). */
  attackTitle: string | null;
  /** The planted decoys, from the canary.seeded event, in the order the ledger lists them (the order of the DecoyRack tiles). */
  decoys: readonly S3Decoy[];
  /** Number of planted decoys (the Secrets gauge's "of N"). */
  planted: number;
  /** Every canary.read event, in ledger order, one per decoy at most (a repeated read of the same decoy is dropped). */
  reads: readonly S3Read[];
  /** The first egress.blocked event: the host the hostile code tried to reach. */
  blocked: S3Blocked;
  /** infra.egress.allowed_hosts (the plaque of the EgressWall) and the proxy label. */
  allowedHosts: readonly string[];
  proxy: string | undefined;
  /** The teardown audit: what the stamp of 14c shows. */
  audit: { realSecretsInSandbox: number; scanned: boolean; decoysRead: number; decoysUsed: number };
}

function fail(what: string): never {
  throw new Error(`S3: ${what}. Re-capture with "npm run evidence" or fix src/data/evidence.json.`);
}

function build(): S3Data {
  const source = selectS3Source();
  const events: readonly LedgerEvent[] = source === "task" ? selectTask().events : selectAttackEvents("malicious_repo_hook");
  const attackName = source === "task" ? null : "malicious_repo_hook";

  const seeded = events.find((e) => e.type === "canary.seeded");
  if (!seeded) return fail(`the ${source} ledger has no canary.seeded event`);
  const items: unknown = seeded.payload.items;
  if (!Array.isArray(items) || items.length === 0) return fail("canary.seeded has no items");
  const decoys: S3Decoy[] = items.map((it: { id?: unknown; label?: unknown }, i: number) => {
    if (typeof it?.id !== "string" || typeof it?.label !== "string") return fail(`canary.seeded item ${i} has no id / label`);
    return { id: it.id, label: it.label };
  });
  // two rows of three is what the box holds (BIBLE 11 A: "DecoyRack 3x2")
  if (decoys.length > 6) return fail(`canary.seeded lists ${decoys.length} decoys; the S3 box holds at most 6 (3 x 2)`);

  const reads: S3Read[] = [];
  for (const e of events) {
    if (e.type !== "canary.read") continue;
    const decoy = decoys.findIndex((d) => d.id === e.payload.item);
    if (decoy < 0) return fail(`canary.read (event ${e.id}) is for "${String(e.payload.item)}", which canary.seeded did not plant`);
    if (reads.some((r) => r.decoy === decoy)) continue;
    const d = describe(e);
    if (!d) return fail(`canary.read (event ${e.id}) has no description`);
    reads.push({ eventId: e.id, ts: e.ts, decoy, label: decoys[decoy].label, line: d.text });
  }

  const be = events.find((e) => e.type === "egress.blocked");
  if (!be) return fail(`the ${source} ledger has no egress.blocked event (S3 shows the blocked host of the real exfiltration attempt)`);
  const host = be.payload.host;
  if (typeof host !== "string" || host.length === 0) return fail(`egress.blocked (event ${be.id}) has no host`);
  const bd = describe(be);
  const blocked: S3Blocked = { eventId: be.id, ts: be.ts, host, reason: String(be.payload.reason ?? "not_allowlisted"), line: bd ? bd.text : `Egress blocked -> ${host}` };

  const egress = selectInfra().egress;
  if (!egress.attached || !egress.allowed_hosts || egress.allowed_hosts.length === 0) return fail("infra.egress has no allowed_hosts (the allowlist plaque needs them)");

  const m = measure(events as LedgerEvent[]);
  const audit = { realSecretsInSandbox: m.realSecrets.length, scanned: m.scanned, decoysRead: m.decoysRead.size, decoysUsed: m.decoysTripped.size };
  // The film must not hide it: "Containment, measured." (f1500) and the audit stamp (14c) both claim zero real secrets.
  if (audit.realSecretsInSandbox !== 0) {
    return fail(`the sandbox audit found ${audit.realSecretsInSandbox} real secret(s) inside (${m.realSecrets.join(", ")}); the film must not hide it, so S3 will not render`);
  }

  return {
    source,
    events,
    tag: attackName ? `${copy.ui.screens[SCREEN_INDEX.attackLab]} - ${attackName}` : null,
    attackTitle: attackName ? selectAttack(attackName).title : null,
    decoys,
    planted: decoys.length,
    reads,
    blocked,
    allowedHosts: egress.allowed_hosts,
    proxy: egress.proxy,
    audit,
  };
}

let cached: S3Data | null = null;

/** The S3 data. Built once, on first use; throws (naming what is missing) if the evidence cannot support the scene. */
export function s3Data(): S3Data {
  if (!cached) cached = build();
  return cached;
}
