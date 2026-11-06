// The slide deck composition: ONE FRAME = ONE SLIDE (frame 0 = slide 1). Work in the light Studio: `npm run studio:light`.
// Build with `npm run deck` (see scripts/make-deck.mjs).
//
// To add a slide: create src/deck/slides/SNN.tsx, import it here and add it to BUILT. Slides that are not in BUILT show <Pending/> in the
// Studio, so slide N stays frame N while the deck is partial. `make-deck.mjs` reads `built` from the composition props, renders only
// those slides and leaves the pending ones out of the PDF, so a partial deck is always a valid PDF.
import React from "react";
import { useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { FontsReady } from "../lib/fonts";
import { DECK, Pending } from "./kit";
import { S01 } from "./slides/S01";
import { S02 } from "./slides/S02";
import { S03 } from "./slides/S03";
import { S04 } from "./slides/S04";
import { S05 } from "./slides/S05";
import { S06 } from "./slides/S06";
import { S07 } from "./slides/S07";
import { S11 } from "./slides/S11";

const BUILT: Readonly<Record<number, React.FC>> = {
  1: S01,
  2: S02,
  3: S03,
  4: S04,
  5: S05,
  6: S06,
  7: S07,
  11: S11,
};

export const DECK_SLIDES = DECK.total;
export const BUILT_SLIDES: number[] = Object.keys(BUILT).map(Number).sort((a, b) => a - b);

export interface DeckProps extends Record<string, unknown> {
  built: number[];
}

export const Deck: React.FC<DeckProps> = () => {
  const n = useCurrentFrame() + 1;
  const Slide = BUILT[Math.min(n, DECK_SLIDES)];
  return <FontsReady>{Slide ? <Slide /> : <Pending n={n} />}</FontsReady>;
};
