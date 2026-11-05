// Offline fonts: CMU Serif and CMU Typewriter Text, loaded from public/fonts (run `npm run assets`).
// If a file is missing the film falls back to Georgia / system monospace and logs ONE warning.
import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { FAMILY_MONO, FAMILY_SERIF } from "../config/theme";

export interface FontSpec {
  family: string;
  file: string;
  weight: "500" | "700";
  style: "normal" | "italic";
}

/** The 7 files in the MiniLocker repo at frontend/src/fonts (all OFL). */
export const FONT_FILES: readonly FontSpec[] = [
  { family: FAMILY_SERIF, file: "cmu-serif-500-roman.woff2", weight: "500", style: "normal" },
  { family: FAMILY_SERIF, file: "cmu-serif-500-italic.woff2", weight: "500", style: "italic" },
  { family: FAMILY_SERIF, file: "cmu-serif-700-roman.woff2", weight: "700", style: "normal" },
  { family: FAMILY_SERIF, file: "cmu-serif-700-italic.woff2", weight: "700", style: "italic" },
  { family: FAMILY_MONO, file: "cmu-typewriter-text-500-roman.woff2", weight: "500", style: "normal" },
  { family: FAMILY_MONO, file: "cmu-typewriter-text-500-italic.woff2", weight: "500", style: "italic" },
  { family: FAMILY_MONO, file: "cmu-typewriter-text-700-roman.woff2", weight: "700", style: "normal" },
];

let loading: Promise<void> | null = null;
let warned = false;

/** Loads every font once per page. Never rejects: missing files only produce one console warning. */
export function loadFonts(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const results = await Promise.allSettled(
      FONT_FILES.map(async (spec) => {
        const face = new FontFace(
          spec.family,
          `url(${staticFile(`fonts/${spec.file}`)}) format("woff2")`,
          { weight: spec.weight, style: spec.style },
        );
        await face.load();
        document.fonts.add(face);
      }),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0 && !warned) {
      warned = true;
      console.warn(
        `[minilocker-film] ${failed} of ${FONT_FILES.length} CMU font files could not be loaded from public/fonts. ` +
          `Falling back to Georgia and a system monospace font. Run "npm run assets" to install the real fonts.`,
      );
    }
  })();
  return loading;
}

/**
 * Wrap the film in this. Rendering waits (delayRender) until the fonts are ready,
 * so no frame is ever captured with a fallback font that could have been avoided.
 */
export const FontsReady: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("Loading CMU fonts"));
  useEffect(() => {
    let done = false;
    const release = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    loadFonts().then(release, release);
    return release;
  }, [handle]);
  return React.createElement(React.Fragment, null, children);
};
