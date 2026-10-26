# Comprehensive Microservices Architecture Survey: Go, Python, Rust & Unified Orchestrator

**Survey Date:** 2026-10-20  
**Survey Agent:** Survey Explorer 2 (Microservices Architect)  
**Target Codebase:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Reference Codebase:** `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`  
**Governing Specifications:** `ORIGINAL_REQUEST.md` (R1, R2, R3)

---

## 1. Executive Summary & Problem Scope

### 1.1 State of the Target Directory (`Mm-Mp`)
Inspection of `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` confirms that the directory is currently a **clean slate**, containing only `.agents/teamwork/`. No source code, services, database clusters, or scripts exist yet in the target directory.

### 1.2 State of the Reference Codebase (`menu-qrwebsite-payment`)
Detailed inspection across `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment` reveals:
1. **Monolithic Architecture:** All backend operations were concentrated in the SvelteKit Node.js server (`MenuMini_1/src/lib/server/`) communicating directly with PostgreSQL via `node-postgres` (`pg` package).
2. **Missing Microservices in Reference:**
   - There are **no** `services/go` files (QR generation was handled via Node `qrcode` package or mocked, and WebSocket events were simulated using client-side `setTimeout` loops in Svelte).
   - There are **no** `services/python` API services (Python was only used for test scripts like `check-menu-workflow-db.py` and `build-workflow-contract.py`; there is no standalone service for menu import/export or Amharic text normalization).
   - There is **no** `core/rust` module (cryptographic tokens were derived via Node `node:crypto` `scryptSync`, `createHmac('sha256')`, and client-side validation was done in TypeScript).
   - There is **no** unified orchestrator `dev.sh` (services and databases had to be launched manually or through individual preview scripts).
3. **Database Precedence:** PostgreSQL migrations `0001` through `0012` in `MenuMini_1/database/migrations` represent a comprehensive, rock-solid schema with Row Level Security (RLS), transactional idempotency, and strict role segregation. In the reference environment, PostgreSQL 18 is running on port 5434 with active cluster `MenuMini_1/database/pgdata`.

### 1.3 Target Architecture Mandate
To fulfill requirement **R2** (High-Performance Modular Architecture & Orchestration), the system in `Mm-Mp` must decouple these responsibilities into dedicated high-performance modules:
- **Go Realtime Engine (`Mm-Mp/services/go`):** High-concurrency QR code generation and Gorilla WebSocket hub for live kitchen and table ordering updates.
- **Python Utility Service (`Mm-Mp/services/python`):** Menu import/export processing (CSV, Excel `.xlsx`, JSON) and Amharic text normalization (Ethiopic Fidel orthography and punctuation).
- **Rust Core Module (`Mm-Mp/core/rust`):** High-speed cryptographic token derivation (HMAC-SHA256 base64url capability tokens) and client-side WASM validation (`wasm-pack`).
- **Unified Orchestrator (`Mm-Mp/dev.sh`):** A single idempotent bash script spinning up the isolated PostgreSQL 18 cluster in `database/pgdata` (port 5435), applying migrations 0001–0012 with zero sample data, booting microservices, and launching the SvelteKit frontend seamlessly.

---

## 2. Go Realtime Engine (`services/go`)

### 2.1 Architectural Role & Design
In a restaurant setting in Addis Ababa, table turnover speed and kitchen communication are paramount. The Go engine provides:
1. **Sub-millisecond QR code rendering** without Node.js thread-pool contention.
2. **High-concurrency WebSocket channels** handling hundreds of concurrent table diners, kitchen display system (KDS) stations, and floor waitstaff on a lightweight goroutine footprint.
3. **Resilient mobile network handling:** Periodic ping/pong heartbeats maintain active connections across high-latency and unstable mobile connections typical in Ethiopian venues.

