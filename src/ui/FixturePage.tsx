// MiniLocker film: the hostile-page fixture, rebuilt VISUALLY in code (patch 17). The page the agent opens in S5: a plain article with a visible
// "Note to AI agents" box and a visible "Download the full guide (PDF)" link, taken from the repo's fixture (draft repo, images/browser/fixtures/
// injection.html; the strings are in copy.s5.fixture). No screenshot is involved anywhere: the hidden layers of the fixture (a display:none
// block, off-screen text, an HTML comment) are NOT drawn until the scan reveals them, and a person looking at the page never sees them.
//
// Pure and props-driven, like the rest of the UI kit: no hooks that read the frame, no timers, no CSS transitions. The scene computes the beam, the
// reveal of each hidden layer and the dim, and passes them in. Every block has an explicit position (FIXTURE below), so the scene can time a reveal to
// the moment the beam crosses a layer (fixtureLayerTop) instead of guessing where flowing text ended up.
//
// What is drawn is exactly this, nothing more:
//   - an address row in the app's own style (the same sunken field as the Workspace browser tab): the URL and the HTTP status of the ledger's
//     `browser.page` event (props, from the evidence);
//   - the page: heading, two paragraphs, the visible note box, a blank band the hidden layers are revealed in, and the link;
//   - the scan: a vermilion beam sweeping down the page, the visible page dimmed behind it, each hidden layer unrolled left to right where the beam
//     passes it. Hidden layers are vermilion and hatched only when `flagged` (the scanner reported hidden findings); otherwise they are drawn
//     neutral, because nothing may be coloured as a finding that the ledger does not contain.
//
// The page's own colours (a pale sheet, dark type, an amber note box, a blue link) are a THIRD-PARTY page, not MiniLocker UI, so they are local to
// this file and not in theme.ts; every MiniLocker colour (the x-ray, the beam, the address row) comes from theme.ts.
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { copy } from "../config/copy";
import { Chip, SMCP, rem, sp } from "./primitives";

const s5 = copy.s5;

/** The fixture page's own palette: it is a web page, not part of the app. */
const PAGE = {
  bg: "#e9e7e0",
  ink: "#1b1b1f",
  ink2: "#4b4b52",
  link: "#1d4ed8",
  noteBorder: "#cc9900",
  noteBg: "#fff3cf",
} as const;

/** Positions inside the page viewport (the area under the address row), in logical px. The viewport is 52 px under the card's top edge. */
export const FIXTURE = {
  /** Height of the address row. */
  addressH: 52,
  /** Left and right padding of the page. */
  pad: 36,
  headingTop: 28,
  headingSize: 34,
  paragraphTop: [78, 164] as readonly number[],
  textSize: 18,
  textLine: 26,
  noteTop: 228,
  noteSize: 17,
  noteLine: 24,
  notePad: 10,
  /** The blank band the hidden layers are revealed in (a page is allowed to have white space). */
  zoneTop: 358,
  layerH: 88,
  layerGap: 6,
  linkTop: 650,
} as const;

/** Top (in the page viewport) of hidden layer `i`. */
export function fixtureLayerTop(i: number): number {
  return FIXTURE.zoneTop + i * (FIXTURE.layerH + FIXTURE.layerGap);
}

