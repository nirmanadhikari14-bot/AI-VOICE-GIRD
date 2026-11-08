# VoiceGuard AI — Module Dependency & Integration Matrix
## Phase 29: Integration Layer (SIH26104)

---

## 1. Verified Module Inventory & Integration Status

| Subsystem / Module | Exists | Executable | API Available | Tested | Integration Status | Evidence File Path |
|---|---|---|---|---|---|---|
| **Audio Ingestion & Ring Buffer** | Yes | Yes | WS `/ws/v1/audio` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/services/streaming_audio_pipeline.py` |
| **Voice Authenticity Detection** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `ai-engine/evaluation/adapters/synthetic_voice_adapter.py` |
| **Speaker Verification** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `ai-engine/evaluation/adapters/speaker_verification_adapter.py` |
| **Prosody & F0 Analysis** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `ai-engine/evaluation/adapters/prosody_adapter.py` |
| **Multilingual LID (13 Indic Languages)** | Yes | Yes | `GET /api/v1/multilingual/languages` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/modules/multilingual/service.py` |
| **Speech-to-Text (IndicWhisper)** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `ai-engine/evaluation/adapters/asr_adapter.py` |
| **NLP Social Engineering** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `ai-engine/evaluation/adapters/nlp_social_engineering_adapter.py` |
| **Threat Intelligence** | Yes | Yes | `GET /api/v1/threats/indicators` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/threats.py` |
| **Caller & Telephony Intelligence** | Yes | Yes | `GET /api/v1/calls` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/calls.py` |
| **Central Risk Engine (Phase 17)** | Yes | Yes | `GET /api/v1/risk/latest` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/modules/integration/risk_evaluator.py` |
| **Explainability Engine (Phase 18)** | Yes | Yes | `GET /api/v1/risk/explain/{id}` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/risk.py` |
| **Alert Engine (Phase 19)** | Yes | Yes | `GET /api/v1/alerts` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/alerts.py` |
| **Prevention Engine (Phase 20)** | Yes | Yes | `GET /api/v1/prevention/actions` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/prevention.py` |
| **Incident Management (Phase 21)** | Yes | Yes | `GET /api/v1/incidents` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/api/v1/incidents.py` |
| **Mobile App (Phase 22)** | Yes | Yes | React Native Client | Yes | `COMPLETED_AND_VERIFIED` | `mobile/src/api/` |
| **Windows Console (Phase 23)** | Yes | Yes | Electron Client | Yes | `COMPLETED_AND_VERIFIED` | `desktop/src/api/` |
| **Admin Portal (Phase 24)** | Yes | Yes | Web Console | Yes | `COMPLETED_AND_VERIFIED` | `frontend/src/features/admin/pages/IntegrationOrchestratorAdmin.tsx` |
| **Security & Privacy Hardening (Phase 25)** | Yes | Yes | Middleware & Tenant RBAC | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/core/security_hardening.py` |
| **Model Evaluation (Phase 27)** | Yes | Yes | `POST /api/v1/evaluations/runs` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/modules/evaluation/` |
| **Performance Optimization (Phase 28)** | Yes | Yes | Cache + Inference Pool | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/services/inference_worker_pool.py` |
| **Analysis Orchestrator (Phase 29)** | Yes | Yes | `POST /api/v1/analysis` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/modules/integration/orchestrator.py` |
| **Integration Event Bus (Phase 29)** | Yes | Yes | `GET /api/v1/analysis/events` | Yes | `COMPLETED_AND_VERIFIED` | `backend/app/modules/integration/event_bus.py` |

---

## 2. Cross-Subsystem Communication Rules

1. **Authentication Boundary:** Every request to `/api/v1/analysis` requires a valid Bearer JWT. Unauthenticated requests are rejected with `HTTP 401 Unauthorized`.
2. **Tenant Boundary:** The `organization_id` is extracted strictly from the validated JWT token claims, never trusted from an unverified client body parameter.
3. **DPDP Act Biometric Consent:** Affirmative consent (`consent_confirmed = True`) is mandatory unless flagged under `emergency_investigation` profile.
4. **Authoritative Risk Scoring:** Only `CentralRiskEvaluator` computes risk scores. Individual modules only produce local feature outputs.
5. **Deduplication:** Repeated requests with identical `idempotency_key` return the cached response, preventing duplicated alert or prevention triggers.

