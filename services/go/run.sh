#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GO_PORT="${GO_PORT:-8080}"
export GO_HOST="${GO_HOST:-127.0.0.1}"

if command -v go >/dev/null 2>&1; then
  echo "Starting Go Realtime Engine via native Go runtime on port ${GO_PORT}..."
  exec go run "${SCRIPT_DIR}/cmd/server/main.go"
else
  echo "Native Go compiler not detected on host; starting Realtime Engine via runtime server on port ${GO_PORT}..."
  exec node "${SCRIPT_DIR}/server.mjs"
fi
