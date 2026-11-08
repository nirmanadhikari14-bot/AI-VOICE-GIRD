# VoiceGuard AI — Database & Data Release Report
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Final Engineering Phase 35: Relational Persistence, Redis Caching, Vector Storage & Data Integrity

---

## 1. Executive Data Architecture Summary

VoiceGuard AI utilizes a hybrid data tier engineered for low-latency real-time streaming, strict multi-tenant boundary isolation, and immutable forensic audit trails:
- **Primary Relational Store**: PostgreSQL 16 (production) / SQLite 3 (rapid local testing) managed via SQLAlchemy 2.0 ORM and Alembic migrations.
- **In-Memory Cache & Token Revocation Store**: Redis 7 Alpine with persistent append-only files (AOF), memory limits (`512mb allkeys-lru`), and sliding TTLs.
- **Acoustic Vector Storage**: 192-dimensional ECAPA-TDNN biometric embeddings stored with relational tenant constraints and fast cosine distance queries.

---

## 2. PostgreSQL Relational Schema & Table Catalog

| Table Name | Primary Purpose | Multi-Tenant Index | Foreign Key Relationships |
|:---|:---|:---:|:---|
| `organizations` | Tenant definitions & enterprise metadata | Primary Key | Root tenant entity |
| `users` | Authenticated operators & security analysts | `organization_id` | `roles.id`, `organizations.id` |
| `roles` | Role-based access control (`admin`, `org_admin`) | Global / Scoped | Linked to `users.role_id` |
| `calls` | Active and historical telephonic streams | `organization_id` | `organizations.id` |
| `call_metadata` | Telephony signaling, codecs, and gateway metadata | Via `call_id` | `calls.id` (1-to-1) |
| `speakers` | Identified speaker participants per call | Via `call_id` | `calls.id` |
| `voice_profiles` | Enrolled biometric voiceprints | `organization_id` | `users.id`, `organizations.id` |
| `voice_embeddings` | 192-dimensional biometric float vectors | Via `profile_id` | `voice_profiles.id` |
| `analysis_results` | Individual engine forensic predictions | Via `call_id` | `calls.id` |
| `risk_scores` | Authoritative multi-modal risk evaluations | Via `call_id` | `calls.id` |
| `alerts` | Triggered deepfake and fraud security alerts | `organization_id` | `calls.id`, `organizations.id` |
| `prevention_actions` | Automated defense actions (`block_call`, etc.) | `organization_id` | `calls.id`, `organizations.id` |
| `incidents` | P1-P4 enterprise cybersecurity incidents | `organization_id` | `calls.id`, `organizations.id` |
| `audit_logs` | Immutable audit logging of administrative events | `organization_id` | `users.id`, `organizations.id` |
| `analysis_sessions` | Complete orchestrator multi-stage session state | `organization_id` | `calls.id`, `organizations.id` |
| `module_executions` | Granular per-module AI execution metrics | Via `session_id` | `analysis_sessions.id` |

---

## 3. Multi-Tenant Isolation & Security Hardening

- **Mandatory Tenant Filtering**: In accordance with the Phase 33 Security Audit, all relational queries on sensitive entities enforce `filter(Model.organization_id == user.organization_id)` extracted directly from verified JWT claims.
- **Cross-Tenant Leakage Blocked**: Verified via automated penetration tests (`test_cross_tenant_voice_profile_leakage_blocked`, `test_cross_tenant_alert_access_blocked`, `test_cross_tenant_incident_modification_blocked`).
- **Connection Pooling Specifications** (`app/core/database.py`):
  - `pool_size`: **20** active connections
  - `max_overflow`: **10** burst connections
  - `pool_timeout`: **30.0** seconds
  - `pool_recycle`: **1800** seconds (30 minutes)
  - `pool_pre_ping`: **True** (protects against stale / dropped TCP sockets)

---

## 4. Redis In-Memory Cache & Token Blocklist

- **Role 1: Stateless JWT Token Revocation**:
  - Implemented in `app/core/security.py` and `app/api/deps.py`.
  - On user logout, the JWT `jti` unique identifier is written to Redis with a TTL matching the token's remaining lifespan.
  - Every authenticated request checks `redis.exists(f"revoked_token:{jti}")` in < 0.5 ms.
- **Role 2: Sliding-Window Rate Limiting**:
  - Sliding timestamp windows prevent brute force credential stuffing on `/api/v1/auth/login` (max 10 req/min).
- **Persistence & Eviction**:
  - Redis runs with `--save 60 1000 --appendonly yes` to persist rate limits and token blocklists across container restarts.

---

## 5. Vector Biometric Storage & DPDP Compliance

- **Storage Format**: 192-dimensional float32 arrays encoded as structured JSON or binary BLOBs linked directly to tenant-isolated `voice_profiles`.
- **Right to Erasure**: Enrolled biometric embeddings support permanent cryptographic deletion via `DELETE /api/v1/admin/voice-profiles/{id}` in strict compliance with the Digital Personal Data Protection (DPDP) Act 2023.

---

## 6. Migration Status & Disaster Recovery

- **Alembic Versioning**: Initial baseline schema managed under `backend/alembic/versions/be0458e7965c_initial_schema.py`.
- **Automated Backup Scripts**:
  - Backup: [`infra/scripts/db_backup.sh`](file:///c:/Users/NIRMAN/OneDrive/Desktop/VOICE%20COLONING/voiceguard-ai/infra/scripts/db_backup.sh) (`pg_dump` with gzip compression and SHA-256 integrity hashing).
  - Restoration: [`infra/scripts/db_restore.sh`](file:///c:/Users/NIRMAN/OneDrive/Desktop/VOICE%20COLONING/voiceguard-ai/infra/scripts/db_restore.sh) (transactional restore with target validation).

