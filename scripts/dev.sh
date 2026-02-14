#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_BIN="$ROOT_DIR/.venv/bin/uvicorn"
FRONTEND_DIR="$ROOT_DIR/synaptiq-connect"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"

if [[ ! -x "$BACKEND_BIN" ]]; then
  echo "Missing backend runtime: $BACKEND_BIN"
  echo "Run: ./.venv/bin/pip install -r requirements.txt"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Missing frontend dependencies: $FRONTEND_DIR/node_modules"
  echo "Run: cd synaptiq-connect && npm install"
  exit 1
fi

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

if port_in_use "$BACKEND_PORT"; then
  echo "Port $BACKEND_PORT is already in use (backend)."
  echo "Use a different port, for example: BACKEND_PORT=8001 make dev"
  exit 1
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "Port $FRONTEND_PORT is already in use (frontend)."
  echo "Use a different port, for example: FRONTEND_PORT=8081 make dev"
  exit 1
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR"
  "$BACKEND_BIN" app.main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  npm run dev -- --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo "Backend:  http://127.0.0.1:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend process exited."
    exit 1
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Frontend process exited."
    exit 1
  fi
  sleep 1
done
