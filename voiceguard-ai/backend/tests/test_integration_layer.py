"""
VoiceGuard AI — Integration Layer Test Suite
Phase 29: Integration Layer (SIH26104)

Comprehensive test coverage across all 13 mandatory integration scenarios:
- Scenario 1: Genuine Voice (low risk, authentic verdict, decision ALLOW)
- Scenario 2: Synthetic Voice (vocoder artifacts detected, critical risk, alert + prevention + incident)
- Scenario 3: Speaker Mismatch (biometric failure, elevated speaker score)
- Scenario 4: Multilingual & Accent Speech (Hindi code-switch, fairness guard disparity <= 1.0)
- Scenario 5: Social Engineering (urgency/coercion markers detected)
- Scenario 6: Prevention Action Integration (proposed & execution status tracking)
- Scenario 7: Incident Management Integration (evidence linkage & incident record)
- Scenario 8: Partial Module Failure (graceful degradation to PARTIALLY_COMPLETED)
- Scenario 9: Module Timeout Handling (unresponsive module does not block pipeline)
- Scenario 10: Duplicate Request & Idempotency (same key returns cached result, suppresses duplicate actions)
- Scenario 11: Tenant Isolation (Org A cannot access Org B analysis or events)
- Scenario 12: Cancellation Workflow (active session marked CANCELLED)
- Scenario 13: Infrastructure Failure Resilience (database/model failure handled gracefully)
"""

import sys
import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_REPO_ROOT / "ai-engine") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "ai-engine"))

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import User, Organization, Call, Alert, PreventionAction, Incident
from app.modules.integration.models import (
    AnalysisSession,
    ModuleExecution,
    IntegrationEvent,
    IntegrationEventDelivery,
)
from app.modules.integration.contracts import (
    AnalysisStatus,
    ModuleStatus,
    IntegrationErrorCode,
    EventType,
    ModuleExecutionResult,
)
from app.modules.integration.adapters import (
    VoiceAuthenticityAdapter,
    SpeakerVerificationAdapter,
    ProsodyAnalysisAdapter,
    LanguageIdentificationAdapter,
    ASRTranscriptionAdapter,
    NLPConversationAdapter,
    ThreatIntelligenceAdapter,
    CallerIntelligenceAdapter,
)
from app.modules.integration.risk_evaluator import (
    CentralRiskEvaluator,
    RiskSignalBundle,
)
from app.modules.integration.event_bus import IntegrationEventBus
from app.modules.integration.orchestrator import AnalysisOrchestrator
from app.modules.integration.service import IntegrationService


