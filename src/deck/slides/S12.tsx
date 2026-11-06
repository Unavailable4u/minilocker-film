// Slide 12 · Built on Vultr, and what it does not do. Claim: "What it does, and what it does not." (copy.s8.caption).
// Left: the film's own architecture diagram at its finished state (all three Vultr chips lit) with a table under it that prints the same three products and
// facts at a size a judge can read (the diagram's own text is scaled below 16 px). Right: the limits in the film's words (copy.s8.limits), wrapped, and the
// links: repository, live demo, licence. Every host, model, region, bucket and the bake-off line is read through facts.vultrFacts() (the film's S8 rule).
import React from "react";
import { fonts, theme } from "../../config/theme";
import { deckLinks, vultrFacts } from "../facts";
import { ArchScaled, archScaledHeight } from "../gfx/ArchScaled";
import { LimitsList } from "../gfx/LimitsList";
import { DECK, Eyebrow, Pill, Slide, Title } from "../kit";
import { VultrLogo } from "../../ui/VultrLogo";
import { brand } from "../../config/copy";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const BODY_TOP = 168;
const LEFT_W = 1000;
const RIGHT_W = 600;
const NAME_W = 408;
const RIGHT_LEFT = CONTENT_W - RIGHT_W;

export const S12: React.FC = () => {
  const w = W.s12;
  const vultr = vultrFacts();
  const links = deckLinks();
  const archTop = BODY_TOP;
  const tableTop = archTop + archScaledHeight(LEFT_W) + 12;

  return (
    <Slide n={12}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{w.kicker}</Eyebrow>
        <Title size={64}>{w.title}</Title>
        <div style={{ position: "absolute", right: 0, top: 4 }}>
          <VultrLogo height={44} />
        </div>

        {/* left: the diagram and the table of the three products */}
        <div style={{ position: "absolute", left: 0, top: archTop }}>
          <ArchScaled width={LEFT_W} chips={vultr.chips} />
        </div>
        <div style={{ position: "absolute", left: 0, top: tableTop, width: LEFT_W }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.ink3, marginBottom: 6 }}>{w.tableCaption}</div>
          {vultr.rows.map((r, i) => (
            <div key={r.name} style={{ padding: "8px 0", borderTop: `1px solid ${theme.rule}`, borderBottom: i === vultr.rows.length - 1 ? `1px solid ${theme.rule}` : undefined }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
                <div style={{ flex: "none", width: NAME_W, fontFamily: fonts.serif, fontSize: 30, lineHeight: "36px", color: theme.ink }}>{r.name}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 26, lineHeight: "36px", color: theme.ink2, whiteSpace: "nowrap" }}>{r.facts}</div>
              </div>
              {r.note ? <div style={{ fontFamily: fonts.mono, fontSize: 24, lineHeight: "30px", color: theme.ink3, whiteSpace: "nowrap" }}>{r.note}</div> : null}
            </div>
          ))}
        </div>

        {/* right: the limits, said plainly, and the links */}
        <div style={{ position: "absolute", left: RIGHT_LEFT, top: BODY_TOP }}>
          <LimitsList width={RIGHT_W} title={w.limitsTitle} lines={w.limits} footnote={w.footnote} />
        </div>
        <div style={{ position: "absolute", left: RIGHT_LEFT, bottom: 0, width: RIGHT_W, display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 24, color: theme.ink3, marginBottom: 8 }}>{w.links.repo}</div>
            <Pill>{links.repo}</Pill>
          </div>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 24, color: theme.ink3, marginBottom: 8 }}>{w.links.demo}</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Pill>{links.demo}</Pill>
              <Pill>{brand.license}</Pill>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
};
