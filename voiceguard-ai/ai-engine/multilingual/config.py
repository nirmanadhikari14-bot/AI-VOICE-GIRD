"""
VoiceGuard AI — Multilingual Configuration
Phase 26: SIH26104
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class MultilingualConfig(BaseModel):
    """Configuration parameters for the multilingual speech processing pipeline."""

    canonical_sample_rate: int = Field(default=16000, description="Canonical audio sample rate in Hz")
    canonical_channels: int = Field(default=1, description="Mono audio channels")
    max_audio_duration_seconds: float = Field(default=60.0, description="Max audio chunk duration in seconds")
    min_audio_duration_seconds: float = Field(default=0.5, description="Min audio duration required for LID")

    # Detection Thresholds
    min_lid_confidence: float = Field(default=0.65, description="Confidence threshold for conclusive LID")
    code_switching_threshold: float = Field(default=0.50, description="Threshold to flag mixed-language content")
    accent_detection_threshold: float = Field(default=0.60, description="Threshold for accent characteristic logging")

    # Execution targets
    default_device: str = Field(default="cpu", description="Execution device target: 'cpu' or 'cuda'")
    inference_timeout_seconds: float = Field(default=10.0, description="Timeout for external ASR / LID inferences")

    # Safety & Fairness Policy Enforcement
    enforce_fairness_guard: bool = Field(
        default=True,
        description="Strictly prevents language or accent signals from penalizing fraud risk scores."
    )
    redact_sensitive_pii_in_transcripts: bool = Field(
        default=True,
        description="Mask account numbers, OTPs, and personal identity tokens in transcripts."
    )

    # Active default models
    default_lid_model: str = Field(
        default="IndicLID-Conformer-v1",
        description="Default Language Identification model"
    )
    default_asr_model: str = Field(
        default="IndicWhisper-Multilingual-v2",
        description="Default ASR transcription model"
    )


# Global configuration singleton
multilingual_config = MultilingualConfig()

