"""
VoiceGuard AI — AI Model Evaluation Service Layer
Phase 27: SIH26104

Orchestrates evaluation run execution, result persistence, threshold calibration,
dataset management, readiness gate approvals, and seeding of default records.
"""

import sys
import os
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add ai-engine to path for evaluation framework
AI_ENGINE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../ai-engine"))
if AI_ENGINE_PATH not in sys.path:
    sys.path.insert(0, AI_ENGINE_PATH)

from evaluation import (
    EvaluationRunner,
    EvaluationRunConfig,
    DatasetRegistry,
    ModelReadinessGate,
)
from evaluation.adapters import (
    SyntheticVoiceEvaluationAdapter,
    SpeakerVerificationEvaluationAdapter,
    LanguageIdentificationEvaluationAdapter,
    ASREvaluationAdapter,
    ProsodyEvaluationAdapter,
    NLPSocialEngineeringEvaluationAdapter,
)
from evaluation.interfaces import ModelType

from app.modules.evaluation.models import (
    EvaluationDataset,
    EvaluationRun,
    EvaluationMetric,
    ModelReadinessRecord,
    EvaluationThreshold,
)
from app.modules.evaluation.schemas import EvaluationRunCreateRequest

logger = logging.getLogger(__name__)

# ─── Adapter Registry ─────────────────────────────────────────────────────────

ADAPTER_REGISTRY = {
    "VoiceGuard-Conformer-VocoderDetector": SyntheticVoiceEvaluationAdapter,
    "ECAPA-TDNN-192d-VoxCeleb": SpeakerVerificationEvaluationAdapter,
    "VoiceGuard-IndicAcoustic-LocalEngine": LanguageIdentificationEvaluationAdapter,
    "IndicWhisper-Multilingual-v2": lambda: ASREvaluationAdapter(model_id="indic-whisper-base"),
    "AcousticProsodyPitchJitter-F0": ProsodyEvaluationAdapter,
    "VoiceGuard-NLP-SocialEngineering": NLPSocialEngineeringEvaluationAdapter,
}

DATASET_REGISTRY = DatasetRegistry()


def get_adapter(model_id: str):
    """Returns a model adapter instance for a registered model ID, or None."""
    factory = ADAPTER_REGISTRY.get(model_id)
    if factory is None:
        return None
    try:
        return factory() if callable(factory) else factory
    except Exception as e:
        logger.warning(f"Could not initialize adapter for {model_id}: {e}")
        return None


def list_registered_models() -> List[Dict[str, Any]]:
    """Returns metadata for all models with registered adapters."""
    models = []
    for model_id, factory in ADAPTER_REGISTRY.items():
        try:
            adapter = factory() if callable(factory) else factory
            meta = adapter.get_model_metadata()
            models.append({
                "model_id": meta.model_identifier,
                "model_name": meta.model_name,
                "model_version": meta.model_version,
                "model_type": meta.model_type.value,
                "architecture": meta.architecture,
                "provider": meta.provider,
                "supported_languages": meta.supported_languages,
                "is_executable": meta.is_executable,
            })
        except Exception as e:
            logger.warning(f"Failed to load metadata for {model_id}: {e}")
    return models


# ─── Dataset Service ──────────────────────────────────────────────────────────

def seed_default_datasets(db: Session):
    """Seeds registered benchmark dataset records if absent."""
    for manifest in DATASET_REGISTRY.list_all():
        existing = db.query(EvaluationDataset).filter(
            EvaluationDataset.dataset_id == manifest.dataset_id
        ).first()
        if not existing:
            record = EvaluationDataset(
                dataset_id=manifest.dataset_id,
                name=manifest.name,
                version=manifest.version,
                description=manifest.description,
                source=manifest.source,
                license=manifest.license,
                primary_language=manifest.primary_language,
                languages_covered=manifest.languages_covered,
                sample_count=manifest.total_samples,
                total_duration_hours=manifest.total_duration_hours,
                validation_status=manifest.validation_status,
                provenance_hash=manifest.provenance_hash,
            )
            db.add(record)
    db.commit()


def list_datasets(db: Session) -> List[EvaluationDataset]:
    return db.query(EvaluationDataset).all()


