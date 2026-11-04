// S3Box (patches 14a, 14b): the hardened container of scene S3, ONE persistent object drawn from f1559 to the end of S3. It is not part of S3a / S3b / S3c
// because all three act on it: 14a draws it and its six chips and plants the decoys; 14b turns the decoy tiles amber (the reads) and writes the
// module's name in the module band; 14c runs the audit line, the stamp and the sealing ring over it. Those patches resend THIS file (every addition
// is marked "14b" / "14c" below) and leave S3a untouched.
//
// The box has a backing panel (a near-opaque graphite rounded rectangle under the ContainerBox): over the app, dimmed and blurred, the app's own
// text still shows through ContainerBox's 60 % interior, and a blurred terminal line between two decoy tiles reads as noise.
//
// 14b: the module plate (`ModulePlate`, box-local, in the module band) names the hostile module from f1682; each real `canary.read` of the ledger turns
// its tile amber on the frame `s3ReadFrames` gives it, with the real ledger line under the tile; the plate answers every read with a short amber pulse
// and, when the packet leaves it (`s3PacketStart`), a short ink one. The wall, the packet and the readout are not here: they are S3b's.
//
// 14c: the teardown audit runs over the box. ContainerBox's audit line sweeps it (f1935-1965), its stamp "real secrets in sandbox: {n}" lands on the
// beat f1965 (n is `s3Data().audit.realSecretsInSandbox`, which data.ts guarantees is 0 and S3c re-checks), the rack and the plate step back behind
// it, the whole group is then pulled back to the strip left of the live gauges (`s3BoxPose`), the seal ring closes on it (f2040-2066) and it leaves
// (f2078-2094). The group is ONE wrapper: chips, ring, stamp and the attack tag all scale together.
import React from "react";
import { Badge, badgePulse, badgeReveal } from "../../fx/Badge";
import { alpha, fonts, theme } from "../../config/theme";
import { copy, gfxA } from "../../config/copy";
import { clamp01, signature, stepPulse } from "../../lib/ease";
import { STAGE } from "../../config/timeline";
import { BOX_H, BOX_RADIUS, BOX_W, ContainerBox, StampBox } from "../../gfx/ContainerBox";
import { DecoyRack, type DecoyTile } from "../../gfx/DecoyRack";
import type { SceneOverlayProps } from "../types";
import { s3Data, type S3Data } from "./data";
import {
  S3_BOX,
  S3_PLATE,
  S3_TIMING,
  s3AuditProgress,
  s3BoxDraw,
  s3BoxPose,
  s3ChipProgress,
  s3ContentOpacity,
  s3DecoyReveal,
  s3ModulePlate,
  s3PacketStart,
  s3Rack,
  s3ReadFrames,
  s3SealProgress,
  s3StampProgress,
  type S3ModulePlate,
} from "./shared";

/** 14b: how long the plate's pulses last. */
const PULSE_FRAMES = 14;

/** 14b: the hostile module's plate, box-local px. Drawn on from the left (a mask), then it only reacts: amber for a read, ink for the send. */
const ModulePlate: React.FC<{ frame: number; plate: S3ModulePlate; data: S3Data; readFrames: readonly number[]; sendFrame: number }> = ({ frame, plate, data, readFrames, sendFrame }) => {
  const m = S3_TIMING.module;
  const reveal = signature(clamp01((frame - m.from) / m.frames));
  if (reveal <= 0) return null;
  const read = readFrames.reduce((best, f) => Math.max(best, stepPulse(frame, f, PULSE_FRAMES)), 0);
  const send = stepPulse(frame, sendFrame, PULSE_FRAMES);
  const border = read > 0.01 ? alpha(theme.warn, 0.35 + 0.65 * read) : send > 0.01 ? alpha(theme.ink, 0.35 + 0.65 * send) : theme.rule2;
  const glow = read > 0.01 ? `0 0 ${20 * read}px ${alpha(theme.warn, 0.35 * read)}` : send > 0.01 ? `0 0 ${16 * send}px ${alpha(theme.ink, 0.2 * send)}` : "none";
  return (
    <div
      style={{
        position: "absolute",
        left: plate.x,
        top: plate.y,
        width: plate.w,
        height: plate.h,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        padding: `0 ${S3_PLATE.padX}px`,
        borderRadius: 10,
        border: `1.5px solid ${border}`,
        background: theme.raised,
        boxShadow: glow,
        whiteSpace: "nowrap",
        clipPath: `inset(-24px ${(1 - reveal) * 100}% -24px -24px)`,
      }}
    >
      <span style={{ fontFamily: fonts.mono, fontSize: S3_PLATE.nameSize, lineHeight: 1.2, color: theme.ink }}>{data.module.name}</span>
      {data.module.blurb ? (
        <>
          <span style={{ width: 1, height: 22, margin: `0 ${S3_PLATE.gap}px`, background: theme.rule2 }} />
          <span style={{ fontFamily: fonts.mono, fontSize: S3_PLATE.blurbSize, lineHeight: 1.25, color: theme.ink3 }}>{data.module.blurb}</span>
        </>
      ) : null}
    </div>
  );
};

