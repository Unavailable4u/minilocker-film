// Slide 11 · Why this is different. Claim: "A container gives you a promise. MiniLocker gives you a measurement." (copy.s7.caption).
// The film's own CompareTable at its finished state (every row at progress 1, the product row emphasised), then the question the film ends its
// argument on (copy.s7.line) with "know?" underlined in crimson. The marks are an editorial judgement about GENERIC categories, never product names:
// they come from copy.gfxC and nowhere else. This slide carries no number on purpose (opinion slides carry none).
import React from "react";
import { gfxC, s7 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { COMPARE_W, CompareTable } from "../../gfx/CompareTable";
import { DECK, Eyebrow, Slide, Title } from "../kit";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const TABLE_TOP = 246;
const LINE_TOP = 848;
const UNDERLINED = "know?";

export const S11: React.FC = () => {
  // "...how would you know?": the last word is underlined in the accent, as the film does. If the wording ever changes, nothing is underlined.
  const underline = s7.line.endsWith(UNDERLINED);
  const head = underline ? s7.line.slice(0, -UNDERLINED.length) : s7.line;
  return (
    <Slide n={11}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{W.s11.kicker}</Eyebrow>
        <Title size={80}>
          {W.s11.title.map((sentence, i) => (
            <div key={sentence} style={{ color: i === 0 ? theme.ink2 : theme.ink }}>
              {sentence}
            </div>
          ))}
        </Title>

        <CompareTable
          rows={s7.rows}
          columns={gfxC.compareColumns}
          marks={gfxC.compareMarks}
          rowProgress={s7.rows.map(() => 1)}
          emphasis={1}
          legend={gfxC.compareLegend}
          x={(CONTENT_W - COMPARE_W) / 2}
          y={TABLE_TOP}
        />

        <div style={{ position: "absolute", left: 0, top: LINE_TOP, width: CONTENT_W, textAlign: "center", fontFamily: fonts.serif, fontStyle: "italic", fontSize: 46, lineHeight: 1.2, color: theme.ink }}>
          {head}
          {underline ? (
            <span style={{ textDecoration: "underline", textDecorationColor: theme.accent, textDecorationThickness: 4, textUnderlineOffset: 8 }}>{UNDERLINED}</span>
          ) : null}
        </div>
      </div>
    </Slide>
  );
};
