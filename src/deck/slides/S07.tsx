// Slide 07 · Wipe, rewind, re-hash. Claim: "Real wipe. Real rewind. Real hashes." (copy.s4.captionReal), with "Undone, not erased." (copy.s4.calloutUndone)
// on the rewind's arc. Hero: E5, the three-panel storyboard (real work, everything gone, rewind) with one snapshot rail under it. Under the rail: the
// attack's own proof line for the delete. Bottom: the evidence strip (checks passed, ledger events verified, seconds to run) and a live crop of the
// Attack Lab's Contained verdict. Every hash, file name, command and number is read from the evidence (src/deck/facts.ts, the film's S4 data).
import React from "react";
import { gfxB, s4 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { rewindProof, rewindStory } from "../facts";
import { Storyboard3, STORY_RAIL_Y } from "../gfx/Storyboard3";
import { DECK, Eyebrow, Numeral, Ratio, Slide, Title } from "../kit";
import { Shot } from "../Shot";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const BODY_TOP = 150;
/** Hex of each hash the tile shows: the film's own 16 (the full 64 would be 947 px wide). The two full hashes are compared in the film's data layer. */
const HEX_SHOWN = 16;
/** frame 2900: the Attack Lab's verdict panel of the rewind attack. Logical px of the app (1600 x 900): the "Contained" banner spans x 623-1438, y 427-560. */
const VERDICT = { at: 2900, crop: { x: 615, y: 419, w: 831, h: 149 } } as const;
const VERDICT_W = 640;

export const S07: React.FC = () => {
  const story = rewindStory();
  const proof = rewindProof();
  const w = W.s07;
  const counter = `${story.files} ${story.files === 1 ? w.rehashedOne : w.rehashedMany} - ${w.allMatched}`;
  const railY = BODY_TOP + STORY_RAIL_Y;
  const stripTop = railY + 116;
  const verdictH = Math.round((VERDICT_W * VERDICT.crop.h) / VERDICT.crop.w);

  return (
    <Slide n={7}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{w.kicker}</Eyebrow>
        <Title size={88}>{w.title}</Title>

        <div style={{ position: "absolute", left: 0, top: BODY_TOP }}>
          <Storyboard3
            width={CONTENT_W}
            captions={w.captions as unknown as readonly [string, string, string]}
            file={story.file}
            wrote={{ word: w.wrote, path: story.writePath }}
            wipe={story.wipe}
            schematic={w.schematic}
            freshSandbox={gfxB.freshSandbox}
            hash={{
              snapshot: story.kept[story.kept.length - 1].hash,
              restored: story.restored.hash,
              hexShown: HEX_SHOWN,
              words: { snapshot: gfxB.snapshot, restored: gfxB.restored, mismatch: gfxB.mismatch },
            }}
            counter={counter}
            rail={{ kept: story.kept, discarded: story.discarded, restored: story.restored, nodeWord: gfxB.snapshot, rewoundLabel: gfxB.restoredInto }}
            undone={w.undone}
          />
        </div>

        {/* the attack's own proof line for the delete, read from its check */}
        <div style={{ position: "absolute", left: 0, top: railY + 58, width: 1180, fontFamily: fonts.serif, fontSize: 30, lineHeight: 1.2, color: theme.ink2 }}>
          <span style={{ color: theme.ink }}>{proof.label}:</span> <i>{proof.detail}</i>
        </div>

        <div style={{ position: "absolute", left: 0, top: stripTop - 12, width: CONTENT_W, height: 1, background: theme.rule }} />
        <div style={{ position: "absolute", left: 0, top: stripTop, display: "flex", gap: 56, alignItems: "flex-start", whiteSpace: "nowrap" }}>
          <Numeral tone="ok" value={<Ratio a={story.checks.passed} of={s4.proof.checksOf} b={story.checks.total} />} label={w.checks} />
          <Numeral value={story.ledger.events} label={w.events} />
          <Numeral value={<>{story.seconds.toFixed(2)}<span style={{ fontSize: 48, color: theme.ink3 }}> {w.secondsUnit}</span></>} label={w.seconds} />
        </div>

        <div style={{ position: "absolute", right: 0, top: stripTop - 8, width: VERDICT_W }}>
          <div style={{ height: 34, fontFamily: fonts.mono, fontSize: 24, color: theme.ink3 }}>{w.verdict}</div>
          <Shot at={VERDICT.at} crop={VERDICT.crop} width={VERDICT_W} style={{ height: verdictH }} />
        </div>
      </div>
    </Slide>
  );
};
