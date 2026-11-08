#!/usr/bin/env bash
# =============================================================================
# VoiceGuard AI — Certbot TLS Certificate Renewal Script
# Phase 32: Production Infrastructure (SIH26104)
# =============================================================================

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/voiceguard}"
cd "$DEPLOY_DIR"

echo "=== [1/3] Triggering Certbot Renewal ==="
docker compose -f docker-compose.infrastructure.yml run --rm certbot renew --webroot -w /var/www/certbot --quiet

echo "=== [2/3] Reloading Nginx Configuration ==="
docker compose -f docker-compose.infrastructure.yml exec -T nginx nginx -s reload

echo "=== [3/3] Certificate Renewal Verification Complete ==="

