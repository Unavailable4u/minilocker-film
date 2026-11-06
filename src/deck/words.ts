// Deck wording that is NOT in src/config/copy.ts: kickers, slide titles and the notes beside screenshots.
// Same rules as copy.ts: no measured value here (numbers, hosts, models, hashes come from src/data/select.ts), no exclamation marks,
// never "secure", "unhackable", "provably safe", "zero risk". Anything the film already says is imported from copy.ts, not retyped.
import { s1, ws } from "../config/copy";

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** "and see exactly what it could not touch." -> "See exactly what it could not touch." (derived, so the film's tagline stays the one source) */
const claim = cap(s1.tagline[1].replace(/^and /, ""));

export const W = {
  s01: {
    /** the film's own two lines, unchanged */
    tagline: s1.tagline,
  },
  s03: {
    kicker: "§ 02 · The product",
    title: claim,
    /** first tagline line, with its comma turned into a full stop */
    lead: s1.tagline[0].replace(/,$/, "."),
    notes: [
      { title: ws.taskForm.title, body: ws.taskForm.profileHelp.strict },
      { title: ws.steps.title, body: cap(ws.steps.emptyTail.trim()) },
      { title: "Terminal", body: cap(ws.terminal.emptyBody.split(", and ")[1]) },
      { title: ws.blast.dialTitle, body: `${cap(ws.blast.legendClean)} is solid. ${cap(ws.blast.legendFlagged)} is dashed. Dotted was not measured.` },
    ],
    /** screens that appear in this deck, underlined in the legend */
    usedScreens: ["Workspace", "Attack Lab", "Report", "Infra"],
  },
} as const;
