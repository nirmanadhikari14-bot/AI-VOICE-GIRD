#!/usr/bin/env python3
"""
VoiceGuard AI — SIH Demonstration Audio Generator
Phase 34: Final SIH Demonstration & Presentation Preparation (SIH26104)

Generates two licensed, clean, synthetic test WAV files for demonstration:
1. Case A: Genuine Voice (16kHz, natural vocal tract harmonics & smooth vibrato)
2. Case B: Synthetic Voice Clone (16kHz, vocoder phase discontinuities & high-frequency buzzing)
"""

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 16000  # 16 kHz standard
DURATION_SEC = 3.0   # 3 seconds sample duration
NUM_SAMPLES = int(SAMPLE_RATE * DURATION_SEC)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "datasets" / "demo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_genuine_voice(filepath: Path):
    """
    Synthesize speech-like acoustic pattern with natural pitch vibrato and formants:
    Fundamental F0 ~ 130 Hz with decaying vocal tract formants (F1: 700Hz, F2: 1220Hz, F3: 2600Hz).
    """
    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)        # Mono
        wav_file.setsampwidth(2)       # 16-bit PCM
        wav_file.setframerate(SAMPLE_RATE)

        raw_bytes = bytearray()
        for i in range(NUM_SAMPLES):
            t = i / SAMPLE_RATE
            # Smooth attack and decay envelope
            envelope = math.sin(math.pi * t / DURATION_SEC) ** 0.5
            # Natural vocal fold vibrato (5 Hz pitch modulation)
            vibrato = 1.0 + 0.02 * math.sin(2 * math.pi * 5 * t)
            f0 = 130.0 * vibrato

            # Harmonic formants
            val = (
                0.60 * math.sin(2 * math.pi * f0 * t) +
                0.25 * math.sin(2 * math.pi * 2 * f0 * t) +
                0.15 * math.sin(2 * math.pi * 3 * f0 * t) +
                0.08 * math.sin(2 * math.pi * 700 * t) +
                0.04 * math.sin(2 * math.pi * 1220 * t)
            ) * envelope

            # Scale to 16-bit signed integer
            sample_int = int(max(min(val * 16000, 32767), -32768))
            raw_bytes.extend(struct.pack("<h", sample_int))

        wav_file.writeframes(raw_bytes)
    print(f"✅ Generated Case A (Genuine Voice): {filepath.name} ({len(raw_bytes)} bytes)")

def generate_synthetic_clone(filepath: Path):
    """
    Synthesize vocoder-like artifacts characteristic of deepfake voice clones:
    Flat pitch (zero natural vibrato), phase jitter, metallic buzz at 3500Hz-7000Hz,
    and abrupt spectral transitions.
    """
    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)

        raw_bytes = bytearray()
        for i in range(NUM_SAMPLES):
            t = i / SAMPLE_RATE
            envelope = 0.85  # Abrupt rectangular/unnatural onset without smooth breathing envelope

            # Fixed robotic pitch (rigid 145 Hz, no micro-prosodic variation)
            f0 = 145.0

            # High-frequency phase-incoherent neural vocoder buzz
            phase_jitter = 0.08 * math.sin(2 * math.pi * 120 * t)
            buzz = 0.18 * math.sin(2 * math.pi * 3600 * t + phase_jitter) + 0.12 * math.sin(2 * math.pi * 6800 * t)

            val = (
                0.55 * math.sin(2 * math.pi * f0 * t) +
                0.20 * math.sin(2 * math.pi * 2 * f0 * t) +
                0.15 * math.sin(2 * math.pi * 4 * f0 * t) +
                buzz
            ) * envelope

            sample_int = int(max(min(val * 16000, 32767), -32768))
            raw_bytes.extend(struct.pack("<h", sample_int))

        wav_file.writeframes(raw_bytes)
    print(f"✅ Generated Case B (Synthetic Clone): {filepath.name} ({len(raw_bytes)} bytes)")

def main():
    print("=" * 60)
    print(" VoiceGuard AI — Demonstration Audio Sample Generator")
    print("=" * 60)
    case_a = OUTPUT_DIR / "case_a_genuine_voice.wav"
    case_b = OUTPUT_DIR / "case_b_synthetic_clone.wav"

    generate_genuine_voice(case_a)
    generate_synthetic_clone(case_b)
    print("\nAudio sample generation complete. Ready for SIH live testing.")

if __name__ == "__main__":
    main()

