# VoiceGuard AI — Secrets & Environment Configuration Guide

## Overview

This document lists all GitHub Secrets and Environment variables required for
the Phase 31 CI/CD pipeline. No secrets should ever be hardcoded in workflow files.

---

## Repository-Level Secrets

These secrets are available to all workflows regardless of environment.

| Secret | Required By | Description |
|--------|------------|-------------|
| `GITLEAKS_LICENSE` | `security-scan.yml` | Optional: Gitleaks organization license key |

> [!NOTE]
> `GITHUB_TOKEN` is **automatically provided** by GitHub Actions. You do not need
> to create it. It is used for GHCR authentication (`packages: write` permission).

---

## Environment: `staging`

Configure these in **Settings → Environments → staging**.

| Secret | Description | Example |
|--------|-------------|---------|
| `DEPLOY_HOST` | Staging server hostname or IP | `staging.voiceguard.example.com` |
| `DEPLOY_SSH_KEY` | Private SSH key PEM for deploy user | Contents of `~/.ssh/id_ed25519` |
| `DEPLOY_USER` | SSH username on staging server | `deploy` |
| `DEPLOY_PATH` | Absolute path to docker-compose files | `/opt/voiceguard` |
| `GHCR_TOKEN` | GHCR read token (Classic PAT with `read:packages`) | `ghp_...` |
| `DATABASE_URL` | Staging PostgreSQL connection string | `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | Staging Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | App secret key (min 32 chars) | Generate with `openssl rand -hex 32` |

---

## Environment: `production`

Configure these in **Settings → Environments → production**.

> [!CAUTION]
> This environment must have **Required Reviewers** set to at least 2 members
> of your production-approvers team. Without this, there is no approval gate.

| Secret | Description | Example |
|--------|-------------|---------|
| `PROD_DEPLOY_HOST` | Production server hostname or IP | `voiceguard.example.com` |
| `PROD_DEPLOY_SSH_KEY` | Private SSH key PEM for prod deploy user | Contents of `~/.ssh/id_ed25519_prod` |
| `PROD_DEPLOY_USER` | SSH username on production server | `voiceguard-deploy` |
| `PROD_DEPLOY_PATH` | Absolute path to docker-compose files | `/opt/voiceguard` |
| `PROD_GHCR_TOKEN` | GHCR read token (Classic PAT with `read:packages`) | `ghp_...` |
| `PROD_DATABASE_URL` | Production PostgreSQL connection string | `postgresql+asyncpg://...` |
| `PROD_REDIS_URL` | Production Redis connection string | `redis://...` |
| `PROD_SECRET_KEY` | Production app secret key (min 32 chars) | Generate separately from staging |
| `BACKUP_S3_BUCKET` | GCS/S3 bucket name for DB backups | `voiceguard-db-backups` |

---

## Generating Secret Values

### SSH Key Pair (staging/production)

```bash
# Generate a dedicated deploy key (ED25519 — preferred)
ssh-keygen -t ed25519 -C "voiceguard-deploy-staging" -f ~/.ssh/voiceguard_staging -N ""

# Add public key to staging server
ssh-copy-id -i ~/.ssh/voiceguard_staging.pub deploy@staging.voiceguard.example.com

# Copy private key content to GitHub Secret DEPLOY_SSH_KEY
cat ~/.ssh/voiceguard_staging
```

### Secret Key (FastAPI)

```bash
# Generate a 64-character hex secret
openssl rand -hex 32
# Or with Python:
python -c "import secrets; print(secrets.token_hex(32))"
```

### GHCR Read Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens (classic)**
2. Generate token with **`read:packages`** scope only
3. Store as `GHCR_TOKEN` / `PROD_GHCR_TOKEN` secret

---

## Secret Rotation Policy

| Secret | Rotation Frequency | Method |
|--------|------------------|--------|
| SSH Keys | Every 90 days | Generate new pair, update server + GitHub |
| `SECRET_KEY` | Every 180 days | Rotate with rolling restart (see DEPLOYMENT_GUIDE) |
| `DATABASE_URL` | On DB password rotation | Update simultaneously |
| GHCR Tokens | Every 90 days | Revoke old, generate new PAT |
| `PROD_SECRET_KEY` | Every 90 days | Rolling restart with blue-green |

> [!WARNING]
> Rotating `SECRET_KEY` invalidates all existing JWT sessions. Plan for
> a brief re-authentication window during rotation.

---

## Configuring GitHub Environments

### Step 1: Create Environments

1. Navigate to your repository → **Settings** → **Environments**
2. Click **New environment**
3. Create: `staging`, `staging-validate`, `production`

### Step 2: Configure `production` Protection Rules

1. Click on the `production` environment
2. Under **Deployment protection rules**:
   - ✅ Enable **Required reviewers**
   - Add at least 2 reviewers from your security/ops team
   - ✅ Enable **Restrict to protected branches** → select `main`
   - (Optional) Set **Wait timer** to 5 minutes

### Step 3: Add Secrets

For each environment, go to **Environment secrets** → **Add secret**.

---

## Verifying Secret Configuration

After adding all secrets, run a dry-run deployment to staging to verify SSH connectivity:

```bash
# From your workstation
ssh -i ~/.ssh/voiceguard_staging deploy@staging.voiceguard.example.com "docker --version"
```

The workflow logs will show `SSH connection OK` if secrets are correctly configured.

---

## Security Notes

- **Never print secrets in workflow logs.** The `echo "${{ secrets.X }}"` pattern is forbidden.
- **Use environment secrets, not repository secrets**, for staging/production values.
- **Rotate all secrets if a repository is compromised** — treat as a security incident.
- **The `GITHUB_TOKEN` is automatically scoped to the repository** — it cannot access other repos.