### 2.2 Concurrency Model & Channel Design
- **Hub & Client Architecture:**
  - `Hub` manages active client connections, registration, deregistration, and broadcast channels.
  - Channels are partitioned into two primary namespaces:
    1. `kitchen:{venueId}`: Broadcasts new orders, modifications, cancellations, and waiter assistance requests to kitchen displays and barista stations.
    2. `table:{venueId}:{tableId}`: Broadcasts lifecycle status updates (`SUBMITTED` → `ACCEPTED` → `PREPARING` → `READY` → `SERVED`) to all dining guests seated at that table.
    3. `waiter:{venueId}`: Alerts floor staff when a table calls a waiter or requests a bill.
- **Client Goroutines:**
  - Each WebSocket connection runs two goroutines:
    - `readPump`: Reads incoming messages, enforces pong deadlines (`pongWait = 60s`), and handles client disconnects.
    - `writePump`: Flushes outbound queued events, sends periodic ping heartbeats (`pingPeriod = 30s`), and handles socket write timeouts.
- **Event Ingestion Bridge:**
  - An internal HTTP POST endpoint (`/api/v1/events/publish`) accepts event payloads sent by the SvelteKit server when database state changes occur (e.g. order accepted by cashier/staff in PostgreSQL). The Go engine fans out the event instantly to the target WebSocket rooms.

### 2.3 QR Code Engine
- **Library:** Native Go QR generation using `github.com/skip2/go-qrcode`.
- **Capabilities:**
  - Direct PNG image streaming (`Content-Type: image/png`).
  - Base64 Data URL JSON responses for direct embedding in SvelteKit SSR or client pages (`{"dataUrl": "data:image/png;base64,..."}`).
  - High error correction level (`qrcode.Medium` or `qrcode.High`) ensuring readability even if physical table stickers are scratched or dimly lit.
  - Configurable margin and pixel resolution.

### 2.4 Endpoints Specification

| Method | Path | Purpose | Query / Body Parameters | Response |
|---|---|---|---|---|
| `GET` | `/health` | Healthcheck & liveness probe | None | `{"status": "ok", "service": "go-realtime", "time": "..."}` |
| `GET` | `/api/v1/qr` | Generate QR code image/data URI | `url` (required), `size` (default 256), `format` (`png` or `json`) | Binary PNG or JSON `{ "dataUrl": "..." }` |
| `POST` | `/api/v1/qr/batch` | Batch generate table QR codes | `{"urls": [{"id": "t1", "url": "..."}]}` | `{"results": [{"id": "t1", "dataUrl": "..."}]}` |
| `GET` | `/ws/kitchen` | Kitchen Display System WebSocket | `venue_id` (UUID), `role` (`kitchen`, `bar`, `staff`) | WebSocket connection upgrade |
| `GET` | `/ws/table` | Table dining guest WebSocket | `venue_id` (UUID), `table_id` (UUID), `session_token` | WebSocket connection upgrade |
| `GET` | `/ws/waiter` | Floor staff notification WebSocket | `venue_id` (UUID) | WebSocket connection upgrade |
| `POST` | `/api/v1/events/publish` | Internal event ingestion webhook | `{"venueId": "...", "tableId": "...", "type": "ORDER_STATUS_CHANGED", "data": {...}}` | `{"published": true, "recipientCount": 4}` |

### 2.5 Dependencies (`go.mod`)
```go
module github.com/menumini/realtime-engine

go 1.22

require (
    github.com/google/uuid v1.6.0
    github.com/gorilla/websocket v1.5.1
    github.com/skip2/go-qrcode v0.0.0-20200617195104-da1b6568686e
)
```

### 2.6 File Structure
```
services/go/
├── cmd/
│   └── server/
│       └── main.go           # Server entry point, CLI flags, graceful shutdown
├── internal/
│   ├── hub/
│   │   ├── client.go         # WebSocket client read/write pumps & heartbeats
│   │   ├── hub.go            # Room manager (kitchen, table, waiter)
│   │   └── message.go        # Realtime event structs & JSON serialization
│   ├── qr/
│   │   └── generator.go      # High-performance QR generation & data URI builder
│   └── handlers/
│       ├── event_handlers.go # /api/v1/events/publish handler
│       ├── qr_handlers.go    # /api/v1/qr and /api/v1/qr/batch handlers
│       └── ws_handlers.go    # /ws/kitchen and /ws/table upgrade handlers
├── go.mod
└── go.sum
```
**Port Binding:** `PORT=8080` (or `GO_REALTIME_PORT=8080`).

