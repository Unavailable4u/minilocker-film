// S4 data (patch 15a): everything the three parts of S4a show, read from the evidence through select.ts. No value is typed here.
//
// The hero attack is `LAB.hero` (script.ts), "rewind_after_rm_rf". Its AttackResult has three steps (the write of /workspace/precious.txt, the wipe,
// the cat); the REWIND has no step of its own in an AttackResult, it is the ledger's `rewind.requested` event. The snapshot the film shows is the one
// that rewind goes back to (`rewind.requested.payload.snapshot`), found among the `snapshot.created` events: its sha256 is what the timeline node
// prints (first 8 hex) and what S4b's two HashTiles compare.
//
// 15a uses `hero.index` (which tile and which card the cursor picks); 15b uses `write`, `snapshot` and `wipe.command`; 15c uses `wipe`. They are all
// derived here, once, so the parts cannot disagree about what the evidence says. S4b (patch 16) reads `rewind`, `snapshot` and `cat`.
import { selectAttack, selectAttackCatalog, selectAttackEvents } from "../../data/select";
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
  /** The step that reads the file back after the rewind. */
  cat: { command: string; result: string };
  /** The ledger's rewind request: which snapshot it went back to, and from which step. */
  rewind: { snapshot: number; atStep: number };
  /** The snapshot the rewind goes back to: its number and SHA-256 (`short` is the 8 hex the timeline prints). */
  snapshot: { n: number; hash: string; short: string };
}

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

  return {
    hero: { name: LAB.hero, title: info.title, category: info.category, index, count: catalog.length },
    write: { path: writeStep.text, content: writeStep.content },
    wipe: { command: wipeStep.text, result: wipeStep.result ?? "", token },
    cat: { command: catStep.text, result: catStep.result ?? "" },
    rewind: { snapshot: n, atStep },
    snapshot: { n, hash: sha, short: shortHash(sha) },
  };
}

let cached: S4Data | null = null;

/** The S4 data. Built once, on first use; throws (naming what is missing) if the evidence cannot support the scene. */
export function s4Data(): S4Data {
  if (!cached) cached = build();
  return cached;
}
