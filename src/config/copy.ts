// MiniLocker film: ALL static on-screen wording (BIBLE 8), in one place. Edit text here.
//
// RULES
// - No measured value belongs in this file (evidence rule): no pass rates, counts, hashes, hosts, model names.
//   Those come from src/data/evidence.json through src/data/select.ts.
// - Allowed here: wording with no measured content, the repo URL, "MIT licensed".
// - No exclamation marks, no hype words, never "provably safe", "zero risk", "secure".
// - When to show each item: see CUES in timeline.ts (same keys).

export const urls = {
  /** Public repository shown in S9. */
  repo: "https://github.com/Unavailable4u/draft",
  /**
   * Public demo URL shown in S9 (the Vultr domain). Set this before the final render.
   * Left empty on purpose: it must be the real address, never a guess.
   */
  demo: "",
} as const;

export const brand = {
  product: "MiniLocker",
  hackathon: "Vultr: Agent Rush Hackathon",
  challenge: "Blast Radius Zero",
  license: "MIT licensed",
  builtOn: "Built on Vultr",
} as const;

/** Badge texts, used with the Badge component (pill with a pulsing dot). */
export const badges = {
  patternA: "Pattern A - sandboxed code execution",
  patternB: "Pattern B - sandboxed browser use",
  proofLive: "LIVE",
  proofReconstructed: "RECONSTRUCTED FROM LEDGER",
} as const;

export const s0 = {
  caption: ["Agents with a shell and a browser", "are one bad page away from a bad day."],
} as const;

export const s1 = {
  eyebrow: "VULTR AGENT RUSH - BLAST RADIUS ZERO",
  title: "MiniLocker",
  tagline: ["Give an AI agent real work on untrusted inputs,", "and see exactly what it could not touch."],
} as const;

export const s2 = {
  badge: badges.patternA,
  caption: "A real task. Real execution.",
  calloutCheck: "A check it never sees",
  calloutAudit: "Audited as it is destroyed",
  captionSteps: "Plan. Dispatch. Execute. Verify.",
} as const;

export const s3 = {
  caption: "Containment, measured.",
  calloutRandom: "Random per task",
  calloutAlarm: "Reading one rings the alarm",
  captionPhoneHome: "It tried to phone home. Refused.",
  calloutAllowlist: "Allowlist only",
  captionBait: "Bait, not secrets.",
  /**
   * Container chips (README hardening facts). 128 and 512 are product limits, not run measurements;
   * if /api/infra exposes the live limits, patch 14 should prefer those.
   */
  chips: ["non-root", "read-only root", "no capabilities", "128 processes", "512 MB, no swap", "no route out"],
} as const;

export const s4 = {
  captionWorks: "The agent works. Snapshot after every step.",
  captionGone: "Everything gone.",
  captionRewind: "Rewind.",
  calloutUndone: "Undone, not erased.",
  captionReal: "Real wipe. Real rewind. Real hashes.",
} as const;

export const s5 = {
  badge: badges.patternB,
  captionHijack: "A page tries to hijack the agent.",
  captionFlagged: "Flagged. Denied. Nothing leaves.",
  captionHuman: "Risky actions wait for a human. Default: no.",
} as const;

export const s6 = {
  caption: "Every run leaves evidence.",
  calloutNotMeasured: "Not measured says so",
  captionMeasured: "Measured, not asserted.",
} as const;

export const s7 = {
  line: "The reviewer's first question: what could it touch, and how do you know?",
  caption: "A container gives you a promise. MiniLocker gives you a measurement.",
  /** Generic categories only. No competitor product names. */
  rows: [
    { label: "Typical agent sandbox", text: "Isolation, and a promise to trust." },
    { label: "Hosted code interpreter", text: "Convenience; the boundary is out of your hands." },
    { label: "Policy layer or LLM judge", text: "A warning that can be talked around." },
    { label: "MiniLocker", text: "A boundary you control, a measurement you can check, an attack suite anyone can run." },
  ],
} as const;

export const s8 = {
  /** Product names only. Details (host, model, region, plan) come from evidence. */
  lowerThirds: ["Vultr VM", "Vultr Serverless Inference", "Vultr Object Storage"],
  caption: "What it does, and what it does not.",
  limits: [
    "The container shares the host kernel.",
    "The policy engine is an early warning, not the boundary.",
    "A per-task Vultr instance is the next step. Not built.",
  ],
} as const;

export const s9 = {
  line: "See exactly what it could not touch.",
} as const;

/** All groups in one object, for code that walks the whole deck (for example captions.srt). */
export const copy = { urls, brand, badges, s0, s1, s2, s3, s4, s5, s6, s7, s8, s9 } as const;

export type Copy = typeof copy;
