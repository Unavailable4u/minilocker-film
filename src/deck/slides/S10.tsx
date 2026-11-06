// Slide 10 · The evidence. Claim: "Measured, not asserted." (copy.s6.captionMeasured), answer "Every run leaves evidence." (copy.s6.caption).
// Left: the ledger of the rewind attack as a three-block HashChain (snapshot, delete, verified rewind), the tamper schematic (why the chain can be trusted),
// and the evidence strip: network attempts blocked, MiB peak memory, wall clock (three numerals, the QA maximum).
// Right: the REAL Report screen (live Shot of the film's app, frame 3915) cropped to its first eight cards, with a tag on the Browser card, and a legend of
// all nine dimensions: the ninth card (Compute) is 198 px tall and cannot fit in the 900 px window with the other eight at any scroll, so the legend carries it.
// Every number and word is read through facts.ts / words.ts / copy.ts; nothing measured is typed here.
import React from "react";
import { fonts, theme } from "../../config/theme";
import { ledgerChain, ledgerSealLine, reportCards, reportEvidence } from "../facts";
import { LedgerChain, ledgerChainHeight } from "../gfx/LedgerChain";
import { TAMPER_H, TamperSchematic } from "../gfx/TamperSchematic";
import { DECK, Eyebrow, Lead, Numeral, Ratio, Slide, Tag, Title } from "../kit";
import { mapPoint, Shot } from "../Shot";
import { W } from "../words";
import { gfxB, s4 as s4copy } from "../../config/copy";

const BODY_TOP = 200;
const LEFT_W = 920;
const RIGHT_W = 720;
const RIGHT_LEFT = DECK.w - 2 * DECK.mx - RIGHT_W;

/** The film's frame where the Report shows its cards (S6, the Report screen scrolled to the cards), and the crop of the first eight, in app px (1600 x 900). */
const REPORT_AT = 3915;
const CROP = { x: 245, y: 102, w: 1111, h: 679 } as const;
const SHOT = { left: RIGHT_LEFT, top: BODY_TOP, width: RIGHT_W, crop: CROP } as const;
const SHOT_H = Math.round((CROP.h * RIGHT_W) / CROP.w);

/**
 * Where the tag goes: the Browser card's empty body, in app px read off <Shot grid /> at frame 3915 (card x 257-791, y 471-579; header to y ~511).
 * The card is the fifth of the Report's two-column grid, so the slide checks that the fifth dimension is the one that is `not_used` before it points there.
 */
const BROWSER_CARD = { index: 4, key: "browser", body: { x: 276, y: 545 } } as const;

const capital = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

export const S10: React.FC = () => {
  const w = W.s10;
  const chain = ledgerChain();
  const ev = reportEvidence();
  const cards = reportCards();

  const flagged = cards[BROWSER_CARD.index];
  if (!flagged || flagged.key !== BROWSER_CARD.key || flagged.measured) {
    throw new Error(`S10: the tag is placed on the card of dimension #${BROWSER_CARD.index + 1}, which must be "${BROWSER_CARD.key}" and not measured; the evidence has "${flagged?.key}" / "${flagged?.status}". Re-read the card positions off <Shot at={${REPORT_AT}} grid />.`);
  }
  const tagAt = mapPoint(BROWSER_CARD.body, SHOT);

  const chainTop = BODY_TOP + 44;
  const chainH = ledgerChainHeight(chain.blocks.length, LEFT_W);
  const tamperTop = chainTop + chainH + 14;
  const stripTop = tamperTop + TAMPER_H + 18;

  const legendTop = BODY_TOP + SHOT_H + 12 + 34 + 34;
  return (
    <Slide n={10}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{w.kicker}</Eyebrow>
        <Title size={64}>{w.title}</Title>
        <Lead>{w.lead}</Lead>

        {/* left: the ledger, the schematic, the three numbers */}
        <div style={{ position: "absolute", left: 0, top: BODY_TOP, width: LEFT_W, fontFamily: fonts.mono, fontSize: 24, color: theme.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {w.ledger} · {chain.title}
        </div>
        <div style={{ position: "absolute", left: 0, top: chainTop }}>
          <LedgerChain width={LEFT_W} blocks={chain.blocks} deleteIndex={chain.deleteIndex} sealLine={ledgerSealLine(chain.seal)} />
        </div>
        <div style={{ position: "absolute", left: 0, top: tamperTop }}>
          <TamperSchematic width={LEFT_W} label={w.schematic} caption={w.tamperCaption} hashWord={gfxB.hash} prevWord={gfxB.prev} />
        </div>
        <div style={{ position: "absolute", left: 0, top: stripTop, display: "flex", gap: 48, alignItems: "flex-end" }}>
          <Numeral tone={ev.blocked === ev.attempts ? "ok" : "bad"} value={<Ratio a={ev.blocked} of={s4copy.proof.checksOf} b={ev.attempts} />} label={w.blocked} />
          <Numeral value={<Ratio a={ev.peakMiB} of={s4copy.proof.checksOf} b={ev.limitMiB} />} label={w.memory} />
          <Numeral
            value={
              <span>
                {ev.wallSeconds}
                <span style={{ fontSize: 48, color: theme.ink3 }}> {w.wallUnit}</span>
              </span>
            }
            label={w.wall}
          />
        </div>

        {/* right: the real Report, its Browser card tagged, and the nine dimensions */}
        <div style={{ position: "absolute", left: SHOT.left, top: SHOT.top }}>
          <Shot at={REPORT_AT} width={SHOT.width} crop={CROP} />
        </div>
        <div style={{ position: "absolute", left: tagAt.left, top: tagAt.top - 16 }}>
          <Tag>{w.notUsed}</Tag>
        </div>
        <div style={{ position: "absolute", left: RIGHT_LEFT, top: BODY_TOP + SHOT_H + 12, fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>{w.shotCaption}</div>

        <div style={{ position: "absolute", left: RIGHT_LEFT, top: legendTop - 34, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.ink3 }}>{w.legendCaption}</div>
        <div style={{ position: "absolute", left: RIGHT_LEFT, top: legendTop, width: RIGHT_W, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: 64, columnGap: 16 }}>
          {cards.map((c) => (
            <div key={c.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: fonts.serif, fontSize: 30, lineHeight: "34px", color: c.measured ? theme.ink : theme.ink3 }}>
                <span style={{ flex: "none", width: 14, height: 14, borderRadius: 7, boxSizing: "border-box", background: c.measured ? theme.ok : "transparent", border: c.measured ? undefined : `2px solid ${theme.ink3}` }} />
                {capital(c.name)}
              </div>
              <div style={{ paddingLeft: 26, fontFamily: fonts.mono, fontSize: 24, lineHeight: "28px", color: theme.ink3 }}>{c.status}</div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
};
