// Slide 04 · Pattern A: a real task, real execution. Claim: "A real task. Real execution." then "Plan. Dispatch. Execute. Verify." (copy.s2).
// Top: E2, the four-node loop (copy.s2.flow). Middle: two live crops of the recreated app's terminal, before and after the patch. Bottom: the evidence
// strip: the fix task's pass rate, the hidden check the model never sees, and the sandbox that is audited as it is destroyed. Every value is read from
// the evidence (src/deck/facts.ts); the model name and the bake-off line from the same selectors as the film's S8.
import React from "react";
import { rep, s2, s4 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { selectInfra } from "../../data/select";
import { bakeoffLine, finalSandboxDestroyed, fixTaskRuns, hiddenCheck } from "../facts";
import { LoopStrip } from "../gfx/LoopStrip";
import { DECK, Eyebrow, Lead, Numeral, Pill, Ratio, Slide, Tag, Title } from "../kit";
import { Shot } from "../Shot";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const SHOT_W = 840;
const SHOT_H = 320;
/** The terminal pane of the app spans about x 388 to 1126 (logical px). Crops sit 4 px inside it so no sliver of the app behind shows. */
const CROP_W = 730;
const CROP_H = Math.round((CROP_W * SHOT_H) / SHOT_W);
/** frame 880: the poisoned module has run and the tests fail (ERROR test_thousands_separator, with the traceback) */
const BEFORE = { at: 880, crop: { x: 392, y: 330, w: CROP_W, h: CROP_H } } as const;
/** frame 1330: the patch is in, the suite passes and the task is finished. (The guide's table says 1100; the film has moved: 1100 shows the module's log.) */
const AFTER = { at: 1330, crop: { x: 392, y: 592, w: CROP_W, h: CROP_H } } as const;

const LOOP_TOP = 214;
const SHOTS_TOP = 398;
const STRIP_TOP = 740;

const Cell: React.FC<{ left: number; width: number; children: React.ReactNode }> = ({ left, width, children }) => (
  <div style={{ position: "absolute", left, top: STRIP_TOP, width, height: 124, display: "flex", alignItems: "center", gap: 26 }}>{children}</div>
);

export const S04: React.FC = () => {
  const infra = selectInfra();
  const runs = fixTaskRuns();
  const hidden = hiddenCheck();
  const destroyed = finalSandboxDestroyed();
  const bakeoff = bakeoffLine(infra.inference.model);
  const of = s4.proof.checksOf;
  return (
    <Slide n={4}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{W.s04.kicker}</Eyebrow>
        <Title size={88}>{W.s04.title}</Title>
        <Lead>{W.s04.lead}</Lead>
        <div style={{ position: "absolute", right: 0, top: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, width: 620 }}>
          <Pill>
            {s2.inferenceChip} - {infra.inference.model}
          </Pill>
          {bakeoff ? <div style={{ fontFamily: fonts.mono, fontSize: 24, lineHeight: 1.3, color: theme.ink3, textAlign: "right" }}>{bakeoff}</div> : null}
        </div>

        <div style={{ position: "absolute", left: 0, top: LOOP_TOP }}>
          <LoopStrip nodes={s2.flow} width={CONTENT_W} contained={1} />
        </div>

        {[
          { label: W.s04.before, shot: BEFORE, left: 0 },
          { label: W.s04.after, shot: AFTER, left: SHOT_W + (CONTENT_W - 2 * SHOT_W) },
        ].map(({ label, shot, left }) => (
          <div key={label} style={{ position: "absolute", left, top: SHOTS_TOP - 42, width: SHOT_W }}>
            <div style={{ height: 42, fontFamily: fonts.mono, fontSize: 28, color: theme.ink2 }}>{label}</div>
            <Shot at={shot.at} crop={shot.crop} width={SHOT_W} style={{ height: SHOT_H }} />
          </div>
        ))}

        <div style={{ position: "absolute", left: 0, top: STRIP_TOP - 14, width: CONTENT_W, height: 1, background: theme.rule }} />
        <Cell left={0} width={380}>
          <div style={{ flex: "none", whiteSpace: "nowrap" }}>
            <Numeral tone="ok" value={<Ratio a={runs.passes} of={of} b={runs.runs} />} label={W.s04.runsPassed} />
          </div>
        </Cell>
        <Cell left={400} width={730}>
          <div style={{ flex: "none", whiteSpace: "nowrap" }}>
            <Numeral tone={hidden.passed ? "ok" : "bad"} value={<Ratio a={hidden.testsPassed} of={of} b={hidden.testsTotal} />} label={hidden.line} />
          </div>
          <Tag lead={36}>{s2.calloutCheck}</Tag>
        </Cell>
        <Cell left={1170} width={558}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 26, color: destroyed ? theme.ok : theme.warn }}>{destroyed ? rep.headline.destroyed : rep.headline.notConfirmed}</div>
            <Tag>{s2.calloutAudit}</Tag>
          </div>
        </Cell>

        <div style={{ position: "absolute", left: 0, top: 884, width: CONTENT_W, fontFamily: fonts.serif, fontStyle: "italic", fontSize: 30, lineHeight: 1.2, color: theme.ink2 }}>{W.s04.say}</div>
      </div>
    </Slide>
  );
};
