#!/bin/sh
# Rebuild and restart the production stack, then wait until the backend is healthy.
# Run from the repo root on the VPS (the GitHub Actions deploy job calls it after `git reset`).
set -eu

COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

$COMPOSE up -d --build --remove-orphans

# The backend loads the 3D model at startup, so it can take a few minutes to turn healthy.
for i in $(seq 1 60); do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$($COMPOSE ps -q backend)" 2>/dev/null || echo starting)
  if [ "$status" = "healthy" ]; then
    echo "Deploy OK: backend healthy"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "Deploy FAILED: backend not healthy after 5 minutes" >&2
$COMPOSE ps >&2
$COMPOSE logs --tail=50 backend >&2
exit 1
