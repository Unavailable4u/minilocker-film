// Slide 06 · Bait, not secrets. Claim: "Bait, not secrets." (copy.s3.captionBait).
// Left: the DecoyRack, 3 x 2, in the state the film leaves it in (the decoys the module read are amber, with the ledger's own line under them), the
// Report's Secrets-card line, the audit stamp and two measured numerals. Right: E4, the attempt table built from the hostile module's own log, with a
// live crop of the app's terminal showing that same log as the proof. Everything is read from the evidence (src/deck/facts.ts, the film's S3 data).
// Wording rule: the decoys are worth nothing: "planted", "read", "used". Never "stolen".
import React from "react";
import { gfxA, s4 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { StampBox } from "../../gfx/ContainerBox";
import { DecoyRack, decoyRackSize, type DecoyTile } from "../../gfx/DecoyRack";
import { s3Data } from "../../scenes/s3/data";
import { hookAttempts, hookEscapes, realSecretRuns, secretsTally } from "../facts";
import { AttemptTable, attemptTableHeight } from "../gfx/AttemptTable";
import { DECK, Eyebrow, Numeral, Ratio, Slide, Tag, Title } from "../kit";
import { Shot } from "../Shot";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
const LEFT_W = 856;
const RIGHT_LEFT = 900;
const RIGHT_W = CONTENT_W - RIGHT_LEFT;
const TAGS_TOP = 172;
const RACK_TOP = 236;
/** the rack is laid out in its own px (996 wide), then scaled to the column */
const RACK_K = LEFT_W / decoyRackSize(6).w;
/** frame 1000: the terminal shows the poisoned module's log. Logical px of the app (1600 x 900); the eight log lines start at y 668 and the "[exit 2]" line is at y 842. */
const LOG = { at: 1000, crop: { x: 392, y: 656, w: 730, h: 198 } } as const;

export const S06: React.FC = () => {
  const data = s3Data();
  const attempts = hookAttempts();
  const tally = secretsTally();
  const runs = realSecretRuns();
  const escapes = hookEscapes();
  const of = s4.proof.checksOf;
  const w = W.s06;

  // the tiles as the film's S3 leaves them: planted (idle), or read with the real ledger line
  const tiles: DecoyTile[] = data.decoys.map((d, i) => {
    const r = data.reads.find((x) => x.decoy === i);
    return r ? { id: d.id, label: d.label, state: "read", stateProgress: 1, line: r.line, lineProgress: 1 } : { id: d.id, label: d.label, state: "idle" };
  });
  const rack = decoyRackSize(tiles.length);
  const rackH = Math.round((rack.h + rack.lineRoom) * RACK_K);
  const secretsTop = RACK_TOP + rackH + 4;
  const stampTop = secretsTop + 44;
  const numeralsTop = stampTop + 88;

  const logH = Math.round((RIGHT_W * LOG.crop.h) / LOG.crop.w);
  const tableTop = TAGS_TOP;
  const proofLabelTop = tableTop + attemptTableHeight(attempts.length) + 14;
  const shotTop = proofLabelTop + 42;

  return (
    <Slide n={6}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{w.kicker}</Eyebrow>
        <Title size={88}>{w.title}</Title>

        <div style={{ position: "absolute", left: 0, top: TAGS_TOP - 4, width: LEFT_W, display: "flex", gap: 20, alignItems: "center" }}>
          <Tag>{w.random}</Tag>
          <Tag>{w.alarm}</Tag>
        </div>

        <div style={{ position: "absolute", left: 0, top: RACK_TOP, width: rack.w, height: rack.h + rack.lineRoom, transform: `scale(${RACK_K})`, transformOrigin: "0 0" }}>
          <DecoyRack x={0} y={0} tiles={tiles} stateLabels={{ idle: gfxA.decoyIdle, read: gfxA.decoyRead, used: gfxA.decoyUsed }} />
        </div>

        <div style={{ position: "absolute", left: 0, top: secretsTop, fontFamily: fonts.mono, fontSize: 26, color: theme.ink2, whiteSpace: "nowrap" }}>
          <b style={{ color: theme.ink }}>{tally.planted}</b> {w.secretsLine.planted} · <b style={{ color: theme.warn }}>{tally.read}</b> {w.secretsLine.read} ·{" "}
          <b style={{ color: theme.bad }}>{tally.used}</b> {w.secretsLine.used}
        </div>
        <div style={{ position: "absolute", left: 0, top: stampTop }}>
          <StampBox tone={tally.realInSandbox === 0 ? "ok" : "bad"} size={30}>{`${gfxA.stampSecrets}: ${tally.realInSandbox}`}</StampBox>
        </div>

        <div style={{ position: "absolute", left: 0, top: numeralsTop, display: "flex", gap: 48 }}>
          <Numeral tone="ok" value={<Ratio a={runs.withReal} of={of} b={runs.runs} />} label={w.realRuns} />
          <Numeral tone="ok" value={<Ratio a={escapes.escaped} of={of} b={escapes.runs} />} label={w.hookRuns} />
        </div>

        <div style={{ position: "absolute", left: RIGHT_LEFT, top: tableTop }}>
          <AttemptTable
            rows={attempts}
            width={RIGHT_W}
            heads={{ attempt: w.attemptHead, outcome: w.outcomeHead }}
            words={{ read: w.readDecoy, refused: gfxA.refused }}
          />
        </div>

        <div style={{ position: "absolute", left: RIGHT_LEFT, top: proofLabelTop, height: 42, fontFamily: fonts.mono, fontSize: 28, color: theme.ink2 }}>{w.proof}</div>
        <div style={{ position: "absolute", left: RIGHT_LEFT, top: shotTop }}>
          <Shot at={LOG.at} crop={LOG.crop} width={RIGHT_W} style={{ height: logH }} />
        </div>
      </div>
    </Slide>
  );
};
