// Measures the real positions of the UI targets the film's cursor and callouts aim at, and writes src/config/anchors.measured.json.
//
//   node tools/measure-anchors.mjs [--browser /path/to/chrome]
//
// How: it bundles the project, renders six stills of the DevApp composition with the `probe` prop on (src/dev/DevProbe.tsx reads the
// rectangles out of the DOM and logs them), collects the logs and merges them. Run it again after ANY change to a UI component that moves
// a target (src/ui/*), then commit the JSON. `anchors.ts` reads that file; nothing in it is typed by hand.
//
// Frames (GLOBAL): 745 Workspace form, 1230 Blast panel event log (scrolled; the scroll is added back), 1340 Blast panel after the audit (the Secrets
// card, not scrolled), 2150 Attack Lab (list not scrolled), 3930 Report (cards settled; the page scroll is added back), 4040 Report after the re-verify line, 4700 Infra.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const bi = args.indexOf("--browser");
const browserExecutable = bi >= 0 ? args[bi + 1] : undefined;
const FIRST = 600; // APP_FIRST_FRAME: composition frame = global frame - 600
const GLOBAL_FRAMES = [745, 1230, 1340, 2150, 3930, 4040, 4700];

const serveUrl = await bundle({ entryPoint: resolve(ROOT, "src/index.ts") });
const inputProps = { anchors: false, probe: true };
const composition = await selectComposition({ serveUrl, id: "DevApp", inputProps, browserExecutable, chromiumOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] } });

const merged = {};
for (const g of GLOBAL_FRAMES) {
  let line = null;
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame: g - FIRST,
    output: resolve(ROOT, `out/qa/probe-${g}.png`),
    browserExecutable,
    chromiumOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
    onBrowserLog: (log) => {
      if (log.text.startsWith("ANCHORS_ERROR")) throw new Error(`frame ${g}: ${log.text}`);
      if (log.text.startsWith("ANCHORS ")) line = log.text.slice(8);
    },
  });
  if (!line) throw new Error(`frame ${g}: the probe logged nothing`);
  Object.assign(merged, JSON.parse(line));
  console.log(`measured f${g}: ${Object.keys(JSON.parse(line)).join(", ")}`);
}
const out = resolve(ROOT, "src/config/anchors.measured.json");
writeFileSync(out, JSON.stringify(merged, null, 2) + "\n");
console.log(`wrote ${out}`);
