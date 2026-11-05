// MiniLocker film: THE SOUND AS DATA (patch 22, BIBLE 9). One typed list of cues { frame, file, volume }, built from the frames the scenes already export
// (script.ts, timeline.ts, the *_CUE_ANCHORS of every scene, typing.ts, hash.ts). Nothing here types a frame number for a beat of its own: a retime in a scene
// moves its sound by itself. The only literals are the few the storyboard fixes in the BIBLE and no scene owns (S0's glitch burst is read from S0_TIMING).
//
// FILES. Every effect is synthesized by `npm run sfx` (scripts/make-sfx.mjs) into public/audio/*.wav and listed, with its length in frames, in
// public/audio/manifest.json. This file imports the manifest AT BUILD TIME (never reads the disk while rendering) and refuses to load if a cue names a file
// the manifest does not list, or if the manifest and `SFX_FILES` disagree: run `npm run sfx`.
//
// RULES (checked at import, so `tsc` + the Studio + `npm run motion` all trip on a broken retime):
//   - SILENCE f2370-2399 (BIBLE 9, S4_CUE_ANCHORS.silence): no cue may START in it, and no cue that starts earlier may still be sounding on f2370.
//   - S0's near-silence f285-299: nothing starts in it (the sub-impact of S1 is on f300).
//   - every cue is on a whole frame inside the film; every file is a known one.
import manifestJson from "../../public/audio/manifest.json";
import { s3Data } from "../scenes/s3/data";
import { S3_TIMING, s3ReadFrames } from "../scenes/s3/shared";
import { S3C_TIMING } from "../scenes/s3/S3c";
import { s4Data } from "../scenes/s4/data";
import { S4_CUE_ANCHORS, S4_HASH, S4_TIMING } from "../scenes/s4/shared";
import { s5Data } from "../scenes/s5/data";
import { S5_CUE_ANCHORS, S5_TIMING } from "../scenes/S5Page";
import { S0_TIMING } from "../scenes/S0Hook";
import { S1_TIMING } from "../scenes/S1Title";
import { S2C_TIMING } from "../scenes/s2/S2c";
import { S6_TIMING } from "../scenes/S6Evidence";
import { S7_TIMING } from "../scenes/S7Value";
import { S8_CUE_ANCHORS } from "../scenes/S8Vultr";
import { S9A_CUE_ANCHORS } from "../scenes/s9/S9a";
import { ARCH_NODE_IDS } from "../gfx/ArchitectureDiagram";
import { getFixSession, getHostileSession, typedCommands } from "./filmState";
import { stepEvents } from "../ui/StepStream";
import { lockedCount } from "../lib/hash";
import { typedCount, typingEndFrame } from "../lib/typing";
import { FIX_RUN, GAUGES, LAB, REPORT, TYPED } from "./script";
import { FPS, TOTAL } from "./timeline";

// ---------------------------------------------------------------------------------------------- the files

/** Every sound file `scripts/make-sfx.mjs` writes (name without `.wav`). The script and this list must agree: the manifest check below says so when they do not. */
export const SFX_FILES = [
  "key-1",
  "key-2",
  "key-3",
  "ui-tick",
  "click",
  "whoosh",
  "sub-impact",
  "shimmer",
  "chime",
  "ledger-tick",
  "alarm-blip",
  "thud",
  "glass-shatter",
  "rewind-riser",
  "lock-1",
  "lock-2",
  "lock-3",
  "lock-4",
  "lock-5",
  "lock-6",
  "lock-7",
  "lock-8",
  "stamp",
  "verify-sweep",
  "verify-sweep-long",
  "success-chord",
  "tail",
  "slam",
  "glitch",
  "pop-1",
  "pop-2",
  "pop-3",
  "low-blip",
  "hit",
  "pad-swell",
] as const;

export type SfxFile = (typeof SFX_FILES)[number];

/** One sound on the timeline. `volume` is a plain linear gain on top of the file's own level (effects peak at -12 dBFS, keys at -24). */
export interface SfxCue {
  /** the global frame the file starts on */
  frame: number;
  file: SfxFile;
  volume: number;
}

