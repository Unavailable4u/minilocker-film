## BIBLE 3. Stack, compositions, scripts

- Compositions: `MiniLockerFilm` (1920x1080, 30 fps, 5100 f), `MiniLockerFilm-Preview` (960x540). Dev only: DevBrandSheet, DevFxSheet, DevText, DevShell, DevWorkspace, DevScreens, DevGfxA, DevGfxB, DevGfxC, DevApp.
- Node 20 LTS, Windows, ffmpeg on PATH. Remotion renders with its own Chrome (downloaded on first run).
- npm scripts: `studio`, `assets`, `evidence`, `evidence:check`, `evidence:final-check`, `proof`, `sfx`, `check`, `render`, `render:4k`, `render:frames`, `submission`.
- Source of truth for UI: the `MiniLocker` repo at `frontend/src` (React 19 + Tailwind 4 there; the film uses plain inline styles, so every Tailwind class is translated using the theme constants). Fonts from `frontend/src/fonts`.
