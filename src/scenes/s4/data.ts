// S4 data (patch 15a): everything the three parts of S4a show, read from the evidence through select.ts. No value is typed here.
//
// The hero attack is `LAB.hero` (script.ts), "rewind_after_rm_rf". Its AttackResult has three steps (the write of /workspace/precious.txt, the wipe,
// the cat); the REWIND has no step of its own in an AttackResult, it is the ledger's `rewind.requested` event. The snapshot the film shows is the one
// that rewind goes back to (`rewind.requested.payload.snapshot`), found among the `snapshot.created` events: its sha256 is what the timeline node
// prints (first 8 hex) and what S4b's two HashTiles compare.
//
// 15a uses `hero.index` (which tile and which card the cursor picks); 15b uses `write`, `snapshot` and `wipe.command`; 15c uses `wipe`. They are all
// derived here, once, so the parts cannot disagree about what the evidence says. S4b (patch 16) reads `rewind`, `snapshot` and `cat`.
//
// 16a extends this file ONCE for all of S4b (16a-16f), the way 15a did for S4a, so that 16b-16f need not resend it: `rewound` (16a: the snapshots the rewind
// threw away, 16b: the restored hash and the number of files re-hashed), `cat.line` (16c), `chain` and `seal` (16e: the ledger blocks the HashChain shows and the
// verification the "Verify ledger" press ends on) and `outcome` (16f: the numerals of the proof beat). Every field is derived from the same evidence and
// throws, naming what is missing, if the evidence cannot support the scene.
import { selectAttack, selectAttackCatalog, selectAttackEvents, selectAttackVerify } from "../../data/select";
import type { LedgerEvent } from "../../data/types";
import { LAB } from "../../config/script";
import { shortHash } from "../../lib/hash";

export interface S4Data {
  hero: {
    name: string;
    /** The catalog's own title and category ("Wipe the workspace, then rewind", "recovery"). */
    title: string;
    category: string;
    /** Index in the lab's order: the tile and the card the cursor picks. */
    index: number;
    /** How many attacks the lab lists (the summary bar's "N"). */
    count: number;
  };
  /** The step that writes the file the agent will lose: its path and its text. */
  write: { path: string; content: string };
  /** The step that wipes the workspace: the real command, the raw result, and the line the film shows huge ("WIPED_0"). */
  wipe: { command: string; result: string; token: string };
  /** The step that reads the file back after the rewind. `line` is the restored file's first line (the result without the harness's exit_code line). */
  cat: { command: string; result: string; line: string };
  /** The ledger's rewind request: which snapshot it went back to, and from which step. */
  rewind: { snapshot: number; atStep: number };
  /** The snapshot the rewind goes back to: its number and SHA-256 (`short` is the 8 hex the timeline prints). */
  snapshot: { n: number; hash: string; short: string };
  /**
   * 16a/16b: what the ledger's `timeline.rewound` event says the rewind did. `discarded` are the snapshots it threw away (the timeline greys them), with
   * their real hashes. `restoredHash` is the event's `snapshot_sha256`: the ledger has no separate "restored tree" hash, the event carries the snapshot's
   * own hash and its `verified` block says the restored tree matched it (`matches`), so this is the hash the HashTile's "restored" row shows; it is checked
   * here to be the snapshot's hash, and the scene refuses evidence in which the restore did not match. `files` is the number of files re-hashed.
   */
  rewound: {
    toSnapshot: number;
    atStep: number;
    discarded: { n: number; hash: string; short: string }[];
    restoredHash: string;
    files: number;
  };
  /**
   * 16e: the ledger events of the attack the HashChain shows, in ledger order, picked by what they are (never by position): the write, the snapshot the rewind
   * goes back to, the wipe (`delete`: the block that stays vermilion), the rewind request, the fresh sandbox, the verified rewind, and the cat.
   */
  chain: { role: ChainRole; event: LedgerEvent }[];
  /** 16e: the real verification ("intact - N events - head 8 hex"): what the attack's `verify` payload says about its whole ledger. */
  seal: { verified: boolean; events: number; head: string; short: string };
  /** 16f: the proof beat's numerals, from the AttackResult: files re-hashed, checks passed (of `total`), the run's duration in seconds. */
  outcome: { files: number; checksPassed: number; checksTotal: number; seconds: number; verdict: string };
}

export type ChainRole = "write" | "snapshot" | "delete" | "rewind" | "recreated" | "rewound" | "cat";

function fail(what: string): never {
  throw new Error(`S4: ${what}. Re-capture with "npm run evidence" or fix src/data/evidence.json (and src/config/script.ts LAB if the attack changed).`);
}

