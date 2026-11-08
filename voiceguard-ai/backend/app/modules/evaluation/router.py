"""
VoiceGuard AI — AI Model Evaluation REST API Router
Phase 27: SIH26104
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.modules.evaluation import schemas, service
from app.modules.evaluation.models import EvaluationRun

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health", response_model=schemas.EvaluationHealthResponse, tags=["evaluation"])
def evaluation_health(db: Session = Depends(get_db)):
    """Returns evaluation framework operational status."""
    return service.get_evaluation_health(db)


# ─── Datasets ────────────────────────────────────────────────────────────────

@router.get("/datasets", response_model=List[schemas.DatasetResponse], tags=["evaluation"])
def list_datasets(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Lists all registered evaluation datasets."""
    return service.list_datasets(db)


@router.post("/datasets", response_model=schemas.DatasetResponse, status_code=status.HTTP_201_CREATED, tags=["evaluation"])
def create_dataset(
    req: schemas.DatasetCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Registers a new evaluation dataset."""
    return service.create_dataset_record(db, req)


# ─── Evaluation Runs ─────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.EvaluationRunResponse], tags=["evaluation"])
def list_evaluations(
    model_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lists evaluation runs with optional model_id and status filters."""
    q = db.query(EvaluationRun)
    if model_id:
        q = q.filter(EvaluationRun.model_id == model_id)
    if status_filter:
        q = q.filter(EvaluationRun.status == status_filter)
    return q.order_by(EvaluationRun.created_at.desc()).limit(limit).all()


@router.post("/", response_model=schemas.EvaluationRunResponse, status_code=status.HTTP_201_CREATED, tags=["evaluation"])
def create_evaluation(
    req: schemas.EvaluationRunCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Creates a new evaluation run record (queued state) and schedules background execution."""
    created_by = getattr(current_user, "email", None) or getattr(current_user, "username", "api")
    run = service.create_evaluation_run(db, req, created_by=created_by)
    background_tasks.add_task(_run_evaluation_bg, run.evaluation_run_id)
    return run


def _run_evaluation_bg(evaluation_run_id: str):
    """Background task: executes evaluation and persists results."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        service.execute_evaluation_run(db, evaluation_run_id)
    except Exception as e:
        logger.error(f"Background evaluation {evaluation_run_id} failed: {e}")
    finally:
        db.close()


@router.get("/{evaluation_run_id}", response_model=schemas.EvaluationRunResponse, tags=["evaluation"])
def get_evaluation(
    evaluation_run_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieves an evaluation run by ID."""
    run = db.query(EvaluationRun).filter(
        EvaluationRun.evaluation_run_id == evaluation_run_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")
    return run


@router.post("/{evaluation_run_id}/run", response_model=schemas.EvaluationRunResponse, tags=["evaluation"])
def trigger_evaluation(
    evaluation_run_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Manually triggers execution of a queued evaluation run."""
    run = db.query(EvaluationRun).filter(
        EvaluationRun.evaluation_run_id == evaluation_run_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")
    if run.status not in ("queued", "failed"):
        raise HTTPException(status_code=400, detail=f"Cannot re-run evaluation in state: {run.status}")
    run.status = "queued"
    db.commit()
    background_tasks.add_task(_run_evaluation_bg, evaluation_run_id)
    db.refresh(run)
    return run


@router.post("/{evaluation_run_id}/cancel", response_model=schemas.EvaluationRunResponse, tags=["evaluation"])
def cancel_evaluation(
    evaluation_run_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Cancels a queued evaluation run."""
    run = db.query(EvaluationRun).filter(
        EvaluationRun.evaluation_run_id == evaluation_run_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")
    if run.status not in ("queued",):
        raise HTTPException(status_code=400, detail=f"Can only cancel queued runs. Current state: {run.status}")
    run.status = "cancelled"
    db.commit()
    db.refresh(run)
    return run


@router.get("/{evaluation_run_id}/metrics", response_model=List[schemas.MetricResponse], tags=["evaluation"])
def get_evaluation_metrics(
    evaluation_run_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns flat metric rows for an evaluation run."""
    from app.modules.evaluation.models import EvaluationMetric
    return db.query(EvaluationMetric).filter(
        EvaluationMetric.evaluation_run_id == evaluation_run_id
    ).all()


# ─── Models ───────────────────────────────────────────────────────────────────

@router.get("/models", response_model=List[dict], tags=["evaluation"])
def list_models(current_user=Depends(get_current_user)):
    """Returns all models with registered evaluation adapters."""
    return service.list_registered_models()


@router.get("/models/{model_id}/history", response_model=List[schemas.EvaluationRunResponse], tags=["evaluation"])
def get_model_history(
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns evaluation run history for a specific model."""
    return service.get_model_history(db, model_id)


@router.get("/models/{model_id}/compare", response_model=schemas.ModelComparisonResponse, tags=["evaluation"])
def compare_model_versions(
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns side-by-side metric comparison across model versions."""
    return service.get_model_comparison(db, model_id)


# ─── Readiness ────────────────────────────────────────────────────────────────

@router.get("/readiness", response_model=List[schemas.ReadinessResponse], tags=["evaluation"])
def list_readiness(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lists readiness records for all evaluated models."""
    return service.get_readiness_records(db)


@router.post("/readiness/{model_id}/approve", response_model=schemas.ReadinessResponse, tags=["evaluation"])
def approve_readiness(
    model_id: str,
    req: schemas.ReadinessApproveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Grants a human approval stamp to the latest readiness record for a model."""
    try:
        return service.approve_model_readiness(
            db=db,
            model_id=model_id,
            approved_by=req.approved_by,
            target_tier=req.target_tier,
            audit_notes=req.audit_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Threshold Analysis ───────────────────────────────────────────────────────

@router.post("/threshold-analysis", response_model=schemas.ThresholdResponse, tags=["evaluation"])
def threshold_analysis(
    req: schemas.ThresholdAnalysisRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Derives calibrated operating thresholds from an evaluation run."""
    return service.run_threshold_analysis(
        db=db,
        model_id=req.model_id,
        model_version=req.model_version,
        evaluation_run_id=req.evaluation_run_id,
        target_fpr=req.target_fpr,
    )

