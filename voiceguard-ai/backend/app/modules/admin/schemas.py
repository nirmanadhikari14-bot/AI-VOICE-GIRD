from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re

# ─── Organizations ──────────────────────────────────────────────────────────

class OrganizationBase(BaseModel):
    name: str
    org_type: str = "enterprise"
    contact_email: str
    contact_phone: Optional[str] = None
    plan_tier: str = "enterprise_advanced"
    settings_json: Optional[Dict[str, Any]] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    org_type: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    plan_tier: Optional[str] = None
    status: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None

class OrganizationResponse(OrganizationBase):
    id: int
    status: str
    primary_admin_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    active_users_count: int = 0
    active_devices_count: int = 0

    class Config:
        from_attributes = True

# ─── Users ──────────────────────────────────────────────────────────────────

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: str
    role_id: Optional[int] = None
    organization_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Enforces VoiceGuard password policy (Phase 25):
        - Minimum 12 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        """
        errors = []
        if len(v) < 12:
            errors.append("at least 12 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter (A-Z)")
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter (a-z)")
        if not re.search(r"\d", v):
            errors.append("at least one digit (0-9)")
        if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", v):
            errors.append("at least one special character (!@#$%^&* etc.)")
        if errors:
            raise ValueError(f"Password must contain: {'; '.join(errors)}.")
        return v

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role_id: Optional[int] = None
    organization_id: Optional[int] = None
    status: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Roles & Permissions ───────────────────────────────────────────────────

class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: Optional[List[int]] = None

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    created_at: Optional[datetime] = None
    permissions: List[PermissionResponse] = []
    user_count: int = 0

    class Config:
        from_attributes = True

# ─── Policies ──────────────────────────────────────────────────────────────

class PolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    policy_type: str # risk, prevention, alert, incident, auth
    configuration: Dict[str, Any]
    enabled: bool = True

class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    policy_type: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class PolicyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    policy_type: str
    configuration: Optional[Dict[str, Any]] = None
    enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Devices ───────────────────────────────────────────────────────────────

class DeviceAdminResponse(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    device_token: str
    platform: str
    device_name: Optional[str] = None
    push_enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeviceRevokeRequest(BaseModel):
    reason: Optional[str] = "Administrative revocation"

# ─── Integrations ──────────────────────────────────────────────────────────

class IntegrationCreate(BaseModel):
    organization_id: Optional[int] = None
    name: str
    provider_type: str # telephony, sip_trunk, email, sms, push, threat_intel, idv
    endpoint_url: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    secret_key: Optional[str] = None # Will be masked on save

class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    endpoint_url: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    secret_key: Optional[str] = None

class IntegrationResponse(BaseModel):
    id: int
    organization_id: Optional[int] = None
    name: str
    provider_type: str
    status: str
    endpoint_url: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    secret_masked: Optional[str] = None
    last_health_check: Optional[datetime] = None
    health_status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IntegrationTestResponse(BaseModel):
    integration_id: int
    provider_type: str
    status: str
    latency_ms: float
    message: str
    timestamp: datetime

# ─── Voice Profiles (Privacy-Safe) ─────────────────────────────────────────

class VoiceProfileAdminResponse(BaseModel):
    id: int
    speaker_id: str
    profile_name: str
    baseline_confidence: Optional[float] = None
    embedding_count: int = 0
    verification_status: str = "enrolled"
    consent_recorded: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Data Retention ────────────────────────────────────────────────────────

class RetentionPolicyCreate(BaseModel):
    organization_id: Optional[int] = None
    data_category: str
    retention_days: int = 90
    auto_delete_enabled: bool = False
    legal_hold: bool = False

class RetentionPolicyUpdate(BaseModel):
    retention_days: Optional[int] = None
    auto_delete_enabled: Optional[bool] = None
    legal_hold: Optional[bool] = None

class RetentionPolicyResponse(BaseModel):
    id: int
    organization_id: Optional[int] = None
    data_category: str
    retention_days: int
    auto_delete_enabled: bool
    legal_hold: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── AI Model Services ─────────────────────────────────────────────────────

class ModelServiceResponse(BaseModel):
    id: int
    service_name: str
    model_identifier: str
    model_version: str
    deployment_status: str
    device_target: str
    latency_p95_ms: float
    active: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ModelServiceRollbackRequest(BaseModel):
    target_version: str
    reason: str

# ─── System Configurations ─────────────────────────────────────────────────

class SystemConfigUpdate(BaseModel):
    config_value: Any

class SystemConfigResponse(BaseModel):
    id: int
    config_key: str
    config_value: Any
    category: str
    is_secret: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Audit Logs ────────────────────────────────────────────────────────────

class AdminAuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ─── Platform Overview KPIs ────────────────────────────────────────────────

class AdminOverviewKPIs(BaseModel):
    total_organizations: int
    active_organizations: int
    suspended_organizations: int
    total_users: int
    active_users: int
    registered_devices: int
    active_calls: int
    security_alerts: int
    open_incidents: int
    prevention_actions: int
    active_integrations: int
    system_health_status: str
    last_updated: datetime
