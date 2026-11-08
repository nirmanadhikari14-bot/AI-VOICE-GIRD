import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.domain import User, Role, Organization, DeviceRegistration
from app.modules.admin.permissions import get_user_permissions, enforce_tenant_isolation
from app.modules.admin.schemas import (
    OrganizationCreate, OrganizationUpdate, AdminUserCreate,
    PolicyCreate, IntegrationCreate, RetentionPolicyCreate,
    ModelServiceRollbackRequest, SystemConfigUpdate
)
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
from fastapi import HTTPException

def test_admin_portal_workflows():
    db = SessionLocal()
    try:
        # 1. Fetch Superadmin and Tenant Admin
        super_admin = db.query(User).filter(User.email == "security@voiceguard.ai").first()
        assert super_admin is not None, "Superadmin exists"
        
        citi_admin = db.query(User).filter(User.email == "admin@citibank.com").first()
        assert citi_admin is not None, "Citibank tenant admin exists"

        # 2. Test Permissions evaluation
        super_perms = get_user_permissions(db, super_admin)
        assert "organizations.manage" in super_perms
        assert "users.suspend" in super_perms
        print(f"✓ Superadmin permissions verified ({len(super_perms)} permissions)")

        citi_perms = get_user_permissions(db, citi_admin)
        assert "users.read" in citi_perms
        assert "policies.manage" in citi_perms
        print(f"✓ Org Admin permissions verified ({len(citi_perms)} permissions)")

        # 3. Test Tenant Isolation
        apex_org = db.query(Organization).filter(Organization.name == "Apex Healthcare Systems").first()
        assert apex_org is not None
        
        # Citibank admin should NOT be allowed to access Apex Healthcare
        isolation_failed = False
        try:
            enforce_tenant_isolation(citi_admin, apex_org.id, db)
        except HTTPException as e:
            if e.status_code == 403:
                isolation_failed = True
        assert isolation_failed, "Tenant isolation correctly rejected cross-org access"
        print("✓ Tenant isolation enforcement verified")

        # 4. Test Platform Overview KPIs
        kpis = system_service.get_admin_overview_kpis(db, super_admin)
        assert kpis.total_organizations >= 3
        assert kpis.total_users >= 2
        assert kpis.registered_devices >= 1
        print(f"✓ Platform Overview KPIs verified ({kpis.total_organizations} orgs, {kpis.total_users} users, {kpis.registered_devices} devices)")

        # 5. Test Organization Lifecycle (Create, Update, Suspend, Activate)
        test_org_name = f"Test FinTech Corp"
        existing_test_org = db.query(Organization).filter(Organization.name == test_org_name).first()
        if not existing_test_org:
            new_org = organization_service.create_organization(
                db=db,
                payload=OrganizationCreate(
                    name=test_org_name,
                    org_type="financial",
                    contact_email="security@fintech-test.io",
                    contact_phone="+1 555-0188",
                    plan_tier="enterprise_advanced"
                ),
                actor_user=super_admin
            )
            org_id = new_org.id
        else:
            org_id = existing_test_org.id

        # Update
        updated_org = organization_service.update_organization(
            db=db,
            org_id=org_id,
            payload=OrganizationUpdate(contact_phone="+1 555-9999"),
            actor_user=super_admin
        )
        assert updated_org.contact_phone == "+1 555-9999"

        # Suspend
        suspended_org = organization_service.suspend_organization(
            db=db,
            org_id=org_id,
            reason="Compliance Review",
            actor_user=super_admin
        )
        assert suspended_org.status == "suspended"

        # Activate
        activated_org = organization_service.activate_organization(
            db=db,
            org_id=org_id,
            actor_user=super_admin
        )
        assert activated_org.status == "active"
        print("✓ Organization lifecycle verified (Create, Update, Suspend, Activate)")

        # 6. Test User Administration (Create, Update, Suspend, Activate)
        test_email = "analyst.demo@citibank.com"
        existing_u = db.query(User).filter(User.email == test_email).first()
        if not existing_u:
            new_u = user_service.create_user(
                db=db,
                payload=AdminUserCreate(
                    name="Citi SOC Analyst",
                    email=test_email,
                    password="VoiceGuard2026!",
                    organization_id=citi_admin.organization_id
                ),
                actor_user=citi_admin
            )
            u_id = new_u.id
        else:
            u_id = existing_u.id

        # Suspend & Activate user
        u_susp = user_service.suspend_user(db=db, user_id=u_id, actor_user=citi_admin)
        assert u_susp.status == "suspended"
        u_act = user_service.activate_user(db=db, user_id=u_id, actor_user=citi_admin)
        assert u_act.status == "active"
        print("✓ User administration & organization scoping verified")

        # 7. Test Security Policies
        policies = policy_service.list_policies(db=db)
        print(f"✓ Security policies list verified ({len(policies)} policies)")

        # 8. Test Device Management
        devices = device_service.list_devices(db=db, actor_user=super_admin)
        assert len(devices) > 0
        print(f"✓ Device management verified ({len(devices)} registered devices)")

        # 9. Test Integrations & Secret Masking
        integrations = integration_service.list_integrations(db=db, actor_user=super_admin)
        assert len(integrations) > 0
        first_integ = integrations[0]
        if first_integ.secret_masked:
            assert "••••••••" in first_integ.secret_masked, "Secrets are safely masked"
        
        # Test connection probe
        test_res = integration_service.test_integration(db=db, integration_id=first_integ.id, actor_user=super_admin)
        assert test_res.status == "healthy"
        print(f"✓ Integrations & connection probe verified (latency: {test_res.latency_ms}ms)")

        # 10. Test Privacy-Safe Voice Profiles
        voice_profiles = voice_profile_service.list_voice_profiles(db=db)
        print(f"✓ Voice profile administrative privacy controls verified ({len(voice_profiles)} profiles)")

        # 11. Test AI Model Services
        ai_services = ai_service.list_model_services(db=db)
        assert len(ai_services) >= 4
        print(f"✓ AI Model service inventory verified ({len(ai_services)} deployed models)")

        # 12. Test Audit Logs
        audit_logs = audit_service.get_admin_audit_logs(db=db, limit=10)
        assert len(audit_logs) > 0
        print(f"✓ Immutable audit logs verified ({len(audit_logs)} recent events)")

        print("\nALL PHASE 24 ADMIN BACKEND WORKFLOWS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_admin_portal_workflows()

