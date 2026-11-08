# VoiceGuard AI — Rollback Guide

## When to Rollback

Trigger a rollback when:
- Production health check fails after a deploy
- Error rate spikes above threshold post-deploy
- Critical bug is detected in the deployed version
- Database migration caused data integrity issues

---

## Automatic Rollback (deploy-production.yml)

The production deploy workflow includes an automatic rollback job:

```
deploy-production → health-verify → (if health fails) → rollback-on-failure
```

**The rollback job activates automatically** when `health-verify` reports
`status=unhealthy` after the 5-minute health check window.

It re-deploys the **previously running container image** using Docker's
container history. This is a best-effort automatic recovery.

---

## Manual Image Rollback

If automatic rollback fails or if you need to roll back to a specific version:

### Step 1: Identify the previous stable image digest

```bash
# From GitHub Actions Docker Build workflow output
# Or from the previous successful production deploy summary
# Format: sha256:<64 hex chars>
PREVIOUS_DIGEST="sha256:abc123..."
```

### Step 2: Trigger a production deployment with the previous digest

1. Navigate to **Actions → Deploy to Production**
2. Use the **previous** image digest
3. Set `deployment_reason` to `"Emergency rollback from vX.Y.Z"`
4. This will require manual approval again

### Step 3: Verify rollback success

```bash
# Check production health
curl https://voiceguard.example.com/api/v1/health
# Expected: {"status": "healthy", "version": "<previous version>"}
```

---

## Database Migration Rollback

> [!CAUTION]
> Migration rollbacks can cause data loss if the new version inserted or modified data.
> Always take a manual backup before rolling back migrations.

### Step 1: Take emergency backup

```bash
ssh voiceguard-deploy@prod.voiceguard.example.com
pg_dump "$DATABASE_URL" | gzip > /tmp/emergency_backup_$(date +%Y%m%dT%H%M%S).sql.gz
```

### Step 2: Check current migration state

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/voiceguard-backend:stable \
  alembic current
```

### Step 3: Roll back one migration

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/voiceguard-backend:<previous-version> \
  alembic downgrade -1
```

### Step 4: Verify migration state

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/voiceguard-backend:<previous-version> \
  alembic current
```

### Step 5: Deploy previous application version

Follow the standard manual image rollback procedure above.

---

## Partial Rollback (Backend Only)

If only the backend image is problematic but frontend is fine:

```bash
ssh voiceguard-deploy@prod.voiceguard.example.com
cd /opt/voiceguard

# Stop only backend
docker compose -f docker-compose.prod.yml stop backend

# Start with previous backend image
docker run -d \
  --name voiceguard_backend_stable \
  --network voiceguard_network \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_URL="$REDIS_URL" \
  -e SECRET_KEY="$SECRET_KEY" \
  -p 8000:8000 \
  ghcr.io/<org>/voiceguard-backend@sha256:<previous-digest>
```

---

## Post-Rollback Actions

After any rollback:

1. **Create a GitHub Issue** documenting the incident
2. **Tag it** with `severity:critical` and `type:rollback`
3. **Conduct a post-mortem** within 48 hours
4. **Update the CI/CD test suite** to catch the regression
5. **Re-run all security scans** to ensure rollback image is clean

