"""
VoiceGuard AI — Language Identification Evaluation Adapter
Phase 27: SIH26104
"""

import time
from typing import Dict, List, Optional, Any
from ..interfaces import (
    BaseModelEvaluationAdapter,
    ModelMetadata,
    ModelType,
    EvaluationSample,
    ModelPrediction
)
import sys as _sys, os as _os
_ai_engine_root = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), "../../.."))
if _ai_engine_root not in _sys.path:
    _sys.path.insert(0, _ai_engine_root)
from multilingual.language_identifier import LanguageIdentifier


class LanguageIdentificationEvaluationAdapter(BaseModelEvaluationAdapter):
    """Standardized evaluation adapter for Spoken Language Identification (LID)."""

    def __init__(self):
        self._meta = ModelMetadata(
            model_identifier="VoiceGuard-IndicAcoustic-LocalEngine",
            model_name="IndicAcoustic-LID-v1.4",
            model_version="v1.4.0-edge",
            model_type=ModelType.LANGUAGE_IDENTIFICATION,
            architecture="Acoustic-Phonetic Rhythm & Spectral Prior Classifier",
            provider="VoiceGuard Internal / Edge",
            artifact_path="ai-engine/multilingual/adapters/local_feature_adapter.py",
            supported_languages=["en", "hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"],
            supported_sample_rates=[16000, 8000],
            is_executable=True,
            status_notes="Lightweight acoustic rhythm & zero-crossing classifier covering 13 Indian languages."
        )
        self._engine = LanguageIdentifier()

    def get_model_metadata(self) -> ModelMetadata:
        return self._meta

    def is_available(self) -> bool:
        return True

    def predict(self, sample: EvaluationSample) -> ModelPrediction:
        t0 = time.time()
        audio = sample.audio_bytes or b"\x00" * 3200
        res = self._engine.identify(audio, sample_rate=16000, segment_id=sample.sample_id)
        latency = round((time.time() - t0) * 1000, 2)

        return ModelPrediction(
            sample_id=sample.sample_id,
            predicted_label=res.primary_language,
            probability=round(res.confidence, 4),
            raw_score=round(res.confidence, 4),
            confidence=round(res.confidence, 4),
            latency_ms=max(1.0, latency),
            metadata={
                "model_identifier": self._meta.model_identifier,
                "is_code_switched": res.is_code_switched,
                "colloquial_label": res.colloquial_code_switching_label,
                "supported_status": res.supported_status
            }
        )

    def predict_batch(self, samples: List[EvaluationSample]) -> List[ModelPrediction]:
        return [self.predict(s) for s in samples]

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "model_identifier": self._meta.model_identifier,
            "version": self._meta.model_version,
            "executable": True
        }

