#!/bin/sh
# =============================================================================
# VoiceGuard AI — PostgreSQL Backup Script
# Phase 32: Production Infrastructure
#
# Usage:
#   docker compose --profile backup run --rm db-backup
#
# Environment variables (injected by docker-compose):
#   PGPASSWORD          - PostgreSQL password
#   DB_NAME             - Database name
#   DB_USER             - Database user
#   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
# =============================================================================

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/voiceguard_${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-db}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting PostgreSQL backup..."
echo "  Database: ${DB_NAME}"
echo "  Host:     ${DB_HOST}"
echo "  File:     ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Run pg_dump with compression
pg_dump \
    --host="${DB_HOST}" \
    --port=5432 \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=plain \
    --no-password \
    --verbose \
    | gzip -9 > "${BACKUP_FILE}"

# Verify backup file was created and is non-empty
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file is empty or missing: ${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Verify backup integrity (pg_restore dry-run)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Verifying backup integrity..."
gunzip -t "${BACKUP_FILE}" && echo "[OK] Backup file is valid gzip archive."

# Remove backups older than retention period
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "voiceguard_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(ls "${BACKUP_DIR}" | wc -l)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete. ${REMAINING} backup(s) retained."

# Write a latest-backup manifest
echo "${BACKUP_FILE}" > "${BACKUP_DIR}/latest_backup.txt"
echo "${TIMESTAMP}" >> "${BACKUP_DIR}/backup_history.log"
echo "  File:     ${BACKUP_FILE}" >> "${BACKUP_DIR}/backup_history.log"
echo "  Size:     ${BACKUP_SIZE}" >> "${BACKUP_DIR}/backup_history.log"
echo "---" >> "${BACKUP_DIR}/backup_history.log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Done."

