// EgressWall: the allowlisting proxy drawn as a vertical wall (patch 08, BIBLE 11 A).
//
// - A full-stage layer (1920 x 1080 px, absolute, inset 0): every coordinate is in STAGE px. Put it above the app and the box.
// - Pure and props-driven: nothing reads the frame. A scene gives each packet a `progress` = distance travelled / route length,
//   and gets the BIBLE speed (PACKET_PX_PER_FRAME = 18) from `packetProgress(frame, startFrame, fromX, toX)`.
//   Progress is NOT clamped at 1: after the route it keeps growing, so a refusal keeps playing and its tag stays.
// - A packet flies from `fromX` (the container's right edge) towards `toX` along its `y`.
//     allowed: crosses the wall (the gate lights blue where it passes) and fades out near `toX`.
//     blocked: stops at the wall. Impact = shockwave ring (radius 0 -> 140 in 12 f), 24 seeded shards, a short wall flash and a
//              hatched "refused" tag with the host. The impact is drawn only on the container's side of the wall.
// - Every word is a prop: the allowed hosts (infra.egress.allowed_hosts), each packet label (an evidence host), the plaque
//   title and the refused word (copy.gfxA), the proxy line (infra.egress.proxy, optional).
import React, { useId } from "react";
import { alpha, fonts, hatch, theme } from "../config/theme";
import { clamp01, signature } from "../lib/ease";
import { estimateWidth, MONO_ADVANCE } from "../fx/util";
import { mixSeed, rand } from "../lib/prng";
import { STAGE } from "../config/timeline";
import { Packet, PACKET_SIZE, PACKET_STREAK } from "./Packet";

/** BIBLE 11 A: packets fly at 18 px per frame, linear. */
export const PACKET_PX_PER_FRAME = 18;
export const SHOCKWAVE_FRAMES = 12;
export const SHOCKWAVE_RADIUS = 140;
export const SHARD_COUNT = 24;
export const SHARD_LIFE_FRAMES = 24;
export const EGRESS_WALL_X = 1500;
export const EGRESS_TO_X = 1800;

const WALL_GAP = 7; // the wall is two hairlines, WALL_GAP px either side of its centre
const LINE = 1.5;
const LADDER_STEP = 22;
const TAG_LIFT = 56; // px between the impact and the bottom of the tag
const TAG_RISE_FROM = 3; // frames after the hit
const TAG_RISE_FRAMES = 10;
const PASS_FRAMES = 14;
const FADE_PX = 90;

export interface EgressPacket {
  /** Stage y of the flight line. */
  y: number;
  /** Distance travelled / route length (use packetProgress). Not clamped at 1. */
  progress: number;
  /** Evidence host shown with the packet, and in the refused tag when blocked. */
  label: string;
  blocked: boolean;
}

export interface EgressWallProps {
  /** Centre line of the wall. Default 1500 (BIBLE 11 A). */
  wallX?: number;
  top?: number;
  bottom?: number;
  /** Where packets leave the container (its right edge, stage x). */
  fromX: number;
  /** Where an allowed packet has left the picture. Default 1800. */
  toX?: number;
  /** infra.egress.allowed_hosts. */
  allowedHosts: readonly string[];
  /** Plaque heading (copy.gfxA.allowlist). */
  plaqueTitle: string;
  /** Optional mono line under the heading (infra.egress.proxy). */
  proxyLabel?: string;
  /** The word on the hatched tag (copy.gfxA.refused). */
  refusedLabel: string;
  packets: readonly EgressPacket[];
  /** 0..1: the wall draws top to bottom and the plaque is revealed. Default 1. */
  reveal?: number;
  /** Seed of the shard bursts (mixed with the packet index). Default 8. */
  seed?: number;
}

/** progress of a packet that started at `startFrame`, at the BIBLE speed. Not clamped at 1; 0 before the start. */
export function packetProgress(frame: number, startFrame: number, fromX: number, toX: number = EGRESS_TO_X): number {
  const route = Math.max(1, toX - fromX);
  return Math.max(0, ((frame - startFrame) * PACKET_PX_PER_FRAME) / route);
}