interface Manifest {
  files: Record<string, { seconds: number; frames: number; peakDbfs: number; sha256: string }>;
  music: boolean;
  voice: boolean;
}

/** public/audio/manifest.json as `npm run sfx` wrote it. */
export const SFX_MANIFEST = manifestJson as unknown as Manifest;
/** Whether the OPTIONAL slots are filled. Read from the manifest, never from the disk: run `npm run sfx` after adding or removing music.mp3 / voice.wav. */
export const HAS_MUSIC = Boolean(SFX_MANIFEST.music);
export const HAS_VOICE = Boolean(SFX_MANIFEST.voice);

/** Length of a file in frames (the manifest's own number). */
export function sfxFrames(file: SfxFile): number {
  const entry = SFX_MANIFEST.files[`${file}.wav`];
  if (!entry) throw new Error(`sfx: public/audio/manifest.json does not list ${file}.wav. Run: npm run sfx`);
  return entry.frames;
}

// ---------------------------------------------------------------------------------------------- the rules

/** BIBLE 9: the film's only silence, inclusive. Read from S4_CUE_ANCHORS, never typed again. */
export const SFX_SILENCE = { from: S4_CUE_ANCHORS.silence.from, to: S4_CUE_ANCHORS.silence.to } as const;
/** BIBLE 9: S0's near-silence before the title's impact (the sub-impact is on f300). */
export const SFX_NEAR_SILENCE = { from: 285, to: 299 } as const;

/**
 * The unit-style assertion of the brief: throws when a cue lands in the silence (f2370-2399), when a cue that started before it is still sounding on its first
 * frame, when anything starts in S0's near-silence, or when a cue is off the timeline. Exported so a check script can call it on a hand-made list.
 */
export function assertSfxRules(cues: readonly SfxCue[]): void {
  for (const c of cues) {
    const where = `${c.file} @ f${c.frame}`;
    if (!(SFX_FILES as readonly string[]).includes(c.file)) throw new Error(`sfx: unknown file in cue ${where}`);
    if (!Number.isInteger(c.frame) || c.frame < 0 || c.frame >= TOTAL) throw new Error(`sfx: cue ${where} is not a whole frame inside the film (0..${TOTAL - 1})`);
    if (!(c.volume > 0 && c.volume <= 1.5)) throw new Error(`sfx: cue ${where} has volume ${c.volume} (expected more than 0 and at most 1.5)`);
    if (c.frame >= SFX_SILENCE.from && c.frame <= SFX_SILENCE.to) {
      throw new Error(`sfx: cue ${where} lands in the SILENCE f${SFX_SILENCE.from}-${SFX_SILENCE.to}: no cue is allowed there (BIBLE 9)`);
    }
    if (c.frame < SFX_SILENCE.from && c.frame + sfxFrames(c.file) > SFX_SILENCE.from) {
      throw new Error(`sfx: cue ${where} (${sfxFrames(c.file)} frames) is still sounding on f${SFX_SILENCE.from}, where the SILENCE starts (BIBLE 9)`);
    }
    if (c.frame >= SFX_NEAR_SILENCE.from && c.frame <= SFX_NEAR_SILENCE.to) {
      throw new Error(`sfx: cue ${where} starts in S0's near-silence f${SFX_NEAR_SILENCE.from}-${SFX_NEAR_SILENCE.to} (BIBLE 9)`);
    }
  }
}

// ---------------------------------------------------------------------------------------------- building blocks

const len = (s: string): number => Array.from(s).length;

/** The four counted claims of S6's strip (BIBLE 6 S6: four StatNumerals, one per beat). */
const S6_CLAIM_COUNT = 4;
/** The dial's five arcs (S1 builds them, S9a reforms the same five). */
const DIAL_ARC_COUNT = 5;

type Adder = (frame: number, file: SfxFile, volume?: number) => void;

