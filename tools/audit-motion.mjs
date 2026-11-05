// Motion audit (patch 25). Samples the film's virtual camera on all 5100 frames and reports what a viewer would feel:
//   - STILL runs: windows where the camera barely moves (the float in Camera.tsx is ignored). Longer than LIMIT_STILL is a warning.
//   - FAST moves: pan speed above LIMIT_PAN px/frame, zoom speed above LIMIT_ZOOM %/frame.
//   - DEEP zoom: frames above LIMIT_ZOOM_DEPTH (text gets cropped; check the shot).
// It also runs every scene's import-time checks (they throw while the bundle loads). No browser needed: `node tools/audit-motion.mjs`.
// Exit code 0 always (it informs); add --strict to exit 1 when there are warnings.
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
// fileURLToPath decodes %20 and handles the drive letter; URL.pathname does neither (a folder name with a space broke the audit).
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const esbuild = require("esbuild");

const LIMIT_STILL = 75; // frames (2.5 s) of an almost motionless camera
const LIMIT_PAN = 160; // stage px per frame
const LIMIT_ZOOM = 9; // percent per frame
const LIMIT_ZOOM_DEPTH = 2.1;
const WINDOW = 45;
const STILL_PAN = 14; // px of net travel over WINDOW frames that still counts as "not moving"
const STILL_ZOOM = 1.5; // percent

const dir = mkdtempSync(join(tmpdir(), "mlaudit-"));
const entry = join(dir, "entry.ts");
const out = join(dir, "out.cjs");
const p = (f) => JSON.stringify(resolve(root, f).replace(/\\/g, "/"));
writeFileSync(
  entry,
  `import { FILM_CAMERA } from ${p("src/scenes/index")};
import { getCameraState } from ${p("src/fx/Camera")};
import { TOTAL, sceneAt } from ${p("src/config/timeline")};
const rows = [];
for (let f = 0; f < TOTAL; f++) { const s = getCameraState(f, FILM_CAMERA); rows.push([f, s.scale, s.tx, s.ty, sceneAt(f).id]); }
console.log(JSON.stringify(rows));`,
);
try {
  esbuild.buildSync({ entryPoints: [entry], bundle: true, platform: "node", format: "cjs", outfile: out, loader: { ".json": "json", ".css": "empty", ".woff2": "empty", ".svg": "empty" }, logLevel: "error" });
} catch (e) {
  console.error("Bundle failed:\n" + e.message);
  process.exit(1);
}
let rows;
try {
  rows = JSON.parse(execFileSync(process.execPath, [out], { encoding: "utf8", maxBuffer: 1 << 26 }));
} catch (e) {
  console.error("A scene's import-time check threw (read the message):\n" + String(e.stderr || e.message).split("\n").slice(0, 12).join("\n"));
  process.exit(1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const warnings = [];

// BACKDROP: a backdrop-filter in a scene or a graphic draws a mirrored copy of the window in Chrome (patch 25). Blur the app through src/scenes/appLook.ts instead.
// (src/ui, src/fx and src/dev are not scanned: Header, chrome, AttackLabScreen, Callout and the disabled DOF layer keep theirs, and the film switches the app's off in theme.css.)
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; });
for (const dir of ["src/scenes", "src/gfx"]) {
  for (const f of walk(join(root, dir)).filter((x) => /\.(tsx?|css)$/.test(x))) {
    readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (/backdrop-?filter/i.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) warnings.push(`BACKDROP ${f.slice(root.length + 1).replace(/\\/g, "/")}:${i + 1}  use appLook.ts, not backdrop-filter`);
    });
  }
}
const t = (f) => `f${f} (${(f / 30).toFixed(1)}s)`;

// still runs
let start = null;
const still = (i) => {
  const a = rows[i - WINDOW], b = rows[i];
  return Math.hypot(b[2] - a[2], b[3] - a[3]) < STILL_PAN && Math.abs(b[1] / a[1] - 1) * 100 < STILL_ZOOM;
};
const runs = [];
for (let i = WINDOW; i < rows.length; i++) {
  if (still(i)) { if (start === null) start = i - WINDOW; }
  else if (start !== null) { runs.push([start, i - 1]); start = null; }
}
if (start !== null) runs.push([start, rows.length - 1]);
for (const [a, b] of runs) if (b - a + 1 >= LIMIT_STILL) warnings.push(`STILL  ${rows[a][4]}  ${t(a)} - ${t(b)}  ${b - a + 1} frames, zoom ${rows[a][1].toFixed(2)}`);

// fast moves
for (let i = 1; i < rows.length; i++) {
  const pan = Math.hypot(rows[i][2] - rows[i - 1][2], rows[i][3] - rows[i - 1][3]);
  const zm = Math.abs(rows[i][1] / rows[i - 1][1] - 1) * 100;
  if (pan > LIMIT_PAN || zm > LIMIT_ZOOM) warnings.push(`FAST   ${rows[i][4]}  f${i}  pan ${pan.toFixed(0)} px/f  zoom ${zm.toFixed(1)} %/f`);
}
// deep zoom runs
let ds = null;
for (let i = 0; i <= rows.length; i++) {
  const deep = i < rows.length && rows[i][1] > LIMIT_ZOOM_DEPTH;
  if (deep && ds === null) ds = i;
  if (!deep && ds !== null) { warnings.push(`DEEP   ${rows[ds][4]}  ${t(ds)} - ${t(i - 1)}  zoom up to ${Math.max(...rows.slice(ds, i).map((r) => r[1])).toFixed(2)}`); ds = null; }
}
// per-scene summary
const scenes = [...new Set(rows.map((r) => r[4]))];
console.log("scene   frames    zoom min-max    camera travel (px)");
for (const s of scenes) {
  const r = rows.filter((x) => x[4] === s);
  let travel = 0;
  for (let i = 1; i < r.length; i++) travel += Math.hypot(r[i][2] - r[i - 1][2], r[i][3] - r[i - 1][3]);
  console.log(`${s.padEnd(6)}  ${String(r.length).padStart(5)}    ${Math.min(...r.map((x) => x[1])).toFixed(2)}-${Math.max(...r.map((x) => x[1])).toFixed(2)}        ${travel.toFixed(0)}`);
}
console.log(`\n${warnings.length} warning(s)`);
console.log("(STILL in a scene whose action lives in STAGE space, such as S0 typing, S1 lockup, S3 box, S7 table, is fine while that action moves. FAST is fine for a designed whip. DEEP is fine on a gauge card. The audit cannot see stage-space motion: look at the sheets.)");
for (const w of warnings.slice(0, 60)) console.log("  " + w);
if (warnings.length > 60) console.log(`  ... and ${warnings.length - 60} more`);
if (process.argv.includes("--strict") && warnings.length) process.exit(1);
