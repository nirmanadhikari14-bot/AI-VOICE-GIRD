"""
VoiceGuard AI — AI Model Evaluation Pydantic Schemas
Phase 27: SIH26104
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ─── Dataset Schemas ──────────────────────────────────────────────────────────

class DatasetCreateRequest(BaseModel):
    dataset_id: str
    name: str
    version: str = "1.0.0"
    description: Optional[str] = None
    source: Optional[str] = None
    license: Optional[str] = None
    primary_language: str = "en"
    languages_covered: List[str] = Field(default_factory=list)
    sample_count: int = 0
    total_duration_hours: float = 0.0


class DatasetResponse(BaseModel):
    id: int
    dataset_id: str
    name: str
    version: str
    description: Optional[str]
    source: Optional[str]
    license: Optional[str]
    primary_language: str
    languages_covered: List[str]
    sample_count: int
    total_duration_hours: float
    validation_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Evaluation Run Schemas ────────────────────────────────────────────────────

class EvaluationRunCreateRequest(BaseModel):
    evaluation_name: str = "Standard Model Evaluation"
    model_id: str
    model_version: str
    dataset_id: str
    run_robustness: bool = True
    run_fairness: bool = True
    run_calibration: bool = True
    target_deployment_tier: str = "staging"


class EvaluationRunResponse(BaseModel):
    id: int
    evaluation_run_id: str
    evaluation_name: str
    model_id: str
    model_version: str
    model_type: Optional[str]
    dataset_id: str
    status: str
    sample_count: int
    metrics_json: Dict[str, Any]
    latency_json: Dict[str, Any]
    calibration_json: Optional[Dict[str, Any]]
    fairness_json: Optional[Dict[str, Any]]
    robustness_json: List[Dict[str, Any]]
    readiness_status: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_duration_sec: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Metrics Schemas ──────────────────────────────────────────────────────────

class MetricResponse(BaseModel):
    id: int
    evaluation_run_id: str
    model_id: str
    metric_name: str
    metric_value: float
    subgroup: Optional[str]
    metric_category: Optional[str]
    sample_count: Optional[int]

    model_config = ConfigDict(from_attributes=True)


# ─── Readiness Schemas ────────────────────────────────────────────────────────

class ReadinessApproveRequest(BaseModel):
    approved_by: str
    target_tier: str = "staging"
    audit_notes: Optional[str] = None


class ReadinessResponse(BaseModel):
    id: int
    model_id: str
    model_version: str
    evaluation_run_id: Optional[str]
    readiness_status: str
    target_tier: str
    readiness_score_pct: float
    passed_all_mandatory_gates: bool
    gate_checks_json: List[Dict[str, Any]]
    missing_evidence: List[str]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    audit_notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Threshold Schemas ────────────────────────────────────────────────────────

class ThresholdAnalysisRequest(BaseModel):
    model_id: str
    model_version: str
    evaluation_run_id: Optional[str] = None
    target_fpr: float = Field(0.05, ge=0.0, le=1.0, description="Target False Positive Rate for threshold calibration")


class ThresholdResponse(BaseModel):
    id: int
    model_id: str
    model_version: str
    threshold_name: str
    threshold_value: float
    eer_value: Optional[float]
    roc_auc: Optional[float]
    status: str
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Model List Schemas ───────────────────────────────────────────────────────

class ModelSummaryResponse(BaseModel):
    model_id: str
    model_name: str
    model_version: str
    model_type: str
    latest_readiness_status: Optional[str]
    latest_evaluation_run_id: Optional[str]
    latest_accuracy: Optional[float]
    latest_eer: Optional[float]
    latest_auc: Optional[float]
    latest_p95_latency_ms: Optional[float]
    evaluation_count: int


class ModelComparisonResponse(BaseModel):
    model_id: str
    versions: List[Dict[str, Any]]


# ─── Health Schema ────────────────────────────────────────────────────────────

class EvaluationHealthResponse(BaseModel):
    status: str
    total_evaluation_runs: int
    completed_runs: int
    failed_runs: int
    total_datasets: int
    models_evaluated: int
    ai_engine_available: bool
    message: str

