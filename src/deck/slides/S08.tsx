// Slide 08 · Pattern B: a hostile page. Claim: "A page tries to hijack the agent." (copy.s5.captionHijack), answered by "Flagged. Denied. Nothing leaves."
// (copy.s5.captionFlagged). Hero: E6, the defense path: the page, then the five gates the product applies (fence, scanner, policy, approval, egress wall),
// with the packets drawn stopped where the ledger says they stopped. Under it: the fixture page with its hidden layers shown, the approval moment in the
// app's own transcript, and the stamp "nothing left the sandbox" with its three facts. Everything is read from the evidence (src/deck/facts.ts, the film's
// S5 data); nothing is typed.
// Wording rule: "a page", "a command", "the attack". Never "the agent chose to".
import React from "react";
import { s0 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { StampBox } from "../../gfx/ContainerBox";
import { FixturePage } from "../../ui/FixturePage";
import { defenseStory, hostilePage } from "../facts";
import { DefensePath, type DefenseGate } from "../gfx/DefensePath";
import { DECK, Eyebrow, Numeral, Pill, Slide, Title } from "../kit";
import { Shot } from "../Shot";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const PATH_TOP = 160;
const PATH_H = 440;
const ROW_TOP = PATH_TOP + PATH_H + 20;
/** the fixture page is laid out in its own logical px (FixturePage), then scaled down */
const PAGE_LOGICAL = { w: 740, h: 700 } as const;
/** frame 3700: the transcript has scrolled to the policy's "require_approval", the request and "Approval denied or timed out". Logical px of the app (1600 x 900). */
const APPROVAL = { at: 3700, crop: { x: 0, y: 530, w: 400, h: 156 } } as const;
const APPROVAL_W = 560;
/** both crops of the row are this tall, so their captions share a line */
const ROW_H = Math.round((APPROVAL_W * APPROVAL.crop.h) / APPROVAL.crop.w);
const PAGE_K = ROW_H / PAGE_LOGICAL.h;
const PAGE_W = Math.round(PAGE_LOGICAL.w * PAGE_K);
const APPROVAL_LEFT = PAGE_W + 48;
const FACTS_LEFT = APPROVAL_LEFT + APPROVAL_W + 72;

export const S08: React.FC = () => {
  const page = hostilePage();
  const story = defenseStory();
  const w = W.s08;

  // the gates, in the order the product applies them; the state of each is what the ledger holds
  const gates: DefenseGate[] = [
    { ...w.gates.fence, label: w.gates.fence.label, evidence: story.fence, state: "through", outcome: { word: w.gates.fence.outcome, tone: "ok" }, weight: 1.3 },
    {
      title: w.gates.scan.title,
      label: w.gates.scan.label,
      evidence: `${story.scan.findings} ${w.findings}, ${story.scan.hidden} ${w.hidden}`,
      state: "through",
      outcome: { word: w.gates.scan.outcome, tone: "bad" },
      weight: 0.85,
    },
    {
      title: w.gates.policy.title,
      label: w.gates.policy.label,
      evidence: story.command.text,
      state: "stopped",
      outcome: { word: `${w.gates.policy.outcome} (${story.command.risk})`, tone: "bad" },
      packet: w.packets.command,
      weight: 1.3,
    },
  ];
  // no approval event in the ledger: the gate is left out rather than drawn as a stop the ledger does not hold
  if (story.approval) {
    gates.push({
      title: w.gates.approval.title,
      label: w.gates.approval.label,
      evidence: story.approval.summary,
      state: "stopped",
      outcome: { word: w.gates.approval.outcome, tone: "bad" },
      packet: w.packets.link,
      weight: 1.4,
    });
  }
  const reached = story.egressHosts.length > 0;
  gates.push({
    title: w.gates.egress.title,
    label: w.gates.egress.label,
    evidence: reached ? story.egressHosts.join(", ") : w.gates.egress.none,
    state: reached ? "stopped" : "idle",
    outcome: reached ? { word: w.gates.egress.refused, tone: "bad" } : { word: w.gates.egress.outcome, tone: "ok" },
    packet: reached ? w.packets.request : undefined,
    weight: 1,
  });

  const stampTone = story.stamp.bytesOut === 0 && story.stamp.egressAllowed === 0 && story.stamp.realSecrets === 0 ? "ok" : "bad";
  const mapped = w.facts;

  return (
    <Slide n={8}>
      <div style={{ position: "relative", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Eyebrow>{w.kicker}</Eyebrow>
          <Pill>{w.badge}</Pill>
        </div>
        {/* the claim and its answer on one line: the title, then the film's second caption in italics */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 48 }}>
          <Title size={72}>{w.title}</Title>
          <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 40, color: theme.ink2, whiteSpace: "nowrap" }}>{w.lead}</div>
        </div>

        <div style={{ position: "absolute", left: 0, top: PATH_TOP, height: PATH_H }}>
          <DefensePath width={CONTENT_W} start={w.page} gates={gates} />
        </div>

        <div style={{ position: "absolute", left: 0, top: ROW_TOP, width: PAGE_W, height: ROW_H, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 0 1px ${theme.rule2}` }}>
          <div style={{ width: PAGE_LOGICAL.w, height: PAGE_LOGICAL.h, transform: `scale(${PAGE_K})`, transformOrigin: "0 0" }}>
            <FixturePage width={PAGE_LOGICAL.w} height={PAGE_LOGICAL.h} url={s0.pageUrl} status={page.status} flagged={page.flagged} dim={0.5} layers={[1, 1, 1]} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, top: ROW_TOP + ROW_H + 10, whiteSpace: "nowrap", fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>{w.pageCaption}</div>

        {story.approval ? (
          <>
            <div style={{ position: "absolute", left: APPROVAL_LEFT, top: ROW_TOP }}>
              <Shot at={APPROVAL.at} crop={APPROVAL.crop} width={APPROVAL_W} style={{ height: ROW_H }} />
            </div>
            <div style={{ position: "absolute", left: APPROVAL_LEFT, top: ROW_TOP + ROW_H + 10, width: APPROVAL_W, whiteSpace: "nowrap", fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>
              {w.approvalCaption}
            </div>
          </>
        ) : null}

        <div style={{ position: "absolute", left: FACTS_LEFT, top: ROW_TOP, width: CONTENT_W - FACTS_LEFT }}>
          <div style={{ display: "inline-block" }}>
            <StampBox tone={stampTone} size={30}>
              {w.stamp}
            </StampBox>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 28 }}>
            <Numeral tone={stampTone} value={story.stamp.bytesOut} label={mapped.bytesOut} />
            <Numeral tone={stampTone} value={story.stamp.egressAllowed} label={mapped.egressAllowed} />
            <Numeral tone={stampTone} value={story.stamp.realSecrets} label={mapped.realSecrets} />
          </div>
        </div>
      </div>
    </Slide>
  );
};
