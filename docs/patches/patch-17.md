### PATCH 17 - S5 Hostile page (f3300-3719), Pattern B

**Needs:** 11, 12
**Paste existing:** `docs/PATCH_NOTES.md`, `src/scenes/S5Page.tsx` (stub), `src/config/script.ts`, `src/config/filmState.ts`, `src/config/camera.ts`, `src/config/focus.ts`, `src/config/copy.ts`, `src/ui/primitives.tsx`, `src/fx/Callout.tsx`, `src/fx/Badge.tsx`
**Paste reference (draft repo):** `images/browser/fixtures/injection.html`, `frontend/src/Browser.tsx`
**Attach from BIBLE:** section 6 (S5), section 8, Appendix B, Appendix C

```
PATCH 17 - Scene S5 Hostile page (Pattern B). Replace src/scenes/S5Page.tsx completely; add src/ui/FixturePage.tsx if you need it.

Provide: S5_CAMERA (whip to the browser tab f3300-3330, hold on the page, push to the fence f3360, to the ledger lines f3480, to the approval modal f3600, settle f3700-3719); S5_CURSOR (empty); overlay:
- f3300 eyebrow Badge "Pattern B - sandboxed browser use" and the tab strip showing "browser" active; src/ui/FixturePage.tsx rebuilds the injection fixture page VISUALLY in code (a plain article with the visible "Download the full guide (PDF)" link; the hidden text is revealed by the scan, never by a screenshot).
- f3360-3479 the page text enters the model through an "untrusted content" fence (a bracket with the label "untrusted content - random nonce - invisible characters stripped", text from copy.ts); then the scanner highlights the hidden lines in vermilion and the real ledger line "Possible prompt injection on page 1 (score N): ..." (from evidence) rises. Caption "A page tries to hijack the agent."
- f3480-3599 the compromised agent obeys: the REAL follow-up command from the attack steps types in; the REAL policy decision "Policy deny (high): ..." and "Egress blocked -> <host>" lines land with hits; a final stamp "nothing left the sandbox" built from the report's secrets and network dimensions (throw if they do not support it). Caption "Flagged. Denied. Nothing leaves."
- f3600-3719 the approval beat (ONLY if the evidence has approval.requested events; otherwise skip this block and extend the previous one): the approval modal with a countdown ring racing, resolving to "Approval denied or timed out"; caption "Risky actions wait for a human. Default: no." Use the word "screenshot" only if the evidence shows screenshot artifacts; never claim vision verification.

CHECK: npx tsc --noEmit ; stills at f3320, f3400, f3460, f3520, f3580, f3650, f3710.
```

**Patch 25 amendment (motion):** CAMERA (patch 25). Replace the interim `holdShot(3300, 3719, "fullWindow", ...)` in the S5 stub completely. The whip to the browser tab takes 26+ frames and is the scene's only whip; every hold on the page, fence and ledger lines uses holdShot() (no 2 s still); zoom stays at or under 2.0 on text. The camera covers f3300-3719 without a gap. Do not use backdrop-filter; blur the app only through appLook() if the fence needs the page stepped back.