export const S3Box: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S3_TIMING.box.drawFrom - 1) return null;
  if (frame >= S3_TIMING.exit.from + S3_TIMING.exit.frames) return null; // 14c: the sealed box has left
  const data = s3Data();
  const rack = s3Rack(data.decoys.length);
  const draw = s3BoxDraw(frame);

  // 14a: every decoy is planted (graphite). 14b: a tile whose canary.read has landed is "read" (amber) with its ledger line.
  const readFrames = s3ReadFrames(data.reads);
  const r = S3_TIMING.reads;
  const tiles: DecoyTile[] = data.decoys.map((d, i) => {
    const base = { id: d.id, label: d.label, reveal: s3DecoyReveal(frame, i) };
    const k = data.reads.findIndex((x) => x.decoy === i);
    if (k < 0 || frame < readFrames[k]) return { ...base, state: "idle" };
    const at = readFrames[k];
    return {
      ...base,
      state: "read",
      stateProgress: clamp01((frame - at) / r.stateFrames),
      line: data.reads[k].line,
      lineProgress: clamp01((frame - at - r.lineDelay) / r.lineFrames),
    };
  });

  const plate = s3ModulePlate(data.decoys.length, data.module.name, data.module.blurb);
  const sendFrame = s3PacketStart(plate.stageRight);

  // 14c: the stamp's number is the audit's own count; a real secret inside would have stopped the build in data.ts, and is re-checked here
  // because this is the line the film must never get wrong.
  const secrets = data.audit.realSecretsInSandbox;
  if (secrets !== 0) throw new Error(`S3: the audit stamp would read ${secrets}; the film must not show a stamp for a sandbox that held real secrets`);
  const pose = s3BoxPose(frame);
  const moved = pose.scale !== 1 || pose.tx !== 0 || pose.ty !== 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: STAGE.w,
        height: STAGE.h,
        transformOrigin: "0 0",
        transform: moved ? `translate(${pose.tx.toFixed(3)}px, ${pose.ty.toFixed(3)}px) scale(${pose.scale.toFixed(5)})` : undefined,
        opacity: pose.opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: S3_BOX.x,
          top: S3_BOX.y,
          width: BOX_W,
          height: BOX_H,
          borderRadius: BOX_RADIUS,
          background: alpha(theme.paper, 0.86),
          opacity: draw,
          pointerEvents: "none",
        }}
      />
      <ContainerBox
        x={S3_BOX.x}
        y={S3_BOX.y}
        chips={copy.s3.chips}
        chipProgress={s3ChipProgress(frame)}
        drawProgress={draw}
        auditProgress={s3AuditProgress(frame)}
        sealProgress={s3SealProgress(frame)}
        stampProgress={s3StampProgress(frame)}
        stamp={<StampBox tone="ok" size={40}>{`${gfxA.stampSecrets}: ${secrets}`}</StampBox>}
      >
        {/* 14c: the rack and the plate step back while the stamp lands (one wrapper, so the tiles' own states are untouched) */}
        <div style={{ position: "absolute", left: 0, top: 0, width: BOX_W, height: BOX_H, opacity: s3ContentOpacity(frame) }}>
          <DecoyRack x={rack.x} y={rack.y} tiles={tiles} stateLabels={{ idle: gfxA.decoyIdle, read: gfxA.decoyRead, used: gfxA.decoyUsed }} />
          <ModulePlate frame={frame} plate={plate} data={data} readFrames={readFrames} sendFrame={sendFrame} />
        </div>
      </ContainerBox>

      {/* when S3 is built from the Attack Lab run (evidence.s3Source): its tag, in the row of the three top chips, right of "no capabilities" (stage y 118-160, inside the safe margin) */}
      {data.tag && (
        <div style={{ position: "absolute", left: S3_BOX.x + 900, top: S3_BOX.y - 72, display: "flex" }}>
          <Badge label={data.tag} tone="mute" dot={false} reveal={badgeReveal(frame, S3_TIMING.box.drawFrom + 6)} pulse={badgePulse(frame)} />
        </div>
      )}
    </div>
  );
};
