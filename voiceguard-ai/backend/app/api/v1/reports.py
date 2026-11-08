from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, SuspiciousReport, Incident

router = APIRouter()

class SuspiciousReportCreate(BaseModel):
    interaction_type: str # call, voice_note, money_request, otp_request, impersonation
    caller_info: Optional[str] = None
    description: str
    reason: str
    evidence_url: Optional[str] = None

@router.post("/suspicious")
def report_suspicious(
    payload: SuspiciousReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    report = SuspiciousReport(
        user_id=current_user.id,
        interaction_type=payload.interaction_type,
        caller_info=payload.caller_info,
        description=payload.description,
        reason=payload.reason,
        evidence_url=payload.evidence_url,
        status="submitted"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Automatically create a triage incident for SecOps
    count = db.query(Incident).count() + 1
    incident = Incident(
        incident_number=f"INC-2026-{count:04d}",
        title=f"User Report: Suspicious {payload.interaction_type.replace('_', ' ').title()}",
        category="suspicious_interaction",
        severity="medium",
        priority="p3",
        status="open",
        assigned_to="Triage Queue",
        summary=f"Reported by {current_user.email}. Caller: {payload.caller_info or 'Unknown'}. Reason: {payload.reason}. Description: {payload.description}"
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        "report_id": report.id,
        "incident_number": incident.incident_number,
        "status": "submitted",
        "message": "Report logged securely. SecOps triage has been notified."
    }
