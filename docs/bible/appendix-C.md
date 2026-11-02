## Appendix C. Ledger event to on-screen line (from `derive.ts` `describe()`)

| Event type | Tone | Line |
|---|---|---|
| egress.blocked | bad | Egress blocked -> {host} ({reason}) |
| egress.allowed | ok | Egress allowed -> {host} |
| policy.decision (deny/ask) | bad/warn | Policy {action} ({risk}): {cmd} |
| injection.suspected | bad | Possible prompt injection on page {seq} (score {n}): {findings} |
| approval.requested / granted / denied | warn / ok / bad | Approval requested: {summary} / Approval granted / Approval denied or timed out |
| sandbox.created / destroyed | info | Sandbox created/destroyed {name} |
| canary.read | warn | Decoy read: {label} |
| canary.tripped | bad | Decoy used ({via}): {label} |
| canary.copied | warn | Decoy copied out: {label} |
| timeline.rewound | ok/bad | Rewound to snapshot {n} - restored files match the snapshot |
| scenario.check | ok/bad | Hidden check passed / failed |
| task.end | ok/warn | Task {status} |
