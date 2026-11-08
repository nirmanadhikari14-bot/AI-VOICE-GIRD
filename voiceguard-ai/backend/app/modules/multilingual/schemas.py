"""
VoiceGuard AI — Multilingual Pydantic Schemas
Phase 26: SIH26104
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class LanguageOut(BaseModel):
    code: str
    name: str
    native_name: str
    native_script: str
    transliteration_scripts: List[str] = Field(default_factory=list)
    supported_asr_models: List[str] = Field(default_factory=list)
    supported_lid_models: List[str] = Field(default_factory=list)
    status: str
    min_confidence_threshold: float
    enabled: bool
    code_switching_pairs: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class AccentOut(BaseModel):
    accent_id: str
    label: str
    group: str
    base_language: str
    influence_language: Optional[str] = None
    phonetic_markers: List[str] = Field(default_factory=list)
    prosody_profile: Dict[str, str] = Field(default_factory=dict)
    safety_notice: str


class ModelLanguageSupportOut(BaseModel):
    model_identifier: str
    language_code: str
    feature_type: str
    validation_status: str
    evaluation_version: str
    notes: Optional[str] = None


class IdentifyLanguageRequest(BaseModel):
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio chunk (PCM 16-bit or WAV)")
    segment_id: Optional[str] = None
    call_id: Optional[int] = None
    sample_rate: int = Field(default=16000)
    context_hint: Optional[str] = None


class IdentifyLanguageResponse(BaseModel):
    segment_id: Optional[str] = None
    call_id: Optional[int] = None
    primary_language: str
    primary_language_name: str
    confidence: float
    alternative_languages: List[Dict[str, Any]] = Field(default_factory=list)
    is_code_switched: bool = False
    colloquial_code_switching_label: Optional[str] = None
    supported_status: str
    model_name: str
    model_version: str
    processing_time_ms: float
    warnings: List[str] = Field(default_factory=list)
    created_at: datetime


class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio chunk (PCM 16-bit or WAV)")
    call_id: Optional[int] = None
    segment_id: Optional[str] = None
    forced_language: Optional[str] = None
    model_id: Optional[str] = None
    sample_rate: int = Field(default=16000)


class WordTimestampSchema(BaseModel):
    word: str
    start_time: float
    end_time: float
    confidence: float


class TranscribeResponse(BaseModel):
    id: Optional[int] = None
    call_id: Optional[int] = None
    segment_id: Optional[str] = None
    text: str
    detected_language: str
    language_confidence: float
    is_code_switched: bool = False
    word_timestamps: List[WordTimestampSchema] = Field(default_factory=list)
    model_name: str
    model_version: str
    duration_seconds: float
    processing_time_ms: float
    status: str
    warnings: List[str] = Field(default_factory=list)
    created_at: datetime


class DatasetRegistryOut(BaseModel):
    dataset_id: str
    dataset_name: str
    dataset_version: str
    source: str
    license: str
    permitted_use: str
    sample_count: int


class EvaluationRunOut(BaseModel):
    id: Optional[int] = None
    model_identifier: str
    dataset_id: str
    evaluation_type: str
    metrics: Dict[str, Any]
    sample_count: int
    status: str
    created_at: datetime


class FairnessReportResponse(BaseModel):
    audit_date: str
    overall_fairness_rating: str
    max_disparity_ratio: float
    language_disparities: List[Dict[str, Any]]
    accent_assessments: List[Dict[str, Any]]
    safety_rule_enforcement_status: Dict[str, bool]
    recommendations: List[str]


class MultilingualHealthResponse(BaseModel):
    status: str
    total_languages_configured: int
    supported_languages_count: int
    total_accents_registered: int
    active_lid_model: str
    active_asr_model: str
    fairness_guard_active: bool
    models_available: List[str]

