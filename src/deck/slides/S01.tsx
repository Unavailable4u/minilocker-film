// Slide 01 · Cover. The dial is the product's own verdict for the fix task (from the evidence), the words are the film's title lockup.
import React from "react";
import { staticFile } from "remotion";
import { Badge } from "../../fx/Badge";
import { dialDims, dialVerdict } from "../../ui/BlastPanel";
import { RadiusDial } from "../../ui/RadiusDial";
import { brand, s1, ui, urls } from "../../config/copy";
import { fonts, theme } from "../../config/theme";
import { selectTask } from "../../data/select";
import { gaugesOf } from "../../lib/gauges";
import { Slide } from "../kit";
import { W } from "../words";

const host = (u: string): string => u.replace(/^https?:\/\//, "");

export const S01: React.FC = () => {
  // The dial of the finished fix task, exactly as the app draws it after the run: every arc measured, the verdict word computed, not typed.
  const gauges = gaugesOf(selectTask().events, false);
  const verdict = dialVerdict(gauges, "partial");
  return (
    <Slide
      n={1}
      backdrop={<div style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("backgrounds/stage-light.png")})`, backgroundSize: "cover", opacity: 0.35 }} />}
      footer={{
        left: `${host(urls.repo)} · ${host(urls.demo)}`,
        right: `${brand.license} · ${brand.builtOn}`,
      }}
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <RadiusDial dims={dialDims(gauges)} verdictWord={verdict.word} verdictTone={verdict.tone} size={470} showLabels={1} glow={1} pulseFlagged={false} />
        <div style={{ fontFamily: fonts.serif, fontSize: 150, lineHeight: 1, marginTop: 20, color: theme.ink }}>
          {ui.wordmark.lead}
          <span style={{ color: theme.accent }}>{ui.wordmark.tail}</span>
        </div>
        <div style={{ marginTop: 30 }}>
          <Badge label={s1.eyebrow} tone="accent" size={26} />
        </div>
        <div style={{ marginTop: 28, textAlign: "center", fontFamily: fonts.serif, fontStyle: "italic", fontSize: 44, lineHeight: 1.28, color: theme.ink2 }}>
          {W.s01.tagline.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </Slide>
  );
};
