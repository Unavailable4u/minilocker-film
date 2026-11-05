#!/usr/bin/env node
// Checks the proof clip of S4b6 (patch 16f, BIBLE 7.5) and writes public/proof/manifest.json. Prints exactly what to fix.
//
//   npm run proof                 looks for the clip (PROOF.file in src/config/script.ts, under public/), probes it, and writes public/proof/manifest.json
//   npm run proof -- --check      writes nothing: fails when the manifest on disk is stale (the clip was added, removed or changed since `npm run proof`)
//   npm run proof -- --final      also fails when there is NO clip (use it before a final render that is meant to show the recorded clip)
//
// What the film does with the result (src/scenes/s4/S4b6.tsx imports the manifest at build time; nothing reads the file system while rendering):
//   clip present   the 62 % window plays the recording, muted, cut to PROOF.startFrom-PROOF.endAt, badge "LIVE - recorded on the Vultr VM - unedited"
//   no clip        the window is a code replay of the attack's steps read from the ledger, badge "RECONSTRUCTED FROM LEDGER" (the word LIVE never appears with it)
// Both are honest and both ship; the manifest is what keeps the badge true. Run `npm run proof` after you add, replace or remove public/proof/rewind.mp4.
//
// Always a failure: a PROOF constant this script cannot read; startFrom / endAt that are not whole frames (startFrom 0 or more, endAt after it); a clip too short for the cut
// (PROOF.endAt past its last frame, when ffprobe can tell); with --check, a stale manifest; with --final, a missing clip.
// The cut's length against the film's timing (188 to 225 frames) is checked when the film loads (src/scenes/s4/shared.tsx), not here.
//
// ffprobe (part of ffmpeg) is optional: with it the manifest carries the clip's length, size and frame rate and the trim is checked against the real length; without it the
// clip still counts as present, `durationFrames` is null and the trim cannot be checked (a warning).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_TS = resolve(ROOT, "src/config/script.ts");
const MANIFEST = resolve(ROOT, "public/proof/manifest.json");
const FPS = 30; // the film's frame rate (src/config/timeline.ts): trims are in frames of the film
const MIN_WIDTH = 1280;

const argv = process.argv.slice(2);
const FINAL = argv.includes("--final");
const CHECK = argv.includes("--check");

const fails = [];
const warns = [];
const fail = (what, msg) => fails.push({ what, msg });
const warn = (what, msg) => warns.push({ what, msg });

// ---------- PROOF, read from script.ts (no TypeScript is run here) ---------------------------------------------------------
function readProof() {
  let src;
  try {
    src = readFileSync(SCRIPT_TS, "utf8");
  } catch (e) {
    fail("src/config/script.ts", `cannot be read: ${e.message}`);
    return null;
  }
  const block = /export const PROOF = \{([\s\S]*?)\}\s*as const;/.exec(src);
  if (!block) {
    fail("PROOF", "is not in src/config/script.ts (expected `export const PROOF = { file, startFrom, endAt } as const;`, patch 16f)");
    return null;
  }
  const field = (name, re) => {
    const m = new RegExp(`${name}\\s*:\\s*${re}`).exec(block[1]);
    if (!m) fail(`PROOF.${name}`, "is missing or not a plain literal in src/config/script.ts");
    return m ? m[1] : undefined;
  };
  const file = field("file", '"([^"]+)"');
  const startFrom = field("startFrom", "(-?\\d+)");
  const endAt = field("endAt", "(-?\\d+)");
  if (file === undefined || startFrom === undefined || endAt === undefined) return null;
  return { file, startFrom: Number(startFrom), endAt: Number(endAt) };
}

// ---------- the clip --------------------------------------------------------------------------------------------------------
/** ffprobe's view of the clip, or null when ffprobe is not installed / cannot read it. */
function probe(path) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const info = JSON.parse(out);
    const video = (info.streams ?? []).find((s) => s.codec_type === "video");
    if (!video) return { error: "has no video stream" };
    const seconds = Number(info.format?.duration ?? video.duration);
    const [n, d] = String(video.avg_frame_rate ?? video.r_frame_rate ?? "0/1").split("/").map(Number);
    return {
      width: video.width,
      height: video.height,
      fps: d > 0 ? n / d : null,
      seconds: Number.isFinite(seconds) ? seconds : null,
      audio: (info.streams ?? []).some((s) => s.codec_type === "audio"),
    };
  } catch (e) {
    return e && e.code === "ENOENT" ? null : { error: `ffprobe could not read it (${String(e.message).split("\n")[0]})` };
  }
}

const proof = readProof();
let manifest = { present: false, file: proof?.file ?? "proof/rewind.mp4", durationFrames: null };

