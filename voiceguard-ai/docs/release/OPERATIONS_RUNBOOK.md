# VoiceGuard AI — Production Operations Runbook
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Final Engineering Phase 35: Site Reliability Engineering (SRE), Operations & Incident Response Manual

---

## 1. System Architecture & Service Port Directory

| Service | Container Name | Internal Port | Host / Exposed Port | Operational Purpose |
|:---|:---|:---:|:---:|:---|
| **Reverse Proxy** | `voiceguard_nginx` | 80, 443 | `80`, `443` | TLS termination, rate limit ingress, WebSocket routing |
| **Backend API** | `voiceguard_backend` | 8000 | Isolated | FastAPI application, orchestrator, audio DSP |
| **Frontend Web** | `voiceguard_frontend` | 80 | Isolated | React 19 SOC Operations Console |
| **Relational DB** | `voiceguard_db` | 5432 | Isolated | PostgreSQL 16 transactional store |
| **In-Memory Cache** | `voiceguard_redis` | 6379 | Isolated | Token revocation blocklist, rate limits, session store |
| **Prometheus** | `voiceguard_prometheus` | 9090 | `9090` (Internal) | Metrics scraping engine |
| **Grafana** | `voiceguard_grafana` | 3000 | `3000` (Internal) | Operations telemetry and alert dashboards |

---

## 2. Standard Operating Procedures (SOP)

### 2.1 Clean System Startup Procedure
```bash
# 1. Navigate to project root
cd voiceguard-ai

# 2. Verify environment configuration
test -f .env || cp .env.production.template .env

# 3. Launch container stack in detached mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Verify container health status
docker-compose ps

# 5. Execute API readiness probe
curl -f http://localhost:8000/api/v1/health
```

### 2.2 Graceful System Shutdown Procedure
```bash
# 1. Gracefully stop all services (allowing active streaming sessions to complete)
docker-compose stop --timeout 30

# 2. Tear down network interfaces without deleting persistent storage volumes
docker-compose down
```

---

## 3. Health & Readiness Verification

### 3.1 Liveness Probe (`GET /api/v1/health`)
- **Purpose**: Verifies that the FastAPI process is responsive.
- **Expected Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-07T18:25:00Z",
    "version": "1.0.0-rc.1"
  }
  ```

### 3.2 Readiness Probe (`GET /api/v1/ready`)
- **Purpose**: Verifies all downstream dependencies (PostgreSQL database pool, Redis cache, and AI model weight caches).
- **Expected Response**:
  ```json
  {
    "status": "ready",
    "database": "connected",
    "redis": "connected",
    "ai_engine": "ready",
    "active_streams": 0
  }
  ```

---

## 4. Troubleshooting & Diagnostic Matrix

### Failure 1: Database Connection Pool Exhausted (`500 Internal Server Error`)
- **Symptom**: API logs show `QueuePool limit of size 20 overflow 10 reached`.
- **Diagnostic Command**:
  ```bash
  docker-compose exec db psql -U voiceguard -d voiceguard -c "SELECT count(*) FROM pg_stat_activity;"
  ```
- **Remediation**: Check for long-running uncommitted transactions; restart backend container to cycle connection pools:
  ```bash
  docker-compose restart backend
  ```

### Failure 2: Redis Connection Failure (`ConnectionError`)
- **Symptom**: Authentication requests fail with `Cannot connect to Redis on redis:6379`.
- **Diagnostic Command**:
  ```bash
  docker-compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
  ```
- **Remediation**: Inspect Redis container logs for memory eviction errors:
  ```bash
  docker-compose logs --tail 50 redis
  ```

### Failure 3: Jitter Buffer Frame Drops During Cellular Call Surges
- **Symptom**: SOC Dashboard shows high `dropped_late_frames` count.
- **Remediation**: Inspect network interface packet loss. If network jitter exceeds 300 ms, increase `max_buffer_frames` in `AudioStreamSession` configuration.

---

## 5. Log Locations & Rotation Policies

- **Backend Application Logs**: Docker standard output / `docker-compose logs -f backend`.
- **Nginx Access & Error Logs**: Mounted volume `nginx_logs` under `/var/log/nginx/`.
- **Log Rotation Policy**: Enforced via Docker daemon json-file driver:
  - `max-size`: **50m**
  - `max-file`: **5** (retains maximum 250 MB total logs per service)

