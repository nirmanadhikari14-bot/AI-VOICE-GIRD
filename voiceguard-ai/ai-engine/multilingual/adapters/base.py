"""
VoiceGuard AI — Base Speech Processing Adapters
Phase 26: SIH26104
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class WordTimestamp(BaseModel):
    word: str
    start_time: float
    end_time: float
    confidence: float


class ASRTranscriptionResult(BaseModel):
    text: str
    detected_language: str
    language_confidence: float
    word_timestamps: List[WordTimestamp] = Field(default_factory=list)
    model_name: str
    model_version: str
    duration_seconds: float
    processing_time_ms: float
    status: str = "success"  # "success", "low_confidence", "unsupported_language", "failed", "not_configured"
    warnings: List[str] = Field(default_factory=list)


class LIDCandidate(BaseModel):
    language_code: str
    language_name: str
    confidence: float


class LIDAdapterResult(BaseModel):
    primary_language: str
    confidence: float
    alternative_candidates: List[LIDCandidate] = Field(default_factory=list)
    is_mixed_or_code_switched: bool = False
    detected_code_switching_pairs: List[str] = Field(default_factory=list)
    model_name: str
    model_version: str
    processing_time_ms: float
    status: str = "success"  # "success", "uncertain", "unsupported", "not_configured", "failed"
    warnings: List[str] = Field(default_factory=list)


class BaseASRAdapter(ABC):
    """Abstract base class for Automated Speech Recognition model adapters."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Checks if model weights and execution environment are ready."""
        pass

    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        pass

    @abstractmethod
    def transcribe(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        forced_language: Optional[str] = None
    ) -> ASRTranscriptionResult:
        """Transcribe audio segment into text with language and timestamp awareness."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass


class BaseLIDAdapter(ABC):
    """Abstract base class for Spoken Language Identification adapters."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        pass

    @abstractmethod
    def identify_language(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000
    ) -> LIDAdapterResult:
        """Identify primary and secondary languages in an audio segment."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass

