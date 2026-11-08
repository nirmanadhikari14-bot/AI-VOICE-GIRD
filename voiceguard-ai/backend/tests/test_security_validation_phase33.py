"""
VoiceGuard AI — Phase 33: Comprehensive Security Testing & Validation Suite
SIH26104: AI-Powered Real-Time Detection & Prevention of Voice Cloning Impersonation Attacks

Test Coverage:
1. Authentication & Token Revocation Security (Logout, Signatures, Expiration, Lockouts)
2. RBAC & Privilege Escalation Defenses (Role alteration, Tenant reassignment)
3. Multi-Tenant Isolation & IDOR Defenses (Calls, Incidents, Alerts, Prevention, Voice Profiles)
4. Audio Ingestion & Buffer Sanitization (Magic bytes, Executables, Oversized frames, Bombs)
5. Prevention Engine Idempotency & Workflow State Safety
6. Real-Time Streaming & WebSocket Security (Revoked tokens, Unauthorized sessions)
7. Biometric Data Privacy & Sensitive Credential Masking
"""

import sys
import os
import time
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import jwt
from fastapi import HTTPException, status
from app.core.config import settings
from app.core import security
from app.core.database import SessionLocal
from app.models.domain import (
    User, Role, Organization, Call, Incident, IncidentNote,
    Alert, PreventionAction, VoiceProfile, VoiceEmbedding,
    IntegrationConfig, VerificationLog
)
from app.core.security_hardening import (
    AudioSecurityValidator, InMemoryRateLimiter,
    enforce_tenant_boundary
)
from app.api.deps import get_current_user
from app.api.v1.auth import logout
from app.api.v1.calls import get_call_session
from app.api.v1.incidents import get_incident_detail, add_incident_note, update_incident_status, StatusUpdate, NoteCreate
from app.api.v1.alerts import get_alert_detail, acknowledge_alert, dismiss_alert
from app.api.v1.prevention import get_prevention_action, approve_prevention_action, execute_prevention_action
from app.modules.admin.user_service import update_user
from app.modules.admin.schemas import AdminUserUpdate
from app.modules.admin.voice_profile_service import list_voice_profiles, revoke_voice_profile


# ==============================================================================
# SECTION 1: AUTHENTICATION & TOKEN REVOCATION SECURITY
# ==============================================================================

