// Deck wording that is NOT in src/config/copy.ts: kickers, slide titles and the notes beside screenshots.
// Same rules as copy.ts: no measured value here (numbers, hosts, models, hashes come from src/data/select.ts), no exclamation marks,
// never "secure", "unhackable", "provably safe", "zero risk". Anything the film already says is imported from copy.ts, not retyped.
import { gfxB, rep, s0, s1, s2, s3, s4, s5, s7, ws } from "../config/copy";

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** "and see exactly what it could not touch." -> "See exactly what it could not touch." (derived, so the film's tagline stays the one source) */
const claim = cap(s1.tagline[1].replace(/^and /, ""));

export const W = {
  s01: {
    /** the film's own two lines, unchanged */
    tagline: s1.tagline,
  },
  s02: {
    kicker: "§ 01 · The problem",
    /** the film's two caption lines, unchanged */
    title: s0.caption,
    /** where the fixture page hides its instructions, in the fixture's own words (copy.s5.fixture.hidden[].how), numbered on the page */
    hiding: s5.fixture.hidden.map((h) => h.how),
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
  s04: {
    kicker: "§ 03 · Pattern A",
    title: s2.caption,
    lead: s2.captionSteps,
    before: "before the patch",
    after: "after the patch",
    runsPassed: "fix task runs passed",
    /**
     * The guide's line says every other scene uses scripted attackers. The evidence does not support that: evidence.s3Source is "task", so the containment
     * slides show this same model-driven run. The repo's own rule is narrower and true: the Attack Lab's attacks are scripted, no model is involved.
     */
    say: "A model drives this task. The Attack Lab's attacks are scripted: no model is involved.",
  },
  s05: {
    kicker: "§ 04 · Containment",
    title: s3.caption,
    lead: s3.captionPhoneHome,
    allowlist: s3.calloutAllowlist,
  },
  s06: {
    kicker: "§ 05 · The bait",
    title: s3.captionBait,
    /** the two callouts of the film's S3 */
    random: s3.calloutRandom,
    alarm: s3.calloutAlarm,
    attemptHead: "what the module tried",
    outcomeHead: "outcome",
    /** The attempt went through, on a planted decoy. The other outcome word is the film's own (copy.gfxA.refused). */
    readDecoy: "read a decoy",
    proof: "the module's own log",
    realRuns: "runs with a real secret",
    hookRuns: "runs where the hook got out",
    /** The Report's Secrets card line, in the Report's own words (copy.rep.headline). */
    secretsLine: { planted: rep.headline.decoysPlanted, read: rep.headline.read, used: rep.headline.used, noReal: rep.headline.noReal },
  },
  s07: {
    kicker: "§ 06 · Wipe, rewind, re-hash",
    /** the film's caption, unchanged */
    title: s4.captionReal,
    /** the film's three captions of the storyboard, in order */
    captions: [s4.captionWorks, s4.captionGone, s4.captionRewind],
    /** the callout of the film's timeline, drawn on the rewind's arc */
    undone: s4.calloutUndone,
    /** word before the path of the file the attack writes ("wrote /workspace/precious.txt") */
    wrote: "wrote",
    /** the lattice's own honesty line (copy.gfxB.schematic): only the labelled tile is a real file */
    schematic: gfxB.schematic,
    /** "N file(s) re-hashed - all matched", assembled from the film's own words (same format as S4b2's counter) */
    rehashedOne: gfxB.fileRehashed,
    rehashedMany: gfxB.filesRehashed,
    allMatched: gfxB.allMatched,
    /** labels of the evidence strip: "checks passed" and "to run the whole attack" are the film's (copy.s4.proof), the middle one is the deck's */
    checks: s4.proof.checks,
    events: "ledger events verified",
    seconds: s4.proof.seconds,
    secondsUnit: s4.proof.secondsUnit,
    /** the caption over the live crop of the Attack Lab's verdict */
    verdict: "the Attack Lab's verdict",
  },
  s11: {
    kicker: "§ 10 · Why this is different",
    /** the film's one caption, split into its two sentences (derived, so copy.s7.caption stays the one source) */
    title: s7.caption.match(/[^.]+\./g)?.map((t) => t.trim()) ?? [s7.caption],
  },
} as const;
