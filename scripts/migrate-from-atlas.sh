#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# One-time migration: MongoDB Atlas → local Docker mongo.
#
# Prereqs on the VPS:
#   - The stack is already up (docker compose ... up -d).
#   - .env.production contains ATLAS_URI (Atlas connection string)
#     AND MONGO_ROOT_USER / MONGO_ROOT_PASSWORD (local Mongo creds).
#
# What it does:
#   1. Dumps ALL collections from Atlas using mongodump inside a
#      throwaway container (no need to install mongo CLI on the host).
#   2. Streams the dump into the local Docker mongo via mongorestore.
#   3. Uses --drop so existing collections in the local DB are replaced.
#
# Safe to re-run. Idempotent for the current Atlas snapshot.
# ─────────────────────────────────────────────────────────────
set -Eeuo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
    echo "✗ .env.production is missing." >&2
    exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env.production; set +a

: "${ATLAS_URI:?Set ATLAS_URI in .env.production (Atlas connection string)}"
: "${MONGO_ROOT_USER:?Set MONGO_ROOT_USER in .env.production}"
: "${MONGO_ROOT_PASSWORD:?Set MONGO_ROOT_PASSWORD in .env.production}"

# Make sure the local mongo container is up.
if ! docker inspect -f '{{.State.Running}}' tunagri-mongo 2>/dev/null | grep -q true; then
    echo "✗ tunagri-mongo container is not running. Start the stack first:" >&2
    echo "    docker compose -f docker-compose.prod.yml up -d mongodb" >&2
    exit 1
fi

DUMP_DIR="$(mktemp -d -t atlas-dump.XXXXXX)"
trap 'rm -rf "$DUMP_DIR"' EXIT
echo "→ Using temporary dump dir: $DUMP_DIR"

echo "→ [1/2] Dumping from Atlas (this can take a few minutes)..."
# Run mongodump in a throwaway container. Mount the temp dir so the dump
# lands on the host filesystem where we can then push it into our mongo.
docker run --rm \
    -v "$DUMP_DIR:/dump" \
    mongo:7 \
    mongodump --uri="$ATLAS_URI" --out=/dump --gzip

echo "→ Dump size: $(du -sh "$DUMP_DIR" | cut -f1)"

# Find which db name Atlas dumped into (usually 'tunagri' but Atlas cluster
# might use a different default db).
DB_DIR=$(find "$DUMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
DB_NAME=$(basename "$DB_DIR")
echo "→ Detected source database: $DB_NAME"

echo "→ [2/2] Restoring into local Docker mongo as database 'tunagri'..."
# Copy the dump into the mongo container and restore from there.
docker cp "$DB_DIR" tunagri-mongo:/tmp/atlas-dump
docker exec tunagri-mongo mongorestore \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --nsInclude "${DB_NAME}.*" \
    --nsFrom "${DB_NAME}.*" \
    --nsTo "tunagri.*" \
    --drop \
    --gzip \
    /tmp/atlas-dump
docker exec tunagri-mongo rm -rf /tmp/atlas-dump

echo ""
echo "→ Verifying collection counts..."
docker exec tunagri-mongo mongosh \
    --quiet \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    tunagri \
    --eval 'db.getCollectionNames().forEach(function(c){ print(c + " → " + db[c].countDocuments()) })'

echo ""
echo "✓ Migration complete. Your app will use local Mongo on next request."
echo "  Consider clearing ATLAS_URI from .env.production now."
