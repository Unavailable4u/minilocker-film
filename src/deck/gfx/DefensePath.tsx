// E6 · Defense path (slide 08). The hostile page's way through the product, left to right: the page, then five gates (fence, scanner, policy, approval,
// egress wall), each one a card with what it does, the ledger's own evidence for it and the outcome chip. A rail runs along the top of the cards.
//
// The rail says where things stopped, and only where the ledger says so:
//   - "through": the page's text passes this gate (the fence wraps it, the scanner flags it). A ring on the rail.
//   - "stopped": something the compromised agent tried ended here. A hatched vermilion bar, the packet drawn pressed against it. Vermilion is never the
//     only signal: the bar is hatched and the chip says the word.
//   - "idle": nothing ever arrived (the egress wall: the ledger has no egress line). An outlined bar, no packet, and a dashed rail leading to it.
// After a gate that stopped something the rail is dashed: what comes next is a second attempt (the link), not the same packet.
//
// Static and props-driven: nothing reads the frame. Every word is a prop (copy.ts / words.ts), every string of evidence is a prop read from the ledger
// (src/deck/facts.ts defenseStory()).
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";
import { Dot } from "../kit";

export type GateState = "through" | "stopped" | "idle";
export type GateTone = "ok" | "bad";

export interface DefenseGate {
  title: string;
  /** What the gate does, one entry per line (serif). */
  label: readonly string[];
  /** The ledger's own text for this gate (mono): the marker, the counts, the command, the summary. */
  evidence: string;
  state: GateState;
  /** The word on the chip, and its tone: "ok" is measured and held, "bad" is flagged or denied (hatched). */
  outcome: { word: string; tone: GateTone };
  /** Only for a "stopped" gate: the name of the packet that was stopped here ("command", "link"). */
  packet?: string;
  /** Share of the width this card takes (default 1): the gates with a long command to print are wider. */
  weight?: number;
}

export interface DefensePathProps {
  width: number;
  /** The start of the path ("page"). */
  start: string;
  gates: readonly DefenseGate[];
}

const START_W = 120;
const GAP = 40;
const RAIL_ZONE_H = 100;
const RAIL_Y = 56;
const BAR_W = 10;
const BAR_H = 70;
const PACKET = 28;
const LINE = 3;

/** Where each gate's card sits (left edge and width), in the drawing's own px. Widths follow the gates' `weight`. */
function geometry(width: number, gates: readonly DefenseGate[]): { left: number; w: number }[] {
  const total = gates.reduce((a, g) => a + (g.weight ?? 1), 0);
  const avail = width - START_W - gates.length * GAP;
  let x = START_W + GAP;
  return gates.map((g) => {
    const w = Math.floor((avail * (g.weight ?? 1)) / total);
    const out = { left: x, w };
    x += w + GAP;
    return out;
  });
}

/** Lets a long command or URL wrap after its slashes, queries and equals signs instead of in the middle of a word. */
const soft = (t: string): string => t.replace(/\/(?!\/)/g, "/\u200b").replace(/([?=&])/g, "$1\u200b");

