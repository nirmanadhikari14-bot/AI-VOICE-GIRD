from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import (
    Organization, User, DeviceRegistration, Call, Alert, Incident,
    PreventionAction, IntegrationConfig, SystemConfig
)
from app.modules.admin.schemas import AdminOverviewKPIs, SystemConfigResponse, SystemConfigUpdate
from app.modules.admin.audit_service import log_admin_action

DEFAULT_CONFIGS = [
    {
        "config_key": "auth.session_timeout_minutes",
        "config_value": 30,
        "category": "auth",
        "is_secret": False
    },
    {
        "config_key": "security.mfa_enforced",
        "config_value": True,
        "category": "security",
        "is_secret": False
    },
    {
        "config_key": "security.risk_critical_threshold",
        "config_value": 0.80,
        "category": "security",
        "is_secret": False
    },
    {
        "config_key": "monitoring.health_probe_interval_seconds",
        "config_value": 15,
        "category": "monitoring",
        "is_secret": False
    },
    {
        "config_key": "platform.name",
        "config_value": "VoiceGuard AI Enterprise Defense",
        "category": "general",
        "is_secret": False
    }
]

def ensure_default_configs(db: Session):
    for c in DEFAULT_CONFIGS:
        existing = db.query(SystemConfig).filter(SystemConfig.config_key == c["config_key"]).first()
        if not existing:
            cfg = SystemConfig(**c)
            db.add(cfg)
    db.commit()

def get_admin_overview_kpis(
    db: Session,
    actor_user: User,
    organization_id: Optional[int] = None
) -> AdminOverviewKPIs:
    # Role check: platform admins see all orgs unless explicitly filtered
    role_name = actor_user.role.name.lower() if actor_user.role else "user"
    if actor_user.organization_id is not None and role_name not in ("superadmin", "admin"):
        organization_id = actor_user.organization_id

    total_orgs = db.query(Organization).count()
    active_orgs = db.query(Organization).filter(Organization.status == "active").count()
    suspended_orgs = db.query(Organization).filter(Organization.status == "suspended").count()

    users_query = db.query(User)
    if organization_id is not None:
        users_query = users_query.filter(User.organization_id == organization_id)
    total_users = users_query.count()
    active_users = users_query.filter(User.status == "active").count()

    dev_query = db.query(DeviceRegistration)
    if organization_id is not None:
        dev_query = dev_query.join(User, User.id == DeviceRegistration.user_id).filter(User.organization_id == organization_id)
    registered_devices = dev_query.count()

    active_calls = db.query(Call).filter(Call.status.in_(["in_progress", "flagged"])).count()
    alerts_count = db.query(Alert).filter(Alert.status == "active").count()
    incidents_count = db.query(Incident).filter(Incident.status.in_(["open", "investigating"])).count()
    prevention_count = db.query(PreventionAction).count()

    integ_query = db.query(IntegrationConfig)
    if organization_id is not None:
        integ_query = integ_query.filter(IntegrationConfig.organization_id == organization_id)
    active_integrations = integ_query.filter(IntegrationConfig.status == "active").count()

    return AdminOverviewKPIs(
        total_organizations=total_orgs,
        active_organizations=active_orgs,
        suspended_organizations=suspended_orgs,
        total_users=total_users,
        active_users=active_users,
        registered_devices=registered_devices,
        active_calls=active_calls,
        security_alerts=alerts_count,
        open_incidents=incidents_count,
        prevention_actions=prevention_count,
        active_integrations=active_integrations,
        system_health_status="HEALTHY",
        last_updated=datetime.now(timezone.utc)
    )

def list_system_configs(db: Session) -> List[SystemConfigResponse]:
    ensure_default_configs(db)
    configs = db.query(SystemConfig).all()
    return [SystemConfigResponse.model_validate(c) for c in configs]

def update_system_config(
    db: Session,
    config_key: str,
    payload: SystemConfigUpdate,
    actor_user: User
) -> SystemConfigResponse:
    cfg = db.query(SystemConfig).filter(SystemConfig.config_key == config_key).first()
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Configuration key '{config_key}' not found")
        
    cfg.config_value = payload.config_value
    db.commit()
    db.refresh(cfg)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="system_config.update",
        resource_type="system_config",
        resource_id=config_key,
        details={"key": config_key, "value": payload.config_value}
    )
    return SystemConfigResponse.model_validate(cfg)
