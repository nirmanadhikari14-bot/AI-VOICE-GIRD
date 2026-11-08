from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, Call, CallMetadata, Speaker, AnalysisResult, RiskScore, Alert, PreventionAction
from app.modules.multilingual.models import LanguageIdentificationRecord, TranscriptionRecord
from app.core.security_hardening import enforce_tenant_boundary

router = APIRouter()

class CallSessionOut(BaseModel):
    id: int
    caller_number: str
    receiver_number: str
    started_at: datetime
    ended_at: Optional[datetime]
    status: str
    call_type: Optional[str]
    risk_level: Optional[str]
    origin: Optional[str]
    carrier: Optional[str]
    network_type: Optional[str]
    codec: Optional[str]
    voice_authenticity: Optional[dict]
    speaker_verification: Optional[dict]
    risk_score: Optional[float]
    active_alerts_count: int
    language_info: Optional[dict] = None
    transcript_info: Optional[dict] = None

@router.get("/active", response_model=List[CallSessionOut])
def list_active_calls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    q = db.query(Call)
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin"] and current_user.organization_id is not None:
        q = q.filter((Call.organization_id == current_user.organization_id) | (Call.organization_id.is_(None)))
    calls = q.order_by(Call.started_at.desc()).limit(20).all()
    results = []
    for c in calls:
        meta = db.query(CallMetadata).filter(CallMetadata.call_id == c.id).first()
        speaker = db.query(Speaker).filter(Speaker.call_id == c.id).first()
        analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == c.id).first()
        risk = db.query(RiskScore).filter(RiskScore.call_id == c.id).order_by(RiskScore.created_at.desc()).first()
        alert_cnt = db.query(Alert).filter(Alert.call_id == c.id, Alert.status == "active").count()
        lang_rec = db.query(LanguageIdentificationRecord).filter(LanguageIdentificationRecord.call_id == c.id).first()
        trans_rec = db.query(TranscriptionRecord).filter(TranscriptionRecord.call_id == c.id).first()

        results.append({
            "id": c.id,
            "caller_number": c.caller_number,
            "receiver_number": c.receiver_number,
            "started_at": c.started_at,
            "ended_at": c.ended_at,
            "status": c.status,
            "call_type": c.call_type,
            "risk_level": c.risk_level,
            "origin": meta.call_origin if meta else None,
            "carrier": meta.carrier if meta else None,
            "network_type": meta.network_type if meta else None,
            "codec": meta.codec if meta else None,
            "voice_authenticity": {
                "score": analysis.score if analysis else None,
                "confidence": analysis.confidence if analysis else None,
                "model_name": analysis.model_name if analysis else None,
                "model_version": analysis.model_version if analysis else None,
                "features": analysis.features if analysis else None
            } if analysis else None,
            "speaker_verification": {
                "status": speaker.verification_status if speaker else "unknown",
                "label": speaker.speaker_label if speaker else None,
                "confidence": speaker.confidence if speaker else None
            } if speaker else None,
            "risk_score": risk.overall_score if risk else None,
            "active_alerts_count": alert_cnt,
            "language_info": {
                "primary_language": lang_rec.language_code,
                "confidence": lang_rec.confidence,
                "is_code_switched": lang_rec.is_code_switched,
                "colloquial_label": lang_rec.colloquial_label,
                "support_status": lang_rec.support_status
            } if lang_rec else None,
            "transcript_info": {
                "text": trans_rec.transcript_text,
                "language": trans_rec.language_code,
                "is_code_switched": trans_rec.is_code_switched,
                "status": trans_rec.status
            } if trans_rec else None
        })
    return results

@router.get("/{id}", response_model=CallSessionOut)
def get_call_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    c = db.query(Call).filter(Call.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Call session not found")
        
    enforce_tenant_boundary(current_user, c.organization_id, "Call session")
        
    meta = db.query(CallMetadata).filter(CallMetadata.call_id == c.id).first()
    speaker = db.query(Speaker).filter(Speaker.call_id == c.id).first()
    analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == c.id).first()
    risk = db.query(RiskScore).filter(RiskScore.call_id == c.id).order_by(RiskScore.created_at.desc()).first()
    alert_cnt = db.query(Alert).filter(Alert.call_id == c.id, Alert.status == "active").count()
    lang_rec = db.query(LanguageIdentificationRecord).filter(LanguageIdentificationRecord.call_id == c.id).first()
    trans_rec = db.query(TranscriptionRecord).filter(TranscriptionRecord.call_id == c.id).first()

    return {
        "id": c.id,
        "caller_number": c.caller_number,
        "receiver_number": c.receiver_number,
        "started_at": c.started_at,
        "ended_at": c.ended_at,
        "status": c.status,
        "call_type": c.call_type,
        "risk_level": c.risk_level,
        "origin": meta.call_origin if meta else None,
        "carrier": meta.carrier if meta else None,
        "network_type": meta.network_type if meta else None,
        "codec": meta.codec if meta else None,
        "voice_authenticity": {
            "score": analysis.score if analysis else None,
            "confidence": analysis.confidence if analysis else None,
            "model_name": analysis.model_name if analysis else None,
            "model_version": analysis.model_version if analysis else None,
            "features": analysis.features if analysis else None
        } if analysis else None,
        "speaker_verification": {
            "status": speaker.verification_status if speaker else "unknown",
            "label": speaker.speaker_label if speaker else None,
            "confidence": speaker.confidence if speaker else None
        } if speaker else None,
        "risk_score": risk.overall_score if risk else None,
        "active_alerts_count": alert_cnt,
        "language_info": {
            "primary_language": lang_rec.language_code,
            "confidence": lang_rec.confidence,
            "is_code_switched": lang_rec.is_code_switched,
            "colloquial_label": lang_rec.colloquial_label,
            "support_status": lang_rec.support_status
        } if lang_rec else None,
        "transcript_info": {
            "text": trans_rec.transcript_text,
            "language": trans_rec.language_code,
            "is_code_switched": trans_rec.is_code_switched,
            "status": trans_rec.status
        } if trans_rec else None
    }