---

## 3. Python Utility Service (`services/python`)

### 3.1 Architectural Role & Design
The Python service handles complex data processing tasks that would either block the Node.js event loop or require specialized text normalization logic:
1. **Amharic Text Normalization:** Orthographic homophone normalization, Fidel script validation, and Ethiopian punctuation normalization.
2. **Menu Import & Ingestion:** Ingesting merchant menus from Excel spreadsheets (`.xlsx`), CSV files, or external JSON formats and converting them into validated `menumini-workspace-draft` structures.
3. **Menu Export:** Exporting published menus or workspace drafts into formatted Excel sheets or CSV files.

### 3.2 Amharic Text Normalization Algorithm
Amharic uses the Ge'ez (Fidel) abugida script (`\u1200`–`\u137F`). Due to historical phonetic mergers, several characters produce identical phonemes in standard spoken Amharic, resulting in widespread spelling inconsistencies across restaurant menus and customer search terms.

The normalization module implements:
1. **Unicode Canonicalization:** Standard Unicode Normalization Form KC (NFKC) / NFC.
2. **Homophone Canonicalization Table:**
   - **Ha variants:** `ሐ`, `ኀ`, `ኻ` → `ሀ`
     - `ሑ`, `ኁ` → `ሁ`; `ሒ`, `ኺ` → `ሂ`; `ሓ`, `ኃ`, `ኻ` → `ሃ`; `ሔ`, `ኄ` → `ሄ`; `ሕ`, `ኅ`, `ኽ` → `ህ`; `ሖ`, `ኆ` → `ሆ`
   - **Sa variants:** `ሠ` series → `ሰ` series
     - `ሠ` → `ሰ`; `ሡ` → `ሱ`; `ሢ` → `ሲ`; `ሣ` → `ሳ`; `ሤ` → `ሴ`; `ሥ` → `ስ`; `ሦ` → `ሶ`
   - **A variants:** `ዐ` series → `አ` series
     - `ዐ` → `አ`; `ዑ` → `ኡ`; `ዒ` → `ኢ`; `ዓ` → `ኣ`; `ዔ` → `ኤ`; `ዕ` → `እ`; `ዖ` → `ኦ`
   - **Tse variants:** `ፀ` series → `ጸ` series
     - `ፀ` → `ጸ`; `ፁ` → `ጹ`; `ፂ` → `ጺ`; `ፃ` → `ጻ`; `ፄ` → `ጼ`; `ፅ` → `ጽ`; `ፆ` → `ጾ`
3. **Punctuation Normalization:**
   - Ethiopic word space `፡` (`\u1361`) → standard space ` `
   - Ethiopic full stop `።` (`\u1362`) → `.`
   - Ethiopic comma `፣` (`\u1363`) → `,`
   - Ethiopic semicolon `፤` (`\u1364`) → `;`
   - Stripping invisible formatting/control characters (`\u200B` zero-width space, etc.).
4. **Fidel Script Detector:** Regex validation `[\u1200-\u137F]` to distinguish English names from Amharic script.

### 3.3 Menu Import & Export Engine
- **Excel & CSV Ingestion (`openpyxl` & standard `csv`):**
  - Parses columns: `Category / Section (EN)`, `Category / Section (AM)`, `Item Name (EN)`, `Item Name (AM)`, `Base Price (ETB)`, `Description (EN)`, `Description (AM)`, `Modifiers / Options`, `Available`.
  - Automatically runs Amharic text normalizer across all Fidel columns.
  - Validates exact ETB decimal currency format (`^\d+(\.\d{2})?$`).
  - Generates deterministic UUIDv5 or random UUIDv4 for new sections, items, modifier groups, and choices.
  - Outputs a fully compliant `menumini-workspace-draft` (`WorkspacePreparation`) object ready to load directly into Menu Studio or save to PostgreSQL.
