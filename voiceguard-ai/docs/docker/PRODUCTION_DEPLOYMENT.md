# VoiceGuard AI — Production Deployment Guide
## Phase 30: Dockerization (SIH26104)

### 1. Production Architecture Principles
The production deployment profile (`docker-compose.prod.yml`) enforces rigorous enterprise security standards:

- **Strict Secret Enforcement:** Database passwords, Redis passwords, and JWT secret keys must be supplied explicitly. Missing values abort startup immediately (`${VAR:?...}`).
- **Network Isolation:** Internal data services (PostgreSQL, Redis) have no published host ports and reside on an `internal: true` bridge network.
- **Resource Quotas:** CPU (2.0 max, 0.5 reserved) and memory (4G limit, 1G reserved) limits prevent noisy-neighbor and denial-of-service starvation.
- **Horizontal Scaling:** Backend container is configured for multi-replica operation (`replicas: 2+`).
- **Log Rotation:** Docker JSON-file logging is capped at 50MB with 5 file rotations to prevent disk exhaustion.
- **TLS & Hardened Headers:** Nginx edge terminates HTTPS, enforces HSTS (`max-age=31536000`), CSP, X-Frame-Options (`DENY`), and rate limiting (100 req/s with burst of 20).

---

### 2. Pre-Deployment Configuration

#### 2.1 Prepare Environment File (`.env`)
Create a production `.env` file with strong cryptographic keys:

```bash
# Generate 64-char hex secret key
python -c "import secrets; print(secrets.token_hex(32))"
```

Configure `.env`:
```env
APP_ENV=production
DB_NAME=voiceguard_prod
DB_USER=voiceguard_app
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD_HERE
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD_HERE
SECRET_KEY=YOUR_64_CHAR_HEX_SECRET_KEY_HERE
ALLOWED_ORIGINS=https://voiceguard.yourdomain.com
BACKEND_REPLICAS=3
LOG_LEVEL=WARNING
```

#### 2.2 Place SSL/TLS Certificates
Store your production certificates in `nginx/certs/`:
- `nginx/certs/voiceguard.crt` (Fullchain certificate)
- `nginx/certs/voiceguard.key` (Private key)

---

### 3. Deployment Procedure

```bash
# 1. Pull base images and build production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 2. Run database migrations
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend alembic upgrade head

# 3. Seed production super-admin (interactive or automated)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend python backend/scripts/seed_production.py

# 4. Launch production cluster in detached mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Verify service health
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

---

### 4. Zero-Downtime Rolling Updates

When deploying a new version of VoiceGuard AI:

```bash
# 1. Rebuild backend image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build backend

# 2. Update service with zero downtime (Docker Compose rolling update)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --scale backend=4 backend

# 3. Scale back to normal replica count after new containers report healthy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=2 backend
```

