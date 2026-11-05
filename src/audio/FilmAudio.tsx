// The film's sound (patch 22, BIBLE 9). One layer, mounted once by MiniLockerFilm next to the Stage; it draws nothing.
//
//   - every cue of src/config/sfx.ts is an <Audio> inside a <Sequence from={cue.frame}> (layout "none": no wrapper element, no effect on the film's global-frame
//     convention, because the Sequences are SIBLINGS of the visuals, never their parents);
//   - the OPTIONAL music slot public/audio/music.mp3: -18 dB, 1.5 s fade-in, -6 dB under every impact (auto-duck), hard duck to silence over f2370-2399, a 2 s
//     fade-out at the end, and -9 dB under the voice-over when there is one;
//   - the OPTIONAL voice slot public/audio/voice.wav: ONE full-length file aligned to the block frames of `voiceBlocks` (copy.ts); it plays at full level from f0.
//
// PRESENCE of music.mp3 and voice.wav comes from public/audio/manifest.json (src/config/sfx.ts: HAS_MUSIC, HAS_VOICE), never from the disk at render time.
// Run `npm run sfx` after you add or remove either file, or the film ignores it.
//
// The music level is ONE pure function of the global frame (a table built at load): the Studio, a still and the render all hear the same mix.
import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { voiceBlocks } from "../config/copy";
import { HAS_MUSIC, HAS_VOICE, SFX_CUES, SFX_SILENCE, sfxFrames, type SfxFile } from "../config/sfx";
import { FPS, TOTAL } from "../config/timeline";

// ---------------------------------------------------------------------------------------------- the music mix

const db = (x: number): number => Math.pow(10, x / 20);

/** BIBLE 9: the music sits 18 dB under the effects. (The file's own level is whatever you recorded or licensed; this is a gain, not a normalisation.) */
export const MUSIC_GAIN = db(-18);
/** BIBLE 9: -6 dB under an impact, -9 dB under speech. */
export const IMPACT_DUCK = db(-6);
export const VOICE_DUCK = db(-9);

export const MUSIC_MIX = {
  /** fade-in from silence over the first 1.5 s */
  fadeInFrames: Math.round(1.5 * FPS),
  /** fade-out over the last 2 s */
  fadeOutFrames: 2 * FPS,
  /** the duck falls over `attack` frames ending on the impact, holds `hold`, and comes back over `release` */
  duck: { attack: 3, hold: 12, release: 24 },
  /** the hard duck: it is gone `fadeOut` frames before the silence starts and back `fadeIn` frames after it ends (a click-free "hard") */
  silence: { fadeOut: 4, fadeIn: 6 },
  /** speech: the duck falls over `lead` frames before a block starts and comes back over `tail` frames after its estimated end */
  voice: { lead: 8, tail: 12, wordsPerMinute: 150 },
} as const;

/** The files that are impacts for the auto-duck (the small ticks, hits and pops are not: they would hold the music down all film). */
const IMPACTS: readonly SfxFile[] = ["slam", "sub-impact", "thud", "stamp", "glass-shatter"];

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Estimated length of a voice block in frames: its words at 150 wpm (a FIXED schedule, never read from the recording). */
export function voiceBlockFrames(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.round(((words * 60) / MUSIC_MIX.voice.wordsPerMinute) * FPS);
}

function buildMusicTable(): Float64Array {
  const table = new Float64Array(TOTAL).fill(1);
  const mulMin = (f: number, v: number): void => {
    if (f >= 0 && f < TOTAL) table[f] = Math.min(table[f], v);
  };

  // auto-duck under impacts
  const { attack, hold, release } = MUSIC_MIX.duck;
  for (const cue of SFX_CUES) {
    if (!IMPACTS.includes(cue.file)) continue;
    for (let f = cue.frame - attack; f <= cue.frame + hold + release; f++) {
      let d: number;
      if (f < cue.frame) d = 1 - (1 - IMPACT_DUCK) * ((f - (cue.frame - attack)) / attack);
      else if (f < cue.frame + hold) d = IMPACT_DUCK;
      else d = IMPACT_DUCK + (1 - IMPACT_DUCK) * clamp01((f - cue.frame - hold) / release);
      mulMin(f, d);
    }
  }

  // duck under speech (only when the voice file exists)
  if (HAS_VOICE) {
    const { lead, tail } = MUSIC_MIX.voice;
    for (const block of voiceBlocks) {
      const end = block.start + voiceBlockFrames(block.text);
      for (let f = block.start - lead; f <= end + tail; f++) {
        let d: number;
        if (f < block.start) d = 1 - (1 - VOICE_DUCK) * ((f - (block.start - lead)) / lead);
        else if (f <= end) d = VOICE_DUCK;
        else d = VOICE_DUCK + (1 - VOICE_DUCK) * clamp01((f - end) / tail);
        mulMin(f, d);
      }
    }
  }

  // the hard duck: nothing at all over the silence
  const { fadeOut, fadeIn } = MUSIC_MIX.silence;
  for (let f = SFX_SILENCE.from - fadeOut; f <= SFX_SILENCE.to + fadeIn; f++) {
    let d: number;
    if (f < SFX_SILENCE.from) d = 1 - (f - (SFX_SILENCE.from - fadeOut) + 1) / (fadeOut + 1);
    else if (f <= SFX_SILENCE.to) d = 0;
    else d = (f - SFX_SILENCE.to) / (fadeIn + 1);
    mulMin(f, Math.max(0, d));
  }

  // the fade-in and the fade-out of the whole track, and the base gain
  for (let f = 0; f < TOTAL; f++) {
    const fin = clamp01(f / MUSIC_MIX.fadeInFrames);
    const fout = clamp01((TOTAL - 1 - f) / MUSIC_MIX.fadeOutFrames);
    table[f] = MUSIC_GAIN * table[f] * fin * fout;
  }
  return table;
}

let musicTable: Float64Array | null = null;

/** The music's linear gain on a global frame. 0 on every frame of the silence (f2370-2399). */
export function musicGain(frame: number): number {
  if (!musicTable) musicTable = buildMusicTable();
  const f = Math.min(TOTAL - 1, Math.max(0, Math.round(frame)));
  return musicTable[f];
}

// ---------------------------------------------------------------------------------------------- the layer

export const FilmAudio: React.FC = () => (
  <>
    {HAS_MUSIC ? (
      <Sequence from={0} durationInFrames={TOTAL} layout="none" name="music">
        {/* the Sequence starts on f0, so the Audio's own frame IS the global frame */}
        <Audio src={staticFile("audio/music.mp3")} volume={musicGain} />
      </Sequence>
    ) : null}
    {HAS_VOICE ? (
      <Sequence from={0} durationInFrames={TOTAL} layout="none" name="voice-over">
        <Audio src={staticFile("audio/voice.wav")} volume={1} />
      </Sequence>
    ) : null}
    {SFX_CUES.map((cue, i) => (
      <Sequence key={i} from={cue.frame} durationInFrames={Math.max(1, Math.min(sfxFrames(cue.file), TOTAL - cue.frame))} layout="none" name={`sfx ${cue.file}`} showInTimeline={false}>
        <Audio src={staticFile(`audio/${cue.file}.wav`)} volume={cue.volume} />
      </Sequence>
    ))}
  </>
);
