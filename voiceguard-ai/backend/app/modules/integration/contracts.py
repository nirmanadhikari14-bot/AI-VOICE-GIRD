"""
VoiceGuard AI — Standardized Integration Contracts
Phase 29: Integration Layer (SIH26104)

Defines unified contracts, metadata schemas, execution results,
and domain event models across all VoiceGuard AI subsystems.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisStatus(str, Enum):
    """Lifecycle states of an analysis session."""
    RECEIVED = "RECEIVED"
    VALIDATING = "VALIDATING"
    AUDIO_PROCESSING = "AUDIO_PROCESSING"
    AI_ANALYSIS = "AI_ANALYSIS"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    EXPLANATION = "EXPLANATION"
    ALERT_PROCESSING = "ALERT_PROCESSING"
    COMPLETED = "COMPLETED"

    # Terminal failure states
    FAILED = "FAILED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    CANCELLED = "CANCELLED"
    TIMED_OUT = "TIMED_OUT"


class ModuleStatus(str, Enum):
    """Lifecycle states of an individual module execution."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    SKIPPED = "SKIPPED"


class IntegrationErrorCode(str, Enum):
    """Canonical integration error codes."""
    MODULE_UNAVAILABLE = "MODULE_UNAVAILABLE"
    MODULE_TIMEOUT = "MODULE_TIMEOUT"
    INVALID_MODULE_RESPONSE = "INVALID_MODULE_RESPONSE"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    AUTHORIZATION_FAILED = "AUTHORIZATION_FAILED"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    AUDIO_PROCESSING_FAILED = "AUDIO_PROCESSING_FAILED"
    MODEL_INFERENCE_FAILED = "MODEL_INFERENCE_FAILED"
    EVENT_DELIVERY_FAILED = "EVENT_DELIVERY_FAILED"
    DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE"
    REDIS_UNAVAILABLE = "REDIS_UNAVAILABLE"
    ANALYSIS_CANCELLED = "ANALYSIS_CANCELLED"
    ANALYSIS_INCOMPLETE = "ANALYSIS_INCOMPLETE"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    TENANT_MISMATCH = "TENANT_MISMATCH"


class EventType(str, Enum):
    """Canonical domain integration events."""
    AudioStreamStarted = "AudioStreamStarted"
    AudioSegmentReady = "AudioSegmentReady"
    VoiceAuthenticityAnalysisCompleted = "VoiceAuthenticityAnalysisCompleted"
    SpeakerVerificationCompleted = "SpeakerVerificationCompleted"
    ProsodyAnalysisCompleted = "ProsodyAnalysisCompleted"
    LanguageIdentificationCompleted = "LanguageIdentificationCompleted"
    TranscriptionCompleted = "TranscriptionCompleted"
    ConversationAnalysisCompleted = "ConversationAnalysisCompleted"
    ThreatIntelligenceMatched = "ThreatIntelligenceMatched"
    RiskAssessmentCompleted = "RiskAssessmentCompleted"
    ExplanationGenerated = "ExplanationGenerated"
    AlertCreated = "AlertCreated"
    PreventionActionProposed = "PreventionActionProposed"
    PreventionActionExecuted = "PreventionActionExecuted"
    IncidentCreated = "IncidentCreated"
    IncidentUpdated = "IncidentUpdated"
    AnalysisSessionCompleted = "AnalysisSessionCompleted"
    AnalysisSessionFailed = "AnalysisSessionFailed"


@dataclass
class ModuleMetadata:
    """Standardized metadata descriptor for every integrated module."""
    module_id: str
    module_name: str
    version: str
    description: str
    is_essential: bool = True  # If True, failure marks analysis as incomplete/failed
    timeout_seconds: float = 3.0
    retry_count: int = 1
    supported_profiles: List[str] = field(default_factory=lambda: ["standard_defense", "deep_forensics", "real_time_telephony"])


@dataclass
class ModuleExecutionResult:
    """Standardized execution outcome produced by any module adapter."""
    execution_id: str
    module_id: str
    module_version: str
    correlation_id: str
    status: ModuleStatus
    started_at: datetime
    completed_at: datetime
    processing_time_ms: float
    result: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    error_code: Optional[IntegrationErrorCode] = None
    error_message: Optional[str] = None


@dataclass
class EventEnvelope:
    """Standardized message envelope for integration domain events."""
    event_id: str
    event_type: EventType
    event_version: str = "1.0.0"
    correlation_id: str = ""
    organization_id: Optional[int] = None
    source_module: str = "orchestrator"
    timestamp: datetime = field(default_factory=_utcnow)
    payload_version: str = "1.0"
    payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value if isinstance(self.event_type, EventType) else self.event_type,
            "event_version": self.event_version,
            "correlation_id": self.correlation_id,
            "organization_id": self.organization_id,
            "source_module": self.source_module,
            "timestamp": self.timestamp.isoformat(),
            "payload_version": self.payload_version,
            "payload": self.payload,
        }


class BaseModuleAdapter:
    """Abstract base class that all module adapters must implement."""

    def get_metadata(self) -> ModuleMetadata:
        raise NotImplementedError

    def is_healthy(self) -> bool:
        return True

    def execute(
        self,
        audio_bytes: Optional[bytes],
        context: Dict[str, Any],
        correlation_id: str,
    ) -> ModuleExecutionResult:
        """
        Executes analysis synchronously or wraps worker pool inference.
        Must return ModuleExecutionResult and never throw uncaught exceptions.
        """
        raise NotImplementedError

