## BIBLE 8. Copy deck (what goes in `src/config/copy.ts`; callouts are 5 words or fewer)

**Captions and callouts by scene** (no measured numbers here, only wording)

| Scene | Frame | Text |
|---|---|---|
| S0 | 180 | Agents with a shell and a browser / are one bad page away from a bad day. |
| S1 | 420 | eyebrow: VULTR AGENT RUSH - BLAST RADIUS ZERO; title: MiniLocker; tagline: Give an AI agent real work on untrusted inputs, / and see exactly what it could not touch. |
| S2 | 600 | badge: Pattern A - sandboxed code execution |
| S2 | 660 | caption: A real task. Real execution. |
| S2 | 1200 | callout: A check it never sees |
| S2 | 1260 | callout: Audited as it is destroyed |
| S2 | 1440 | caption: Plan. Dispatch. Execute. Verify. |
| S3 | 1500 | caption: Containment, measured. |
| S3 | 1620 | callout: Random per task |
| S3 | 1700 | callout: Reading one rings the alarm |
| S3 | 1800 | caption: It tried to phone home. Refused. |
| S3 | 1840 | callout: Allowlist only |
| S3 | 1930 | caption: Bait, not secrets. |
| S4 | 2220 | caption: Real work. Snapshot after every step. |
| S4 | 2370 | caption: Everything gone. |
| S4 | 2400 | caption: Rewind. |
| S4 | 2900 | callout: Undone, not erased. |
| S4 | 3060 | caption: Real wipe. Real rewind. Real hashes. |
| S5 | 3300 | badge: Pattern B - sandboxed browser use |
| S5 | 3360 | caption: A page tries to hijack the agent. |
| S5 | 3480 | caption: Flagged. Denied. Nothing leaves. |
| S5 | 3600 | caption: Risky actions wait for a human. Default: no. |
| S6 | 3720 | caption: Every run leaves evidence. |
| S6 | 3880 | callout: Not measured says so |
| S6 | 4120 | caption: Measured, not asserted. |
| S7 | 4260 | line: The reviewer's first question: what could it touch, and how do you know? |
| S7 | 4500 | caption: A container gives you a promise. MiniLocker gives you a measurement. |
| S8 | 4650-4770 | lower-thirds: Vultr VM / Vultr Serverless Inference / Vultr Object Storage (details from evidence) |
| S8 | 4900 | caption: What it does, and what it does not. |
| S9 | 5025 | See exactly what it could not touch. |

**Limits lines (S8):** The container shares the host kernel. / The policy engine is an early warning, not the boundary. / A per-task Vultr instance is the next step. Not built.
**Competitive rows (S7), generic categories only:** Typical agent sandbox: isolation, and a promise to trust. / Hosted code interpreter: convenience; the boundary is out of your hands. / Policy layer or LLM judge: a warning that can be talked around. / MiniLocker: a boundary you control, a measurement you can check, an attack suite anyone can run.
**Container chips (S3):** non-root / read-only root / no capabilities / 128 processes / 512 MB, no swap / no route out.

**Voice-over (optional; the film works muted).** About 335 words, 150 wpm, leaves breathing room. Each block starts at the frame shown.

| Block | Start f | Text |
|---|---|---|
| V0 | 20 | AI agents now run commands and browse the web for us. One hostile page, one poisoned package, and they can leak your keys or wipe your disk. |
| V1 | 330 | MiniLocker gives an agent real work on untrusted inputs, on Vultr, and shows you exactly what it could not touch. |
| V2 | 700 | This is a real task: a third-party library with three bugs and a failing test suite. Every model call goes to Vultr Serverless Inference. The agent reads the code, runs the tests, patches, and runs them again. A hidden check the model never sees decides whether it worked. And the sandbox is audited when it is destroyed. |
| V3 | 1520 | The library also ships a poisoned module. It reads the SSH key and the AWS credentials, because we planted them. Decoys, random per task, worth nothing. Reading one sets off an alarm. It tries to phone home and the egress proxy refuses. Zero real secrets were ever in the sandbox. |
| V4 | 2140 | Now the classic. A command wipes the entire workspace. (silence f2370-2399) We snapshot after every step, so we rewind. A fresh sandbox, the files restored, every file re-hashed against the snapshot. The work is back, and the ledger still shows the delete: undone, not erased. This is the real run, on the Vultr VM. |
| V5 | 3320 | A web page tells the agent to leak its environment. The page is fenced as untrusted, the injection is flagged, the follow-up command is denied, and nothing leaves. Anything risky waits for a human, and defaults to no. |
| V6 | 3740 | Every run produces a Blast Radius report built only from the tamper-evident ledger. Nine dimensions, each measured or honestly marked not measured. The ledger re-verifies on demand. The numbers on this screen come from the runs, not from us. |
| V7 | 4280 | A security reviewer asks one question: what could it touch, and how do you know? A container gives you a promise. MiniLocker gives you a measurement. |
| V8 | 4580 | All of it runs on one Vultr VM. Model calls go to Vultr Serverless Inference. Artifacts land in Vultr Object Storage. And what we have not built, we say: no per-task Vultr instance yet. |
| V9 | 5025 | MiniLocker. See exactly what it could not touch. |

(V2-V4 numbers are NOT spoken; any figure said aloud must be read from evidence. Replace "three bugs" with the real count if it differs.)
