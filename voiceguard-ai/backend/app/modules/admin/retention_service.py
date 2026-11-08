from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import RetentionPolicy, User
from app.modules.admin.schemas import (
    RetentionPolicyCreate, RetentionPolicyUpdate, RetentionPolicyResponse
)
from app.modules.admin.audit_service import log_admin_action
from app.modules.admin.permissions import enforce_tenant_isolation

def list_retention_policies(
    db: Session,
    actor_user: User,
    organization_id: Optional[int] = None
) -> List[RetentionPolicyResponse]:
    role_name = actor_user.role.name.lower() if actor_user.role else "user"
    if actor_user.organization_id is not None and role_name not in ("superadmin", "admin"):
        organization_id = actor_user.organization_id

    query = db.query(RetentionPolicy)
    if organization_id is not None:
        query = query.filter(RetentionPolicy.organization_id == organization_id)
        
    policies = query.order_by(RetentionPolicy.data_category).all()
    return [RetentionPolicyResponse.model_validate(p) for p in policies]

def create_retention_policy(db: Session, payload: RetentionPolicyCreate, actor_user: User) -> RetentionPolicyResponse:
    target_org_id = payload.organization_id
    if actor_user.organization_id is not None:
        target_org_id = actor_user.organization_id
    elif target_org_id is not None:
        enforce_tenant_isolation(actor_user, target_org_id, db)

    existing = db.query(RetentionPolicy).filter(
        RetentionPolicy.organization_id == target_org_id,
        RetentionPolicy.data_category == payload.data_category
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Retention policy for '{payload.data_category}' already exists in this scope"
        )
        
    p = RetentionPolicy(
        organization_id=target_org_id,
        data_category=payload.data_category,
        retention_days=payload.retention_days,
        auto_delete_enabled=payload.auto_delete_enabled,
        legal_hold=payload.legal_hold
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="retention_policy.create",
        resource_type="retention_policy",
        resource_id=str(p.id),
        details={"category": p.data_category, "days": p.retention_days, "legal_hold": p.legal_hold}
    )
    return RetentionPolicyResponse.model_validate(p)

def update_retention_policy(
    db: Session,
    policy_id: int,
    payload: RetentionPolicyUpdate,
    actor_user: User
) -> RetentionPolicyResponse:
    p = db.query(RetentionPolicy).filter(RetentionPolicy.id == policy_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Retention policy {policy_id} not found")
        
    enforce_tenant_isolation(actor_user, p.organization_id, db)
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)
        
    db.commit()
    db.refresh(p)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="retention_policy.update",
        resource_type="retention_policy",
        resource_id=str(p.id),
        details=update_data
    )
    return RetentionPolicyResponse.model_validate(p)
