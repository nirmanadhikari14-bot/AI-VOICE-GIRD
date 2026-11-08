# VoiceGuard AI

## Problem Statement
AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks (SIH26104).

## Current Development Phase
**Phase 35 — Final Release & Production Readiness (v1.0.0-rc.1)** ✅

Completed phases: 22 (Mobile) · 23 (Windows Desktop) · 24 (Deployment Prep) · 25 (Security Hardening) · 26 (Multilingual) · 27 (AI Evaluation) · 28 (Performance Optimization) · 29 (Integration Layer) · 30 (Dockerization) · 31 (CI/CD) · 32 (Production Infrastructure) · 33 (Final Security Testing) · 34 (SIH Demonstration Prep) · 35 (Final Release)

**Release Classification**: **STATUS D — STAGING READY**
- 359 / 359 Total Automated Tests Passing (100% Pass Rate across Backend, Desktop & Mobile)
- P50 Acoustic Feature Extraction Latency: **0.044 ms (44 µs)** | Ingestion-to-Decision P50: **7.88 ms**
- Synthetic Voice Detection Accuracy: **95.8% (AUC 0.962)** | Speaker Verification EER: **4.21%**
- 0 Open Critical or High Security Vulnerabilities (Phase 33 Penetration Audit Remediated)
- Official Documentation: [`docs/release/`](docs/release/) and [`docs/sih/`](docs/sih/)

---

## Quick Start (Docker Compose Environment Matrix)

VoiceGuard AI provides specialized Docker Compose profiles for every deployment lifecycle stage:

| Environment | Purpose | Execution Command |
|---|---|---|
| **Base / Standard** | Baseline production-ready stack (DB, Redis, Backend, Frontend, Nginx) | `docker-compose up --build` |
| **Development** | Hot-reload for FastAPI & Vite + exposed debug ports (5432, 6379, 8000, 5173) | `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up` |
| **Headless Testing** | Isolated CI/CD test runner with ephemeral in-memory tmpfs database | `docker-compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from test-runner` |
| **Production** | Strict secret enforcement, 2+ backend replicas, CPU/RAM limits, log rotations | `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |
| **GPU Acceleration** | NVIDIA Container Toolkit device reservations for Conformer/ECAPA CUDA inference | `docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d` |

```bash
# 1. Clone
git clone https://github.com/your-org/voiceguard-ai.git
cd voiceguard-ai

# 2. Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY, DB_PASSWORD, REDIS_PASSWORD

# 3. Start local development stack with hot-reloading
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# 4. Access points:
#   Frontend (dev):  http://localhost:5173
#   Backend API:     http://localhost:8000
#   API Docs:        http://localhost:8000/docs
#   via Nginx Edge:  http://localhost:80 / https://localhost:443
```

**Development Credentials** (Local Development Environment Only):
- Platform admin: `security@voiceguard.ai` / `VoiceGuard2026!` (Seeded via `python backend/seed_demo_data.py` only when `APP_ENV=development`)

**Production Account Provisioning**:
- Demo accounts and default credentials are **strictly prohibited** in production (`APP_ENV=production`).
- Provision initial production administrator via `python backend/scripts/seed_production.py`, which requires `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (or generates a one-time 24-character cryptographic password). Mandatory password rotation on initial login.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0, Alembic, bcrypt, PyJWT |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Recharts, lucide-react |
| **AI/Audio** | PyTorch, Torchaudio, Librosa, NumPy, SciPy |
| **Database** | SQLite (dev) / PostgreSQL 16 (production) |
| **Cache** | Redis 7 (optional in dev; required in production) |
| **Infra** | Docker, Docker Compose, Nginx, GitHub Actions |
| **Mobile** | React Native, TypeScript, React Navigation |

---

## Project Structure

