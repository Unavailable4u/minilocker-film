// E7 · Fifteen by category (slide 09). The attacks of the Attack Lab as the lab lists them, grouped under their category: one small card per category with
// the attack titles in it. The titles and the categories are the capture's own (GET /api/attacks, facts.attackGroups()).
//
// No per-attack verdict on purpose: the evidence stores a full result for five of the fifteen, and the slide's one measurement is the run of all of them
// (15 contained of 15, read from the summary). Static and props-driven: nothing reads the frame.
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";

export interface AttackGroup {
  category: string;
  titles: readonly string[];
}

export interface AttackCategoriesProps {
  groups: readonly AttackGroup[];
  width: number;
  /** Number of columns the cards flow into, top to bottom then left to right. */
  columns?: number;
}

export const AttackCategories: React.FC<AttackCategoriesProps> = ({ groups, width, columns = 2 }) => (
  <div style={{ width, columnCount: columns, columnGap: 18 }}>
    {groups.map((g) => (
      <div
        key={g.category}
        style={{
          boxSizing: "border-box",
          breakInside: "avoid",
          marginBottom: 10,
          padding: "8px 18px 9px",
          borderRadius: 12,
          border: `1px solid ${theme.rule}`,
          background: alpha(theme.sheet, 0.92),
          boxShadow: theme.panelShadow,
        }}
      >
        <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.accentInk }}>{g.category}</div>
        {g.titles.map((t) => (
          <div key={t} style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 1.14, color: theme.ink, marginTop: 3 }}>
            {t}
          </div>
        ))}
      </div>
    ))}
  </div>
);
