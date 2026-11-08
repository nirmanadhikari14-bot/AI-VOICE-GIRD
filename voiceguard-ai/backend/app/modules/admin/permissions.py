from typing import List, Set
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, Role, RolePermission, Permission

# Standard Permission Codes
PERMISSIONS = {
    # Organizations
    "ORGANIZATIONS_READ": "organizations.read",
    "ORGANIZATIONS_MANAGE": "organizations.manage",
    "ORGANIZATIONS_SUSPEND": "organizations.suspend",
    # Users
    "USERS_READ": "users.read",
    "USERS_CREATE": "users.create",
    "USERS_UPDATE": "users.update",
    "USERS_SUSPEND": "users.suspend",
    # Roles & Permissions
    "ROLES_READ": "roles.read",
    "ROLES_MANAGE": "roles.manage",
    # Policies
    "POLICIES_READ": "policies.read",
    "POLICIES_MANAGE": "policies.manage",
    # Devices
    "DEVICES_READ": "devices.read",
    "DEVICES_REVOKE": "devices.revoke",
    # Integrations
    "INTEGRATIONS_READ": "integrations.read",
    "INTEGRATIONS_MANAGE": "integrations.manage",
    # Audit
    "AUDIT_READ": "audit.read",
    "AUDIT_EXPORT": "audit.export",
    # AI Services
    "AI_SERVICES_READ": "ai_services.read",
    "AI_SERVICES_MANAGE": "ai_services.manage",
    # Data Retention
    "RETENTION_READ": "retention.read",
    "RETENTION_MANAGE": "retention.manage",
    # System
    "SYSTEM_CONFIG_READ": "system.read",
    "SYSTEM_CONFIG_MANAGE": "system.manage",
    "REPORTS_READ": "reports.read",
}

DEFAULT_ROLE_PERMISSIONS = {
    "superadmin": list(PERMISSIONS.values()),
    "admin": list(PERMISSIONS.values()),
    "org_admin": [
        "organizations.read",
        "users.read",
        "users.create",
        "users.update",
        "users.suspend",
        "roles.read",
        "policies.read",
        "policies.manage",
        "devices.read",
        "devices.revoke",
        "integrations.read",
        "integrations.manage",
        "audit.read",
        "retention.read",
        "reports.read",
    ],
    "security_admin": [
        "users.read",
        "policies.read",
        "policies.manage",
        "devices.read",
        "devices.revoke",
        "integrations.read",
        "audit.read",
        "ai_services.read",
        "reports.read",
    ],
    "analyst": [
        "users.read",
        "policies.read",
        "devices.read",
        "audit.read",
        "reports.read",
    ],
    "read_only_admin": [
        "organizations.read",
        "users.read",
        "roles.read",
        "policies.read",
        "devices.read",
        "integrations.read",
        "audit.read",
        "ai_services.read",
        "retention.read",
        "reports.read",
    ],
}

def get_user_role_name(db: Session, user: User) -> str:
    if user.role_id:
        role = db.query(Role).filter(Role.id == user.role_id).first()
        if role:
            return role.name.lower()
    return "user"

def get_user_permissions(db: Session, user: User) -> Set[str]:
    role_name = get_user_role_name(db, user)
    # Check explicitly assigned permissions from DB
    db_perms = (
        db.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == user.role_id)
        .all()
    )
    perm_codes = {p[0] for p in db_perms}
    
    # Merge with default permissions for role
    defaults = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
    perm_codes.update(defaults)
    
    # Superadmin and admin have wildcard capability
    if role_name in ("admin", "superadmin"):
        perm_codes.update(PERMISSIONS.values())
        
    return perm_codes

def enforce_tenant_isolation(user: User, target_org_id: int | None, db: Session):
    """
    Ensure organization administrators cannot access or modify another organization's data.
    Superadmins and platform admins can access any organization.
    """
    if target_org_id is None:
        return
    role_name = get_user_role_name(db, user)
    if role_name in ("superadmin", "admin"):
        return  # Platform level administrators have global visibility
    
    if user.organization_id is not None and user.organization_id != target_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Tenant isolation violation for organization {target_org_id}"
        )

def require_permission(permission_code: str):
    """
    FastAPI dependency for verifying the caller holds the required permission.
    """
    def dependency(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        user_perms = get_user_permissions(db, current_user)
        if permission_code not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Missing required administrative permission '{permission_code}'"
            )
        return current_user
    return dependency

