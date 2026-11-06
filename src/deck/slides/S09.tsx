// Slide 09 · The Attack Lab. Claim: the Attack Lab's own sentence (copy.lab.summary.explainLead): "Each attack is a scripted attacker driving the real agent
// loop, policy engine and Docker sandbox. No model is involved."
// Left: a REAL screenshot of the Attack Lab after "Run all attacks" (public/deck/R1.png, guide section 6, shot R1): the rebuilt film screen only shows the
// attacks the film ran. Under it the evidence: attacks contained of total, breached, and the CI run of the same definitions. Right: E7, the attacks by
// category, straight from the capture's attack catalog (no per-attack verdict: the evidence holds a full result for five of the fifteen).
// Wording rule: the verdict words are the product's: Contained, Breached, Inconclusive (copy.lab.verdicts).
import React from "react";
import { s4 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { attackGroups, attackLabFacts } from "../facts";
import { AttackCategories } from "../gfx/AttackCategories";
import { DECK, Eyebrow, Numeral, Pill, Ratio, Slide, Title } from "../kit";
import { RealShot } from "../RealShot";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const BODY_TOP = 184;
const SHOT_W = 880;
const SHOT_H = Math.round((SHOT_W * 900) / 1600);
const CAT_LEFT = SHOT_W + 64;
const CAT_W = CONTENT_W - CAT_LEFT;
const STRIP_TOP = BODY_TOP + SHOT_H + 12 + 30 + 20;

export const S09: React.FC = () => {
  const lab = attackLabFacts();
  const groups = attackGroups();
  const w = W.s09;
  // a breach or an inconclusive result would be said in the product's own colours
  const tone = lab.breached === 0 && lab.contained === lab.total ? "ok" : "bad";
  return (
    <Slide n={9}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{w.kicker}</Eyebrow>
        <Title size={56}>{w.title}</Title>

        <div style={{ position: "absolute", left: 0, top: BODY_TOP }}>
          <RealShot file="deck/R1.png" width={SHOT_W} missing={w.missing} />
        </div>
        <div style={{ position: "absolute", left: 0, top: BODY_TOP + SHOT_H + 12, width: SHOT_W, fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>{w.shotCaption}</div>

        <div style={{ position: "absolute", left: 0, top: STRIP_TOP, display: "flex", gap: 64, alignItems: "flex-end" }}>
          <Numeral tone={tone} value={<Ratio a={lab.contained} of={s4.proof.checksOf} b={lab.total} />} label={w.contained} />
          <Numeral tone={lab.breached === 0 ? "ok" : "bad"} value={lab.breached} label={w.breached} />
          {lab.ci ? (
            <div style={{ paddingBottom: 6 }}>
              <Pill>
                {w.ci.run}: {lab.ci}
              </Pill>
            </div>
          ) : null}
        </div>
        <div style={{ position: "absolute", left: 0, top: STRIP_TOP + 132, fontFamily: fonts.serif, fontSize: 30, color: theme.ink2, whiteSpace: "nowrap" }}>
          {w.ci.lead} <span style={{ fontFamily: fonts.mono, fontSize: 28, color: theme.ink }}>{w.ci.code}</span>
        </div>

        <div style={{ position: "absolute", left: CAT_LEFT, top: BODY_TOP, width: CAT_W }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.ink3, marginBottom: 10 }}>{w.categoriesCaption}</div>
          <AttackCategories groups={groups} width={CAT_W} />
        </div>
      </div>
    </Slide>
  );
};
