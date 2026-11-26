#!/usr/bin/env bash
# Starts everything Sandworm Stocks needs in one go: the database and API (Docker), then the web app, the MCP server and the realtime server.
# Run it from anywhere: ./scripts/start-dev.sh   (or: pnpm dev)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

WEB_PORT=3001
API_PORT=4000
CLEAN_VOLUMES=false
ONLY_APPS=false

usage() {
  cat <<USAGE
Usage: $0 [--only] [--clean-volumes]

Starts the database and API (Docker), then the web app, MCP server and realtime server.

  --only           skip Docker: the database and API are already running
  --clean-volumes  throw the local database away first (alias --nuke); the API makes the tables again when it starts
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY_APPS=true; shift ;;
    --clean-volumes|--nuke) CLEAN_VOLUMES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown flag: $1"; usage; exit 1 ;;
  esac
done

fail() { echo "✗ $1" >&2; exit 1; }

# ─── CHECKS ──────────────────────────────────────────────────────────────────
echo "▶ Checking the machine..."
command -v pnpm > /dev/null || fail "pnpm is not installed"
if [ "$ONLY_APPS" = false ]; then
  command -v docker > /dev/null || fail "Docker is not installed"
  docker info > /dev/null 2>&1 || fail "Docker is not running. Start Docker (or OrbStack) and run this again"
fi

# Next reads this file; without the API address and key it cannot reach the API.
ENV_FILE="apps/web/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  cp apps/web/.env.example "$ENV_FILE"
  echo "  Made $ENV_FILE from .env.example. Fill in the values it needs, then run this again"
  exit 1
fi
for name in STOCKS_API_URL STOCKS_API_KEY; do
  grep -qE "^$name=.+" "$ENV_FILE" || fail "$name is not set in $ENV_FILE (locally: STOCKS_API_URL=http://localhost:$API_PORT, STOCKS_API_KEY=local-development-key)"
done

# A port that is taken means an old dev server is still running; starting a second one only fails halfway.
if lsof -iTCP:"$WEB_PORT" -sTCP:LISTEN -n -P > /dev/null 2>&1; then
  fail "Port $WEB_PORT is taken. Stop the old web dev server (lsof -iTCP:$WEB_PORT -sTCP:LISTEN) and run this again"
fi

# ─── DEPENDENCIES ────────────────────────────────────────────────────────────
echo "▶ Checking node_modules..."
for dir in . apps/web apps/mcp; do
  [ -d "$dir/node_modules" ] || { echo "  Installing $dir..."; pnpm --dir "$dir" install; }
done

# ─── DATABASE AND API ────────────────────────────────────────────────────────
if [ "$ONLY_APPS" = false ]; then
  if [ "$CLEAN_VOLUMES" = true ]; then
    echo "▶ Throwing the local database away..."
    docker compose down -v
  fi

  echo "▶ Starting the database and API (Docker)..."
  # --wait returns once their health checks pass; the API migrates the database before it answers.
  docker compose up -d --build --wait
fi

echo "▶ Waiting for the API on :$API_PORT..."
for _ in $(seq 1 60); do
  curl -fsS "http://localhost:$API_PORT/health" > /dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://localhost:$API_PORT/health" > /dev/null 2>&1 || fail "The API did not answer on :$API_PORT. See: docker compose logs api"
echo "  API is up ✅"

# ─── THE APPS ────────────────────────────────────────────────────────────────
echo "▶ Starting web (:$WEB_PORT), MCP and realtime... (Ctrl+C stops them; 'pnpm stop' stops Docker)"
exec pnpm exec concurrently \
  --names web,mcp,realtime \
  --prefix-colors cyan,magenta,yellow \
  --kill-signal SIGTERM \
  --kill-others \
  "pnpm --dir apps/web dev" \
  "pnpm --dir apps/mcp dev" \
  "pnpm --dir apps/web realtime"
