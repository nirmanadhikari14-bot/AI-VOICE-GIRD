"""
VoiceGuard AI — AI Model Evaluation Interfaces & Data Contracts
Phase 27: SIH26104
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field


class EvaluationStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIALLY_COMPLETED = "partially_completed"


class ModelType(str, Enum):
    SYNTHETIC_VOICE_DETECTOR = "synthetic_voice_detector"
    SPEAKER_VERIFICATION = "speaker_verification"
    LANGUAGE_IDENTIFICATION = "language_identification"
    ASR = "asr"
    PROSODY_ANALYZER = "prosody_analyzer"
    NLP_SOCIAL_ENGINEERING = "nlp_social_engineering"


class ReadinessStatus(str, Enum):
    NOT_EVALUATED = "not_evaluated"
    DATASET_INCOMPLETE = "dataset_incomplete"
    EVALUATION_FAILED = "evaluation_failed"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    RESEARCH_ONLY = "research_only"
    VALIDATION_REQUIRED = "validation_required"
    APPROVED_FOR_STAGING = "approved_for_staging"
    APPROVED_FOR_PRODUCTION = "approved_for_production"
    DEPRECATED = "deprecated"


class EvaluationSample(BaseModel):
    """Normalized evaluation sample with ground truth and metadata."""
    sample_id: str
    audio_bytes: Optional[bytes] = None
    text_input: Optional[str] = None
    ground_truth_label: Union[int, str, float]
    reference_transcript: Optional[str] = None
    language: str = "en"
    accent_group: Optional[str] = None
    speaker_id: Optional[str] = None
    is_synthetic: Optional[bool] = None
    synthesis_tool: Optional[str] = None
    recording_condition: str = "studio"  # "studio", "telephony", "noisy", "reverberant"
    snr_db: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelPrediction(BaseModel):
    """Normalized model inference prediction contract."""
    sample_id: str
    predicted_label: Union[int, str, float]
    probability: float = Field(..., ge=0.0, le=1.0)
    raw_score: Optional[float] = None
    predicted_transcript: Optional[str] = None
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    latency_ms: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelMetadata(BaseModel):
    model_identifier: str
    model_name: str
    model_version: str
    model_type: ModelType
    architecture: str
    provider: str
    artifact_path: Optional[str] = None
    supported_languages: List[str] = Field(default_factory=list)
    supported_sample_rates: List[int] = Field(default_factory=lambda: [16000])
    is_executable: bool = True
    status_notes: str = ""


class BaseModelEvaluationAdapter(ABC):
    """
    Standardized adapter contract required for every AI model entering
    the VoiceGuard evaluation framework.
    """

    @abstractmethod
    def get_model_metadata(self) -> ModelMetadata:
        """Returns verified model specifications, architecture, and language coverage."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Verifies if model weights and execution runtime are ready."""
        pass

    @abstractmethod
    def predict(self, sample: EvaluationSample) -> ModelPrediction:
        """Executes single-sample inference and returns a normalized prediction."""
        pass

    @abstractmethod
    def predict_batch(self, samples: List[EvaluationSample]) -> List[ModelPrediction]:
        """Executes batched inference with latency tracking."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Reports adapter health, device target, and runtime status."""
        pass

