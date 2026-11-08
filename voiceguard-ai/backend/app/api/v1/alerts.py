from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, Alert, Call, RiskScore
from app.core.security_hardening import enforce_tenant_boundary

router = APIRouter()

class AlertOut(BaseModel):
    id: int
    call_id: Optional[int]
    alert_type: str
    severity: str
    title: str
    message: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    caller_number: Optional[str]
    target: Optional[str]
    risk_score: Optional[float]

@router.get("", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    q = db.query(Alert)
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin"] and current_user.organization_id is not None:
        q = q.filter((Alert.organization_id == current_user.organization_id) | (Alert.organization_id.is_(None)))
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.order_by(Alert.created_at.desc()).limit(limit).all()

    result = []
    for a in alerts:
        call = db.query(Call).filter(Call.id == a.call_id).first() if a.call_id else None
        risk = db.query(RiskScore).filter(RiskScore.call_id == a.call_id).order_by(RiskScore.created_at.desc()).first() if a.call_id else None
        result.append({
            "id": a.id,
            "call_id": a.call_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "status": a.status,
            "created_at": a.created_at,
            "resolved_at": a.resolved_at,
            "caller_number": call.caller_number if call else None,
            "target": call.receiver_number if call else None,
            "risk_score": risk.overall_score if risk else None
        })
    return result

@router.get("/{id}", response_model=AlertOut)
def get_alert_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    a = db.query(Alert).filter(Alert.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Security Alert")
    call = db.query(Call).filter(Call.id == a.call_id).first() if a.call_id else None
    risk = db.query(RiskScore).filter(RiskScore.call_id == a.call_id).order_by(RiskScore.created_at.desc()).first() if a.call_id else None
    return {
        "id": a.id,
        "call_id": a.call_id,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "message": a.message,
        "status": a.status,
        "created_at": a.created_at,
        "resolved_at": a.resolved_at,
        "caller_number": call.caller_number if call else None,
        "target": call.receiver_number if call else None,
        "risk_score": risk.overall_score if risk else None
    }

@router.post("/{id}/acknowledge")
def acknowledge_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    a = db.query(Alert).filter(Alert.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Security Alert")
    a.status = "acknowledged"
    db.commit()
    return {"status": "acknowledged", "alert_id": id, "acknowledged_by": current_user.email}

@router.post("/{id}/dismiss")
def dismiss_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    a = db.query(Alert).filter(Alert.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Security Alert")
    a.status = "dismissed"
    a.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "dismissed", "alert_id": id, "dismissed_by": current_user.email}

