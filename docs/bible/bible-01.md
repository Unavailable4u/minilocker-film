## BIBLE 1. Vultr brief to film coverage map

**1.1 Page requirement to scene**

| Vultr page | Where the film answers it |
|---|---|
| Challenge 1 "Blast Radius Zero": a web-based agent that performs real work, with every action contained in a sandbox on Vultr | S2 (real work), S3-S5 (containment), S8 (on Vultr) |
| "One containment moment shown in the video" | THREE: S3 decoys + egress (f1500-2099), S4 wipe-then-rewind (f2100-3299, the hero), S5 hostile page (f3300-3719) |
| Pattern A: user asks, model writes code, code runs in a container, real output returns, errors fed back | S2, with the label "Pattern A - sandboxed code execution" and the 4-node strip using Vultr's own words |
| Pattern B: browser in a container, screenshots, model verifies, human approval before final actions | S5, label "Pattern B - sandboxed browser use"; approval beat if the evidence has it. Claim vision verification ONLY if the research scenario really used a vision model |
| Containment focus: process isolation | S3 ContainerBox chips (non-root, read-only root, no capabilities, 128 processes, no route out) |
| Containment focus: secret hygiene | S3 decoys, "real secrets in sandbox: 0" audit stamp |
| Containment focus: resource limits | S3 chips (128 processes, 512 MB no swap) and the Compute gauge "peak of 512 MiB" in S2 |
| Containment focus: lifecycle discipline (reset or destroy after every task) | S2 "audited as it is destroyed", S4 "fresh sandbox" on rewind |
| "In your public README explain the Vultr services and infrastructure used" and "Document your backend and deployment architecture" | S8 animated architecture (the README carries the written version) |
| "Explain the agent's use case and how it executes real tasks" | S2 (task, steps, hidden check) and S7 (who needs it) |
| Public demo URL, GitHub repo, recorded demo video | S9 shows the demo host and repo |
| Serverless Inference required for Challenge 1 agent LLM calls | S2 chip on every model step, S8 node with the real host and model |

**1.2 Judging criteria to proof the judge sees**

| Criterion (page wording) | What the judge must see | Scenes |
|---|---|---|
| Application of Technology: how effectively the chosen model(s) are integrated | Real tool-calling task finishing, on Vultr Serverless Inference, with a check the model never sees; real ledger and gauges; the clip of the live run | S2, S4b, S8 |
| Presentation: clarity and effectiveness | Problem in 10 s, promise in 10 s, the hero moment at 1:10, evidence, value, Vultr, close, all in 2:50, captions that work muted, one competitive slide | all, S7 |
| Business Value: impact and practical value | The reviewer's question, the Blast Radius report as the audit artifact, recovery, measured pass rates | S6, S7 |
| Originality: uniqueness | Decoys that trip alarms, rewind with SHA-256 re-hash, measured-not-asserted dimensions with an honest "not measured", an attack suite anyone can run (15/15), honest limits | S3, S4, S6, S8 |

**1.3 Do not (from the repo's own demo rules)**
- Never "provably safe", "zero risk", "secure". Say "measured blast radius".
- Never claim the ephemeral per-task Vultr instance tier, a Vultr firewall, or GPUs (Vultr GPUs are not available at this event).
- Never show a number you cannot open in a report.
- The film names only these Vultr products: Vultr VM, Vultr Serverless Inference, Vultr Object Storage, and the instance metadata the Infra screen reads.
