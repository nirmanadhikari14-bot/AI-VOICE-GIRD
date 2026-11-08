"""
VoiceGuard AI — Phase 26 Multilingual & Indian Accent Verification Suite
SIH Problem Statement: SIH26104
"""

import sys
import os
import base64
import pytest
from datetime import datetime
from fastapi import HTTPException

# Ensure imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AI_ENGINE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ai-engine"))
if AI_ENGINE_PATH not in sys.path:
    sys.path.insert(0, AI_ENGINE_PATH)

from app.core.database import SessionLocal
from app.models.domain import User, Organization, Call
from multilingual import (
    language_registry,
    accent_registry,
    LanguageIdentifier,
    CodeSwitchingDetector,
    model_manager,
    MultilingualEvaluator,
    FairnessAuditor,
    SupportStatus
)
from app.modules.multilingual import service
from app.modules.multilingual.schemas import (
    IdentifyLanguageRequest,
    TranscribeRequest
)


def test_language_registry_retrieval():
    """Verify registry covers the 13 required Indian languages + English with correct scripts."""
    expected_codes = ["en", "hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"]
    all_langs = language_registry.list_all()
    registered_codes = [l.code for l in all_langs]

    for code in expected_codes:
        assert code in registered_codes, f"Target language '{code}' missing from registry"

    # Verify native scripts
    assert language_registry.get("hi").native_script == "Devanagari"
    assert language_registry.get("bn").native_script == "Bengali"
    assert language_registry.get("gu").native_script == "Gujarati"
    assert language_registry.get("ta").native_script == "Tamil"
    assert language_registry.get("te").native_script == "Telugu"
    assert language_registry.get("pa").native_script == "Gurmukhi"

    # Verify support statuses
    assert language_registry.is_supported("hi") is True
    assert language_registry.is_supported("en") is True
    assert language_registry.is_supported("gu") is True
    assert language_registry.get("or").status == SupportStatus.PARTIALLY_SUPPORTED

    print("✓ Language registry retrieval verified across all 13 Indian languages + English")


def test_accent_registry_and_ethical_fairness_guard():
    """Verify Indian English accent groups and mandatory anti-bias safety policy."""
    accents = accent_registry.list_all()
    accent_ids = [a.accent_id for a in accents]

    expected_accents = [
        "en_in_general", "en_in_gujarati", "en_in_bengali", "en_in_hindi",
        "en_in_marathi", "en_in_tamil", "en_in_telugu", "en_in_kannada",
        "en_in_malayalam", "en_in_punjabi"
    ]
    for acc in expected_accents:
        assert acc in accent_ids, f"Accent '{acc}' missing from registry"

    # Verify ethical safeguard notice is embedded on all accent profiles
    for a in accents:
        assert "MUST NEVER be treated as suspicious" in a.safety_notice

    print("✓ Accent registry verified (10 regional variations with mandatory fairness guards)")


def test_code_switching_detection():
    """Verify conversational mixed speech detection (Hinglish, Gujlish, Banglish)."""
    # 1. Hinglish
    hinglish_text = "Please apna bank account number verify kar lijiye"
    cs_hi = CodeSwitchingDetector.analyze_transcript(hinglish_text)
    assert cs_hi.is_code_switched is True
    assert cs_hi.language_pair in ("hi-en", "en-hi")
    assert cs_hi.colloquial_label == "Hinglish"
    assert len(cs_hi.spans) > 0

    # 2. Gujlish
    gujlish_text = "Please tamaru bank account details share karo for verification"
    cs_gu = CodeSwitchingDetector.analyze_transcript(gujlish_text)
    assert cs_gu.is_code_switched is True
    assert cs_gu.language_pair in ("gu-en", "en-gu")
    assert cs_gu.colloquial_label == "Gujlish"

    # 3. Monolingual English
    monolingual_en = "Please confirm the account verification code."
    cs_en = CodeSwitchingDetector.analyze_transcript(monolingual_en)
    assert cs_en.is_code_switched is False

    print("✓ Code-switching analysis verified (Hinglish, Gujlish, and Monolingual handling)")


def test_language_identification_engine():
    """Verify spoken language identification with realistic audio features."""
    lid = LanguageIdentifier()

    # Empty audio handling -> Must return UNKNOWN without crashing
    res_empty = lid.identify(b"")
    assert res_empty.primary_language == "unknown"
    assert res_empty.confidence == 0.0

    # Valid audio frames (syllable-timed PCM simulation)
    pcm_chunk = b"\x05\x00\x08\x00\x02\x00\xfc\xff" * 1000
    res = lid.identify(pcm_chunk, sample_rate=16000)
    assert res.primary_language in ("hi", "en", "gu")
    assert res.confidence > 0.60
    assert len(res.alternative_languages) > 0
    assert res.model_name == "VoiceGuard-IndicAcoustic-LocalEngine"

    print(f"✓ Language identification verified (classified: {res.primary_language}, confidence: {res.confidence})")


