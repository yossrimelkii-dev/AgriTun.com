#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# One-time migration: convert base64 category images to Cloudinary URLs.
#
# Usage:  ./scripts/migrate-category-images.sh
#
# Runs the TypeScript migration inside a throwaway node container so we
# don't have to install tsx/deps on the VPS. Env vars come from
# .env.production; the container joins tunagri's Docker network so
# `mongodb:27017` resolves.
# ─────────────────────────────────────────────────────────────
set -Eeuo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
    echo "✗ .env.production is missing." >&2
    exit 1
fi

# Safe .env reader — grabs literal value after the first `=`.
get_env() {
    local val
    val=$(grep -E "^${1}=" .env.production | head -n 1 | cut -d= -f2-)
    val="${val%$'\r'}"
    if [[ "$val" == \"*\" && "$val" == *\" ]]; then val="${val#\"}"; val="${val%\"}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then val="${val#\'}"; val="${val%\'}"
    fi
    printf '%s' "$val"
}

MONGODB_URI=$(get_env MONGODB_URI)
CLOUDINARY_CLOUD_NAME=$(get_env CLOUDINARY_CLOUD_NAME)
CLOUDINARY_API_KEY=$(get_env CLOUDINARY_API_KEY)
CLOUDINARY_API_SECRET=$(get_env CLOUDINARY_API_SECRET)

: "${MONGODB_URI:?MONGODB_URI missing from .env.production}"
: "${CLOUDINARY_CLOUD_NAME:?CLOUDINARY_CLOUD_NAME missing}"
: "${CLOUDINARY_API_KEY:?CLOUDINARY_API_KEY missing}"
: "${CLOUDINARY_API_SECRET:?CLOUDINARY_API_SECRET missing}"

if ! docker network inspect tunagri_tunagri-net >/dev/null 2>&1; then
    echo "✗ tunagri_tunagri-net Docker network is not up. Start the stack first." >&2
    exit 1
fi

echo "→ Running category-image migration..."
docker run --rm \
    --network tunagri_tunagri-net \
    -v "$(pwd):/app" \
    -w /app \
    -e MONGODB_URI="$MONGODB_URI" \
    -e CLOUDINARY_CLOUD_NAME="$CLOUDINARY_CLOUD_NAME" \
    -e CLOUDINARY_API_KEY="$CLOUDINARY_API_KEY" \
    -e CLOUDINARY_API_SECRET="$CLOUDINARY_API_SECRET" \
    node:20-alpine \
    sh -c "corepack enable >/dev/null 2>&1 && \
           corepack prepare pnpm@9.12.0 --activate >/dev/null 2>&1 && \
           cd packages/db && \
           pnpm install --no-frozen-lockfile --prefer-offline >/dev/null 2>&1 && \
           pnpm db:migrate:category-images"

echo ""
echo "✓ Done. Refresh https://tunagri.com — categories should now render their own images."
