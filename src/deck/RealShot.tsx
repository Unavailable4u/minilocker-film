// A real screenshot of the live app (guide section 6), framed like <Shot>: 1 px rule2, 14 px radius, soft shadow. `file` is under public/ ("deck/R1.png").
//
// The page waits for the image (delayRender), so a still never captures a half-loaded picture. When the file is not there the frame shows `missing`
// instead of failing the render: slide 09 is then readable in the Studio, and scripts/make-deck.mjs refuses to put such a slide in the PDF.
import React from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { fonts, theme } from "../config/theme";

export interface RealShotProps {
  file: string;
  width: number;
  /** height / width of the picture. The app window is 1600 x 900. */
  ratio?: number;
  /** Words for the empty frame when the file does not exist. */
  missing: string;
  radius?: number;
}

type LoadState = "loading" | "ok" | "missing";

export const RealShot: React.FC<RealShotProps> = ({ file, width, ratio = 900 / 1600, missing, radius = 14 }) => {
  const [state, setState] = React.useState<LoadState>("loading");
  const [handle] = React.useState(() => delayRender(`RealShot ${file}`));
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setState("ok");
      continueRender(handle);
    };
    img.onerror = () => {
      setState("missing");
      continueRender(handle);
    };
    img.src = staticFile(file);
  }, [file, handle]);
  const height = Math.round(width * ratio);
  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
        borderRadius: radius,
        background: theme.paper,
        boxShadow: `0 0 0 1px ${theme.rule2}, 0 24px 48px -28px rgba(40,30,30,.5)`,
      }}
    >
      {state === "ok" ? (
        <img src={staticFile(file)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }} />
      ) : state === "missing" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            textAlign: "center",
            background: `${theme.hatchBad}, ${theme.badWash}`,
            fontFamily: fonts.mono,
            fontSize: 30,
            lineHeight: 1.3,
            color: theme.bad,
          }}
        >
          {missing}
        </div>
      ) : null}
    </div>
  );
};
