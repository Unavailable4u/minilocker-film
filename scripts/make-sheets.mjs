// Contact sheets for review (patch 25). Replaces the long ffmpeg one-liner that PowerShell mangles.
//   node scripts/make-sheets.mjs                 -> out/sheets/sheet-01.jpg ... (every 10th frame, 16 per sheet, true frame number printed)
//   node scripts/make-sheets.mjs --every 5       -> a thumbnail every 5 frames
//   node scripts/make-sheets.mjs --from 1400 --to 1700 --every 4
//   node scripts/make-sheets.mjs --zip           -> also out/sheets.zip (Windows: uses Compress-Archive)
// Needs out/frames/element-NNNN.jpeg (npx remotion render MiniLockerFilm-Preview out/frames --sequence --image-format=jpeg --jpeg-quality=80)
// or the PNG sequence of `npm run render:frames` (patch 23), which is also read.
import { readdirSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 ? Number(process.argv[i + 1]) : def; };
const every = arg("--every", 10), from = arg("--from", 0);
const files = existsSync("out/frames") ? readdirSync("out/frames").filter((f) => /^element-\d+\.(jpe?g|png)$/.test(f)).sort() : [];
if (files.length === 0) { console.error("No frames in out/frames. Render them first (see the header of this file)."); process.exit(1); }
const digits = files[0].match(/element-(\d+)\./)[1].length;
const ext = files[0].split(".").pop();
const to = arg("--to", files.length - 1);
const first = Number(files[0].match(/element-(\d+)\./)[1]);
rmSync("out/sheets", { recursive: true, force: true });
mkdirSync("out/sheets", { recursive: true });
const font = process.platform === "win32" ? "C\\:/Windows/Fonts/arial.ttf" : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
// Start reading at frame `from` (so n = 0 is that frame), draw the TRUE frame number on every frame first, and only then pick every Nth.
const begin = first + from;
const vf = [
  `drawtext=fontfile='${font}':text='f%{eif\\:${begin}+n\\:d}':x=8:y=8:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.7`,
  `select='not(mod(n,${every}))'`,
  "scale=480:-1",
  "tile=4x4",
].join(",");
const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-framerate", "30", "-start_number", String(begin), "-i", `out/frames/element-%0${digits}d.${ext}`, "-frames:v", String(to - from + 1), "-vf", vf, "-fps_mode", "passthrough", "-q:v", "3", "out/sheets/sheet-%02d.jpg"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log("Sheets written to out/sheets");
if (process.argv.includes("--zip")) {
  const z = process.platform === "win32" ? spawnSync("powershell", ["-NoProfile", "-Command", "Compress-Archive -Force -Path out\\sheets\\* -DestinationPath out\\sheets.zip"], { stdio: "inherit" }) : spawnSync("zip", ["-qj", "out/sheets.zip", ...readdirSync("out/sheets").map((f) => "out/sheets/" + f)], { stdio: "inherit" });
  if (z.status === 0) console.log("out/sheets.zip written");
}