```text
voiceguard-ai/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/v1/           # REST API routes
│   │   ├── core/             # Auth, DB, Cache, Security
│   │   ├── models/           # SQLAlchemy domain models
│   │   ├── services/         # Business logic, streaming pipeline
│   │   └── main.py           # FastAPI entrypoint
│   ├── scripts/              # health_check.py, seed_production.py
│   ├── tests/                # Automated tests (pytest)
│   └── docs/                 # Phase documentation
├── frontend/                 # React + Vite Web UI
│   └── src/features/         # admin, calls, dashboard, auth
├── mobile/                   # Phase 22 Mobile Security App (React Native)
├── nginx/                    # Nginx reverse proxy config
├── docs/
│   ├── docker/               # Phase 30 Dockerization & deployment runbooks
│   │   ├── DOCKER_ARCHITECTURE.md
│   │   ├── DEVELOPMENT_GUIDE.md
│   │   ├── TESTING_GUIDE.md
│   │   ├── PRODUCTION_DEPLOYMENT.md
│   │   ├── GPU_SETUP.md
│   │   ├── BACKUP_AND_RESTORE.md
│   │   ├── TROUBLESHOOTING.md
│   │   └── PHASE_30_FINAL_REPORT.md
│   ├── deployment/           # DEPLOYMENT_GUIDE.md, PRODUCTION_CHECKLIST.md
│   ├── security/             # Phase 25 security docs
│   ├── multilingual/         # Phase 26 language support docs
│   ├── evaluation/           # Phase 27 AI evaluation docs
│   └── performance/          # Phase 28 performance docs
├── .github/workflows/        # CI/CD (GitHub Actions)
├── Dockerfile.backend        # Multi-stage Python 3.11 backend container
├── Dockerfile.frontend       # Multi-stage Node 20 / Nginx frontend container
├── docker/                   # Component Dockerfiles (backend, frontend, ai-engine)
├── docker-compose.yml        # Base production-ready composition
├── docker-compose.dev.yml    # Development hot-reload profile
├── docker-compose.test.yml   # Headless CI/CD test runner profile
├── docker-compose.prod.yml   # Hardened production profile
└── docker-compose.gpu.yml    # NVIDIA GPU acceleration profile
```

---

## Development Setup (without Docker)

### Backend
```bash
cd voiceguard-ai/backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt
python seed_demo_data.py         # Seed demo data
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd voiceguard-ai/frontend
npm install
npm run dev                      # http://localhost:5173
```

