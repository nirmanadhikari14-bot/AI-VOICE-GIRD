# VoiceGuard AI — Deployment Guide

## Staging Deployment

### Prerequisites

1. Staging infrastructure provisioned (VM/cloud instance)
2. GitHub Environment `staging` configured with all secrets (see SECRETS_GUIDE.md)
3. Docker and Docker Compose installed on staging server
4. Network path `voiceguard_network` created on staging server
5. A successful CI run producing a Docker image in GHCR

### Trigger a Staging Deploy

1. Navigate to **Actions → Deploy to Staging**
2. Click **Run workflow**
3. Fill in:
   - **image_tag**: The SHA tag from the Docker Build workflow output (e.g. `sha-abc1234`)
   - **frontend_image_tag**: Leave blank to use same tag as backend
   - **run_migrations**: `true` (default) — runs `alembic upgrade head` before restart
   - **smoke_test**: `true` (default) — validates health after deploy
4. Click **Run workflow**

### What Happens

```
validate-image     → Verifies image tag exists in GHCR
deploy-staging     → SSH into server, pull image, run migrations, docker compose up -d
smoke-test-staging → Hits /api/v1/health endpoint, verifies status=healthy
```

### Finding Image Tags

After a CI workflow run, find the image tag in:
- **Actions → Docker Build & Publish → build-backend → Extract metadata step**
- Look for `sha-<7chars>` in the step output

---

## Production Deployment

> [!CAUTION]
> Production deployments require **manual approval from at least 2 reviewers**.
> Always verify staging is healthy with the target image before deploying to production.

### Prerequisites

1. Staging deployment successful with the target image
2. GitHub Environment `production` configured with all secrets
3. Manual approval configured with required reviewers
4. Image digest (sha256:...) of the validated image

### Finding Image Digest

After staging deploy, find the backend image digest in:
- **Actions → Docker Build & Publish → image-summary → step output**
- Format: `sha256:<64 hex chars>`

### Trigger a Production Deploy

1. Navigate to **Actions → Deploy to Production**
2. Click **Run workflow**
3. Fill in:
   - **image_digest**: Full SHA256 digest (e.g. `sha256:abc123...`)
   - **frontend_image_digest**: Leave blank or provide frontend digest
   - **deployment_reason**: Description of what this deployment contains
   - **skip_backup**: `false` (default — always backup)
4. Click **Run workflow**
5. **Wait for approval email** — 2 required reviewers must approve
6. After approval, the pipeline proceeds automatically

### Production Deploy Sequence

```
preflight          → Validate digest format, verify image in GHCR
require-approval   → ⚠️  BLOCKS until 2 reviewers approve in GitHub UI
pre-deploy-backup  → pg_dump → gzip → upload to GCS bucket
run-migrations     → alembic upgrade head (with migration lock)
deploy-production  → docker compose up -d (backend only, rolling)
health-verify      → Poll /api/v1/health every 10s for up to 300s
rollback-on-failure → (auto) If health fails, re-deploy previous image
deploy-summary     → Success report in workflow summary
```

---

## Rollback Procedures

See [ROLLBACK_GUIDE.md](ROLLBACK_GUIDE.md) for detailed rollback procedures.

---

## Alembic Migration Notes

- Migrations run **before** the new container starts
- A file-based lock (`/tmp/voiceguard_migration.lock`) prevents concurrent migrations
- If a migration fails, the deploy is aborted and the previous container stays running
- To roll back a migration: deploy the previous image digest with skip_backup=false

### Emergency Migration Rollback

```bash
# SSH into production server
ssh voiceguard-deploy@prod.voiceguard.example.com

# Roll back last migration
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/voiceguard-backend:<previous-version> \
  alembic downgrade -1

# Verify current migration state
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/voiceguard-backend:<previous-version> \
  alembic current
```

---

## Health Check Endpoints

| Endpoint | Expected Response | Used By |
|----------|-----------------|---------|
| `GET /api/v1/health` | `{"status": "healthy", ...}` | Deploy smoke tests |
| `GET /api/v1/version` | `{"version": "...", ...}` | Deploy summary |
| `GET /api/docs` | Swagger UI HTML | Manual verification |

---

## First-Time Server Setup

### Staging Server

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy

# Create network
docker network create voiceguard_network

# Create app directory
sudo mkdir -p /opt/voiceguard
sudo chown deploy:deploy /opt/voiceguard

# Copy docker-compose files
scp voiceguard-ai/docker-compose.yml deploy@staging:/opt/voiceguard/
scp voiceguard-ai/docker-compose.prod.yml deploy@staging:/opt/voiceguard/

# Create .env file on server (do NOT put this in git)
cat > /opt/voiceguard/.env << EOF
DATABASE_URL=postgresql+asyncpg://voiceguard:CHANGEME@postgres:5432/voiceguard
REDIS_URL=redis://redis:6379/0
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=staging
EOF
```

