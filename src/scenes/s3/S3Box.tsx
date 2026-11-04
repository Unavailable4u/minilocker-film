// S3Box (patch 14a): the hardened container of scene S3, ONE persistent object drawn from f1559 to the end of S3. It is not part of S3a / S3b / S3c
// because all three act on it: 14a draws it and its six chips and plants the decoys; 14b turns the decoy tiles amber (the reads) and writes the
// module's name in the module band; 14c runs the audit line, the stamp and the sealing ring over it. Those patches resend THIS file (every addition
// is marked "14b" / "14c" below) and leave S3a untouched.
//
// The box has a backing panel (a near-opaque graphite rounded rectangle under the ContainerBox): over the app, dimmed and blurred, the app's own
// text still shows through ContainerBox's 60 % interior, and a blurred terminal line between two decoy tiles reads as noise.
import React from "react";
import { Badge, badgePulse, badgeReveal } from "../../fx/Badge";
import { alpha, theme } from "../../config/theme";
import { copy, gfxA } from "../../config/copy";
import { BOX_H, BOX_RADIUS, BOX_W, ContainerBox } from "../../gfx/ContainerBox";
import { DecoyRack, type DecoyTile } from "../../gfx/DecoyRack";
import type { SceneOverlayProps } from "../types";
import { s3Data } from "./data";
import { S3_BOX, S3_TIMING, s3BoxDraw, s3ChipProgress, s3DecoyReveal, s3Rack } from "./shared";

export const S3Box: React.FC<SceneOverlayProps> = ({ frame }) => {
  if (frame < S3_TIMING.box.drawFrom - 1) return null;
  const data = s3Data();
  const rack = s3Rack(data.decoys.length);
  const draw = s3BoxDraw(frame);

  // 14a: every decoy is planted (graphite). 14b: a tile whose canary.read has landed is "read" (amber) with its ledger line.
  const tiles: DecoyTile[] = data.decoys.map((d, i) => ({ id: d.id, label: d.label, state: "idle", reveal: s3DecoyReveal(frame, i) }));

  return (
    <>
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
      <ContainerBox x={S3_BOX.x} y={S3_BOX.y} chips={copy.s3.chips} chipProgress={s3ChipProgress(frame)} drawProgress={draw}>
        <DecoyRack x={rack.x} y={rack.y} tiles={tiles} stateLabels={{ idle: gfxA.decoyIdle, read: gfxA.decoyRead, used: gfxA.decoyUsed }} />
      </ContainerBox>

      {/* when S3 is built from the Attack Lab run (evidence.s3Source): its tag, in the row of the three top chips, right of "no capabilities" (stage y 118-160, inside the safe margin) */}
      {data.tag && (
        <div style={{ position: "absolute", left: S3_BOX.x + 900, top: S3_BOX.y - 72, display: "flex" }}>
          <Badge label={data.tag} tone="mute" dot={false} reveal={badgeReveal(frame, S3_TIMING.box.drawFrom + 6)} pulse={badgePulse(frame)} />
        </div>
      )}
    </>
  );
};
