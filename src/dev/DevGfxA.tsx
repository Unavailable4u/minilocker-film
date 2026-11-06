// DEV ONLY (patch 08). Plays the S3 containment explainer (src/gfx: ContainerBox, DecoyRack, EgressWall, Packet) over
// DEV_GFX_A_FRAMES frames, in the timing of BIBLE 6 S3 (scene frame = frame + 1500), using the sample evidence.
//   f60..108    the box draws
//   f75..150    six chips land, one per beat (non-root, read-only root, no capabilities, 128 processes, 512 MB, no route out)
//   f158..      the six decoy tiles rise (6 f apart)
//   f212, f252  the real canary.read events of the evidence light their tiles amber, each with its describe() ledger line
//   f270..300   the wall and the allowlist plaque draw
//   f300        the real egress.blocked event flies to the wall: hit at about f312, refused tag complete by about f325
//   f360        an ALLOWED packet passes the wall (a demo: the sample ledger has no egress.allowed event, a note says so)
//   f450..490   the teardown audit sweeps the box; f496 the stamp "real secrets in sandbox: 0" (throws unless that is measured as 0)
//   f540..585   the seal ring closes
// Stills worth taking:
//   npx remotion still src/index.ts DevGfxA out/qa/gfxa-chips.png   --frame=165   (box-chips-complete)
//   npx remotion still src/index.ts DevGfxA out/qa/gfxa-decoy.png   --frame=262   (decoy-read)
//   npx remotion still src/index.ts DevGfxA out/qa/gfxa-refused.png --frame=335   (packet-refused)
//   npx remotion still src/index.ts DevGfxA out/qa/gfxa-audit.png   --frame=515   (audit-stamp)
//   npx remotion still src/index.ts DevGfxA out/qa/gfxa-used.png    --frame=330 --props='{"specimenUsed":true}'   (the "used" look)
// Everything drawn comes from evidence.json through src/data/select.ts and from src/config/copy.ts. The only literals here are
// frame numbers, positions and developer notes.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { copy } from "../config/copy";
import { fonts, theme } from "../config/theme";
import { containerChips, selectInfra, selectTask } from "../data/select";
import { describe, measure } from "../lib/derive";
import { clamp01, signature } from "../lib/ease";
import { FontsReady } from "../lib/fonts";
import { BOX_W, ContainerBox, StampBox } from "../gfx/ContainerBox";
import { DecoyRack, decoyRackSize, type DecoyState, type DecoyTile } from "../gfx/DecoyRack";
import { EgressWall, packetProgress, type EgressPacket } from "../gfx/EgressWall";

export const DEV_GFX_A_FRAMES = 600;

export type DevGfxAProps = {
  /** Dev only: force the first decoy that was never read into the "used" state, to look at its hatching. */
  specimenUsed?: boolean;
};

const BOX = { x: 150, y: 240 };
const FROM_X = BOX.x + BOX_W; // packets leave at the box's right edge

const BOX_DRAW = 60;
const CHIP_FRAMES = [75, 90, 105, 120, 135, 150];
const REVEAL_START = 158;
const READ_START = 212;
const READ_STEP = 40;
const USED_AFTER_READ = 60;
const SPECIMEN_FRAME = 280;
const WALL_REVEAL = 270;
const BLOCK_START = 300;
const BLOCK_STEP = 70;
const ALLOW_START = 360;
const AUDIT_START = 450;
const AUDIT_FRAMES = 40;
const STAMP_START = 496;
const SEAL_START = 540;

const lin = (frame: number, start: number, len: number): number => clamp01((frame - start) / Math.max(1, len));

const note = (px: number, color: string): React.CSSProperties => ({ fontFamily: fonts.mono, fontSize: px, color, lineHeight: 1.3 });

