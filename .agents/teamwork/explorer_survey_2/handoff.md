# Handoff Report: Microservices Architecture Survey (Explorer 2)

**Agent:** Survey Explorer 2 (Microservices Architect)  
**Working Directory:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2`  
**Target Codebase:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Reference Codebase:** `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`  
**Status:** Complete

---

## 1. Observation

### 1.1 Target Directory Slate
- Command: `ls -la "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"`
- Output:
  ```text
  total 8
  drwxrwxr-x+ 1 n-a-t n-a-t    0 Oct 20 21:25 .
  drwxrwxrwx  1 n-a-t n-a-t 8192 Oct 20 21:04 ..
  drwxr-xr-x+ 1 n-a-t n-a-t    0 Oct 20 21:25 .agents
  ```
- Directly observed that `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` is currently completely clean with zero application code or database files.

### 1.2 Reference Codebase Microservices & Scripts
- Executed search for Go, Python, Rust, and dev scripts across `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`:
  ```bash
  find . -maxdepth 4 \( -name "*.go" -o -name "*.py" -o -name "*.rs" -o -name "*.sh" -o -name "Cargo.toml" -o -name "go.mod" \)
  ```
- Found **no** `go.mod`, **no** `.go` files, **no** `Cargo.toml`, **no** `.rs` files, and **no** `dev.sh` script.
- Python files exist strictly under `scripts/` (30 test scripts, e.g. `scripts/check-menu-workflow-db.py`, `scripts/build-workflow-contract.py`) for automated contract verification. No standalone HTTP API service exists.
- In `app/src/lib/server/qrcode/index.ts:9`, QR generation is mocked:
  ```ts
  return `data:image/png;base64,mocked-qr-code-for-${url}`;
  ```
- In `app/src/routes/[businessSlug]/[branchSlug]/order/[orderId]/+page.svelte:29-55`, WebSocket KDS updates were simulated with `setTimeout`:
  ```ts
  // Simulated real-time WebSocket events from Kitchen Display System (KDS)
  const timer1 = setTimeout(() => { currentStage = 'PREPARING'; ... }, 4500);
  const timer2 = setTimeout(() => { currentStage = 'READY'; ... }, 10000);
  ```

### 1.3 Cryptographic Token Derivation in Reference
- In `MenuMini_1/src/lib/server/guest-access.ts:9-15`:
  ```ts
  export const hashCapability=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
  export function deriveGuestCapability(purpose:string,...parts:string[]):string{
   const raw=env.MENU_GUEST_CAPABILITY_KEY||'';
   if(!CAPABILITY.test(raw))throw new CatalogCommandError(503,'GUEST_UNAVAILABLE','Guest access is not configured.');
   const key=Buffer.from(raw,'base64url');if(key.length!==32||key.toString('base64url')!==raw)throw new CatalogCommandError(503,'GUEST_UNAVAILABLE','Guest access is not configured.');
   return createHmac('sha256',key).update(JSON.stringify(['menumini-guest-v1',purpose,...parts]),'utf8').digest('base64url');
  }
  ```
- In `MenuMini_1/src/lib/guest/model.ts:5`:
  ```ts
  export const CAPABILITY=/^[A-Za-z0-9_-]{43}$/;
  ```
- In `MenuMini_1/database/migrations/0009_guest_ordering.sql:79`:
  ```sql
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'guest session unavailable' using errcode='P0401'; end if;
  ```

### 1.4 System Toolchain & Active Ports
- PostgreSQL 18 tools verified at `/usr/lib/postgresql/18/bin`: `initdb`, `pg_ctl`, `psql`, `pg_isready`.
- Active ports via `ss -tulpn`:
  - `127.0.0.1:5432`: System PostgreSQL daemon (`/var/lib/postgresql/18/main`).
  - `127.0.0.1:5434`: Reference PostgreSQL daemon (`MenuMini_1/database/pgdata`).
  - Ports `5435`, `8080`, `5001`, `5173` are unallocated and free for `Mm-Mp`.
- Python 3.14.3 with `python3-venv` is available at `/usr/bin/python3`.
- Node.js 20 and npm are available at `/usr/bin/node` and `/usr/bin/npm`.
- Rust toolchain manager `rustup` is present at `/home/n-a-t/.cache/puccinialin/cargo/bin/rustup`.

---

## 2. Logic Chain

1. **Clean Slate Target:** From observation 1.1, `Mm-Mp` has no pre-existing files, requiring all directories (`services/go`, `services/python`, `core/rust`, `database/migrations`, `web`) and orchestrator script (`dev.sh`) to be built cleanly from scratch.
2. **Microservice Extraction Need:** From observation 1.2, the reference codebase lacked standalone microservices and unified orchestration; QR code generation and WebSocket events were mocked or simulated in Node/Svelte. Therefore, implementing dedicated microservices in Go, Python, and Rust satisfies requirement R2 without inheriting technical debt from the reference.
3. **Rust WASM & Crypto Matching:** From observation 1.3, PostgreSQL 18 enforces strict 43-character base64url capability tokens and 64-character lowercase SHA-256 hex digests. The Rust module (`core/rust`) must implement exact matching HMAC-SHA256 derivation over `["menumini-guest-v1", purpose, ...parts]` and client-side WASM validation (`wasm_validate_capability`, `wasm_validate_hash`, `wasm_parse_invitation`).
4. **Port Isolation:** From observation 1.4, port 5434 is already occupied by the reference project's Postgres instance. To ensure `Mm-Mp` can boot cleanly without colliding with existing processes, `dev.sh` should bind its isolated PostgreSQL cluster in `Mm-Mp/database/pgdata` to port `5435` with `127.0.0.1` listen address.
5. **Orchestrator Design:** `dev.sh` must sequentially initialize the cluster, apply migrations 0001–0012 with zero seed records (R1), build Rust WASM, start Python FastAPI (`:5001`), start Go Realtime Engine (`:8080`), and start SvelteKit (`:5173`), with an exit trap killing child PIDs and stopping PostgreSQL cleanly.

---

## 3. Caveats

- **Toolchain Availability:** `rustup` is present in `/home/n-a-t/.cache/puccinialin/cargo/bin/` but requires toolchain installation or fallback. The frontend should include a TypeScript fallback bridge for cryptographic derivation to guarantee uninterrupted development while native WASM builds occur.
- **Port Flexibility:** `dev.sh` should use environment variables (e.g. `PGPORT=${PGPORT:-5435}`, `GO_PORT=${GO_PORT:-8080}`, `PYTHON_PORT=${PYTHON_PORT:-5001}`) to allow dynamic port overrides if needed.
- **Scope Limit:** Explorer 2 is strictly read-only; no code was created in `Mm-Mp` outside metadata directories.

---

## 4. Conclusion

The microservices architecture survey is complete:
1. **Go Realtime Engine (`services/go`):** Architected with Gorilla WebSocket rooms (`kitchen:{venue_id}`, `table:{venue_id}:{table_id}`) and `skip2/go-qrcode` native generator on port `8080`.
2. **Python Utility Service (`services/python`):** Architected with FastAPI on port `5001` providing Ethiopic Fidel homophone/punctuation normalization and Excel/CSV/JSON `menumini-workspace-draft` import/export.
3. **Rust Core Module (`core/rust`):** Architected with HMAC-SHA256 capability derivation and `wasm-bindgen` client validation targets.
4. **Unified Orchestrator (`dev.sh`):** Structured as an idempotent supervisor initializing PostgreSQL in `database/pgdata` on port `5435`, running migrations 0001–0012 with zero sample data, booting Go, Python, and SvelteKit, and cleanly handling teardown.

All technical specifications, endpoint tables, schema mappings, and implementation steps are documented in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2/survey_services.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Report:** View `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2/survey_services.md`.
2. **Verify Toolchain Paths:**
   ```bash
   /usr/lib/postgresql/18/bin/psql --version
   python3 --version
   node --version
   ```
3. **Verify Target Clean Slate:**
   ```bash
   ls -la "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"
   ```
4. **Verify Active Postgres Ports:**
   ```bash
   ss -tulpn | grep 5434
   ```