const Chip: React.FC<{ tone: GateTone; children: string }> = ({ tone, children }) => {
  const bad = tone === "bad";
  return (
    <div
      style={{
        boxSizing: "border-box",
        alignSelf: "flex-start",
        padding: "0 14px",
        height: 40,
        display: "flex",
        alignItems: "center",
        borderRadius: 8,
        border: `1.5px solid ${bad ? theme.bad : theme.ok}`,
        background: bad ? `${theme.hatchBad}, ${theme.badWash}` : theme.okWash,
        fontFamily: fonts.mono,
        fontSize: 26,
        lineHeight: 1,
        color: bad ? theme.bad : theme.ok,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/** A horizontal stretch of the rail: solid or dashed. */
const Rail: React.FC<{ left: number; width: number; dashed: boolean }> = ({ left, width, dashed }) =>
  width <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left,
        top: RAIL_Y - LINE / 2,
        width,
        height: LINE,
        background: dashed ? `repeating-linear-gradient(90deg, ${theme.ink3} 0 10px, transparent 10px 20px)` : theme.ink2,
      }}
    />
  );

export const DefensePath: React.FC<DefensePathProps> = ({ width, start, gates }) => {
  const geo = geometry(width, gates);
  const barX = (i: number): number => geo[i].left - GAP / 2 - BAR_W / 2;
  // the rail is solid until the first gate that stopped something, dashed after it
  const firstStop = gates.findIndex((g) => g.state === "stopped");
  const solidEnd = firstStop < 0 ? width : barX(firstStop);
  return (
    <div style={{ position: "relative", width, height: "100%" }}>
      {/* the rail */}
      <Rail left={START_W - 8} width={solidEnd - (START_W - 8)} dashed={false} />
      {firstStop >= 0 ? <Rail left={solidEnd + BAR_W} width={width - solidEnd - BAR_W} dashed /> : null}

      {/* the page: where the packet starts */}
      <div style={{ position: "absolute", left: 0, top: RAIL_Y - 30, width: START_W - 20, textAlign: "left" }}>
        <div
          style={{
            width: 46,
            height: 60,
            boxSizing: "border-box",
            borderRadius: 6,
            border: `2px solid ${theme.ink2}`,
            background: theme.sheet,
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {[1, 0.85, 0.6].map((w) => (
            <div key={w} style={{ height: 4, width: `${w * 100}%`, background: theme.ink3, borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ fontFamily: fonts.serif, fontSize: 34, color: theme.ink, marginTop: 10 }}>{start}</div>
      </div>
      {/* the packet leaving the page */}
      <div style={{ position: "absolute", left: START_W - 40, top: RAIL_Y - PACKET / 2, width: PACKET, height: PACKET, borderRadius: 6, background: theme.ink2 }} />

      {gates.map((g, i) => {
        const x = barX(i);
        const stopped = g.state === "stopped";
        const idle = g.state === "idle";
        return (
          <React.Fragment key={g.title}>
            {g.state === "through" ? (
              <div
                style={{
                  position: "absolute",
                  left: x + BAR_W / 2 - 17,
                  top: RAIL_Y - 17,
                  width: 34,
                  height: 34,
                  boxSizing: "border-box",
                  borderRadius: 17,
                  border: `4px solid ${theme.ok}`,
                  background: theme.paper,
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: RAIL_Y - BAR_H / 2,
                  width: BAR_W,
                  height: BAR_H,
                  boxSizing: "border-box",
                  borderRadius: 3,
                  border: `2px solid ${stopped ? theme.bad : theme.ink3}`,
                  background: stopped ? `${theme.hatchBad}, ${theme.badWash}` : theme.paper,
                }}
              />
            )}
            {stopped ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: x - PACKET - 6,
                    top: RAIL_Y - PACKET / 2,
                    width: PACKET,
                    height: PACKET,
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: `2px solid ${theme.bad}`,
                    background: `${theme.hatchBad}, ${theme.badWash}`,
                  }}
                />
                {g.packet ? (
                  <div
                    style={{
                      position: "absolute",
                      left: x - 190,
                      width: 184 - PACKET,
                      top: RAIL_Y - PACKET / 2 - 36,
                      textAlign: "right",
                      fontFamily: fonts.mono,
                      fontSize: 26,
                      color: theme.bad,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.packet}
                  </div>
                ) : null}
              </>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: geo[i].left,
                top: RAIL_ZONE_H,
                width: geo[i].w,
                bottom: 0,
                boxSizing: "border-box",
                padding: "14px 18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderRadius: 12,
                border: `1px solid ${stopped ? alpha(theme.bad, 0.55) : theme.rule}`,
                background: alpha(theme.sheet, 0.92),
                boxShadow: theme.panelShadow,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Dot n={i + 1} size={36} />
                <div style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 1.05, color: theme.ink }}>{g.title}</div>
              </div>
              <div style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 1.15, color: theme.ink2 }}>
                {g.label.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
              <div style={{ flex: 1, fontFamily: fonts.mono, fontSize: 26, lineHeight: 1.22, color: idle ? theme.ink3 : theme.ink, overflowWrap: "anywhere" }}>{soft(g.evidence)}</div>
              <Chip tone={g.outcome.tone}>{g.outcome.word}</Chip>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
