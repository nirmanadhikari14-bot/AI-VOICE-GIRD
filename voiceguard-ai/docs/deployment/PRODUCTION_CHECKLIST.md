# VoiceGuard AI — Production Deployment Checklist

> Complete every item before exposing VoiceGuard AI to production traffic.
> Mark each item ✅ when confirmed.

---

## PRE-DEPLOYMENT — Environment & Configuration

### Secrets

- [ ] `SECRET_KEY` is set to a cryptographically random string of ≥ 32 characters
  ```bash
  openssl rand -hex 32
  ```
- [ ] `SECRET_KEY` is **not** a default, test, or placeholder value
- [ ] `DB_PASSWORD` is a strong, unique password (not `changeme`, `postgres`, etc.)
- [ ] `REDIS_PASSWORD` is set and matches the Redis `requirepass` configuration
- [ ] No secrets are committed to Git (`.env` and `.env.prod` are in `.gitignore`)

### Application Configuration

- [ ] `ENVIRONMENT=production` is set
- [ ] `ENFORCE_HTTPS=true` is set
- [ ] `LOG_LEVEL=WARNING` or `ERROR` (not `DEBUG` in production)
- [ ] `ALLOWED_ORIGINS` contains only the production domain(s) — no `localhost`
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES` is configured to an appropriate value (default: 30)

### Database

- [ ] `DATABASE_URL` points to a production PostgreSQL instance (not SQLite)
- [ ] PostgreSQL is version 14 or later
- [ ] Database user has minimal required permissions (not superuser)
- [ ] Database is backed up before first migration run
- [ ] Alembic migrations have been reviewed and are up to date

### Redis

- [ ] Redis is running and reachable from the backend
- [ ] Redis `maxmemory` is configured (recommended: 512MB minimum)
- [ ] Redis `maxmemory-policy` is set to `allkeys-lru`
- [ ] Redis persistence is configured (`appendonly yes`)

---

## PRE-DEPLOYMENT — Infrastructure

### Networking

- [ ] Ports 80 and 443 are open on the firewall
- [ ] Database port (5432) is **not** exposed externally
- [ ] Redis port (6379) is **not** exposed externally
- [ ] Backend port (8000) is **not** exposed externally (routed through Nginx only)

### TLS / HTTPS

- [ ] SSL certificate is valid and not expired
- [ ] Certificate covers the production domain
- [ ] Certificate is from a trusted CA (Let's Encrypt, or organization CA)
- [ ] Nginx is configured to redirect HTTP → HTTPS
- [ ] Certificate auto-renewal is configured (Certbot cron or ACME)

### Docker

- [ ] Docker Compose production override (`docker-compose.prod.yml`) is applied
- [ ] Pre-built images are tagged with the correct version/SHA
- [ ] Source code volumes are **not** mounted in production
- [ ] Container restart policies are set to `always`
- [ ] Resource limits (memory) are configured for backend containers

---

## DEPLOYMENT — Execution Steps

### Step 1: Infrastructure

- [ ] Server meets minimum requirements (4 vCPU, 8 GB RAM recommended)
- [ ] Docker and Docker Compose v2 installed
- [ ] Non-root deployment user created with Docker group membership

### Step 2: Configuration

- [ ] `.env.prod` file created with all required variables
- [ ] Nginx config reviewed and correct domain configured
- [ ] SSL certificates in place at `nginx/certs/`

### Step 3: Deploy

```bash
docker compose --env-file .env.prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d
```

- [ ] All containers start without errors
- [ ] `docker compose ps` shows all services as `healthy`

### Step 4: Database

- [ ] Migrations complete without errors
  ```bash
  docker compose logs backend | grep -i "migration\|alembic"
  ```
- [ ] Super-admin user seeded (first deploy only)
  ```bash
  docker compose exec backend python scripts/seed_production.py
  ```

---

## POST-DEPLOYMENT — Verification

### Health Checks

- [ ] Health check script passes
  ```bash
  docker compose exec backend python scripts/health_check.py
  ```
- [ ] `/health` endpoint returns HTTP 200
  ```bash
  curl -f https://voiceguard.example.com/api/health || echo FAIL
  ```
- [ ] All Docker health checks show `healthy`
  ```bash
  docker compose ps
  ```

### API Verification

- [ ] API root responds: `GET /`
- [ ] Auth endpoint responds: `POST /api/v1/auth/login`
- [ ] Admin login succeeds with seeded credentials
- [ ] API documentation accessible at `/docs` (or restricted in production)

### Frontend Verification

- [ ] Homepage loads at `https://voiceguard.example.com`
- [ ] Login page renders correctly
- [ ] Admin portal accessible after login
- [ ] No browser console errors (open DevTools → Console)
- [ ] No mixed-content warnings (all resources load over HTTPS)

### WebSocket Verification

- [ ] WebSocket upgrade works through Nginx proxy
  ```bash
  # Use wscat or browser DevTools → Network → WS
  wscat -c wss://voiceguard.example.com/ws/stream
  ```

### Security Headers

- [ ] Security headers present in HTTP responses
  ```bash
  curl -I https://voiceguard.example.com | grep -E "X-Frame|Content-Security|Strict-Transport"
  ```
  Expected headers:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=...`
  - `Content-Security-Policy: ...`

### Rate Limiting

- [ ] API rate limiting active (30 requests/second per IP on `/api/`)
- [ ] Auth rate limiting active (5 requests/minute per IP on `/api/v1/auth/`)

---

## POST-DEPLOYMENT — Operations

### Monitoring

- [ ] Log aggregation configured (or `docker compose logs -f` available)
- [ ] Alerting configured for backend container health failure
- [ ] Database disk space monitored
- [ ] Redis memory usage monitored

### Backup

- [ ] PostgreSQL backup schedule confirmed
- [ ] Backup restoration procedure tested
- [ ] Model weights/cache backed up or reproducible

### Incident Response

- [ ] On-call contact information documented
- [ ] Rollback procedure documented and tested
  ```bash
  # Roll back to previous image version
  docker compose --env-file .env.prod \
    -f docker-compose.yml -f docker-compose.prod.yml \
    up -d --no-build backend
  ```
- [ ] Database rollback procedure confirmed with Alembic

---

## SIGN-OFF

| Role | Name | Date | Signature |
|---|---|---|---|
| Lead Developer | | | |
| DevOps / Infrastructure | | | |
| Security Review | | | |
| Product Owner | | | |

> **Note:** This checklist must be completed and signed before each major production deployment.
> Archive completed checklists for audit purposes.

