# VoiceGuard AI — Container Architecture Specification
## Phase 30: Dockerization (SIH26104)

### 1. Architectural Overview
VoiceGuard AI is containerized using a hardened, multi-tier micro-monolith topology designed for high-throughput real-time voice cloning detection, tenant isolation, and zero-trust perimeter defense.

```
                          [ Client Browser / Mobile / Desktop ]
                                          │
                                     Port 80 / 443
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Nginx Edge Reverse Proxy       │
                         │   - TLS Termination             │
                         │   - Rate Limiting (100 req/s)   │
                         │   - WebSocket Upgrade Proxy     │
                         │   - Security Headers (CSP, HSTS)│
                         └───────┬─────────────────┬───────┘
                                 │                 │
              HTTP / API         │                 │ Static Assets / SPA
        ┌────────────────────────┘                 └───────────────────────┐
        ▼                                                                  ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
│   Backend Application Service   │                       │   Frontend Web Dashboard        │
│   - Python 3.11-slim            │                       │   - Nginx 1.25-alpine           │
│   - FastAPI + Uvicorn Workers   │                       │   - React 18 + Vite SPA Assets  │
│   - Non-root user: voiceguard   │                       │   - Non-root user: nginx        │
│   - Port 8000 (Internal)        │                       │   - Port 80 (Internal)          │
└───────┬─────────────────┬───────┘                       └─────────────────────────────────┘
        │                 │
        │ Internal Network│
        ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│ PostgreSQL 16   │ │ Redis 7 Alpine  │
│ - Port 5432     │ │ - Port 6379     │
│ - Data Volume   │ │ - AOF / RDB     │
│ - Internal Net  │ │ - Internal Net  │
└─────────────────┘ └─────────────────┘
```

---

### 2. Multi-Stage Build Strategy

#### 2.1 Backend Dockerfile (`Dockerfile.backend`)
- **Stage 1 (Builder):**
  - Base: `python:3.11-slim`
  - Compiles C-extensions and installs audio-processing toolchains (`build-essential`, `libsndfile1-dev`, `libportaudio2`, `ffmpeg`).
  - Pre-builds Python wheels into `/root/.cache/pip`.
- **Stage 2 (Runtime):**
  - Base: `python:3.11-slim`
  - Minimal shared runtime libraries (`libsndfile1`, `libportaudio2`, `libgomp1`, `curl`).
  - Strict non-root execution: Creates system group `voiceguard` (GID 1001) and user `voiceguard` (UID 1001).
  - Explicit `PYTHONPATH="/app/backend:/app/ai-engine"` enabling direct modular imports.
  - Health check: Polling `http://localhost:8000/api/v1/health` with 30s interval.

#### 2.2 Frontend Dockerfile (`Dockerfile.frontend`)
- **Stage 1 (Builder):**
  - Base: `node:20-alpine`
  - Installs npm dependencies with layer caching via `package.json` and `package-lock.json`.
  - Compiles TypeScript and runs Vite asset production minification.
- **Stage 2 (Runtime):**
  - Base: `nginx:1.25-alpine`
  - Unprivileged `nginx` user operation (UID 101).
  - Copies built static assets to `/usr/share/nginx/html`.
  - Injects hardened Nginx configuration with SPA fallback rules (`try_files $uri $uri/ /index.html`).

---

### 3. Network Segmentation & Isolation Model
The platform defines three strictly isolated Docker bridge networks:

| Network Name | Docker Identifier | Scope & Routing | Connected Services |
|---|---|---|---|
| `frontend-network` | `voiceguard_frontend_net` | Internal communication between edge proxy and UI container. | `nginx`, `frontend` |
| `backend-network` | `voiceguard_backend_net` | Internal communication between edge proxy, backend APIs, and workers. | `nginx`, `backend`, `ai-worker` |
| `data-network` | `voiceguard_data_net` | **Strictly internal (`internal: true`)**. No outbound internet routing or external packet forwarding. | `backend`, `ai-worker`, `db`, `redis` |

**Security Guarantee:** PostgreSQL and Redis instances are completely unreachable from outside the host and have zero direct internet access.

---

### 4. Storage Persistence & Volume Lifecycle

Five managed Docker volumes protect all platform data:
1. `postgres_data`: Relational data, tenant schema tables, audit logs, and encrypted credentials (`/var/lib/postgresql/data`).
2. `redis_data`: Redis Append-Only File (AOF) and snapshot persistence (`/data`).
3. `model_cache`: Downloaded and warm AI model weights for Conformer, ECAPA-TDNN, Whisper, and Wav2Vec2 (`/app/models`).
4. `audio_storage`: Audio segment streams, forensic WAV artifacts, and acoustic fingerprints (`/app/storage/audio`).
5. `nginx_logs`: Aggregated edge access logs, TLS connection metrics, and rate limit violation logs (`/var/log/nginx`).

