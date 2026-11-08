# VoiceGuard AI — Secure Deployment Guide
## Phase 25: Security & Privacy Hardening
**SIH Problem Statement: SIH26104**

---

## 1. Purpose

This document provides a production deployment checklist, secrets management procedures, TLS configuration, PostgreSQL migration guide, and hardening verification steps for VoiceGuard AI.

> [!CAUTION]
> **Do not deploy to production using SQLite, default SECRET_KEY, or `APP_ENV=development`.** All three are enforced at startup — the backend will refuse to start in production with a weak `SECRET_KEY`.

---

## 2. Pre-Deployment Checklist

### 2.1 Environment Configuration

- [ ] `APP_ENV=production` set in environment
- [ ] `SECRET_KEY` is a cryptographically random 64-character hex string (minimum)
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `REDIS_URL` configured (required for distributed rate limiting)
- [ ] `ALLOWED_ORIGINS` set to exact production domain(s) — no wildcards
- [ ] All default/placeholder credentials replaced
- [ ] `.env` file excluded from git (verified via `.gitignore`)
- [ ] Secrets stored in a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)

### 2.2 Network & TLS

- [ ] All endpoints served over HTTPS (TLS 1.2 minimum; TLS 1.3 preferred)
- [ ] HTTP → HTTPS redirect enforced at load balancer/reverse proxy (nginx/Traefik)
- [ ] HSTS header enabled: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (added by `SecurityHeadersMiddleware`)
- [ ] TLS certificate from trusted CA (Let's Encrypt, DigiCert, etc.)
- [ ] Certificate auto-renewal configured
- [ ] WebSocket endpoint (`/ws/v1/audio`) served over WSS (WebSocket Secure)

### 2.3 Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl http2;
    server_name voiceguard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/voiceguard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voiceguard.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Prevent information disclosure
    server_tokens off;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 26m;  # Slightly above MAX_AUDIO_FILE_SIZE_MB
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name voiceguard.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### 2.4 Database

- [ ] PostgreSQL 14+ deployed (not SQLite)
- [ ] Dedicated database user with minimal privileges (no superuser)
- [ ] Database connection over TLS (`sslmode=require` in connection string)
- [ ] Connection pooling configured (PgBouncer recommended)
- [ ] Automated backups enabled (daily minimum, retained 30 days)
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Row-Level Security (RLS) policies applied (see section 4)

### 2.5 Redis

- [ ] Redis 6+ with AUTH password
- [ ] Redis over TLS (`rediss://` connection scheme)
- [ ] Redis `maxmemory-policy` set to `allkeys-lru`
- [ ] Redis data persistence disabled for rate limiter (ephemeral use); use AOF for session cache if needed

### 2.6 Application

- [ ] `uvicorn` running with `--workers` matching CPU cores
- [ ] Process supervised by systemd or container orchestrator (Kubernetes, Docker Compose)
- [ ] Health check endpoint `/health` configured in orchestrator
- [ ] Resource limits (CPU/memory) applied per container
- [ ] Read-only filesystem where possible; writable mounts only for logs
- [ ] Non-root user running the application process

---

## 3. Secrets Management

### 3.1 Principles

1. **No secrets in code** — all credentials via environment variables or secrets manager.
2. **No secrets in git** — `.env` is excluded; `.env.example` contains only placeholders.
3. **Rotation** — rotate `SECRET_KEY` and database credentials quarterly or immediately after any suspected exposure.
4. **Least privilege** — each service has only the credentials it needs.

### 3.2 Rotation Procedure

**`SECRET_KEY` Rotation:**

1. Generate new key: `python -c "import secrets; print(secrets.token_hex(32))"`
2. Update the secret in your secrets manager.
3. Deploy the updated configuration (zero-downtime rolling restart).
4. Note: rotating `SECRET_KEY` invalidates all existing JWT tokens — users will need to re-login.

**Database Credential Rotation:**

1. Create new DB user with same privileges.
2. Update `DATABASE_URL` in secrets manager.
3. Rolling restart application.
4. Revoke old DB user credentials.

**API Key Rotation (AI model services, FCM, Twilio):**

1. Generate new key in provider console.
2. Update environment variable.
3. Restart affected service.
4. Revoke old key in provider console.

---

## 4. PostgreSQL Migration from SQLite

### 4.1 Database URL

```
DATABASE_URL=postgresql+psycopg2://voiceguard_user:STRONG_PASSWORD@db-host:5432/voiceguard_prod?sslmode=require
```

### 4.2 Create Database and User

```sql
CREATE DATABASE voiceguard_prod;
CREATE USER voiceguard_user WITH PASSWORD 'STRONG_RANDOM_PASSWORD';
GRANT CONNECT ON DATABASE voiceguard_prod TO voiceguard_user;
GRANT USAGE ON SCHEMA public TO voiceguard_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO voiceguard_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO voiceguard_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO voiceguard_user;
```

### 4.3 Run Migrations

```bash
cd backend
export DATABASE_URL="postgresql+psycopg2://voiceguard_user:PASSWORD@db-host:5432/voiceguard_prod?sslmode=require"
export APP_ENV=production
export SECRET_KEY=<your-strong-key>

# Run Alembic migrations
alembic upgrade head
```

### 4.4 Recommended Row-Level Security Policies

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevention_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: application user can only see their organization's data
-- (set app.current_org_id at connection time via SQLAlchemy event)
CREATE POLICY org_isolation_calls ON calls
    USING (organization_id = current_setting('app.current_org_id')::integer
           OR current_setting('app.user_role') IN ('superadmin', 'admin'));

-- Apply similar policies to alerts, incidents, prevention_actions, voice_profiles
```

> [!NOTE]
> RLS is a defense-in-depth measure. The primary tenant isolation is enforced at the application layer via `enforce_tenant_boundary()`. RLS provides a second layer of protection at the database level.

---

## 5. Container Hardening (Docker)

```dockerfile
FROM python:3.11-slim

# Non-root user
RUN useradd --create-home --shell /bin/bash voiceguard
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=voiceguard:voiceguard . .

USER voiceguard

# No secrets in image — all via environment variables at runtime
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```yaml
# docker-compose.prod.yml (partial)
services:
  backend:
    build: ./backend
    read_only: true
    tmpfs:
      - /tmp
    environment:
      - APP_ENV=production
    env_file:
      - .env  # NOT committed to git
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

---

## 6. Dependency Vulnerability Management

Run these audits before every production deployment:

```bash
# Backend Python dependencies
cd voiceguard-ai/backend
./venv/Scripts/python.exe -m pip_audit  # Install: pip install pip-audit

# Frontend
cd voiceguard-ai/frontend
npm audit --audit-level=high

# Mobile
cd voiceguard-ai/mobile
npm audit --audit-level=high

# Desktop
cd voiceguard-ai/desktop
npm audit --audit-level=high
```

Apply all Critical and High severity patches before deployment. Document any unpatched vulnerabilities with a risk acceptance record.

---

## 7. Security Verification After Deployment

Run this verification checklist after each production deployment:

```bash
# 1. Confirm HTTPS enforced
curl -I http://voiceguard.yourdomain.com/api/v1/health
# Expected: 301 redirect to HTTPS

# 2. Confirm security headers present
curl -I https://voiceguard.yourdomain.com/api/v1/health
# Expected headers: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, CSP

# 3. Confirm unauthenticated access denied
curl https://voiceguard.yourdomain.com/api/v1/calls/active
# Expected: 401 Unauthorized

# 4. Confirm CORS rejects unauthorized origins
curl -H "Origin: https://evil.com" https://voiceguard.yourdomain.com/api/v1/health
# Expected: No Access-Control-Allow-Origin header for evil.com

# 5. Confirm rate limiter active (run 6 times rapidly)
for i in {1..6}; do curl -X POST https://voiceguard.yourdomain.com/api/v1/auth/login \
  -d '{"username":"test@test.com","password":"wrong"}' -H "Content-Type: application/x-www-form-urlencoded"; done
# Expected: 6th response → 429 Too Many Requests
```

---

*Document Owner: DevSecOps / Infrastructure Team | Review Cycle: Before Each Major Release | Last Reviewed: Phase 25*

