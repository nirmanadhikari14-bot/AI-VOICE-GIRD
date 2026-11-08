# Phase 22 — Mobile Security App (VoiceGuard AI)
**Project**: VoiceGuard AI  
**SIH Problem Statement**: SIH26104 — AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks

---

## 1. Executive Summary & Architecture
Phase 22 implements the official mobile security application for VoiceGuard AI within `voiceguard-ai/mobile`. It connects directly to the FastAPI backend, providing real-time and near-real-time telephony threat monitoring, synthetic voice detection alerts, explainable risk assessments, incident management, gatekeeper prevention actions, secondary out-of-band verification workflows, and user threat reporting.

### High-Level Architecture
```
                         +-----------------------------------+
                         |       FastAPI Backend (:8000)     |
                         |  (Auth, Risk, Alerts, Incidents,  |
                         |   Prevention, Calls, Verification)|
                         +-----------------+-----------------+
                                           ^
                          REST (JSON)      |   WebSocket Stream
                          & Bearer JWT     |   (/ws/v1/test, /ws/v1/stream)
                                           v
+---------------------------------------------------------------------------------+
|                       VoiceGuard AI Mobile App (`mobile/`)                      |
|                                                                                 |
|  [AppNavigator] -------------------------------------------------------------+  |
|  ├── Bottom Tabs: Home | Alerts | Security (Live) | Incidents | Profile     |  |
|  └── Stack: AlertDetail | RiskExplanation | CallDetail | IncidentDetail ... |  |
|                                                                                 |
|  [State & Cache Layer]                                                          |
|  ├── TanStack Query: Server state, controlled polling fallback, cache clearing  |
|  ├── AuthProvider: JWT session restoration, auto-logout on 401                  |
|  └── SecureStorage: Keyring/Keychain encrypted storage (no tokens in plain logs)|
+---------------------------------------------------------------------------------+
```

---

## 2. Repository Audit Findings & API Integration

### Monorepo Structure
- `voiceguard-ai/backend`: FastAPI application, SQLite database (`voiceguard.db`), SQLAlchemy ORM (`app/models/domain.py`).
- `voiceguard-ai/frontend`: Web React + Vite dashboard.
- `voiceguard-ai/mobile`: **New Phase 22 Mobile Application**. Built with React Native & TypeScript strict mode.

### Backend Endpoints Audited & Integrated
| Capability / Phase | Endpoint | Methods | Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth/login`, `/api/v1/auth/me` | POST, GET | Fully integrated with Bearer JWT |
| **Phase 17 Risk Assessment** | `/api/v1/risk/latest`, `/api/v1/risk/{id}` | GET | Integrated with live risk scoring |
| **Phase 18 Explainability** | `/api/v1/risk/explain/{call_id}` | GET | Integrated with acoustic evidence breakdown |
| **Phase 19 Alerts** | `/api/v1/alerts`, `/api/v1/alerts/{id}/acknowledge`, `/dismiss` | GET, POST | Integrated with alert acknowledgment |
| **Phase 20 Prevention** | `/api/v1/prevention/actions`, `approve`, `execute` | GET, POST | Integrated with policy countermeasures |
| **Phase 21 Incidents** | `/api/v1/incidents`, `notes`, `status` | GET, POST | Integrated with incident notes and triage |
| **Secondary Verification** | `/api/v1/verification/request`, `status`, `verify` | GET, POST | Integrated with out-of-band challenge |
| **Device Notifications** | `/api/v1/devices/register`, `/api/v1/devices/{token}` | POST, DELETE | Integrated with device registration |
| **Threat Reporting** | `/api/v1/reports/suspicious` | POST | Integrated with user suspicious report form |
| **Live Telephony Sessions** | `/api/v1/calls/active`, `/api/v1/calls/{id}` | GET | Integrated with live session telemetry |
| **WebSocket Stream** | `/ws/v1/test`, `/ws/v1/audio` | WS | Real-time events with polling fallback |

---

## 3. Mobile Security Baseline
1. **Secure Storage**: Authentication tokens (`access_token`, `token_type`) and sensitive credentials are encrypted using `secureStorage`. They are never placed in unencrypted localStorage or exposed in console logs.
2. **Session Lifecycle**: On sign-out, session tokens are permanently wiped, device notification tokens are unregistered on the backend, and TanStack query caches are cleared to eliminate cross-user data exposure on shared devices.
3. **Payload Sanitization**: Incoming push notification payloads are validated against `PushNotificationPayloadSchema` via Zod. Payloads with unauthorized types, OTP codes, or raw credentials are rejected.
4. **Platform Telephony Constraints**: Mobile operating systems (iOS and Android) do not permit ordinary applications to arbitrarily wiretap or intercept cellular telephone calls without carrier trunking or enterprise PBX integration. The mobile app explicitly presents this notice and connects to monitored enterprise SIP/VoIP extensions and user-authorized audio recordings.

---

## 4. Setup & Running Instructions

### 1. Backend Preparation
```bash
cd voiceguard-ai/backend

# Activate Python virtual environment
.\venv\Scripts\activate      # Windows
# or: source venv/bin/activate # macOS/Linux

# Create database tables and seed security scenario
python seed_demo_data.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Mobile Application Execution
```bash
cd voiceguard-ai/mobile

# Run test suite
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Start Expo / React Native bundler
npm start
```

### Seeded Credentials for Testing
- **Email**: `security@voiceguard.ai`
- **Password**: `VoiceGuard2026!`

---

## 5. Demonstration Walkthrough Scenario: Potential Voice-Cloning Attack

1. **Sign In**: Launch the mobile app and sign in with `security@voiceguard.ai` / `VoiceGuard2026!`.
2. **Security Status & Risk Assessment**: The dashboard displays the live system status (`CRITICAL WARNING: Additional Verification Required`), calibrated threat index (`94%`), caller number (`+1 (555) 847-2901`), and active session.
3. **Open Alert**: Tap the top alert (`Synthetic Voice Detected in Active Call`). Inspect the threat details, model confidence (`97%`), and tap **Acknowledge Alert**.
4. **View Risk Explanation**: Tap **AI Risk & Explainability Breakdown**. Review:
   - *Observed Acoustic Evidence*: Vocoder artifacts, atypical acoustic jitter (`0.082`), phase discontinuity (`0.88`).
   - *Model Inference*: Conformer model flagged synthetic speech probability.
   - *Automated Policy*: Wire Desk Policy #104 activated transaction block.
   - *Executed Actions*: Real-time stream flagged, supervisor alert generated.
5. **Inspect Incident Dossier**: Navigate to **Incidents**, select `INC-2026-0881` (`Executive Impersonation Attempt on Treasury Wire Desk`). View the timeline notes, add an analyst note (`"Analyst verified CFO was on a flight"`), and change status to `INVESTIGATING`.
6. **Execute Prevention Action**: Navigate to **Prevention Actions**, review the proposed action (`isolate_session` by `VoiceGuard Gatekeeper Engine`), click **Approve Action**, and click **Execute Countermeasure**. The outcome is recorded and confirmed.
7. **Complete Secondary Verification**: Tap **Verify Identity**, challenge the user via pre-enrolled trusted mobile push, and click **Confirm Authentic** or **Reject / Impersonator**.
8. **Report Suspicious Interaction**: Open **Report Call**, fill in the suspicious interaction form with consent acknowledgment, and submit. An incident is automatically created in the triage queue.
9. **Sign Out**: Open **Settings**, toggle Biometric App Lock, and tap **Sign Out**. All tokens and query caches are cleanly purged.
