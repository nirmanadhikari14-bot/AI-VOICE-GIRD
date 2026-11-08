from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import DeviceRegistration, User
from app.modules.admin.schemas import DeviceAdminResponse
from app.modules.admin.audit_service import log_admin_action
from app.modules.admin.permissions import enforce_tenant_isolation

def to_device_response(dev: DeviceRegistration, db: Session) -> DeviceAdminResponse:
    user = db.query(User).filter(User.id == dev.user_id).first()
    return DeviceAdminResponse(
        id=dev.id,
        user_id=dev.user_id,
        user_email=user.email if user else None,
        device_token=dev.device_token,
        platform=dev.platform,
        device_name=dev.device_name,
        push_enabled=dev.push_enabled,
        created_at=dev.created_at,
        updated_at=dev.updated_at
    )

def list_devices(
    db: Session,
    actor_user: User,
    organization_id: Optional[int] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[DeviceAdminResponse]:
    role_name = actor_user.role.name.lower() if actor_user.role else "user"
    if actor_user.organization_id is not None and role_name not in ("superadmin", "admin"):
        organization_id = actor_user.organization_id

    query = db.query(DeviceRegistration).join(User, User.id == DeviceRegistration.user_id)
    if organization_id is not None:
        query = query.filter(User.organization_id == organization_id)
    if platform:
        query = query.filter(DeviceRegistration.platform == platform)
    if search:
        query = query.filter(
            (DeviceRegistration.device_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
        
    devices = query.offset(offset).limit(limit).all()
    return [to_device_response(d, db) for d in devices]

def revoke_device(db: Session, device_id: int, reason: Optional[str], actor_user: User) -> bool:
    dev = db.query(DeviceRegistration).filter(DeviceRegistration.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Device {device_id} not found")
        
    user = db.query(User).filter(User.id == dev.user_id).first()
    if user:
        enforce_tenant_isolation(actor_user, user.organization_id, db)
        
    # Revoke by disabling push and deleting token
    db.delete(dev)
    db.commit()
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="device.revoke",
        resource_type="device",
        resource_id=str(device_id),
        details={"reason": reason or "Administrative security hold", "user_id": dev.user_id}
    )
    return True
