# VoiceGuard AI — Integration Architecture Specification
## Phase 29 — Integration Layer (SIH26104)

---

## 1. Executive Summary

Phase 29 implements the centralized **Integration Layer** for VoiceGuard AI. It coordinates all existing subsystems—biometrics, acoustic neural vocoder detection, prosody analysis, multilingual LID, transcription, NLP social engineering, threat intelligence, caller reputation, Central Risk Engine (Phase 17), explainable AI (Phase 18), alert policies (Phase 19), prevention automation (Phase 20), and incident management (Phase 21)—into one cohesive, observable, and multi-tenant secure platform.

---

## 2. Logical Architecture

```
                 AUDIO SOURCES (PSTN / VoIP / WebSocket)
                                   │
                                   ▼
                       AUDIO INGESTION LAYER
                    (Magic-Byte, 16kHz Canonical)
                                   │
                                   ▼
                        REAL-TIME AUDIO ENGINE
                    (Ring Buffer, Jitter Resequencer)
                                   │
                                   ▼
                       AI ANALYSIS ORCHESTRATOR
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
VOICE AUTHENTICITY        SPEAKER VERIFICATION        PROSODY ANALYSIS
 (Conformer Vocoder)        (ECAPA-TDNN 192d)        (F0 Jitter & Shimmer)
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   ▼
                        MULTILINGUAL LID & ASR
                    (13 Indic Languages, Code-Switch)
                                   │
                                   ▼
                      CONVERSATION INTELLIGENCE
                     (NLP Social Eng & Urgency)
                                   │
                                   ▼
                         THREAT INTELLIGENCE
                      (Known Campaign IOC Match)
                                   │
                                   ▼
                     AUTHORITATIVE RISK ENGINE (P17)
                     (Multi-Signal Weighted Scoring)
                                   │
                                   ▼
                      EXPLAINABILITY ENGINE (P18)
                     (Forensic Evidence Dossier)
                                   │
                                   ▼
                         ALERT ENGINE (P19)
                       (Deduplicated Alerts)
                                   │
                                   ▼
                       PREVENTION ENGINE (P20)
                      (Automated Call/Wire Block)
                                   │
                                   ▼
                       INCIDENT MANAGEMENT (P21)
                       (SOC Incident Correlation)
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
  WEB ADMIN PORTAL          WINDOWS CONSOLE              MOBILE APP
```

---

## 3. Analysis Lifecycle States

Every analysis session follows a strict, state-machine validated lifecycle:

| Lifecycle State | Description |
|---|---|
| `RECEIVED` | Request received, client authenticated, idempotency key evaluated |
| `VALIDATING` | Tenant boundary enforced, affirmative DPDP Act consent verified |
| `AUDIO_PROCESSING` | Audio format normalized to 16kHz PCM, VAD activity verified |
| `AI_ANALYSIS` | Concurrent execution of independent AI model adapters in thread pool |
| `RISK_ASSESSMENT` | Validated signals submitted to Phase 17 Authoritative Risk Evaluator |
| `EXPLANATION` | Explainable AI dossier assembled with evidence and counterfactuals |
| `ALERT_PROCESSING` | Policy triggers evaluated; Alert, Prevention, and Incident records created |
| `COMPLETED` | Unified analysis response assembled, domain event published |

### Failure States
- `FAILED`: Fatal error or unconsented request
- `PARTIALLY_COMPLETED`: Non-essential module failed/timed out, but core authenticity and risk evaluated
- `CANCELLED`: Explicitly aborted by user or timeout governor
- `TIMED_OUT`: Hard ceiling exceeded

---

## 4. Multi-Signal Risk Engine Weights (Phase 17)

$$\text{Risk} = 0.35 \times S_{\text{voice}} + 0.25 \times S_{\text{speaker}} + 0.15 \times S_{\text{conversation}} + 0.10 \times S_{\text{threat}} + 0.10 \times S_{\text{caller/net}} + 0.05 \times S_{\text{tx}}$$

### Algorithmic Fairness & Anti-Bias Guard
- Language differences (Hindi, Tamil, Gujarati, Bengali, etc.) and regional accent variations **strictly contribute 0.0 risk** ($\le 1.0\times$ disparity ratio).
- Cultural or regional speaking cadence cannot inflate synthetic voice likelihood.

---

## 5. Domain Events & Event Bus

The `IntegrationEventBus` provides tenant-isolated, deduplicated domain events:
- `AudioStreamStarted`
- `VoiceAuthenticityAnalysisCompleted`
- `SpeakerVerificationCompleted`
- `LanguageIdentificationCompleted`
- `RiskAssessmentCompleted`
- `AlertCreated`
- `PreventionActionProposed`
- `IncidentCreated`
- `AnalysisSessionCompleted`

Payloads exclude raw audio, passwords, or tokens to prevent data leakage.

