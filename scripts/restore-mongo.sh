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

# Safe .env reader — does not source the file as shell.
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
: "${MONGO_ROOT_USER:?Set MONGO_ROOT_USER in .env.production}"
: "${MONGO_ROOT_PASSWORD:?Set MONGO_ROOT_PASSWORD in .env.production}"

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
