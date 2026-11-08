#!/bin/bash
# =============================================================================
# VoiceGuard AI — Database Restore Script
# Phase 32: Production Infrastructure
#
# Usage:
#   ./infra/scripts/db_restore.sh /path/to/backup.sql.gz [target_db]
#
# IMPORTANT:
#   - This script is DESTRUCTIVE. It drops and recreates the target database.
#   - Only use on staging or for disaster recovery.
#   - Always verify the backup file before restoring.
# =============================================================================

set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup.sql.gz> [target_database]}"
TARGET_DB="${2:-${DB_NAME:-voiceguard_restore_test}}"
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-voiceguard}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "======================================================================"
echo " VoiceGuard AI — Database Restore"
echo "======================================================================"
echo " Backup file: ${BACKUP_FILE}"
echo " Target DB:   ${TARGET_DB}"
echo " Host:        ${DB_HOST}"
echo " User:        ${DB_USER}"
echo "======================================================================"
echo ""
echo "WARNING: This will DROP and RECREATE the database '${TARGET_DB}'."
echo "Press Ctrl+C within 10 seconds to abort..."
sleep 10

echo ""
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Step 1: Verifying backup file integrity..."
if gunzip -t "${BACKUP_FILE}"; then
    echo "[OK] Backup file is valid."
else
    echo "[ERROR] Backup file is corrupt. Aborting."
    exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Step 2: Dropping existing database (if exists)..."
psql \
    --host="${DB_HOST}" \
    --username="${DB_USER}" \
    --dbname=postgres \
    -c "DROP DATABASE IF EXISTS ${TARGET_DB};" \
    --no-password

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Step 3: Creating fresh database..."
psql \
    --host="${DB_HOST}" \
    --username="${DB_USER}" \
    --dbname=postgres \
    -c "CREATE DATABASE ${TARGET_DB} OWNER ${DB_USER} ENCODING 'UTF8';" \
    --no-password

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Step 4: Restoring from backup..."
gunzip -c "${BACKUP_FILE}" | psql \
    --host="${DB_HOST}" \
    --username="${DB_USER}" \
    --dbname="${TARGET_DB}" \
    --no-password

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Step 5: Verifying restore..."
TABLE_COUNT=$(psql \
    --host="${DB_HOST}" \
    --username="${DB_USER}" \
    --dbname="${TARGET_DB}" \
    --tuples-only \
    --command="SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" \
    --no-password | tr -d ' ')

echo ""
echo "======================================================================"
echo " Restore complete."
echo " Database:    ${TARGET_DB}"
echo " Tables:      ${TABLE_COUNT}"
echo " Source:      ${BACKUP_FILE}"
echo " Completed:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "======================================================================"
echo ""
echo "NEXT STEPS:"
echo "  1. Run alembic upgrade head to apply any pending migrations."
echo "  2. Run smoke tests against the restored database."
echo "  3. Verify data integrity with spot checks."

