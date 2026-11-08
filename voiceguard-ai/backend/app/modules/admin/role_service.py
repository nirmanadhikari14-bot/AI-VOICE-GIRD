from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import Role, Permission, RolePermission, User
from app.modules.admin.schemas import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from app.modules.admin.audit_service import log_admin_action

def to_role_response(role: Role, db: Session) -> RoleResponse:
    perms = (
        db.query(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == role.id)
        .all()
    )
    user_count = db.query(User).filter(User.role_id == role.id).count()
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        created_at=role.created_at,
        permissions=[PermissionResponse.model_validate(p) for p in perms],
        user_count=user_count
    )

def list_roles(db: Session) -> List[RoleResponse]:
    roles = db.query(Role).all()
    return [to_role_response(r, db) for r in roles]

def list_permissions(db: Session) -> List[PermissionResponse]:
    perms = db.query(Permission).order_by(Permission.category, Permission.code).all()
    return [PermissionResponse.model_validate(p) for p in perms]

def create_role(db: Session, payload: RoleCreate, actor_user: User) -> RoleResponse:
    existing = db.query(Role).filter(Role.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{payload.name}' already exists"
        )
        
    role = Role(name=payload.name, description=payload.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    
    if payload.permission_ids:
        for pid in payload.permission_ids:
            rp = RolePermission(role_id=role.id, permission_id=pid)
            db.add(rp)
        db.commit()
        
    log_admin_action(
        db=db,
        user=actor_user,
        action="role.create",
        resource_type="role",
        resource_id=str(role.id),
        details={"name": role.name, "permission_ids": payload.permission_ids}
    )
    return to_role_response(role, db)

def update_role(db: Session, role_id: int, payload: RoleUpdate, actor_user: User) -> RoleResponse:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role {role_id} not found")
        
    # Prevent modifying immutable superadmin role name
    if role.name in ("superadmin", "admin") and payload.name and payload.name != role.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot rename root platform administrator roles"
        )
        
    if payload.name:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
        
    if payload.permission_ids is not None:
        # Replace permissions
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        for pid in payload.permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=pid))
            
    db.commit()
    db.refresh(role)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="role.update",
        resource_type="role",
        resource_id=str(role.id),
        details={"name": role.name, "permission_ids": payload.permission_ids}
    )
    return to_role_response(role, db)

