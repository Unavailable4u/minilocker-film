// Deck wording that is NOT in src/config/copy.ts: kickers, slide titles and the notes beside screenshots.
// Same rules as copy.ts: no measured value here (numbers, hosts, models, hashes come from src/data/select.ts), no exclamation marks,
// never "secure", "unhackable", "provably safe", "zero risk". Anything the film already says is imported from copy.ts, not retyped.
import { brand, gfxA, gfxB, gfxC, lab, rep, s0, s1, s2, s3, s4, s5, s6, s7, s8, ws } from "../config/copy";

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
  s08: {
    kicker: "§ 07 · Pattern B",
    /** the film's two captions of the hostile-page scene, unchanged: the claim and its answer */
    title: s5.captionHijack,
    lead: s5.captionFlagged,
    /** the badge of the film's scene ("Pattern B - sandboxed browser use") */
    badge: s5.badge,
    /** the start of the path */
    page: "page",
    /**
     * The five gates, in the order the product applies them. `label` says what the gate does (the fence's is the film's own label, split at its dashes;
     * the approval's is the film's caption, whose second sentence is the default). `outcome` is the word on the chip; a denial is "denied", as the ledger
     * ("Policy deny", "Approval denied") and the Report say it.
     */
    gates: {
      fence: { title: "Fence", label: s5.fenceLabel.split(" - "), outcome: "wrapped" },
      scan: { title: "Scanner", label: ["flags the injection"], outcome: "flagged" },
      policy: { title: "Policy", label: ["denies the follow-up command"], outcome: "denied" },
      approval: { title: "Approval", label: [s5.captionHuman], outcome: "denied" },
      egress: { title: "Egress wall", label: [s3.calloutAllowlist], outcome: "not reached", refused: gfxA.refused, none: "nothing arrived" },
    },
    /** the two packets that were stopped: what the compromised agent tried after the page, by the ledger's own tool names */
    packets: { command: "command", link: "link", request: "request" },
    /** the scanner's evidence line, "6 findings, 2 hidden" (counts from the ledger) */
    findings: "findings",
    hidden: "hidden",
    /** captions of the two crops under the path */
    pageCaption: "hidden layers shown",
    approvalCaption: "the approval, in the app's transcript",
    /** the stamp, and the labels of its three facts, are the film's own (copy.s5.stamp / stampFacts) */
    stamp: s5.stamp,
    facts: s5.stampFacts,
  },
  s09: {
    kicker: "§ 08 · The Attack Lab",
    /** the Attack Lab's own sentence, unchanged: it is the claim */
    title: lab.summary.explainLead,
    /** caption over the real screenshot, and over the categories */
    shotCaption: "the Attack Lab, after Run all attacks",
    categoriesCaption: "the attacks, by category",
    contained: "attacks contained",
    breached: lab.summary.breached,
    /** "The same definitions run in CI as" + code, then the conclusion of the capture's CI run */
    ci: { lead: lab.summary.explainCi, code: lab.summary.explainCode, run: "CI run" },
    /** shown in the Studio (never in the PDF) while public/deck/attacklab_complete.png is not there */
    missing: "public/deck/attacklab_complete.png is missing",
  },
  s10: {
    kicker: "§ 09 · The evidence",
    /** the film's two captions of the Report scene, unchanged: the claim and its answer */
    title: s6.captionMeasured,
    lead: s6.caption,
    /** mono caption over the chain: "ledger" and the attack's own title (read from the evidence) */
    ledger: "ledger",
    /** the honesty line under the tamper drawing: it is a drawing of how the chain works, not a run */
    schematic: "schematic, not a run",
    tamperCaption: "Change one event and every hash after it stops matching.",
    /** labels of the three numerals */
    blocked: "network attempts blocked",
    memory: "MiB peak memory",
    wall: "wall clock",
    wallUnit: "s",
    /**
     * The tag on the Browser card. The film never says "Not measured says so" about a card that is `not_used` (see the header of
     * src/scenes/S6Evidence.tsx): that phrase (copy.s6.calloutNotMeasured) is for `not_measured` only. A `not_used` card gets this phrase instead.
     */
    notUsed: "Not used says so",
    /** caption under the Report crop */
    shotCaption: "the Report, as the app shows it",
    /** heading over the legend of all nine dimensions (the crop shows the first eight cards) */
    legendCaption: "the nine dimensions",
  },
  s11: {
    kicker: "§ 10 · Why this is different",
    /** the film's one caption, split into its two sentences (derived, so copy.s7.caption stays the one source) */
    title: s7.caption.match(/[^.]+\./g)?.map((t) => t.trim()) ?? [s7.caption],
  },
  s12: {
    kicker: `§ 11 · ${brand.builtOn}`,
    /** the film's own caption, unchanged: it is the claim */
    title: s8.caption,
    /** the limits, in the film's own words (copy.s8.limits), and the heading and footnote of its LimitsCard */
    limitsTitle: gfxC.limitsTitle,
    limits: s8.limits,
    footnote: gfxC.limitsFootnote,
    /** caption over the table of the three Vultr products */
    tableCaption: "what runs on Vultr",
    /** words in front of the two links */
    links: { repo: "code", demo: "live demo" },
  },
} as const;
