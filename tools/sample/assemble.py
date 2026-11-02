#!/usr/bin/env python3
"""THROWAWAY (not part of the film): stage 2 of the SAMPLE evidence builder.

Stage 1 (gen-sample.mjs) writes tools/sample/stage1.json: the made-up ledgers and attack results.
Stage 2 (this file) adds the report and the chain verification for each ledger with the product's OWN code
(minilocker.ledger.report.build_report and minilocker.ledger.chain.verify_events), so the hash chain and the report in the
sample are cross-checked against the backend. It then adds the made-up infra, scenario, summary, measured numbers and CI,
and writes src/data/evidence.json.

Every number in the output is made up and the file says so (meta.sample = true). Fully deterministic: no clock, no random.

    node tools/sample/gen-sample.mjs
    python tools/sample/assemble.py --repo ../draft
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

CORE = ["rewind_after_rm_rf", "hostile_page_injection", "credential_theft_exfil", "malicious_repo_hook", "exfil_unknown_domain"]


def fake_sha(label: str) -> str:
    return hashlib.sha256(("sample:" + label).encode()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=str(ROOT.parent / "draft"), help="path to a clone of the draft (product) repo")
    ap.add_argument("--stage1", default=str(HERE / "stage1.json"))
    ap.add_argument("--out", default=str(ROOT / "src" / "data" / "evidence.json"))
    args = ap.parse_args()

    backend = Path(args.repo) / "backend"
    if not (backend / "minilocker" / "ledger" / "report.py").exists():
        print(f"cannot find {backend}/minilocker/ledger/report.py: pass --repo <path to the draft clone>", file=sys.stderr)
        return 1
    sys.path.insert(0, str(backend))
    from minilocker.ledger.chain import verify_events  # noqa: E402
    from minilocker.ledger.report import build_report  # noqa: E402

    s1 = json.loads(Path(args.stage1).read_text(encoding="utf-8"))
    base = s1["base"]

    def verify(task_id, events):
        ok, detail = verify_events(events)
        return {"task_id": task_id, "verified": ok, "detail": detail, "events": len(events),
                "head_hash": events[-1]["hash"] if events else None}

    def report(task_id, events):
        return build_report(task_id, events, None)

    # ---- the kept take -----------------------------------------------------------------------------------------------
    tid = s1["taskId"]
    tev = s1["taskEvents"]
    tver = verify(tid, tev)
    if not tver["verified"]:
        print("SAMPLE task ledger does not verify against the backend:", tver["detail"], file=sys.stderr)
        return 1
    task = {
        "id": tid,
        "scenario": "fix_repo_v2",
        "events": tev,
        "report": report(tid, tev),
        "verify": tver,
        "end": {"status": "finished", "ledger_verified": True},
    }
    canary_reads = sum(1 for e in tev if e["type"] == "canary.read")
    takes = [{"id": tid, "status": "finished", "hiddenCheckPassed": True, "canaryReads": canary_reads,
              "events": len(tev), "kept": True}]

    # ---- the five core attacks -----------------------------------------------------------------------------------------
    attacks = {}
    for name in CORE:
        a = s1["attacks"][name]
        res = a["result"]
        ver = verify(res["task_id"], a["events"])
        if not ver["verified"]:
            print(f"SAMPLE ledger of attack {name} does not verify against the backend:", ver["detail"], file=sys.stderr)
            return 1
        attacks[name] = {"result": res, "events": a["events"], "report": report(res["task_id"], a["events"]), "verify": ver}

    model = "Qwen2.5-Coder-32B-Instruct"  # made up for the SAMPLE
    infra = {
        "collected_at": base + 60,
        "host": {"hostname": "minilocker-sample", "os": "Linux-6.8-x86_64", "cpus": 4, "load": [0.42, 0.37, 0.31],
                 "memory_total_bytes": 8_315_387_904, "memory_available_bytes": 5_902_639_104,
                 "disk_total_bytes": 164_000_000_000, "disk_free_bytes": 131_200_000_000, "uptime_s": 931_200},
        "docker": {"available": True, "version": "27.3.1", "storage_driver": "overlay2", "cgroup_version": "2",
                   "runtimes": ["runc"], "containers_running": 2,
                   "sandboxes": [{"name": "minilocker-code-5c1e90ab", "role": "code", "status": "running", "age_s": 18}]},
        "egress": {"attached": True, "allowed_hosts": ["pypi.org", "files.pythonhosted.org", "api.vultrinference.com"],
                   "brokered_services": [], "proxy": "minilocker-egress:3128"},
        "inference": {"configured": True, "host": "api.vultrinference.com", "model": model, "key_set": True,
                      "tool_mode": "native", "vultr": True},
        "storage": {"attached": True, "error": None, "endpoint_host": "sample.vultrobjects.com",
                    "bucket": "minilocker-sample", "vultr": True},
        "vultr": {"available": True, "hostname": "minilocker-sample", "region": "fra", "plan": "vc2-4c-8gb",
                  "instance_id": "00000000-0000-4000-8000-000000000000", "public_ipv4": "203.0.113.10"},
    }
    scenarios = [{
        "id": "fix_repo_v2", "title": "Fix a failing pricing library", "task": s1["taskText"], "needs_browser": False,
        "allow": ["pypi.org"], "missing_hosts": [], "available": True,
    }]

    contained = sum(1 for k in attacks.values() if k["result"]["verdict"] == "contained")
    # The other 10 attacks of the lab are not in the sample as full data; the SAMPLE counts all 15 as contained.
    summary = {"total": 15, "contained": 15, "inconclusive": 0, "breached": 0, "error": 0, "unavailable": 0}
    if contained != len(CORE):
        summary["contained"] = 10 + contained
        summary["inconclusive"] = len(CORE) - contained

    evidence = {
        "meta": {"sample": True, "capturedAt": "2026-11-03T08:40:00Z", "commit": fake_sha("draft-commit")[:40],
                 "baseUrl": "", "note": "SAMPLE - NOT REAL, DO NOT RENDER FOR SUBMISSION", "model": model},
        "infra": infra,
        "scenarios": scenarios,
        "task": task,
        "takes": takes,
        "s3Source": "task",
        "attacks": attacks,
        "attackSummary": summary,
        "measured": {
            "fixRepoV2": {"passes": 9, "runs": 10, "ciLow": 0.596, "ciHigh": 0.982, "mostMissedBug": "tax_rounding"},
            "research": {"passes": 8, "runs": 10, "ciLow": 0.49, "ciHigh": 0.943},
            "hookEscaped": {"escaped": 0, "runs": 10},
            "realSecrets": {"runsWithReal": 0, "runs": 20},
            "bakeoff": {"model": model},
        },
        "ci": {"conclusion": "success", "url": "https://github.com/Unavailable4u/draft/actions/runs/0",
               "sha": fake_sha("draft-commit")[:40]},
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # compact separators keep the file small; ensure_ascii keeps it byte-stable across machines
    text = json.dumps(evidence, separators=(",", ":"), ensure_ascii=True, sort_keys=False)
    out.write_text(text + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(text) / 1024:.1f} KB): task {len(tev)} events, attacks "
          + ", ".join(f"{k}={len(v['events'])}" for k, v in attacks.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
