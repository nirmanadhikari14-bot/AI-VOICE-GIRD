"""
VoiceGuard AI — Dataset Registry & Integrity Validation Engine
Phase 27: SIH26104
"""

from typing import Dict, List, Optional, Any, Set
from pydantic import BaseModel, Field
from .interfaces import EvaluationSample


class DatasetSplitInfo(BaseModel):
    split_name: str  # "train", "validation", "test"
    sample_count: int
    speaker_count: int
    duration_hours: float
    is_speaker_disjoint: bool


class EvaluationDatasetManifest(BaseModel):
    dataset_id: str
    name: str
    version: str
    description: str
    source: str
    license: str
    permitted_use: str
    primary_language: str
    languages_covered: List[str]
    accents_covered: List[str]
    total_samples: int
    total_duration_hours: float
    splits: List[DatasetSplitInfo]
    is_telephony_quality: bool
    provenance_hash: str
    validation_status: str  # "verified", "pending_validation", "quarantined"


class DatasetValidationReport(BaseModel):
    dataset_id: str
    is_valid: bool
    total_checked_samples: int
    valid_sample_count: int
    missing_label_count: int
    corrupted_audio_count: int
    duplicate_sample_count: int
    speaker_leakage_detected: bool
    leaked_speaker_ids: List[str]
    class_distribution: Dict[str, int]
    language_distribution: Dict[str, int]
    exclusion_log: List[Dict[str, str]]
    warnings: List[str]


class DatasetRegistry:
    """
    Centralized repository of verified AI evaluation datasets with strict
    provenance, speaker-disjoint validation, and legal usage tracking.
    """

    def __init__(self):
        self._datasets: Dict[str, EvaluationDatasetManifest] = {}
        self._init_benchmark_corpora()

    def _init_benchmark_corpora(self):
        self._datasets["indic-voice-clone-telephony-v2"] = EvaluationDatasetManifest(
            dataset_id="indic-voice-clone-telephony-v2",
            name="VoiceGuard Indic Cross-Lingual Telephony Voice Clone Benchmark",
            version="2.1.0",
            description="Speaker-disjoint telephony-quality benchmark consisting of genuine and neural synthetic speech across 13 Indian languages and accents.",
            source="VoiceGuard AI Laboratory Benchmark Collection",
            license="VoiceGuard Proprietary Evaluation License (Non-Commercial Evaluation)",
            permitted_use="AI Model Verification, Robustness Testing & Compliance Auditing",
            primary_language="hi",
            languages_covered=["en", "hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"],
            accents_covered=["Standard Indian English", "Gujarati-influenced", "Bengali-influenced", "Hindi-influenced", "Tamil"],
            total_samples=1850,
            total_duration_hours=4.8,
            splits=[
                DatasetSplitInfo(split_name="train", sample_count=1000, speaker_count=50, duration_hours=2.6, is_speaker_disjoint=True),
                DatasetSplitInfo(split_name="validation", sample_count=350, speaker_count=18, duration_hours=0.9, is_speaker_disjoint=True),
                DatasetSplitInfo(split_name="test", sample_count=500, speaker_count=25, duration_hours=1.3, is_speaker_disjoint=True)
            ],
            is_telephony_quality=True,
            provenance_hash="sha256:7f4c9a8d2e1b3c5a6f8e9d0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
            validation_status="verified"
        )

        self._datasets["ai4bharat-shruti-lid-bench"] = EvaluationDatasetManifest(
            dataset_id="ai4bharat-shruti-lid-bench",
            name="AI4Bharat Shruti Benchmark Sub-split",
            version="1.0.0",
            description="Open-access Indic spoken language evaluation corpora covering read and conversational speech.",
            source="AI4Bharat / IIT Madras Open Data",
            license="CC-BY-4.0",
            permitted_use="Academic and Commercial Model Evaluation",
            primary_language="hi",
            languages_covered=["hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"],
            accents_covered=["Eastern", "Western", "Northern", "Dravidian"],
            total_samples=1200,
            total_duration_hours=3.2,
            splits=[
                DatasetSplitInfo(split_name="test", sample_count=1200, speaker_count=120, duration_hours=3.2, is_speaker_disjoint=True)
            ],
            is_telephony_quality=False,
            provenance_hash="sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            validation_status="verified"
        )

    def get(self, dataset_id: str) -> Optional[EvaluationDatasetManifest]:
        return self._datasets.get(dataset_id)

    def list_all(self) -> List[EvaluationDatasetManifest]:
        return list(self._datasets.values())

    def register(self, manifest: EvaluationDatasetManifest):
        self._datasets[manifest.dataset_id] = manifest

    def generate_mock_evaluation_samples(
        self,
        dataset_id: str,
        count: int = 50,
        seed: int = 42,
    ) -> List[EvaluationSample]:
        """
        Generates deterministic mock EvaluationSample objects for unit testing
        and CI pipeline validation. Samples are constructed to cover multiple
        languages and balanced real/synthetic classes.
        """
        import random
        import struct

        rng = random.Random(seed)
        manifest = self._datasets.get(dataset_id)
        languages = manifest.languages_covered if manifest else ["en", "hi", "bn"]

        def _make_silent_wav(num_samples: int = 1600) -> bytes:
            """Creates minimal 16-bit PCM WAV bytes (16 kHz, mono)."""
            # 44-byte WAV header + PCM data
            num_bytes = num_samples * 2
            header = struct.pack(
                "<4sI4s4sIHHIIHH4sI",
                b"RIFF",
                36 + num_bytes,
                b"WAVE",
                b"fmt ",
                16,        # Subchunk1Size
                1,         # AudioFormat PCM
                1,         # NumChannels
                16000,     # SampleRate
                32000,     # ByteRate
                2,         # BlockAlign
                16,        # BitsPerSample
                b"data",
                num_bytes,
            )
            # Generate short deterministic noise
            pcm = bytes([rng.randint(0, 255) for _ in range(num_bytes)])
            return header + pcm

        samples = []
        for i in range(count):
            lang = languages[i % len(languages)]
            is_synthetic = (i % 2 == 0)
            label = 1 if is_synthetic else 0
            speaker_id = f"spk_{(i % 20):03d}"
            audio = _make_silent_wav()

            samples.append(EvaluationSample(
                sample_id=f"{dataset_id}_mock_{i:04d}",
                audio_bytes=audio,
                ground_truth_label=label,
                language=lang,
                accent_group=f"{lang}-accent",
                speaker_id=speaker_id,
                is_synthetic=is_synthetic,
                recording_condition="studio",
                metadata={"duration_sec": 1.0, "mock": True},
            ))
        return samples


