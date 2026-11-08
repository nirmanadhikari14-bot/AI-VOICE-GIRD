from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, PreventionAction, Policy, Call
from app.core.security_hardening import enforce_tenant_boundary

router = APIRouter()

class PreventionActionOut(BaseModel):
    id: int
    call_id: Optional[int]
    action_type: str
    status: str
    reason: Optional[str]
    provider: str
    policy_name: Optional[str]
    execution_result: Optional[dict]
    created_at: datetime
    updated_at: datetime

@router.get("/actions", response_model=List[PreventionActionOut])
def list_prevention_actions(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    q = db.query(PreventionAction)
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin"] and current_user.organization_id is not None:
        q = q.filter((PreventionAction.organization_id == current_user.organization_id) | (PreventionAction.organization_id.is_(None)))
    if status:
        q = q.filter(PreventionAction.status == status)
    actions = q.order_by(PreventionAction.created_at.desc()).all()

    results = []
    for a in actions:
        policy = db.query(Policy).filter(Policy.id == a.policy_id).first() if a.policy_id else None
        results.append({
            "id": a.id,
            "call_id": a.call_id,
            "action_type": a.action_type,
            "status": a.status,
            "reason": a.reason,
            "provider": a.provider,
            "policy_name": policy.name if policy else "Default Voice Defense Policy",
            "execution_result": a.execution_result,
            "created_at": a.created_at,
            "updated_at": a.updated_at
        })
    return results

@router.get("/actions/{id}", response_model=PreventionActionOut)
def get_prevention_action(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    a = db.query(PreventionAction).filter(PreventionAction.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Prevention action not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Prevention Action")
    policy = db.query(Policy).filter(Policy.id == a.policy_id).first() if a.policy_id else None
    return {
        "id": a.id,
        "call_id": a.call_id,
        "action_type": a.action_type,
        "status": a.status,
        "reason": a.reason,
        "provider": a.provider,
        "policy_name": policy.name if policy else "Default Voice Defense Policy",
        "execution_result": a.execution_result,
        "created_at": a.created_at,
        "updated_at": a.updated_at
    }

@router.post("/actions/{id}/approve")
def approve_prevention_action(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    # Privilege authorization check
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin", "org_admin", "security_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="INSUFFICIENT_PRIVILEGE: Only security administrators and operators can approve prevention actions."
        )

    a = db.query(PreventionAction).filter(PreventionAction.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Prevention action not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Prevention Action")
    a.status = "approved"
    a.updated_at = datetime.utcnow()
    db.commit()
    return {"id": id, "status": "approved", "approved_by": current_user.email}

@router.post("/actions/{id}/execute")
def execute_prevention_action(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    # Privilege authorization check
    user_role = getattr(current_user.role, "name", None) if current_user.role else None
    if user_role not in ["superadmin", "admin", "org_admin", "security_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="INSUFFICIENT_PRIVILEGE: Only security administrators and operators can execute prevention actions."
        )

    a = db.query(PreventionAction).filter(PreventionAction.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Prevention action not found")
    enforce_tenant_boundary(current_user, a.organization_id, "Prevention Action")

    # Idempotent execution guard
    if a.status == "executed":
        return {"id": id, "status": "executed", "result": a.execution_result, "idempotent": True}
    if a.status in ["cancelled", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ACTION_INVALID_STATE: Cannot execute prevention action in state '{a.status}'."
        )

    a.status = "executed"
    a.execution_result = {
        "executed_at": datetime.utcnow().isoformat(),
        "executor": current_user.email,
        "carrier_ack": "SIP_SESSION_TERMINATED_200_OK",
        "provider": a.provider
    }
    a.updated_at = datetime.utcnow()
    db.commit()
    return {"id": id, "status": "executed", "result": a.execution_result}
