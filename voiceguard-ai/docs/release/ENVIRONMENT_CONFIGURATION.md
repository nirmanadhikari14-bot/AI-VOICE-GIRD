# VoiceGuard AI — Environment Configuration & Secrets Management Guide
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Final Engineering Phase 35: Multi-Tier Environment Specifications & Secret Injection Protocols

---

## 1. Overview of Deployment Environments

VoiceGuard AI defines 4 isolated operational configurations:

```
[1. Local Development]  -->  [2. SIH Demonstration]  -->  [3. Staging Docker]  -->  [4. Production Cluster]
```

| Parameter | 1. Development | 2. Demonstration | 3. Staging | 4. Production |
|:---|:---|:---|:---|:---|
| **`APP_ENV`** | `development` | `demonstration` | `staging` | `production` |
| **Database** | SQLite (`./voiceguard.db`) | SQLite / Pre-seeded | PostgreSQL 16 (`db:5432`) | PostgreSQL 16 Cluster / RDS |
| **In-Memory Store** | In-Memory / Local Redis | Local Redis 7 | Redis 7 Alpine (`redis:6379`) | Redis 7 Cluster with TLS |
| **Audio Ingestion** | Local File / Mic Loopback | Standardized WAV Samples | Streaming RTP / WebSocket | Carrier SIP Trunk / WebRTC |
| **Carrier Action** | Log to console | Simulated `carrier_mock` | Simulated `carrier_mock` | SIP REC / Diameter Gateway |
| **Log Level** | `DEBUG` | `INFO` | `INFO` | `WARNING` |
| **TLS / SSL** | Disabled (HTTP) | Optional Self-Signed | Nginx Self-Signed | Let's Encrypt / Cloudflare TLS |
| **CORS Origins** | `http://localhost:*` | `http://localhost:*` | `https://staging.domain` | Explicit Domain Whitelist |

---

## 2. Environment Variable Reference Specification

| Variable Name | Required | Default (Dev) | Production Format / Requirement | Description |
|:---|:---:|:---|:---|:---|
| `APP_ENV` | Yes | `development` | `production` / `staging` | Dictates strict startup validation rules. |
| `SECRET_KEY` | Yes | `dev_secret_key` | >= 64 hex characters | Cryptographic key for JWT token signing. |
| `ALGORITHM` | Yes | `HS256` | `HS256` or `RS256` | Signature algorithm for authentication. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | `30` (maximum 60) | Expiration window for access tokens. |
| `DATABASE_URL` | Yes | `sqlite:///./voiceguard.db` | `postgresql+psycopg2://user:pass@host:5432/db` | Relational database connection string. |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | `rediss://:pass@host:6380/0` | Redis caching, token revocation & rate limiting. |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | Comma-separated HTTPS URLs | Enforced CORS origin whitelist. |
| `LOG_LEVEL` | No | `INFO` | `WARNING` or `ERROR` | Application logging verbosity. |
| `MODEL_CACHE_DIR` | No | `./models` | `/app/models` | Storage path for downloaded neural weights. |
| `AUDIO_STORAGE_PATH` | No | `./storage/audio` | `/app/storage/audio` | Encrypted storage volume for incident audio. |

---

## 3. Strict Startup Secret Validation

In `backend/app/core/config.py`, the backend validates environment settings at application startup:
1. If `APP_ENV == "production"`, the application **terminates immediately** if `SECRET_KEY` contains `CHANGE_ME`, `secret`, `admin`, or is fewer than 32 characters long.
2. If `DATABASE_URL` begins with `sqlite://` in production mode, a critical warning is emitted.
3. If `ALLOWED_ORIGINS` contains `*` (wildcard) in production, startup is aborted.

---

## 4. Secret Generation & Deployment Best Practices

### 4.1 Generating Production Secrets
```bash
# Generate a cryptographically secure 256-bit SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate a strong Redis password
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4.2 Security Rules for Deployment
- **Never Commit Secrets**: Ensure `.env` is strictly ignored by Git (enforced in root `.gitignore`).
- **Template Reference**: Deployments must copy from `.env.production.template`.
- **Docker Secrets Injection**: In containerized deployments, pass secrets via environment variables or Docker Swarm/Kubernetes secrets volumes rather than baking them into images.