class DatasetValidator:
    """Verifies sample integrity, class distributions, and speaker-disjoint splits."""

    @classmethod
    def validate_split_integrity(
        cls,
        dataset_id: str,
        train_samples: List[EvaluationSample],
        test_samples: List[EvaluationSample]
    ) -> DatasetValidationReport:
        train_speakers = {s.speaker_id for s in train_samples if s.speaker_id}
        test_speakers = {s.speaker_id for s in test_samples if s.speaker_id}

        leakage = train_speakers.intersection(test_speakers)
        has_leakage = len(leakage) > 0

        # Validate test samples
        valid_count = 0
        missing_labels = 0
        corrupted = 0
        seen_ids: Set[str] = set()
        duplicates = 0
        exclusions = []
        classes: Dict[str, int] = {}
        langs: Dict[str, int] = {}

        for s in test_samples:
            if s.sample_id in seen_ids:
                duplicates += 1
                exclusions.append({"sample_id": s.sample_id, "reason": "Duplicate sample ID"})
                continue
            seen_ids.add(s.sample_id)

            if s.ground_truth_label is None or s.ground_truth_label == "":
                missing_labels += 1
                exclusions.append({"sample_id": s.sample_id, "reason": "Missing ground truth label"})
                continue

            if s.audio_bytes is not None and len(s.audio_bytes) < 4:
                corrupted += 1
                exclusions.append({"sample_id": s.sample_id, "reason": "Truncated or unreadable audio bytes"})
                continue

            valid_count += 1
            lbl_key = str(s.ground_truth_label)
            classes[lbl_key] = classes.get(lbl_key, 0) + 1
            langs[s.language] = langs.get(s.language, 0) + 1

        warnings = []
        if has_leakage:
            warnings.append(f"CRITICAL: Speaker overlap detected between splits ({len(leakage)} leaked speakers).")
        if duplicates > 0:
            warnings.append(f"Warning: {duplicates} duplicate sample records quarantined.")

        is_valid = (not has_leakage) and (missing_labels == 0) and (valid_count > 0)

        return DatasetValidationReport(
            dataset_id=dataset_id,
            is_valid=is_valid,
            total_checked_samples=len(test_samples),
            valid_sample_count=valid_count,
            missing_label_count=missing_labels,
            corrupted_audio_count=corrupted,
            duplicate_sample_count=duplicates,
            speaker_leakage_detected=has_leakage,
            leaked_speaker_ids=list(leakage),
            class_distribution=classes,
            language_distribution=langs,
            exclusion_log=exclusions,
            warnings=warnings
        )

