from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.models.domain import User
from app.modules.admin.permissions import require_permission, PERMISSIONS
from app.modules.admin import schemas
from app.modules.admin import (
    organization_service,
    user_service,
    role_service,
    policy_service,
    device_service,
    integration_service,
    voice_profile_service,
    retention_service,
    ai_service,
    system_service,
    audit_service,
)

router = APIRouter()

# ─── 1. Overview KPIs ────────────────────────────────────────────────────────

@router.get("/overview", response_model=schemas.AdminOverviewKPIs)
def get_overview_kpis(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return system_service.get_admin_overview_kpis(db, current_user, organization_id)

# ─── 2. Organizations ───────────────────────────────────────────────────────

@router.get("/organizations", response_model=List[schemas.OrganizationResponse])
def list_organizations(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_READ"])),
):
    return organization_service.list_organizations(db, status_filter, search, limit, offset)

@router.post("/organizations", response_model=schemas.OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: schemas.OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_MANAGE"])),
):
    return organization_service.create_organization(db, payload, current_user)

@router.get("/organizations/{org_id}", response_model=schemas.OrganizationResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_READ"])),
):
    return organization_service.get_organization_by_id(db, org_id)

@router.patch("/organizations/{org_id}", response_model=schemas.OrganizationResponse)
def update_organization(
    org_id: int,
    payload: schemas.OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_MANAGE"])),
):
    return organization_service.update_organization(db, org_id, payload, current_user)

@router.post("/organizations/{org_id}/suspend", response_model=schemas.OrganizationResponse)
def suspend_organization(
    org_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_SUSPEND"])),
):
    return organization_service.suspend_organization(db, org_id, reason, current_user)

@router.post("/organizations/{org_id}/activate", response_model=schemas.OrganizationResponse)
def activate_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ORGANIZATIONS_MANAGE"])),
):
    return organization_service.activate_organization(db, org_id, current_user)

# ─── 3. Users ───────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.AdminUserResponse])
def list_users(
    organization_id: Optional[int] = None,
    role_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_READ"])),
):
    return user_service.list_users(db, current_user, organization_id, role_id, status_filter, search, limit, offset)

@router.post("/users", response_model=schemas.AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_CREATE"])),
):
    return user_service.create_user(db, payload, current_user)

@router.get("/users/{user_id}", response_model=schemas.AdminUserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_READ"])),
):
    return user_service.get_user_by_id(db, user_id, current_user)

@router.patch("/users/{user_id}", response_model=schemas.AdminUserResponse)
def update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_UPDATE"])),
):
    return user_service.update_user(db, user_id, payload, current_user)

@router.post("/users/{user_id}/suspend", response_model=schemas.AdminUserResponse)
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_SUSPEND"])),
):
    return user_service.suspend_user(db, user_id, current_user)

@router.post("/users/{user_id}/activate", response_model=schemas.AdminUserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_UPDATE"])),
):
    return user_service.activate_user(db, user_id, current_user)

# ─── 4. Roles & Permissions ────────────────────────────────────────────────

@router.get("/roles", response_model=List[schemas.RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ROLES_READ"])),
):
    return role_service.list_roles(db)

@router.post("/roles", response_model=schemas.RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ROLES_MANAGE"])),
):
    return role_service.create_role(db, payload, current_user)

@router.patch("/roles/{role_id}", response_model=schemas.RoleResponse)
def update_role(
    role_id: int,
    payload: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ROLES_MANAGE"])),
):
    return role_service.update_role(db, role_id, payload, current_user)

@router.get("/permissions", response_model=List[schemas.PermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["ROLES_READ"])),
):
    return role_service.list_permissions(db)

# ─── 5. Security Policies ──────────────────────────────────────────────────

@router.get("/policies", response_model=List[schemas.PolicyResponse])
def list_policies(
    policy_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["POLICIES_READ"])),
):
    return policy_service.list_policies(db, policy_type)

@router.post("/policies", response_model=schemas.PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(
    payload: schemas.PolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["POLICIES_MANAGE"])),
):
    return policy_service.create_policy(db, payload, current_user)

@router.get("/policies/{policy_id}", response_model=schemas.PolicyResponse)
def get_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["POLICIES_READ"])),
):
    return policy_service.get_policy_by_id(db, policy_id)

@router.patch("/policies/{policy_id}", response_model=schemas.PolicyResponse)
def update_policy(
    policy_id: int,
    payload: schemas.PolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["POLICIES_MANAGE"])),
):
    return policy_service.update_policy(db, policy_id, payload, current_user)

