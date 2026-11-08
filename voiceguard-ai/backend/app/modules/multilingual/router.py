"""
VoiceGuard AI — Multilingual API Router
Phase 26: SIH26104
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User
from app.modules.multilingual import service
from app.modules.multilingual.schemas import (
    LanguageOut,
    AccentOut,
    ModelLanguageSupportOut,
    IdentifyLanguageRequest,
    IdentifyLanguageResponse,
    TranscribeRequest,
    TranscribeResponse,
    EvaluationRunOut,
    FairnessReportResponse,
    MultilingualHealthResponse
)
from app.modules.multilingual.service import model_manager
from multilingual.model_manager import RegisteredModelInfo

router = APIRouter()


@router.get("/languages", response_model=List[LanguageOut])
def get_languages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve all configured Indian languages and support tiers."""
    return service.list_languages(db)


@router.get("/languages/{language_code}", response_model=LanguageOut)
def get_language_detail(
    language_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve details for a specific language code."""
    return service.get_language(language_code, db)


@router.get("/accents", response_model=List[AccentOut])
def get_accents(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve Indian English and regional accent metadata and ethical rules."""
    return service.list_accents()


@router.get("/models", response_model=List[RegisteredModelInfo])
def get_multilingual_models(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List registered speech recognition and language identification models."""
    return model_manager.list_models()


@router.get("/models/{model_id}/language-support")
def get_model_language_support(
    model_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve language capabilities for a specific model."""
    info = model_manager.get_model_info(model_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found.")
    return {
        "model_id": info.model_id,
        "name": info.name,
        "supported_languages": info.supported_languages,
        "validated_languages": info.validated_languages,
        "device_target": info.device_target,
        "is_available": info.is_available,
        "status_notes": info.status_notes
    }


@router.post("/identify-language", response_model=IdentifyLanguageResponse)
def identify_language(
    payload: IdentifyLanguageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Identify spoken language and code-switching in an audio segment."""
    return service.identify_language_service(db, payload, current_user)


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(
    payload: TranscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Generate language-aware transcription with word-level timestamps."""
    return service.transcribe_service(db, payload, current_user)


@router.get("/segments/{segment_id}/language", response_model=IdentifyLanguageResponse)
def get_segment_language(
    segment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve persisted language identification result for a segment."""
    return service.get_segment_language(db, segment_id, current_user)


@router.get("/segments/{segment_id}/transcription", response_model=TranscribeResponse)
def get_segment_transcription(
    segment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve persisted transcription for a segment."""
    return service.get_segment_transcription(db, segment_id, current_user)


@router.get("/evaluations", response_model=List[EvaluationRunOut])
def get_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List benchmark evaluation runs and accuracy reports."""
    return service.list_evaluation_runs(db)


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationRunOut)
def get_evaluation_detail(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retrieve full metrics report and confusion matrix for an evaluation run."""
    return service.get_evaluation_run(db, evaluation_id)


@router.get("/fairness-report", response_model=FairnessReportResponse)
def get_fairness_report(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Audit algorithmic fairness and false-alarm parity across Indian languages."""
    return service.get_fairness_report_service()


@router.get("/health", response_model=MultilingualHealthResponse)
def get_health() -> Any:
    """Health check for multilingual speech and accent processing subsystem."""
    return service.get_multilingual_health()