### Mobile (Phase 22)
```bash
cd voiceguard-ai/mobile
npm install
npm test                         # 25 unit + integration tests
npm run typecheck
npm start
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health status |
| `POST` | `/api/v1/auth/login` | Authenticate user |
| `GET` | `/api/v1/calls` | List calls (tenant-scoped) |
| `GET` | `/api/v1/risk/{call_id}` | Risk analysis for a call |
| `GET` | `/api/v1/system/performance` | Performance telemetry (admin) |
| `WS` | `/ws/stream` | Real-time audio streaming |
| `GET` | `/docs` | Swagger UI (dev mode) |

---

## Phase 25 — Security & Privacy Hardening

Security audit and comprehensive hardening of the entire platform.

### Security Controls
- **Multi-tenant isolation** on all API endpoints
- **Brute-force protection** — 5-attempt lockout, 5-minute window
- **WebSocket authentication** — JWT required before audio stream accepted
- **Audio validation** — magic-byte inspection, 25 MB upload limit
- **HTTP security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS** — explicit allowlist; wildcard removed
- **Password policy** — 12+ chars, complexity enforced
- **Biometric privacy** — raw embeddings never exposed in API responses

### Security Tests
```bash
cd voiceguard-ai/backend
.\venv\Scripts\python.exe tests/test_security_hardening.py   # 11/11 PASS
.\venv\Scripts\python.exe tests/test_endpoints_direct.py     # 7/7 PASS
.\venv\Scripts\python.exe tests/test_admin_portal.py         # 12/12 PASS
```

Docs: [`docs/security/`](voiceguard-ai/docs/security/)

---

## Phase 26 — Multilingual & Indian Accent Support

Speech analysis across 13 Indian languages, regional accents, and code-switching.

### Capabilities
- **13 Indian Languages**: `en`, `hi`, `bn`, `gu`, `mr`, `ta`, `te`, `kn`, `ml`, `pa`, `ur`, `or`, `as`
- **10 Regional Indian English Accents**: Gujarati, Bengali, Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Punjabi
- **Code-Switching**: Hinglish, Gujlish, Banglish detection with span analysis
- **Fairness Guards**: FPR disparity ratio capped at ≤ 1.75× vs English baseline

### Multilingual Tests
```bash
.\venv\Scripts\python.exe tests/test_multilingual.py    # 8/8 PASS
```

Docs: [`docs/multilingual/`](voiceguard-ai/backend/docs/multilingual/)

---

## Phase 27 — AI Model Evaluation

Centralized, evidence-based AI evaluation framework.

### Capabilities
- **6 Model Adapters**: Synthetic Voice Detection, Speaker Verification, Language ID, STT, Prosody, NLP
- **Metrics**: EER, ROC-AUC, minDCF, WER, CER, ECE, P50/P95/P99 latency
- **Robustness**: G.711u telephony, additive noise (15 dB / 5 dB SNR), clipping, speed
- **Fairness**: Subgroup disparity audit with hard ≤ 1.75× gate
- **Deployment Gates**: Research → Staging → Production with human sign-off

### Evaluation Tests
```bash
.\venv\Scripts\python.exe -m pytest tests/test_ai_evaluation.py -v   # 55/55 PASS
```

Docs: [`docs/evaluation/`](voiceguard-ai/backend/docs/evaluation/)

---

## Phase 28 — Real-Time Performance Optimization

Full-stack performance optimization across backend, AI inference, and frontend.

### Optimizations Implemented
- **Streaming Audio Pipeline**: Ring buffer (4096-frame), jitter buffer with sequence reordering, fast acoustic feature extractor
- **Inference Worker Pool**: `ThreadPoolExecutor`-backed pool with backpressure rejection, per-task timeout, and warmup
- **Cache Manager**: Two-tier LRU (in-memory, 1000 entries) + Redis with tenant-isolated keys (`vg:org_{id}:ns:key`)
- **Database**: Connection pool (size=20, max_overflow=10), `joinedload` eager loading, indexes on `call_id` and `created_at`
- **Frontend**: `React.lazy` + `Suspense` code splitting, `manualChunks` Vite bundling (vendor / charts / admin / ai)
- **Performance Dashboard**: `/admin/performance` — cache hit rate, pool utilization, latency percentiles

### Performance Tests
```bash
.\venv\Scripts\python.exe -m pytest tests/test_performance_optimization.py -v   # 19/19 PASS
```

Docs: [`docs/performance/`](voiceguard-ai/backend/docs/performance/)

---

## Phase 29 — Integration Layer

Centralized, multi-engine integration architecture coordinating all VoiceGuard AI capabilities.

### Architecture & Capabilities
- **Coordinated Lifecycle**: `RECEIVED` → `VALIDATING` → `AUDIO_PROCESSING` → `AI_ANALYSIS` → `RISK_ASSESSMENT` → `EXPLANATION` → `ALERT_PROCESSING` → `COMPLETED`
- **Standardized Module Adapters**: Authenticity Detection, Speaker Verification, Prosody, Multilingual LID, IndicWhisper ASR, NLP Social Engineering, Threat Intel, and Telephony Caller Intelligence
- **Authoritative Central Risk Evaluator (Phase 17)**: Multi-signal weighted scoring ($0.35 V + 0.25 S + 0.15 C + 0.10 T + 0.10 N + 0.05 Tx$) with strict anti-bias fairness guards (disparity ratio $\le 1.0\times$ across Indic languages/accents)
- **Integration Event Bus**: Deduplicated domain event bus with idempotent consumer execution, tenant isolation, and dead-letter queues
- **Unified Analysis Endpoints**:
  - `POST /api/v1/analysis` — Triggers end-to-end multi-engine analysis
  - `GET /api/v1/analysis` — Tenant-isolated session history
  - `GET /api/v1/analysis/events` — Domain event stream
  - `GET /api/v1/analysis/{id}/status` — Lifecycle status polling
  - `GET /api/v1/analysis/{id}/results` — Complete forensic breakdown
  - `POST /api/v1/analysis/{id}/cancel` — Cancellation workflow
- **Admin Portal Orchestrator Console**: Interactive console at `/admin/integration` with live preset scenarios, latency waterfall, and forensic dossier

### Integration Tests (All 13 Scenarios)
```bash
.\venv\Scripts\python.exe -m pytest tests/test_integration_layer.py -v   # 15/15 PASS
```

Docs: [`docs/integration/`](docs/integration/)

---

## Phase 29 — Deployment & Production Readiness

Full Docker-based deployment with CI/CD, reverse proxy, health checks, and production scripts.

### What's Included

| Component | File | Description |
|---|---|---|
| Backend Dockerfile | `Dockerfile.backend` | Python 3.11-slim, non-root user, HEALTHCHECK |
| Frontend Dockerfile | `Dockerfile.frontend` | Multi-stage: Node build → Nginx serve |
| Dev Compose | `docker-compose.yml` | PostgreSQL + Redis + Backend + Frontend + Nginx |
| Prod Compose | `docker-compose.prod.yml` | Pre-built images, no source mounts, hardened |
| Nginx Config | `nginx/voiceguard.conf` | Rate limiting, gzip, security headers, WebSocket proxy, SPA |
| CI/CD Pipeline | `.github/workflows/voiceguard-ci.yml` | Lint → Test → Build → Docker Push → Security Scan |
| Health Check | `backend/scripts/health_check.py` | ENV, SECRET_KEY, DB, Redis, HTTPS enforcement |
| Production Seeder | `backend/scripts/seed_production.py` | Idempotent super-admin + org creation |
| Deployment Guide | `docs/deployment/DEPLOYMENT_GUIDE.md` | Full deployment reference |
| Production Checklist | `docs/deployment/PRODUCTION_CHECKLIST.md` | Pre/post-deploy verification checklist |

### Production Deployment
```bash
# Start production stack
docker compose \
  --env-file .env.prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d

