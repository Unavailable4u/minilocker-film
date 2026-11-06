// E3 · Cutaway (slide 05). The film's S3 end state on one page: the hardened container with its six chips, the planted decoys and the hostile module's
// plate inside, and to its right the egress wall with the allowlist plaque and ONE refused packet frozen just after it hit the wall.
//
// It is the film's own ContainerBox, DecoyRack and EgressWall at progress 1, laid out with the film's own geometry (src/scenes/s3/shared.tsx) so the two
// cannot disagree. Those components draw in STAGE px (1920 x 1080); here a stage rectangle (`CUTAWAY_REGION`) is scaled by `k` into slide px.
// Static and props-driven: nothing reads the frame. Every word and value is a prop: the chips (copy.s3.chips), the decoy labels (canary.seeded), the
// module (copy.s3 / the Attack Lab's title), the allowed hosts (infra.egress.allowed_hosts), the refused host (the egress.blocked event).
import React from "react";
import { alpha, fonts, theme } from "../../config/theme";
import { STAGE } from "../../config/timeline";
import { ContainerBox } from "../../gfx/ContainerBox";
import { DecoyRack, type DecoyState, type DecoyTile } from "../../gfx/DecoyRack";
import { EGRESS_WALL_X, EgressWall, packetProgress, packetWallFrame } from "../../gfx/EgressWall";
import { S3_BOX, S3_EGRESS, S3_PLATE, s3ModulePlate, s3Rack } from "../../scenes/s3/shared";

/** The part of the film's stage this drawing shows (stage px): from the left corner ticks to the plaque's right edge, from the top chips to the bottom chips. */
export const CUTAWAY_REGION = { x: 136, y: 108, w: 1700, h: 764 } as const;
/** The wall runs beside the box (EgressWall defaults to y 200-880, which would run past the bottom chips). */
export const CUTAWAY_WALL = { top: 190, bottom: 800 } as const;
/** Frames after the hit at which the refusal is frozen: the rings are gone, the shards are still in the air and the hatched tag has settled. */
const FROZEN_AFTER_HIT = 12;

export interface CutawayProps {
  /** Scale from stage px to slide px. */
  k: number;
  /** containerChips(copy.s3.chips) */
  chips: readonly string[];
  /** canary.seeded items (S3Data.decoys): id picks the icon, label is printed. */
  decoys: readonly { id: string; label: string }[];
  /** The hostile module's plate (S3Data.module). */
  module: { name: string; blurb: string | null };
  /** infra.egress.allowed_hosts and the proxy line. */
  allowedHosts: readonly string[];
  proxy?: string;
  /** The host of the egress.blocked event. */
  refusedHost: string;
  /** copy.gfxA.allowlist, copy.gfxA.refused, copy.gfxA.decoyIdle / decoyRead / decoyUsed. */
  plaqueTitle: string;
  refusedLabel: string;
  decoyWords: Record<DecoyState, string>;
}

/** A point of the film's stage as a point of the drawing's own box (slide px, origin at the box's top-left). */
export function cutawayPoint(p: { x: number; y: number }, k: number): { left: number; top: number } {
  return { left: (p.x - CUTAWAY_REGION.x) * k, top: (p.y - CUTAWAY_REGION.y) * k };
}

/** Size of the drawing in slide px. */
export function cutawaySize(k: number): { w: number; h: number } {
  return { w: Math.round(CUTAWAY_REGION.w * k), h: Math.round(CUTAWAY_REGION.h * k) };
}

/** Bottom of the allowlist plaque in stage px (EgressWall's plaque: padding, heading, the proxy line, 32 px per host; same estimate as the film's S3b). */
export function cutawayPlaqueBottom(hosts: number, hasProxy: boolean): number {
  return CUTAWAY_WALL.top + 12 + (hasProxy ? 102.4 : 74.4) + 32 * hosts + 6;
}

/** The hostile module's plate, at rest: the film's ModulePlate without its pulses. Box-local px. */
const Plate: React.FC<{ plate: ReturnType<typeof s3ModulePlate>; module: CutawayProps["module"] }> = ({ plate, module }) => (
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
      border: `1.5px solid ${alpha(theme.warn, 0.7)}`,
      background: theme.raised,
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ fontFamily: fonts.mono, fontSize: S3_PLATE.nameSize, lineHeight: 1.2, color: theme.ink }}>{module.name}</span>
    {module.blurb ? (
      <>
        <span style={{ width: 1, height: 22, margin: `0 ${S3_PLATE.gap}px`, background: theme.rule2 }} />
        <span style={{ fontFamily: fonts.mono, fontSize: S3_PLATE.blurbSize, lineHeight: 1.25, color: theme.ink3 }}>{module.blurb}</span>
      </>
    ) : null}
  </div>
);

export const Cutaway: React.FC<CutawayProps> = ({ k, chips, decoys, module, allowedHosts, proxy, refusedHost, plaqueTitle, refusedLabel, decoyWords }) => {
  const size = cutawaySize(k);
  const rack = s3Rack(decoys.length);
  const plate = s3ModulePlate(decoys.length, module.name, module.blurb);
  const tiles: DecoyTile[] = decoys.map((d) => ({ id: d.id, label: d.label, state: "idle" }));
  const frozen = packetProgress(packetWallFrame(0, S3_EGRESS.fromX) + FROZEN_AFTER_HIT, 0, S3_EGRESS.fromX);
  return (
    <div style={{ position: "relative", width: size.w, height: size.h }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: STAGE.w,
          height: STAGE.h,
          transformOrigin: "0 0",
          transform: `scale(${k}) translate(${-CUTAWAY_REGION.x}px, ${-CUTAWAY_REGION.y}px)`,
        }}
      >
        <ContainerBox x={S3_BOX.x} y={S3_BOX.y} chips={chips} chipProgress={chips.map(() => 1)} drawProgress={1}>
          <DecoyRack x={rack.x} y={rack.y} tiles={tiles} stateLabels={decoyWords} />
          <Plate plate={plate} module={module} />
        </ContainerBox>
        <EgressWall
          wallX={EGRESS_WALL_X}
          top={CUTAWAY_WALL.top}
          bottom={CUTAWAY_WALL.bottom}
          fromX={S3_EGRESS.fromX}
          allowedHosts={allowedHosts}
          plaqueTitle={plaqueTitle}
          proxyLabel={proxy}
          refusedLabel={refusedLabel}
          packets={[{ y: S3_EGRESS.packetY, progress: frozen, label: refusedHost, blocked: true }]}
        />
      </div>
    </div>
  );
};
