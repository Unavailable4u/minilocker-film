#!/usr/bin/env python3
"""MiniLocker film: frame-accurate voice-over with Kyutai Pocket TTS (runs on CPU, no GPU, no API key).

What it does
  1. Reads voiceBlocks (V0..V9: id, start frame, text) straight from src/config/copy.ts, so editing the script there is enough.
  2. Speaks every sentence with Pocket TTS (one voice for the whole film).
  3. Trims each clip's leading/trailing silence, so the FIRST WORD lands exactly on the block's start frame.
  4. If a block would run into the next block, or into the film's deliberate silence (f2370-2399, nothing may sound there),
     it speeds the block up a little (ffmpeg atempo, at most --max-tempo) and, when needed, jumps over the silence.
  5. Writes public/audio/voice.wav: ONE file, 48 kHz, 16-bit, mono, exactly 5100 frames (170 s), which is the slot
     src/audio/FilmAudio.tsx plays from frame 0.  Also writes out/voice-timing.txt (start/end frame of every piece).

Usage (normally through make-voice.bat):
  python scripts/make-voice.py [--voice jane] [--max-tempo 1.25] [--gap 8] [--silence 2370-2399] [--dry-run]

--voice takes a built-in name (jane, alba, marius, ...) or the path of a wav/mp3 sample to clone (about 5 s is enough).
--dry-run does not load the model: it prints the estimated schedule from the word counts only.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
TOTAL = 5100                      # src/config/timeline.ts
SR = 48000                        # film audio format (public/audio/manifest.json)
SPF = SR // FPS                   # samples per frame = 1600
COPY_TS = ROOT / "src" / "config" / "copy.ts"
OUT_WAV = ROOT / "public" / "audio" / "voice.wav"
OUT_REPORT = ROOT / "out" / "voice-timing.txt"

TARGET_RMS_DB = -21.0             # speech level before the film's loudness pass (render.mjs normalises to -16 LUFS)
PEAK_LIMIT = 0.89                 # about -1 dBFS
EDGE_FADE_S = 0.008
TRIM_DB = -48.0                   # below this a sample counts as silence at the clip edges
END_MARGIN = 6                    # frames of air kept before the next block / the silence / the end of the film
SIL_GUARD_BEFORE = 6              # voice must be gone this many frames before the silence starts
SIL_GUARD_AFTER = 4               # and may only come back this many frames after it ends


# ------------------------------------------------------------------------------------------------ the script
def read_blocks() -> list[dict]:
    src = COPY_TS.read_text(encoding="utf-8")
    m = re.search(r"export const voiceBlocks\s*=\s*\[(.*?)\]\s*as const", src, re.S)
    if not m:
        sys.exit("ERROR: voiceBlocks not found in src/config/copy.ts. Fix: restore copy.ts from git.")
    pat = re.compile(r'id:\s*"(V\d+)"\s*,\s*start:\s*(\d+)\s*,\s*text:\s*"((?:[^"\\]|\\.)*)"', re.S)
    blocks = [
        {"id": i, "start": int(s), "text": t.replace('\\"', '"').replace("\\'", "'").replace("\\n", " ")}
        for i, s, t in pat.findall(m.group(1))
    ]
    if not blocks:
        sys.exit("ERROR: could not read any block from voiceBlocks in src/config/copy.ts.")
    blocks.sort(key=lambda b: b["start"])
    return blocks


def sentences(text: str) -> list[str]:
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]
    return parts or [text.strip()]


# ------------------------------------------------------------------------------------------------ audio helpers
def trim(a: np.ndarray) -> np.ndarray:
    thr = 10 ** (TRIM_DB / 20)
    idx = np.flatnonzero(np.abs(a) > thr)
    if idx.size == 0:
        return a
    pad = int(0.01 * SR)
    return a[max(0, idx[0] - pad): min(a.size, idx[-1] + pad)]


def fade(a: np.ndarray) -> np.ndarray:
    n = min(int(EDGE_FADE_S * SR), a.size // 2)
    if n > 0:
        ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
        a = a.copy()
        a[:n] *= ramp
        a[-n:] *= ramp[::-1]
    return a


def rms_db(a: np.ndarray) -> float:
    return 20 * np.log10(max(float(np.sqrt(np.mean(a ** 2))), 1e-9))


def tempo(a: np.ndarray, factor: float) -> np.ndarray:
    """ffmpeg atempo (pitch-preserving). factor 1.0 returns the clip untouched."""
    if abs(factor - 1.0) < 1e-3:
        return a
    from scipy.io import wavfile

    with tempfile.TemporaryDirectory() as d:
        src, dst = Path(d) / "in.wav", Path(d) / "out.wav"
        wavfile.write(src, SR, (np.clip(a, -1, 1) * 32767).astype(np.int16))
        r = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-filter:a", f"atempo={factor:.4f}", str(dst)],
            capture_output=True, text=True,
        )
        if r.returncode != 0:
            sys.exit(f"ERROR: ffmpeg atempo failed: {r.stderr.strip()}\nFix: make sure ffmpeg works (ffmpeg -version).")
        sr, out = wavfile.read(dst)
        return out.astype(np.float32) / 32768.0


# ------------------------------------------------------------------------------------------------ scheduling
def place(durs: list[int], start: int, gap: int, sil: tuple[int, int] | None, limit: int):
    """Lay clips (lengths in frames) one after the other from `start`. A clip that would touch the silence jumps over it.
    Returns [(clip_start, clip_end)] or None when the last clip ends after `limit`."""
    spots, t = [], start
    for d in durs:
        if sil and t < sil[1] + SIL_GUARD_AFTER and t + d > sil[0] - SIL_GUARD_BEFORE:
            t = sil[1] + SIL_GUARD_AFTER  # this clip would touch the silence: it starts after it instead
        spots.append((t, t + d))
        t += d + gap
    return spots if spots[-1][1] <= limit else None


def schedule(clips: list[np.ndarray], start: int, gap: int, sil, limit: int, max_tempo: float):
    """Find the smallest speed-up (1.00 .. max_tempo) at which the block fits. Returns (factor, spots, fits)."""
    f = 1.0
    while True:
        durs = [int(np.ceil(c.size / SPF / f)) for c in clips]
        spots = place(durs, start, gap, sil, limit)
        if spots is not None:
            return f, spots, True
        if f >= max_tempo - 1e-9:
            return f, place(durs, start, gap, sil, 10 ** 9), False
        f = min(max_tempo, round(f + 0.01, 2))


# ------------------------------------------------------------------------------------------------ main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", default="jane", help="built-in voice name or path of a wav/mp3 to clone (default: jane)")
    ap.add_argument("--max-tempo", type=float, default=1.25, help="never speed a block up more than this (default 1.25)")
    ap.add_argument("--gap", type=int, default=8, help="frames of pause between the sentences of a block (default 8 = 0.27 s)")
    ap.add_argument("--silence", default="2370-2399", help="frames where nothing may sound, 'from-to' (default 2370-2399), or 'none'")
    ap.add_argument("--dry-run", action="store_true", help="no model: print the schedule estimated from word counts")
    args = ap.parse_args()

    sil = None if args.silence == "none" else tuple(int(x) for x in args.silence.split("-"))  # type: ignore[assignment]
    blocks = read_blocks()
    print(f"{len(blocks)} voice blocks read from src/config/copy.ts: " + ", ".join(f"{b['id']}@f{b['start']}" for b in blocks))

    model = state = None
    if not args.dry_run:
        try:
            from pocket_tts import TTSModel
        except ImportError:
            sys.exit("ERROR: pocket-tts is not installed. Fix: run make-voice.bat (it installs it), or: pip install pocket-tts")
        print(f"Loading Pocket TTS and the voice '{args.voice}' (first run downloads the model, about a minute)...")
        model = TTSModel.load_model()
        state = model.get_state_for_audio_prompt(args.voice)
        print(f"Model ready, {model.sample_rate} Hz.")

    from scipy.signal import resample_poly

    def speak(text: str) -> np.ndarray:
        if args.dry_run:  # ~165 words per minute of silence-with-a-hum, only to size the schedule
            n = int(len(text.split()) * 60 / 165 * SR)
            return np.full(n, 0.1, dtype=np.float32)
        wav = model.generate_audio(state, text, copy_state=True).detach().cpu().numpy().astype(np.float32).reshape(-1)
        wav = resample_poly(wav, SR, int(model.sample_rate)).astype(np.float32)
        wav = trim(wav)
        gain = 10 ** ((TARGET_RMS_DB - rms_db(wav)) / 20)
        return wav * gain

    track = np.zeros(TOTAL * SPF, dtype=np.float32)
    report = [f"voice: {args.voice}   silence: {args.silence}   max tempo: {args.max_tempo}", ""]
    problems = 0

    for i, b in enumerate(blocks):
        sents = sentences(b["text"])
        clips = []
        for k, s in enumerate(sents, 1):
            print(f"  {b['id']} sentence {k}/{len(sents)}: {s[:70]}{'...' if len(s) > 70 else ''}")
            clips.append(speak(s))
        limit = blocks[i + 1]["start"] - END_MARGIN if i + 1 < len(blocks) else TOTAL - 3  # the last block may use the film's last frames
        factor, spots, fits = schedule(clips, b["start"], args.gap, sil, limit, args.max_tempo)
        last_end = spots[-1][1]
        status = "ok" if fits else f"OVER by {(last_end - limit) / FPS:.2f} s"
        if not fits:
            problems += 1
        report.append(f"{b['id']}  starts f{b['start']}  tempo x{factor:.2f}  ends f{last_end}  (limit f{limit})  {status}")
        print(f"  -> {b['id']}: f{b['start']} to f{last_end}, tempo x{factor:.2f}, {status}")
        for k, (clip, (s0, s1)) in enumerate(zip(clips, spots), 1):
            sped = fade(tempo(clip, factor))
            a0 = s0 * SPF
            n = min(sped.size, track.size - a0)
            if n > 0:
                track[a0: a0 + n] += sped[:n]
            jumped = "  (after the silence)" if sil and s0 >= sil[1] and b["start"] < sil[0] else ""
            report.append(f"      sentence {k}: f{s0} - f{s1}{jumped}   {sents[k - 1][:60]}")

    if sil:  # hard guarantee: nothing at all in the silence, whatever happened above
        track[sil[0] * SPF: (sil[1] + 1) * SPF] = 0.0

    peak = float(np.max(np.abs(track)))
    if peak > PEAK_LIMIT:
        track *= PEAK_LIMIT / peak
    report += ["", f"peak {20 * np.log10(max(peak, 1e-9)):.1f} dBFS before limiting", f"length {TOTAL} frames = {TOTAL / FPS:.2f} s"]

    OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    OUT_REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n" + "\n".join(report))

    if args.dry_run:
        print("\nDry run: nothing written except out/voice-timing.txt.")
        return

    from scipy.io import wavfile

    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT_WAV, SR, (np.clip(track, -1, 1) * 32767).astype(np.int16))
    print(f"\nWrote {OUT_WAV.relative_to(ROOT)} ({track.size / SR:.2f} s, {SR} Hz, 16-bit, mono) and out/voice-timing.txt")
    if problems:
        print(f"WARNING: {problems} block(s) are longer than their slot even at x{args.max_tempo}. Shorten that text in "
              "src/config/copy.ts (voiceBlocks) or raise --max-tempo, then run again.")


if __name__ == "__main__":
    main()
