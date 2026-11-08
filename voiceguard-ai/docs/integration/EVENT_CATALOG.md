# VoiceGuard AI — Domain Event Catalog & Schemas
## Phase 29: Integration Layer (SIH26104)

---

## 1. Event Envelope Specification

Every domain event emitted by `IntegrationEventBus` follows a versioned JSON envelope:

```json
{
  "event_id": "evt_4f92b7c1a8e0",
  "event_type": "VoiceAuthenticityAnalysisCompleted",
  "event_version": "1.0.0",
  "correlation_id": "corr_891e4a01bcde",
  "organization_id": 1,
  "source_module": "authenticity_detection",
  "timestamp": "2026-11-07T12:00:00.000Z",
  "payload_version": "1.0",
  "payload": { ... }
}
```

---

## 2. Canonical Events Register

| Event Type | Source Module | Trigger Condition | Payload Summary |
|---|---|---|---|
| `AudioStreamStarted` | `streaming_audio_pipeline` | Inbound WebSocket or SIP call initiated | `session_id`, `sample_rate`, `caller_id` |
| `AudioSegmentReady` | `streaming_audio_pipeline` | Ring buffer collects 1000ms speech window | `segment_id`, `duration_ms`, `vad_confidence` |
| `VoiceAuthenticityAnalysisCompleted` | `authenticity_detection` | Conformer vocoder analysis completes | `synthetic_voice_score`, `verdict`, `confidence` |
| `SpeakerVerificationCompleted` | `speaker_verification` | ECAPA-TDNN similarity scored | `similarity`, `verified`, `target_identity` |
| `ProsodyAnalysisCompleted` | `prosody_analysis` | F0 jitter & cadence analyzed | `pitch_jitter`, `shimmer`, `naturalness_score` |
| `LanguageIdentificationCompleted` | `language_identification` | Spoken Indic language detected | `language_code`, `detected_accent`, `is_code_switched` |
| `TranscriptionCompleted` | `transcription` | ASR converts audio to text | `transcript_text`, `confidence`, `word_count` |
| `ConversationAnalysisCompleted` | `conversation_intelligence` | NLP detects urgency / coercion | `social_engineering_score`, `matched_patterns` |
| `ThreatIntelligenceMatched` | `threat_intelligence` | Caller / acoustic hash matches IOC | `threat_score`, `threat_actor`, `matched` |
| `RiskAssessmentCompleted` | `central_risk_evaluator` | Multi-signal risk score aggregated | `overall_score`, `risk_level`, `confidence` |
| `ExplanationGenerated` | `central_risk_evaluator` | XAI evidence dossier assembled | `observed_evidence`, `recommended_decision` |
| `AlertCreated` | `orchestrator` | Risk score triggers policy alert | `alert_id`, `severity`, `title` |
| `PreventionActionProposed` | `orchestrator` | Automated countermeasure proposed | `action_id`, `action_type`, `provider` |
| `PreventionActionExecuted` | `prevention_engine` | Countermeasure executed on gateway | `action_id`, `status`, `execution_result` |
| `IncidentCreated` | `orchestrator` | Critical threat creates SOC ticket | `incident_id`, `incident_number`, `priority` |
| `IncidentUpdated` | `incident_management` | Analyst notes or status transition | `incident_id`, `status`, `updated_by` |
| `AnalysisSessionCompleted` | `orchestrator` | End-to-end pipeline completes | `session_uuid`, `overall_score`, `elapsed_ms` |
| `AnalysisSessionFailed` | `orchestrator` | Pipeline fails unrecoverably | `session_uuid`, `error_code`, `error_message` |

---

## 3. Privacy & Sanitization Guard
Event payloads **strictly prohibit**:
- Raw PCM / WAV audio buffers (replaced with `<binary N bytes stripped>`)
- Plaintext passwords, API secrets, or JWT bearer tokens (replaced with `<sanitized>`)
- High-dimensional biometric vectors (embeddings never emitted in event streams)

