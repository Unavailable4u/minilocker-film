// MiniLocker film: design tokens, taken from the real app (frontend/src/index.css, [data-theme="dark"]).
// Every color the film uses lives here. Components import `theme`, never type a hex value.

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

const colors = {
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
} as const;

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
  panelShadow: "0 1px 0 rgba(255,255,255,.04) inset, 0 20px 40px -28px rgba(0,0,0,.9)",
  liftShadow: "0 30px 80px -24px rgba(0,0,0,.85)",
} as const;

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
