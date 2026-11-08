from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import Policy, User
from app.modules.admin.schemas import PolicyCreate, PolicyUpdate, PolicyResponse
from app.modules.admin.audit_service import log_admin_action

def list_policies(db: Session, policy_type: Optional[str] = None) -> List[PolicyResponse]:
    query = db.query(Policy)
    if policy_type:
        query = query.filter(Policy.policy_type == policy_type)
    policies = query.order_by(Policy.created_at.desc()).all()
    return [PolicyResponse.model_validate(p) for p in policies]

def get_policy_by_id(db: Session, policy_id: int) -> PolicyResponse:
    p = db.query(Policy).filter(Policy.id == policy_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy {policy_id} not found")
    return PolicyResponse.model_validate(p)

def create_policy(db: Session, payload: PolicyCreate, actor_user: User) -> PolicyResponse:
    p = Policy(
        name=payload.name,
        description=payload.description,
        policy_type=payload.policy_type,
        configuration=payload.configuration,
        enabled=payload.enabled
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="policy.create",
        resource_type="policy",
        resource_id=str(p.id),
        details={"name": p.name, "policy_type": p.policy_type}
    )
    return PolicyResponse.model_validate(p)

def update_policy(db: Session, policy_id: int, payload: PolicyUpdate, actor_user: User) -> PolicyResponse:
    p = db.query(Policy).filter(Policy.id == policy_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy {policy_id} not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)
        
    db.commit()
    db.refresh(p)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="policy.update",
        resource_type="policy",
        resource_id=str(p.id),
        details=update_data
    )
    return PolicyResponse.model_validate(p)

def toggle_policy_status(db: Session, policy_id: int, enabled: bool, actor_user: User) -> PolicyResponse:
    p = db.query(Policy).filter(Policy.id == policy_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy {policy_id} not found")
        
    p.enabled = enabled
    db.commit()
    db.refresh(p)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="policy.toggle",
        resource_type="policy",
        resource_id=str(p.id),
        details={"enabled": enabled}
    )
    return PolicyResponse.model_validate(p)

