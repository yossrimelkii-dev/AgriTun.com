#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# TunAgri — one-command redeploy for the VPS.
#
# Usage (on the VPS, from the repo root):
#     ./scripts/deploy.sh                  # pull main + rebuild
#     ./scripts/deploy.sh --no-pull        # just rebuild what's on disk
#     ./scripts/deploy.sh --branch feature # deploy a specific branch
# ─────────────────────────────────────────────────────────────
set -Eeuo pipefail

BRANCH="main"
DO_PULL=1
COMPOSE_FILE="docker-compose.prod.yml"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-pull) DO_PULL=0; shift ;;
        --branch)  BRANCH="$2"; shift 2 ;;
        --file)    COMPOSE_FILE="$2"; shift 2 ;;
        *) echo "unknown flag: $1" >&2; exit 1 ;;
    esac
done

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
    echo "✗ .env.production is missing. Copy .env.production.example and fill it." >&2
    exit 1
fi

if [[ $DO_PULL -eq 1 ]]; then
    echo "→ Fetching latest from origin/$BRANCH..."
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
fi

echo "→ Building images (this can take 3-5 min on first run)..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" build --pull

echo "→ Rolling to the new image with zero interruption..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" up -d --remove-orphans

echo "→ Pruning old images..."
docker image prune -f >/dev/null

echo "→ Waiting for health check..."
for i in {1..30}; do
    if docker inspect --format '{{.State.Health.Status}}' tunagri-web 2>/dev/null | grep -q healthy; then
        echo "✓ Deployed. tunagri-web is healthy."
        docker compose --env-file .env.production -f "$COMPOSE_FILE" ps
        exit 0
    fi
    sleep 2
done

echo "✗ Container did not become healthy in 60s. Recent logs:" >&2
docker compose --env-file .env.production -f "$COMPOSE_FILE" logs --tail=80 web >&2
exit 1
