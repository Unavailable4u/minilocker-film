// Types for the film's data layer. Copied from the product's frontend/src/api.ts (the shapes the backend really returns),
// plus `Evidence`: the single JSON file the whole film reads (BIBLE 7.1).
// Types only: nothing in this file runs.

export type Profile = "strict" | "observe";

export type LedgerEvent = {
  id: number; ts: number; task_id: string; actor: string; type: string;
  payload: Record<string, any>; prev_hash: string; hash: string;
};

export type EndInfo = { status: string; error?: string | null; ledger_verified?: boolean | null; replayed?: boolean };

export type Dimension = { status: string; note?: string; evidence?: number[]; [k: string]: any };

export type Report = {
  task_id: string; task: string | null; outcome: string; summary: string; complete: boolean;
  steps: number; tool_calls: number; note: string;
  ledger: { verified: boolean; detail: string; events: number; head_hash: string | null };
  dimensions: Record<string, Dimension>;
};

export type Verification = { task_id: string; verified: boolean; detail: string; events: number; head_hash: string | null };

export type AttackTry = { tool: string; text: string; content: string | null };

export type AttackInfo = {
  name: string; title: string; category: string; profile: Profile; summary: string; expected: string;
  needs_egress: boolean; needs_browser: boolean; available: boolean; tries: AttackTry[]; checks: string[];
};

export type CheckStatus = "pass" | "fail" | "unproven" | "skip";

export type AttackCheck = { label: string; status: CheckStatus; detail: string; scope: "attack" | "always" };

export type AttackStep = {
  index: number; tool: string; text: string; content: string | null; result: string | null;
  policy: { action: string; risk: string; reasons: string[]; profile: string } | null;
  approval: string | null; recreated: boolean;
  egress: { decision: string; host: string | null; reason: string | null }[];
};

export type Verdict = "contained" | "breached" | "inconclusive" | "error" | "unavailable";

export type AttackResult = {
  name: string; title: string; verdict: Verdict; task_id: string | null; duration_s: number;
  error: string | null; checks: AttackCheck[]; steps: AttackStep[];
  counts: Record<CheckStatus, number>;
};

export type ScenarioInfo = {
  id: string; title: string; task: string; needs_browser: boolean; allow: string[]; missing_hosts: string[]; available: boolean;
};

export type InfraStatus = {
  collected_at: number;
  host: { hostname: string; os: string; cpus: number | null; load: number[] | null; memory_total_bytes: number | null;
    memory_available_bytes: number | null; disk_total_bytes: number; disk_free_bytes: number; uptime_s: number | null };
  docker: { available: boolean; reason?: string; version?: string; storage_driver?: string; cgroup_version?: string;
    runtimes?: string[]; containers_running?: number;
    sandboxes: { name: string; role: string; status: string; age_s: number | null }[] };
  egress: { attached: boolean; allowed_hosts?: string[]; brokered_services?: string[]; proxy?: string };
  inference: { configured: boolean; host: string | null; model: string | null; key_set: boolean; tool_mode: string; vultr: boolean };
  storage: { attached: boolean; error: string | null; endpoint_host: string | null; bucket: string | null; vultr: boolean };
  vultr: { available: boolean; reason?: string; hostname?: string; region?: string; plan?: string; instance_id?: string;
    public_ipv4?: string };
};

// ---------------------------------------------------------------------------------------------------------------------
// Evidence (BIBLE 7.1)
// ---------------------------------------------------------------------------------------------------------------------

export type EvidenceMeta = {
  /** true = made-up SAMPLE data. The render script refuses it. */
  sample: boolean;
  /** ISO timestamp of the capture (SAMPLE: a fixed made-up one). */
  capturedAt: string;
  /** sha of the MiniLocker repo the numbers come from, or null when unknown. */
  commit: string | null;
  /** the deployment that was captured, e.g. https://demo.example. Empty for the SAMPLE. */
  baseUrl: string;
  /** SAMPLE: "SAMPLE - NOT REAL, DO NOT RENDER FOR SUBMISSION". Real capture: free text, may be empty. */
  note: string;
  /** the model /api/infra reported at capture time (null when unknown). */
  model?: string | null;
  /** how many long tool outputs the capture trimmed to 600 characters (those events' hashes no longer match; `verify` is the server's own). */
  trimmedToolOutputs?: number;
};

export type TaskEnd = { status: string; error?: string | null; ledger_verified?: boolean | null };

export type EvidenceTask = {
  id: string;
  scenario: string;
  events: LedgerEvent[];
  report: Report;
  verify: Verification;
  end: TaskEnd;
};

/** One attempt at the fix_repo_v2 task. Only a summary: the full ledger is kept for the chosen take (`task`). */
export type EvidenceTake = {
  id: string;
  status: string;
  hiddenCheckPassed: boolean | null;
  canaryReads: number;
  events: number;
  /** true for the take that became `task` */
  kept: boolean;
};

export type EvidenceAttack = {
  result: AttackResult;
  events: LedgerEvent[];
  report: Report;
  verify: Verification;
};

export type AttackSummary = {
  total: number;
  contained: number;
  inconclusive: number;
  breached: number;
  error: number;
  unavailable: number;
};

export type PassRate = { passes: number | null; runs: number | null; ciLow: number | null; ciHigh: number | null };
export type Measured = {
  fixRepoV2: PassRate & { mostMissedBug: string | null };
  research: PassRate;
  hookEscaped: { escaped: number | null; runs: number | null };
  realSecrets: { runsWithReal: number | null; runs: number | null };
  /**
   * The model bake-off (product repo docs/notes/model-selection.md, native-mode row of the chosen model).
   * `models` (how many models were compared), `usablePct` (0..100) and `p50Seconds` are OPTIONAL: evidence files captured before patch 26 lack them.
   * Callers treat undefined exactly like null ("not measured": the film shows nothing for it).
   */
  bakeoff: { model: string | null; models?: number | null; usablePct?: number | null; p50Seconds?: number | null };
};

export type EvidenceCi = { conclusion: string | null; url: string | null; sha: string | null };

export type S3Source = "task" | "attack:malicious_repo_hook";

export type Evidence = {
  meta: EvidenceMeta;
  infra: InfraStatus;
  scenarios: ScenarioInfo[];
  task: EvidenceTask;
  takes?: EvidenceTake[];
  s3Source: S3Source;
  /** keyed by attack name; the 5 core attacks at least (Appendix D) */
  attacks: Record<string, EvidenceAttack>;
  /** The `attacks` array of GET /api/attacks: title, summary, category, expected, tries and check labels of all 15 attacks, in lab order. */
  attackCatalog: AttackInfo[];
  attackSummary: AttackSummary;
  measured: Measured;
  ci: EvidenceCi;
};