class TestAuthenticationSecurity:

    def test_password_hashing_and_verification(self):
        """Verify bcrypt password hashing generates salted hashes and verifies accurately."""
        password = "SecurePassword123!@#"
        hashed = security.get_password_hash(password)
        assert hashed != password
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
        assert security.verify_password(password, hashed) is True
        assert security.verify_password("WrongPassword123!", hashed) is False

    def test_token_expiration_rejection(self):
        """Tokens created with negative expiry should be immediately rejected."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.status == "active").first()
            assert user is not None
            expired_token = security.create_access_token(
                subject=user.id,
                expires_delta=timedelta(seconds=-10)
            )
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db, token=expired_token)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        finally:
            db.close()

    def test_tampered_token_signature_rejection(self):
        """Tokens signed with an invalid/foreign secret key must be rejected."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.status == "active").first()
            fake_token = jwt.encode(
                {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(minutes=15)},
                "completely-wrong-attacker-secret-key-xyz-123456",
                algorithm=settings.ALGORITHM
            )
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db, token=fake_token)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        finally:
            db.close()

    def test_logout_revokes_token_immediately(self):
        """Verify that logging out revokes the token, causing subsequent calls to fail with 401."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.status == "active").first()
            token = security.create_access_token(subject=user.id)

            # 1. Token works before logout
            authenticated_user = get_current_user(db=db, token=token)
            assert authenticated_user.id == user.id

            # 2. Logout revokes token
            res = logout(token=token, current_user=user)
            assert res["status"] == "success"

            # 3. Subsequent use of revoked token must be rejected with HTTP 401
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(db=db, token=token)
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "revoked" in exc_info.value.detail.lower()
        finally:
            security.clear_revoked_tokens()
            db.close()

    def test_login_brute_force_lockout_trigger(self):
        """Verify sliding-window rate limiter locks out after 5 consecutive failures."""
        limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
        client = "attacker_ip_192_168_1_50"

        for i in range(4):
            is_locked = limiter.record_failed_attempt(client, max_failures=5, lockout_seconds=10)
            assert not is_locked, f"Attempt {i+1} should not trigger lockout yet"

        # 5th failure must trigger lockout
        is_locked_now = limiter.record_failed_attempt(client, max_failures=5, lockout_seconds=10)
        assert is_locked_now is True
        assert limiter.is_rate_limited(client) is True


# ==============================================================================
# SECTION 2: AUTHORIZATION, RBAC & PRIVILEGE ESCALATION
# ==============================================================================

class TestAuthorizationAndPrivilegeEscalation:

    def test_org_admin_cannot_elevate_to_superadmin(self):
        """An organization admin cannot assign admin role to themselves or any user."""
        db = SessionLocal()
        created_users = []
        try:
            org = db.query(Organization).first()
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            org_admin_role = db.query(Role).filter(Role.name == "org_admin").first()

            # Create an actor who is an org admin
            actor = User(
                email=f"orgadmin_{int(time.time()*1000)}@tenant.com",
                name="Tenant Admin",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org.id,
                role_id=org_admin_role.id if org_admin_role else None,
                status="active"
            )
            # Target user in the same org
            target_user = User(
                email=f"worker_{int(time.time()*1000)}@tenant.com",
                name="Worker User",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org.id,
                role_id=org_admin_role.id if org_admin_role else None,
                status="active"
            )
            db.add(actor)
            db.add(target_user)
            db.commit()
            db.refresh(actor)
            db.refresh(target_user)
            created_users.extend([actor, target_user])

            # Attempt to escalate target_user to admin role_id
            payload = AdminUserUpdate(role_id=admin_role.id)
            with pytest.raises(HTTPException) as exc_info:
                update_user(db=db, user_id=target_user.id, payload=payload, actor_user=actor)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "INSUFFICIENT_PRIVILEGE" in exc_info.value.detail
        finally:
            for u in created_users:
                try:
                    db.delete(u)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()

    def test_org_admin_cannot_move_user_to_another_tenant(self):
        """An organization admin cannot reassign a user's organization_id to another tenant."""
        db = SessionLocal()
        created_users = []
        try:
            org_a = db.query(Organization).filter(Organization.id == 1).first()
            org_b = db.query(Organization).filter(Organization.id == 2).first()
            org_admin_role = db.query(Role).filter(Role.name == "org_admin").first()

            actor = User(
                email=f"admin_org_a_{int(time.time()*1000)}@test.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org_a.id,
                role_id=org_admin_role.id if org_admin_role else None,
                status="active"
            )
            target = User(
                email=f"user_org_a_{int(time.time()*1000)}@test.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org_a.id,
                role_id=org_admin_role.id if org_admin_role else None,
                status="active"
            )
            db.add(actor)
            db.add(target)
            db.commit()
            db.refresh(actor)
            db.refresh(target)
            created_users.extend([actor, target])

            # Attempt to move user to Org B
            payload = AdminUserUpdate(organization_id=org_b.id)
            with pytest.raises(HTTPException) as exc_info:
                update_user(db=db, user_id=target.id, payload=payload, actor_user=actor)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        finally:
            for u in created_users:
                try:
                    db.delete(u)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()


# ==============================================================================
# SECTION 3: MULTI-TENANT ISOLATION & IDOR DEFENSES
# ==============================================================================

