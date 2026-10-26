#!/usr/bin/env bash
# ============================================================================
# MenuMini & MenuPro: Database Cluster Orchestrator & Migration Runner
# Target: PostgreSQL 18+ on Dedicated Port 5435
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$BASE_DIR/database"
PGDATA="${PGDATA:-$DB_DIR/pgdata}"
SOCKET_DIR="${SOCKET_DIR:-$DB_DIR/socket}"
LOG_FILE="${LOG_FILE:-$DB_DIR/postgres.log}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$DB_DIR/migrations}"
ROLES_SQL="${ROLES_SQL:-$DB_DIR/roles.sql}"
VERIFY_SQL="${VERIFY_SQL:-$DB_DIR/verify_clean.sql}"

PG_BIN="${PG_BIN:-/usr/lib/postgresql/18/bin}"
PGPORT="${PGPORT:-5435}"
DB_NAME="${DB_NAME:-menumini_db}"
SUPERUSER="menu_admin"

# Common psql command invoking the private local Unix socket
PSQL_SOCKET=("$PG_BIN/psql" -X -w -q -v ON_ERROR_STOP=1 -h "$SOCKET_DIR" -p "$PGPORT" -U "$SUPERUSER")
PSQL_DB=("${PSQL_SOCKET[@]}" -d "$DB_NAME")

