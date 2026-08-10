#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Restore a Mongo backup archive back into the local instance.
#
# Usage:
#     ./scripts/restore-mongo.sh ~/mongo-backups/tunagri-20260810-030000.gz
#
# Uses --drop so the current tunagri DB is REPLACED with the backup.
# ─────────────────────────────────────────────────────────────
set -Eeuo pipefail

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
    echo "Usage: $0 <path-to-backup.gz>" >&2
    exit 1
fi

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
set -a; . ./.env.production; set +a
: "${MONGO_ROOT_USER:?}"
: "${MONGO_ROOT_PASSWORD:?}"

echo "⚠  This will DROP the current 'tunagri' database and restore from:"
echo "     $ARCHIVE"
read -r -p "Type 'RESTORE' to continue: " CONFIRM
[[ "$CONFIRM" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

echo "→ Streaming archive into mongorestore..."
docker exec -i tunagri-mongo mongorestore \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db tunagri \
    --drop \
    --gzip \
    --archive \
    < "$ARCHIVE"

echo "✓ Restore complete."