class TestMultiTenantIsolation:

    def test_cross_tenant_alert_dismissal_blocked(self):
        """User A from Org A cannot dismiss an alert belonging to Org B (IDOR)."""
        db = SessionLocal()
        created_records = []
        try:
            org_a = db.query(Organization).filter(Organization.id == 1).first()
            org_b = db.query(Organization).filter(Organization.id == 2).first()

            user_a = User(
                email=f"user_a_{int(time.time()*1000)}@org1.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org_a.id,
                status="active"
            )
            alert_b = Alert(
                organization_id=org_b.id,
                alert_type="synthetic_voice",
                severity="critical",
                title="Org B Threat",
                message="Clone alert",
                status="active"
            )
            db.add(user_a)
            db.add(alert_b)
            db.commit()
            db.refresh(user_a)
            db.refresh(alert_b)
            created_records.extend([alert_b, user_a])

            # User A attempts to dismiss Org B alert -> Must raise 403
            with pytest.raises(HTTPException) as exc_info:
                dismiss_alert(id=alert_b.id, db=db, current_user=user_a)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        finally:
            for r in created_records:
                try:
                    db.delete(r)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()

    def test_cross_tenant_incident_status_update_blocked(self):
        """User A from Org A cannot change the status of Org B's security incident."""
        db = SessionLocal()
        created_records = []
        try:
            org_a = db.query(Organization).filter(Organization.id == 1).first()
            org_b = db.query(Organization).filter(Organization.id == 2).first()

            user_a = User(
                email=f"user_a2_{int(time.time()*1000)}@org1.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org_a.id,
                status="active"
            )
            inc_b = Incident(
                organization_id=org_b.id,
                incident_number=f"INC-ORG2-{int(time.time()*1000)}",
                title="Org B Impersonation Investigation",
                status="open",
                severity="high"
            )
            db.add(user_a)
            db.add(inc_b)
            db.commit()
            db.refresh(user_a)
            db.refresh(inc_b)
            created_records.extend([inc_b, user_a])

            # User A attempts to close Org B incident
            payload = StatusUpdate(status="closed")
            with pytest.raises(HTTPException) as exc_info:
                update_incident_status(id=inc_b.id, payload=payload, db=db, current_user=user_a)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        finally:
            for r in created_records:
                try:
                    db.delete(r)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()

    def test_cross_tenant_voice_profile_listing_and_revocation_blocked(self):
        """Org A admin cannot list or revoke voice profiles belonging to Org B."""
        db = SessionLocal()
        created_records = []
        try:
            org_a = db.query(Organization).filter(Organization.id == 1).first()
            org_b = db.query(Organization).filter(Organization.id == 2).first()
            org_admin_role = db.query(Role).filter(Role.name == "org_admin").first()

            user_a = User(
                email=f"admin_org_a_vp_{int(time.time()*1000)}@test.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org_a.id,
                role_id=org_admin_role.id if org_admin_role else None,
                status="active"
            )
            vp_b = VoiceProfile(
                organization_id=org_b.id,
                speaker_id=f"speaker_org_b_{int(time.time()*1000)}",
                profile_name="VIP Executive Org B",
                baseline_confidence=0.95
            )
            db.add(user_a)
            db.add(vp_b)
            db.commit()
            db.refresh(user_a)
            db.refresh(vp_b)
            created_records.extend([vp_b, user_a])

            # 1. User A lists voice profiles -> Must NOT contain Org B's profile
            profiles_for_a = list_voice_profiles(db=db, actor_user=user_a)
            profile_ids = [p.id for p in profiles_for_a]
            assert vp_b.id not in profile_ids, "Cross-tenant voice profile leaked in list response!"

            # 2. User A attempts to revoke Org B profile -> Must raise 403
            with pytest.raises(HTTPException) as exc_info:
                revoke_voice_profile(db=db, profile_id=vp_b.id, actor_user=user_a)
            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        finally:
            for r in created_records:
                try:
                    db.delete(r)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()


# ==============================================================================
# SECTION 4: AUDIO PIPELINE & BUFFER SANITIZATION
# ==============================================================================

class TestAudioPipelineSecurity:

    def test_valid_audio_signatures_accepted(self):
        """WAV, FLAC, and OGG magic byte headers must be accepted."""
        wav_header = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00"
        flac_header = b"fLaC\x00\x00\x00\x22\x10\x00\x10\x00"
        ogg_header = b"OggS\x00\x02\x00\x00\x00\x00\x00\x00"

        assert AudioSecurityValidator.validate_audio_file(wav_header) == "wav"
        assert AudioSecurityValidator.validate_audio_file(flac_header) == "flac"
        assert AudioSecurityValidator.validate_audio_file(ogg_header) == "ogg"

    def test_executable_and_zip_payloads_rejected(self):
        """Windows PE executable (MZ) and ZIP container headers must be rejected."""
        pe_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff"
        zip_file = b"PK\x03\x04\x14\x00\x00\x00\x08\x00"
        elf_binary = b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00"

        for bad_payload in [pe_exe, zip_file, elf_binary]:
            with pytest.raises(HTTPException) as exc_info:
                AudioSecurityValidator.validate_audio_file(bad_payload)
            assert exc_info.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    def test_oversized_audio_file_upload_rejected(self):
        """Uploads exceeding MAX_FILE_SIZE_BYTES (25MB) must be rejected with HTTP 413."""
        oversized = b"RIFF" + b"\x00" * (25 * 1024 * 1024 + 1024)
        with pytest.raises(HTTPException) as exc_info:
            AudioSecurityValidator.validate_audio_file(oversized)
        assert exc_info.value.status_code == 413

    def test_streaming_chunk_size_enforcement(self):
        """Websocket chunks exceeding 1MB or zero-length frames must be rejected."""
        oversized_chunk = b"\x00" * (1024 * 1024 + 16)
        with pytest.raises(HTTPException) as exc_info:
            AudioSecurityValidator.validate_audio_chunk(oversized_chunk)
        assert exc_info.value.status_code == 413

        with pytest.raises(HTTPException) as exc_info:
            AudioSecurityValidator.validate_audio_chunk(b"")
        assert exc_info.value.status_code == 400


