from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import Organization, User, DeviceRegistration
from app.modules.admin.schemas import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from app.modules.admin.audit_service import log_admin_action

def to_org_response(org: Organization, db: Session) -> OrganizationResponse:
    users_count = db.query(User).filter(User.organization_id == org.id, User.status == "active").count()
    devices_count = (
        db.query(DeviceRegistration)
        .join(User, User.id == DeviceRegistration.user_id)
        .filter(User.organization_id == org.id)
        .count()
    )
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        org_type=org.org_type,
        status=org.status,
        contact_email=org.contact_email,
        contact_phone=org.contact_phone,
        primary_admin_id=org.primary_admin_id,
        plan_tier=org.plan_tier,
        settings_json=org.settings_json,
        created_at=org.created_at,
        updated_at=org.updated_at,
        active_users_count=users_count,
        active_devices_count=devices_count,
    )

def list_organizations(
    db: Session,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[OrganizationResponse]:
    query = db.query(Organization)
    if status_filter:
        query = query.filter(Organization.status == status_filter)
    if search:
        query = query.filter(Organization.name.ilike(f"%{search}%"))
        
    orgs = query.offset(offset).limit(limit).all()
    return [to_org_response(o, db) for o in orgs]

def get_organization_by_id(db: Session, org_id: int) -> OrganizationResponse:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization {org_id} not found")
    return to_org_response(org, db)

def create_organization(db: Session, payload: OrganizationCreate, actor_user: User) -> OrganizationResponse:
    existing = db.query(Organization).filter(Organization.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization with name '{payload.name}' already exists"
        )
        
    org = Organization(
        name=payload.name,
        org_type=payload.org_type,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        plan_tier=payload.plan_tier,
        settings_json=payload.settings_json or {},
        status="active"
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="organization.create",
        resource_type="organization",
        resource_id=str(org.id),
        details={"name": org.name, "plan_tier": org.plan_tier}
    )
    return to_org_response(org, db)

def update_organization(db: Session, org_id: int, payload: OrganizationUpdate, actor_user: User) -> OrganizationResponse:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization {org_id} not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(org, field, val)
        
    db.commit()
    db.refresh(org)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="organization.update",
        resource_type="organization",
        resource_id=str(org.id),
        details=update_data
    )
    return to_org_response(org, db)

def suspend_organization(db: Session, org_id: int, reason: Optional[str], actor_user: User) -> OrganizationResponse:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization {org_id} not found")
        
    org.status = "suspended"
    db.commit()
    db.refresh(org)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="organization.suspend",
        resource_type="organization",
        resource_id=str(org.id),
        details={"reason": reason or "Administrative hold"}
    )
    return to_org_response(org, db)

def activate_organization(db: Session, org_id: int, actor_user: User) -> OrganizationResponse:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization {org_id} not found")
        
    org.status = "active"
    db.commit()
    db.refresh(org)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="organization.activate",
        resource_type="organization",
        resource_id=str(org.id),
        details={"status": "active"}
    )
    return to_org_response(org, db)