/**
 * One key tick on every frame on which at least one character of a typed line arrives (38-75 characters a second is faster than 30 fps: two characters on one
 * frame are one tick). The count comes from typing.ts with the line's own start and options, so the tick and the character are on the same frame. The key
 * variant (key-1..3) is a fixed function of the character index and the frame, so the render is the same every time.
 */
function keyTicks(add: Adder, text: string, start: number, end: number, opts: Parameters<typeof typedCount>[3], volume: number, every = 1): void {
  const total = len(text);
  let prev = 0;
  let sinceTick = every;
  for (let f = start; f <= end; f++) {
    const n = f >= end ? total : typedCount(text, f, start, opts);
    if (n > prev) {
      if (sinceTick >= every) {
        add(f, `key-${((n * 5 + f) % 3) + 1}` as SfxFile, volume);
        sinceTick = 0;
      }
      prev = n;
    }
    sinceTick++;
  }
}

/** A typed line that is NOT driven by typing.ts (an overlay that reveals it linearly): a tick every `every` frames over [from, to). */
function linearKeyTicks(add: Adder, from: number, to: number, volume: number, every: number): void {
  let k = 0;
  for (let f = from; f < to; f += every) add(f, `key-${(k++ % 3) + 1}` as SfxFile, volume);
}

// ---------------------------------------------------------------------------------------------- the cue list (BIBLE 9, scene by scene)