@router.post("/policies/{policy_id}/toggle", response_model=schemas.PolicyResponse)
def toggle_policy(
    policy_id: int,
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["POLICIES_MANAGE"])),
):
    return policy_service.toggle_policy_status(db, policy_id, enabled, current_user)

# ─── 6. Devices ─────────────────────────────────────────────────────────────

@router.get("/devices", response_model=List[schemas.DeviceAdminResponse])
def list_devices(
    organization_id: Optional[int] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["DEVICES_READ"])),
):
    return device_service.list_devices(db, current_user, organization_id, platform, search, limit, offset)

@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: int,
    payload: Optional[schemas.DeviceRevokeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["DEVICES_REVOKE"])),
):
    reason = payload.reason if payload else "Administrative revocation"
    device_service.revoke_device(db, device_id, reason, current_user)
    return {"status": "revoked", "device_id": device_id}

# ─── 7. Integrations ───────────────────────────────────────────────────────

@router.get("/integrations", response_model=List[schemas.IntegrationResponse])
def list_integrations(
    organization_id: Optional[int] = None,
    provider_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["INTEGRATIONS_READ"])),
):
    return integration_service.list_integrations(db, current_user, organization_id, provider_type)

@router.post("/integrations", response_model=schemas.IntegrationResponse, status_code=status.HTTP_201_CREATED)
def create_integration(
    payload: schemas.IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["INTEGRATIONS_MANAGE"])),
):
    return integration_service.create_integration(db, payload, current_user)

@router.patch("/integrations/{integration_id}", response_model=schemas.IntegrationResponse)
def update_integration(
    integration_id: int,
    payload: schemas.IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["INTEGRATIONS_MANAGE"])),
):
    return integration_service.update_integration(db, integration_id, payload, current_user)

@router.post("/integrations/{integration_id}/test", response_model=schemas.IntegrationTestResponse)
def test_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["INTEGRATIONS_READ"])),
):
    return integration_service.test_integration(db, integration_id, current_user)

# ─── 8. Voice Profiles (Privacy-Safe) ──────────────────────────────────────

@router.get("/voice-profiles", response_model=List[schemas.VoiceProfileAdminResponse])
def list_voice_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_READ"])),
):
    return voice_profile_service.list_voice_profiles(db, current_user)

@router.post("/voice-profiles/{profile_id}/revoke")
def revoke_voice_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["USERS_UPDATE"])),
):
    voice_profile_service.revoke_voice_profile(db, profile_id, current_user)
    return {"status": "revoked", "profile_id": profile_id}

# ─── 9. Data Retention ─────────────────────────────────────────────────────

@router.get("/retention", response_model=List[schemas.RetentionPolicyResponse])
def list_retention_policies(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["RETENTION_READ"])),
):
    return retention_service.list_retention_policies(db, current_user, organization_id)

@router.post("/retention", response_model=schemas.RetentionPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_retention_policy(
    payload: schemas.RetentionPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["RETENTION_MANAGE"])),
):
    return retention_service.create_retention_policy(db, payload, current_user)

@router.patch("/retention/{policy_id}", response_model=schemas.RetentionPolicyResponse)
def update_retention_policy(
    policy_id: int,
    payload: schemas.RetentionPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["RETENTION_MANAGE"])),
):
    return retention_service.update_retention_policy(db, policy_id, payload, current_user)

# ─── 10. AI Model Services ────────────────────────────────────────────────

@router.get("/ai-services", response_model=List[schemas.ModelServiceResponse])
def list_ai_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["AI_SERVICES_READ"])),
):
    return ai_service.list_model_services(db)

@router.post("/ai-services/{service_id}/rollback", response_model=schemas.ModelServiceResponse)
def rollback_ai_service(
    service_id: int,
    payload: schemas.ModelServiceRollbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["AI_SERVICES_MANAGE"])),
):
    return ai_service.rollback_model_version(db, service_id, payload, current_user)

# ─── 11. System Configurations ─────────────────────────────────────────────

@router.get("/system-configs", response_model=List[schemas.SystemConfigResponse])
def list_system_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["SYSTEM_CONFIG_READ"])),
):
    return system_service.list_system_configs(db)

@router.patch("/system-configs/{config_key}", response_model=schemas.SystemConfigResponse)
def update_system_config(
    config_key: str,
    payload: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["SYSTEM_CONFIG_MANAGE"])),
):
    return system_service.update_system_config(db, config_key, payload, current_user)

# ─── 12. Audit Logs ────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=List[schemas.AdminAuditLogResponse])
def list_admin_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PERMISSIONS["AUDIT_READ"])),
):
    return audit_service.get_admin_audit_logs(db, action, resource_type, user_id, limit, offset)