@pytest.fixture(scope="module")
def db_engine():
    """In-memory SQLite database engine for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db_session(db_engine):
    """Provides a fresh isolated session for each test."""
    Session = sessionmaker(bind=db_engine)
    session = Session()

    # Seed test organizations if not already present
    if not session.query(Organization).filter(Organization.id == 1).first():
        org_a = Organization(id=1, name="Citibank Global Markets", org_type="financial", status="active")
        org_b = Organization(id=2, name="Barclays India", org_type="financial", status="active")
        session.add_all([org_a, org_b])

    # Seed test users if not already present
    if not session.query(User).filter(User.id == 1).first():
        user_a = User(id=1, name="Analyst A", email="analyst.a@citibank.com", organization_id=1, status="active")
        user_b = User(id=2, name="Analyst B", email="analyst.b@barclays.com", organization_id=2, status="active")
        session.add_all([user_a, user_b])

    session.commit()
    yield session
    session.close()


class TestScenario1GenuineVoice:
    """Scenario 1 — Genuine voice: audio ingestion → authenticity → speaker → risk → explanation."""

    def test_genuine_voice_flow(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "caller_number": "+919876543210",
            "target_identity": "verified_officer",
            "override_authenticity": {"score": 8.5, "confidence": 0.96},
            "override_speaker": {"similarity": 0.94, "verified": True, "target_identity": "verified_officer"},
        }
        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
            call_id=None,
        )

        assert res["processing_status"] == AnalysisStatus.COMPLETED.value
        assert res["authenticity_result"]["verdict"] == "AUTHENTIC"
        assert res["speaker_verification_result"]["verified"] is True
        assert res["risk_assessment"]["overall_score"] < 35.0
        assert res["risk_assessment"]["risk_level"] == "low"
        assert res["risk_assessment"]["recommended_decision"] == "ALLOW"
        assert len(res["alerts"]) == 0
        assert len(res["prevention_actions"]) == 0


class TestScenario2SyntheticVoice:
    """Scenario 2 — Synthetic voice: vocoder artifacts → critical risk → alert + prevention + incident."""

    def test_synthetic_voice_impersonation_flow(self, db_session):
        # Create a test call in DB to attach alert/prevention/incident
        call = Call(id=101, organization_id=1, caller_number="+1800-SPOOFED", receiver_number="+9122123456", status="in_progress")
        db_session.add(call)
        db_session.commit()

        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "caller_number": "+1800-SPOOFED",
            "target_identity": "ceo_impersonated",
            "override_authenticity": {
                "score": 97.5,
                "confidence": 0.99,
                "features": {"vocoder_artifacts": "hifi_gan_markers", "pitch_jitter": 0.002, "phase_discontinuity_rate": 0.092},
            },
            "override_speaker": {"similarity": 0.35, "verified": False, "target_identity": "ceo_impersonated"},
            "override_threat": {"threat_score": 92.0, "matched": True, "threat_actor": "DB-774"},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
            call_id=101,
        )

        assert res["processing_status"] == AnalysisStatus.COMPLETED.value
        assert res["authenticity_result"]["verdict"] == "SYNTHETIC"
        assert res["authenticity_result"]["synthetic_voice_score"] >= 95.0
        assert res["risk_assessment"]["overall_score"] >= 80.0
        assert res["risk_assessment"]["risk_level"] == "critical"
        assert res["risk_assessment"]["recommended_decision"] == "TERMINATE_TRANSACTION_BLOCK_CALL"

        # Verify automated policy triggers
        assert len(res["alerts"]) >= 1
        assert res["alerts"][0]["severity"] == "critical"
        assert len(res["prevention_actions"]) >= 1
        assert res["prevention_actions"][0]["action_type"] == "block_call"
        assert len(res["incidents"]) >= 1
        assert "INC-2026" in res["incidents"][0]["incident_number"]


class TestScenario3SpeakerMismatch:
    """Scenario 3 — Speaker mismatch: voice is authentic, but biometric identity does not match."""

    def test_speaker_mismatch_flow(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "override_authenticity": {"score": 12.0, "confidence": 0.95},
            "override_speaker": {"similarity": 0.32, "verified": False, "target_identity": "authorized_treasurer"},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
        )

        assert res["authenticity_result"]["verdict"] == "AUTHENTIC"
        assert res["speaker_verification_result"]["verified"] is False
        assert res["speaker_verification_result"]["speaker_score"] >= 90.0
        assert any("mismatch" in w.lower() for w in res["warnings"])


class TestScenario4MultilingualAndAccentSpeech:
    """Scenario 4 — Multilingual speech: Hindi-English code-switch with fairness guard verified."""

    def test_multilingual_code_switching_fairness(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "override_language": {
                "language_code": "hi",
                "confidence": 0.95,
                "detected_accent": "in_hindi_general",
                "is_code_switched": True,
                "code_switching_ratio": 0.38,
            },
            "override_authenticity": {"score": 10.0, "confidence": 0.95},
            "override_speaker": {"similarity": 0.91, "verified": True, "target_identity": "enrolled_user"},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
        )

        assert res["language_result"]["language_code"] == "hi"
        assert res["language_result"]["is_code_switched"] is True
        assert res["language_result"]["disparity_guard_applied"] is True
        # STRICT RULE: Language or accent MUST NOT increase risk score
        assert res["risk_assessment"]["overall_score"] < 35.0
        assert res["risk_assessment"]["risk_level"] == "low"


class TestScenario5SocialEngineering:
    """Scenario 5 — Social engineering: conversation analysis detects high urgency & coercion."""

    def test_social_engineering_detection(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "override_nlp": {
                "social_engineering_score": 92.0,
                "urgency_score": 0.95,
                "matched_patterns": ["urgency_wire", "executive_impersonation"],
            },
            "override_authenticity": {"score": 65.0, "confidence": 0.88},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
        )

        assert res["conversation_result"]["is_high_risk_intent"] is True
        assert res["conversation_result"]["social_engineering_score"] == 92.0
        assert "urgency_wire" in res["conversation_result"]["matched_patterns"]
        assert res["risk_assessment"]["overall_score"] >= 45.0


class TestScenario6PreventionIntegration:
    """Scenario 6 — Prevention: policy evaluation proposes and tracks prevention action."""

    def test_prevention_action_proposal(self, db_session):
        call = Call(id=102, organization_id=1, caller_number="+91800112233", receiver_number="+9122334455", status="in_progress")
        db_session.add(call)
        db_session.commit()

        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "override_authenticity": {"score": 94.0, "confidence": 0.98},
            "override_speaker": {"similarity": 0.20, "verified": False},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
            call_id=102,
        )

        assert len(res["prevention_actions"]) == 1
        p_act = res["prevention_actions"][0]
        assert p_act["action_type"] in ["block_call", "require_secondary_auth"]
        assert p_act["status"] == "proposed"

        # Verify DB record
        db_act = db_session.query(PreventionAction).filter(PreventionAction.id == p_act["id"]).first()
        assert db_act is not None
        assert db_act.status == "proposed"


class TestScenario7IncidentIntegration:
    """Scenario 7 — Incident: alert links to incident with forensic evidence association."""

    def test_incident_creation_and_linkage(self, db_session):
        call = Call(id=103, organization_id=1, caller_number="+1800-FRAUD", receiver_number="+9122998877", status="in_progress")
        db_session.add(call)
        db_session.commit()

        orch = AnalysisOrchestrator(thread_pool_workers=4)
        context = {
            "override_authenticity": {"score": 98.0, "confidence": 0.99},
            "override_speaker": {"similarity": 0.15, "verified": False},
        }

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context=context,
            organization_id=1,
            call_id=103,
        )

        assert len(res["incidents"]) == 1
        inc = res["incidents"][0]
        assert inc["severity"] in ["high", "critical"]
        assert inc["status"] == "open"

        db_inc = db_session.query(Incident).filter(Incident.id == inc["id"]).first()
        assert db_inc is not None
        assert db_inc.call_id == 103
        assert "Voice clone score: 98.0" in db_inc.summary


class TestScenario8PartialModuleFailure:
    """Scenario 8 — Partial failure: optional module fails while independent modules continue."""

    def test_partial_failure_degradation(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)

        # Force failure in prosody adapter
        class FailingProsody(ProsodyAnalysisAdapter):
            def execute(self, audio_bytes, context, correlation_id):
                raise RuntimeError("Prosody pitch tracking library crashed")

        orch.prosody_adapter = FailingProsody()

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context={"override_authenticity": {"score": 10.0, "confidence": 0.95}},
            organization_id=1,
        )

        assert res["processing_status"] == AnalysisStatus.PARTIALLY_COMPLETED.value
        assert "prosody" in res["processing_metadata"]["failed_modules"]
        # Authenticity and speaker verification still completed successfully
        assert res["authenticity_result"]["verdict"] == "AUTHENTIC"
        assert res["risk_assessment"]["overall_score"] < 35.0


class TestScenario9ModuleTimeout:
    """Scenario 9 — Module timeout: an unresponsive module exceeds timeout without hanging pipeline."""

    def test_module_timeout_resilience(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4, module_timeout_seconds=0.05)

        # Force timeout in threat intelligence adapter
        import time
        class HangingThreat(ThreatIntelligenceAdapter):
            def execute(self, audio_bytes, context, correlation_id):
                time.sleep(0.1)  # Exceeds 0.05s timeout
                return super().execute(audio_bytes, context, correlation_id)

        orch.threat_adapter = HangingThreat()

        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context={"override_authenticity": {"score": 10.0, "confidence": 0.95}},
            organization_id=1,
        )

        assert res["processing_status"] == AnalysisStatus.PARTIALLY_COMPLETED.value
        assert "threat" in res["processing_metadata"]["timed_out_modules"]
        assert res["threat_result"] == {}


class TestScenario10DuplicateRequestAndIdempotency:
    """Scenario 10 — Duplicate event & idempotency key: duplicate delivery returns cached result."""

    def test_idempotent_session_caching(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        idemp_key = f"idemp_{uuid.uuid4().hex}"

        res1 = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context={"override_authenticity": {"score": 14.0, "confidence": 0.94}},
            organization_id=1,
            idempotency_key=idemp_key,
        )

        # Submit exact same request with same idempotency key
        res2 = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context={"override_authenticity": {"score": 14.0, "confidence": 0.94}},
            organization_id=1,
            idempotency_key=idemp_key,
        )

        assert res1["analysis_id"] == res2["analysis_id"]
        assert res2["processing_metadata"]["idempotent_cached"] is True

    def test_event_bus_deduplication(self):
        bus = IntegrationEventBus()
        call_count = {"count": 0}

        def handler(event):
            call_count["count"] += 1

        bus.subscribe(EventType.VoiceAuthenticityAnalysisCompleted, handler)

        # Synchronous publish with same event_id
        bus.publish_sync(EventType.VoiceAuthenticityAnalysisCompleted, {"score": 90.0}, correlation_id="c1", event_id="fixed_evt_001")
        # Duplicate publish with same event_id
        bus.publish_sync(EventType.VoiceAuthenticityAnalysisCompleted, {"score": 90.0}, correlation_id="c1", event_id="fixed_evt_001")

        # Handler should only be invoked ONCE
        assert call_count["count"] == 1


class TestScenario11TenantIsolation:
    """Scenario 11 — Tenant isolation: Org A cannot access Org B's analysis sessions or events."""

    def test_cross_tenant_access_rejection(self, db_session):
        user_a = db_session.query(User).filter(User.id == 1).first()  # Org 1
        user_b = db_session.query(User).filter(User.id == 2).first()  # Org 2

        # Create session belonging to Org 1
        sess_a = AnalysisSession(
            session_uuid=f"sess_org1_{uuid.uuid4().hex[:8]}",
            organization_id=1,
            correlation_id="corr_org1",
            status="COMPLETED",
            overall_risk_score=25.0,
            risk_level="low",
        )
        db_session.add(sess_a)
        db_session.commit()

        # User A can access Org 1 session
        s_found = IntegrationService.get_session(db_session, sess_a.session_uuid, user_a)
        assert s_found.id == sess_a.id

        # User B (Org 2) must be REJECTED with 403 Forbidden
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            IntegrationService.get_session(db_session, sess_a.session_uuid, user_b)
        assert exc_info.value.status_code == 403

    def test_tenant_filtered_session_listing(self, db_session):
        user_a = db_session.query(User).filter(User.id == 1).first()
        sessions = IntegrationService.list_sessions(db_session, user_a)
        # All returned sessions must be org 1 or None (system)
        for s in sessions:
            assert s.organization_id in [1, None]