# ----------------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------------
log() {
  echo "[database/init.sh] $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

check_binaries() {
  for bin in initdb pg_ctl pg_isready psql createdb; do
    if [ ! -x "$PG_BIN/$bin" ]; then
      echo "Error: Required binary $PG_BIN/$bin not found or not executable." >&2
      exit 1
    fi
  done
}

is_running() {
  "$PG_BIN/pg_isready" -h "$SOCKET_DIR" -p "$PGPORT" >/dev/null 2>&1
}

# ----------------------------------------------------------------------------
# Subcommands
# ----------------------------------------------------------------------------
cmd_start() {
  check_binaries
  if is_running; then
    log "PostgreSQL is already running on port $PGPORT."
    return 0
  fi
  log "Starting PostgreSQL cluster on port $PGPORT..."
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOG_FILE" -w start
  log "PostgreSQL started successfully (PID: $(head -n 1 "$PGDATA/postmaster.pid"))."
}

cmd_stop() {
  check_binaries
  if ! is_running; then
    log "PostgreSQL is not running."
    return 0
  fi
  log "Stopping PostgreSQL cluster (fast mode)..."
  "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop
  log "PostgreSQL stopped cleanly."
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  check_binaries
  if is_running; then
    log "PostgreSQL is running on port $PGPORT (socket: $SOCKET_DIR)."
    "$PG_BIN/pg_ctl" -D "$PGDATA" status
  else
    log "PostgreSQL is stopped."
    return 1
  fi
}

cmd_psql() {
  check_binaries
  exec "$PG_BIN/psql" -h "$SOCKET_DIR" -p "$PGPORT" -U "$SUPERUSER" -d "$DB_NAME" "$@"
}

cmd_check() {
  check_binaries
  if ! is_running; then
    echo "Error: PostgreSQL is not running. Start it first with '$0 start'." >&2
    exit 1
  fi

  log "Verifying schema tables..."
  local tbl_count
  tbl_count=$("${PSQL_DB[@]}" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='menumini' AND table_type='BASE TABLE';")
  log "Base tables in schema 'menumini': $tbl_count (expected 48)."

  if [ -f "$VERIFY_SQL" ]; then
    log "Executing zero-sample-data verification query script ($VERIFY_SQL)..."
    "${PSQL_DB[@]}" -f "$VERIFY_SQL"
  else
    log "Warning: $VERIFY_SQL not found, running fallback verification queries..."
    local record_count
    record_count=$("${PSQL_DB[@]}" -tAc "
      SELECT coalesce(sum(c), 0) FROM (
        SELECT count(*) as c FROM menumini.merchants
        UNION ALL SELECT count(*) FROM menumini.venues
        UNION ALL SELECT count(*) FROM menumini.app_users
        UNION ALL SELECT count(*) FROM menumini.menu_items
        UNION ALL SELECT count(*) FROM menumini.orders
        UNION ALL SELECT count(*) FROM menumini.venue_routes
      ) counts;
    ")

    if [ "$record_count" -ne "0" ]; then
      echo "CRITICAL VIOLATION: Database contains $record_count existing records!" >&2
      exit 1
    fi
  fi
  log "SUCCESS: Zero sample data verified (0 records found)."
}

cmd_init() {
  check_binaries
  log "=== Starting PostgreSQL 18 Cluster Initialization ==="

  mkdir -p "$SOCKET_DIR" "$PGDATA"
  chmod 0700 "$SOCKET_DIR" "$PGDATA"

  # 1. Initialize cluster if data directory is empty
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    log "Bootstrapping empty database cluster in $PGDATA..."
    "$PG_BIN/initdb" -D "$PGDATA" \
      -U "$SUPERUSER" \
      --auth-local=trust \
      --auth-host=scram-sha-256 \
      --no-locale \
      --encoding=UTF8

    log "Configuring custom postgresql.conf..."
    cat << EOF >> "$PGDATA/postgresql.conf"

# ============================================================================
# Mm-Mp Custom Configuration
# ============================================================================
port = $PGPORT
listen_addresses = '127.0.0.1'
unix_socket_directories = '$SOCKET_DIR, /tmp'
max_connections = 100
shared_buffers = 128MB
timezone = 'Africa/Addis_Ababa'
log_timezone = 'Africa/Addis_Ababa'
datestyle = 'iso, ymd'
EOF

    log "Configuring pg_hba.conf client authentication..."
    cat << EOF > "$PGDATA/pg_hba.conf"
# TYPE  DATABASE        USER                    ADDRESS                 METHOD
local   all             all                                             trust
host    all             menu_admin              127.0.0.1/32            scram-sha-256
host    all             menu_workspace_runtime  127.0.0.1/32            scram-sha-256
host    all             menu_customer           127.0.0.1/32            scram-sha-256
host    all             menu_guest_runtime      127.0.0.1/32            scram-sha-256
host    all             all                     127.0.0.1/32            reject
EOF
  else
    log "Existing cluster detected at $PGDATA. Skipping initdb."
  fi

  # 2. Start PostgreSQL cluster
  cmd_start

  # 3. Create target database menumini_db if missing
  local db_exists
  db_exists=$("${PSQL_SOCKET[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null || true)
  if [ "$db_exists" != "1" ]; then
    log "Creating database $DB_NAME owned by $SUPERUSER..."
    "$PG_BIN/createdb" -h "$SOCKET_DIR" -p "$PGPORT" -U "$SUPERUSER" -O "$SUPERUSER" -E UTF8 "$DB_NAME"
  else
    log "Database $DB_NAME already exists."
  fi

  # 4. Initialize migration tracking table
  "${PSQL_DB[@]}" -c "CREATE TABLE IF NOT EXISTS public._applied_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"

  # 5. Apply migrations 0001–0012 sequentially and idempotently
  local migrations=(
    "0001_foundation.sql"
    "0002_workflow.sql"
    "0003_mini_two_branches.sql"
    "0004_phone_identity_fields.sql"
    "0005_menu_publication.sql"
    "0006_service_preparation.sql"
    "0007_staff_service.sql"
    "0008_cashier_settlement.sql"
    "0009_guest_ordering.sql"
    "0010_payer_claims.sql"
    "0011_command_recovery.sql"
    "0012_optional_landmark.sql"
  )

  for mig in "${migrations[@]}"; do
    local is_applied
    is_applied=$("${PSQL_DB[@]}" -tAc "SELECT 1 FROM public._applied_migrations WHERE name='$mig';" 2>/dev/null || true)
    if [ "$is_applied" != "1" ]; then
      if [ ! -f "$MIGRATIONS_DIR/$mig" ]; then
        echo "Error: Migration file $MIGRATIONS_DIR/$mig not found!" >&2
        exit 1
      fi
      log "Applying migration: $mig..."
      "${PSQL_DB[@]}" -f "$MIGRATIONS_DIR/$mig"
      "${PSQL_DB[@]}" -c "INSERT INTO public._applied_migrations (name) VALUES ('$mig');"
    else
      log "Migration $mig already applied. Skipping."
    fi
  done

  # 6. Provision runtime login roles
  if [ -f "$ROLES_SQL" ]; then
    log "Provisioning runtime roles from $ROLES_SQL..."
    "${PSQL_DB[@]}" -f "$ROLES_SQL"
  else
    echo "Warning: $ROLES_SQL not found. Skipping external role provisioning." >&2
  fi

  # 7. Zero-sample-data verification
  cmd_check

  log "=== PostgreSQL 18 Cluster Ready on Port $PGPORT ($DB_NAME) ==="
}

cmd_reset() {
  log "WARNING: This will stop PostgreSQL and ERASE $PGDATA and $SOCKET_DIR!"
  read -r -p "Are you sure you want to completely reset the cluster? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    cmd_stop || true
    rm -rf "$PGDATA" "$SOCKET_DIR" "$LOG_FILE"
    log "Cluster storage wiped. Re-initializing..."
    cmd_init
  else
    log "Reset cancelled."
  fi
}

# ----------------------------------------------------------------------------
# Command Dispatch
# ----------------------------------------------------------------------------
ACTION="${1:-init}"
shift || true

case "$ACTION" in
  init)     cmd_init "$@" ;;
  start)    cmd_start "$@" ;;
  stop)     cmd_stop "$@" ;;
  restart)  cmd_restart "$@" ;;
  status)   cmd_status "$@" ;;
  check)    cmd_check "$@" ;;
  psql)     cmd_psql "$@" ;;
  reset)    cmd_reset "$@" ;;
  *)
    echo "Usage: $0 {init|start|stop|restart|status|check|psql|reset}" >&2
    exit 1
    ;;
esac
