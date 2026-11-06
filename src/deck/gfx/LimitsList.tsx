// E9 · The limits, as a deck-native list (slide 12). The film's LimitsCard is 1440 px wide, nowrap and 40 px text: scaled into a column its text would be
// about 18 px. This keeps the card's look (the hatched vermilion rule at the left of each line, serif lines, the small-caps heading, the mono footnote) but
// wraps the lines in the column's width at 34 px. Every word is a prop (copy.s8.limits, copy.gfxC.limitsTitle / limitsFootnote through words.s12).
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";

const RULE_W = 10;
const TEXT_X = 34;
const LINE_FONT = 34;

/** The film's rule: hatched vermilion over a faint wash (LimitsCard.tsx RULE_BG), with its hairline on the left. */
const RULE_BG = `repeating-linear-gradient(135deg, ${theme.bad} 0 2px, transparent 2px 6px), ${alpha(theme.bad, 0.16)}`;

export interface LimitsListProps {
  width: number;
  title: string;
  lines: readonly string[];
  footnote: string;
}

export const LimitsList: React.FC<LimitsListProps> = ({ width, title, lines, footnote }) => {
  if (lines.length === 0) throw new Error("LimitsList: needs at least one line");
  return (
    <div style={{ width }}>
      <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 28, color: theme.ink3, fontVariantCaps: "all-small-caps", letterSpacing: "0.1em", paddingLeft: TEXT_X, marginBottom: 14 }}>
        {title}
      </div>
      {lines.map((text, i) => (
        <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", minHeight: 108, padding: "14px 0", borderTop: i === 0 ? `1px solid ${theme.rule}` : undefined, borderBottom: `1px solid ${theme.rule}` }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: RULE_W, background: RULE_BG, borderLeft: `1.5px solid ${theme.bad}`, boxSizing: "border-box" }} />
          <div style={{ paddingLeft: TEXT_X, fontFamily: fonts.serif, fontWeight: 700, fontSize: LINE_FONT, lineHeight: 1.18, color: theme.ink }}>{text}</div>
        </div>
      ))}
      <div style={{ marginTop: 14, paddingLeft: TEXT_X, fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>{footnote}</div>
    </div>
  );
};