if (proof) {
  const { file, startFrom, endAt } = proof;
  if (!(Number.isInteger(startFrom) && startFrom >= 0)) fail("PROOF.startFrom", `is ${startFrom} but should be a whole number of frames, 0 or more`);
  if (!(Number.isInteger(endAt) && endAt > startFrom)) fail("PROOF.endAt", `is ${endAt} but should be a whole frame after PROOF.startFrom (${startFrom})`);

  const clipPath = resolve(ROOT, "public", file);
  if (!clipPath.startsWith(resolve(ROOT, "public"))) {
    fail("PROOF.file", `"${file}" leaves public/`);
  } else if (existsSync(clipPath) && statSync(clipPath).isFile() && statSync(clipPath).size > 0) {
    const bytes = statSync(clipPath).size;
    manifest = { present: true, file, durationFrames: null };
    const info = probe(clipPath);
    if (info === null) {
      warn("ffprobe", "is not installed: the clip counts as present, but its length is unknown, so PROOF.endAt cannot be checked against it (install ffmpeg, then run `npm run proof` again)");
    } else if ("error" in info) {
      fail(file, info.error);
    } else {
      if (info.seconds === null) {
        warn(file, "has no length ffprobe can read: PROOF.endAt cannot be checked against it");
      } else {
        // floor: a trim that ends on the clip's very last partial frame would ask for a frame that is not there
        manifest.durationFrames = Math.floor(info.seconds * FPS);
        if (Number.isInteger(endAt) && endAt > manifest.durationFrames) {
          fail("PROOF.endAt", `is ${endAt} but the clip is ${manifest.durationFrames} frames (${info.seconds.toFixed(2)} s at ${FPS} fps): lower PROOF.startFrom / PROOF.endAt in src/config/script.ts, or record a longer clip`);
        }
      }
      manifest.width = info.width;
      manifest.height = info.height;
      manifest.fps = info.fps === null ? null : Math.round(info.fps * 100) / 100;
      if (info.width < MIN_WIDTH) warn(file, `is ${info.width} px wide: the window is 1029 px of the 1920 px film (twice that at 4K), so a recording under ${MIN_WIDTH} px will look soft`);
      if (Math.abs(info.width / info.height - 16 / 9) > 0.02) warn(file, `is ${info.width}x${info.height}, not 16:9: the window is 16:9 and the clip is cropped to fill it (object-fit: cover)`);
      if (info.fps !== null && Math.abs(info.fps - FPS) > 0.5) warn(file, `runs at ${manifest.fps} fps, the film at ${FPS}: Remotion resamples it, and PROOF.startFrom / endAt count frames at ${FPS} fps`);
      if (info.audio) warn(file, "has an audio track: it is never used (the film mutes the clip)");
    }
    manifest.bytes = bytes;
    manifest.sha256 = createHash("sha256").update(readFileSync(clipPath)).digest("hex");
  } else {
    if (FINAL) fail(file, `is not in public/ (${clipPath}): record the hero attack on the Vultr VM and save it there, then run \`npm run proof\``);
  }
}

// ---------- the manifest ----------------------------------------------------------------------------------------------------
const next = JSON.stringify(manifest, null, 2) + "\n";
let changed = true;
try {
  changed = readFileSync(MANIFEST, "utf8") !== next;
} catch {
  /* no manifest yet */
}

if (fails.length === 0) {
  if (CHECK) {
    if (changed) fail("public/proof/manifest.json", "is stale: it does not match what is in public/proof/ now. Run `npm run proof` to rewrite it");
  } else if (changed) {
    mkdirSync(dirname(MANIFEST), { recursive: true });
    writeFileSync(MANIFEST, next);
  }
}

// ---------- the report --------------------------------------------------------------------------------------------------------
for (const w of warns) console.warn(`  warning  ${w.what}: ${w.msg}`);
for (const f of fails) console.error(`  FAIL     ${f.what}: ${f.msg}`);

if (fails.length > 0) {
  console.error(`proof: ${fails.length} problem${fails.length === 1 ? "" : "s"}. The manifest was not written.`);
  process.exit(1);
}

if (manifest.present) {
  const cut = proof.endAt - proof.startFrom;
  const len = manifest.durationFrames === null ? "length unknown" : `${manifest.durationFrames} frames`;
  console.log(`proof: clip present (${proof.file}, ${len}); the film plays frames ${proof.startFrom}-${proof.endAt} (${cut} frames, ${(cut / FPS).toFixed(1)} s) under the badge "LIVE - recorded on the Vultr VM - unedited".`);
} else {
  console.log(`proof: no clip at public/${manifest.file}; the film shows the reconstruction from the ledger, badge "RECONSTRUCTED FROM LEDGER".`);
}
console.log(CHECK ? "proof: public/proof/manifest.json is current." : changed ? "proof: wrote public/proof/manifest.json." : "proof: public/proof/manifest.json is already current.");
