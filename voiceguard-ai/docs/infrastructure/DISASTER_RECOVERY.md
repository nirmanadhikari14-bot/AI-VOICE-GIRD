# VoiceGuard AI — Disaster Recovery & Business Continuity Plan
## Phase 32: Production Infrastructure (SIH26104)

---

## 1. Objectives & Metrics

| Metric | Target Value | Description |
|--------|--------------|-------------|
| **RPO (Recovery Point Objective)** | **1 Hour** (with continuous WAL archiving) / **24 Hours** (nightly snapshot fallback) | Maximum acceptable data loss duration in a catastrophic outage |
| **RTO (Recovery Time Objective)** | **30 Minutes** (host failure rebuild) / **15 Minutes** (container restart) | Maximum acceptable duration to restore service availability |

---

## 2. Backup Strategy

### 2.1 Automated Database Snapshots (`db_backup.sh`)
- **Frequency**: Every night at 02:00 UTC via system cron.
- **Format**: Compressed PostgreSQL custom binary archive (`pg_dump -Fc -Z 9`).
- **Integrity Verification**: The backup script automatically runs `pg_restore --list` immediately after dumping to verify file integrity. Corrupt archives trigger exit code 1.
- **Retention**: 7 days of rolling local snapshots; older archives are pruned automatically.
- **Remote Offsite Sync**: Encrypted archives are synced to offsite S3-compatible cold storage bucket (`s3://voiceguard-backups-prod/postgres/`).

### 2.2 Model & Configuration Artifacts
- Acoustic weights and ONNX models are versioned in GHCR / S3 and mirrored locally in `/opt/voiceguard/models`.
- Infrastructure configuration and Compose files are version-controlled in Git.

---

## 3. Recovery Procedures & Runbooks

### Runbook 1: PostgreSQL Point-in-Time Database Restoration
```bash
# 1. Locate the latest validated backup archive
ls -l /opt/voiceguard/backups/postgres/

# 2. Execute restoration script (interactive safety prompt requires confirmation)
/opt/voiceguard/infra/scripts/db_restore.sh /opt/voiceguard/backups/postgres/voiceguard_backup_20261107_020000.sql.gz

# 3. Verify schema and table counts
docker compose -f docker-compose.infrastructure.yml exec -T db psql -U voiceguard -d voiceguard_prod -c "\dt"
```

### Runbook 2: Total Host Disaster Recovery (Bare-Metal Rebuild)
1. Provision a fresh Ubuntu 22.04 LTS instance with 4+ vCPU, 8+ GB RAM.
2. Clone repository & checkout target release tag:
   ```bash
   git clone https://github.com/org/voiceguard-ai.git /opt/voiceguard
   cd /opt/voiceguard
   ```
3. Run automated host bootstrapping:
   ```bash
   sudo ./infra/scripts/bootstrap_server.sh
   ```
4. Copy production credentials into `.env.production` (from secure key vault).
5. Fetch latest offsite database backup:
   ```bash
   aws s3 cp s3://voiceguard-backups-prod/postgres/latest.sql.gz /opt/voiceguard/backups/postgres/
   ./infra/scripts/db_restore.sh /opt/voiceguard/backups/postgres/latest.sql.gz
   ```
6. Deploy verified application stack:
   ```bash
   ./infra/scripts/deploy.sh <BACKEND_DIGEST> <FRONTEND_DIGEST>
   ```
7. Verify DNS points to new host IP; re-issue Let's Encrypt certificates if needed.

---

## 4. Disaster Scenarios & Resilience Matrix

| Disaster Event | Detection Mechanism | Immediate Automatic Action | Manual Intervention Required |
|----------------|---------------------|----------------------------|------------------------------|
| **Backend API Crash / OOM** | Docker health check fails (`/api/v1/health`) | Docker Compose auto-restarts container (`restart: always`) | None unless persistent crash loop occurs |
| **PostgreSQL Outage / Corrupt Disk** | Prometheus alert `PostgreSQLDown` fires | Alertmanager notifies Ops oncall | Mount backup volume, run `db_restore.sh` |
| **Redis Memory Saturation** | Prometheus alert `RedisMemoryHigh` (>85%) | Redis evicts oldest cache keys via `allkeys-lru` | Check active audio stream count; tune `REDIS_MAXMEMORY` |
| **Nginx SSL Certificate Expiry** | Prometheus alert `TLSCertificateExpiringSoon` | Certbot cron triggers automated renewal (`renew_certs.sh`) | Verify DNS validation records if renewal fails |
| **DDoS / Flooding Attack** | Nginx rate limits return HTTP 429 | Offending IPs throttled; connections dropped | Add IP blocks to `ufw` firewall if needed |

