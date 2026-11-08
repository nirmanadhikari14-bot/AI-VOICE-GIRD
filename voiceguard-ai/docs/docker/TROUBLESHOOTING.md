# VoiceGuard AI — Docker Troubleshooting & Operational Runbook
## Phase 30: Dockerization (SIH26104)

### 1. Common Issues and Resolutions

#### 1.1 Backend Healthcheck Fails (`unhealthy` status)
**Symptom:**
`docker-compose ps` reports `voiceguard-ai-backend-1 (unhealthy)`.

**Root Cause Analysis:**
1. Database or Redis container is still starting up.
2. Missing or invalid `DATABASE_URL` or `REDIS_URL`.
3. Migrations have not run (`alembic upgrade head`).

**Resolution:**
```bash
# Check backend application logs
docker-compose logs --tail=100 backend

# Probe health endpoint manually from within container
docker-compose exec backend curl -v http://localhost:8000/api/v1/health

# Verify database connection
docker-compose exec backend python -c "from app.core.database import engine; conn = engine.connect(); print('Connected!')"
```

---

#### 1.2 "Operation not permitted" or Permission Denied in Volumes
**Symptom:**
Backend cannot write audio files to `/app/storage/audio` or models to `/app/models`.

**Root Cause:**
The container runs as non-root user `voiceguard` (UID 1001), but host bind mount permissions belong to `root`.

**Resolution:**
```bash
# Fix permissions on host or within container
docker-compose exec -u root backend chown -R voiceguard:voiceguard /app/storage /app/models
```

---

#### 1.3 WebSocket Connections Drop (`1006 Abnormal Closure`)
**Symptom:**
Real-time audio streaming WebSocket disconnects immediately upon connection through Nginx.

**Root Cause:**
Missing HTTP/1.1 `Upgrade` and `Connection` headers in reverse proxy configuration.

**Resolution:**
Ensure `nginx/voiceguard.conf` includes:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

---

#### 1.4 GPU Not Detected Inside Container
**Symptom:**
`torch.cuda.is_available()` returns `False` despite running `docker-compose.gpu.yml`.

**Root Cause:**
NVIDIA Container Toolkit is not configured as default Docker runtime, or host drivers are out of date.

**Resolution:**
```bash
# Test if Docker runtime sees GPU
docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi

# If that fails, reconfigure runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

