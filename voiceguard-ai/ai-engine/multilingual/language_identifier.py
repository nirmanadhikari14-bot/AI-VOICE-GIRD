"""
VoiceGuard AI — Spoken Language Identification (LID) Service
Phase 26: SIH26104
"""

import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .registry import language_registry, SupportStatus, LanguageMetadata
from .adapters.base import BaseLIDAdapter, LIDAdapterResult
from .adapters.local_feature_adapter import LocalFeatureSpeechAdapter
from .code_switching import CodeSwitchingDetector, CodeSwitchSpan

logger = logging.getLogger(__name__)


class AlternativeLanguageCandidate(BaseModel):
    language_code: str
    language_name: str
    confidence: float
    support_status: str


class LanguageIdentificationResult(BaseModel):
    """Complete result contract for a speech segment's language classification."""
    segment_id: Optional[str] = None
    primary_language: str
    primary_language_name: str
    confidence: float
    alternative_languages: List[AlternativeLanguageCandidate] = Field(default_factory=list)
    is_code_switched: bool = False
    colloquial_code_switching_label: Optional[str] = None
    detected_language_spans: List[CodeSwitchSpan] = Field(default_factory=list)
    supported_status: str
    model_name: str
    model_version: str
    processing_time_ms: float
    warnings: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LanguageIdentifier:
    """
    High-level Language Identification orchestration engine.
    Integrates model adapters, registry status lookups, and code-switching analysis.
    """

    def __init__(self, primary_adapter: Optional[BaseLIDAdapter] = None):
        self._adapter: BaseLIDAdapter = primary_adapter or LocalFeatureSpeechAdapter()

    def set_adapter(self, adapter: BaseLIDAdapter):
        self._adapter = adapter

    def identify(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        segment_id: Optional[str] = None,
        context_hint: Optional[str] = None
    ) -> LanguageIdentificationResult:
        """
        Identify spoken language and code-switching in an audio segment.
        Safely falls back to UNKNOWN or UNCERTAIN rather than halting the audio pipeline.
        """
        t0 = time.time()
        warnings: List[str] = []

        if not audio_bytes or len(audio_bytes) < 320:  # < 10ms of 16kHz 16-bit PCM
            return LanguageIdentificationResult(
                segment_id=segment_id,
                primary_language="unknown",
                primary_language_name="Unknown / Silent",
                confidence=0.0,
                alternative_languages=[],
                is_code_switched=False,
                supported_status=SupportStatus.UNKNOWN.value,
                model_name=self._adapter.model_name,
                model_version=self._adapter.model_version,
                processing_time_ms=0.5,
                warnings=["Audio chunk is empty or beneath minimal duration threshold."]
            )

        try:
            adapter_res: LIDAdapterResult = self._adapter.identify_language(audio_bytes, sample_rate)
        except Exception as e:
            logger.warning(f"LID adapter execution failed: {e}. Falling back gracefully.")
            return LanguageIdentificationResult(
                segment_id=segment_id,
                primary_language="unknown",
                primary_language_name="Unclassified (Error Fallback)",
                confidence=0.0,
                alternative_languages=[],
                is_code_switched=False,
                supported_status=SupportStatus.UNKNOWN.value,
                model_name=self._adapter.model_name,
                model_version=self._adapter.model_version,
                processing_time_ms=round((time.time() - t0) * 1000, 2),
                warnings=[f"Adapter failure: {str(e)}. Analysis continued non-blockingly."]
            )

        # Lookup language in registry
        lang_meta: Optional[LanguageMetadata] = language_registry.get(adapter_res.primary_language)
        
        if lang_meta:
            primary_name = lang_meta.name
            # Resolve support status considering confidence
            resolved_status = language_registry.resolve_status(
                adapter_res.primary_language,
                adapter_res.confidence
            )
        else:
            primary_name = f"Unregistered ({adapter_res.primary_language})"
            resolved_status = SupportStatus.UNSUPPORTED
            warnings.append(f"Language '{adapter_res.primary_language}' is not in the validated language registry.")

        if resolved_status == SupportStatus.LOW_CONFIDENCE:
            warnings.append(
                f"LID confidence ({adapter_res.confidence:.2f}) is below the required acceptance threshold."
            )

        # Build candidate models
        alternatives = []
        for cand in adapter_res.alternative_candidates:
            c_meta = language_registry.get(cand.language_code)
            c_status = language_registry.resolve_status(cand.language_code, cand.confidence) if c_meta else SupportStatus.UNSUPPORTED
            alternatives.append(AlternativeLanguageCandidate(
                language_code=cand.language_code,
                language_name=c_meta.name if c_meta else cand.language_name,
                confidence=cand.confidence,
                support_status=c_status.value
            ))

        # Check code-switching
        colloquial_label = None
        if adapter_res.is_mixed_or_code_switched:
            if "hi" in adapter_res.detected_code_switching_pairs:
                colloquial_label = "Hinglish (Hindi-English)"
            elif "gu" in adapter_res.detected_code_switching_pairs:
                colloquial_label = "Gujlish (Gujarati-English)"
            elif "bn" in adapter_res.detected_code_switching_pairs:
                colloquial_label = "Banglish (Bengali-English)"
            else:
                colloquial_label = "Mixed Indic-English Speech"
            resolved_status = SupportStatus.MIXED

        processing_time = round((time.time() - t0) * 1000, 2)

        return LanguageIdentificationResult(
            segment_id=segment_id,
            primary_language=adapter_res.primary_language,
            primary_language_name=primary_name,
            confidence=adapter_res.confidence,
            alternative_languages=alternatives,
            is_code_switched=adapter_res.is_mixed_or_code_switched,
            colloquial_code_switching_label=colloquial_label,
            detected_language_spans=[],  # Left empty when span-level boundaries are unverified
            supported_status=resolved_status.value,
            model_name=self._adapter.model_name,
            model_version=self._adapter.model_version,
            processing_time_ms=processing_time,
            warnings=warnings + adapter_res.warnings,
            created_at=datetime.utcnow()
        )

