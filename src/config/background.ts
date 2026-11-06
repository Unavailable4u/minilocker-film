// The film's stage background: ONE place to change it.
//
// HOW TO SWAP IT
//   1. Put your picture in public/backgrounds/ (png or jpg; 1920x1080 or larger, landscape, gives the sharpest render).
//   2. Change `src` below to its path inside public/ (no leading slash), for example "backgrounds/my-wall.jpg".
//      Or just overwrite public/backgrounds/stage.png and change nothing.
//   3. Set `src` to null to go back to the old graphite gradient with the drifting crimson glow.
// Nothing else in the film types a background: the stage (MiniLockerFilm.tsx) and the S0 hook scene both draw <StageBackground />.
//
// The current picture is portrait (736 x 1288). It is scaled to COVER the 16:9 frame, so only a band of it shows;
// `position` picks which band (the first number is left-right, the second is top-bottom, in percent).

export interface StageBackgroundConfig {
  /** Path inside public/, or null for the graphite gradient + crimson glow. */
  src: string | null;
  /** CSS object-position of the picture inside the frame, e.g. "50% 30%". */
  position: string;
  /** 0..1: a black layer over the picture, to calm it down behind busy scenes. 0 = the picture as it is. */
  dim: number;
  /** 0..: blur in px (hides the softness of a small picture). 0 = none. */
  blurPx: number;
  /** Slow push-in over the whole film, so the background is never still: 0.05 = it grows 5 % from the first frame to the last. 0 = static. */
  drift: number;
}

export const STAGE_BACKGROUND: StageBackgroundConfig = {
  src: "backgrounds/stage.png",
  position: "50% 32%",
  dim: 0,
  blurPx: 0,
  drift: 0.05,
};
