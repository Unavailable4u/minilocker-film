## BIBLE 7. Evidence: shape, capture runbook, proof clip

**7.1 `src/data/evidence.json` shape**

```
{
  "meta":   { "sample": false, "capturedAt": "<ISO>", "commit": "<draft repo sha>", "baseUrl": "https://<your domain>", "note": "" },
  "infra":  <GET /api/infra>,                         // host, docker, egress.allowed_hosts, inference {host, model}, storage, vultr {region, plan, hostname}
  "scenarios": [ <GET /api/scenarios entry for fix_repo_v2: id, title, task> ],
  "task":   { "id": "...", "scenario": "fix_repo_v2",
              "events": [ <ledger events: id, ts, actor, type, payload, prev_hash, hash> ],
              "report": <GET /api/tasks/{id}/report>,
              "verify": <GET /api/ledger/verify/{id}>,
              "end": { "status": "...", "ledger_verified": true } },
  "s3Source": "task" | "attack:malicious_repo_hook",
  "attacks": { "<attack name>": { "result": <POST /api/attacks/{name}/run response (AttackResult)>,
                                  "events": [...], "report": {...}, "verify": {...} } },   // at least the 5 core attacks
  "attackSummary": { "total": 15, "contained": N, "inconclusive": N, "breached": N, "error": N, "unavailable": N },
  "measured": { "fixRepoV2": {"passes":N,"runs":10,"ciLow":..,"ciHigh":..,"mostMissedBug":".."},
                "research":  {"passes":N,"runs":10,"ciLow":..,"ciHigh":..},
                "hookEscaped": {"escaped":N,"runs":10}, "realSecrets": {"runsWithReal":N,"runs":N},
                "bakeoff": {"model":".."} },
  "ci":     { "conclusion": "success" | null, "url": "...", "sha": "..." }
}
```

**7.2 Capture runbook (do this once, on frozen code)**
1. Code frozen in `draft` (`main`), CI green on that exact commit, the stack up on the real domain with HTTPS, `deploy/dry_run.sh` passed, the Infra screen shows Vultr VM, Vultr Serverless Inference and Vultr Object Storage.
2. Pre-warm: run `fix_repo_v2` once in the UI so images are pulled and the model is warm.
3. In `draft/backend` on the VM, run the measured claims (from `docs/SUBMISSION.md`): `python -m minilocker.scenarios --scenario fix_repo_v2 --runs 10` and `--scenario research --runs 10`, `pytest -m attacks`; copy the numbers into `evidence/measured.json` by hand (pass counts, 95% interval, which bug models missed, how many `hook_escaped`, how many runs had a real secret, the model name the bake-off chose). If a number is bad, the film shows the bad number. Do not rerun until it looks nicer.
4. On the film machine, PowerShell: `$env:MINILOCKER_TOKEN="<token>"; npm run evidence -- --base https://<domain> --repo ..\draft --attacks all --takes 3`. It takes several minutes (one attack at a time; it retries on 429). Never commit the token.
5. `npm run evidence:check`, fix anything it prints, then `npm run evidence:final-check`. The validator ALSO refuses a file that contains anything shaped like a private key block, an AWS key id (AKIA...), a token prefix (sk-, ghp_) or your API token.
6. Record the proof clip (7.5), `npm run proof`.

**7.3 Selection rules and fallbacks**
- S3 data: the first `fix_repo_v2` take where the hidden check passed AND at least one decoy was read. If no take reads a decoy (the agent removed the poisoned import before running the tests: a legitimate fix), S3 uses the `malicious_repo_hook` attack result and the overlay says so.
- S5 data: the `hostile_page_injection` attack result. If it is not "contained", fix the product first; the film is not made around a failure.
- If `rewind_after_rm_rf` is not "contained", STOP: the film's hero cannot be made. Fix it in `draft`, freeze, recapture.
- A "not measured" dimension is shown as such. An "inconclusive" verdict is shown as amber, not blue.

**7.4 Clock.** `LedgerClock` maps ledger timestamps to frames per segment (BIBLE 6 S2 windows). Bursts get at least 6 frames between events; key events (tests fail, tests pass, hidden check, sandbox destroyed) get holds of 15-30 frames so the viewer can read them.

**7.5 The proof clip (the only recording)**
- Browser: clean profile, 1920x1080, zoom 125%, dark theme (midnight), API token pasted, bookmarks hidden, address bar visible with your HTTPS domain (that is part of the proof).
- OBS or the Windows game bar: 1920x1080, 30 fps, large visible mouse cursor, no notifications, no audio.
- Choreography: Attack Lab, select `rewind_after_rm_rf`, click Run, let it finish and show the green checks. Record about 20 s, then trim to the 10-14 s that cover the click to the verdict.
- Trim and keep only a cut, no speed change: `ffmpeg -i raw.mp4 -ss 3 -t 12 -an -c:v libx264 -crf 16 -pix_fmt yuv420p public\proof\rewind.mp4`. If you do speed it up, edit the badge text in copy.ts to say so ("LIVE - sped up 2x"); "unedited" must stay true.
- `npm run proof` prints resolution, fps and duration, and writes the manifest the scene reads.