- **Exporting:**
  - Transforms `menumini-workspace-draft` JSON into formatted Excel workbook (`.xlsx`) with styling (bold headers, auto-column width, currency formatting) or CSV.

### 3.4 Endpoints Specification

| Method | Path | Purpose | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/health` | Service health status | None | `{"status": "ok", "service": "python-utility"}` |
| `POST` | `/api/v1/normalize/amharic` | Single text normalization | `{"text": "ትኩስ ሻይ፡", "homophone": true}` | `{"original": "ትኩስ ሻይ፡", "normalized": "ትኩስ ሻይ"}` |
| `POST` | `/api/v1/normalize/batch` | Batch text normalization | `{"texts": ["...", "..."], "homophone": true}` | `{"results": ["...", "..."]}` |
| `POST` | `/api/v1/menu/import` | Ingest CSV/XLSX/JSON menu | Multipart file upload | Validated `WorkspacePreparation` JSON |
| `POST` | `/api/v1/menu/export` | Export menu to CSV/XLSX | `WorkspacePreparation` JSON, `format: "xlsx" \| "csv"` | Binary file download stream |

### 3.5 Dependencies (`requirements.txt`)
```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
openpyxl>=3.1.2
```

### 3.6 File Structure
```
services/python/
├── venv/                     # Virtual environment managed by dev.sh
├── main.py                   # FastAPI app, routing, CORS, middleware
├── normalizer.py             # Amharic Fidel Unicode & homophone normalization
├── importer.py               # Excel/CSV/JSON ingestion & schema mapping
├── exporter.py               # Excel workbook & CSV file generator
├── models.py                 # Pydantic schemas for requests, responses & draft models
└── requirements.txt
```
**Port Binding:** `PORT=5001` (or `PYTHON_UTILITY_PORT=5001`).

---

## 4. Rust Core Module (`core/rust`)

### 4.1 Architectural Role & Design
The Rust module provides high-speed, cryptographically secure operations and client-side validation logic compiled both as a native binary/library and as a WebAssembly (WASM) bundle:
1. **High-Speed Cryptographic Token Derivation:**
   - High-performance HMAC-SHA256 token derivation.
   - Capability hash generation (SHA-256 hex digest matching PostgreSQL checks).
   - Session CSRF derivation.
2. **Client-Side WASM Validation:**
   - Near-instantaneous validation on guest mobile devices before sending HTTP requests across flaky cellular data connections.
   - Validation of capability tokens, table tokens, invitation formats, and ETB decimal currency strings.

### 4.2 Cryptographic Token Derivation Protocol
To maintain complete compatibility with the PostgreSQL `0009_guest_ordering.sql` database constraints:
- **Capability Regex:** `^[A-Za-z0-9_-]{43}$` (43 characters, unpadded base64url, representing a 256-bit / 32-byte hash).
- **Capability Hash:** `^[0-9a-f]{64}$` (lowercase 64-character SHA-256 hex digest).
- **Derivation Algorithm:**
  1. Base64url-decode the 32-byte secret key `MENU_GUEST_CAPABILITY_KEY`.
  2. Compute HMAC-SHA256 of the JSON array string `["menumini-guest-v1", purpose, ...parts]`.
  3. Encode the 32-byte HMAC digest using unpadded base64url (`base64::engine::general_purpose::URL_SAFE_NO_PAD`).
- **Postgres Matching Hash:**
  - Compute SHA-256 of the base64url token string, formatted as lowercase hex string.

### 4.3 Client-Side WASM Validation Functions
- `wasm_validate_capability(token: &str) -> bool`: Validates `^[A-Za-z0-9_-]{43}$`.
- `wasm_validate_hash(hash: &str) -> bool`: Validates `^[0-9a-f]{64}$`.
- `wasm_parse_invitation(text: &str) -> JsValue`: Parses `<visit_uuid>.<pairing_token>`, validating UUID format and token length.
- `wasm_validate_etb_amount(amount: &str) -> bool`: Validates positive decimal with up to 2 decimal places.

### 4.4 Cargo Configuration (`Cargo.toml`)
```toml
[package]
name = "menumini-core"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
sha2 = "0.10"
hmac = "0.12"
base64 = "0.22"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
regex = "1.10"

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