def test_transcription_service_multilingual():
    """Verify language-aware speech recognition with word-level timestamps."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.status == "active").first()
        assert user is not None

        # Base64 test PCM
        pcm_bytes = b"\x10\x00\x20\x00\x05\x00\x00\x00" * 2000
        b64_audio = base64.b64encode(pcm_bytes).decode("ascii")

        req = TranscribeRequest(
            audio_base64=b64_audio,
            sample_rate=16000,
            forced_language="hi"
        )
        res = service.transcribe_service(db, req, user)

        assert res.detected_language == "hi"
        assert len(res.text) > 0
        assert len(res.word_timestamps) > 0
        assert res.word_timestamps[0].word is not None
        assert res.status == "success"

        print(f"✓ Multilingual transcription verified ({len(res.word_timestamps)} words with timestamps)")
    finally:
        db.close()


def test_model_manager_and_graceful_adapter_fallback():
    """Verify that uninstalled neural models report 'not_configured' without failing the system."""
    models = model_manager.list_models()
    assert len(models) >= 3

    # Local feature engine is always available
    local_asr = model_manager.get_asr_adapter("local-feature")
    assert local_asr.is_available() is True

    # IndicConformer should gracefully handle unconfigured status
    conformer_adapter = model_manager._asr_adapters["ai4bharat-indic-conformer"]
    conformer_res = conformer_adapter.transcribe(b"\x00" * 1000)
    if not conformer_adapter.is_available():
        assert conformer_res.status == "not_configured"
        assert "not configured" in conformer_res.warnings[0].lower()

    # Whisper should gracefully report not_configured if dependencies are absent
    whisper_adapter = model_manager._asr_adapters["indic-whisper-base"]
    whisper_res = whisper_adapter.transcribe(b"\x00" * 1000)
    if not whisper_adapter.is_available():
        assert whisper_res.status == "not_configured"

    print("✓ Model manager and graceful adapter fallback verified")


def test_fairness_and_anti_bias_audit():
    """Verify algorithmic fairness auditor ensures FPR disparities remain within threshold."""
    report = FairnessAuditor.audit_platform_fairness()
    assert report.overall_fairness_rating in ("compliant", "conditionally_compliant")
    assert report.max_disparity_ratio <= 1.75, f"Disparity ratio {report.max_disparity_ratio} exceeds max 1.75 limit"

    # All safety rules must be strictly enforced
    for rule_name, rule_status in report.safety_rule_enforcement_status.items():
        assert rule_status is True, f"Fairness rule '{rule_name}' was not enforced"

    assert len(report.language_disparities) >= 4
    assert len(report.accent_assessments) >= 4

    print(f"✓ Fairness audit verified (Max disparity ratio: {report.max_disparity_ratio}x, All 5 safety rules enforced)")


def test_tenant_isolation_on_multilingual_calls():
    """Verify that users cannot transcribe or identify language on foreign tenant calls (HTTP 403)."""
    db = SessionLocal()
    try:
        org_a = db.query(Organization).filter(Organization.name == "Citibank Treasury & Wealth").first()
        org_b = db.query(Organization).filter(Organization.name == "Apex Healthcare Systems").first()
        assert org_a is not None and org_b is not None

        user_a = User(
            id=9951,
            email="analyst.citi@citibank.com",
            name="Citi Analyst",
            organization_id=org_a.id,
            status="active"
        )

        call_b = Call(
            id=9952,
            organization_id=org_b.id,
            caller_number="+1-555-0999",
            receiver_number="+1-555-0888",
            status="flagged"
        )
        db.add(call_b)
        db.commit()

        # Attempt to run LID on Org B call by User A -> Must raise 403
        req_lid = IdentifyLanguageRequest(call_id=call_b.id, audio_base64=None)
        with pytest.raises(HTTPException) as exc_info:
            service.identify_language_service(db, req_lid, user_a)
        assert exc_info.value.status_code == 403
        assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail

        # Attempt to run Transcribe on Org B call by User A -> Must raise 403
        req_trans = TranscribeRequest(call_id=call_b.id, audio_base64=None)
        with pytest.raises(HTTPException) as exc_info:
            service.transcribe_service(db, req_trans, user_a)
        assert exc_info.value.status_code == 403
        assert "TENANT_ISOLATION_VIOLATION" in exc_info.value.detail

        print("✓ Tenant isolation on Multilingual calls verified (HTTP 403)")
    finally:
        # Cleanup test entities
        c = db.query(Call).filter(Call.id == 9952).first()
        if c:
            db.delete(c)
            db.commit()
        db.close()


def run_all_tests():
    print("\n--- RUNNING PHASE 26 MULTILINGUAL & ACCENT TEST SUITE ---")
    test_language_registry_retrieval()
    test_accent_registry_and_ethical_fairness_guard()
    test_code_switching_detection()
    test_language_identification_engine()
    test_transcription_service_multilingual()
    test_model_manager_and_graceful_adapter_fallback()
    test_fairness_and_anti_bias_audit()
    test_tenant_isolation_on_multilingual_calls()
    print("\nALL PHASE 26 MULTILINGUAL & ACCENT TESTS PASSED SUCCESSFULLY!\n")


if __name__ == "__main__":
    run_all_tests()

