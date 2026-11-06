// Slide 03 · The product in one screen: the recreated app at film frame 1330 (the finished fix task), four numbered pins and a legend of the six screens.
import React from "react";
import { fonts, theme } from "../../config/theme";
import { s2, ui } from "../../config/copy";
import { LOGICAL } from "../../config/timeline";
import { selectInfra } from "../../data/select";
import { Eyebrow, Lead, Note, Pill, Pin, Slide, Title } from "../kit";
import { mapPoint, Shot } from "../Shot";
import { W } from "../words";

const SHOT = { left: 0, top: 240, width: 1100 } as const;
const SHOT_H = Math.round((SHOT.width * LOGICAL.h) / LOGICAL.w);
/** film frame: the fix task is finished (transcript, terminal, dial flagged, blast cards) */
const AT = 1330;
/** where each pin sits on the app, in the app's logical px (1600 x 900), read off <Shot grid /> */
const PINS = [
  { x: 355, y: 245 }, // task form: on its right edge, above the strict / observe row
  { x: 355, y: 590 }, // transcript
  { x: 1085, y: 700 }, // terminal: on the dark pane, right of the short lines
  { x: 1192, y: 400 }, // containment dial
] as const;

export const S03: React.FC = () => {
  const infra = selectInfra();
  return (
    <Slide n={3}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{W.s03.kicker}</Eyebrow>
        <Title>{W.s03.title}</Title>
        <Lead>{W.s03.lead}</Lead>
        <div style={{ position: "absolute", right: 0, top: 0 }}>
          <Pill>
            {s2.inferenceChip} - {infra.inference.model}
          </Pill>
        </div>

        <div style={{ position: "absolute", left: SHOT.left, top: SHOT.top }}>
          <Shot at={AT} width={SHOT.width} />
        </div>
        {PINS.map((p, i) => {
          const at = mapPoint(p, SHOT);
          return <Pin key={i} n={i + 1} left={at.left} top={at.top} />;
        })}

        <div style={{ position: "absolute", left: 1156, top: SHOT.top, width: 572, display: "flex", flexDirection: "column", gap: 30 }}>
          {W.s03.notes.map((n, i) => (
            <Note key={n.title} n={i + 1} title={n.title}>
              {n.body}
            </Note>
          ))}
        </div>

        <div style={{ position: "absolute", left: SHOT.left, top: SHOT.top + SHOT_H + 22, width: SHOT.width, display: "flex", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 26 }}>
          {ui.screens.map((s) => {
            const used = (W.s03.usedScreens as readonly string[]).includes(s);
            return (
              <span
                key={s}
                style={{
                  color: used ? theme.ink : theme.ink3,
                  textDecoration: used ? "underline" : "none",
                  textDecorationColor: theme.accent,
                  textDecorationThickness: 3,
                  textUnderlineOffset: 6,
                }}
              >
                {s}
              </span>
            );
          })}
        </div>
      </div>
    </Slide>
  );
};
