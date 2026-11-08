"""
VoiceGuard AI — AI Model Evaluation SQLAlchemy Models
Phase 27: SIH26104
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, JSON, Text, ForeignKey
)
from sqlalchemy.sql import func
from app.core.database import Base


class EvaluationDataset(Base):
    """Registry of AI evaluation datasets with provenance metadata."""
    __tablename__ = "evaluation_datasets"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    version = Column(String, default="1.0.0")
    description = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    license = Column(String, nullable=True)
    primary_language = Column(String, default="en")
    languages_covered = Column(JSON, default=list)
    sample_count = Column(Integer, default=0)
    total_duration_hours = Column(Float, default=0.0)
    validation_status = Column(String, default="pending_validation")
    provenance_hash = Column(String, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EvaluationRun(Base):
    """Records each model evaluation run with status, metrics, and configuration."""
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_run_id = Column(String, unique=True, index=True)
    evaluation_name = Column(String, nullable=False)
    model_id = Column(String, index=True)
    model_version = Column(String)
    model_type = Column(String)
    dataset_id = Column(String, index=True)
    status = Column(String, default="created")  # created|queued|running|completed|failed|cancelled
    sample_count = Column(Integer, default=0)
    metrics_json = Column(JSON, default=dict)
    latency_json = Column(JSON, default=dict)
    calibration_json = Column(JSON, nullable=True)
    fairness_json = Column(JSON, nullable=True)
    robustness_json = Column(JSON, default=list)
    readiness_status = Column(String, nullable=True)
    readiness_json = Column(JSON, nullable=True)
    config_json = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_duration_sec = Column(Float, nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EvaluationMetric(Base):
    """Flat metric row for querying individual metric values across evaluation runs."""
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_run_id = Column(String, ForeignKey("evaluation_runs.evaluation_run_id"), index=True)
    model_id = Column(String, index=True)
    metric_name = Column(String, index=True)
    metric_value = Column(Float)
    subgroup = Column(String, nullable=True)   # "en", "hi", "telephony_g711u_8khz" etc.
    metric_category = Column(String, nullable=True)  # "classification", "asr", "calibration", "latency", "fairness", "robustness"
    sample_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelReadinessRecord(Base):
    """Audit trail for model deployment readiness gate approvals."""
    __tablename__ = "model_readiness"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String, index=True)
    model_version = Column(String)
    evaluation_run_id = Column(String, nullable=True)
    readiness_status = Column(String)  # ReadinessStatus value
    target_tier = Column(String)  # "research" | "staging" | "production"
    readiness_score_pct = Column(Float, default=0.0)
    passed_all_mandatory_gates = Column(Boolean, default=False)
    gate_checks_json = Column(JSON, default=list)
    missing_evidence = Column(JSON, default=list)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    audit_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EvaluationThreshold(Base):
    """Stores calibrated operating thresholds per model derived from evaluation runs."""
    __tablename__ = "evaluation_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String, index=True)
    model_version = Column(String)
    evaluation_run_id = Column(String, nullable=True)
    threshold_name = Column(String)   # "detection_threshold", "eer_threshold", "high_confidence_threshold"
    threshold_value = Column(Float)
    eer_value = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    status = Column(String, default="active")   # "active" | "superseded" | "experimental"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

