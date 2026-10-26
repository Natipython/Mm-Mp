# Soft Handoff Report: Project Orchestrator (orchestrator_1 -> orchestrator_1_gen2)

**From**: `orchestrator_1` (Generation 1 Top-Level Project Orchestrator)  
**To**: Successor Orchestrator (`orchestrator_1_gen2`)  
**Parent Conversation ID**: `37d0a256-28ee-4fb0-9d7f-c70510cbf7c5`  
**Working Directory**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/orchestrator_1`  
**Target Project**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Date**: 2026-10-20T20:25:00Z  

---

## 1. Milestone State

| # | Milestone Name | Status | Summary & Outputs |
|---|----------------|:------:|-------------------|
| - | **Phase 0: Survey** | **DONE** | 3 parallel Explorers surveyed Database, Microservices, and Web PWA. Synthesized into master `PROJECT.md` with 24 Features, 5 Milestones, and Interface Contracts. |
| - | **Dual Track: E2E Test Suite** | **DONE** | Complete 4-tier opaque-box test framework authored in `tests/e2e/` (20 files, 276 tests). Runner `./tests/e2e/run_all.sh` verified. Published `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_INFRA.md` and `TEST_READY.md`. |
| M1 | **Database Foundation & Clean Migrations** | **DONE (PASS)** | Dedicated PostgreSQL 18.6 cluster initialized in `Mm-Mp/database/pgdata` bound to port `5435` with private Unix socket in `database/socket`. 12 migrations (0001–0012) cleanly applied (48 base tables, 1 view, 110 functions, 73 triggers, 95 FKs). 4 runtime login roles provisioned (`menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime`). Zero sample data confirmed across all 48 tables. Iteration 2 Gate PASSED: Auditor CLEAN, 2/2 Reviewers APPROVE, 2/2 Challengers APPROVE. |
| M2 | **Backend Microservices & Rust WASM Core** | **IN_PROGRESS** | **IMMEDIATE FOCUS**: Ready for immediate dispatch. Scope: Go Realtime Engine (`services/go`, port 8080), Python Utility Service (`services/python`, port 5001), Rust Core Module (`core/rust`). |
| M3 | **SvelteKit Web PWA & Warm Luxury Design** | **PLANNED** | Ready to dispatch after M2. Scope: SvelteKit 2 PWA in `web` with GSAP, warm luxury aesthetic (strictly NO bright yellow/blue), `Noto Sans Ethiopic` bilingual typography, offline cart persistence. |
| M4 | **Commercial Journeys & Unified Orchestrator (`dev.sh`)** | **PLANNED** | Merchant registration, Menu Studio, atomic publishing to `menumini.venue_routes`, customer dining route `/menu/[venueSlug]`, dynamic table QR, unified supervisor script `dev.sh`. |
| M5 | **Dual Track Final Acceptance & Hardening** | **PLANNED** | Phase 1: Run full `./tests/e2e/run_all.sh all` to achieve 100% pass across all 276 tests. Phase 2: Tier 5 adversarial coverage hardening with Challengers. |

---

## 2. Active Subagents

All subagents spawned in Generation 1 have delivered their handoffs and completed:
- `worker_m1_it2`: completed remediation of `db-helper.mjs`, `f01_f04_database.test.mjs`, and `b01_b04_db_boundaries.test.mjs`.
- `reviewer_m1_it2_1`: delivered APPROVE (unconditional assertions, schema alignment, Tier 1 20/20 pass).
- `reviewer_m1_it2_2`: delivered APPROVE (zero tautologies, live TCP errors, Tier 2 20/20 pass).
- `challenger_m1_it2_1`: delivered APPROVE (defect injection verified, 34/34 challenger tests pass).
- `challenger_m1_it2_2`: delivered APPROVE (95 FKs verified, role isolation verified, RLS isolation verified, 18/18 pass).
- `auditor_m1_it2_1`: delivered CLEAN (zero integrity violations, all 48 tables pristine, 0 sample data).

There are currently **0 running subagents**.

---

## 3. Pending Decisions & Remaining Work (Next Steps for Successor)

The successor orchestrator should execute the standard Project Pattern iteration loop for **Milestone 2**:

1. **Milestone 2 Scope Overview**:
   - **Go Realtime Engine (`services/go`)**:
     - Standard Go module (`go.mod`) running on port `8080` (or `GO_PORT`).
     - HTTP endpoints: `GET /healthz` (JSON `{"status":"ok"}`), `GET /api/v1/qr?url=<target_url>` (generates PNG image with MIME `image/png`).
     - WebSocket hub: `GET /ws/dining?venue_id=<uuid>&room=<kitchen|table>&table_id=<num>` supporting live kitchen ordering events and dining table updates.
   - **Python Utility Service (`services/python`)**:
     - Python service (`requirements.txt`, FastAPI / Uvicorn) on port `5001` (or `PYTHON_PORT`).
     - HTTP endpoints: `GET /healthz` (JSON `{"status":"ok"}`), `POST /api/v1/normalize-amharic` (normalizes Fidel text: e.g. ሐ/ኀ/ሀ -> ሀ, ሠ -> ሰ, ዐ -> አ, ጸ -> ፀ, punctuation normalization), `POST /api/v1/menu/import` (parses CSV/Excel/JSON into standardized menu draft payload), `POST /api/v1/menu/export` (exports menu JSON into CSV/Excel format).
   - **Rust Core Module (`core/rust`)**:
     - Cargo crate (`Cargo.toml`) compiling native library + `wasm32-unknown-unknown` target.
     - Implements HMAC-SHA256 capability derivation matching PostgreSQL schema regex `^[A-Za-z0-9_-]{43}$`.
     - Exported WASM functions: `wasm_derive_guest_capability(secret, session_id, table_id, timestamp)`, `wasm_validate_capability(token, secret, session_id)`, `wasm_validate_hash(data, expected_hash)`.

2. **Milestone 2 Execution Steps**:
   - **Step a (Survey/Explore)**: Dispatch 3 Explorers (`explorer_m2_1` for Go, `explorer_m2_2` for Python, `explorer_m2_3` for Rust WASM) with reference codebase at `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/services` and `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/core/rust`.
   - **Step b (Implement)**: Dispatch Worker (`worker_m2_1`) with Explorer findings to implement the services and run unit tests.
   - **Step c (Review)**: Dispatch 2 Reviewers (`reviewer_m2_1`, `reviewer_m2_2`) to test endpoints, schemas, and contract conformance.
   - **Step d (Challenge)**: Dispatch 2 Challengers (`challenger_m2_1`, `challenger_m2_2`) to stress-test WebSocket concurrency, high-rate QR generation, Fidel normalization edge cases, and HMAC token cryptographic security.
   - **Step e (Audit)**: Dispatch Forensic Auditor (`auditor_m2_1`) to verify 100% authentic implementations with zero dummy facades.
   - **Step f (Gate)**: Evaluate gate against E2E Tier 1 (`f05_f08_realtime_qr.test.mjs`, `f09_f12_utility_rust.test.mjs`) and Tier 2 boundary tests.

3. **Subsequent Milestones**:
   - Milestone 3: SvelteKit Web PWA with warm luxury palette (obsidian `#0E1015`, charcoal `#151821`, copper `#C87D55`, cream `#F5F3EF`), `Noto Sans Ethiopic`, offline cart persistence.
   - Milestone 4: Commercial Journeys (merchant registration, Menu Studio draft persistence, atomic publishing, public `/menu/[venueSlug]`, dynamic table QR, unified `dev.sh`).
   - Milestone 5: Pass 100% of all 276 E2E tests + Tier 5 adversarial challenge.

---

## 4. Key Artifacts

- **ORIGINAL_REQUEST.md**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md`
- **PROJECT.md**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md`
- **TEST_INFRA.md**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_INFRA.md`
- **TEST_READY.md**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_READY.md`
- **GATE_STATUS.md**: `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/orchestrator_1/GATE_STATUS.md`
- **Reference Codebase**: `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1`
- **Database Lifecycle**: `./database/init.sh status | check | restart | init` (Port 5435, Socket: `database/socket`)
- **E2E Test Runner**: `./tests/e2e/run_all.sh [all|db|tier1|tier2|tier3|tier4]`

---

## 5. Verification Method

To verify the current milestone state before starting Milestone 2:

1. **Verify Database Service and Clean Zero-Sample State**:
   ```bash
   cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"
   ./database/init.sh status
   ./database/init.sh check
   ```
   *Expected output*: `PostgreSQL is running on port 5435` and `ZERO_SAMPLE_ASSERTION_PASSED: All tables in schema menumini are 100% pristine with 0 records.`

2. **Run E2E Database Test Suite**:
   ```bash
   ./tests/e2e/run_all.sh db
   ```
   *Expected output*: 2/2 files pass, 100% SUCCESS.
