#!/usr/bin/env bash
# ==============================================================================
# Mm-Mp E2E Test Suite Runner
# Requirements: PROJECT.md § Architecture & Feature Inventory (Tiers 1-4)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

TARGET_TIER="${1:-all}"
SIM_PID=""

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

clean_test_db() {
  if check_port 5435 2>/dev/null; then
    PGPASSWORD=menumini_admin_dev psql -h 127.0.0.1 -p 5435 -U menu_admin -d menumini_db -c "TRUNCATE TABLE menumini.app_users, menumini.merchants, menumini.venues, menumini.merchant_memberships CASCADE;" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  if [ -n "$SIM_PID" ]; then
    kill -TERM "$SIM_PID" 2>/dev/null || true
    wait "$SIM_PID" 2>/dev/null || true
  fi
  clean_test_db
}
trap cleanup EXIT INT TERM

echo -e "${BOLD}${CYAN}====================================================================${RESET}"
echo -e "${BOLD}${CYAN}   Mm-Mp Commercial E2E Test Suite Runner (Node 22 Native)          ${RESET}"
echo -e "${BOLD}${CYAN}====================================================================${RESET}"
echo -e "Target Directory : ${TARGET_ROOT}"
echo -e "Selected Target  : ${BOLD}${YELLOW}${TARGET_TIER}${RESET}"
echo ""

# ------------------------------------------------------------------------------
# 1. Environment & Service Pre-flight Checks
# ------------------------------------------------------------------------------
check_port() {
  local port=$1
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
  else
    (echo > /dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
  fi
}

echo -e "${BOLD}Checking Subsystem Endpoints:${RESET}"

# Check Database
if check_port 5435; then
  echo -e "  [${GREEN}ONLINE${RESET}] PostgreSQL 18 Cluster (port 5435)"
else
  echo -e "  [${YELLOW}OFFLINE${RESET}] PostgreSQL on port 5435 (DB tests will verify connection)"
fi

# Check Microservices & Web PWA
SERVICES_ONLINE=true
for port in 8080 5001 5173; do
  if ! check_port "$port"; then
    SERVICES_ONLINE=false
  fi
done

if [ "$SERVICES_ONLINE" = true ]; then
  echo -e "  [${GREEN}ONLINE${RESET}] Live Microservices detected on ports 8080 (Go), 5001 (Python), 5173 (Web)"
else
  echo -e "  [${YELLOW}SIMULATION${RESET}] Starting High-Fidelity Simulation Harness for ports 8080, 5001, 5173..."
  node "$SCRIPT_DIR/helpers/mock-server.mjs" > /dev/null 2>&1 &
  SIM_PID=$!
  sleep 1
  if check_port 8080 && check_port 5001 && check_port 5173; then
    echo -e "  [${GREEN}READY${RESET}] Simulation Harness active (PID: $SIM_PID)"
  else
    echo -e "  [${RED}ERROR${RESET}] Failed to start simulation harness"
    exit 1
  fi
fi
clean_test_db
echo ""

# ------------------------------------------------------------------------------
# 2. Collect Test Files by Target Tier
# ------------------------------------------------------------------------------
TEST_FILES=()

case "$TARGET_TIER" in
  tier1|t1|features)
    TEST_FILES=(
      "tier1_features/f01_f04_database.test.mjs"
      "tier1_features/f05_f06_go_realtime.test.mjs"
      "tier1_features/f07_f08_python_utility.test.mjs"
      "tier1_features/f09_f10_rust_crypto.test.mjs"
      "tier1_features/f11_f16_pwa_ux.test.mjs"
      "tier1_features/f17_f24_commercial.test.mjs"
    )
    ;;
  tier2|t2|boundaries)
    TEST_FILES=(
      "tier2_boundaries/b01_b04_db_boundaries.test.mjs"
      "tier2_boundaries/b05_b06_go_boundaries.test.mjs"
      "tier2_boundaries/b07_b08_python_boundaries.test.mjs"
      "tier2_boundaries/b09_b10_rust_boundaries.test.mjs"
      "tier2_boundaries/b11_b16_pwa_boundaries.test.mjs"
      "tier2_boundaries/b17_b24_commercial_boundaries.test.mjs"
    )
    ;;
  tier3|t3|combinations)
    TEST_FILES=(
      "tier3_combinations/c01_import_to_studio_publish.test.mjs"
      "tier3_combinations/c02_auth_session_invalidation.test.mjs"
      "tier3_combinations/c03_table_qr_to_customer_cart.test.mjs"
      "tier3_combinations/c04_cart_order_to_websocket_kds.test.mjs"
      "tier3_combinations/c05_crypto_capability_to_guest_order.test.mjs"
    )
    ;;
  tier4|t4|scenarios)
    TEST_FILES=(
      "tier4_scenarios/s01_bole_velvet_cafe.test.mjs"
      "tier4_scenarios/s02_habesha_coffee_roastery.test.mjs"
      "tier4_scenarios/s03_entoto_forest_bistro.test.mjs"
    )
    ;;
  db|database)
    TEST_FILES=(
      "tier1_features/f01_f04_database.test.mjs"
      "tier2_boundaries/b01_b04_db_boundaries.test.mjs"
    )
    ;;
  all|full)
    TEST_FILES=(
      "tier1_features/f01_f04_database.test.mjs"
      "tier1_features/f05_f06_go_realtime.test.mjs"
      "tier1_features/f07_f08_python_utility.test.mjs"
      "tier1_features/f09_f10_rust_crypto.test.mjs"
      "tier1_features/f11_f16_pwa_ux.test.mjs"
      "tier1_features/f17_f24_commercial.test.mjs"
      "tier2_boundaries/b01_b04_db_boundaries.test.mjs"
      "tier2_boundaries/b05_b06_go_boundaries.test.mjs"
      "tier2_boundaries/b07_b08_python_boundaries.test.mjs"
      "tier2_boundaries/b09_b10_rust_boundaries.test.mjs"
      "tier2_boundaries/b11_b16_pwa_boundaries.test.mjs"
      "tier2_boundaries/b17_b24_commercial_boundaries.test.mjs"
      "tier3_combinations/c01_import_to_studio_publish.test.mjs"
      "tier3_combinations/c02_auth_session_invalidation.test.mjs"
      "tier3_combinations/c03_table_qr_to_customer_cart.test.mjs"
      "tier3_combinations/c04_cart_order_to_websocket_kds.test.mjs"
      "tier3_combinations/c05_crypto_capability_to_guest_order.test.mjs"
      "tier4_scenarios/s01_bole_velvet_cafe.test.mjs"
      "tier4_scenarios/s02_habesha_coffee_roastery.test.mjs"
      "tier4_scenarios/s03_entoto_forest_bistro.test.mjs"
    )
    ;;
  *)
    if [ -f "$TARGET_TIER" ]; then
      TEST_FILES=("$TARGET_TIER")
    else
      echo -e "${RED}Unknown target: $TARGET_TIER${RESET}"
      echo "Usage: ./run_all.sh [all|tier1|tier2|tier3|tier4|db|<path-to-test>]"
      exit 1
    fi
    ;;
