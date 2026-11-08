"""
VoiceGuard AI — Phase 25 Security & Privacy Hardening Verification Suite
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi import HTTPException
from app.core.database import SessionLocal
from app.models.domain import User, Organization, Call, Incident, Alert, PreventionAction, IntegrationConfig, VoiceProfile
from app.core.security_hardening import AudioSecurityValidator, enforce_tenant_boundary, auth_rate_limiter
from app.api.v1.calls import get_call_session
from app.api.v1.incidents import get_incident_detail
from app.api.v1.alerts import get_alert_detail
from app.api.v1.prevention import execute_prevention_action

def test_tenant_isolation_boundary():
    """Verify that a user from Org A cannot access resources from Org B (IDOR defense)"""
    db = SessionLocal()
    try:
        # Create or fetch Org A and Org B
        org_a = db.query(Organization).filter(Organization.name == "Citibank Treasury & Wealth").first()
        org_b = db.query(Organization).filter(Organization.name == "Apex Healthcare Systems").first()
        assert org_a is not None and org_b is not None

        # User bound to Org A
        user_a = User(
            id=9901,
            email="analyst@citibank.com",
            name="Citi Analyst",
            organization_id=org_a.id,
            status="active"
        )

        # Call belonging to Org B
        call_b = Call(
            id=9902,
            organization_id=org_b.id,
            caller_number="+1-555-0100",
            receiver_number="+1-555-0200",
            status="flagged",
            risk_level="high"
        )
        db.add(call_b)
        db.commit()

        # Attempt to access Org B call by User A -> Must raise 403 TENANT_ISOLATION_VIOLATION
        with pytest.raises(HTTPException) as exc_info:
            get_call_session(id=call_b.id, db=db, current_user=user_a)
        assert exc_info.value.status_code == 403
        assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        print("✓ Tenant isolation on Call Session verified (HTTP 403)")

        # Incident belonging to Org B
        inc_b = Incident(
            id=9903,
            organization_id=org_b.id,
            incident_number="INC-SEC-9903",
            title="Apex Healthcare Impersonation Probe",
            status="open",
            severity="critical"
        )
        db.add(inc_b)
        db.commit()

        # Attempt to access Org B incident by User A -> Must raise 403
        with pytest.raises(HTTPException) as exc_info:
            get_incident_detail(id=inc_b.id, db=db, current_user=user_a)
        assert exc_info.value.status_code == 403
        assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        print("✓ Tenant isolation on Security Incident verified (HTTP 403)")

        # Alert belonging to Org B
        alert_b = Alert(
            id=9904,
            organization_id=org_b.id,
            alert_type="synthetic_voice",
            severity="critical",
            title="Unauthorized Voice Synthesis Probe",
            message="Foreign clone detected",
            status="active"
        )
        db.add(alert_b)
        db.commit()

        # Attempt to access Org B alert by User A -> Must raise 403
        with pytest.raises(HTTPException) as exc_info:
            get_alert_detail(id=alert_b.id, db=db, current_user=user_a)
        assert exc_info.value.status_code == 403
        assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail
        print("✓ Tenant isolation on Security Alert verified (HTTP 403)")

        # Clean up test records
        db.delete(alert_b)
        db.delete(inc_b)
        db.delete(call_b)
        db.commit()

    finally:
        db.close()


def test_privilege_escalation_prevention():
    """Verify that an ordinary unprivileged user cannot execute or trigger prevention actions"""
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        ordinary_user = User(
            id=9910,
            email="readonly@company.com",
            name="Read Only Viewer",
            organization_id=org.id,
            status="active"
        )

        action = PreventionAction(
            id=9911,
            organization_id=org.id,
            action_type="block_call",
            status="proposed",
            provider="carrier_sip"
        )
        db.add(action)
        db.commit()

        # Ordinary user attempts to execute termination action -> Must be rejected with 403
        with pytest.raises(HTTPException) as exc_info:
            execute_prevention_action(id=action.id, db=db, current_user=ordinary_user)
        assert exc_info.value.status_code == 403
        assert "INSUFFICIENT_PRIVILEGE" in exc_info.value.detail
        print("✓ Privilege escalation prevention on Prevention Action verified (HTTP 403)")

        db.delete(action)
        db.commit()
    finally:
        db.close()


def test_rate_limiting_defense():
    """Verify brute-force rate limiter trips after repeated failed attempts"""
    key = "test_ip_192.168.1.50"
    auth_rate_limiter.reset(key)

    # 4 attempts -> allowed
    for _ in range(4):
        locked = auth_rate_limiter.record_failed_attempt(key, max_failures=5, lockout_seconds=60)
        assert not locked

    # 5th attempt -> triggers lockout
    locked = auth_rate_limiter.record_failed_attempt(key, max_failures=5, lockout_seconds=60)
    assert locked
    assert auth_rate_limiter.is_rate_limited(key)
    print("✓ Brute force rate limiting defense verified (5 attempts -> lockout)")
    auth_rate_limiter.reset(key)


def test_audio_security_validation():
    """Verify audio pipeline validation against malformed, corrupt, or oversized payloads"""
    # 1. Valid WAV header (RIFF....WAVE)
    valid_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00"
    fmt = AudioSecurityValidator.validate_audio_file(valid_wav)
    assert fmt == "wav"
    print("✓ Valid WAV magic header accepted")

    # 2. Corrupt / Non-audio executable payload (MZ header)
    malicious_payload = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    with pytest.raises(HTTPException) as exc_info:
        AudioSecurityValidator.validate_audio_file(malicious_payload)
    assert exc_info.value.status_code == 415
    print("✓ Malformed/executable binary rejected (HTTP 415 Unsupported Media Type)")

    # 3. Oversized audio frame in streaming chunk (> 1MB)
    oversized_frame = b"\x00" * (1024 * 1024 + 100)
    with pytest.raises(HTTPException) as exc_info:
        AudioSecurityValidator.validate_audio_chunk(oversized_frame)
    assert exc_info.value.status_code == 413
    print("✓ Oversized streaming audio frame rejected (HTTP 413 Entity Too Large)")

    # 4. Empty chunk
    with pytest.raises(HTTPException) as exc_info:
        AudioSecurityValidator.validate_audio_chunk(b"")
    assert exc_info.value.status_code == 400
    print("✓ Empty audio chunk rejected (HTTP 400 Bad Request)")


def test_credential_masking_integrity():
    """Verify secrets are redacted in integration configurations"""
    db = SessionLocal()
    try:
        integrations = db.query(IntegrationConfig).all()
        for item in integrations:
            if item.secret_masked:
                assert "•" in item.secret_masked or item.secret_masked.startswith("••••")
                assert not item.secret_masked.startswith("raw_secret_unmasked_")
        print("✓ Secret credential masking integrity verified across all integrations")
    finally:
        db.close()


def test_biometric_privacy_controls():
    """Verify raw biometric embedding weights are not exposed through administrative interfaces"""
    db = SessionLocal()
    try:
        from app.modules.admin.voice_profile_service import list_voice_profiles
        profiles = list_voice_profiles(db)
        for p in profiles:
            # VoiceProfileAdminResponse must not contain raw vector arrays or embeddings
            assert not hasattr(p, "embedding")
            assert not hasattr(p, "vector_weights")
            assert hasattr(p, "embedding_count")
            assert hasattr(p, "baseline_confidence")
        print("✓ Biometric privacy safeguards verified (raw vectors redacted from responses)")
    finally:
        db.close()


if __name__ == "__main__":
    print("\n--- RUNNING PHASE 25 SECURITY & PRIVACY HARDENING TEST SUITE ---")
    test_tenant_isolation_boundary()
    test_privilege_escalation_prevention()
    test_rate_limiting_defense()
    test_audio_security_validation()
    test_credential_masking_integrity()
    test_biometric_privacy_controls()
    print("\nALL PHASE 25 SECURITY & PRIVACY HARDENING TESTS PASSED SUCCESSFULLY!")
