// S3b (f1680-1929) "It tried to phone home. Refused." (BIBLE 6, S3). Patch 14b: the middle third of S3.
//
// What this part does
//   - f1682-1698 the hostile module's plate is drawn on in the module band (S3Box.tsx), f1692-1752 each real `canary.read` of the ledger turns its tile
//     amber with its real ledger line (S3Box.tsx, frames from `s3ReadFrames`). THIS file owns the callout of that moment: "Reading one rings the alarm"
//     f1700-1776, its dot on the plate's right end, its chip right of the plate, inside the box.
//   - f1760-1790 the EgressWall draws on (wall x 1500, plaque on its right with `infra.egress.allowed_hosts` and the proxy line).
//   - f1796-1830 the packet leaves the module plate, labelled with the host of the real `egress.blocked` event, and touches the wall on the beat f1830:
//     shockwave, shards, the hatched tag "refused" over the host (EgressWall's own refusal).
//   - f1800-1928 caption "It tried to phone home. Refused." (highlight "Refused.").
//   - f1834-1870 the Network readout under the refusal: the app's own gauge (label "Network", its value counting up to the blocked count, its second line),
//     counted in stage space because the card in the dimmed app already shows the final value.
//   - f1840-1916 callout "Allowlist only", its dot on the wall just under the plaque, its chip right of the wall.
//   - f1912-1928 the wall, the tag and the readout leave together (a fade of the group), so 14c's caption at f1930 has the stage.
//
// Hand-offs. 14a ends holding `fullWindow` (padding 60); this part's one keyframe starts at f1680 (a slow 5 % push of the dimmed app behind the explainer,
// arriving f1920). 14c's first keyframe must start at f1930 or later and its overlay items at f1930 or later. The scrim and the box are assembled by S3Decoys.tsx.
//
// Space plan (stage px). Plate: x 212-852 (sample), y 724-768 (packets fly along its middle, S3_EGRESS.packetY = 746). Alarm chip: x 880-1236, y 720-773, inside the box.
// Wall x 1500, plaque x 1530-1823, y 212-~416 (three hosts and a proxy line). "Allowlist only": dot on the wall at y ~460, chip x 1560-1787. Refusal tag
// (centred on x 1492, y packetY - 134 to packetY - 56) is clear of the plaque. Readout: x 1536-~1764, y 718-~874. The caption's ink starts at y ~905.
import React from "react";
import { Callout } from "../../fx/Callout";
import { Caption } from "../../fx/Caption";
import { StatNumeral } from "../../fx/StatNumeral";
import { kf, type CameraKeyframe, type CursorWaypoint } from "../../config/camera";
import { copy, gfxA } from "../../config/copy";
import { alpha, fonts, theme } from "../../config/theme";
import { CUES } from "../../config/timeline";
import { clamp01, signature } from "../../lib/ease";
import { EGRESS_WALL_X, EgressWall, packetProgress } from "../../gfx/EgressWall";
import type { SceneOverlayProps } from "../types";
import { s3Data } from "./data";
import { S3_EGRESS, S3_TIMING, s3ModulePlate, s3PacketStart } from "./shared";

const s3 = copy.s3;

// ---------------------------------------------------------------------------------------------- timing

export const S3B_TIMING = {
  /** "Reading one rings the alarm" (CUES.s3.calloutAlarm): up as the first read lands, gone before the wall is complete. */
  alarm: { start: CUES.s3.calloutAlarm, end: 1776 },
  /** The wall (and its plaque) draw on: 30 frames, a beat before the packet leaves. */
  wall: { from: 1760, frames: 30 },
  /** "It tried to phone home. Refused." (CUES.s3.captionPhoneHome): up while the packet flies, gone before 14c's caption at f1930. */
  caption: { start: CUES.s3.captionPhoneHome, end: 1928 },
  /** "Allowlist only" (CUES.s3.calloutAllowlist). */
  allowlist: { start: CUES.s3.calloutAllowlist, end: 1916 },
  /** The Network readout: revealed `after` frames after the hit over `reveal` frames; its number counts from `countAfter` over `count` frames. */
  readout: { after: 4, reveal: 12, countAfter: 8, count: 24 },
  /** The wall, the packet's tag and the readout leave together (a fade of the group) over the last 16 frames of this part. */
  exit: { from: 1912, frames: 16 },
  /** The slow push of the dimmed app behind the explainer. */
  push: { from: 1680, frames: 240, bias: 1.05 },
  /** The last frame 14b draws on. 14c's first camera keyframe and first overlay item start at f1930 or later. */
  partEnd: 1929,
} as const;

// ---------------------------------------------------------------------------------------------- camera

/** One keyframe: the explainer is stage space, so only the dimmed app moves (5 % in over 240 frames); 14c's first keyframe starts at f1930. */
export const S3B_CAMERA: readonly CameraKeyframe[] = [
  kf(S3B_TIMING.push.from, "fullWindow", { padding: 60, scaleBias: S3B_TIMING.push.bias, ease: "signature", frames: S3B_TIMING.push.frames }),
];

/** No cursor in S3. */
export const S3B_CURSOR: readonly CursorWaypoint[] = [];

// ---------------------------------------------------------------------------------------------- layout

