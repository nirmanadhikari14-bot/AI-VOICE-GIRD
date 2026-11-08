from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, Incident, IncidentNote, Call, Alert
from app.core.security_hardening import enforce_tenant_boundary

router = APIRouter()

class IncidentNoteOut(BaseModel):
    id: int
    author: str
    content: str
    created_at: datetime

class IncidentOut(BaseModel):
    id: int
    incident_number: str
    title: str
    category: str
    severity: str
    priority: str
    status: str
    assigned_to: Optional[str]
    summary: Optional[str]
    call_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    notes: List[IncidentNoteOut] = []

class IncidentCreate(BaseModel):
    title: str
    category: str = "voice_clone"
    severity: str = "high"
    priority: str = "p2"
    summary: str
    call_id: Optional[int] = None

class NoteCreate(BaseModel):
    content: str

class StatusUpdate(BaseModel):
    status: str

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    q = db.query(Incident)
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin"] and current_user.organization_id is not None:
        q = q.filter((Incident.organization_id == current_user.organization_id) | (Incident.organization_id.is_(None)))
    if status:
        q = q.filter(Incident.status == status)
    incidents = q.order_by(Incident.created_at.desc()).limit(limit).all()
    return incidents

@router.get("/{id}", response_model=IncidentOut)
def get_incident_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    enforce_tenant_boundary(current_user, inc.organization_id, "Security Incident")
    return inc

@router.post("", response_model=IncidentOut)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    count = db.query(Incident).count() + 1
    inc_num = f"INC-2026-{count:04d}"
    inc = Incident(
        organization_id=current_user.organization_id,
        incident_number=inc_num,
        title=payload.title,
        category=payload.category,
        severity=payload.severity,
        priority=payload.priority,
        status="open",
        assigned_to=current_user.name or current_user.email,
        summary=payload.summary,
        call_id=payload.call_id
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc

@router.post("/{id}/notes", response_model=IncidentNoteOut)
def add_incident_note(
    id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    enforce_tenant_boundary(current_user, inc.organization_id, "Security Incident")
    note = IncidentNote(
        incident_id=id,
        author=current_user.name or current_user.email,
        content=payload.content
    )
    db.add(note)
    inc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note

@router.post("/{id}/status")
def update_incident_status(
    id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    enforce_tenant_boundary(current_user, inc.organization_id, "Security Incident")
    
    valid_statuses = ["open", "investigating", "resolved", "closed"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    inc.status = payload.status
    inc.updated_at = datetime.utcnow()
    db.commit()
    return {"id": id, "status": inc.status, "updated_at": inc.updated_at}
