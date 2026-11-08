# VoiceGuard AI — Phase 22 Repository Audit

## 1. Monorepo & Project Structure
- **Root Directory**: `voiceguard-ai/`
- **Submodules & Directories**:
  - `backend/`: Python FastAPI application with SQLite database (`voiceguard.db`), SQLAlchemy ORM (`app/models/domain.py`), JWT Auth (`app/api/v1/auth.py`), and WebSocket streaming endpoints (`app/api/v1/stream.py`, `/ws/v1/test`).
  - `frontend/`: Web dashboard built with Vite, React 19, TypeScript, Tailwind CSS, Lucide icons, and Recharts. Contains established design tokens (`bg-primary: #0a0b0f`, `accent-orange: #f97316`, threat severity palette) and mock datasets (`mockData.ts`).
  - `ai-engine`, `audio-engine`, `conversation-engine`, `database`, `datasets`, `docs`, `models`, `risk-engine`, `speaker-engine`, `tests`, `threat-intelligence`: Stubs/placeholders from earlier conceptual design.
  - `mobile/`: **Not yet created.** Must be initialized with React Native + TypeScript + React Navigation + TanStack Query.

## 2. Backend Framework, Base Paths & Existing APIs
- **Framework**: FastAPI (Python 3.12+), Uvicorn, SQLAlchemy.
- **Configured Base URL**: `http://localhost:8000` (Default dev).
- **Existing Working APIs**:
  - `GET /api/v1/health`: System health status.
  - `POST /api/v1/auth/login`: OAuth2 password form (`username` = email, `password`), returns `access_token` and `token_type: bearer`.
  - `GET /api/v1/auth/me`: Requires Bearer JWT in `Authorization` header. Returns `{ id, email, name, role_id, status }`.
  - `WS /ws/v1/audio`: WebSocket for receiving PCM 16-bit binary audio chunks.
  - `WS /ws/v1/test`: WebSocket echo test endpoint.

## 3. Gap Analysis — Planned vs Implemented APIs
- **Phase 17 Risk Assessment API**:
  - *Status*: Models exist in `domain.py` (`RiskScore`, `AnalysisResult`, `Call`), but no dedicated REST routes existed in `main.py`.
  - *Action*: Expose `/api/v1/risk/latest`, `/api/v1/risk/{call_id}`, and `/api/v1/risk/explain/{call_id}` using existing `RiskScore` and `AnalysisResult` tables.
- **Phase 18 Explainability API**:
  - *Status*: No separate router.
  - *Action*: Expose through `/api/v1/risk/explain/{call_id}` returning observed features, confidence, missing signals, and policy rationale.
- **Phase 19 Alerts & Notification APIs**:
  - *Status*: Model exists in `domain.py` (`Alert`), but no routes existed.
  - *Action*: Expose `/api/v1/alerts`, `/api/v1/alerts/{id}`, and acknowledge/dismiss actions. Implement `/api/v1/devices/register` for mobile push token association.
- **Phase 20 Prevention APIs**:
  - *Status*: `Policy` model exists in `domain.py`.
  - *Action*: Expose `/api/v1/prevention/actions` and `/api/v1/prevention/actions/{id}/approve` reflecting execution states (proposed, pending approval, executed, failed).
- **Phase 21 Incident Management APIs**:
  - *Status*: Domain has `AuditLog` and `Alert`.
  - *Action*: Expose `/api/v1/incidents`, `/api/v1/incidents/{id}`, note creation, and status transitions.
- **Secondary Verification & Reporting**:
  - *Status*: Domain has `VerificationLog`.
  - *Action*: Expose `/api/v1/verification/request`, `/api/v1/verification/verify`, and `/api/v1/reports/suspicious`.

## 4. Design & Brand Consistency
- Deep charcoal/near-black theme: `#0a0b0f`, `#0f1117`, `#13151c`, `#1e2130`.
- VoiceGuard AI warm orange accent: `#f97316`.
- Severity badges: Critical (`#ef4444`), High (`#f97316`), Medium (`#f59e0b`), Low (`#10b981`), None (`#6b7280`).
- Consistent iconography and typography across Web and Mobile.

## 5. Security & Platform Constraints
- Mobile applications on iOS and Android cannot directly tap or intercept third-party cellular telephone calls without enterprise MDM or dedicated OS call screening APIs.
- The mobile app will provide real-time call security monitoring via authenticated WebSocket/polling for registered enterprise sessions, verification flows, and manual reporting.
- Session tokens are stored in platform-backed secure storage (Keychain/Keystore abstraction). Never logged or stored in plain localStorage.
