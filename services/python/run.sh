#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHON_PORT="${PYTHON_PORT:-5001}"
export PYTHON_HOST="${PYTHON_HOST:-127.0.0.1}"

echo "Starting Python Utility Service on port ${PYTHON_PORT}..."
exec python3 "${SCRIPT_DIR}/main.py"
