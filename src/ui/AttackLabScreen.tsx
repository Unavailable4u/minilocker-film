// MiniLocker film: the Attack Lab screen (patch 07), ported from frontend/src/AttackLab.tsx. The three parts of the real screen:
//   Summary bar   Donut "N of 15 contained", the 15 verdict tiles (one glyph per verdict), the status sentences, the explanation,
//                 the primary "Run all attacks" button.
//   Card list     27rem column (459 px): title, two-line summary, category chip, status word and a per-card Run button.
//   Detail pane   the selected attack. Before a run: what the attacker tries and what will be checked. After a run: the verdict
//                 banner, the steps (tool, text, policy chip, egress rows, output), the containment checks, the expected line.
//
// DUMB COMPONENT: props in, pixels out. Nothing here reads the frame, and nothing here types a title, summary, step text, check
// label, host or number: every one of them is read from the AttackInfo / AttackResult objects the caller passes (which come from
// evidence through src/data/select.ts). The static wording is src/config/copy.ts `lab`. The numbers in the donut and the status
// sentences are COUNTED from `tiles` (labTally), exactly as the app counts its runs.
//
// MOTION is passed in by the scene:
//   stepsVisible / stepProgress[i]     how many steps of the selected result are drawn, and each row's entrance 0..1 (riseStyle)
//   checksVisible / checkProgress[i]   same for the checks, in DISPLAY order (orderedChecks); a check row rises in over the first
//                                      half of its progress and its mark LIGHTS (grey ring -> pass/fail/not-proven colour) over the rest
//   verdictStamp 0..1                  the verdict banner stamps in (it keeps its space from the first result frame, so the pane never jumps)
//   spin (turns) / pulse (0..1)        the busy rings and the running tile's pulse
//   donutFill 0..1                     draws the donut arcs on after a tile changes (default 1)
//   listScrollY / detailScrollY        px the card list / the detail pane are scrolled up (the app scrolls; the film frames the part it wants)
//   hover / press                      cursor states (a tile, a card, a Run button, "Run all") and the 1 px press of a button
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { lab } from "../config/copy";
import type { AttackCheck, AttackInfo, AttackResult, AttackStep, CheckStatus, Verdict } from "../data/types";
import { clamp01, signature } from "../lib/ease";
import { riseStyle } from "../lib/rise";
import { LISTING_STYLE } from "./chrome";
import { BREAK_ALL, CLAMP_2, Disclosure, TABULAR } from "./page";
import { Btn, Card, Chip, DISPLAY, Donut, EDGE, INK, Label, SMCP, SectionHead, Spin, VAR, WASH, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- vocabulary

/** The state of one verdict tile. The first five are the spec'd ones; `error` ("could not run") and `unavailable` are the app's other two. */
export type TileState = "notrun" | "running" | "contained" | "breached" | "inconclusive" | "error" | "unavailable";

export interface AttackTile {
  name: string;
  state: TileState;
}

/** Width of the card list column: `grid-cols-[27rem_minmax(0,1fr)]`. */
export const LAB_LIST_W = rem(27);

/** VERDICT of the source: label, glyph, tone. */
const VERDICT: Record<Verdict, { label: string; mark: string; tone: Tint }> = {
  contained: { label: lab.verdicts.contained, mark: "✓", tone: "ok" },
  breached: { label: lab.verdicts.breached, mark: "✗", tone: "bad" },
  inconclusive: { label: lab.verdicts.inconclusive, mark: "?", tone: "warn" },
  error: { label: lab.verdicts.error, mark: "!", tone: "bad" },
  unavailable: { label: lab.verdicts.unavailable, mark: "–", tone: "mute" },
};

/** CHECK of the source: glyph, tone, word. */
const CHECK: Record<CheckStatus, { mark: string; tone: Tint; word: string }> = {
  pass: { mark: "✓", tone: "ok", word: lab.checkWords.pass },
  fail: { mark: "✗", tone: "bad", word: lab.checkWords.fail },
  unproven: { mark: "?", tone: "warn", word: lab.checkWords.unproven },
  skip: { mark: "–", tone: "mute", word: lab.checkWords.skip },
};

const VERDICT_HELP: Partial<Record<Verdict, string>> = lab.verdictHelp;

/** The verdict a tile state stands for (null for a tile that has no verdict yet). */
export function verdictOfTile(state: TileState): Verdict | null {
  switch (state) {
    case "contained":
    case "breached":
    case "inconclusive":
    case "error":
    case "unavailable":
      return state;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------- counting

export interface LabTally {
  /** How many attacks can run here (`available`). The donut's total and the "/15". */
  runnable: number;
  contained: number;
  inconclusive: number;
  breached: number;
  error: number;
  /** Runnable attacks without a verdict yet (a running one still counts as "not run yet", like the app). */
  notRun: number;
  /** The tone of the big numeral. */
  worst: Tint;
}

/** The numbers the summary bar prints, counted from the tiles exactly as AttackLab.tsx `Summary` counts its runs. */
export function labTally(attacks: readonly AttackInfo[], tiles: readonly AttackTile[]): LabTally {
  const runnable = attacks.filter((a) => a.available).length;
  const count: Record<Verdict, number> = { contained: 0, breached: 0, inconclusive: 0, error: 0, unavailable: 0 };
  for (const t of tiles) {
    const v = verdictOfTile(t.state);
    if (v) count[v]++;
  }
  const notRun = runnable - (count.contained + count.breached + count.inconclusive + count.error);
  const worst: Tint = count.breached ? "bad" : count.inconclusive || count.error ? "warn" : count.contained && !notRun ? "ok" : "mute";
  return { runnable, contained: count.contained, inconclusive: count.inconclusive, breached: count.breached, error: count.error, notRun, worst };
}

/** The checks in the order the screen draws them: the attack's own first, then the ones run on every attack. Index `checkProgress` with it. */
export function orderedChecks(checks: readonly AttackCheck[]): AttackCheck[] {
  return [...checks.filter((c) => c.scope === "attack"), ...checks.filter((c) => c.scope === "always")];
}

// ---------------------------------------------------------------------------------------------- tiles

interface TileLook {
  border: string;
  bg?: string;
  color: string;
  mark: string;
  dashed?: boolean;
  hatched?: boolean;
}

/** `tileOf` of the source. A tile that has no verdict and cannot run here is the dashed "unavailable" one. */
function tileLook(state: TileState, available: boolean): TileLook {
  if (state === "running") return { border: theme.info, bg: theme.infoWash, color: theme.info, mark: "…" };
  if (state === "contained") return { border: alpha(theme.ok, 0.6), bg: theme.okWash, color: theme.ok, mark: "✓" };
  if (state === "breached") return { border: theme.bad, bg: theme.badWash, color: theme.bad, mark: "✗", hatched: true };
  if (state === "inconclusive") return { border: alpha(theme.warn, 0.7), bg: theme.warnWash, color: theme.warn, mark: "?" };
  if (state === "error") return { border: alpha(theme.bad, 0.6), bg: theme.badWash, color: theme.bad, mark: "!", hatched: true };
  if (state === "unavailable" || !available) return { border: alpha(theme.ink3, 0.5), color: theme.ink3, mark: "–", dashed: true };
  return { border: theme.rule, bg: theme.sunken, color: theme.ink3, mark: "·" };
}

/** Tailwind `animate-pulse`: opacity 1 -> .5 -> 1 over one cycle (phase 0..1). */
function pulseOpacity(phase: number): number {
  return 1 - 0.5 * ((1 - Math.cos(2 * Math.PI * phase)) / 2);
}

interface TileProps {
  look: TileLook;
  size: number;
  fontSize: number;
  selected?: boolean;
  hover?: boolean;
  pulse?: number;
  /** The card's tile shows a busy ring instead of the ellipsis. */
  spin?: number;
  style?: React.CSSProperties;
}

const Tile: React.FC<TileProps> = ({ look, size, fontSize, selected = false, hover = false, pulse, spin, style }) => (
  <span
    aria-hidden
    style={{
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      flex: "none",
      width: size,
      height: size,
      borderRadius: 6,
      border: `1px ${look.dashed ? "dashed" : "solid"} ${look.border}`,
      backgroundColor: look.bg,
      backgroundImage: look.hatched ? theme.hatchBad : undefined,
      color: look.color,
      fontSize,
      fontWeight: 700,
      lineHeight: 1.45,
      opacity: pulse === undefined ? undefined : pulseOpacity(pulse),
      transform: hover ? "translateY(-1px)" : undefined,
      // ring-2 ring-accent ring-offset-2 ring-offset-sheet
      boxShadow: selected ? `0 0 0 2px ${theme.sheet}, 0 0 0 4px ${theme.accent}` : undefined,
      ...style,
    }}
  >
    {spin !== undefined ? <Spin progress={spin} style={{ width: sp(3), height: sp(3) }} /> : look.mark}
  </span>
);

// ---------------------------------------------------------------------------------------------- props

export interface AttackLabHover {
  /** The name of the tile the cursor is over. */
  tile?: string;
  /** The name of the card the cursor is over. */
  card?: string;
  /** The name of the card whose Run button the cursor is over. */
  run?: string;
  runAll?: boolean;
  openReport?: boolean;
}

export interface AttackLabScreenProps {
  /** The attacks in lab order (BIBLE Appendix D): title, summary, category, profile, expected, tries, checks, availability. */
  attacks: readonly AttackInfo[];
  /** One verdict tile per attack, in the order they are drawn. */
  tiles: readonly AttackTile[];
  /** The name of the selected attack (the ringed tile, the lit card, the detail pane). */
  selected: string;
  /** The attack that is running right now (its tile pulses, its card says "running"), or null. */
  runningName: string | null;
  /** The full results by attack name. An attack that has none shows its preview. */
  results: Readonly<Record<string, AttackResult | undefined>>;
  /** How many steps of the selected result are drawn, and each one's entrance 0..1. */
  stepsVisible: number;
  stepProgress: readonly number[];
  /** How many checks (in `orderedChecks` order) are drawn, and each one's progress 0..1 (rise, then the mark lights). */
  checksVisible: number;
  checkProgress: readonly number[];
  /** 0..1: the verdict banner stamps in. */
  verdictStamp: number;
  /** A button is pressed down (1 px): "runAll" is the summary button, "run" the Run button of the selected card. */
  press?: "runAll" | "run";
  hover?: AttackLabHover;
  /** The summary button reads "Running all" with a busy ring. */
  runAllRunning?: boolean;
  /** Turns of the busy rings (spinProgress(frame)). */
  spin?: number;
  /** Phase 0..1 of the running tile's pulse (pulsePhase(frame, 60)). */
  pulse?: number;
  /** 0..1: how much of the donut's arcs are drawn. Default 1. */
  donutFill?: number;
  /** Draw every <details> (file contents, sandbox output) open, as if the viewer had clicked them. Default: the app's own (only a denied command's output is open). */
  openDetails?: boolean;
  listScrollY?: number;
  detailScrollY?: number;
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------------------------- summary bar

const Summary: React.FC<{
  attacks: readonly AttackInfo[];
  tiles: readonly AttackTile[];
  selected: string;
  anyRunning: boolean;
  runAllRunning: boolean;
  pressed: boolean;
  hover?: AttackLabHover;
  spin: number;
  pulse?: number;
  donutFill: number;
}> = ({ attacks, tiles, selected, anyRunning, runAllRunning, pressed, hover, spin, pulse, donutFill }) => {
  const tally = labTally(attacks, tiles);
  const { runnable, contained, inconclusive, breached, error, notRun, worst } = tally;
  const byName = new Map(attacks.map((a) => [a.name, a] as const));
  const bad = breached + error;
  const sentence: React.CSSProperties = {};
  return (
    <div
      style={{
        boxSizing: "border-box",
        flex: "none",
        borderBottom: `1px solid ${theme.rule}`,
        backgroundColor: alpha(theme.sheet, 0.5),
        backdropFilter: "blur(8px)",
        padding: `${sp(4)}px ${sp(6)}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: sp(7), maxWidth: rem(96), marginLeft: "auto", marginRight: "auto" }}>
        <Donut
          size={116}
          stroke={10}
          total={Math.max(1, runnable)}
          segments={[
            { value: contained * donutFill, tone: "ok" },
            { value: inconclusive * donutFill, tone: "warn" },
            { value: bad * donutFill, tone: "bad" },
          ]}
        >
          <div>
            <div style={{ ...DISPLAY, ...TABULAR, fontSize: rem(2.15), color: worst === "mute" ? theme.ink : INK[worst] }}>
              {contained}
              <span style={{ fontSize: rem(1.3), color: theme.ink3 }}>/{runnable}</span>
            </div>
            <div style={{ ...SMCP, marginTop: -sp(0.5), fontSize: rem(0.74), color: theme.ink2 }}>{lab.summary.donutCaption}</div>
          </div>
        </Donut>

        <div style={{ minWidth: 0, flex: "1 1 0%" }}>
          <div role="group" style={{ display: "flex", flexWrap: "wrap", gap: sp(1.5) }}>
            {tiles.map((t) => {
              const info = byName.get(t.name);
              return (
                <Tile
                  key={t.name}
                  look={tileLook(t.state, info ? info.available : true)}
                  size={sp(8)}
                  fontSize={rem(0.9)}
                  selected={t.name === selected}
                  hover={hover?.tile === t.name}
                  pulse={t.state === "running" ? pulse : undefined}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              columnGap: sp(4),
              rowGap: sp(0.5),
              marginTop: sp(2.5),
              fontSize: rem(0.92),
              color: theme.ink2,
              ...sentence,
            }}
          >
            {notRun > 0 && (
              <span>
                {notRun} {lab.summary.notRunYet}
              </span>
            )}
            {breached > 0 && (
              <span style={{ fontWeight: 700, color: theme.bad }}>
                {breached} {lab.summary.breached}
              </span>
            )}
            {inconclusive > 0 && (
              <span style={{ color: theme.warn }}>
                {inconclusive} {lab.summary.inconclusive}
              </span>
            )}
            {error > 0 && (
              <span style={{ color: theme.bad }}>
                {error} {lab.summary.couldNotRun}
              </span>
            )}
            {attacks.length > runnable && (
              <span style={{ fontStyle: "italic", color: theme.ink3 }}>
                {attacks.length - runnable} {lab.summary.needsInfra}
              </span>
            )}
            {notRun === 0 && !breached && !inconclusive && !error && contained > 0 && (
              <span style={{ fontWeight: 700, color: theme.ok }}>{lab.summary.allContained}</span>
            )}
          </div>
        </div>

        <div style={{ maxWidth: rem(24), flex: "none", fontSize: rem(0.86), fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>
          {lab.summary.explainLead} {lab.summary.explainCi}{" "}
          <code
            style={{
              borderRadius: 3,
              backgroundColor: theme.sunken,
              padding: `0 ${sp(1)}px`,
              fontFamily: fonts.mono,
              fontSize: "0.9em",
              fontStyle: "normal",
              color: theme.ink,
            }}
          >
            {lab.summary.explainCode}
          </code>
          .
        </div>

        <Btn
          variant="primary"
          pressed={pressed}
          hover={hover?.runAll === true}
          disabled={anyRunning || runnable === 0}
          style={{ flex: "none", padding: `${sp(2.5)}px ${sp(5)}px`, fontSize: rem(1.05) }}
        >
          {runAllRunning ? (
            <>
              <Spin progress={spin} /> {lab.summary.runningAll}
            </>
          ) : (
            <>
              {lab.summary.runAll} <span aria-hidden>{lab.summary.runAllMark}</span>
            </>
          )}
        </Btn>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- card list

const AttackCard: React.FC<{
  a: AttackInfo;
  state: TileState;
  selected: boolean;
  hover: boolean;
  runHover: boolean;
  runPressed: boolean;
  disabled: boolean;
  spin: number;
}> = ({ a, state, selected, hover, runHover, runPressed, disabled, spin }) => {
  const v = verdictOfTile(state);
  const style = v ? VERDICT[v] : null;
  const running = state === "running";
  const status = running
    ? lab.card.statusRunning
    : style
      ? style.label
      : a.available
        ? lab.card.statusNotRun
        : a.needs_browser && !a.needs_egress
          ? lab.card.statusNeedsBrowser
          : lab.card.statusNeedsEgress;
  const look = tileLook(state, a.available);
  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        flex: "none",
        borderRadius: 7,
        border: `1px solid ${selected ? alpha(theme.accent, 0.8) : hover ? theme.rule2 : theme.rule}`,
        backgroundColor: selected || hover ? theme.raised : theme.sheet,
        boxShadow: selected ? `0 0 0 1px ${theme.accent}, 0 14px 30px -18px ${theme.accent}` : undefined,
      }}
    >
      <div style={{ boxSizing: "border-box", display: "block", width: "100%", borderRadius: 7, padding: sp(3.5), paddingBottom: rem(3), textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: sp(3) }}>
          <Tile look={look} size={sp(7)} fontSize={rem(0.9)} style={{ marginTop: sp(0.5) }} spin={running ? spin : undefined} />
          <div style={{ minWidth: 0, flex: "1 1 0%" }}>
            <div style={{ fontSize: rem(1.04), fontWeight: 700, lineHeight: 1.25, color: theme.ink }}>{a.title}</div>
            <div style={{ ...CLAMP_2, marginTop: sp(1), fontSize: rem(0.88), lineHeight: 1.375, color: theme.ink2 }}>{a.summary}</div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: sp(3.5), right: sp(3.5), bottom: sp(3), display: "flex", alignItems: "center", gap: sp(2) }}>
        <Chip>{a.category}</Chip>
        <span style={{ ...SMCP, fontSize: rem(0.82), color: style ? INK[style.tone] : theme.ink3 }}>{status}</span>
        <Btn size="sm" hover={runHover} pressed={runPressed} disabled={disabled || !a.available || running} style={{ marginLeft: "auto" }}>
          {running ? lab.card.running : v ? lab.card.runAgain : lab.card.run}
        </Btn>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- detail pane

/** The tool word at the start of a step: `write` for a file, `$` for everything else (a browse step too, like the app), `↺` for a rewind. */
const ToolWord: React.FC<{ tool: string; preview?: boolean }> = ({ tool, preview = false }) => {
  const quiet = tool === "write_file" || (preview && tool === "control");
  const word = tool === "write_file" ? lab.step.write : preview && tool === "control" ? lab.step.control : lab.step.shell;
  return (
    <span style={{ ...SMCP, flex: "none", width: sp(9), paddingTop: 1, ...(quiet ? { color: theme.ink3 } : { fontWeight: 700, color: theme.ok }) }}>{word}</span>
  );
};

const CODE: React.CSSProperties = { minWidth: 0, ...BREAK_ALL, fontFamily: fonts.mono, fontSize: rem(0.84), color: theme.ink };
const INDENT = rem(2.9);

const Listing: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre
    style={{
      ...LISTING_STYLE,
      margin: 0,
      marginTop: sp(1),
      maxHeight: rem(12) /* max-h-48 */,
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      padding: sp(2.5),
      color: theme.ink2,
    }}
  >
    {children}
  </pre>
);

const PolicyChip: React.FC<{ s: AttackStep }> = ({ s }) => {
  if (!s.policy) return null;
  const { action, risk } = s.policy;
  const [text, tone]: [string, Tint] =
    action === "deny"
      ? [`${lab.step.policyDenied} · ${risk} ${lab.step.risk}`, "bad"]
      : action === "require_approval"
        ? [`${lab.step.policyAsked} (${s.approval ?? lab.step.policyNoAnswer}) · ${risk} ${lab.step.risk}`, "warn"]
        : action === "allow_in_sandbox"
          ? [`${lab.step.policySandbox} · ${risk} ${lab.step.risk}`, "warn"]
          : [`${lab.step.policyAllowed} · ${risk} ${lab.step.risk}`, "mute"];
  return (
    <Chip tone={tone} style={{ flex: "none", letterSpacing: "normal" }}>
      {text}
    </Chip>
  );
};

const Attempt: React.FC<{ s: AttackStep; p: number; openDetails: boolean }> = ({ s, p, openDetails }) => {
  const denied = s.policy?.action === "deny";
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: sp(1.5), padding: sp(3.5), fontSize: rem(0.9), ...riseStyle(p) }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: sp(2.5) }}>
        <ToolWord tool={s.tool} />
        <code style={{ ...CODE, flex: "1 1 0%" }}>{s.text}</code>
        <PolicyChip s={s} />
      </div>
      {s.content && (
        <Disclosure summary={lab.step.fileContents} open={openDetails} style={{ paddingLeft: INDENT, color: theme.ink2 }}>
          <Listing>{s.content}</Listing>
        </Disclosure>
      )}
      {s.egress.map((e, i) => (
        <div key={i} style={{ paddingLeft: INDENT, color: e.decision === "blocked" ? theme.bad : theme.ok }}>
          <span aria-hidden>{lab.step.egressMark} </span>
          {lab.step.egress} {e.decision} → <span style={{ fontFamily: fonts.mono, fontSize: "0.85em" }}>{e.host}</span>
          {e.reason ? ` (${e.reason})` : ""}
        </div>
      ))}
      {s.recreated && <div style={{ paddingLeft: INDENT, color: theme.warn }}>{lab.step.recreated}</div>}
      {s.result !== null && (
        <Disclosure
          summary={denied ? lab.step.blockedBeforeRun : lab.step.sandboxOutput}
          open={openDetails || denied}
          style={{ paddingLeft: INDENT, color: theme.ink2 }}
        >
          <Listing>{s.result}</Listing>
        </Disclosure>
      )}
    </Card>
  );
};

const CheckMark: React.FC<{ status: CheckStatus; lit: number }> = ({ status, lit }) => {
  const c = CHECK[status];
  const base: React.CSSProperties = {
    boxSizing: "border-box",
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: 9999,
    fontSize: rem(0.75),
    fontWeight: 700,
    lineHeight: 1.45,
  };
  return (
    <span aria-label={c.word} style={{ position: "relative", flex: "none", width: sp(5), height: sp(5), marginTop: sp(0.5) }}>
      {/* not lit yet: the neutral ring */}
      <span style={{ ...base, border: `1px solid ${theme.rule2}`, color: theme.ink3, backgroundColor: theme.sunken, opacity: 1 - lit }}>·</span>
      {/* lit: the status colour */}
      <span
        style={{
          ...base,
          border: `1px solid ${EDGE[c.tone]}`,
          color: INK[c.tone],
          backgroundColor: WASH[c.tone],
          backgroundImage: c.tone === "bad" ? theme.hatchBad : undefined,
          opacity: lit,
        }}
      >
        {c.mark}
      </span>
    </span>
  );
};

const CheckRow: React.FC<{ c: AttackCheck; p: number }> = ({ c, p }) => (
  <div style={{ display: "flex", gap: sp(3), ...riseStyle(clamp01(p / 0.5)) }}>
    <CheckMark status={c.status} lit={clamp01((p - 0.4) / 0.6)} />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 500, color: theme.ink }}>{c.label}</div>
      <div style={{ fontSize: rem(0.88), lineHeight: 1.375, color: theme.ink2 }}>{c.detail}</div>
    </div>
  </div>
);

const Checks: React.FC<{ checks: readonly AttackCheck[]; visible: number; progress: readonly number[] }> = ({ checks, visible, progress }) => {
  const ordered = orderedChecks(checks);
  const nAttack = ordered.filter((c) => c.scope === "attack").length;
  const shown = ordered.slice(0, Math.max(0, visible));
  const own = shown.slice(0, nAttack);
  const always = shown.slice(nAttack);
  const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: sp(3) };
  return (
    <Card style={{ padding: sp(4) }}>
      <div style={col}>
        {own.map((c, i) => (
          <CheckRow key={c.label} c={c} p={progress[i] ?? 1} />
        ))}
      </div>
      {always.length > 0 && (
        <>
          <div
            style={{
              ...SMCP,
              marginTop: sp(5),
              borderTop: `1px solid ${theme.rule}`,
              paddingTop: sp(2.5),
              fontSize: rem(0.88),
              color: theme.ink3,
            }}
          >
            {lab.detail.alwaysTitle}
          </div>
          <div style={{ ...col, marginTop: sp(3) }}>
            {always.map((c, i) => (
              <CheckRow key={c.label} c={c} p={progress[nAttack + i] ?? 1} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

const Expected: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ borderTop: `1px solid ${theme.rule}`, paddingTop: sp(2.5), fontSize: rem(0.88), fontStyle: "italic", color: theme.ink3 }}>
    <b style={{ fontStyle: "normal", color: theme.ink2 }}>{lab.detail.expected}</b> {text}
  </div>
);

/** The verdict banner (the app's `Result` header). `stamp` 0..1: it lands from 12% larger and settles; it keeps its space while hidden. */
const VerdictBanner: React.FC<{ r: AttackResult; stamp: number; hoverReport: boolean }> = ({ r, stamp, hoverReport }) => {
  const v = VERDICT[r.verdict];
  const help = r.error ?? VERDICT_HELP[r.verdict];
  const s = clamp01(stamp);
  const ringColor = VAR[v.tone];
  return (
    <div
      role="status"
      style={{
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: 8,
        border: `1px solid ${EDGE[v.tone]}`,
        backgroundColor: WASH[v.tone],
        backgroundImage: v.tone === "bad" ? theme.hatchBad : undefined,
        padding: sp(5),
        opacity: clamp01(s / 0.25),
        transform: s >= 1 ? undefined : `scale(${(1 + 0.12 * (1 - signature(s))).toFixed(4)})`,
      }}
    >
      <span
        aria-hidden
        style={{ position: "absolute", right: -sp(10), top: -sp(10), width: sp(44), height: sp(44), borderRadius: 9999, border: `1px solid ${ringColor}`, opacity: 0.12, pointerEvents: "none" }}
      />
      <span
        aria-hidden
        style={{ position: "absolute", right: -sp(2), top: -sp(2), width: sp(24), height: sp(24), borderRadius: 9999, border: `1px solid ${ringColor}`, opacity: 0.14, pointerEvents: "none" }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: sp(5) }}>
        <span
          aria-hidden
          style={{
            boxSizing: "border-box",
            display: "grid",
            placeItems: "center",
            flex: "none",
            width: sp(16),
            height: sp(16),
            borderRadius: 9999,
            border: `2px solid ${EDGE[v.tone]}`,
            color: INK[v.tone],
            fontSize: rem(2),
            fontWeight: 700,
            lineHeight: 1.45,
            boxShadow: v.tone === "mute" ? undefined : `0 0 28px -4px ${ringColor}`,
          }}
        >
          {v.mark}
        </span>
        <div style={{ minWidth: 0 }}>
          <Label style={{ display: "block" }}>{lab.detail.verdict}</Label>
          <div style={{ ...DISPLAY, fontSize: rem(2.4), color: INK[v.tone] }}>{v.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: sp(4), marginTop: sp(1), fontSize: rem(0.9), color: theme.ink2 }}>
            <span style={TABULAR}>{r.duration_s}s</span>
            <span>
              <b style={{ color: theme.ok }}>{r.counts.pass}</b> {lab.detail.passed}
            </span>
            {r.counts.fail > 0 && (
              <span>
                <b style={{ color: theme.bad }}>{r.counts.fail}</b> {lab.detail.failed}
              </span>
            )}
            {r.counts.unproven > 0 && (
              <span>
                <b style={{ color: theme.warn }}>{r.counts.unproven}</b> {lab.detail.notProven}
              </span>
            )}
          </div>
        </div>
        {r.task_id && r.verdict !== "unavailable" && (
          <Btn hover={hoverReport} style={{ marginLeft: "auto", flex: "none" }}>
            {lab.detail.openReport} <span aria-hidden>{lab.detail.openReportMark}</span>
          </Btn>
        )}
      </div>
      {help && (
        <div
          style={{
            position: "relative",
            marginTop: sp(3.5),
            borderTop: `1px solid ${alpha(theme.ink, 0.1)}`,
            paddingTop: sp(2.5),
            fontSize: rem(0.93),
            lineHeight: 1.375,
            color: theme.ink2,
          }}
        >
          {help}
        </div>
      )}
    </div>
  );
};

/** What the attacker will try and what will be checked, before a run (the app's `Preview`). */
const Preview: React.FC<{ a: AttackInfo; openDetails: boolean }> = ({ a, openDetails }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: sp(7) }}>
    <section>
      <SectionHead no={1} title={lab.detail.triesTitle} style={{ marginBottom: sp(3) }} />
      <div style={{ display: "flex", flexDirection: "column", gap: sp(2.5) }}>
        {a.tries.map((t, i) => (
          <Card key={i} style={{ padding: sp(3.5), fontSize: rem(0.9) }}>
            <div style={{ display: "flex", gap: sp(2.5) }}>
              <ToolWord tool={t.tool} preview />
              <code style={CODE}>{t.text}</code>
            </div>
            {t.content && (
              <Disclosure summary={lab.step.fileContents} open={openDetails} style={{ marginTop: sp(1.5), paddingLeft: INDENT, color: theme.ink2 }}>
                <Listing>{t.content}</Listing>
              </Disclosure>
            )}
          </Card>
        ))}
      </div>
    </section>
    <section>
      <SectionHead no={2} title={lab.detail.willCheckTitle} style={{ marginBottom: sp(3) }} />
      <Card style={{ padding: sp(4) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: sp(2), color: theme.ink2 }}>
          {a.checks.map((c) => (
            <div key={c} style={{ display: "flex", gap: sp(3) }}>
              <span aria-hidden style={{ flex: "none", width: sp(1.5), height: sp(1.5), marginTop: rem(0.5), borderRadius: 9999, backgroundColor: theme.accent }} />
              {c}
            </div>
          ))}
        </div>
      </Card>
    </section>
    <Expected text={a.expected} />
  </div>
);

// ---------------------------------------------------------------------------------------------- the screen

export const AttackLabScreen: React.FC<AttackLabScreenProps> = ({
  attacks,
  tiles,
  selected,
  runningName,
  results,
  stepsVisible,
  stepProgress,
  checksVisible,
  checkProgress,
  verdictStamp,
  press,
  hover,
  runAllRunning = false,
  spin = 0,
  pulse,
  donutFill = 1,
  openDetails = false,
  listScrollY = 0,
  detailScrollY = 0,
  style,
}) => {
  const cur = attacks.find((a) => a.name === selected) ?? attacks[0];
  const stateOf = new Map(tiles.map((t) => [t.name, t.state] as const));
  const anyRunning = runningName !== null || runAllRunning;
  const result = results[cur.name];
  // the Result layout while the build-up has started; the Preview before it (and while the attack runs, like the app)
  const showResult = result !== undefined && (stepsVisible > 0 || checksVisible > 0 || verdictStamp > 0);
  const steps = result ? result.steps.slice(0, Math.max(0, stepsVisible)) : [];

  return (
    <div style={{ display: "flex", flex: "1 1 0%", flexDirection: "column", minHeight: 0, ...style }}>
      <Summary
        attacks={attacks}
        tiles={tiles}
        selected={cur.name}
        anyRunning={anyRunning}
        runAllRunning={runAllRunning}
        pressed={press === "runAll"}
        hover={hover}
        spin={spin}
        pulse={pulse}
        donutFill={donutFill}
      />
      <div style={{ display: "grid", flex: "1 1 0%", minHeight: 0, gridTemplateColumns: `${LAB_LIST_W}px minmax(0, 1fr)` }}>
        {/* the cards */}
        <div style={{ boxSizing: "border-box", minHeight: 0, overflow: "hidden", borderRight: `1px solid ${theme.rule}`, backgroundColor: alpha(theme.paper, 0.4) }}>
          <div style={{ padding: sp(3.5), display: "flex", flexDirection: "column", gap: sp(2.5), transform: listScrollY ? `translateY(${-listScrollY}px)` : undefined }}>
            {attacks.map((a) => (
              <AttackCard
                key={a.name}
                a={a}
                state={stateOf.get(a.name) ?? "notrun"}
                selected={a.name === cur.name}
                hover={hover?.card === a.name}
                runHover={hover?.run === a.name}
                runPressed={press === "run" && a.name === cur.name}
                disabled={anyRunning}
                spin={spin}
              />
            ))}
          </div>
        </div>

        {/* the detail pane */}
        <div style={{ boxSizing: "border-box", minHeight: 0, minWidth: 0, overflow: "hidden", padding: `${sp(7)}px ${sp(8)}px` }}>
          <div style={{ maxWidth: rem(48), marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", gap: sp(7), transform: detailScrollY ? `translateY(${-detailScrollY}px)` : undefined }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: sp(2) }}>
                <Chip tone="info">{cur.category}</Chip>
                <Chip>
                  {cur.profile} {lab.detail.profileWord}
                </Chip>
              </div>
              <div style={{ ...DISPLAY, marginTop: sp(2.5), fontSize: rem(2.7), color: theme.ink }}>{cur.title}</div>
              <div
                style={{
                  marginTop: sp(2.5),
                  borderLeft: `2px solid ${alpha(theme.accent, 0.7)}`,
                  paddingLeft: sp(4),
                  fontSize: rem(1.06),
                  fontStyle: "italic",
                  lineHeight: 1.625,
                  color: theme.ink2,
                }}
              >
                {cur.summary}
              </div>
            </div>

            {runningName === cur.name && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: sp(2.5),
                  borderRadius: 6,
                  border: `1px solid ${EDGE.info}`,
                  backgroundColor: theme.infoWash,
                  padding: `${sp(2.5)}px ${sp(3.5)}px`,
                  color: theme.info,
                }}
              >
                <Spin progress={spin} /> {lab.detail.runningLine}
              </div>
            )}

            {showResult && result ? (
              <div style={{ display: "flex", flexDirection: "column", gap: sp(7) }}>
                <VerdictBanner r={result} stamp={verdictStamp} hoverReport={hover?.openReport === true} />
                {steps.length > 0 && (
                  <section>
                    <SectionHead no={1} title={lab.detail.whatHappened} style={{ marginBottom: sp(3) }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: sp(2.5) }}>
                      {steps.map((s, i) => (
                        <Attempt key={s.index} s={s} p={stepProgress[i] ?? 1} openDetails={openDetails} />
                      ))}
                    </div>
                  </section>
                )}
                {checksVisible > 0 && result.checks.length > 0 && (
                  <section>
                    <SectionHead no={2} title={lab.detail.checksTitle} style={{ marginBottom: sp(3) }} />
                    <Checks checks={result.checks} visible={checksVisible} progress={checkProgress} />
                  </section>
                )}
                {verdictStamp > 0 && <Expected text={cur.expected} />}
              </div>
            ) : (
              <Preview a={cur} openDetails={openDetails} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