### 4.5 Build & Integration Targets
- **WASM Target:** Built via `wasm-pack build --target web --out-dir ../../web/src/lib/wasm`.
- **Node/Native Target:** Built via `cargo build --release` or `wasm-pack build --target nodejs`.
- **Fallback Compatibility:** For environments where `wasm-pack` is not immediately installed, a pure TypeScript fallback mirror (`web/src/lib/wasm/crypto_fallback.ts`) guarantees that the frontend functions seamlessly while the native/WASM compilation runs in `dev.sh`.

### 4.6 File Structure
```
core/rust/
├── Cargo.toml
├── src/
│   ├── lib.rs            # WASM bindings and exported functions
│   ├── crypto.rs         # HMAC-SHA256, SHA256 hex, base64url derivation
│   └── validation.rs     # Capability, invitation, and currency validators
└── tests/
    └── crypto_tests.rs   # Unit tests verifying exact match with PostgreSQL fixtures
```

---

## 5. Unified Orchestrator (`dev.sh`)

### 5.1 Architecture & Requirements
`Mm-Mp/dev.sh` is the single operational entry point for developers and operators. Running `./dev.sh` must:
1. Boot a dedicated PostgreSQL 18 cluster in `Mm-Mp/database/pgdata`.
2. Apply database migrations 0001–0012 cleanly with **zero sample data** (R1).
3. Build the Rust WASM module.
4. Launch the Python Utility Service.
5. Launch the Go Realtime Engine.
6. Launch the SvelteKit Web PWA.
7. Manage graceful process shutdown upon `SIGINT`/`SIGTERM`/`EXIT`.

### 5.2 Environment & Port Allocation

| Component | Port | Host | Working Directory / Data Path |
|---|---|---|---|
| PostgreSQL 18 | `5435` | `127.0.0.1` | `database/pgdata` (isolated cluster) |
| Go Realtime Engine | `8080` | `127.0.0.1` | `services/go` |
| Python Utility Service | `5001` | `127.0.0.1` | `services/python` |
| SvelteKit Web PWA | `5173` | `127.0.0.1` | `web` |

*Note on Postgres Port:* The system postgres runs on 5432, and the reference project runs on 5434. Port `5435` guarantees collision-free operation in local development and testing.

### 5.3 Detailed Execution Steps in `dev.sh`

```mermaid
flowchart TD
    A[Start ./dev.sh] --> B[Check Toolchains: PG18, Python3, Node, Go, Rust]
    B --> C{database/pgdata exists?}
    C -- No --> D[initdb -D database/pgdata -U menu_admin -A trust]
    C -- Yes --> E[Start PostgreSQL: pg_ctl -D database/pgdata start]
    D --> E
    E --> F[Wait for PostgreSQL: pg_isready -p 5435]
    F --> G{Migrations applied?}
    G -- No --> H[Create Roles & Apply Migrations 0001-0012 with 0 Seed Data]
    G -- Yes --> I[Build Rust Core Module wasm-pack / fallback]
    H --> I
    I --> J[Setup Python venv & Launch FastAPI :5001]
    J --> K[Build & Launch Go Realtime Engine :8080]
    K --> L[npm install & Launch SvelteKit Frontend :5173]
    L --> M[Wait on Child PIDs / Trap Exit]
    M -->|SIGINT / CTRL+C| N[Graceful Shutdown: Kill Microservices & pg_ctl stop]
```

#### Step 1: Toolchain Discovery & Verification
- Check `/usr/lib/postgresql/18/bin` for `initdb`, `pg_ctl`, `psql`.
- Check `python3` and `python3 -m venv`.
- Check `node` and `npm`.
- Check `go` (or detect local binary).
- Check `cargo` / `wasm-pack`.