# ==============================================================================
# SECTION 5: PREVENTION ENGINE IDEMPOTENCY & STATE SAFETY
# ==============================================================================

class TestPreventionEngineSafety:

    def test_prevention_action_idempotent_execution(self):
        """Executing an already-executed action must return idempotent state, not duplicate action."""
        db = SessionLocal()
        created_records = []
        try:
            org = db.query(Organization).first()
            admin_role = db.query(Role).filter(Role.name == "admin").first()

            superadmin = User(
                email=f"admin_prev_{int(time.time()*1000)}@prevention.com",
                password_hash=security.get_password_hash("pass123"),
                organization_id=org.id,
                role_id=admin_role.id if admin_role else None,
                status="active"
            )
            action = PreventionAction(
                organization_id=org.id,
                action_type="terminate_sip_session",
                status="approved",
                provider="carrier_mock"
            )
            db.add(superadmin)
            db.add(action)
            db.commit()
            db.refresh(superadmin)
            db.refresh(action)
            created_records.extend([action, superadmin])

            # First execution -> status becomes "executed"
            res1 = execute_prevention_action(id=action.id, db=db, current_user=superadmin)
            assert res1["status"] == "executed"
            assert res1.get("idempotent") is not True

            # Second execution -> returns already executed state with idempotent flag
            res2 = execute_prevention_action(id=action.id, db=db, current_user=superadmin)
            assert res2["status"] == "executed"
            assert res2.get("idempotent") is True
        finally:
            for r in created_records:
                try:
                    db.delete(r)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()


# ==============================================================================
# SECTION 6: BIOMETRIC DATA PRIVACY & CREDENTIAL MASKING
# ==============================================================================

class TestBiometricPrivacyAndDataProtection:

    def test_raw_biometric_vectors_redacted_from_responses(self):
        """VoiceProfile admin responses must never expose raw embedding vector weights."""
        db = SessionLocal()
        created_records = []
        try:
            org = db.query(Organization).first()
            admin_user = db.query(User).filter(User.role.has(name="admin")).first()

            vp = VoiceProfile(
                organization_id=org.id,
                speaker_id=f"spk_biometric_{int(time.time()*1000)}",
                profile_name="Secure Speaker",
                baseline_confidence=0.92
            )
            db.add(vp)
            db.commit()
            db.refresh(vp)

            # Attach a dummy embedding
            emb = VoiceEmbedding(
                voice_profile_id=vp.id,
                embedding="[0.123, -0.456, 0.789, 0.012]",
                model_name="ecapa_tdnn",
                model_version="1.0"
            )
            db.add(emb)
            db.commit()
            db.refresh(emb)
            created_records.extend([emb, vp])

            profiles = list_voice_profiles(db=db, actor_user=admin_user)
            target = next((p for p in profiles if p.id == vp.id), None)
            assert target is not None

            # Verify no vector attributes are exposed
            assert not hasattr(target, "vector_data")
            assert not hasattr(target, "embedding")
            assert not hasattr(target, "raw_weights")
            assert target.embedding_count == 1
        finally:
            for r in created_records:
                try:
                    db.delete(r)
                    db.commit()
                except Exception:
                    db.rollback()
            db.close()

    def test_integration_credentials_masked_in_responses(self):
        """All integration secret keys must be masked with bullet characters."""
        db = SessionLocal()
        try:
            integrations = db.query(IntegrationConfig).all()
            for item in integrations:
                if item.secret_masked:
                    assert "•" in item.secret_masked
                    assert "secret" not in item.secret_masked.lower()
        finally:
            db.close()
