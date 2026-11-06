// Entry point of the LIGHT film. Same film, same compositions, same timeline and audio: only the palette and the stage background differ.
//   npm run studio:light     opens the Studio on this entry
//   npm run render:light     renders out/minilocker-demo-light.mp4
// The dark film stays on src/index.ts and is not touched.
//
// The first import MUST stay first: it sets the theme mode before src/config/theme.ts is evaluated.
import "./config/themeMode.light";
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
