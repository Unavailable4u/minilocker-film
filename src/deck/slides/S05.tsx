// Slide 05 · Containment you can see. Claim: "Containment, measured." (copy.s3.caption), then "It tried to phone home. Refused." (copy.s3.captionPhoneHome).
// Hero: E3, the cutaway: the container with its six hardening chips, the decoys and the hostile module inside, and the egress wall with the allowlist
// plaque and one refused packet. The hosts (allowed and refused) and the Network gauge are read from the same ledger and infra as the film's S3
// (src/scenes/s3/data.ts); nothing on the slide is typed. The box is a drawing of the real container; the chips are the product's hardening facts.
import React from "react";
import { gfxA, s3 } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { containerChips } from "../../data/select";
import { s3Data } from "../../scenes/s3/data";
import { EGRESS_WALL_X } from "../../gfx/EgressWall";
import { S3_EGRESS } from "../../scenes/s3/shared";
import { Cutaway, cutawayPlaqueBottom, cutawayPoint, cutawaySize } from "../gfx/Cutaway";
import { DECK, Eyebrow, Lead, Slide, Tag, Title } from "../kit";
import { W } from "../words";

const CONTENT_W = DECK.w - 2 * DECK.mx;
/** stage px -> slide px: the film's S3 stage region is 1700 x 764; at 0.88 it is 1496 x 672 and ends at y 888 of the 920 px content box */
const K = 0.88;
const BODY_TOP = 216;

export const S05: React.FC = () => {
  const data = s3Data();
  const size = cutawaySize(K);
  const left0 = Math.round((CONTENT_W - size.w) / 2);
  /** a point of the film's stage as a slide-content point */
  const at = (x: number, y: number): { left: number; top: number } => {
    const p = cutawayPoint({ x, y }, K);
    return { left: left0 + p.left, top: BODY_TOP + p.top };
  };
  const allow = at(EGRESS_WALL_X + 30, cutawayPlaqueBottom(data.allowedHosts.length, !!data.proxy) + 30);
  const net = at(EGRESS_WALL_X + 36, S3_EGRESS.packetY - 40);
  // the gauge's own second line is "blocked · N allowed · N host(s)": its first word is the unit of the number, the rest is the line under it
  const parts = data.network.sub.split(" · ");
  const unit = parts.length > 1 ? parts[0] : undefined;
  const rest = parts.length > 1 ? parts.slice(1).join(" · ") : data.network.sub;
  return (
    <Slide n={5}>
      <div style={{ position: "relative", height: "100%" }}>
        <Eyebrow>{W.s05.kicker}</Eyebrow>
        <Title size={88}>{W.s05.title}</Title>
        <Lead>{W.s05.lead}</Lead>

        <div style={{ position: "absolute", left: left0, top: BODY_TOP }}>
          <Cutaway
            k={K}
            chips={containerChips(s3.chips)}
            decoys={data.decoys}
            module={data.module}
            allowedHosts={data.allowedHosts}
            proxy={data.proxy}
            refusedHost={data.blocked.host}
            plaqueTitle={gfxA.allowlist}
            refusedLabel={gfxA.refused}
            decoyWords={{ idle: gfxA.decoyIdle, read: gfxA.decoyRead, used: gfxA.decoyUsed }}
          />
        </div>

        <div style={{ position: "absolute", left: allow.left, top: allow.top }}>
          <Tag>{W.s05.allowlist}</Tag>
        </div>

        <div style={{ position: "absolute", left: net.left, top: net.top, width: CONTENT_W - net.left }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: theme.ink3 }}>{data.network.label}</div>
          <div style={{ fontFamily: fonts.serif, fontSize: 88, lineHeight: 1, color: theme.bad, marginTop: 6 }}>
            {data.network.blocked}
            {unit ? <span style={{ fontSize: 40, color: theme.ink3 }}> {unit}</span> : null}
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 24, color: theme.ink3, marginTop: 8, lineHeight: 1.3 }}>{rest}</div>
        </div>
      </div>
    </Slide>
  );
};
