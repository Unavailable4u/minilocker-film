// MiniLocker film: design tokens, taken from the real app (frontend/src/index.css).
//   dark  = [data-theme="dark"]  (the default film, src/index.ts)
//   light = the app's :root "Paper" theme (the light film, src/index.light.ts)
// Every color the film uses lives here. Components import `theme`, never type a hex value.
//
// The mode comes from src/config/themeMode.ts and is fixed for the whole run (the entry point sets it before this file loads), so the
// palette is built once and `theme.ink` is simply "the text colour of whichever film this is".
import { getThemeMode } from "./themeMode";

export const THEME_MODE = getThemeMode();
/** True in the light film. Use it only where a colour cannot be a token (for example a shadow strength). */
export const isLight = THEME_MODE === "light";

/** Real app root font size in px. The film's UI is built with explicit px, translated at this base. */
export const ROOT_PX = 17;

/** "r,g,b" triples are kept so tints can be built without color-mix (the film has no CSS color-mix dependency). */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** rgba string from a hex color and an alpha 0..1. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

const dark = {
  // surfaces
  paper: "#0a0a0c", // page background
  sheet: "#121216", // panels
  raised: "#17171d", // raised cards
  sunken: "#08080b", // wells, terminal
  rule: "#26262e", // hairlines
  rule2: "#353541",

  // ink
  ink: "#f2f1ed", // text
  ink2: "#b4b2ab", // secondary
  ink3: "#8e8c86", // tertiary

  // brand: ONE crimson accent. accent2 is ambience only, never a status.
  accent: "#f01a49", // fills, focus
  accentInk: "#ff7a96", // accent-colored text
  accent2: "#a78bfa",
  onAccent: "#ffffff",

  // status colors mean status only
  ok: "#5b9dff", // contained / measured clean (rendered as the blue gradient when used as a fill)
  okWash: "#1c2537",
  okA: "#1f46d9",
  okB: "#3f86ff",
  okC: "#86bcff",
  bad: "#ff5a4f", // flagged / breached / blocked / denied (always with hatching)
  badWash: "#2c1a1c",
  warn: "#f59e0b", // needs a human, decoy read
  warnWash: "#2b2115",
  onWarn: "#1b1405",
  info: "#b39cff", // neutral information
  infoWash: "#292537",

  // terminal
  termBg: "#08080b",
  termFg: "#f2f1ed",
  termDim: "#8e8c86",

  // engineering-paper grid and the two pools of light
  grid: "rgba(255,32,82,.03)",
  glowA: "rgba(255,32,82,.09)",
  glowB: "rgba(167,139,250,.06)",

  // film stage (outside the app window)
  stageTop: "#08080b",
  stageBottom: "#121216",
  hookBg: "#050505", // S0 starts here

  // ---- tokens for what used to be hard-coded dark-only values (shadows, highlights, scrims, glass panels)
  okInk: "#86bcff", // text and ticks in the "clean" colour, drawn on glass (the light film needs a DARK blue here)
  shadeRgb: "0,0,0", // colour of every drop shadow
  edgeRgb: "255,255,255", // the lit top edge of a panel
  hairRgb: "255,255,255", // faint borders drawn over the stage
  glassRgb: "18,18,22", // callout / chip glass
  glassDeepRgb: "12,12,16", // badge and strip glass
  glassBadRgb: "30,16,18", // flagged callout glass
  scrimRgb: "5,5,6", // the layer that dims the app behind an explainer
  veilRgb: "0,0,0", // the depth-of-field layer outside the camera focus
  glowRgb: "255,32,82", // the crimson ambience on the stage when no picture is used
} as const;

/** Same keys, as plain strings (the two palettes have different literal values). */
type Palette = { -readonly [K in keyof typeof dark]: string };

// The app's :root (Paper) theme: warm ivory-grey, graphite ink, one crimson accent. The terminal stays dark, as it does in the real app.
const light: Palette = {
  paper: "#f2f0eb",
  sheet: "#faf9f6",
  raised: "#ffffff",
  sunken: "#e9e6df",
  rule: "#d9d5cb",
  rule2: "#bfbaad",

  ink: "#121216",
  ink2: "#44434a",
  ink3: "#6a6972",

  accent: "#d90f3d",
  accentInk: "#c20c36",
  accent2: "#7c5cd6",
  onAccent: "#ffffff",

  ok: "#1d4ed8",
  okWash: "#dfe4f2",
  okA: "#1a3fc4",
  okB: "#2f6fe8",
  okC: "#5b9cf5",
  bad: "#c8321f",
  badWash: "#f4dfda",
  warn: "#9a5800",
  warnWash: "#eee4d6",
  onWarn: "#fffaf0",
  info: "#6d4fc4",
  infoWash: "#e9e5f0",

  termBg: "#09090c",
  termFg: "#f2f1ed",
  termDim: "#8e8c86",

  grid: "rgba(60,40,40,.05)",
  glowA: "rgba(217,15,61,.08)",
  glowB: "rgba(124,92,214,.07)",

  stageTop: "#f6f3ec",
  stageBottom: "#e9e6df",
  hookBg: "#f7f4ee", // S0 starts here (the dark film starts on near-black)

  okInk: "#1d4ed8",
  shadeRgb: "40,30,30",
  edgeRgb: "255,255,255",
  hairRgb: "18,18,22",
  glassRgb: "250,249,246",
  glassDeepRgb: "250,249,246",
  glassBadRgb: "250,236,233",
  scrimRgb: "242,240,235",
  veilRgb: "242,240,235",
  glowRgb: "217,15,61",
};