const Scene: React.FC<DevGfxAProps> = ({ specimenUsed = false }) => {
  const frame = useCurrentFrame();
  const task = selectTask();
  const infra = selectInfra();
  const events = task.events;

  // decoys: the canary.seeded event names them, canary.read / canary.tripped say what happened
  const seeded = events.find((e) => e.type === "canary.seeded");
  if (!seeded) throw new Error("DevGfxA: evidence.task.events has no canary.seeded event");
  const items = (seeded.payload.items ?? []) as { id: string; label: string }[];
  const reads = events.filter((e) => e.type === "canary.read");
  const trips = events.filter((e) => e.type === "canary.tripped");
  const specimenId = specimenUsed ? items.find((it) => !reads.some((e) => e.payload.item === it.id))?.id : undefined;

  const tiles: DecoyTile[] = items.map((it, i) => {
    const readIdx = reads.findIndex((e) => e.payload.item === it.id);
    const tripIdx = trips.findIndex((e) => e.payload.item === it.id);
    const readFrame = readIdx >= 0 ? READ_START + READ_STEP * readIdx : Infinity;
    const usedFrame = tripIdx >= 0 ? readFrame + USED_AFTER_READ : it.id === specimenId ? SPECIMEN_FRAME : Infinity;
    const state: DecoyState = frame >= usedFrame ? "used" : frame >= readFrame ? "read" : "idle";
    const readEvent = readIdx >= 0 ? reads[readIdx] : undefined;
    const tripEvent = tripIdx >= 0 ? trips[tripIdx] : undefined;
    const lineSource = state === "used" && tripEvent ? tripEvent : readEvent;
    const lineStart = state === "used" && tripEvent ? usedFrame : readFrame;
    return {
      id: it.id,
      label: it.label,
      state,
      reveal: lin(frame, REVEAL_START + 6 * i, 16),
      stateProgress: state === "idle" ? 0 : lin(frame, state === "used" ? usedFrame : readFrame, 30),
      line: lineSource && frame >= readFrame ? describe(lineSource)?.text : undefined,
      lineProgress: lin(frame, lineStart + 6, 14),
    };
  });

  // egress: the real blocked events, then an allowed one (from the evidence when it has one, else a labelled dev demo)
  const blocked = events.filter((e) => e.type === "egress.blocked");
  const allowedEvent = events.find((e) => e.type === "egress.allowed");
  const allowedHosts = infra.egress.allowed_hosts;
  if (!allowedHosts || allowedHosts.length === 0) throw new Error("DevGfxA: evidence.infra.egress.allowed_hosts is missing or empty. Re-capture with \"npm run evidence\".");
  const demoAllowed = !allowedEvent;
  const allowedLabel = allowedEvent ? String(allowedEvent.payload.host) : allowedHosts[0];

  const packets: EgressPacket[] = [
    ...blocked.map((e, k) => ({
      y: 600 + 70 * k,
      progress: packetProgress(frame, BLOCK_START + BLOCK_STEP * k, FROM_X),
      label: String(e.payload.host),
      blocked: true,
    })),
    { y: 740, progress: packetProgress(frame, ALLOW_START, FROM_X), label: allowedLabel, blocked: false },
  ];

  // the audit stamp: only if the audit measured the inside and found 0 real secrets (BIBLE 6 S3)
  const m = measure(events);
  if (!m.audited || !m.scanned) throw new Error("DevGfxA: the sandbox audit did not scan the inside, so \"real secrets in sandbox\" is not measured");
  if (m.realSecrets.length !== 0) throw new Error(`DevGfxA: the audit found real secrets in the sandbox (${m.realSecrets.join(", ")}). Stop: this film must not be rendered.`);

  const rack = decoyRackSize(tiles.length);

  return (
    <AbsoluteFill style={{ background: `${theme.appBackground}, ${theme.stageGradient}`, backgroundSize: `${theme.appBackgroundSize}, auto` }}>
      <div style={{ position: "absolute", left: 40, top: 30, ...note(20, theme.ink2) }}>DevGfxA · patch 08 · dev only · frame {frame}</div>

      <ContainerBox
        x={BOX.x}
        y={BOX.y}
        chips={containerChips(copy.s3.chips)}
        chipProgress={CHIP_FRAMES.map((f) => lin(frame, f, 14))}
        drawProgress={lin(frame, BOX_DRAW, 48)}
        sealProgress={lin(frame, SEAL_START, 45)}
        auditProgress={signature(lin(frame, AUDIT_START, AUDIT_FRAMES))}
        stamp={<StampBox tone="ok">{`${copy.gfxA.stampSecrets}: ${m.realSecrets.length}`}</StampBox>}
        stampProgress={lin(frame, STAMP_START, 14)}
      >
        <DecoyRack
          x={(BOX_W - rack.w) / 2}
          y={80}
          tiles={tiles}
          stateLabels={{ idle: copy.gfxA.decoyIdle, read: copy.gfxA.decoyRead, used: copy.gfxA.decoyUsed }}
          dim={lin(frame, STAMP_START - 8, 10)}
        />
      </ContainerBox>

      <EgressWall
        fromX={FROM_X}
        allowedHosts={allowedHosts}
        plaqueTitle={copy.gfxA.allowlist}
        proxyLabel={infra.egress.proxy}
        refusedLabel={copy.gfxA.refused}
        packets={packets}
        reveal={lin(frame, WALL_REVEAL, 30)}
      />

      <div style={{ position: "absolute", left: 40, bottom: 30, ...note(20, theme.ink3) }}>
        {demoAllowed ? "dev demo: the sample ledger has no egress.allowed event, so the allowed packet is not evidence" : null}
        {specimenId ? <div>dev specimen: one never-read decoy is forced to the used state</div> : null}
      </div>
    </AbsoluteFill>
  );
};

export const DevGfxA: React.FC<DevGfxAProps> = (props) => (
  <FontsReady>
    <Scene {...props} />
  </FontsReady>
);
