// The slide deck composition: ONE FRAME = ONE SLIDE. Add a slide by creating src/deck/slides/SNN.tsx and listing it in SLIDES.
// Build with `npm run deck` (see scripts/make-deck.mjs). Work in the light Studio: `npm run studio:light`.
import React from "react";
import { useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { FontsReady } from "../lib/fonts";
import { S01 } from "./slides/S01";

const SLIDES: readonly React.FC[] = [
  S01,
  // S02, S03, ... S12
];

export const DECK_SLIDES = SLIDES.length;

export const Deck: React.FC = () => {
  const i = useCurrentFrame();
  const Slide = SLIDES[Math.min(i, SLIDES.length - 1)];
  return (
    <FontsReady>
      <Slide />
    </FontsReady>
  );
};
