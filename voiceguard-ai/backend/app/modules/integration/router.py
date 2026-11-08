"""
VoiceGuard AI — Unified Analysis API Router
Phase 29: Integration Layer (SIH26104)

Exposes endpoints coordinating the multi-engine analysis architecture:
- POST /api/v1/analysis
- GET /api/v1/analysis
- GET /api/v1/analysis/events
- GET /api/v1/analysis/{analysis_id}
- GET /api/v1/analysis/{analysis_id}/status
- GET /api/v1/analysis/{analysis_id}/results
- POST /api/v1/analysis/{analysis_id}/cancel
"""

import base64
import logging
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User
from app.modules.integration.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisStatusResponse,
    AnalysisCancelResponse,
    IntegrationEventOut,
)
from app.modules.integration.orchestrator import analysis_orchestrator
from app.modules.integration.service import IntegrationService
from app.modules.integration.models import ModuleExecution
from app.core.security_hardening import AudioSecurityValidator

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_200_OK)
def trigger_analysis(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Coordinates real-time and post-call analysis across all VoiceGuard AI engines:
    - Authenticity detection
    - Speaker verification
    - Prosody analysis
    - Multilingual LID & ASR
    - NLP Social Engineering
    - Threat Intelligence
    - Central Risk Engine
    - Explainability & Alert/Prevention policy
    """
    audio_bytes = None
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
            # Enforce security validation from Phase 25 (max 25MB, format check)
            AudioSecurityValidator.validate_audio_chunk(audio_bytes)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 audio payload: {str(e)}",
            )

    context = {
        "caller_number": payload.caller_number,
        "target_identity": payload.target_identity,
        "transaction_info": payload.transaction_info,
    }
    if payload.context_overrides:
        context.update(payload.context_overrides)

    user_org_id = getattr(current_user, "organization_id", None)

    result = analysis_orchestrator.execute_analysis(
        db=db,
        audio_bytes=audio_bytes,
        context=context,
        organization_id=user_org_id,
        idempotency_key=payload.idempotency_key,
        analysis_profile=payload.analysis_profile,
        requested_features=payload.requested_features,
        consent_confirmed=payload.consent_confirmed,
        call_id=payload.call_id,
    )

    return result


@router.get("", response_model=List[AnalysisStatusResponse])
def list_analysis_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Lists recent analysis sessions scoped strictly by tenant boundary."""
    sessions = IntegrationService.list_sessions(db, current_user, status_filter, limit)
    return [
        {
            "analysis_id": s.session_uuid,
            "correlation_id": s.correlation_id,
            "organization_id": s.organization_id,
            "status": s.status,
            "created_at": s.created_at,
            "completed_at": s.completed_at,
            "overall_risk_score": s.overall_risk_score,
            "risk_level": s.risk_level,
            "error_code": s.error_code,
            "error_message": s.error_message,
        }
        for s in sessions
    ]


@router.get("/events", response_model=List[IntegrationEventOut])
def list_integration_events(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Lists integration domain events with tenant isolation."""
    return IntegrationService.get_events(db, current_user, limit)


@router.get("/{analysis_id}/status", response_model=AnalysisStatusResponse)
def get_analysis_status(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Lightweight polling endpoint to check analysis lifecycle status."""
    sess = IntegrationService.get_session(db, analysis_id, current_user)
    return {
        "analysis_id": sess.session_uuid,
        "correlation_id": sess.correlation_id,
        "organization_id": sess.organization_id,
        "status": sess.status,
        "created_at": sess.created_at,
        "completed_at": sess.completed_at,
        "overall_risk_score": sess.overall_risk_score,
        "risk_level": sess.risk_level,
        "error_code": sess.error_code,
        "error_message": sess.error_message,
    }


@router.get("/{analysis_id}/results", response_model=AnalysisResponse)
def get_analysis_results(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Fetches full forensic results and module execution breakdown for an analysis session."""
    sess = IntegrationService.get_session(db, analysis_id, current_user)
    m_execs = db.query(ModuleExecution).filter(ModuleExecution.session_id == sess.id).all()
    mod_dict = {m.module_id: m.result_json or {} for m in m_execs}

    return {
        "analysis_id": sess.session_uuid,
        "correlation_id": sess.correlation_id,
        "organization_id": sess.organization_id,
        "processing_status": sess.status,
        "audio_status": "READY",
        "authenticity_result": mod_dict.get("authenticity_detection"),
        "speaker_verification_result": mod_dict.get("speaker_verification"),
        "prosody_result": mod_dict.get("prosody_analysis"),
        "language_result": mod_dict.get("language_identification"),
        "transcription_result": mod_dict.get("transcription"),
        "conversation_result": mod_dict.get("conversation_intelligence"),
        "threat_result": mod_dict.get("threat_intelligence"),
        "caller_result": mod_dict.get("caller_intelligence"),
        "risk_assessment": {
            "overall_score": sess.overall_risk_score or 0.0,
            "risk_level": sess.risk_level or "low",
            "confidence": sess.confidence or 0.90,
            "recommended_decision": "ALLOW" if (sess.overall_risk_score or 0) < 50 else "TERMINATE",
        },
        "explanation": {
            "observed_evidence": [
                f"Synthetic voice detection score: {mod_dict.get('authenticity_detection', {}).get('synthetic_voice_score', 0)}/100",
                f"Biometric speaker verified: {mod_dict.get('speaker_verification', {}).get('verified', True)}",
            ],
            "model_conclusions": [],
            "contradictory_evidence": [],
            "missing_signals": [],
            "policy_decisions": [],
            "recommended_actions": [],
        },
        "alerts": [],
        "prevention_actions": [],
        "incidents": [],
        "processing_metadata": {
            "module_count": len(m_execs),
            "latencies": {m.module_id: m.processing_time_ms for m in m_execs},
        },
        "warnings": [],
    }


@router.post("/{analysis_id}/cancel", response_model=AnalysisCancelResponse)
def cancel_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Cancels an ongoing analysis session."""
    return IntegrationService.cancel_session(db, analysis_id, current_user)