/** The result's own output line: `exit_code=0\nWIPED_0\n` is "WIPED_0". The exit_code line is the harness's, not the command's. */
function outputToken(result: string | null): string | null {
  if (result === null) return null;
  const lines = result
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^exit_code=/.test(l));
  return lines.length > 0 ? lines[0] : null;
}

/** The command (or path) of a `tool.call` event: its `args` is a JSON string ({"cmd": ...} for run_shell, {"path": ...} for write_file). */
function callText(e: LedgerEvent): string {
  const raw = e.payload.args;
  if (typeof raw !== "string") return "";
  try {
    const a = JSON.parse(raw);
    return typeof a.cmd === "string" ? a.cmd : typeof a.path === "string" ? a.path : "";
  } catch {
    return "";
  }
}

function build(): S4Data {
  const catalog = selectAttackCatalog();
  const index = catalog.findIndex((a) => a.name === LAB.hero);
  if (index < 0) return fail(`evidence.attackCatalog has no "${LAB.hero}" (script LAB.hero)`);
  const info = catalog[index];

  const result = selectAttack(LAB.hero);
  const writeStep = result.steps.find((s) => s.tool === "write_file");
  if (!writeStep) return fail(`${LAB.hero} has no write_file step (the file the agent loses)`);
  if (typeof writeStep.text !== "string" || writeStep.text.length === 0) return fail(`${LAB.hero}: the write_file step has no path`);
  if (typeof writeStep.content !== "string") return fail(`${LAB.hero}: the write_file step has no content`);

  // same test as filmState.ts stepKind(): a shell step that removes with rm -rf is the wipe, one that starts with cat is the read
  const wipeStep = result.steps.find((s) => s.tool === "run_shell" && /\brm\s+-rf?\b|\brm\s+-fr\b/.test(s.text));
  if (!wipeStep) return fail(`${LAB.hero} has no rm -rf step (the wipe)`);
  const token = outputToken(wipeStep.result);
  if (!token) return fail(`${LAB.hero}: the wipe step has no output line (the film shows it huge: "WIPED_0" in the sample)`);
  const catStep = result.steps.find((s) => s.tool === "run_shell" && /^\s*cat\b/.test(s.text));
  if (!catStep) return fail(`${LAB.hero} has no cat step (the read after the rewind)`);

  const events: LedgerEvent[] = selectAttackEvents(LAB.hero);
  const rw = events.find((e) => e.type === "rewind.requested");
  if (!rw) return fail(`the ${LAB.hero} ledger has no rewind.requested event`);
  const n = rw.payload.snapshot;
  const atStep = rw.payload.at_step;
  if (typeof n !== "number" || typeof atStep !== "number") return fail(`rewind.requested (event ${rw.id}) has no snapshot / at_step`);

  const snap = events.find((e) => e.type === "snapshot.created" && e.payload.id === n);
  if (!snap) return fail(`the ${LAB.hero} ledger has no snapshot.created with id ${n} (the snapshot the rewind goes back to)`);
  const sha = snap.payload.sha256;
  if (typeof sha !== "string" || !/^[0-9a-f]{64}$/.test(sha)) return fail(`snapshot.created ${n} (event ${snap.id}) has no 64-hex sha256`);

  // 16a/16b: the verified rewind
  const rewound = events.find((e) => e.type === "timeline.rewound");
  if (!rewound) return fail(`the ${LAB.hero} ledger has no timeline.rewound event`);
  const ver = rewound.payload.verified;
  if (!ver || ver.checked !== true) return fail(`timeline.rewound (event ${rewound.id}) has no verified block that was checked`);
  if (ver.matches !== true || ver.missing !== 0 || ver.unexpected !== 0) {
    return fail(`timeline.rewound (event ${rewound.id}) says the restored tree did NOT match snapshot ${n} (matches=${String(ver.matches)}, missing=${String(ver.missing)}, unexpected=${String(ver.unexpected)}): the film shows "all matched"`);
  }
  if (typeof ver.files !== "number" || ver.files < 1) return fail(`timeline.rewound (event ${rewound.id}) verified no files`);
  if (rewound.payload.to_snapshot !== n) return fail(`timeline.rewound (event ${rewound.id}) went to snapshot ${String(rewound.payload.to_snapshot)}, rewind.requested asked for ${n}`);
  const restored = rewound.payload.snapshot_sha256;
  if (typeof restored !== "string" || !/^[0-9a-f]{64}$/.test(restored)) return fail(`timeline.rewound (event ${rewound.id}) has no 64-hex snapshot_sha256`);
  if (restored !== sha) return fail(`timeline.rewound (event ${rewound.id}) restored ${shortHash(restored)} but snapshot ${n} is ${shortHash(sha)}`);
  const gone = rewound.payload.discarded;
  if (!Array.isArray(gone)) return fail(`timeline.rewound (event ${rewound.id}) has no discarded list`);
  const discarded = gone.map((id: unknown) => {
    const d = events.find((e) => e.type === "snapshot.created" && e.payload.id === id);
    const h = d?.payload.sha256;
    if (typeof id !== "number" || typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) return fail(`the discarded snapshot ${String(id)} has no snapshot.created with a 64-hex sha256`);
    return { n: id, hash: h, short: shortHash(h) };
  });
  // the timeline has 5 slots: snapshot n, the discarded ones, the rewound node
  if (!(discarded.length + 2 <= 5)) return fail(`the rewind discarded ${discarded.length} snapshots: the timeline has 5 slots (the kept snapshot, the discarded ones, the rewound node)`);

  // 16c: the restored file's first line
  const catLine = outputToken(catStep.result);
  if (!catLine) return fail(`${LAB.hero}: the cat step has no output line (the film prints the restored file's first line)`);

  // 16e: the ledger blocks, by what they are
  const pick = (what: string, test: (e: LedgerEvent) => boolean): LedgerEvent => events.find(test) ?? fail(`the ${LAB.hero} ledger has no ${what} (the hash chain shows it)`);
  const isCall = (tool: string, re?: RegExp) => (e: LedgerEvent) => e.type === "tool.call" && e.payload.tool === tool && (re ? re.test(callText(e)) : true);
  const chain: S4Data["chain"] = [
    { role: "write", event: pick("write_file call", isCall("write_file")) },
    { role: "snapshot", event: snap },
    { role: "delete", event: pick("rm -rf call (the wipe)", isCall("run_shell", /\brm\s+-rf?\b|\brm\s+-fr\b/)) },
    { role: "rewind", event: rw },
    { role: "recreated", event: pick("sandbox.recreated event", (e) => e.type === "sandbox.recreated") },
    { role: "rewound", event: rewound },
    { role: "cat", event: pick("cat call", isCall("run_shell", /^\s*cat\b/)) },
  ];
  for (let i = 1; i < chain.length; i++) {
    if (!(chain[i].event.id > chain[i - 1].event.id)) return fail(`the ${LAB.hero} ledger events for the hash chain are not in ledger order (${chain[i - 1].role} ${chain[i - 1].event.id}, ${chain[i].role} ${chain[i].event.id})`);
  }

  // 16e: the seal
  const verify = selectAttackVerify(LAB.hero);
  if (verify.verified !== true) return fail(`${LAB.hero}: the ledger verification did not pass (${verify.detail}): the film shows "intact"`);
  if (typeof verify.head_hash !== "string" || !/^[0-9a-f]{64}$/.test(verify.head_hash)) return fail(`${LAB.hero}: the verify payload has no 64-hex head_hash`);
  if (typeof verify.events !== "number" || verify.events < 1) return fail(`${LAB.hero}: the verify payload has no event count`);

  // 16f: the proof beat's numerals
  if (typeof result.duration_s !== "number" || !(result.duration_s > 0)) return fail(`${LAB.hero}: the result has no duration_s (the proof beat shows the run's seconds)`);

  return {
    hero: { name: LAB.hero, title: info.title, category: info.category, index, count: catalog.length },
    write: { path: writeStep.text, content: writeStep.content },
    wipe: { command: wipeStep.text, result: wipeStep.result ?? "", token },
    cat: { command: catStep.text, result: catStep.result ?? "", line: catLine },
    rewind: { snapshot: n, atStep },
    snapshot: { n, hash: sha, short: shortHash(sha) },
    rewound: { toSnapshot: n, atStep, discarded, restoredHash: restored, files: ver.files },
    chain,
    seal: { verified: true, events: verify.events, head: verify.head_hash, short: shortHash(verify.head_hash) },
    outcome: { files: ver.files, checksPassed: result.counts.pass, checksTotal: result.checks.length, seconds: result.duration_s, verdict: result.verdict },
  };
}

let cached: S4Data | null = null;

/** The S4 data. Built once, on first use; throws (naming what is missing) if the evidence cannot support the scene. */
export function s4Data(): S4Data {
  if (!cached) cached = build();
  return cached;
}
