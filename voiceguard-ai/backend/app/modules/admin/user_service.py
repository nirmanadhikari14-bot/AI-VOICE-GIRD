from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import User, Role, Organization
from app.core.security import get_password_hash
from app.modules.admin.schemas import AdminUserCreate, AdminUserUpdate, AdminUserResponse
from app.modules.admin.audit_service import log_admin_action
from app.modules.admin.permissions import enforce_tenant_isolation

def to_user_response(user: User, db: Session) -> AdminUserResponse:
    role_name = None
    if user.role_id:
        role = db.query(Role).filter(Role.id == user.role_id).first()
        if role:
            role_name = role.name
            
    org_name = None
    if user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org:
            org_name = org.name
            
    return AdminUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role_id=user.role_id,
        role_name=role_name,
        organization_id=user.organization_id,
        organization_name=org_name,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

def list_users(
    db: Session,
    actor_user: User,
    organization_id: Optional[int] = None,
    role_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[AdminUserResponse]:
    # Enforce tenant isolation if actor is scoped to an organization
    role_name = actor_user.role.name.lower() if actor_user.role else "user"
    if actor_user.organization_id is not None and role_name not in ("superadmin", "admin"):
        organization_id = actor_user.organization_id

    query = db.query(User)
    if organization_id is not None:
        query = query.filter(User.organization_id == organization_id)
    if role_id is not None:
        query = query.filter(User.role_id == role_id)
    if status_filter:
        query = query.filter(User.status == status_filter)
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) | (User.name.ilike(f"%{search}%"))
        )
        
    users = query.offset(offset).limit(limit).all()
    return [to_user_response(u, db) for u in users]

def get_user_by_id(db: Session, user_id: int, actor_user: User) -> AdminUserResponse:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")
        
    enforce_tenant_isolation(actor_user, target.organization_id, db)
    return to_user_response(target, db)

def create_user(db: Session, payload: AdminUserCreate, actor_user: User) -> AdminUserResponse:
    # Organization boundary enforcement
    target_org_id = payload.organization_id
    if actor_user.organization_id is not None:
        target_org_id = actor_user.organization_id
    elif target_org_id is not None:
        enforce_tenant_isolation(actor_user, target_org_id, db)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{payload.email}' already exists"
        )
        
    if payload.role_id:
        role = db.query(Role).filter(Role.id == payload.role_id).first()
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role_id")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role_id=payload.role_id,
        organization_id=target_org_id,
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="user.create",
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "role_id": user.role_id, "organization_id": user.organization_id}
    )
    return to_user_response(user, db)

def update_user(db: Session, user_id: int, payload: AdminUserUpdate, actor_user: User) -> AdminUserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")
        
    enforce_tenant_isolation(actor_user, user.organization_id, db)
    
    # Privilege escalation defense: only platform admins can change roles or move tenants
    role_name = getattr(actor_user, "role_name", None) or (actor_user.role.name.lower() if actor_user.role else "user")
    if role_name not in ("superadmin", "admin"):
        if payload.role_id is not None and payload.role_id != user.role_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="INSUFFICIENT_PRIVILEGE: Only platform administrators can modify user roles."
            )
        if payload.organization_id is not None and payload.organization_id != user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TENANT_ISOLATION_VIOLATION: Cannot reassign user to another organization."
            )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(user, field, val)
        
    db.commit()
    db.refresh(user)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="user.update",
        resource_type="user",
        resource_id=str(user.id),
        details=update_data
    )
    return to_user_response(user, db)

def suspend_user(db: Session, user_id: int, actor_user: User) -> AdminUserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")
        
    enforce_tenant_isolation(actor_user, user.organization_id, db)
    
    # Prevent self-suspension
    if user.id == actor_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own administrator account"
        )
        
    user.status = "suspended"
    db.commit()
    db.refresh(user)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="user.suspend",
        resource_type="user",
        resource_id=str(user.id),
        details={"status": "suspended"}
    )
    return to_user_response(user, db)

def activate_user(db: Session, user_id: int, actor_user: User) -> AdminUserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found")
        
    enforce_tenant_isolation(actor_user, user.organization_id, db)
    
    user.status = "active"
    db.commit()
    db.refresh(user)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="user.activate",
        resource_type="user",
        resource_id=str(user.id),
        details={"status": "active"}
    )
    return to_user_response(user, db)
