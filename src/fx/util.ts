// Small pure helpers shared by the FX components. Nothing here reads the frame itself.
import { clamp01, signature } from "../lib/ease";

/**
 * In/out progress of an element that is visible from `start` to `end` (global frames).
 * It rises in over `inFrames` from `start`, and leaves over the last `outFrames` before `end` (so at `end` it is gone).
 * Returns { inP, outP } both 0..1 and eased with the signature curve; inP is 1 and outP 0 while the element rests.
 */
export function inOut(
  frame: number,
  start: number,
  end: number,
  inFrames: number,
  outFrames: number,
): { inP: number; outP: number; visible: boolean } {
  const visible = frame >= start && frame < end;
  const inP = signature(clamp01((frame - start) / Math.max(1, inFrames)));
  const outP = signature(clamp01((frame - (end - outFrames)) / Math.max(1, outFrames)));
  return { inP, outP, visible };
}

/** Rough text width in px for CMU Serif 700 / italic (average advance about 0.5 em). Used only to fit and to clamp. */
export const SERIF_ADVANCE = 0.5;
/** Rough advance of CMU Typewriter Text: 0.525 em (it is monospaced). */
export const MONO_ADVANCE = 0.525;

export function estimateWidth(text: string, fontSize: number, advance: number): number {
  return text.length * fontSize * advance;
}

/** Throws a clear error if endFrame is not after startFrame (a typo in a cue must not silently show nothing). */
export function checkRange(who: string, startFrame: number, endFrame: number): void {
  if (!(endFrame > startFrame)) {
    throw new Error(`${who}: endFrame (${endFrame}) must be greater than startFrame (${startFrame})`);
  }
}

/** Splits `text` around the first occurrence of `highlight` (case-sensitive). No highlight, or not found: one plain piece. */
export function splitHighlight(text: string, highlight?: string): { text: string; hl: boolean }[] {
  if (!highlight) return [{ text, hl: false }];
  const i = text.indexOf(highlight);
  if (i < 0) return [{ text, hl: false }];
  const out: { text: string; hl: boolean }[] = [];
  if (i > 0) out.push({ text: text.slice(0, i), hl: false });
  out.push({ text: highlight, hl: true });
  if (i + highlight.length < text.length) out.push({ text: text.slice(i + highlight.length), hl: false });
  return out;
}
