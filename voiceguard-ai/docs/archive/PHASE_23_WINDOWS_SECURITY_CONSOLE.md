# Phase 23 — Windows Security Console
## Project: VoiceGuard AI | SIH Problem Statement: SIH26104

---

## 1. Overview

Phase 23 delivers the **VoiceGuard AI Windows Security Console** — a production-grade Electron desktop application for Security Operations Center (SOC) analysts, fraud investigators, and enterprise security administrators.

The console connects to the VoiceGuard AI backend and provides centralized real-time monitoring, forensic investigation, alert management, incident triage, prevention control, and threat intelligence for AI-powered voice cloning attack detection.

---

## 2. Architecture

```
voiceguard-ai/desktop/
├── electron/                        # Main process (Node.js / Electron)
│   ├── main.ts                      # App lifecycle, sandbox bootstrap
│   ├── preload.ts                   # Secure contextBridge API surface
│   ├── ipc/handlers.ts              # Whitelisted IPC channel handlers
│   ├── security/csp.ts              # Content Security Policy enforcement
│   ├── notifications/desktopNotifier.ts  # Native OS notification bridge
│   └── window/windowManager.ts     # Locked-down BrowserWindow factory
│
├── src/                             # Renderer process (React / TypeScript)
│   ├── main.tsx                     # React 19 entry point
│   ├── app/
│   │   ├── App.tsx                  # Root layout: Sidebar + Topbar + Views
│   │   └── providers/
│   │       ├── AuthProvider.tsx     # JWT session management
│   │       └── QueryProvider.tsx   # TanStack Query client
│   │
│   ├── api/
│   │   ├── client.ts               # Centralized API client (GET/POST/PATCH/PUT/DELETE)
│   │   ├── endpoints.ts            # All backend endpoint constants
│   │   ├── errors.ts               # Error class hierarchy + normalizeError
│   │   └── contracts/schemas.ts    # Zod response schemas
│   │
│   ├── types/index.ts              # Shared TypeScript domain types
│   ├── theme/                      # Design tokens (colors, spacing, typography)
│   ├── utils/formatters.ts         # Date, percent, phone, severity utilities
│   │
│   ├── components/
│   │   ├── common/                 # Badge, Button, Card, Input, Feedback
│   │   └── layout/                 # Sidebar, Topbar
│   │
│   ├── services/
│   │   ├── secureStorage/          # Session vault (sessionStorage + memory)
│   │   ├── realtime/               # WebSocket + polling fallback
│   │   └── export/                 # CSV / JSON file export via IPC
│   │
│   └── features/
│       ├── auth/LoginView.tsx
│       ├── dashboard/DashboardView.tsx
│       ├── live-monitoring/LiveMonitoringView.tsx
│       ├── calls/CallInvestigationView.tsx
│       ├── voice-forensics/VoiceForensicsView.tsx
│       ├── speaker-verification/SpeakerVerificationView.tsx
│       ├── risk-engine/RiskAnalysisView.tsx
│       ├── explainability/ExplainabilityView.tsx
│       ├── alerts/AlertManagementView.tsx
│       ├── incidents/IncidentCenterView.tsx
│       ├── prevention/PreventionMonitoringView.tsx
│       ├── threat-intelligence/ThreatIntelligenceView.tsx
│       ├── search/GlobalSearchView.tsx
│       ├── audit/AuditLogsView.tsx
│       ├── system-health/SystemHealthView.tsx
│       └── settings/ConsoleSettingsView.tsx
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Desktop Runtime | Electron 34 |
| UI Framework | React 19 + TypeScript 5.7 |
| Build Tool | Vite 6 |
| State / Data Fetching | TanStack Query 5 |
| Schema Validation | Zod 3 |
| Testing | Jest 29 + ts-jest |
| Styling | Inline CSS-in-JS (no external CSS runtime) |

---

## 4. Security Baseline

| Control | Implementation |
|---|---|
| `contextIsolation` | `true` — renderer has no Node.js access |
| `nodeIntegration` | `false` — no raw Node APIs in renderer |
| `sandbox` | `true` — Chromium OS sandbox enabled |
| Preload Bridge | `contextBridge.exposeInMainWorld('voiceguardDesktop', ...)` |
| IPC Allowlist | 6 whitelisted channels only |
| Navigation Lock | `will-navigate` intercepted; external links → OS browser |
| Content Security Policy | Strict `script-src 'self'` applied via session `onHeadersReceived` |
| Auth Storage | `sessionStorage` + memory fallback (no `localStorage`) |
| Token Handling | `Bearer <JWT>` header via centralized API client only |

---

## 5. Feature Views

| View | Phase Coverage | API Consumed |
|---|---|---|
| Login | Auth | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| SOC Dashboard | Overview | calls, alerts, incidents, threats |
| Live Monitoring | Real-time | `GET /api/v1/calls` (3s polling) |
| Call Investigation | Forensics | `GET /api/v1/calls`, `GET /api/v1/calls/{id}` |
| Voice Forensics | Phase 7 | Acoustic metrics (displayed from call risk data) |
| Speaker Verification | Phase 8 | Cosine similarity, biometric profiles |
| Risk Analysis (P17) | Phase 17 | Interactive multi-signal weighted scoring |
| Explainable AI (P18) | Phase 18 | XAI audit dossier, counterfactual reasoning |
| Alert Management | Phase 19 | `GET /api/v1/alerts`, acknowledge, dismiss |
| Incident Center | Phase 21 | `GET /api/v1/incidents`, notes, status transitions |
| Prevention Monitoring | Phase 20 | `GET /api/v1/prevention/actions`, approve, execute |
| Threat Intelligence | Phase 16 | `GET /api/v1/threats/indicators`, create IOC |
| Global Search | Cross-entity | `GET /api/v1/search?q=...` |
| Audit Logs | Audit | `GET /api/v1/audit/logs` + CSV export |
| System Health | Diagnostics | `GET /api/v1/system/health` |
| Console Settings | Config | API URL, session management, sign out |

---

## 6. Backend Requirements

The desktop app requires the VoiceGuard AI backend running at `http://127.0.0.1:8000` (configurable in settings).

