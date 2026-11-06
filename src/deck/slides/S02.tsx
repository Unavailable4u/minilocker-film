// Slide 02 · The problem. Claim: "Agents with a shell and a browser are one bad page away from a bad day." (copy.s0.caption, two lines).
// Left: E1, the six verdicts of an agent with no limits. Right: the hostile page the film uses, with its three hiding places numbered.
// The grid is an ILLUSTRATION (the tag under it says so); the page is the fixture the product really serves. Nothing on this slide is a measurement,
// except the page's HTTP status, which is read from the ledger's browser.page event like everywhere else.
import React from "react";
import { s0 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { FIXTURE, FixturePage, fixtureLayerTop } from "../../ui/FixturePage";
import { hostilePage } from "../facts";
import { SixVerdicts } from "../gfx/SixVerdicts";
import { DECK, Dot, Eyebrow, Pin, Slide, Title } from "../kit";
import { W } from "../words";

const BODY_TOP = 234;
const GRID_W = 1056;
/** the page is laid out in its own logical px (FixturePage), then scaled down to PAGE_W */
const PAGE_LOGICAL = { w: 740, h: 700 } as const;
const PAGE_W = 592;
const K = PAGE_W / PAGE_LOGICAL.w;
const PAGE_H = Math.round(PAGE_LOGICAL.h * K);
const PAGE_LEFT = DECK.w - 2 * DECK.mx - PAGE_W;

export const S02: React.FC = () => {
  const page = hostilePage();
  return (
    <Slide n={2}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{W.s02.kicker}</Eyebrow>
        <Title size={76}>
          {W.s02.title.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </Title>

        <div style={{ position: "absolute", left: 0, top: BODY_TOP }}>
          <SixVerdicts screens={s0.screens} width={GRID_W} />
          <div style={{ marginTop: 14, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, color: theme.ink3 }}>{s0.tag}</div>
        </div>

        <div style={{ position: "absolute", left: PAGE_LEFT, top: BODY_TOP, width: PAGE_W, height: PAGE_H }}>
          <div style={{ width: PAGE_LOGICAL.w, height: PAGE_LOGICAL.h, transform: `scale(${K})`, transformOrigin: "0 0" }}>
            <FixturePage width={PAGE_LOGICAL.w} height={PAGE_LOGICAL.h} url={s0.pageUrl} status={page.status} flagged={page.flagged} dim={0.5} layers={[1, 1, 1]} />
          </div>
        </div>
        {/* one pin per hidden layer, centred on the page's left edge so it does not cover the layer's text */}
        {W.s02.hiding.map((_, i) => (
          <Pin key={i} n={i + 1} left={PAGE_LEFT} top={BODY_TOP + (1 + FIXTURE.addressH + fixtureLayerTop(i) + FIXTURE.layerH / 2) * K} />
        ))}

        <div style={{ position: "absolute", left: PAGE_LEFT, top: BODY_TOP + PAGE_H + 14, width: PAGE_W, display: "flex", flexDirection: "column", gap: 8 }}>
          {W.s02.hiding.map((how, i) => (
            <div key={how} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Dot n={i + 1} size={36} />
              <span style={{ fontFamily: fonts.mono, fontSize: 28, color: theme.ink }}>{how}</span>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
};