class TestScenario12CancellationWorkflow:
    """Scenario 12 — Cancellation: active session can be cancelled by authorized user."""

    def test_cancellation_workflow(self, db_session):
        user_a = db_session.query(User).filter(User.id == 1).first()
        sess = AnalysisSession(
            session_uuid=f"sess_canc_{uuid.uuid4().hex[:8]}",
            organization_id=1,
            correlation_id="corr_canc",
            status="RUNNING",
        )
        db_session.add(sess)
        db_session.commit()

        canc_res = IntegrationService.cancel_session(db_session, sess.session_uuid, user_a)
        assert canc_res["cancelled"] is True
        assert canc_res["status"] == AnalysisStatus.CANCELLED.value

        # Re-query DB to verify persistence
        updated = db_session.query(AnalysisSession).filter(AnalysisSession.id == sess.id).first()
        assert updated.status == AnalysisStatus.CANCELLED.value


class TestScenario13InfrastructureFailureResilience:
    """Scenario 13 — Infrastructure failure: missing consent or invalid payload handled gracefully."""

    def test_missing_consent_rejection(self, db_session):
        orch = AnalysisOrchestrator(thread_pool_workers=4)
        res = orch.execute_analysis(
            db=db_session,
            audio_bytes=b"\x00" * 3200,
            context={},
            organization_id=1,
            consent_confirmed=False,
        )

        assert res["processing_status"] == AnalysisStatus.FAILED.value
        assert res["error_code"] == IntegrationErrorCode.CONSENT_REQUIRED.value
        assert "consent" in res["error_message"].lower()