/** EgressWall's defaults: the wall runs y 200-880, the plaque's top is 12 px under it. */
const WALL_TOP = 200;
const PLAQUE_Y = WALL_TOP + 12;
/** The Network readout (stage px): its left edge is 36 px right of the wall, under the refusal tag (which ends at packetY - 56). */
const READOUT = { x: EGRESS_WALL_X + 36, y: S3_EGRESS.packetY - 28 } as const;

/** Bottom of the allowlist plaque: padding, heading, the proxy line (if any), the divider, 32 px per host, padding, border; +6 px of slack for the estimates. */
function plaqueBottom(hosts: number, hasProxy: boolean): number {
  return PLAQUE_Y + (hasProxy ? 102.4 : 74.4) + 32 * hosts + 6;
}

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  const t = S3B_TIMING;
  if (!(t.alarm.start > S3_TIMING.partEnd && t.push.from > S3_TIMING.partEnd)) throw new Error("S3b: the first item and the first keyframe must start after 14a's last frame (f1679)");
  if (!(t.wall.from + t.wall.frames <= S3_TIMING.send.hit)) throw new Error("S3b: the wall must be drawn before the packet reaches it");
  if (!(t.caption.end <= t.exit.from + t.exit.frames && t.exit.from + t.exit.frames <= t.partEnd)) throw new Error("S3b: the caption and the group's exit must be over by the end of this part");
  if (!(t.allowlist.end <= t.exit.from + 4)) throw new Error("S3b: 'Allowlist only' must be gone as the group leaves");
  if (!(S3_TIMING.reads.to + 30 <= S3_TIMING.send.hit)) throw new Error("S3b: the last read must have lit its tile before the packet's hit");
  s3Data(); // throws now, naming what is missing, if the evidence cannot support S3
})();

// ---------------------------------------------------------------------------------------------- the Network readout

const Readout: React.FC<{ frame: number; hit: number }> = ({ frame, hit }) => {
  const r = S3B_TIMING.readout;
  const net = s3Data().network;
  const p = signature(clamp01((frame - (hit + r.after)) / r.reveal));
  if (p <= 0) return null;
  // the gauge's own second line is "blocked . N allowed . N host(s)": its first word is the unit of the number, the rest is the line under it
  const parts = net.sub.split(" · ");
  const unit = parts.length > 1 ? parts[0] : undefined;
  const rest = parts.length > 1 ? parts.slice(1).join(" · ") : net.sub;
  return (
    <div style={{ position: "absolute", left: READOUT.x, top: READOUT.y, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
      <div
        style={{
          boxSizing: "border-box",
          padding: "12px 18px 14px",
          border: `1.5px solid ${theme.rule2}`,
          borderRadius: 10,
          background: alpha(theme.sheet, 0.94),
          boxShadow: theme.panelShadow,
        }}
      >
        <div style={{ fontFamily: fonts.serif, fontSize: 22, fontVariantCaps: "all-small-caps", letterSpacing: "0.08em", fontWeight: 500, lineHeight: 1.2, color: theme.ink2 }}>{net.label}</div>
        <div style={{ marginTop: 4 }}>
          <StatNumeral value={net.blocked} unit={unit} startFrame={hit + r.countAfter} durationFrames={r.count} size={64} color={theme.bad} />
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 20, lineHeight: 1.3, color: theme.ink3, marginTop: 6 }}>{rest}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the overlay

export const S3b: React.FC<SceneOverlayProps> = ({ frame }) => {
  const t = S3B_TIMING;
  if (frame < t.alarm.start || frame >= t.partEnd) return null;
  const data = s3Data();
  const plate = s3ModulePlate(data.decoys.length, data.module.name, data.module.blurb);
  const fromX = plate.stageRight;
  const start = s3PacketStart(fromX);
  const hit = S3_TIMING.send.hit;

  const groupOut = 1 - signature(clamp01((frame - t.exit.from) / t.exit.frames));
  const showGroup = frame >= t.wall.from && frame < t.exit.from + t.exit.frames;

  // "Allowlist only": the dot on the wall, a little under the plaque; the chip is right of the wall, clear of the plaque and of the refusal tag
  const allowAt = { x: EGRESS_WALL_X, y: Math.round(plaqueBottom(data.allowedHosts.length, !!data.proxy) + 44) };

  return (
    <>
      <Callout
        text={s3.calloutAlarm}
        variant="flag"
        target={{ x: plate.stageRight, y: plate.stageMidY }}
        side="right"
        lead={28}
        startFrame={t.alarm.start}
        endFrame={t.alarm.end}
      />

      {showGroup && (
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: groupOut, pointerEvents: "none" }}>
          <EgressWall
            fromX={fromX}
            allowedHosts={data.allowedHosts}
            plaqueTitle={gfxA.allowlist}
            proxyLabel={data.proxy}
            refusedLabel={gfxA.refused}
            packets={[{ y: S3_EGRESS.packetY, progress: packetProgress(frame, start, fromX), label: data.blocked.host, blocked: true }]}
            reveal={clamp01((frame - t.wall.from) / t.wall.frames)}
          />
          <Readout frame={frame} hit={hit} />
        </div>
      )}

      <Caption text={s3.captionPhoneHome} highlight="Refused." startFrame={t.caption.start} endFrame={t.caption.end} />
      <Callout text={s3.calloutAllowlist} variant="ok" target={allowAt} side="right" lead={60} startFrame={t.allowlist.start} endFrame={t.allowlist.end} />
    </>
  );
};
