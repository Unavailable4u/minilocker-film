# Real repository facts (read this before any patch)

The film was planned against an early copy of the product (`Unavailable4u/draft`). The product that is deployed and
submitted is **https://github.com/shaikh-dotcom/MiniLocker** (`main`). Every plan, script and prompt in this repo now
points there. This note lists what is true about it, so no scene claims anything else.

## Identity

| Thing | Value |
|---|---|
| Product repository | https://github.com/shaikh-dotcom/MiniLocker |
| Live site | https://minilocker.duckdns.org (a DuckDNS name that points at the Vultr VM; not a Vultr domain) |
| Licence | MIT (`LICENSE` in the product repo) |
| Frontend | Byte-identical to the early copy except the lockfile, so every ported UI component stays valid |
| Attack Lab | The same 15 scripted attacks; 15 of 15 contained on the VM |

## What changed in the product after the early copy

- **Model:** `mimo-v2.6-pro`, tool mode `native`. Fallback `qwen3.8-27b`. The bake-off is in the product repo at
  `docs/notes/model-selection.md` (4 models x 2 modes x 6 probes x 5 runs).
  mimo-v2.6-pro, native: 100% usable, 100% clean, p50 0.89 s, p95 1.44 s.
- **Object Storage is now real Vultr Object Storage** (`ewr1.vultrobjects.com`, bucket `minilocker-data`). The compose
  file reads `MINILOCKER_S3_ENDPOINT` from `.env`. Evidence captured before that change shows `storage.vultr: false`
  and S8 refuses to draw the chip: re-capture `infra` if that is your case.
- **Docker panel works:** the socket proxy now allows `INFO`, so the Infra screen's Docker card is populated.
- **Secrets audit:** the public `GPG_KEY` variable that the official Python images set is ignored, so "real secrets in
  sandbox: 0" is a measurement, not a false positive.
- **Vultr plan is empty.** The VM's metadata service does not return a plan, so the real Infra screen shows a dash.
  The film shows the region and hostname only. The validator warns instead of failing, and S8 and the dev sheet no
  longer require a plan.

## What the Attack Lab is (wording rule)

The 15 attacks are **scripted: no model is in the loop**. They drive the real agent loop, policy engine and Docker
sandbox, and the verdict is checked against what Docker reports. So:

- Say "a command", "a script", "a page", "the attack". Do not say the agent chose to delete its workspace.
- S2 (the `fix_repo_v2` task) is the only scene where the model works. Its inference chip names the model from the evidence.
- Nothing needs an on-screen "scripted" flag. The wording is simply accurate.

## What exists, and what must never appear on screen

Exists and may be shown: Vultr VM (region EWR), Vultr Serverless Inference, Vultr Object Storage (S3, EWR), the
instance metadata read by the Infra screen, the hash-chained ledger, snapshots and rewind, decoys, the egress proxy,
the injection scanner, approvals that default to a denial after 60 s, the nine-dimension Blast Radius report.

Does **not** exist, never show or imply it: a per-task (ephemeral) Vultr instance, a Vultr firewall group, vision-model
verification of screenshots, approve-before-submit for browser forms, gVisor or Kata, "provably safe", "zero risk",
"secure", "unhackable".

## Marketing voice (applies to every caption and voice-over line)

Short, confident, concrete, true. State what the product does, never what it might do. Numbers appear only when they
come from `src/data/evidence.json`. No hedging words ("sample", "reconstructed", "not measured") unless the product
itself shows that state on screen, as the Report does for an unused dimension.
