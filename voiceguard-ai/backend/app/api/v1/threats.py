from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, ThreatIndicator

router = APIRouter()

class ThreatIndicatorOut(BaseModel):
    id: int
    indicator_type: str
    indicator_value: str
    source: str
    reputation: str
    severity: str
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]
    metadata_json: Optional[dict]

class ThreatIndicatorCreate(BaseModel):
    indicator_type: str
    indicator_value: str
    source: str = "internal_telemetry"
    reputation: str = "malicious"
    severity: str = "high"
    metadata_json: Optional[dict] = None

@router.get("/indicators", response_model=List[ThreatIndicatorOut])
def list_threat_indicators(
    db: Session = Depends(get_db),
    indicator_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    q = db.query(ThreatIndicator)
    if indicator_type:
        q = q.filter(ThreatIndicator.indicator_type == indicator_type)
    if severity:
        q = q.filter(ThreatIndicator.severity == severity)
    return q.order_by(ThreatIndicator.last_seen.desc()).limit(limit).all()

@router.get("/indicators/{id}", response_model=ThreatIndicatorOut)
def get_threat_indicator(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    ind = db.query(ThreatIndicator).filter(ThreatIndicator.id == id).first()
    if not ind:
        raise HTTPException(status_code=404, detail="Threat indicator not found")
    return ind

@router.post("/indicators", response_model=ThreatIndicatorOut)
def create_threat_indicator(
    payload: ThreatIndicatorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    now = datetime.utcnow()
    ind = ThreatIndicator(
        indicator_type=payload.indicator_type,
        indicator_value=payload.indicator_value,
        source=payload.source,
        reputation=payload.reputation,
        severity=payload.severity,
        first_seen=now,
        last_seen=now,
        metadata_json=payload.metadata_json or {}
    )
    db.add(ind)
    db.commit()
    db.refresh(ind)
    return ind

