// Slide 01 (placeholder that proves the pipeline: shell + a live Shot). Replace it following docs/guide/SLIDE_DECK_GUIDE.md section 5, "01 Cover".
import React from "react";
import { Eyebrow, Lead, Slide, Title } from "../kit";
import { Shot } from "../Shot";

export const S01: React.FC = () => (
  <Slide n={1}>
    <Eyebrow>§ 00 · placeholder slide</Eyebrow>
    <Title>MiniLocker deck scaffold</Title>
    <Lead>Replace this slide, then add S02 to S12 and list them in Deck.tsx.</Lead>
    <div style={{ position: "absolute", right: 0, bottom: 0 }}>
      <Shot at={1330} width={980} />
    </div>
  </Slide>
);