**Analyst Credentials (seeded):**
- Email: `security@voiceguard.ai`
- Password: `VoiceGuard2026!`

**Start the backend:**
```bash
cd voiceguard-ai/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Seed demo data (if needed):**
```bash
cd voiceguard-ai/backend
python seed_demo_data.py
```

---

## 7. Running the Desktop Console

### Development (Renderer only in browser)
```bash
cd voiceguard-ai/desktop
npm run dev
```

### Production Build
```bash
cd voiceguard-ai/desktop
npm run build:all    # builds Vite renderer + Electron main process
```

### Run as Electron App
```bash
cd voiceguard-ai/desktop
npm run start        # starts electron with dist-electron/main.js
```

---

## 8. Test Results

```
Test Suites: 4 passed, 4 total
Tests:       70 passed, 70 total

Coverage:
  formatters.test.ts         — getSeverityColor, formatPercent, formatRelativeTime,
                               formatDateTime, formatDuration, maskPhoneNumber
  validation.test.ts         — email, password, phone, IOC type, severity, risk score
  electronSecurity.test.ts   — contextIsolation, nodeIntegration, sandbox, preload,
                               IPC allowlist, CSP, navigation lock
  apiClient.test.ts          — error class hierarchy, normalizeError, bearer auth,
                               endpoint contract generation
```

**TypeScript:** `tsc --noEmit` exits 0 (renderer + electron configs).  
**Build:** Vite built 118 modules → 433 KB JS (119 KB gzip) in 3.95s.

---

## 9. Missing Backend Dependencies (Documented)

| Feature | Status |
|---|---|
| WebSocket real-time stream (`/ws/v1/events`) | Not yet implemented — console falls back to polling |
| SIP/VoIP audio capture tap | Out of scope (OS-level restriction) — monitored calls are pre-ingested |
| Live audio spectrogram stream | Backend not implemented — spectrogram visualization uses computed features |

---

## 10. File Inventory

**New files created in this phase:**

```
desktop/src/main.tsx
desktop/src/app/App.tsx
desktop/src/app/providers/AuthProvider.tsx
desktop/src/app/providers/QueryProvider.tsx
desktop/src/components/layout/Topbar.tsx
desktop/src/components/layout/Sidebar.tsx
desktop/src/components/common/Badge.tsx
desktop/src/components/common/Button.tsx
desktop/src/components/common/Card.tsx
desktop/src/components/common/Input.tsx
desktop/src/components/common/Feedback.tsx
desktop/src/features/auth/LoginView.tsx
desktop/src/features/dashboard/DashboardView.tsx
desktop/src/features/live-monitoring/LiveMonitoringView.tsx
desktop/src/features/calls/CallInvestigationView.tsx
desktop/src/features/voice-forensics/VoiceForensicsView.tsx
desktop/src/features/speaker-verification/SpeakerVerificationView.tsx
desktop/src/features/risk-engine/RiskAnalysisView.tsx
desktop/src/features/explainability/ExplainabilityView.tsx
desktop/src/features/alerts/AlertManagementView.tsx
desktop/src/features/incidents/IncidentCenterView.tsx
desktop/src/features/prevention/PreventionMonitoringView.tsx
desktop/src/features/threat-intelligence/ThreatIntelligenceView.tsx
desktop/src/features/search/GlobalSearchView.tsx
desktop/src/features/audit/AuditLogsView.tsx
desktop/src/features/system-health/SystemHealthView.tsx
desktop/src/features/settings/ConsoleSettingsView.tsx
desktop/src/tests/unit/formatters.test.ts
desktop/src/tests/unit/validation.test.ts
desktop/src/tests/electron-security/electronSecurity.test.ts
desktop/src/tests/integration/apiClient.test.ts
```