/** First frame at which a packet that started at `startFrame` touches the wall (blocked) or reaches it (allowed). */
export function packetWallFrame(startFrame: number, fromX: number, wallX: number = EGRESS_WALL_X): number {
  return startFrame + Math.max(0, wallX - PACKET_SIZE - WALL_GAP - fromX) / PACKET_PX_PER_FRAME;
}

interface Shard {
  angle: number; // radians
  speed: number; // px per frame
  spin: number; // degrees per frame
  len: number;
  color: string;
}

function makeShards(seed: number): Shard[] {
  const out: Shard[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const s = mixSeed(seed, i);
    const pick = rand(mixSeed(s, 5));
    out.push({
      // a fan facing away from the wall (the shards stay on the container's side)
      angle: Math.PI + (rand(mixSeed(s, 1)) - 0.5) * Math.PI * 1.15,
      speed: 3 + 6 * rand(mixSeed(s, 2)),
      spin: (rand(mixSeed(s, 3)) - 0.5) * 28,
      len: 8 + 10 * rand(mixSeed(s, 4)),
      color: pick < 0.6 ? theme.bad : pick < 0.85 ? theme.ink : theme.ink3,
    });
  }
  return out;
}

const TAG_H = 78;

export const EgressWall: React.FC<EgressWallProps> = ({
  wallX = EGRESS_WALL_X,
  top = 200,
  bottom = 880,
  fromX,
  toX = EGRESS_TO_X,
  allowedHosts,
  plaqueTitle,
  proxyLabel,
  refusedLabel,
  packets,
  reveal = 1,
  seed = 8,
}) => {
  const uid = useId().replace(/:/g, "");
  const r = signature(clamp01(reveal));
  const wallLen = bottom - top;
  const route = Math.max(1, toX - fromX);
  const contactDist = Math.max(0, wallX - PACKET_SIZE - WALL_GAP - fromX);
  const crossDist = Math.max(0, wallX - fromX);
  const hx = wallX - WALL_GAP - 1; // impact point on the wall's near face

  // ladder ticks drawn down to the revealed length
  const ladder: number[] = [];
  for (let ly = top + LADDER_STEP; ly < bottom; ly += LADDER_STEP) if (ly - top <= wallLen * r) ladder.push(ly);

  // plaque geometry
  const hostW = allowedHosts.reduce((m, h) => Math.max(m, estimateWidth(h, 20, MONO_ADVANCE)), 0);
  const proxyW = proxyLabel ? estimateWidth(proxyLabel, 20, MONO_ADVANCE) : 0;
  const plaqueW = Math.round(Math.max(hostW + 22, proxyW, 150) + 40);
  const plaqueX = wallX + 30;
  const plaqueY = top + 12;
  const plaqueReveal = signature(clamp01((reveal - 0.3) / 0.7));

  // per-packet state
  const live: React.ReactNode[] = [];
  const fx: React.ReactNode[] = []; // on the wall (gate flashes, wall flash and mark, tag leaders)
  const near: React.ReactNode[] = []; // impact rings and shards: clipped to the container's side of the wall
  const tags: React.ReactNode[] = [];

  packets.forEach((pk, idx) => {
    const dist = Math.max(0, pk.progress) * route;
    if (dist <= 0) return;
    const streak = Math.min(PACKET_STREAK, dist);

    if (!pk.blocked) {
      const x = fromX + dist;
      const fade = clamp01((route - dist) / FADE_PX);
      if (dist < route) {
        live.push(<Packet key={`p${idx}`} x={x} y={pk.y} streak={streak} label={pk.label} opacity={fade} />);
      }
      const tCross = (dist - crossDist) / PACKET_PX_PER_FRAME;
      if (tCross >= 0 && tCross < PASS_FRAMES) {
        const k = 1 - tCross / PASS_FRAMES;
        fx.push(
          <rect key={`g${idx}`} x={wallX - 26} y={pk.y - 17} width={52} height={34} rx={6} fill={alpha(theme.okC, 0.3 * k)} stroke={alpha(theme.okC, 0.8 * k)} strokeWidth={LINE} />,
        );
      }
      return;
    }

    // blocked
    if (dist < contactDist) {
      live.push(<Packet key={`p${idx}`} x={fromX + dist} y={pk.y} streak={streak} label={pk.label} />);
      return;
    }
    const t = (dist - contactDist) / PACKET_PX_PER_FRAME; // frames since the hit
    const hy = pk.y;

    // wall flash and the mark the refusal leaves on the wall
    const flash = clamp01(1 - t / SHOCKWAVE_FRAMES);
    fx.push(
      <g key={`w${idx}`}>
        {flash > 0 ? <rect x={wallX - 16} y={hy - 110} width={32} height={220} fill={`url(#flash-${uid})`} opacity={0.65 * flash} /> : null}
        <rect x={wallX - WALL_GAP - 4} y={hy - 24} width={4} height={48} rx={2} fill={theme.bad} />
      </g>,
    );

    // shockwave rings
    if (t < SHOCKWAVE_FRAMES) {
      const tp = clamp01(t / SHOCKWAVE_FRAMES);
      const e = 1 - Math.pow(1 - tp, 3);
      near.push(<circle key={`r${idx}`} cx={hx} cy={hy} r={SHOCKWAVE_RADIUS * e} fill="none" stroke={theme.bad} strokeWidth={3.2 - 2 * tp} opacity={1 - tp} />);
    }
    const t2 = t - 3;
    if (t2 > 0 && t2 < SHOCKWAVE_FRAMES) {
      const tp = clamp01(t2 / SHOCKWAVE_FRAMES);
      const e = 1 - Math.pow(1 - tp, 3);
      near.push(<circle key={`r2${idx}`} cx={hx} cy={hy} r={(SHOCKWAVE_RADIUS * 0.7) * e} fill="none" stroke={theme.ink2} strokeWidth={1.5} opacity={0.7 * (1 - tp)} />);
    }

    // shards
    if (t < SHARD_LIFE_FRAMES) {
      const shards = makeShards(mixSeed(seed, idx));
      const o = clamp01(1 - t / SHARD_LIFE_FRAMES);
      shards.forEach((s, i) => {
        const px = hx + Math.cos(s.angle) * s.speed * t;
        const py = hy + Math.sin(s.angle) * s.speed * t;
        const deg = (s.angle * 180) / Math.PI + s.spin * t;
        near.push(
          <rect key={`s${idx}-${i}`} x={-s.len / 2} y={-1.4} width={s.len} height={2.8} fill={s.color} opacity={o} transform={`translate(${px} ${py}) rotate(${deg})`} />,
        );
      });
    }

    // refused tag
    const tagP = signature(clamp01((t - TAG_RISE_FROM) / TAG_RISE_FRAMES));
    if (tagP > 0) {
      const tagTop = hy - TAG_LIFT - TAG_H;
      fx.push(
        <line key={`l${idx}`} x1={hx} x2={hx} y1={hy - TAG_LIFT} y2={hy - TAG_LIFT + (TAG_LIFT - 10) * tagP} stroke={theme.bad} strokeWidth={LINE} />,
      );
      tags.push(
        <div
          key={`t${idx}`}
          style={{
            position: "absolute",
            left: hx,
            top: tagTop,
            transform: `translate(-50%, ${(1 - tagP) * 22}px)`,
            clipPath: `inset(${(1 - tagP) * 100}% 0 0 0)`,
          }}
        >
          <div
            style={{
              position: "relative",
              boxSizing: "border-box",
              height: TAG_H,
              padding: "9px 18px",
              border: `${LINE}px solid ${theme.bad}`,
              borderRadius: 8,
              background: theme.badWash,
              overflow: "hidden",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: hatch(theme.bad, 0.18) }} />
            <div
              style={{
                position: "relative",
                fontFamily: fonts.serif,
                fontSize: 24,
                fontVariantCaps: "all-small-caps",
                letterSpacing: "0.1em",
                fontWeight: 700,
                lineHeight: 1.15,
                color: theme.bad,
              }}
            >
              {refusedLabel}
            </div>
            <div style={{ position: "relative", fontFamily: fonts.mono, fontSize: 20, lineHeight: 1.3, color: theme.ink }}>{pk.label}</div>
          </div>
        </div>,
      );
    }
  });

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height: STAGE.h, pointerEvents: "none" }}>
      <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <clipPath id={`near-${uid}`}>
            <rect x={0} y={0} width={wallX - WALL_GAP} height={STAGE.h} />
          </clipPath>
          <linearGradient id={`flash-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.bad} stopOpacity="0" />
            <stop offset="0.5" stopColor={theme.bad} stopOpacity="1" />
            <stop offset="1" stopColor={theme.bad} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* the wall: two hairlines, a ladder between them, end plates */}
        <g opacity={r > 0 ? 1 : 0}>
          {[-WALL_GAP, WALL_GAP].map((dx) => (
            <line
              key={dx}
              x1={wallX + dx}
              x2={wallX + dx}
              y1={top}
              y2={bottom}
              stroke={theme.ink3}
              strokeWidth={LINE}
              strokeDasharray={`${wallLen * r} ${wallLen}`}
            />
          ))}
          {ladder.map((ly) => (
            <line key={ly} x1={wallX - WALL_GAP} x2={wallX + WALL_GAP} y1={ly} y2={ly} stroke={theme.rule2} strokeWidth={LINE} />
          ))}
          <rect x={wallX - 22} y={top - 7} width={44} height={7} rx={2} fill={theme.sunken} stroke={theme.ink3} strokeWidth={LINE} opacity={r} />
          <rect x={wallX - 22} y={bottom} width={44} height={7} rx={2} fill={theme.sunken} stroke={theme.ink3} strokeWidth={LINE} opacity={r} />
        </g>

        {/* plaque leader */}
        {plaqueReveal > 0 ? (
          <line x1={wallX + WALL_GAP} x2={wallX + WALL_GAP + (plaqueX - wallX - WALL_GAP) * plaqueReveal} y1={plaqueY + 26} y2={plaqueY + 26} stroke={theme.ink3} strokeWidth={LINE} />
        ) : null}

        {/* impacts stay on the container's side of the wall; gate flashes sit on it */}
        <g clipPath={`url(#near-${uid})`}>{near}</g>
        <g>{fx}</g>
      </svg>

      {/* allowlist plaque */}
      {plaqueReveal > 0 ? (
        <div
          style={{
            position: "absolute",
            left: plaqueX,
            top: plaqueY,
            width: plaqueW,
            clipPath: `inset(0 ${(1 - plaqueReveal) * 100}% 0 0)`,
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              padding: "12px 20px 14px",
              border: `${LINE}px solid ${theme.rule2}`,
              borderRadius: 10,
              background: alpha(theme.sheet, 0.94),
              boxShadow: theme.panelShadow,
            }}
          >
            <div style={{ fontFamily: fonts.serif, fontSize: 22, fontVariantCaps: "all-small-caps", letterSpacing: "0.08em", fontWeight: 500, lineHeight: 1.2, color: theme.ink2 }}>
              {plaqueTitle}
            </div>
            {proxyLabel ? (
              <div style={{ fontFamily: fonts.mono, fontSize: 20, lineHeight: 1.3, color: theme.ink3, marginTop: 2 }}>{proxyLabel}</div>
            ) : null}
            <div style={{ height: 1, background: theme.rule2, margin: "10px 0 8px" }} />
            {allowedHosts.map((h) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 12, height: 32, fontFamily: fonts.mono, fontSize: 20, color: theme.ink, whiteSpace: "nowrap" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, flex: "none", background: theme.ok }} />
                {h}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {live}
      {tags}
    </div>
  );
};
