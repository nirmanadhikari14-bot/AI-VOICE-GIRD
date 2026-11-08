# VoiceGuard AI — Deployment Guide

> **Phase 29 — Production Readiness**
> Last updated: November 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development with Docker Compose](#2-local-development-with-docker-compose)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Production Deployment](#4-production-deployment)
5. [Database Migrations](#5-database-migrations)
6. [SSL / TLS Setup with Certbot](#6-ssl--tls-setup-with-certbot)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Health Checks](#8-health-checks)
9. [Monitoring and Logging](#9-monitoring-and-logging)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum version | Purpose |
|---|---|---|
| Docker | 24.x | Container runtime |
| Docker Compose | v2.20+ | Multi-service orchestration |
| Git | 2.x | Source control |
| Python | 3.11+ | Backend (dev without Docker) |
| Node.js | 20 LTS | Frontend (dev without Docker) |

---

## 2. Local Development with Docker Compose

### Quick start

```bash
# Clone the repository
git clone https://github.com/your-org/voiceguard-ai.git
cd voiceguard-ai

# Copy and edit environment variables
cp .env.example .env
# Edit .env — set SECRET_KEY at minimum

# Build and start all services
docker compose up --build

# Access the application
# Frontend (dev):  http://localhost:5173
# Backend API:     http://localhost:8000
# API Docs:        http://localhost:8000/docs
# via Nginx:       http://localhost:80
```

### Individual service management

```bash
# Start a single service
docker compose up backend

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up --build backend

# Stop everything
docker compose down

# Remove volumes (database reset)
docker compose down -v
```

---

## 3. Environment Variables Reference

Create a `.env` file in the `voiceguard-ai/` directory (same directory as `docker-compose.yml`).

### Required

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | JWT signing key — minimum 32 characters, cryptographically random | `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://voiceguard:pass@db:5432/voiceguard` |
| `DB_PASSWORD` | PostgreSQL root password (used by the `db` service) | `str0ng-db-pass!` |

### Recommended (production)

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `REDIS_PASSWORD` | _(empty)_ | Redis AUTH password — set in production |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS-allowed origins, comma-separated |
| `ENVIRONMENT` | `development` | Set to `production` in production |
| `ENFORCE_HTTPS` | `false` | Set to `true` in production |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT access token lifetime |

### Optional

| Variable | Default | Description |
|---|---|---|
| `DB_USER` | `voiceguard` | PostgreSQL username |
| `DB_NAME` | `voiceguard` | PostgreSQL database name |
| `MODEL_CACHE_DIR` | `/app/model_cache` | AI model weights cache directory |
| `BACKEND_REPLICAS` | `2` | Number of backend replicas (prod compose) |
| `API_BASE_URL` | `http://localhost:8000` | Used by health_check.py --include-api |

### Sample `.env.example`

```dotenv
# ── Core ─────────────────────────────────────────────
SECRET_KEY=CHANGE_ME_generate_with_openssl_rand_hex_32
ENVIRONMENT=development
LOG_LEVEL=INFO

# ── Database ─────────────────────────────────────────
DB_USER=voiceguard
DB_PASSWORD=CHANGE_ME
DB_NAME=voiceguard
DATABASE_URL=postgresql+asyncpg://voiceguard:CHANGE_ME@db:5432/voiceguard

# ── Redis ────────────────────────────────────────────
REDIS_PASSWORD=CHANGE_ME_redis
REDIS_URL=redis://:CHANGE_ME_redis@redis:6379/0

# ── Security ─────────────────────────────────────────
ENFORCE_HTTPS=false
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80

# ── Token ────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 4. Production Deployment

### Step 1 — Prepare the server

```bash
# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

### Step 2 — Configure environment

```bash
cp .env.example .env.prod
# Edit .env.prod — set all CHANGE_ME values
# Generate a strong SECRET_KEY:
openssl rand -hex 32
```

### Step 3 — Build images locally (or use CI/CD artifacts)

```bash
docker build -f Dockerfile.backend -t voiceguard/backend:latest .
docker build -f Dockerfile.frontend -t voiceguard/frontend:latest ./frontend
```

Or pull pre-built images from Docker Hub (after CI/CD push):

```bash
docker pull voiceguard/backend:latest
docker pull voiceguard/frontend:latest
```

### Step 4 — Run production compose

```bash
docker compose \
  --env-file .env.prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d
```

### Step 5 — Run migrations and seed

```bash
# Migrations run automatically on backend startup via run_migrations.py
# Verify:
docker compose logs backend | grep -i migration

# Seed super-admin (first deploy only)
docker compose exec backend python scripts/seed_production.py
```

### Step 6 — Verify deployment

```bash
# Health check
docker compose exec backend python scripts/health_check.py

# API health endpoint
curl http://localhost:8000/health
```

---

## 5. Database Migrations

Alembic migrations run automatically when the backend container starts (see [`run_migrations.py`](../../backend/run_migrations.py)).

### Manual migration commands

```bash
# Inside the backend container
docker compose exec backend alembic upgrade head

# Generate a new migration
docker compose exec backend alembic revision --autogenerate -m "describe_change"

# Check current revision
docker compose exec backend alembic current

# View migration history
docker compose exec backend alembic history
```

### Rolling back

```bash
# Roll back one step
docker compose exec backend alembic downgrade -1

# Roll back to specific revision
docker compose exec backend alembic downgrade <revision_id>
```

---

## 6. SSL / TLS Setup with Certbot

### Using Let's Encrypt (recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Obtain certificate (stop nginx first)
docker compose stop nginx
sudo certbot certonly --standalone -d voiceguard.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/voiceguard.example.com/fullchain.pem nginx/certs/cert.pem
sudo cp /etc/letsencrypt/live/voiceguard.example.com/privkey.pem  nginx/certs/key.pem
sudo chown $(whoami) nginx/certs/*.pem

# Update nginx/voiceguard.conf to enable the HTTPS server block
# (Uncomment the SSL server block in the config)

# Restart nginx
docker compose start nginx
```

### Auto-renewal (cron)

```bash
# Add to /etc/cron.d/certbot-renew
0 3 * * * root certbot renew --quiet && \
  cp /etc/letsencrypt/live/voiceguard.example.com/fullchain.pem /path/to/nginx/certs/cert.pem && \
  cp /etc/letsencrypt/live/voiceguard.example.com/privkey.pem  /path/to/nginx/certs/key.pem && \
  docker compose -f /path/to/docker-compose.yml exec nginx nginx -s reload
```

---

## 7. CI/CD Pipeline

The pipeline is defined in [`.github/workflows/voiceguard-ci.yml`](../../.github/workflows/voiceguard-ci.yml).

### Pipeline stages

```
push to main / PR
       │
       ├── lint-backend  (ruff)
       ├── lint-frontend (tsc --noEmit)
       │
       ├── test-backend  (pytest, requires lint-backend)
       ├── build-frontend (npm run build, requires lint-frontend)
       │
       ├── docker-build  (main branch only, requires test + build)
       │       ├── Build & push voiceguard/backend:latest
       │       └── Build & push voiceguard/frontend:latest
       │
       └── security-scan (trivy, main branch only, after docker-build)
```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token (not your password) |

Set these in **GitHub → Settings → Secrets and Variables → Actions**.

---

## 8. Health Checks

### Docker health check

The backend Dockerfile includes a built-in `HEALTHCHECK` that calls `/health` every 30 seconds.

```bash
# View health status
docker inspect voiceguard-ai-backend-1 | grep -A5 '"Health"'
```

### Manual health check script

```bash
# Basic check (env, secrets, DB, Redis)
python backend/scripts/health_check.py

# Include API endpoint check
python backend/scripts/health_check.py --include-api

# JSON output (for monitoring systems)
python backend/scripts/health_check.py --json

# Custom timeout
python backend/scripts/health_check.py --timeout 10
```

### API health endpoint

```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

---

## 9. Monitoring and Logging

### Log collection

```bash
# Follow all services
docker compose logs -f

# Follow specific service
docker compose logs -f backend

# Since a time
docker compose logs --since 1h backend
```

### Application logs location

Nginx access and error logs are written to the `nginx_logs` volume:
```bash
docker compose exec nginx cat /var/log/nginx/access.log
docker compose exec nginx cat /var/log/nginx/error.log
```

### Performance metrics

The backend exposes a performance metrics endpoint:
```
GET /api/v1/system/performance
Authorization: Bearer <admin-token>
```

---

## 10. Troubleshooting

### Backend fails to start

```bash
docker compose logs backend
# Common causes:
# - DATABASE_URL incorrect (check DB_PASSWORD)
# - SECRET_KEY not set
# - Migration failure (check alembic logs)
```

### Frontend 502 Bad Gateway

```bash
# Check if backend is healthy
docker compose ps
# Restart backend
docker compose restart backend
```

### Redis connection refused

```bash
# Check Redis is running
docker compose ps redis
docker compose exec redis redis-cli ping
# If password-protected:
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

### Database connection refused

```bash
# Check PostgreSQL is accepting connections
docker compose exec db pg_isready -U voiceguard
# View DB logs
docker compose logs db
```

### Full reset (development only)

```bash
# WARNING: destroys all data
docker compose down -v
docker compose up --build
```

