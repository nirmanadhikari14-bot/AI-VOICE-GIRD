# VoiceGuard AI — Phase 23 Repository & Desktop Architecture Audit

## 1. Project & Monorepo Structure
- **Root Directory**: `voiceguard-ai/`
- **Sub-applications**:
  - `backend/`: FastAPI backend with SQLite database (`voiceguard.db`), SQLAlchemy models (`domain.py`), JWT Auth, and WebSocket streaming (`/ws/v1/test`, `/ws/v1/audio`).
  - `frontend/`: Web application built with React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts.
  - `mobile/`: Mobile application built with React Native, TypeScript, React Navigation, and TanStack Query.
  - `desktop/`: **New Phase 23 Windows Security Console**. Dedicated enterprise desktop application built with Electron, React, TypeScript, Vite, and TanStack Query.

## 2. Desktop Framework & Technology Strategy
- **Platform**: Electron + React + TypeScript + Vite.
- **Security Baseline**:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - Sandbox enabled.
  - Controlled preload bridge exposing strictly allowlisted APIs via `contextBridge.exposeInMainWorld('voiceguardDesktop', ...)`.
  - Content Security Policy (CSP) blocking unauthorized scripts, evaluators, and external origins.
  - Navigation lockdown: interception of `will-navigate` and `setWindowOpenHandler` to prevent arbitrary window navigation or remote code execution. External links route to the system default browser.
  - Platform-backed encrypted storage for session credentials.

## 3. Authoritative Backend APIs Integrated
- **Authentication**: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- **Phase 17 Central Risk Engine**: `GET /api/v1/risk/latest`, `GET /api/v1/risk/{id}`.
- **Phase 18 Explainable AI**: `GET /api/v1/risk/explain/{call_id}` (Observed evidence, model inference, policy triggers, recommended vs executed actions, contradictory & missing signals).
- **Phase 19 Alert Management**: `GET /api/v1/alerts`, `POST /api/v1/alerts/{id}/acknowledge`, `POST /api/v1/alerts/{id}/dismiss`.
- **Phase 20 Prevention Engine**: `GET /api/v1/prevention/actions`, `POST /approve`, `POST /execute`.
- **Phase 21 Incident Management**: `GET /api/v1/incidents`, `POST /incidents`, `POST /notes`, `POST /status`.
- **Phase 16 Threat Intelligence**: `GET /api/v1/threats/indicators`, `POST /indicators`.
- **Audit Logs**: `GET /api/v1/audit/logs`, `POST /logs`.
- **System Health**: `GET /api/v1/system/health`.
- **Global Search**: `GET /api/v1/search?q=...`.
- **Live Calls & Forensics**: `GET /api/v1/calls/active`, `GET /api/v1/calls/{id}`.
- **Real-Time Stream**: WebSocket `/ws/v1/test` and `/ws/v1/audio` with bounded controlled polling fallback.

## 4. UI/UX SOC Console Design System
- Theme: Deep charcoal/near-black (`#0a0b0f`, `#0f1117`, `#13151c`), VoiceGuard AI warm orange accent (`#f97316`).
- Risk classification color scheme: Critical (Red `#ef4444`), High (Orange `#f97316`), Medium (Yellow `#f59e0b`), Low/Verified (Green `#10b981`), Nominal (`#6b7280`).
- Desktop layout:
  - Left Sidebar with primary security navigation sections.
  - Top Navigation with global search, connection indicator, notification bell, and analyst profile.
  - Main Workspace with data tables, live telemetry, audio forensic spectrogram metadata, and investigation drawers.

