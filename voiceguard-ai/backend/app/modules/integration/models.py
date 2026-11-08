"""
VoiceGuard AI — Integration Layer Models
Phase 29: Integration Layer (SIH26104)

Database models for tracking:
- Analysis sessions (end-to-end lifecycle)
- Module execution logs & execution telemetry
- Integration events (audit & asynchronous pub/sub)
- Event deliveries (idempotent delivery tracking)
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class AnalysisSession(Base):
    """
    Represents an end-to-end coordinated analysis session across all AI and security engines.
    Tracks state transitions from RECEIVED to COMPLETED/FAILED/TIMED_OUT.
    """
    __tablename__ = "analysis_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_uuid = Column(String(64), unique=True, index=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=True, index=True)
    correlation_id = Column(String(64), index=True, nullable=False)
    idempotency_key = Column(String(128), unique=True, nullable=True, index=True)

    status = Column(
        String(32),
        default="RECEIVED",
        index=True,
        nullable=False,
    )  # RECEIVED, VALIDATING, AUDIO_PROCESSING, AI_ANALYSIS, RISK_ASSESSMENT, EXPLANATION, ALERT_PROCESSING, COMPLETED, FAILED, PARTIALLY_COMPLETED, CANCELLED, TIMED_OUT

    analysis_profile = Column(String(64), default="standard_defense", nullable=False)  # standard_defense, deep_forensics, real_time_telephony, high_value_transaction
    requested_features = Column(JSON, nullable=True)  # List of feature flags requested
    consent_confirmed = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow, server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)

    overall_risk_score = Column(Float, nullable=True)
    risk_level = Column(String(32), nullable=True)  # low, medium, high, critical
    confidence = Column(Float, nullable=True)

    # Relationships
    module_executions = relationship("ModuleExecution", back_populates="session", cascade="all, delete-orphan")
    call = relationship("Call")

    __table_args__ = (
        Index("ix_analysis_sessions_org_status", "organization_id", "status"),
        Index("ix_analysis_sessions_org_created", "organization_id", "created_at"),
    )


class ModuleExecution(Base):
    """
    Tracks the execution of an individual AI/security module within an analysis session.
    Provides latency tracking, failure isolation, and auditability.
    """
    __tablename__ = "module_executions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("analysis_sessions.id"), nullable=False, index=True)
    execution_uuid = Column(String(64), unique=True, index=True, nullable=False)
    module_id = Column(String(64), nullable=False, index=True)
    module_version = Column(String(32), nullable=False)

    status = Column(
        String(32),
        default="PENDING",
        nullable=False,
    )  # PENDING, RUNNING, COMPLETED, FAILED, TIMED_OUT, SKIPPED

    started_at = Column(DateTime(timezone=True), default=_utcnow, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_time_ms = Column(Float, default=0.0)

    result_json = Column(JSON, nullable=True)
    warnings_json = Column(JSON, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)

    session = relationship("AnalysisSession", back_populates="module_executions")

    __table_args__ = (
        Index("ix_module_executions_session_module", "session_id", "module_id"),
    )


class IntegrationEvent(Base):
    """
    Persistent audit and event log for platform-wide domain events.
    Enforces event versioning, idempotency, and tenant isolation.
    """
    __tablename__ = "integration_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    event_type = Column(String(64), nullable=False, index=True)  # e.g. VoiceAuthenticityAnalysisCompleted, RiskAssessmentCompleted
    event_version = Column(String(16), default="1.0.0", nullable=False)
    correlation_id = Column(String(64), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    source_module = Column(String(64), nullable=False)

    payload_version = Column(String(16), default="1.0", nullable=False)
    payload_json = Column(JSON, nullable=False)  # Minimal sanitized payload (no raw audio or raw passwords)

    status = Column(String(32), default="PUBLISHED", nullable=False)  # PUBLISHED, DELIVERED, DEAD_LETTER
    created_at = Column(DateTime(timezone=True), default=_utcnow, server_default=func.now(), index=True)

    deliveries = relationship("IntegrationEventDelivery", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_integration_events_org_type", "organization_id", "event_type"),
        Index("ix_integration_events_corr", "correlation_id"),
    )


class IntegrationEventDelivery(Base):
    """
    Tracks consumer receipt and processing of integration events.
    Guarantees idempotent delivery handling and dead-letter detection.
    """
    __tablename__ = "integration_event_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("integration_events.id"), nullable=False, index=True)
    consumer_id = Column(String(64), nullable=False, index=True)
    delivered_at = Column(DateTime(timezone=True), default=_utcnow, server_default=func.now())
    status = Column(String(32), default="ACKNOWLEDGED", nullable=False)  # ACKNOWLEDGED, FAILED, RETRIED, DEAD_LETTER
    attempts = Column(Integer, default=1, nullable=False)
    error_message = Column(Text, nullable=True)

    event = relationship("IntegrationEvent", back_populates="deliveries")

    __table_args__ = (
        Index("ix_event_deliveries_event_consumer", "event_id", "consumer_id", unique=True),
    )

