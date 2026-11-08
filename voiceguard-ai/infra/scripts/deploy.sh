#!/bin/bash
# =============================================================================
# VoiceGuard AI — Deployment Script
# Phase 32: Production Infrastructure
#
# Usage:
#   ./infra/scripts/deploy.sh <environment> <backend_digest> <frontend_digest>
#
# Examples:
#   ./infra/scripts/deploy.sh staging sha256:abc123... sha256:def456...
#   ./infra/scripts/deploy.sh production sha256:abc123... sha256:def456...
# =============================================================================

set -euo pipefail

ENVIRONMENT="${1:?Usage: $0 <staging|production> <backend_digest> <frontend_digest>}"
BACKEND_DIGEST="${2:?backend_digest required (sha256:...)}"
FRONTEND_DIGEST="${3:?frontend_digest required (sha256:...)}"

APP_DIR="${APP_DIR:-/opt/voiceguard}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_OWNER="${IMAGE_OWNER:?Set IMAGE_OWNER to your GitHub org/user}"
COMPOSE_FILE="docker-compose.infrastructure.yml"

echo "============================================================"
echo " VoiceGuard AI — Deployment"
echo " Environment:      ${ENVIRONMENT}"
echo " Backend digest:   ${BACKEND_DIGEST}"
echo " Frontend digest:  ${FRONTEND_DIGEST}"
echo " Timestamp:        $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Validate digest format
validate_digest() {
    local digest="$1"
    if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
        echo "[ERROR] Invalid digest format: ${digest}"
        echo "        Expected: sha256:<64 hex chars>"
        exit 1
    fi
}
validate_digest "${BACKEND_DIGEST}"
validate_digest "${FRONTEND_DIGEST}"

# Production requires explicit confirmation
if [ "${ENVIRONMENT}" = "production" ]; then
    echo ""
    echo "⚠️  PRODUCTION DEPLOYMENT"
    echo "   This will deploy to PRODUCTION. All users will be affected."
    echo "   Press Enter to continue or Ctrl+C to abort..."
    read -r
fi

cd "${APP_DIR}"

# Source environment file
ENV_FILE=".env.${ENVIRONMENT}"
if [ ! -f "${ENV_FILE}" ]; then
    echo "[ERROR] Environment file not found: ${APP_DIR}/${ENV_FILE}"
    exit 1
fi
set -a; source "${ENV_FILE}"; set +a

# Override images with specific digests
export BACKEND_IMAGE="${REGISTRY}/${IMAGE_OWNER}/voiceguard-backend@${BACKEND_DIGEST}"
export FRONTEND_IMAGE="${REGISTRY}/${IMAGE_OWNER}/voiceguard-frontend@${FRONTEND_DIGEST}"

echo "[1/6] Pulling images by digest..."
docker pull "${BACKEND_IMAGE}"
docker pull "${FRONTEND_IMAGE}"
echo "[OK] Images pulled."

echo "[2/6] Running Alembic migrations..."
docker run --rm \
    --network voiceguard_data_net \
    -e DATABASE_URL \
    -e PYTHONPATH=/app/backend:/app/ai-engine \
    "${BACKEND_IMAGE}" \
    sh -c "cd /app/backend && alembic upgrade head"
echo "[OK] Migrations complete."

echo "[3/6] Deploying services (rolling update)..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps backend frontend nginx
echo "[OK] Services updated."

echo "[4/6] Waiting for backend health check (up to 120s)..."
for i in $(seq 1 24); do
    STATUS=$(docker compose -f "${COMPOSE_FILE}" exec backend \
        curl -sf http://localhost:8000/api/v1/health 2>/dev/null \
        | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status",""))' \
        2>/dev/null || echo "pending")
    echo "  Attempt ${i}/24: ${STATUS}"
    if [ "${STATUS}" = "healthy" ]; then
        echo "[OK] Backend is healthy."
        break
    fi
    if [ "${i}" -eq 24 ]; then
        echo "[ERROR] Backend did not become healthy within 120s."
        echo "         Run: docker compose logs backend --tail=50"
        exit 1
    fi
    sleep 5
done

echo "[5/6] Running smoke tests..."
NGINX_IP=$(docker compose -f "${COMPOSE_FILE}" port nginx 80 | cut -d: -f1 || echo "localhost")
HEALTH=$(curl -sf "http://${NGINX_IP}/health" || echo "fail")
if [ "${HEALTH}" = "ok" ]; then
    echo "[OK] Nginx health endpoint: ok"
else
    echo "[WARN] Nginx health endpoint returned: ${HEALTH}"
fi

echo "[6/6] Deployment summary..."
echo ""
echo "============================================================"
echo " Deployment SUCCESSFUL"
echo " Environment:  ${ENVIRONMENT}"
echo " Backend:      ${BACKEND_IMAGE}"
echo " Frontend:     ${FRONTEND_IMAGE}"
echo " Completed:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Record deployment in audit log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DEPLOY ${ENVIRONMENT} backend=${BACKEND_DIGEST} frontend=${FRONTEND_DIGEST}" \
    >> "${APP_DIR}/logs/deployments.log"