function build(): SfxCue[] {
  const cues: SfxCue[] = [];
  const add: Adder = (frame, file, volume = 1) => {
    cues.push({ frame: Math.round(frame), file, volume });
  };
  const fix = getFixSession();
  const hostile = getHostileSession();
  const pin = (key: string): number => {
    const f = fix.pinFrame.get(key);
    if (f === undefined) throw new Error(`sfx: the fix run has no "${key}" pin (src/config/script.ts)`);
    return f;
  };

  // ---- S0 Hook (f0-299): four slam hits on the terminal's beats, the glitch burst, then near-silence from f285
  for (const h of S0_TIMING.hits) add(h, "slam", 0.9);
  add(S0_TIMING.glitch.start, "glitch", 0.8);

  // ---- S1 Title (f300-599): sub-impact on the hook dot's impact, ticks as the rings and the arcs draw, shimmer on the lockup, a soft whoosh as the dial flies
  add(S1_TIMING.impact, "sub-impact", 1);
  add(S1_TIMING.impact + 15, "ui-tick", 0.5); // ring r10.4 starts (Mark.tsx: ring 2 is 15 frames after ring 1)
  add(S1_TIMING.impact + 30, "ui-tick", 0.5);
  for (let i = 0; i < DIAL_ARC_COUNT; i++) add(S1_TIMING.arcs.start + i * S1_TIMING.arcs.every, "ui-tick", 0.4);
  add(S1_TIMING.lockup, "shimmer", 0.8);
  add(S1_TIMING.flight.start, "whoosh", 0.35);

  // ---- S2 Work (f600-1499): a key tick per typed character of every terminal command (the terminal's own plan), the click on Run, a soft ledger tick per step
  // line, the chime at the hidden check, three flip ticks for the gauges the audit flips, and the whip to S3 (patch 25: f1474-1500, the whoosh peaks on f1500)
  for (const c of typedCommands(fix)) keyTicks(add, c.text, c.start, c.end, c.opts, 0.9);
  add(FIX_RUN.pressAt, "click", 1);
  for (const e of stepEvents(fix.events)) {
    const f = fix.frameOfId.get(e.id);
    if (f !== undefined) add(f, "ledger-tick", 0.8);
  }
  add(pin("hiddenCheck"), "chime", 0.8);
  GAUGES.auditOrder.forEach((_, i) => add(pin("audit") + i * GAUGES.auditStagger, "ui-tick", 0.6));
  add(S2C_TIMING.whip.start, "whoosh", 0.9);

  // ---- S3 Decoys (f1500-2099): an alarm blip per decoy read, the thud at the refusal (the packet hits the wall), the verify sweep over the audit, the stamp,
  // and a soft whoosh for the swing to the nav (patch 25: gentler, same frames)
  for (const f of s3ReadFrames(s3Data().reads)) add(f, "alarm-blip", 0.9);
  add(S3_TIMING.send.hit, "thud", 1);
  add(S3_TIMING.audit.from, "verify-sweep", 0.8);
  add(S3_TIMING.stamp.at, "stamp", 1);
  add(S3C_TIMING.swing.from, "whoosh", 0.45);

  // ---- S4 Rewind (f2100-3299)
  add(LAB.pressAt, "click", 0.8);
  // the wipe command types on the overlay's linear reveal (S4_TIMING.type), one tick every second frame
  linearKeyTicks(add, S4_TIMING.type.from, S4_TIMING.type.from + S4_TIMING.type.frames, 0.9, 2);
  // the wipe: the glass shatters, then SILENCE f2370-2399 (a RULE: no cue is placed there, assertSfxRules throws if one lands in it)
  add(S4_CUE_ANCHORS.glassShatter.frame, "glass-shatter", 1);
  // the sound returns on f2400 with the rewind riser, which peaks as the container is complete (f2445)
  add(S4_CUE_ANCHORS.soundReturns.frame, "rewind-riser", 0.9);
  // the restored hash locks left to right: one pluck per two characters (eight in all) on a rising pentatonic step, then THE tick
  {
    const n = S4_HASH.hexShown;
    const { from, frames } = S4_TIMING.hashLock;
    let k = 1;
    for (let f = from; f <= from + frames && k <= 8; f++) {
      while (k <= 8 && lockedCount(n, f, from, frames) >= Math.ceil((k * n) / 8)) {
        add(f, `lock-${k}` as SfxFile, 0.8);
        k++;
      }
    }
    if (k !== 9) throw new Error(`sfx: the hash lock of S4b2 (f${from}-${from + frames}) did not lock ${n} characters in time for eight ticks`);
  }
  add(S4_CUE_ANCHORS.hashTick.frame, "chime", 0.6);
  // the cat command types, the restored line prints
  linearKeyTicks(add, S4_CUE_ANCHORS.catCommand.from, S4_CUE_ANCHORS.catCommand.to, 0.7, 1);
  linearKeyTicks(add, S4_CUE_ANCHORS.catLine.from, S4_CUE_ANCHORS.catLine.to, 0.5, 2);
  // the checks light one by one (only the real ones), then the verdict stamps in (one hit)
  const data4 = s4Data();
  S4_CUE_ANCHORS.checkTicks.slice(0, data4.outcome.checksTotal).forEach((f) => add(f, "ui-tick", 0.5));
  add(S4_CUE_ANCHORS.stamp.frame, "stamp", 1);
  // the chain builds (a soft tick per block, linear 0..1 over its window), the press, the sweep, the seal (one hit)
  {
    const { from, frames } = S4_TIMING.chain;
    const n = data4.chain.length;
    for (let k = 0; k < n; k++) add(from + Math.round((k * frames) / n), "ledger-tick", 0.7);
  }
  add(S4_CUE_ANCHORS.press.frame, "click", 0.6);
  add(S4_CUE_ANCHORS.verifySweep.from, "verify-sweep-long", 0.7);
  add(S4_CUE_ANCHORS.seal.frame, "hit", 0.9);
  // the proof beat: a tick per numeral (the clip's own audio is removed: S4b6 plays it muted)
  for (const f of S4_CUE_ANCHORS.numerals) add(f, "ui-tick", 0.6);

  // ---- S5 Page (f3300-3719): the whip to the tab, a hit per ledger line, a low blip for the denial, the compromised agent's command typing
  add(S5_TIMING.whip.lands - 26, "whoosh", 0.6); // the whoosh peaks 26 frames after it starts: it peaks as the whip lands (f3330)
  add(S5_CUE_ANCHORS.injectionLine, "hit", 0.8);
  keyTicks(add, s5Data().command, TYPED.hostileCommand.start, typingEndFrame(s5Data().command, TYPED.hostileCommand.start, TYPED.hostileCommand.opts), TYPED.hostileCommand.opts, 0.8);
  add(S5_CUE_ANCHORS.policyDeny, "hit", 0.8);
  add(S5_CUE_ANCHORS.policyDeny, "low-blip", 0.8);
  s5Data().egress.forEach((_, i) => add(S5_TIMING.egress.at + i * S5_TIMING.egress.stagger, "hit", 0.7));
  add(S5_CUE_ANCHORS.stamp, "stamp", 0.8);
  if (S5_CUE_ANCHORS.approvalDenied !== null) {
    add(S5_TIMING.approval.at, "ui-tick", 0.5);
    add(S5_CUE_ANCHORS.approvalDenied, "hit", 0.8);
    add(S5_CUE_ANCHORS.approvalDenied, "low-blip", 0.8);
  }

  // ---- S6 Evidence (f3720-4259): a flip tick per report card, the click and the success chord of the verify, a tick per counted numeral
  const reportDims = Object.keys((REPORT.source === "fix" ? fix : hostile).report.dimensions).length;
  for (let i = 0; i < reportDims; i++) add(REPORT.cardsFrom + i * REPORT.cardEvery, "ui-tick", 0.5);
  add(REPORT.pressAt, "click", 0.6);
  add(REPORT.doneAt, "success-chord", 0.7);
  for (let i = 0; i < S6_CLAIM_COUNT; i++) add(S6_TIMING.claimsFrom + 12 + i * S6_TIMING.numeralEvery, "ui-tick", 0.6);

  // ---- S7 Value (f4260-4559): two soft ticks, the ticket and the report landing
  add(S7_TIMING.ticket.from, "ui-tick", 0.5);
  add(S7_TIMING.report.from, "ui-tick", 0.5);

  // ---- S8 Vultr (f4560-4979): a pop per node of the diagram (three pitches), under a warmer pad swell
  {
    const n = ARCH_NODE_IDS.length;
    const nodeStep = n > 1 ? (S8_CUE_ANCHORS.nodesDone - S8_CUE_ANCHORS.build - 8) / (n - 1) : 0; // S8Vultr's NODE_STEP, recovered from its own anchors
    for (let i = 0; i < n; i++) add(S8_CUE_ANCHORS.build + Math.round(i * nodeStep), `pop-${(i % 3) + 1}` as SfxFile, 0.6);
    add(S8_CUE_ANCHORS.build, "pad-swell", 0.6);
  }

  // ---- S9 Outro (f4980-5099): the tail starts as the Mark lands and is exactly as long as the rest of the film (90 frames, f5010-5099)
  add(S9A_CUE_ANCHORS.markLanded, "tail", 1);

  cues.sort((a, b) => a.frame - b.frame || a.file.localeCompare(b.file));
  return cues;
}

