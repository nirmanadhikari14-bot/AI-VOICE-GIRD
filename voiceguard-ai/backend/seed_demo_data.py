import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.domain import (
    Base, Role, User, Call, CallMetadata, Speaker,
    AnalysisResult, RiskScore, Alert, Incident, IncidentNote,
    PreventionAction, VerificationLog, Policy, ThreatIndicator, AuditLog,
    Organization, Permission, RolePermission, IntegrationConfig,
    RetentionPolicy, ModelServiceConfig, SystemConfig, DeviceRegistration
)
from app.modules.admin.permissions import PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
from app.modules.admin.ai_service import ensure_default_models
from app.modules.admin.system_service import ensure_default_configs
import app.modules.multilingual.models
from app.modules.multilingual.service import ensure_multilingual_defaults
from app.modules.evaluation.service import seed_baseline_evaluation_runs

from sqlalchemy import text

def seed():
    # Migrate any existing tables missing new columns
    with engine.connect() as conn:
        for tbl in ["users", "calls", "alerts", "incidents", "prevention_actions", "voice_profiles", "device_registrations"]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN organization_id INTEGER REFERENCES organizations(id)"))
                conn.commit()
            except Exception:
                pass # column already exists
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Roles & User
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", description="Full Security Administrator")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        test_user = db.query(User).filter(User.email == "security@voiceguard.ai").first()
        if not test_user:
            test_user = User(
                name="Chief Security Officer",
                email="security@voiceguard.ai",
                password_hash=get_password_hash("VoiceGuard2026!"),
                role_id=admin_role.id,
                status="active"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print(f"Created user: {test_user.email}")
        else:
            print(f"User already exists: {test_user.email}")

        # 2. Call
        existing_call = db.query(Call).filter(Call.caller_number == "+1 (555) 847-2901").first()
        if not existing_call:
            call = Call(
                caller_number="+1 (555) 847-2901",
                receiver_number="Citibank Treasury Dept",
                status="flagged",
                call_type="inbound_telephony",
                risk_level="critical"
            )
            db.add(call)
            db.commit()
            db.refresh(call)

            # Metadata
            meta = CallMetadata(
                call_id=call.id,
                call_origin="Offshore VoIP Gateway (AS4822)",
                carrier="CloudVoice Transit",
                network_type="SIP/VoIP",
                codec="G.711u",
                ip_address="198.51.100.42",
                geo_location="Sofia, Bulgaria"
            )
            db.add(meta)

            # Speaker
            speaker = Speaker(
                call_id=call.id,
                speaker_type="suspected_impersonator",
                speaker_label="Target: CFO Alan Turing",
                verification_status="failed",
                confidence=0.92
            )
            db.add(speaker)

            # AnalysisResult
            analysis = AnalysisResult(
                call_id=call.id,
                analysis_type="synthetic_voice_detection",
                score=94.2,
                confidence=0.97,
                model_name="VoiceGuard-Conformer-v2.4",
                model_version="2.4.1-quant",
                features={
                    "vocoder_artifacts": "high",
                    "pitch_jitter": 0.082,
                    "spectral_flatness": 0.43,
                    "phase_discontinuity_rate": 0.88,
                    "biometric_distance": 2.45
                }
            )
            db.add(analysis)

            # RiskScore
            risk = RiskScore(
                call_id=call.id,
                overall_score=94.0,
                voice_score=97.0,
                speaker_score=89.0,
                caller_score=85.0,
                device_score=78.0,
                network_score=82.0,
                conversation_score=91.0,
                transaction_score=95.0,
                threat_score=96.0,
                confidence=0.95
            )
            db.add(risk)

            # Alert
            alert = Alert(
                call_id=call.id,
                alert_type="voice_clone",
                severity="critical",
                title="Synthetic Voice Detected in Active Call",
                message="AI-synthesized voice detected with 97% confidence matching threat actor DB-774. Wire transfer request detected.",
                status="active"
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)

            # Incident
            incident = Incident(
                incident_number="INC-2026-0881",
                title="Executive Impersonation Attempt on Treasury Wire Desk",
                category="voice_clone",
                severity="critical",
                priority="p1",
                status="investigating",
                assigned_to="SecOps Tier 2",
                summary="Suspected AI clone attempting fraudulent wire transfer of $250,000 to offshore account.",
                call_id=call.id
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)

            # Incident Notes
            note1 = IncidentNote(
                incident_id=incident.id,
                author="VoiceGuard AI Engine",
                content="Automatic incident triage: Biometric distance exceeded safety threshold (2.45 > 1.20). Phase discontinuity flagged vocoder artifacts."
            )
            note2 = IncidentNote(
                incident_id=incident.id,
                author="Sarah Jenkins (SecOps Analyst)",
                content="Contacted CFO via corporate mobile (secondary channel). CFO confirms he is currently boarding a flight and made no wire requests."
            )
            db.add_all([note1, note2])

            # Policy
            policy = Policy(
                name="Strict Wire Transfer Voice Verification",
                description="Block transactions >$50k if voice authenticity confidence is below 85%",
                policy_type="transaction_voice_guard",
                configuration={"min_confidence": 0.85, "max_risk": 50},
                enabled=True
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)

            # Prevention Action
            prevention = PreventionAction(
                call_id=call.id,
                action_type="isolate_session",
                policy_id=policy.id,
                status="pending_approval",
                reason="Automatic wire-block triggered due to synthetic voice detection exceeding 90% threshold.",
                provider="VoiceGuard Gatekeeper Engine",
                execution_result={"target": "CALL-0x1A3F", "recommended_action": "terminate_sip_session"}
            )
            db.add(prevention)

            # Verification Log
            verification = VerificationLog(
                call_id=call.id,
                verification_type="out_of_band_prompt",
                result="pending",
                confidence=0.0,
                performed_by="automated_policy"
            )
            db.add(verification)

            # Threat Indicators (Phase 16)
            ti1 = ThreatIndicator(
                indicator_type="phone_number",
                indicator_value="+1 (555) 847-2901",
                source="Global Voice Fraud Consortium",
                reputation="malicious",
                severity="critical",
                metadata_json={"threat_actor": "DB-774", "campaign": "CEO Fraud 2026", "observed_spoofs": 14}
            )
            ti2 = ThreatIndicator(
                indicator_type="ip_address",
                indicator_value="198.51.100.42",
                source="SIP Honeypot Cluster",
                reputation="suspicious",
                severity="high",
                metadata_json={"carrier": "CloudVoice Transit", "country": "Bulgaria", "asn": "AS4822"}
            )
            ti3 = ThreatIndicator(
                indicator_type="voice_signature_hash",
                indicator_value="SHA256:8f4c2e119ab43209",
                source="VoiceGuard AI Engine",
                reputation="synthetic_clone",
                severity="critical",
                metadata_json={"vocoder": "HiFi-GAN v2", "pitch_variance": 0.04}
            )
            db.add_all([ti1, ti2, ti3])

            # Audit Logs
            audit1 = AuditLog(
                user_id=test_user.id,
                action="ANALYST_LOGIN",
                resource_type="SESSION",
                resource_id="SES-001",
                details={"client": "Windows Security Console v1.0", "mfa": "fido2_hardware"},
                ip_address="127.0.0.1"
            )
            audit2 = AuditLog(
                user_id=test_user.id,
                action="ALERT_ACKNOWLEDGED",
                resource_type="ALERT",
                resource_id=str(alert.id),
                details={"reason": "SecOps triage in progress"},
                ip_address="127.0.0.1"
            )
            audit3 = AuditLog(
                user_id=test_user.id,
                action="PREVENTION_ACTION_QUEUED",
                resource_type="PREVENTION_ACTION",
                resource_id=str(prevention.id),
                details={"policy": "Strict Wire Transfer Voice Verification", "action": "isolate_session"},
                ip_address="127.0.0.1"
            )
            db.add_all([audit1, audit2, audit3])

            db.commit()
            print("Successfully seeded demo data and security scenario.")
        else:
            print("Demo call data already present.")

        # ─── 3. Phase 24 Admin Entities Seeding ──────────────────────────────
        # Organizations
        org1 = db.query(Organization).filter(Organization.name == "VoiceGuard Global Defense").first()
        if not org1:
            org1 = Organization(
                name="VoiceGuard Global Defense",
                org_type="enterprise",
                status="active",
                contact_email="security@voiceguard.ai",
                contact_phone="+1 (800) 555-0199",
                plan_tier="government_isolated",
                settings_json={"mfa_enforced": True, "strict_biometrics": True}
            )
            db.add(org1)
            db.commit()
            db.refresh(org1)
            print(f"Created organization: {org1.name}")

        org2 = db.query(Organization).filter(Organization.name == "Citibank Treasury & Wealth").first()
        if not org2:
            org2 = Organization(
                name="Citibank Treasury & Wealth",
                org_type="financial",
                status="active",
                contact_email="treasury-security@citibank.com",
                contact_phone="+1 (212) 555-8900",
                plan_tier="enterprise_advanced",
                settings_json={"mfa_enforced": True, "risk_threshold": 0.75}
            )
            db.add(org2)
            db.commit()
            db.refresh(org2)
            print(f"Created organization: {org2.name}")

        org3 = db.query(Organization).filter(Organization.name == "Apex Healthcare Systems").first()
        if not org3:
            org3 = Organization(
                name="Apex Healthcare Systems",
                org_type="healthcare",
                status="active",
                contact_email="ciso@apexhealth.org",
                contact_phone="+1 (617) 555-4321",
                plan_tier="enterprise_advanced",
                settings_json={"mfa_enforced": True, "hipaa_audit_mode": True}
            )
            db.add(org3)
            db.commit()
            db.refresh(org3)
            print(f"Created organization: {org3.name}")

        # Update root test_user org
        if test_user and not test_user.organization_id:
            test_user.organization_id = org1.id
            org1.primary_admin_id = test_user.id
            db.commit()

        # Seed Org Admin Role & User
        org_admin_role = db.query(Role).filter(Role.name == "org_admin").first()
        if not org_admin_role:
            org_admin_role = Role(name="org_admin", description="Organization Tenant Administrator")
            db.add(org_admin_role)
            db.commit()
            db.refresh(org_admin_role)

        citi_admin = db.query(User).filter(User.email == "admin@citibank.com").first()
        if not citi_admin:
            citi_admin = User(
                name="Citibank SecOps Lead",
                email="admin@citibank.com",
                password_hash=get_password_hash("VoiceGuard2026!"),
                role_id=org_admin_role.id,
                organization_id=org2.id,
                status="active"
            )
            db.add(citi_admin)
            db.commit()
            db.refresh(citi_admin)
            org2.primary_admin_id = citi_admin.id
            db.commit()
            print(f"Created tenant admin: {citi_admin.email}")

        # Link existing demo calls, alerts, incidents, prevention actions to org2
        db.query(Call).filter(Call.organization_id.is_(None)).update({"organization_id": org2.id})
        db.query(Alert).filter(Alert.organization_id.is_(None)).update({"organization_id": org2.id})
        db.query(Incident).filter(Incident.organization_id.is_(None)).update({"organization_id": org2.id})
        db.query(PreventionAction).filter(PreventionAction.organization_id.is_(None)).update({"organization_id": org2.id})
        db.commit()

        # Permissions Catalog
        for perm_key, perm_code in PERMISSIONS.items():
            existing_perm = db.query(Permission).filter(Permission.code == perm_code).first()
            if not existing_perm:
                category = perm_code.split(".")[0]
                p = Permission(
                    code=perm_code,
                    name=perm_key.replace("_", " ").title(),
                    category=category,
                    description=f"Allows {perm_code} operations in administrative portal"
                )
                db.add(p)
        db.commit()

        # Map Role Permissions
        for role_name, perm_list in DEFAULT_ROLE_PERMISSIONS.items():
            r = db.query(Role).filter(Role.name == role_name).first()
            if r:
                for p_code in perm_list:
                    p = db.query(Permission).filter(Permission.code == p_code).first()
                    if p:
                        exists_rp = db.query(RolePermission).filter(
                            RolePermission.role_id == r.id,
                            RolePermission.permission_id == p.id
                        ).first()
                        if not exists_rp:
                            db.add(RolePermission(role_id=r.id, permission_id=p.id))
        db.commit()

        # Seed Integrations
        if db.query(IntegrationConfig).count() == 0:
            int1 = IntegrationConfig(
                organization_id=org1.id,
                name="Carrier SIP Trunk Gateway",
                provider_type="sip_trunk",
                endpoint_url="sip://trunk.carrier-defense.net:5061",
                config_json={"tls": True, "codecs": ["G.711u", "Opus"]},
                secret_masked="sk-live-••••••••8f2a",
                status="active",
                health_status="healthy"
            )
            int2 = IntegrationConfig(
                organization_id=org1.id,
                name="Enterprise SMS Gateway (Twilio)",
                provider_type="sms",
                endpoint_url="https://api.twilio.com/2010-04-01/Accounts",
                config_json={"sender_id": "VoiceGuard"},
                secret_masked="tw-live-••••••••91c3",
                status="active",
                health_status="healthy"
            )
            int3 = IntegrationConfig(
                organization_id=org2.id,
                name="Citibank Corporate PBX Bridge",
                provider_type="telephony",
                endpoint_url="https://pbx.citibank.internal/v2/webhooks",
                config_json={"mtls_verified": True},
                secret_masked="cb-auth-••••••••a7b4",
                status="active",
                health_status="healthy"
            )
            int4 = IntegrationConfig(
                organization_id=org1.id,
                name="FCM Mobile Push Dispatcher",
                provider_type="push",
                endpoint_url="https://fcm.googleapis.com/v1/projects/voiceguard-ai/messages:send",
                config_json={"channel": "critical_alerts"},
                secret_masked="fcm-key-••••••••331e",
                status="active",
                health_status="healthy"
            )
            db.add_all([int1, int2, int3, int4])
            db.commit()

        # Seed Retention Policies
        if db.query(RetentionPolicy).count() == 0:
            ret_audio = RetentionPolicy(
                organization_id=org1.id,
                data_category="audio_recordings",
                retention_days=30,
                auto_delete_enabled=True,
                legal_hold=False
            )
            ret_emb = RetentionPolicy(
                organization_id=org1.id,
                data_category="voice_embeddings",
                retention_days=365,
                auto_delete_enabled=False,
                legal_hold=False
            )
            ret_trans = RetentionPolicy(
                organization_id=org1.id,
                data_category="transcripts",
                retention_days=90,
                auto_delete_enabled=True,
                legal_hold=False
            )
            ret_audit = RetentionPolicy(
                organization_id=org1.id,
                data_category="audit_logs",
                retention_days=730,
                auto_delete_enabled=False,
                legal_hold=True # Immutable compliance hold
            )
            db.add_all([ret_audio, ret_emb, ret_trans, ret_audit])
            db.commit()

        # Seed Device Registration
        if db.query(DeviceRegistration).count() == 0:
            dev1 = DeviceRegistration(
                user_id=test_user.id,
                device_token="fcm_token_pixel_8_pro_soc_analyst_01",
                platform="android",
                device_name="Google Pixel 8 Pro (SOC Secure Enclave)",
                push_enabled=True
            )
            dev2 = DeviceRegistration(
                user_id=citi_admin.id,
                device_token="apns_token_iphone_15_citi_treasury_02",
                platform="ios",
                device_name="Apple iPhone 15 Pro (Citibank MDM Managed)",
                push_enabled=True
            )
            db.add_all([dev1, dev2])
            db.commit()

        # Seed AI Model Inventory & System Configs
        ensure_default_models(db)
        ensure_default_configs(db)
        ensure_multilingual_defaults(db)
        seed_baseline_evaluation_runs(db)
        print("✓ Admin Portal & Evaluation seed entities initialized successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
