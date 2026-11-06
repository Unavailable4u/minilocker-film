// Renders the MiniLockerDeck composition (one frame = one slide) into out/deck/NN.png and builds out/deck/MiniLocker-deck.pdf.
//   node scripts/make-deck.mjs                 all slides, scale 1 (1920x1080)
//   node scripts/make-deck.mjs --scale=2       3840x2160 PNGs (the PDF page stays 1920x1080 pt, so it is just sharper)
//   node scripts/make-deck.mjs --only=3,5      re-render only these slides (1-based), then rebuild the PDF from every PNG present
//   node scripts/make-deck.mjs --comp=DeckProbe   another composition id (testing)
// Needs Chrome: Remotion downloads one on first use, or set REMOTION_BROWSER_EXECUTABLE.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { PDFDocument } from "pdf-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=")[1];
const scale = Number(arg("scale", 1));
const compId = arg("comp", "MiniLockerDeck");
const only = arg("only", "") ? arg("only", "").split(",").map(Number) : null;
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
const outDir = path.join(ROOT, "out", "deck");
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.light.ts"), onProgress: () => {} });
const comp = await selectComposition({ serveUrl, id: compId, browserExecutable, chromiumOptions: { gl: "swangle" }, logLevel: "error" });
for (let i = 0; i < comp.durationInFrames; i++) {
  if (only && !only.includes(i + 1)) continue;
  const output = path.join(outDir, `${String(i + 1).padStart(2, "0")}.png`);
  await renderStill({ composition: comp, serveUrl, output, frame: i, scale, browserExecutable, chromiumOptions: { gl: "swangle" }, logLevel: "error" });
  console.log("slide", i + 1, "->", path.relative(ROOT, output));
}

const pdf = await PDFDocument.create();
for (const f of fs.readdirSync(outDir).filter((n) => /^\d\d\.png$/.test(n)).sort()) {
  const img = await pdf.embedPng(fs.readFileSync(path.join(outDir, f)));
  const page = pdf.addPage([1920, 1080]);
  page.drawImage(img, { x: 0, y: 0, width: 1920, height: 1080 });
}
const pdfPath = path.join(outDir, "MiniLocker-deck.pdf");
fs.writeFileSync(pdfPath, await pdf.save());
console.log("pdf ->", path.relative(ROOT, pdfPath), `(${(fs.statSync(pdfPath).size / 1e6).toFixed(1)} MB)`);