// ---------------------------------------------------------------------------------------------- import-time checks

(() => {
  for (const name of SFX_FILES) {
    if (!SFX_MANIFEST.files[`${name}.wav`]) throw new Error(`sfx: public/audio/manifest.json does not list ${name}.wav (it is in SFX_FILES). Run: npm run sfx`);
  }
  for (const file of Object.keys(SFX_MANIFEST.files)) {
    if (!(SFX_FILES as readonly string[]).includes(file.replace(/\.wav$/, ""))) {
      throw new Error(`sfx: public/audio/manifest.json lists ${file}, which is not in SFX_FILES (src/config/sfx.ts). Add it there, or run: npm run sfx`);
    }
  }
  if (SFX_MANIFEST.files["tail.wav"].frames !== TOTAL - S9A_CUE_ANCHORS.markLanded) {
    throw new Error(`sfx: tail.wav is ${SFX_MANIFEST.files["tail.wav"].frames} frames; it must be ${TOTAL - S9A_CUE_ANCHORS.markLanded} to end on the film's last frame (f${TOTAL - 1})`);
  }
})();

/** Every sound of the film, in frame order. Pure data: the Studio and the render both play exactly this list. */
export const SFX_CUES: readonly SfxCue[] = build();

assertSfxRules(SFX_CUES);

/** Frames per second the cues were laid out at (a sanity export for check scripts). */
export const SFX_FPS = FPS;