#### Step 2: Isolated PostgreSQL 18 Cluster (`database/pgdata`)
- If `database/pgdata/PG_VERSION` is absent:
  - Run `initdb -D database/pgdata -U menu_admin --auth-local=trust --auth-host=trust --no-locale --encoding=UTF8`.
  - Append configuration to `database/pgdata/postgresql.conf`:
    ```conf
    port = 5435
    listen_addresses = '127.0.0.1'
    unix_socket_directories = '/tmp'
    ```
- Start PostgreSQL via `pg_ctl -D database/pgdata -l database/postgresql.log start`.
- Loop with `pg_isready -h 127.0.0.1 -p 5435` until connected.

#### Step 3: Database Roles & Pristine Migrations
- Create database `menumini` if not exists.
- Create role hierarchy:
  ```sql
  create role menu_admin with superuser login;
  create role menu_customer with login password 'menumini_customer_dev';
  create role menu_workspace_runtime with login password 'menumini_merchant_dev';
  create role menu_guest_runtime with login password 'menumini_guest_dev';
  ```
- Run SQL migrations `0001_foundation.sql` through `0012_optional_landmark.sql` in sequence.
- **Strictly zero sample data:** No fictional cafes, fictional dishes, or mock orders are created. The database begins completely clean.

#### Step 4: Rust Module Compilation
- If `wasm-pack` is installed:
  - Execute `wasm-pack build --target web --out-dir ../../web/src/lib/wasm` inside `core/rust`.
- If `wasm-pack` is pending installation, link or populate the TypeScript cryptographic module to ensure immediate developer productivity.

#### Step 5: Python Utility Service
- Check if `services/python/.venv` exists; if not, run `python3 -m venv services/python/.venv`.
- Install dependencies: `.venv/bin/pip install -q -r services/python/requirements.txt`.
- Start daemon: `.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5001 &` (record PID).

#### Step 6: Go Realtime Engine
- Check if Go is available.
- Start daemon: `cd services/go && go run cmd/server/main.go &` (record PID).
- Verify health via `curl http://127.0.0.1:8080/health`.

#### Step 7: Web SvelteKit Frontend
- In `web/`:
  - Run `npm install` if `node_modules` is missing.
  - Set environment variables in `web/.env`:
    ```env
    DATABASE_URL="postgres://menu_admin@127.0.0.1:5435/menumini"
    MENU_MERCHANT_DATABASE_URL="postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini"
    MENU_PUBLIC_DATABASE_URL="postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini"
    MENU_GUEST_DATABASE_URL="postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini"
    MENU_PUBLIC_ORIGIN="http://127.0.0.1:5173"
    GO_REALTIME_URL="http://127.0.0.1:8080"
    PYTHON_UTILITY_URL="http://127.0.0.1:5001"
    MENU_GUEST_CAPABILITY_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    ```
  - Launch Vite: `npm run dev -- --host 127.0.0.1 --port 5173`.

#### Step 8: Trap & Clean Shutdown
- On `EXIT`, `INT`, `TERM`:
  - Terminate Python and Go microservice PIDs.
  - Stop PostgreSQL via `/usr/lib/postgresql/18/bin/pg_ctl -D database/pgdata stop -m fast`.
  - Echo clean status banner.

---

## 6. Discrepancy Matrix: Reference vs Target