const colors: Palette = isLight ? light : dark;

/** The clean/contained fill: a deep blue that brightens along its length. */
const okGradient = `linear-gradient(135deg, ${colors.okA}, ${colors.okB} 55%, ${colors.okC})`;

/** Flagged things get diagonal hatching as well as color, so red never has to carry the meaning alone. */
export function hatch(color: string = colors.bad, a = 0.16): string {
  return `repeating-linear-gradient(135deg, transparent 0 5px, ${alpha(color, a)} 5px 6px)`;
}

const hatchBad = hatch(colors.bad, 0.16);

/** Vertical stage gradient behind everything. */
const stageGradient = `linear-gradient(180deg, ${colors.stageTop}, ${colors.stageBottom})`;

/** Same layers as the real app's body background: two glows and the 44 px engineering grid. */
const appBackground =
  `radial-gradient(1100px 560px at 14% -10%, ${colors.glowA}, transparent 62%), ` +
  `radial-gradient(900px 500px at 104% 0%, ${colors.glowB}, transparent 60%), ` +
  `linear-gradient(${colors.grid} 1px, transparent 1px), ` +
  `linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)`;

export const theme = {
  ...colors,
  okGradient,
  hatchBad,
  stageGradient,
  appBackground,
  appBackgroundSize: "auto, auto, 44px 44px, 44px 44px",
  gridSize: 44,
  panelShadow: isLight
    ? `0 1px 0 rgba(255,255,255,.8) inset, 0 1px 0 ${colors.rule}, 0 18px 34px -26px rgba(40,30,30,.45)`
    : "0 1px 0 rgba(255,255,255,.04) inset, 0 20px 40px -28px rgba(0,0,0,.9)",
  liftShadow: isLight ? "0 24px 60px -24px rgba(30,20,20,.45)" : "0 30px 80px -24px rgba(0,0,0,.85)",
} as const;

// ---- colour helpers for the things that cannot be a single token: each takes the alpha the DARK film used, and scales it where the
// light film needs another strength. In the dark film they return exactly the colours that used to be typed by hand.

/** A drop-shadow colour. Light: warm graphite at half strength (black shadows look dirty on paper). */
export const shade = (a: number): string => `rgba(${colors.shadeRgb},${+(a * (isLight ? 0.5 : 1)).toFixed(3)})`;
/** The lit top edge of a panel (an inset highlight). Light: much stronger, as in the app's own panels. */
export const edgeLight = (a: number): string => `rgba(${colors.edgeRgb},${+Math.min(isLight ? 0.9 : 1, a * (isLight ? 6 : 1)).toFixed(3)})`;
/** A faint border or divider over the stage: white on dark, ink on light. */
export const hair = (a: number): string => `rgba(${colors.hairRgb},${a})`;
/** Glass behind callouts, badges and strips. */
export const glass = (a: number): string => `rgba(${colors.glassRgb},${isLight ? Math.min(0.94, a + 0.16) : a})`;
export const glassDeep = (a: number): string => `rgba(${colors.glassDeepRgb},${isLight ? Math.min(0.94, a + 0.16) : a})`;
export const glassBad = (a: number): string => `rgba(${colors.glassBadRgb},${isLight ? Math.min(0.94, a + 0.12) : a})`;
/** The layer that steps the app back behind an explainer: black-ish on dark, a paper wash on light. */
export const scrim = (a: number): string => `rgba(${colors.scrimRgb},${a})`;
/** The depth-of-field layer outside the camera focus. */
export const veil = (a: number): string => `rgba(${colors.veilRgb},${a})`;
/** A halo behind text that sits straight on the stage picture: dark glow behind light text, light glow behind dark text. */
export const halo = (a: number): string => (isLight ? `rgba(247,244,238,${+Math.min(1, a * 1.1).toFixed(3)})` : `rgba(0,0,0,${a})`);

export type Theme = typeof theme;

/** CSS font family names as registered by src/lib/fonts.ts. */
export const FAMILY_SERIF = "CMU Serif";
export const FAMILY_MONO = "CMU Typewriter Text";

export const fonts = {
  serif: `"${FAMILY_SERIF}", "Latin Modern Roman", "Computer Modern", "Times New Roman", Georgia, serif`,
  mono: `"${FAMILY_MONO}", "Latin Modern Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`,
} as const;

/** Type sizes at the 1920x1080 stage (BIBLE 4.2). */
export const type = {
  hook: 72,
  title: 150,
  captionMin: 56,
  captionMax: 76,
  callout: 24,
  uiMin: 22,
  monoLabelMin: 20,
} as const;

/** Layout constants at the 1920x1080 stage (BIBLE 4.5). */
export const layout = {
  safeMargin: 96,
  captionBottom: 110,
} as const;
