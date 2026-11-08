from typing import Any, Optional, List
from sqlalchemy.orm import Session
from app.models.domain import AuditLog, User
from app.modules.admin.schemas import AdminAuditLogResponse

def log_admin_action(
    db: Session,
    user: Optional[User],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = "127.0.0.1"
) -> AuditLog:
    """
    Records an immutable audit event for administrative operations.
    """
    log_entry = AuditLog(
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        details=details if isinstance(details, (dict, list, str, int, float, bool)) else (str(details) if details else None),
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def get_admin_audit_logs(
    db: Session,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
) -> List[AdminAuditLogResponse]:
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
        
    records = query.offset(offset).limit(limit).all()
    results = []
    for r in records:
        user_email = None
        if r.user:
            user_email = r.user.email
        results.append(AdminAuditLogResponse(
            id=r.id,
            user_id=r.user_id,
            user_email=user_email,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            details=r.details,
            ip_address=r.ip_address,
            created_at=r.created_at
        ))
    return results

