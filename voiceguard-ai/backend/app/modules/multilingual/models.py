"""
VoiceGuard AI — Multilingual & Accent Database Models
Phase 26: SIH26104
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class LanguageRegistryItem(Base):
    """Database representation of configured language support."""
    __tablename__ = "language_registry"

    id = Column(Integer, primary_key=True, index=True)
    language_code = Column(String, unique=True, index=True)
    language_name = Column(String)
    native_script = Column(String)
    support_status = Column(String, default="supported")  # supported, partially_supported, unsupported, unknown, mixed
    min_confidence = Column(Float, default=0.65)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class ModelLanguageSupportItem(Base):
    """Links AI models to validated language capabilities."""
    __tablename__ = "model_language_supports"

    id = Column(Integer, primary_key=True, index=True)
    model_identifier = Column(String, index=True)
    language_code = Column(String, index=True)
    feature_type = Column(String)  # "lid", "asr", "authenticity", "speaker_verification"
    validation_status = Column(String, default="validated")  # "validated", "experimental", "untested"
    evaluation_version = Column(String, default="1.0.0")
    notes = Column(Text, nullable=True)


class LanguageIdentificationRecord(Base):
    """Persisted language identification inferences for calls and audio segments."""
    __tablename__ = "language_identification_results"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True, index=True)
    audio_segment_id = Column(String, index=True, nullable=True)
    language_code = Column(String, index=True)
    confidence = Column(Float)
    is_code_switched = Column(Boolean, default=False)
    colloquial_label = Column(String, nullable=True)
    support_status = Column(String)
    model_name = Column(String)
    model_version = Column(String)
    processing_time_ms = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TranscriptionRecord(Base):
    """Persisted speech recognition results with language and privacy safeguards."""
    __tablename__ = "transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True, index=True)
    audio_segment_id = Column(String, index=True, nullable=True)
    language_code = Column(String, index=True)
    transcript_text = Column(Text)
    is_code_switched = Column(Boolean, default=False)
    word_timestamps = Column(JSON, nullable=True)
    model_name = Column(String)
    model_version = Column(String)
    status = Column(String, default="success")  # "success", "low_confidence", "unsupported", "failed"
    duration_seconds = Column(Float, default=0.0)
    processing_time_ms = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DatasetRegistryItem(Base):
    """Registry of licensed benchmark and evaluation corpora."""
    __tablename__ = "dataset_registry"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String, unique=True, index=True)
    dataset_name = Column(String)
    dataset_version = Column(String)
    source = Column(String)
    license = Column(String)
    permitted_use = Column(String)
    sample_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EvaluationRunItem(Base):
    """Persisted empirical evaluation benchmark runs for multilingual tasks."""
    __tablename__ = "multilingual_evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_identifier = Column(String, index=True)
    dataset_id = Column(String, index=True)
    evaluation_type = Column(String)  # "lid_accuracy", "asr_wer", "cross_lingual_authenticity", "speaker_verification_far"
    metrics_json = Column(JSON)
    sample_count = Column(Integer)
    status = Column(String, default="completed")  # "completed", "running", "failed"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

