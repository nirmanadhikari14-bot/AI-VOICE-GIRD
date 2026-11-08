# VoiceGuard AI — Backup & Disaster Recovery Guide
## Phase 30: Dockerization (SIH26104)

### 1. Persistent State Overview
The stateful data of VoiceGuard AI consists of:
1. **PostgreSQL Relational DB (`postgres_data` volume):** Organizations, users, policies, incidents, alerts, caller risk histories, audit logs.
2. **Redis In-Memory State (`redis_data` volume):** Active call sessions, sliding-window rate limit tokens, cached biometric embeddings.
3. **Audio Artifact Storage (`audio_storage` volume):** Voice samples, suspicious call recordings, acoustic fingerprints.
4. **AI Model Storage (`model_cache` volume):** Pre-trained neural weights.

---

### 2. Database Backup Procedures

#### 2.1 Automated PostgreSQL Logical Backup
Run a point-in-time `pg_dump` directly from the database container:

```bash
# Generate timestamped compressed backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U voiceguard_user -d voiceguard -Fc > "voiceguard_backup_${TIMESTAMP}.dump"
```

#### 2.2 PostgreSQL Database Restoration
To restore a snapshot into a new or existing database container:

```bash
# Terminate existing connections and restore
docker-compose exec -T db pg_restore -U voiceguard_user -d voiceguard --clean --if-exists < voiceguard_backup_20261107_120000.dump
```

---

### 3. Redis State Backup

Redis writes an Append-Only File (AOF) and Point-In-Time Snapshot (RDB) to `/data`:

```bash
# Force Redis to write an RDB snapshot to disk immediately
docker-compose exec redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE

# Copy the snapshot out of the volume
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis_backup.rdb
```

---

### 4. Volume Backup via Ephemeral Helper Container

To create a clean tar archive of any named volume:

```bash
# Backup audio storage volume
docker run --rm \
  -v voiceguard-ai_audio_storage:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar -czf /backup/audio_storage_$(date +%Y%m%d).tar.gz -C /source .

# Restore audio storage volume
docker run --rm \
  -v voiceguard-ai_audio_storage:/target \
  -v $(pwd)/backups:/backup:ro \
  alpine sh -c "rm -rf /target/* && tar -xzf /backup/audio_storage_20261107.tar.gz -C /target"
```

