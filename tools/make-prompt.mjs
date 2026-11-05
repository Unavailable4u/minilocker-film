// Assembles a paste-ready prompt for one patch.
//   node tools/make-prompt.mjs 0
//   node tools/make-prompt.mjs 6 --repo ../MiniLocker   (--draft still works)
// Output: prompts-out/patch-NN.md  (context header + files + BIBLE sections + patch prompt)
// Pure Node 20, no dependencies, works on Windows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = args.find((a) => /^\d+$/.test(a));
if (num === undefined) {
  console.error("Usage: node tools/make-prompt.mjs <patch number 0-26> [--repo <path to MiniLocker repo>] [--no-files]");
  process.exit(1);
}
const nn = String(num).padStart(2, "0");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/patches/manifest.json"), "utf8"));
const patch = manifest[nn];
if (!patch) {
  console.error(`No patch ${nn}. Valid: 00-24 and 26.`);
  process.exit(1);
}
const draft = flag("--repo") || flag("--draft") || process.env.MINILOCKER_REPO || "";
const withFiles = !args.includes("--no-files");

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\s+$/, "");
const ticks = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const fence = (txt) => (txt.includes("```") ? "````" : "```");
const lang = (p) => ({ ".ts": "ts", ".tsx": "tsx", ".py": "python", ".json": "json", ".md": "md", ".css": "css", ".mjs": "js" }[path.extname(p)] || "");

const out = [];
const notes = [];

out.push(read("docs/guide/context-header.md"));

// 1. existing files from this repo
const existing = withFiles ? ticks(patch.pasteExisting) : [];
if (existing.length) {
  out.push("\n\n=== EXISTING FILES FROM MY minilocker-film REPO (current content) ===");
  for (const rel of existing) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      notes.push(`MISSING existing file: ${rel} (create it in an earlier patch first)`);
      continue;
    }
    const body = read(rel);
    const f = fence(body);
    out.push(`\n--- FILE: ${rel} ---\n${f}${lang(rel)}\n${body}\n${f}`);
  }
}

// 2. reference files from the MiniLocker repo
const refs = withFiles ? ticks(patch.pasteReference) : [];
if (refs.length) {
  out.push("\n\n=== REFERENCE FILES FROM THE MiniLocker REPO (read-only; port them, do not invent the UI) ===");
  out.push(`Which parts are needed: ${patch.pasteReference}`);
  for (const rel of refs) {
    if (!draft) {
      notes.push(`Reference file not included (no --repo path): ${rel}`);
      continue;
    }
    const full = path.join(draft, rel);
    if (!fs.existsSync(full)) {
      notes.push(`MISSING reference file in MiniLocker repo: ${rel}`);
      continue;
    }
    const body = fs.readFileSync(full, "utf8").replace(/\s+$/, "");
    const f = fence(body);
    out.push(`\n--- REFERENCE FILE: ${rel} ---\n${f}${lang(rel)}\n${body}\n${f}`);
  }
}

// 3. BIBLE sections
const bibleParts = [
  ...patch.sections.map((n) => `docs/bible/bible-${String(n).padStart(2, "0")}.md`),
  ...patch.appendices.map((a) => `docs/bible/appendix-${a}.md`),
];
if (bibleParts.length) {
  out.push(`\n\n=== FILM BIBLE SECTIONS (${patch.attachRaw}) ===`);
  for (const p of bibleParts) out.push("\n" + read(p));
}

// 4. the patch prompt
out.push("\n\n=== THE PATCH PROMPT ===\n");
out.push(read(`docs/patches/prompts/patch-${nn}.prompt.txt`));

const outDir = path.join(ROOT, "prompts-out");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `patch-${nn}.md`);
const text = out.join("\n") + "\n";
fs.writeFileSync(outFile, text, "utf8");

console.log(`\n${patch.title}`);
console.log(`Needs patches: ${patch.needs}`);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}  (${text.length.toLocaleString()} characters, about ${Math.round(text.length / 4).toLocaleString()} tokens)`);
console.log(`Open it, select all, paste into a NEW AI session.`);
if (notes.length) {
  console.log("\nHeads-up:");
  for (const n of notes) console.log("  - " + n);
}
if (!withFiles) {
  console.log(`\n--no-files used. Paste these yourself:\n  existing: ${patch.pasteExisting}\n  reference: ${patch.pasteReference}`);
}
console.log("\nAfter the AI answers: save each file at the path it gives, then run the CHECK commands at the end of its answer.\n");