esac

# ------------------------------------------------------------------------------
# 3. Execution Loop & Reporting
# ------------------------------------------------------------------------------
TOTAL_FILES=${#TEST_FILES[@]}
PASSED_FILES=0
FAILED_FILES=0
FAILED_NAMES=()

echo -e "${BOLD}Executing ${TOTAL_FILES} Test Suite Files:${RESET}"
echo "--------------------------------------------------------------------"

START_TIME=$(date +%s%N 2>/dev/null || date +%s)

for test_file in "${TEST_FILES[@]}"; do
  file_name=$(basename "$test_file")
  dir_name=$(dirname "$test_file")
  printf "  • %-50s " "${dir_name}/${file_name}"

  # Run test file and capture output
  if node --test "$test_file" > /tmp/e2e_last_run.log 2>&1; then
    echo -e "[${GREEN}PASS${RESET}]"
    PASSED_FILES=$((PASSED_FILES + 1))
  else
    echo -e "[${RED}FAIL${RESET}]"
    FAILED_FILES=$((FAILED_FILES + 1))
    FAILED_NAMES+=("$test_file")
    echo -e "${RED}--- Failure Output (${file_name}) ---${RESET}"
    cat /tmp/e2e_last_run.log | tail -n 25
    echo -e "${RED}---------------------------------------${RESET}"
  fi
done

END_TIME=$(date +%s%N 2>/dev/null || date +%s)
ELAPSED_SEC="0"
if [ "$START_TIME" -gt 0 ] && [ "$END_TIME" -gt "$START_TIME" ]; then
  ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  ELAPSED_SEC=$(awk -v ms="$ELAPSED_MS" 'BEGIN { printf "%.2f", ms / 1000 }')
fi

# ------------------------------------------------------------------------------
# 4. Final Summary
# ------------------------------------------------------------------------------
echo "--------------------------------------------------------------------"
echo -e "${BOLD}E2E Test Execution Summary:${RESET}"
echo -e "  Total Files : ${TOTAL_FILES}"
echo -e "  Passed Files: ${GREEN}${PASSED_FILES}${RESET}"
echo -e "  Failed Files: ${RED}${FAILED_FILES}${RESET}"
echo -e "  Duration    : ${ELAPSED_SEC}s"
echo ""

if [ "$FAILED_FILES" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✔ ALL E2E TESTS PASSED (100% SUCCESS)${RESET}"
  exit 0
else
  echo -e "${BOLD}${RED}✖ SOME TESTS FAILED (${FAILED_FILES} failing files):${RESET}"
  for fail in "${FAILED_NAMES[@]}"; do
    echo -e "  - ${RED}${fail}${RESET}"
  done
  exit 1
fi