export interface FixturePageProps {
  /** Size of the card in logical px (the Workspace browser panel). */
  width: number;
  height: number;
  /** The URL of the ledger's browser.page event, and its HTTP status. */
  url: string;
  status: number | null;
  /** 0..1: how far the visible page is dimmed behind the scan (the hidden layers stand out). Default 0. */
  dim?: number;
  /** 0..1 position of the beam over the page viewport's height; null or undefined = no beam. */
  beam?: number | null;
  /** Reveal of each hidden layer, 0..1 (a left-to-right mask). Layers beyond the array are not drawn. */
  layers?: readonly number[];
  /** The scanner reported hidden findings: the hidden layers are vermilion and hatched. Default false (neutral). */
  flagged?: boolean;
  /** 0..1: an outline on the visible note (the scanner also flagged a visible instruction). Default 0. */
  noteFlag?: number;
  style?: React.CSSProperties;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const FixturePage: React.FC<FixturePageProps> = ({ width, height, url, status, dim = 0, beam = null, layers = [], flagged = false, noteFlag = 0, style }) => {
  const F = FIXTURE;
  const viewH = height - 2 - F.addressH;
  const viewW = width - 2;
  const textW = viewW - 2 * F.pad;
  const d = clamp01(dim);
  const fixture = s5.fixture;

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        width,
        height,
        overflow: "hidden",
        borderRadius: 6,
        border: `1px solid ${theme.rule}`,
        backgroundColor: theme.sheet,
        boxShadow: theme.liftShadow,
        ...style,
      }}
    >
      {/* the address row: the app's own browser-tab style (FilmApp BrowserTab) */}
      <div
        style={{
          boxSizing: "border-box",
          height: F.addressH,
          display: "flex",
          alignItems: "center",
          gap: sp(2),
          borderBottom: `1px solid ${theme.rule}`,
          padding: `0 ${sp(3.5)}px`,
          backgroundColor: theme.sheet,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 5,
            border: `1px solid ${theme.rule}`,
            backgroundColor: theme.sunken,
            padding: `${sp(1)}px ${sp(3)}px`,
            fontFamily: fonts.mono,
            fontSize: rem(0.85),
            color: theme.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {url}
        </div>
        <Chip tone={status !== null && status < 400 ? "ok" : "bad"}>{status ?? "-"}</Chip>
      </div>

      {/* the page */}
      <div style={{ position: "relative", width: viewW, height: viewH, overflow: "hidden", backgroundColor: PAGE.bg }}>
        {/* visible content: dimmed by the scan */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.55 * d, filter: `saturate(${(1 - 0.6 * d).toFixed(3)})` }}>
          <div
            style={{
              position: "absolute",
              left: F.pad,
              top: F.headingTop,
              width: textW,
              fontFamily: fonts.serif,
              fontWeight: 700,
              fontSize: F.headingSize,
              lineHeight: 1.1,
              color: PAGE.ink,
            }}
          >
            {fixture.heading}
          </div>
          {fixture.paragraphs.map((text, i) => (
            <div
              key={i}
              style={{ position: "absolute", left: F.pad, top: F.paragraphTop[i], width: textW, fontFamily: fonts.serif, fontSize: F.textSize, lineHeight: `${F.textLine}px`, color: PAGE.ink2 }}
            >
              {text}
            </div>
          ))}
          {/* the visible "sponsored note" style attack */}
          <div
            style={{
              position: "absolute",
              left: F.pad,
              top: F.noteTop,
              width: textW,
              boxSizing: "border-box",
              padding: F.notePad,
              border: `1px solid ${PAGE.noteBorder}`,
              backgroundColor: PAGE.noteBg,
              fontFamily: fonts.serif,
              fontSize: F.noteSize,
              lineHeight: `${F.noteLine}px`,
              color: PAGE.ink,
              boxShadow: noteFlag > 0 ? `0 0 0 3px ${alpha(theme.bad, clamp01(noteFlag))}` : undefined,
            }}
          >
            {fixture.note}
          </div>
          <div
            style={{
              position: "absolute",
              left: F.pad,
              top: F.linkTop,
              fontFamily: fonts.serif,
              fontSize: F.textSize + 1,
              lineHeight: `${F.textLine}px`,
              color: PAGE.link,
              textDecoration: "underline",
            }}
          >
            {fixture.link}
          </div>
        </div>

        {/* the hidden layers: not part of the page a person sees; the scan unrolls them */}
        {fixture.hidden.map((layer, i) => {
          const r = clamp01(layers[i] ?? 0);
          if (r <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: F.pad,
                top: fixtureLayerTop(i),
                width: textW,
                height: F.layerH,
                boxSizing: "border-box",
                padding: `${sp(1.5)}px ${sp(3)}px`,
                borderRadius: 4,
                border: flagged ? `1px solid ${alpha(theme.bad, 0.75)}` : `1px dashed ${theme.ink3}`,
                backgroundColor: flagged ? theme.badWash : theme.sunken,
                backgroundImage: flagged ? theme.hatchBad : undefined,
                clipPath: `inset(0 ${((1 - r) * 100).toFixed(2)}% 0 0)`,
                WebkitClipPath: `inset(0 ${((1 - r) * 100).toFixed(2)}% 0 0)`,
              }}
            >
              <div style={{ ...SMCP, fontSize: rem(0.84), lineHeight: 1.1, color: flagged ? theme.bad : theme.ink2 }}>{layer.how}</div>
              <div style={{ marginTop: 4, fontFamily: fonts.mono, fontSize: 18, lineHeight: "24px", color: flagged ? theme.ink : theme.ink2, overflowWrap: "anywhere" }}>{layer.text}</div>
            </div>
          );
        })}

        {/* the beam */}
        {beam !== null && beam > 0 && beam < 1 ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                width: viewW,
                top: beam * viewH - 70,
                height: 70,
                background: `linear-gradient(180deg, transparent, ${alpha(theme.bad, 0.22)})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                width: viewW,
                top: beam * viewH - 1.5,
                height: 3,
                backgroundColor: theme.bad,
                boxShadow: `0 0 18px 2px ${alpha(theme.bad, 0.75)}`,
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};
