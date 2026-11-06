// Which look the film is built in: "dark" (the default film) or "light" (the Paper theme of the real app).
//
// The mode is chosen ONCE, before any other module of the film is evaluated, by the entry point:
//   src/index.ts        -> dark  (nothing to do, "dark" is the default below)
//   src/index.light.ts  -> light (its first import is ./themeMode.light, which calls setThemeMode("light"))
// src/config/theme.ts reads it when it is first loaded and builds the whole palette from it, so every component that imports `theme`
// gets the right colours without knowing the mode exists. Do not call setThemeMode from anywhere else.

export type ThemeMode = "dark" | "light";

let mode: ThemeMode = "dark";

export function setThemeMode(next: ThemeMode): void {
  mode = next;
}

export function getThemeMode(): ThemeMode {
  return mode;
}
