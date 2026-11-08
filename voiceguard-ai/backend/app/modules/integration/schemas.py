"""
VoiceGuard AI — Integration Schemas
Phase 29: Integration Layer (SIH26104)

Pydantic schemas for the Unified Analysis API:
- POST /api/v1/analysis
- GET /api/v1/analysis/{analysis_id}
- GET /api/v1/analysis/{analysis_id}/status
- GET /api/v1/analysis/{analysis_id}/results
- POST /api/v1/analysis/{analysis_id}/cancel
- GET /api/v1/analysis/events
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class AnalysisRequest(BaseModel):
    """Payload for POST /api/v1/analysis"""
    call_id: Optional[int] = Field(None, description="Optional call session ID to link results to.")
    audio_base64: Optional[str] = Field(None, description="Base64 encoded raw 16-bit PCM or WAV audio.")
    audio_session_id: Optional[str] = Field(None, description="Reference to active streaming buffer session.")
    analysis_profile: str = Field("standard_defense", description="Analysis profile: standard_defense, deep_forensics, real_time_telephony, high_value_transaction")
    requested_features: Optional[List[str]] = Field(None, description="List of feature flags to enable.")
    idempotency_key: Optional[str] = Field(None, description="Unique client key to prevent duplicate execution.")
    consent_confirmed: bool = Field(True, description="Affirmative customer biometric consent.")
    caller_number: Optional[str] = Field(None, description="Caller telephone number.")
    target_identity: Optional[str] = Field(None, description="Target claimed user / speaker identity.")
    transaction_info: Optional[Dict[str, Any]] = Field(None, description="Optional transaction metadata (amount, currency).")
    context_overrides: Optional[Dict[str, Any]] = Field(None, description="Test double overrides for testing.")


class AuthenticityResult(BaseModel):
    synthetic_voice_score: float
    is_synthetic: bool
    confidence: float
    verdict: str
    features: Optional[Dict[str, Any]] = None
    model_name: Optional[str] = None


class SpeakerVerificationResult(BaseModel):
    similarity: float
    verified: bool
    target_identity: str
    verification_status: str
    speaker_score: float
    model_name: Optional[str] = None


class RiskAssessmentSummary(BaseModel):
    overall_score: float
    risk_level: str
    confidence: float
    is_incomplete: Optional[bool] = False
    recommended_decision: Optional[str] = "ALLOW"
    scores: Optional[Dict[str, float]] = None


class ExplanationSummary(BaseModel):
    observed_evidence: List[str] = []
    model_conclusions: List[str] = []
    contradictory_evidence: List[str] = []
    missing_signals: List[str] = []
    policy_decisions: List[str] = []
    recommended_actions: List[str] = []


class AnalysisResponse(BaseModel):
    """Full unified response returned by POST /api/v1/analysis and GET /api/v1/analysis/{id}/results"""
    analysis_id: str
    correlation_id: str
    organization_id: Optional[int] = None
    processing_status: str
    audio_status: str
    authenticity_result: Optional[Dict[str, Any]] = None
    speaker_verification_result: Optional[Dict[str, Any]] = None
    prosody_result: Optional[Dict[str, Any]] = None
    language_result: Optional[Dict[str, Any]] = None
    transcription_result: Optional[Dict[str, Any]] = None
    conversation_result: Optional[Dict[str, Any]] = None
    threat_result: Optional[Dict[str, Any]] = None
    caller_result: Optional[Dict[str, Any]] = None
    risk_assessment: Optional[RiskAssessmentSummary] = None
    explanation: Optional[ExplanationSummary] = None
    alerts: List[Dict[str, Any]] = []
    prevention_actions: List[Dict[str, Any]] = []
    incidents: List[Dict[str, Any]] = []
    processing_metadata: Optional[Dict[str, Any]] = None
    warnings: List[str] = []
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class AnalysisStatusResponse(BaseModel):
    """Lightweight polling response for GET /api/v1/analysis/{id}/status"""
    analysis_id: str
    correlation_id: str
    organization_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    overall_risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class AnalysisCancelResponse(BaseModel):
    """Response for POST /api/v1/analysis/{id}/cancel"""
    analysis_id: str
    cancelled: bool
    status: str
    message: str


class IntegrationEventOut(BaseModel):
    """Payload for GET /api/v1/analysis/events"""
    id: Optional[int] = None
    event_id: str
    event_type: str
    event_version: str
    correlation_id: str
    organization_id: Optional[int] = None
    source_module: str
    timestamp: datetime
    payload_version: str
    payload: Dict[str, Any]