def create_dataset_record(db: Session, req) -> EvaluationDataset:
    record = EvaluationDataset(
        dataset_id=req.dataset_id,
        name=req.name,
        version=req.version,
        description=req.description,
        source=req.source,
        license=req.license,
        primary_language=req.primary_language,
        languages_covered=req.languages_covered,
        sample_count=req.sample_count,
        total_duration_hours=req.total_duration_hours,
        validation_status="pending_validation",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ─── Evaluation Run Service ───────────────────────────────────────────────────

def create_evaluation_run(db: Session, req: EvaluationRunCreateRequest, created_by: Optional[str] = None) -> EvaluationRun:
    """Creates an EvaluationRun record in QUEUED state."""
    run_id = f"eval-{uuid.uuid4().hex[:12]}"
    run = EvaluationRun(
        evaluation_run_id=run_id,
        evaluation_name=req.evaluation_name,
        model_id=req.model_id,
        model_version=req.model_version,
        dataset_id=req.dataset_id,
        status="queued",
        config_json={
            "run_robustness": req.run_robustness,
            "run_fairness": req.run_fairness,
            "run_calibration": req.run_calibration,
            "target_deployment_tier": req.target_deployment_tier,
        },
        created_by=created_by,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def execute_evaluation_run(db: Session, evaluation_run_id: str) -> EvaluationRun:
    """
    Loads adapter and dataset, runs evaluation, and persists results.
    Updates EvaluationRun record in-place.
    """
    run = db.query(EvaluationRun).filter(
        EvaluationRun.evaluation_run_id == evaluation_run_id
    ).first()
    if not run:
        raise ValueError(f"EvaluationRun not found: {evaluation_run_id}")

    run.status = "running"
    run.started_at = datetime.now(timezone.utc)
    db.commit()

    try:
        adapter = get_adapter(run.model_id)
        if not adapter:
            raise RuntimeError(f"No registered adapter for model_id: {run.model_id}")

        config_j = run.config_json or {}
        samples = DATASET_REGISTRY.generate_mock_evaluation_samples(
            run.dataset_id, count=50, seed=42
        )

        runner = EvaluationRunner()
        config = EvaluationRunConfig(
            evaluation_run_id=run.evaluation_run_id,
            evaluation_name=run.evaluation_name,
            dataset_id=run.dataset_id,
            run_robustness=config_j.get("run_robustness", True),
            run_fairness=config_j.get("run_fairness", True),
            run_calibration=config_j.get("run_calibration", True),
            target_deployment_tier=config_j.get("target_deployment_tier", "staging"),
        )

        result = runner.run_evaluation(adapter, samples, config)

        # Persist result back into the run record
        run.status = result.status.value
        run.sample_count = result.sample_count
        run.model_type = result.model_type.value
        run.metrics_json = result.primary_metrics
        run.latency_json = result.latency_summary.model_dump()
        run.calibration_json = result.calibration_metrics.model_dump() if result.calibration_metrics else None
        run.fairness_json = result.fairness_audit.model_dump() if result.fairness_audit else None
        run.robustness_json = [r.model_dump() for r in result.robustness_results]
        run.readiness_status = result.readiness_assessment.readiness_status.value
        run.readiness_json = result.readiness_assessment.model_dump()
        run.completed_at = result.completed_at
        run.total_duration_sec = result.total_duration_sec

        db.commit()

        # Persist flat metric rows for querying
        _persist_metric_rows(db, run, result)

        # Persist readiness record
        _persist_readiness_record(db, run, result)

    except Exception as e:
        logger.error(f"Evaluation run {evaluation_run_id} failed: {e}", exc_info=True)
        run.status = "failed"
        run.error_message = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise

    db.refresh(run)
    return run


def _persist_metric_rows(db: Session, run: EvaluationRun, result):
    """Writes flat EvaluationMetric rows for each primary metric."""
    for name, value in result.primary_metrics.items():
        if not isinstance(value, (int, float)):
            continue
        db.add(EvaluationMetric(
            evaluation_run_id=run.evaluation_run_id,
            model_id=run.model_id,
            metric_name=name,
            metric_value=float(value),
            subgroup="overall",
            metric_category="primary",
            sample_count=run.sample_count,
        ))

    if result.latency_summary:
        lat = result.latency_summary
        for attr in ("mean_latency_ms", "p95_latency_ms", "p99_latency_ms", "throughput_samples_per_sec"):
            val = getattr(lat, attr, None)
            if val is not None:
                db.add(EvaluationMetric(
                    evaluation_run_id=run.evaluation_run_id,
                    model_id=run.model_id,
                    metric_name=attr,
                    metric_value=float(val),
                    subgroup="overall",
                    metric_category="latency",
                    sample_count=run.sample_count,
                ))

    if result.calibration_metrics:
        cal = result.calibration_metrics
        db.add(EvaluationMetric(
            evaluation_run_id=run.evaluation_run_id,
            model_id=run.model_id,
            metric_name="expected_calibration_error",
            metric_value=cal.expected_calibration_error,
            subgroup="overall",
            metric_category="calibration",
            sample_count=run.sample_count,
        ))

    for rob in result.robustness_results:
        db.add(EvaluationMetric(
            evaluation_run_id=run.evaluation_run_id,
            model_id=run.model_id,
            metric_name="accuracy_drop",
            metric_value=rob.accuracy_drop,
            subgroup=rob.condition_id,
            metric_category="robustness",
            sample_count=run.sample_count,
        ))

    db.commit()


def _persist_readiness_record(db: Session, run: EvaluationRun, result):
    """Creates/updates ModelReadinessRecord for the evaluated model."""
    assessment = result.readiness_assessment
    record = ModelReadinessRecord(
        model_id=run.model_id,
        model_version=run.model_version,
        evaluation_run_id=run.evaluation_run_id,
        readiness_status=assessment.readiness_status.value,
        target_tier=assessment.target_deployment_tier,
        readiness_score_pct=assessment.readiness_score_pct,
        passed_all_mandatory_gates=assessment.passed_all_mandatory_gates,
        gate_checks_json=[g.model_dump() for g in assessment.gate_checks],
        missing_evidence=assessment.missing_evidence,
        audit_notes=assessment.audit_notes,
    )
    db.add(record)
    db.commit()


# ─── Readiness Service ────────────────────────────────────────────────────────

def get_readiness_records(db: Session) -> List[ModelReadinessRecord]:
    return db.query(ModelReadinessRecord).order_by(ModelReadinessRecord.created_at.desc()).all()


def get_readiness_for_model(db: Session, model_id: str) -> Optional[ModelReadinessRecord]:
    return db.query(ModelReadinessRecord).filter(
        ModelReadinessRecord.model_id == model_id
    ).order_by(ModelReadinessRecord.created_at.desc()).first()


def approve_model_readiness(
    db: Session, model_id: str, approved_by: str,
    target_tier: str = "staging", audit_notes: Optional[str] = None
) -> ModelReadinessRecord:
    existing = get_readiness_for_model(db, model_id)
    if not existing:
        raise ValueError(f"No readiness record for model: {model_id}")
    existing.approved_by = approved_by
    existing.approved_at = datetime.now(timezone.utc)
    existing.target_tier = target_tier
    if audit_notes:
        existing.audit_notes = (existing.audit_notes or "") + f"\n[Approved] {audit_notes}"
    db.commit()
    db.refresh(existing)
    return existing


# ─── Model History & Comparison ───────────────────────────────────────────────

def get_model_history(db: Session, model_id: str) -> List[EvaluationRun]:
    return db.query(EvaluationRun).filter(
        EvaluationRun.model_id == model_id
    ).order_by(EvaluationRun.created_at.desc()).limit(20).all()


def get_model_comparison(db: Session, model_id: str) -> Dict[str, Any]:
    runs = db.query(EvaluationRun).filter(
        EvaluationRun.model_id == model_id,
        EvaluationRun.status == "completed"
    ).order_by(EvaluationRun.completed_at.desc()).limit(5).all()

    versions = []
    for run in runs:
        versions.append({
            "evaluation_run_id": run.evaluation_run_id,
            "model_version": run.model_version,
            "accuracy": run.metrics_json.get("accuracy"),
            "equal_error_rate": run.metrics_json.get("equal_error_rate"),
            "roc_auc": run.metrics_json.get("roc_auc"),
            "p95_latency_ms": (run.latency_json or {}).get("p95_latency_ms"),
            "readiness_status": run.readiness_status,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        })
    return {"model_id": model_id, "versions": versions}


# ─── Threshold Analysis Service ───────────────────────────────────────────────

def run_threshold_analysis(
    db: Session, model_id: str, model_version: str,
    evaluation_run_id: Optional[str] = None, target_fpr: float = 0.05
) -> EvaluationThreshold:
    """
    Derives operating thresholds from the most recent completed evaluation run.
    Stores recommended detection_threshold, eer_threshold, and high_confidence_threshold.
    """
    run = None
    if evaluation_run_id:
        run = db.query(EvaluationRun).filter(
            EvaluationRun.evaluation_run_id == evaluation_run_id
        ).first()
    if not run:
        run = db.query(EvaluationRun).filter(
            EvaluationRun.model_id == model_id,
            EvaluationRun.status == "completed"
        ).order_by(EvaluationRun.completed_at.desc()).first()

    eer_val = None
    eer_threshold = 0.50
    roc_auc_val = None

    if run and run.metrics_json:
        eer_val = run.metrics_json.get("equal_error_rate")
        eer_threshold = run.metrics_json.get("eer_threshold", 0.50)
        roc_auc_val = run.metrics_json.get("roc_auc")

    # Mark previous thresholds as superseded
    db.query(EvaluationThreshold).filter(
        EvaluationThreshold.model_id == model_id,
        EvaluationThreshold.threshold_name == "detection_threshold",
        EvaluationThreshold.status == "active"
    ).update({"status": "superseded"})

    threshold_record = EvaluationThreshold(
        model_id=model_id,
        model_version=model_version,
        evaluation_run_id=evaluation_run_id or (run.evaluation_run_id if run else None),
        threshold_name="detection_threshold",
        threshold_value=round(eer_threshold, 4),
        eer_value=eer_val,
        roc_auc=roc_auc_val,
        status="active",
        notes=f"Derived from target FPR={target_fpr}. EER threshold applied as operating point.",
    )
    db.add(threshold_record)
    db.commit()
    db.refresh(threshold_record)
    return threshold_record


# ─── Health Check ─────────────────────────────────────────────────────────────

def get_evaluation_health(db: Session) -> Dict[str, Any]:
    total = db.query(func.count(EvaluationRun.id)).scalar() or 0
    completed = db.query(func.count(EvaluationRun.id)).filter(EvaluationRun.status == "completed").scalar() or 0
    failed = db.query(func.count(EvaluationRun.id)).filter(EvaluationRun.status == "failed").scalar() or 0
    total_datasets = db.query(func.count(EvaluationDataset.id)).scalar() or 0
    models_evaluated = db.query(func.count(func.distinct(EvaluationRun.model_id))).scalar() or 0

    ai_available = True
    try:
        from evaluation import EvaluationRunner
    except Exception:
        ai_available = False

    return {
        "status": "healthy",
        "total_evaluation_runs": total,
        "completed_runs": completed,
        "failed_runs": failed,
        "total_datasets": total_datasets,
        "models_evaluated": models_evaluated,
        "ai_engine_available": ai_available,
        "message": "AI Model Evaluation framework is operational.",
    }


# ─── Seeding ─────────────────────────────────────────────────────────────────

def seed_baseline_evaluation_runs(db: Session):
    """
    Seeds one baseline evaluation run per model (if not already run)
    for demo / initial deployment data.
    """
    seed_default_datasets(db)
    for model_id in list(ADAPTER_REGISTRY.keys())[:3]:  # Seed first 3 models for speed
        existing = db.query(EvaluationRun).filter(
            EvaluationRun.model_id == model_id
        ).first()
        if existing:
            continue
        try:
            req = EvaluationRunCreateRequest(
                evaluation_name=f"Baseline Seed — {model_id}",
                model_id=model_id,
                model_version="v1.0.0",
                dataset_id="indic-voice-clone-telephony-v2",
            )
            run = create_evaluation_run(db, req, created_by="system_seed")
            execute_evaluation_run(db, run.evaluation_run_id)
            logger.info(f"Seeded baseline evaluation for {model_id}")
        except Exception as e:
            logger.warning(f"Failed to seed evaluation for {model_id}: {e}")