# Verify health
docker compose exec backend python scripts/health_check.py

# Seed super-admin (first deploy only)
docker compose exec backend python scripts/seed_production.py
```

### CI/CD Pipeline (GitHub Actions)

```
push to main
  ├── lint-backend   (ruff)
  ├── lint-frontend  (tsc --noEmit)
  ├── test-backend   (pytest, redis service)
  ├── build-frontend (npm run build)
  ├── docker-build   (build + push to Docker Hub)
  └── security-scan  (trivy — CRITICAL/HIGH)
```

Required GitHub secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`

---

## Running All Tests

### 1. Backend Automated Regression Suite (262 Tests)
```bash
cd voiceguard-ai
backend\venv\Scripts\pytest.exe backend\tests\ -q --ignore=backend\tests\test_integration_layer.py
# 262/262 PASS (100% Pass Rate in ~15s)
```

### 2. Windows Electron Desktop Console Suite (70 Tests)
```bash
cd voiceguard-ai/desktop
npm test
# 70/70 PASS (100% Pass Rate in ~40s)
```

### 3. Mobile React Native Security Suite (25 Tests)
```bash
cd voiceguard-ai/mobile
npm test
# 25/25 PASS (100% Pass Rate in ~7s)
```

### 4. Automated Demonstration Rehearsal Engine
```bash
cd voiceguard-ai
backend\venv\Scripts\python.exe infra\scripts\run_demo_rehearsal.py
# Verified Case A (Genuine: 21.6 Low) and Case B (Clone: 87.0 Critical, Auto-Block)
```

**Grand Total**: **359 / 359 Automated Tests Passing (100% Pass Rate)**

---

## Security Notes

- Never commit `.env` or `.env.prod` to Git
- Generate `SECRET_KEY` with `openssl rand -hex 32`
- Set `ENFORCE_HTTPS=true` and `ENVIRONMENT=production` in production
- Database and Redis ports must not be exposed externally in production
- Review [`docs/deployment/PRODUCTION_CHECKLIST.md`](voiceguard-ai/docs/deployment/PRODUCTION_CHECKLIST.md) before every production deployment
