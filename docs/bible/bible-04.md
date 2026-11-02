## BIBLE 4. Visual identity (taken from the real app, dark theme)

**4.1 Tokens (`[data-theme="dark"]` in `frontend/src/index.css`)**

| Token | Hex / value | Use |
|---|---|---|
| paper | #0a0a0c | page background |
| sheet | #121216 | panels |
| raised | #17171d | raised cards |
| sunken | #08080b | wells, terminal |
| rule / rule-2 | #26262e / #353541 | hairlines |
| ink / ink-2 / ink-3 | #f2f1ed / #b4b2ab / #8e8c86 | text, secondary, tertiary |
| accent | #f01a49 | brand crimson (fills, focus) |
| accent-ink | #ff7a96 | accent-colored text |
| accent-2 | #a78bfa | ambience only, never a status |
| ok (clean) | #5b9dff, wash #1c2537, gradient #1f46d9 to #3f86ff (55%) to #86bcff, 135 deg | contained / measured clean |
| bad (flagged) | #ff5a4f, wash #2c1a1c, plus 135 deg hatching: repeating-linear-gradient(135deg, transparent 0 5px, bad 16% 5px 6px) | breached / blocked / denied |
| warn | #f59e0b, wash #2b2115 | needs a human, decoy read |
| info | #b39cff, wash #292537 | neutral information |
| term bg / fg / dim | #08080b / #f2f1ed / #8e8c86 | terminal |
| grid | rgba(255,32,82,.03), 44 px | engineering-paper grid |
| glow a / b | rgba(255,32,82,.09) / rgba(167,139,250,.06) | two soft pools of light |
| panel shadow | inset 0 1px rgba(255,255,255,.04), 0 20px 40px -28px rgba(0,0,0,.9) | panels |

Stage background in the film: #08080b to #121216 vertical gradient plus the two glows. S0 starts at #050505.

**4.2 Type.** CMU Serif (500 roman/italic, 700 roman/italic) for everything except code; CMU Typewriter Text (500, 700) for mono. Real app root is 17 px. On the 1080p frame: hook sentence 72 px, title lockup 150 px, captions 56-76 px, callouts 24 px, in-app UI text at least 22 px when it matters (camera scale handles it), explainer mono labels at least 20 px. `smcp` = all-small-caps, 0.08em, weight 500 (labels). `display` = weight 700, -0.012em, line-height 1.04.

**4.3 The Mark and the dial.** The Mark is four concentric elements (Appendix A): a dotted outer ring, two solid rings, a faint core wash and a crimson core dot. The Blast Radius dial has FIVE arcs (outermost first: network, policy, filesystem, secrets, compute) at radii 104, 88, 72, 56, 40 around (120,120), with 72 ticks; solid = clean (blue gradient stroke 8 px), dashed = flagged (vermilion, 9 4.5, pulsing), 13 5 = review (amber), dotted = not measured (ink-3, width 4, dash 0.1 7.4). The film's through-line: Mark in S1, dial grows out of it, dial lives in the panel, dial returns as the Mark in S9.

**4.4 Motion language: "the typeset instrument".** Hairlines draw on with the signature ease; text rises through masks (never fades alone); panels settle with a spring (no bounce beyond 4%); the camera is a physical object (slight tilt, micro-drift); packets and typing are linear; impacts are small (2-3% punch, seeded 8-frame shake) and ALWAYS land on a beat; flagged things hatch; clean things get the blue gradient and a tick; silence is used once, deliberately (f2370). Depth of field: dim + light blur outside the focus. Grain 3%, vignette 12%. No glow overload: glow only on the accent underline, the dial and the decoys.

**4.5 Layout.** Safe margin 96 px on the 1080p stage. Captions bottom-center 110 px above the bottom edge, never over the thing they describe. Callouts max 5 words.
