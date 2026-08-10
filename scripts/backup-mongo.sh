#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Nightly Mongo backup for the local Docker instance.
#
# Produces:  ~/mongo-backups/tunagri-YYYYMMDD-HHMMSS.gz
# Retention: keeps the last 14 nights, deletes older ones.
#
# Cron example (runs daily at 03:00):
#     crontab -e
#     0 3 * * *  /home/deploy/apps/tunagri/scripts/backup-mongo.sh >> /home/deploy/mongo-backup.log 2>&1
# ─────────────────────────────────────────────────────────────
set -Eeuo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
    echo "✗ .env.production is missing." >&2
    exit 1
fi

# Safe .env reader — does not source the file as shell (values may contain $, backticks, etc).
get_env() {
    local val
    val=$(grep -E "^${1}=" .env.production | head -n 1 | cut -d= -f2-)
    val="${val%$'\r'}"
    if [[ "$val" == \"*\" && "$val" == *\" ]]; then
        val="${val#\"}"; val="${val%\"}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
        val="${val#\'}"; val="${val%\'}"
    fi
    printf '%s' "$val"
}

MONGO_ROOT_USER=$(get_env MONGO_ROOT_USER)
MONGO_ROOT_PASSWORD=$(get_env MONGO_ROOT_PASSWORD)
MONGO_BACKUP_DIR=$(get_env MONGO_BACKUP_DIR)
MONGO_BACKUP_RETENTION_DAYS=$(get_env MONGO_BACKUP_RETENTION_DAYS)

: "${MONGO_ROOT_USER:?Set MONGO_ROOT_USER in .env.production}"
: "${MONGO_ROOT_PASSWORD:?Set MONGO_ROOT_PASSWORD in .env.production}"

BACKUP_DIR="${MONGO_BACKUP_DIR:-$HOME/mongo-backups}"
RETENTION_DAYS="${MONGO_BACKUP_RETENTION_DAYS:-14}"
STAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="tunagri-${STAMP}.gz"

mkdir -p "$BACKUP_DIR"

echo "→ [$(date -Is)] Dumping local mongo → ${BACKUP_DIR}/${ARCHIVE_NAME}"
# Stream the archive straight out of the container — no temp files inside it.
docker exec tunagri-mongo mongodump \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db tunagri \
    --gzip \
    --archive \
    > "${BACKUP_DIR}/${ARCHIVE_NAME}"

SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "→ Backup done (${SIZE})"

echo "→ Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -maxdepth 1 -name 'tunagri-*.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

echo "✓ Done. Retained backups:"
ls -lh "$BACKUP_DIR"/tunagri-*.gz 2>/dev/null | tail -n 5 || echo "  (none yet)"
