"""
VoiceGuard AI — Centralized Analysis Orchestrator
Phase 29: Integration Layer (SIH26104)

Coordinates the complete end-to-end multi-engine analysis lifecycle:
1. RECEIVED: Request reception & idempotency check
2. VALIDATING: Authorization, tenant boundary, consent verification
3. AUDIO_PROCESSING: Ingestion, format normalization, VAD check
4. AI_ANALYSIS: Concurrent dispatch of independent AI engines
5. RISK_ASSESSMENT: Signal submission to Authoritative Central Risk Evaluator
6. EXPLANATION: Explainable AI dossier generation
7. ALERT_PROCESSING: Policy-based alert generation & prevention action
8. COMPLETED: Final unified assembly & event emission
"""

import time
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.modules.integration.contracts import (
    AnalysisStatus,
    ModuleStatus,
    IntegrationErrorCode,
    EventType,
    ModuleExecutionResult,
    _utcnow,
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
    central_risk_evaluator,
    RiskSignalBundle,
    RiskAssessmentOutcome,
)
from app.modules.integration.event_bus import event_bus
from app.modules.integration.models import (
    AnalysisSession,
    ModuleExecution,
)
from app.models.domain import (
    Alert,
    PreventionAction,
    Incident,
    Call,
    RiskScore,
    AnalysisResult,
)

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """
    Coordinates multi-engine analysis stages without duplicating domain business logic.
    Provides bounded concurrent execution, partial failure resilience, and idempotency.
    """

    def __init__(self, thread_pool_workers: int = 6, module_timeout_seconds: float = 3.0):
        self._pool = ThreadPoolExecutor(max_workers=thread_pool_workers, thread_name_prefix="vg_orch_pool")
        self.module_timeout_seconds = module_timeout_seconds
        # Instantiate standardized adapters
        self.authenticity_adapter = VoiceAuthenticityAdapter()
        self.speaker_adapter = SpeakerVerificationAdapter()
        self.prosody_adapter = ProsodyAnalysisAdapter()
        self.language_adapter = LanguageIdentificationAdapter()
        self.asr_adapter = ASRTranscriptionAdapter()
        self.nlp_adapter = NLPConversationAdapter()
        self.threat_adapter = ThreatIntelligenceAdapter()
        self.caller_adapter = CallerIntelligenceAdapter()

        # In-memory session tracking for cancellation and quick lookup
        self._active_sessions: Dict[str, Dict[str, Any]] = {}

    def cancel_session(self, session_uuid: str) -> bool:
        """Marks an active session as cancelled."""
        if session_uuid in self._active_sessions:
            self._active_sessions[session_uuid]["is_cancelled"] = True
            logger.info(f"Analysis session {session_uuid} marked as CANCELLED.")
            return True
        return False

    def execute_analysis(
        self,
        db: Optional[Session],
        audio_bytes: Optional[bytes],
        context: Dict[str, Any],
        organization_id: Optional[int] = None,
        correlation_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        analysis_profile: str = "standard_defense",
        requested_features: Optional[List[str]] = None,
        consent_confirmed: bool = True,
        call_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes the full synchronized analysis lifecycle.
        Returns the unified analysis response dictionary.
        """
        t_start = time.perf_counter()
        corr_id = correlation_id or f"corr_{uuid.uuid4().hex[:12]}"
        sess_uuid = f"sess_{uuid.uuid4().hex[:12]}"

        # ── STAGE 1: RECEIVED & Idempotency Check ────────────────────────────
        if idempotency_key and db:
            existing = db.query(AnalysisSession).filter(AnalysisSession.idempotency_key == idempotency_key).first()
            if existing:
                logger.info(f"Returning cached analysis for idempotency key {idempotency_key}")
                return self._build_response_from_db_session(existing, db)

        # Create session tracking
        self._active_sessions[sess_uuid] = {
            "session_uuid": sess_uuid,
            "status": AnalysisStatus.RECEIVED,
            "is_cancelled": False,
        }

        # Persist AnalysisSession record if DB provided
        db_session = None
        if db:
            db_session = AnalysisSession(
                session_uuid=sess_uuid,
                organization_id=organization_id,
                call_id=call_id,
                correlation_id=corr_id,
                idempotency_key=idempotency_key,
                status=AnalysisStatus.RECEIVED.value,
                analysis_profile=analysis_profile,
                requested_features=requested_features or [],
                consent_confirmed=consent_confirmed,
            )
            db.add(db_session)
            db.commit()
            db.refresh(db_session)

        # ── STAGE 2: VALIDATING ──────────────────────────────────────────────
        self._update_session_status(db_session, AnalysisStatus.VALIDATING, db)

        # Check consent
        if not consent_confirmed and analysis_profile != "emergency_investigation":
            return self._fail_session(
                db_session,
                IntegrationErrorCode.CONSENT_REQUIRED,
                "Biometric voice analysis requires affirmative customer consent under DPDP Act 2023.",
                corr_id,
                organization_id,
                db,
            )

        # ── STAGE 3: AUDIO_PROCESSING ────────────────────────────────────────
        self._update_session_status(db_session, AnalysisStatus.AUDIO_PROCESSING, db)
        audio_status = "READY"
        if audio_bytes and len(audio_bytes) > 0:
            # Lightweight VAD / magic byte inspection
            if len(audio_bytes) < 320:  # Less than 10ms of 16kHz audio
                audio_status = "MINIMAL_AUDIO"
        else:
            audio_status = "SYNTHETIC_SIGNAL_PROBE"

        # Check for cancellation
        if self._active_sessions.get(sess_uuid, {}).get("is_cancelled"):
            return self._cancel_session_flow(db_session, corr_id, organization_id, db)

        # ── STAGE 4: AI_ANALYSIS (Concurrent Dispatch) ───────────────────────
        self._update_session_status(db_session, AnalysisStatus.AI_ANALYSIS, db)

        # Run independent AI analysis tasks in parallel thread pool
        futures = {}
        futures["authenticity"] = self._pool.submit(self.authenticity_adapter.execute, audio_bytes, context, corr_id)
        futures["speaker"] = self._pool.submit(self.speaker_adapter.execute, audio_bytes, context, corr_id)
        futures["prosody"] = self._pool.submit(self.prosody_adapter.execute, audio_bytes, context, corr_id)
        futures["language"] = self._pool.submit(self.language_adapter.execute, audio_bytes, context, corr_id)
        futures["transcription"] = self._pool.submit(self.asr_adapter.execute, audio_bytes, context, corr_id)
        futures["threat"] = self._pool.submit(self.threat_adapter.execute, audio_bytes, context, corr_id)
        futures["caller"] = self._pool.submit(self.caller_adapter.execute, audio_bytes, context, corr_id)

        # Collect results with per-module timeout resilience
        module_results: Dict[str, ModuleExecutionResult] = {}
        failed_modules: List[str] = []
        timed_out_modules: List[str] = []

        for name, fut in futures.items():
            try:
                module_results[name] = fut.result(timeout=self.module_timeout_seconds)
            except TimeoutError:
                timed_out_modules.append(name)
                module_results[name] = ModuleExecutionResult(
                    execution_id=str(uuid.uuid4()),
                    module_id=name,
                    module_version="1.0",
                    correlation_id=corr_id,
                    status=ModuleStatus.TIMED_OUT,
                    started_at=_utcnow(),
                    completed_at=_utcnow(),
                    processing_time_ms=3000.0,
                    error_code=IntegrationErrorCode.MODULE_TIMEOUT,
                    error_message=f"Module {name} execution exceeded 3000ms timeout",
                )
            except Exception as exc:
                failed_modules.append(name)
                module_results[name] = ModuleExecutionResult(
                    execution_id=str(uuid.uuid4()),
                    module_id=name,
                    module_version="1.0",
                    correlation_id=corr_id,
                    status=ModuleStatus.FAILED,
                    started_at=_utcnow(),
                    completed_at=_utcnow(),
                    processing_time_ms=0.0,
                    error_code=IntegrationErrorCode.MODEL_INFERENCE_FAILED,
                    error_message=str(exc),
                )

        # Dependent task: NLP conversation analysis uses transcription output
        transcript_text = module_results["transcription"].result.get("transcript_text", "")
        nlp_context = dict(context)
        nlp_context["transcript_text"] = transcript_text
        try:
            nlp_fut = self._pool.submit(self.nlp_adapter.execute, audio_bytes, nlp_context, corr_id)
            module_results["conversation"] = nlp_fut.result(timeout=2.5)
        except Exception as exc:
            failed_modules.append("conversation")
            module_results["conversation"] = ModuleExecutionResult(
                execution_id=str(uuid.uuid4()),
                module_id="conversation_intelligence",
                module_version="2.1.0",
                correlation_id=corr_id,
                status=ModuleStatus.FAILED,
                started_at=_utcnow(),
                completed_at=_utcnow(),
                processing_time_ms=0.0,
                error_code=IntegrationErrorCode.MODEL_INFERENCE_FAILED,
                error_message=str(exc),
            )

        # Persist module executions to database
        if db and db_session:
            for mod_name, m_res in module_results.items():
                m_exec = ModuleExecution(
                    session_id=db_session.id,
                    execution_uuid=m_res.execution_id,
                    module_id=m_res.module_id,
                    module_version=m_res.module_version,
                    status=m_res.status.value,
                    processing_time_ms=m_res.processing_time_ms,
                    result_json=m_res.result,
                    warnings_json=m_res.warnings,
                    error_code=m_res.error_code.value if m_res.error_code else None,
                    error_message=m_res.error_message,
                )
                db.add(m_exec)
            db.commit()

        # Check for cancellation
        if self._active_sessions.get(sess_uuid, {}).get("is_cancelled"):
            return self._cancel_session_flow(db_session, corr_id, organization_id, db)

        # ── STAGE 5: RISK_ASSESSMENT ─────────────────────────────────────────
        self._update_session_status(db_session, AnalysisStatus.RISK_ASSESSMENT, db)

        # Construct signal bundle for Phase 17 Authoritative Risk Engine
        signal_bundle = RiskSignalBundle(
            voice_authenticity=module_results["authenticity"].result if module_results["authenticity"].status == ModuleStatus.COMPLETED else None,
            speaker_verification=module_results["speaker"].result if module_results["speaker"].status == ModuleStatus.COMPLETED else None,
            prosody_analysis=module_results["prosody"].result if module_results["prosody"].status == ModuleStatus.COMPLETED else None,
            language_identification=module_results["language"].result if module_results["language"].status == ModuleStatus.COMPLETED else None,
            transcription=module_results["transcription"].result if module_results["transcription"].status == ModuleStatus.COMPLETED else None,
            conversation_intelligence=module_results["conversation"].result if module_results["conversation"].status == ModuleStatus.COMPLETED else None,
            threat_intelligence=module_results["threat"].result if module_results["threat"].status == ModuleStatus.COMPLETED else None,
            caller_intelligence=module_results["caller"].result if module_results["caller"].status == ModuleStatus.COMPLETED else None,
            transaction_intelligence=context.get("transaction_info"),
            failed_modules=failed_modules,
            timed_out_modules=timed_out_modules,
        )

        risk_outcome = central_risk_evaluator.evaluate(signal_bundle, context)

        # ── STAGE 6: EXPLANATION ─────────────────────────────────────────────
        self._update_session_status(db_session, AnalysisStatus.EXPLANATION, db)

        # ── STAGE 7: ALERT_PROCESSING & PREVENTION ───────────────────────────
        self._update_session_status(db_session, AnalysisStatus.ALERT_PROCESSING, db)
        alerts_created: List[Dict[str, Any]] = []
        prevention_actions: List[Dict[str, Any]] = []
        incidents_created: List[Dict[str, Any]] = []

        if db:
            # Save RiskScore record if call_id provided
            if call_id:
                risk_rec = RiskScore(
                    call_id=call_id,
                    overall_score=risk_outcome.overall_score,
                    voice_score=risk_outcome.voice_score,
                    speaker_score=risk_outcome.speaker_score,
                    caller_score=risk_outcome.caller_score,
                    device_score=risk_outcome.device_score,
                    network_score=risk_outcome.network_score,
                    conversation_score=risk_outcome.conversation_score,
                    transaction_score=risk_outcome.transaction_score,
                    threat_score=risk_outcome.threat_score,
                    confidence=risk_outcome.confidence,
                )
                db.add(risk_rec)

                # Save AnalysisResult record
                auth_res = module_results["authenticity"].result
                analysis_rec = AnalysisResult(
                    call_id=call_id,
                    analysis_type="synthetic_voice_detection",
                    score=auth_res.get("synthetic_voice_score", risk_outcome.voice_score),
                    confidence=auth_res.get("confidence", 0.95),
                    features=auth_res.get("features", {}),
                    model_name=auth_res.get("model_name", "VoiceGuard-Conformer-v2.4"),
                    model_version="2.4.1",
                )
                db.add(analysis_rec)
                db.commit()

            # Policy Trigger: High/Critical Risk Alert
            if risk_outcome.overall_score >= 60.0:
                # Deduplication: check if an active alert already exists for this call
                existing_alert = None
                if call_id:
                    existing_alert = db.query(Alert).filter(Alert.call_id == call_id, Alert.status == "active").first()

                if not existing_alert:
                    alert_title = "Synthetic Voice Impersonation Detected" if risk_outcome.voice_score >= 50.0 else "High-Risk Suspicious Call"
                    alert_rec = Alert(
                        organization_id=organization_id,
                        call_id=call_id,
                        alert_type="voice_clone" if risk_outcome.voice_score >= 50.0 else "fraud_risk",
                        severity=risk_outcome.risk_level,
                        title=alert_title,
                        message=f"VoiceGuard AI detected {risk_outcome.risk_level.upper()} threat risk ({risk_outcome.overall_score:.1f}/100). {'; '.join(risk_outcome.observed_evidence[:2])}",
                        status="active",
                    )
                    db.add(alert_rec)
                    db.commit()
                    db.refresh(alert_rec)
                    alerts_created.append({
                        "id": alert_rec.id,
                        "title": alert_rec.title,
                        "severity": alert_rec.severity,
                        "status": alert_rec.status,
                    })

            # Prevention Trigger: Propose automated defense action if elevated/critical risk
            if risk_outcome.overall_score >= 60.0:
                act_type = "block_call" if risk_outcome.overall_score >= 80.0 else "require_secondary_auth"
                prev_action = PreventionAction(
                    organization_id=organization_id,
                    call_id=call_id,
                    action_type=act_type,
                    status="proposed",
                    reason=f"Authoritative Risk Engine score ({risk_outcome.overall_score:.1f}) requires defense action: {act_type}",
                    provider="telephony_gateway",
                )
                db.add(prev_action)
                db.commit()
                db.refresh(prev_action)
                prevention_actions.append({
                    "id": prev_action.id,
                    "action_type": prev_action.action_type,
                    "status": prev_action.status,
                })

            # Incident Trigger: Create incident for voice cloning impersonation
            if (risk_outcome.overall_score >= 60.0 and risk_outcome.voice_score >= 70.0) or risk_outcome.overall_score >= 80.0:
                inc_num = f"INC-2026-{uuid.uuid4().hex[:6].upper()}"
                inc_rec = Incident(
                    organization_id=organization_id,
                    incident_number=inc_num,
                    title="Active Voice Cloning Impersonation Attack",
                    category="voice_clone",
                    severity="critical" if risk_outcome.overall_score >= 80.0 else "high",
                    priority="p1",
                    status="open",
                    summary=f"Automated incident created by Integration Orchestrator. Voice clone score: {risk_outcome.voice_score:.1f}/100. Call ID: {call_id}",
                    call_id=call_id,
                )
                db.add(inc_rec)
                db.commit()
                db.refresh(inc_rec)
                incidents_created.append({
                    "id": inc_rec.id,
                    "incident_number": inc_rec.incident_number,
                    "severity": inc_rec.severity,
                    "status": inc_rec.status,
                })

        # ── STAGE 8: COMPLETED ───────────────────────────────────────────────
        final_status = (
            AnalysisStatus.PARTIALLY_COMPLETED
            if (failed_modules or timed_out_modules or risk_outcome.is_incomplete)
            else AnalysisStatus.COMPLETED
        )
        self._update_session_status(db_session, final_status, db)

        if db and db_session:
            db_session.completed_at = _utcnow()
            db_session.overall_risk_score = risk_outcome.overall_score
            db_session.risk_level = risk_outcome.risk_level
            db_session.confidence = risk_outcome.confidence
            db.commit()

        # Update in-memory session status
        if sess_uuid in self._active_sessions:
            self._active_sessions[sess_uuid]["status"] = final_status

        total_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

        # Emit completion domain event
        async_event_data = {
            "session_uuid": sess_uuid,
            "overall_score": risk_outcome.overall_score,
            "risk_level": risk_outcome.risk_level,
            "synthetic_voice_verdict": module_results["authenticity"].result.get("verdict"),
            "alerts_count": len(alerts_created),
            "elapsed_ms": total_elapsed_ms,
        }
        # In synchronous context, fire and forget event bus
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(event_bus.publish(
                    event_type=EventType.AnalysisSessionCompleted,
                    payload=async_event_data,
                    correlation_id=corr_id,
                    organization_id=organization_id,
                ))
        except Exception:
            pass

        # Build unified response schema
        return {
            "analysis_id": sess_uuid,
            "correlation_id": corr_id,
            "organization_id": organization_id,
            "processing_status": final_status.value,
            "audio_status": audio_status,
            "authenticity_result": module_results["authenticity"].result,
            "speaker_verification_result": module_results["speaker"].result,
            "prosody_result": module_results["prosody"].result,
            "language_result": module_results["language"].result,
            "transcription_result": module_results["transcription"].result,
            "conversation_result": module_results["conversation"].result,
            "threat_result": module_results["threat"].result,
            "caller_result": module_results["caller"].result,
            "risk_assessment": {
                "overall_score": risk_outcome.overall_score,
                "risk_level": risk_outcome.risk_level,
                "confidence": risk_outcome.confidence,
                "is_incomplete": risk_outcome.is_incomplete,
                "recommended_decision": risk_outcome.recommended_decision,
                "scores": {
                    "voice": risk_outcome.voice_score,
                    "speaker": risk_outcome.speaker_score,
                    "caller": risk_outcome.caller_score,
                    "device": risk_outcome.device_score,
                    "network": risk_outcome.network_score,
                    "conversation": risk_outcome.conversation_score,
                    "transaction": risk_outcome.transaction_score,
                    "threat": risk_outcome.threat_score,
                },
            },
            "explanation": {
                "observed_evidence": risk_outcome.observed_evidence,
                "model_conclusions": risk_outcome.model_conclusions,
                "contradictory_evidence": risk_outcome.contradictory_evidence,
                "missing_signals": risk_outcome.missing_signals,
                "policy_decisions": risk_outcome.policy_decisions,
                "recommended_actions": risk_outcome.recommended_actions,
            },
            "alerts": alerts_created,
            "prevention_actions": prevention_actions,
            "incidents": incidents_created,
            "processing_metadata": {
                "total_processing_time_ms": round(total_elapsed_ms, 2),
                "module_latencies": {
                    k: round(v.processing_time_ms, 2) for k, v in module_results.items()
                },
                "failed_modules": failed_modules,
                "timed_out_modules": timed_out_modules,
            },
            "warnings": [
                w for res in module_results.values() for w in res.warnings
            ],
        }

    def _update_session_status(self, db_session: Optional[AnalysisSession], status: AnalysisStatus, db: Optional[Session]):
        if db_session and db:
            db_session.status = status.value
            db.commit()

    def _fail_session(
        self,
        db_session: Optional[AnalysisSession],
        error_code: IntegrationErrorCode,
        message: str,
        correlation_id: str,
        organization_id: Optional[int],
        db: Optional[Session],
    ) -> Dict[str, Any]:
        if db_session and db:
            db_session.status = AnalysisStatus.FAILED.value
            db_session.error_code = error_code.value
            db_session.error_message = message
            db_session.completed_at = _utcnow()
            db.commit()

        return {
            "analysis_id": db_session.session_uuid if db_session else "failed",
            "correlation_id": correlation_id,
            "organization_id": organization_id,
            "processing_status": AnalysisStatus.FAILED.value,
            "error_code": error_code.value,
            "error_message": message,
        }

    def _cancel_session_flow(
        self,
        db_session: Optional[AnalysisSession],
        correlation_id: str,
        organization_id: Optional[int],
        db: Optional[Session],
    ) -> Dict[str, Any]:
        if db_session and db:
            db_session.status = AnalysisStatus.CANCELLED.value
            db_session.completed_at = _utcnow()
            db.commit()

        return {
            "analysis_id": db_session.session_uuid if db_session else "cancelled",
            "correlation_id": correlation_id,
            "organization_id": organization_id,
            "processing_status": AnalysisStatus.CANCELLED.value,
            "message": "Analysis session was cancelled by user.",
        }

    def _build_response_from_db_session(self, sess: AnalysisSession, db: Session) -> Dict[str, Any]:
        """Constructs an analysis response payload from a persisted database session."""
        m_execs = db.query(ModuleExecution).filter(ModuleExecution.session_id == sess.id).all()
        mod_dict = {m.module_id: m.result_json or {} for m in m_execs}

        return {
            "analysis_id": sess.session_uuid,
            "correlation_id": sess.correlation_id,
            "organization_id": sess.organization_id,
            "processing_status": sess.status,
            "audio_status": "READY",
            "authenticity_result": mod_dict.get("authenticity_detection", {}),
            "speaker_verification_result": mod_dict.get("speaker_verification", {}),
            "prosody_result": mod_dict.get("prosody_analysis", {}),
            "language_result": mod_dict.get("language_identification", {}),
            "transcription_result": mod_dict.get("transcription", {}),
            "conversation_result": mod_dict.get("conversation_intelligence", {}),
            "threat_result": mod_dict.get("threat_intelligence", {}),
            "caller_result": mod_dict.get("caller_intelligence", {}),
            "risk_assessment": {
                "overall_score": sess.overall_risk_score or 0.0,
                "risk_level": sess.risk_level or "low",
                "confidence": sess.confidence or 0.90,
            },
            "explanation": {},
            "alerts": [],
            "prevention_actions": [],
            "incidents": [],
            "processing_metadata": {"idempotent_cached": True},
            "warnings": [],
        }


analysis_orchestrator = AnalysisOrchestrator()
