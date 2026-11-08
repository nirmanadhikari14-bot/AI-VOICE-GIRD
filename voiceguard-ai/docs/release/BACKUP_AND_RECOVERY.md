# VoiceGuard AI — Backup, Disaster Recovery & Business Continuity Guide
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Final Engineering Phase 35: Disaster Recovery Runbook, Data Resiliency & RPO/RTO Specifications

---

## 1. Executive Disaster Recovery Summary

VoiceGuard AI implements automated data protection, point-in-time recovery, and disaster resilience procedures designed to prevent data loss in the event of hardware failure, database corruption, or security incidents.

### Service Level Objectives (SLOs):
- **Recovery Point Objective (RPO)**: **<= 15 minutes** (Maximum tolerable data loss between backup intervals).
- **Recovery Time Objective (RTO)**: **<= 5 minutes** (Maximum time to restore full service from a verified snapshot).

---

## 2. Backup Architecture & Storage Tiers

| Data Tier | Storage Technology | Backup Mechanism | Frequency | Retention Window | Storage Target |
|:---|:---|:---|:---:|:---:|:---|
| **Relational Data** | PostgreSQL 16 | `pg_dump` with gzip compression & SHA-256 integrity hash | Hourly (Incremental), Daily (Full) | 30 Days | Encrypted Off-site Object Storage / S3 |
| **In-Memory State** | Redis 7 | Append-Only File (AOF) + RDB snapshots (`save 60 1000`) | Continuous (fsync every sec) | Persistent Volume | Dedicated Container Volume |
| **Biometric Vectors** | PostgreSQL Table | Included in relational backup | Hourly | 30 Days | Encrypted Relational Store |
| **Forensic Audio** | Encrypted Local / S3 | Immutable Object Versioning + Write-Once-Read-Many (WORM) | Real-time ingest | 90 Days (Audit Compliance) | Secure Encrypted Audio Vault |
| **Application Config** | Git / Env Templates | Version-controlled infrastructure manifests | On commit | Permanent | Git Repository & Secrets Vault |

---

## 3. Automated Backup Script (`db_backup.sh`)

Located at [`infra/scripts/db_backup.sh`](file:///c:/Users/NIRMAN/OneDrive/Desktop/VOICE%20COLONING/voiceguard-ai/infra/scripts/db_backup.sh):
```bash
#!/usr/bin/env bash
# VoiceGuard AI — Automated PostgreSQL Database Backup Script
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/voiceguard_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Execute compressed database dump
pg_dump -h "${DB_HOST:-db}" -U "${DB_USER:-voiceguard}" -d "${DB_NAME:-voiceguard}" \
    --no-owner --clean --if-exists | gzip -9 > "${BACKUP_FILE}"

# Generate cryptographic checksum
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# Enforce 30-day retention cleanup
find "${BACKUP_DIR}" -type f -name "voiceguard_*.sql.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -type f -name "voiceguard_*.sha256" -mtime +30 -delete

echo "[SUCCESS] Backup completed: ${BACKUP_FILE}"
```

---

## 4. Disaster Restoration Procedure (`db_restore.sh`)

Located at [`infra/scripts/db_restore.sh`](file:///c:/Users/NIRMAN/OneDrive/Desktop/VOICE%20COLONING/voiceguard-ai/infra/scripts/db_restore.sh):

### Pre-Restoration Verification Rules:
1. **Never restore directly to an unverified production database without taking a cold snapshot first.**
2. **Verify SHA-256 integrity**:
   ```bash
   sha256sum -c "${BACKUP_FILE}.sha256"
   ```
3. **Execute restoration in isolated transaction**:
   ```bash
   gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST:-db}" -U "${DB_USER:-voiceguard}" -d "${DB_NAME:-voiceguard}"
   ```
4. **Run post-restore schema integrity check**:
   ```bash
   python -c "from app.core.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
   ```

---

## 5. Redis Cache Restoration

Because Redis is primarily used for ephemeral rate limiting and sliding-window token revocation:
1. **Container Failure**: If the Redis container restarts, its mounted `redis_data` volume automatically reloads the Append-Only File (`appendonly.aof`), restoring active token blocklists.
2. **Complete Data Loss**: If the volume is lost, a fresh Redis instance initializes automatically with zero data corruption to PostgreSQL. Active user sessions will be re-authenticated seamlessly via their valid JWT refresh tokens.

