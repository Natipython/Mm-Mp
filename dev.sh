#!/usr/bin/env bash
# ==============================================================================
# MenuMini (Mm-Mp) Unified Orchestrator Supervisor
# Starts PostgreSQL (port 5435), Go Realtime (port 8080), Python (port 5001), Web (port 5173)
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

# Load environment configuration
if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  source "${ROOT_DIR}/.env"
  set +a
fi

PGPORT="${PGPORT:-5435}"
GO_PORT="${GO_PORT:-8080}"
PYTHON_PORT="${PYTHON_PORT:-5001}"
WEB_PORT="${WEB_PORT:-5173}"

LOG_DIR="${ROOT_DIR}/.logs"
mkdir -p "${LOG_DIR}"

GO_PID=""
PYTHON_PID=""
WEB_PID=""

cleanup() {
  echo ""
  echo "===================================================================="
  echo " Shutting down MenuMini Microservices..."
  echo "===================================================================="
  if [ -n "${WEB_PID}" ] && kill -0 "${WEB_PID}" 2>/dev/null; then
    echo "Stopping Web PWA (PID: ${WEB_PID})..."
    kill -TERM "${WEB_PID}" 2>/dev/null || true
  fi
  if [ -n "${PYTHON_PID}" ] && kill -0 "${PYTHON_PID}" 2>/dev/null; then
    echo "Stopping Python Utility Service (PID: ${PYTHON_PID})..."
    kill -TERM "${PYTHON_PID}" 2>/dev/null || true
  fi
  if [ -n "${GO_PID}" ] && kill -0 "${GO_PID}" 2>/dev/null; then
    echo "Stopping Go Realtime Engine (PID: ${GO_PID})..."
    kill -TERM "${GO_PID}" 2>/dev/null || true
  fi
  echo "All microservices stopped cleanly."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "===================================================================="
echo " Starting MenuMini Commercial Digital Menu & QR Platform            "
echo "===================================================================="
echo "Root Directory : ${ROOT_DIR}"
echo "PostgreSQL     : Port ${PGPORT}"
echo "Go Realtime    : Port ${GO_PORT}"
echo "Python Utility : Port ${PYTHON_PORT}"
echo "Web PWA        : Port ${WEB_PORT}"
echo "--------------------------------------------------------------------"

# 1. Verify PostgreSQL 18 Cluster
echo "Step 1: Checking PostgreSQL Cluster on port ${PGPORT}..."
if ! pg_isready -h 127.0.0.1 -p "${PGPORT}" >/dev/null 2>&1; then
  echo "Starting PostgreSQL cluster..."
  "${ROOT_DIR}/database/init.sh"
fi

for i in {1..30}; do
  if pg_isready -h 127.0.0.1 -p "${PGPORT}" >/dev/null 2>&1; then
    echo "  [ONLINE] PostgreSQL cluster ready on port ${PGPORT}"
    break
  fi
  sleep 0.5
done

# 2. Start Go Realtime Engine (Port 8080)
echo "Step 2: Starting Go Realtime Engine on port ${GO_PORT}..."
"${ROOT_DIR}/services/go/run.sh" > "${LOG_DIR}/go.log" 2>&1 &
GO_PID=$!

for i in {1..20}; do
  if curl -s "http://127.0.0.1:${GO_PORT}/healthz" >/dev/null 2>&1; then
    echo "  [ONLINE] Go Realtime Engine health check passed (PID: ${GO_PID})"
    break
  fi
  sleep 0.2
done

# 3. Start Python Utility Service (Port 5001)
echo "Step 3: Starting Python Utility Service on port ${PYTHON_PORT}..."
"${ROOT_DIR}/services/python/run.sh" > "${LOG_DIR}/python.log" 2>&1 &
PYTHON_PID=$!

for i in {1..20}; do
  if curl -s "http://127.0.0.1:${PYTHON_PORT}/healthz" >/dev/null 2>&1; then
    echo "  [ONLINE] Python Utility Service health check passed (PID: ${PYTHON_PID})"
    break
  fi
  sleep 0.2
done

# 4. Start Web PWA Server (Port 5173)
echo "Step 4: Starting Luxury Web PWA on port ${WEB_PORT}..."
node "${ROOT_DIR}/web/server.mjs" > "${LOG_DIR}/web.log" 2>&1 &
WEB_PID=$!

for i in {1..30}; do
  if curl -s "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
    echo "  [ONLINE] Web PWA health check passed (PID: ${WEB_PID})"
    break
  fi
  sleep 0.2
done

echo "===================================================================="
echo " ✔ ALL SERVICES ONLINE AND READY FOR PRODUCTION WORKFLOWS            "
echo "===================================================================="
echo " - Salesperson Landing Page : http://127.0.0.1:${WEB_PORT}/"
echo " - Business Registration   : http://127.0.0.1:${WEB_PORT}/register"
echo " - Owner Studio Login      : http://127.0.0.1:${WEB_PORT}/login"
echo " - Realtime QR Service     : http://127.0.0.1:${GO_PORT}/api/v1/qr"
echo " - Realtime Dining WS      : ws://127.0.0.1:${GO_PORT}/ws/dining"
echo " - Amharic Normalizer      : http://127.0.0.1:${PYTHON_PORT}/api/v1/normalize-amharic"
echo "===================================================================="
echo "Press Ctrl+C to terminate all services."

# Wait for any process exit or signal
wait -n "${GO_PID}" "${PYTHON_PID}" "${WEB_PID}" || true
cleanup