| Component | Reference (`menu-qrwebsite-payment`) | Target Requirement (`Mm-Mp`) | Implementation Action Required |
|---|---|---|---|
| **Root Directory** | Full repository with `MenuMini_1`, `app`, `scripts/`, `docs/`, `templates/` | Clean slate (only `.agents/`) | Build target structure from scratch |
| **Go Realtime Engine** | None (simulated with `setTimeout` in Svelte and Node `qrcode`) | `services/go`: Gorilla WebSocket hub for KDS & dining tables + native QR generator | Implement Go engine on port 8080 |
| **Python Utility Service** | None (only standalone contract test scripts) | `services/python`: FastAPI service for Excel/CSV menu import/export + Amharic Fidel normalization | Implement Python utility service on port 5001 |
| **Rust Core Module** | None (Node.js `crypto` & TypeScript regex) | `core/rust`: HMAC-SHA256 token derivation & WASM client validation | Implement Rust crate with wasm-bindgen |
| **Unified Orchestrator** | None (manual scripts in `MenuMini_1/scripts` & root `scripts`) | `dev.sh`: Single command boot for Postgres 18, Go, Python, SvelteKit | Create root `dev.sh` with process supervisor |
| **Database Cluster** | Running in `MenuMini_1/database/pgdata` on port 5434 with existing data | Empty, dedicated PostgreSQL 18 cluster in `database/pgdata` on port 5435 | Provision pristine cluster & apply migrations 0001–0012 |
| **Sample Data** | Populated with demo venues, fictional bills, and test fixtures | **Strictly ZERO** sample data; clean slate registration | Apply DDL only; omit demo seeds |
| **Frontend Location** | Split between `MenuMini_1/` and `app/` | `web/` (SvelteKit + TypeScript + GSAP + warm luxury theme) | Port and unify frontend into `Mm-Mp/web` |
| **Payment Placards** | Static display in `[businessSlug]/[branchSlug]/+page.svelte` | Zero-commission telebirr & CBE Birr placards on public `/menu/[venueSlug]` | Port and integrate dynamic payment placards |

---

## 7. Concrete Implementation Steps

The implementation must proceed in the following ordered sequence:

### Phase 1: Directory Scaffold & Database Infrastructure
1. Create target directory structure:
   - `Mm-Mp/database/migrations`
   - `Mm-Mp/services/go`
   - `Mm-Mp/services/python`
   - `Mm-Mp/core/rust`
   - `Mm-Mp/web`
2. Copy SQL migrations `0001_foundation.sql` through `0012_optional_landmark.sql` into `Mm-Mp/database/migrations`.
3. Create database initialization and migration scripts in `Mm-Mp/database`.

### Phase 2: Microservice Construction
4. **Implement Rust Core Module (`core/rust`):**
   - Create `Cargo.toml` with `cdylib` and `rlib`.
   - Implement `crypto.rs` (HMAC-SHA256, SHA256 hex) and `validation.rs`.
   - Add unit tests verifying token derivation matching PostgreSQL `0009_guest_ordering.sql`.
5. **Implement Go Realtime Engine (`services/go`):**
   - Initialize `go.mod`.
   - Implement `internal/hub` (WebSocket hub, rooms, ping/pong heartbeats).
   - Implement `internal/qr` (PNG and data URI generator).
   - Implement HTTP handlers and server entrypoint (`cmd/server/main.go`).
6. **Implement Python Utility Service (`services/python`):**
   - Create `requirements.txt`.
   - Implement `normalizer.py` (Ethiopic Fidel homophones and punctuation).
   - Implement `importer.py` (Excel/CSV parser to `WorkspacePreparation`).
   - Implement `exporter.py` (menu to Excel/CSV).
   - Implement FastAPI routes in `main.py`.

### Phase 3: Unified Orchestrator (`dev.sh`)
7. Create `Mm-Mp/dev.sh`:
   - Toolchain checks for PG18, Python3, Go, Rust, Node.
   - Postgres cluster initialization in `Mm-Mp/database/pgdata` on port 5435.
   - Run migrations 0001–0012.
   - Background launch for Python utility (`:5001`), Go engine (`:8080`), and Web SvelteKit (`:5173`).
   - Signal trap for graceful cleanup.
   - Make `dev.sh` executable (`chmod +x dev.sh`).

### Phase 4: Frontend Integration & Verification
8. Configure frontend in `Mm-Mp/web` to communicate with:
   - PostgreSQL on port 5435.
   - Go engine on port 8080 for WebSocket live updates and instant QR generation.
   - Python utility on port 5001 for menu import/export and Amharic text enhancement.
   - Rust WASM module for client-side capability validation.
9. Verify end-to-end user journeys:
   - Business registration & authentication session.
   - Menu Studio draft creation with ETB pricing.
   - Atomic menu publication to `menumini.venue_routes`.
   - Public menu view at `/menu/[venueSlug]` with Amharic toggle and telebirr/CBE Birr placards.

---
*Report prepared by Survey Explorer 2 (Microservices Architect)*
