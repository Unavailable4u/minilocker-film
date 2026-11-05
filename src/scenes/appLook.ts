// How the app layer steps back under an explainer (S3's scrim, S7's scrim). Pure function of the GLOBAL frame.
//
// WHY THIS FILE EXISTS (patch 25). The scrims used to be stage-sized layers with `backdrop-filter`, laid over the 3D camera layer. In Chrome
// (Remotion) that draws a mirrored, upside-down copy of the window on the frames where the blur is ramping (seen at f1550 and f4270).
// The blur now goes on the app layer itself as an ordinary `filter` (MiniLockerFilm.tsx), and the scrims keep only the dim.
import { SCENES } from "../config/timeline";
import { S3_SCRIM, s3ScrimAmount } from "./s3/shared";
import { S7_SCRIM, s7ScrimAmount } from "./S7Value";

export interface AppLook {
  /** Blur in SCREEN px (divide by the camera zoom before using it as a CSS blur on the app layer). */
  blurPx: number;
}

export function appLook(frame: number): AppLook {
  const b3 = S3_SCRIM.blurPx * s3ScrimAmount(frame);
  // s7ScrimAmount stays 1 after f4290 (S8 reads it); the S7 scrim layer only ever existed inside S7, so the blur is limited to S7's frames too.
  // Patch 20 (S8) may extend this function with its own ramp if the app should come back gradually instead of on the cut at f4560.
  const inS7 = frame >= SCENES.S7.start && frame <= SCENES.S7.end;
  const b7 = inS7 ? S7_SCRIM.blurPx * s7ScrimAmount(frame) : 0;
  return { blurPx: Math.max(b3, b7) };
}
