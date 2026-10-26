# BRIEFING — 2026-10-20T18:42:00Z

## Mission
Survey microservices (Go realtime engine, Python utility service, Rust core module, and dev.sh orchestrator) across reference and target codebases, identifying architecture, port bindings, dependencies, endpoints, discrepancies, and implementation steps.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Survey Explorer 2 (Microservices Architect)
- Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2
- Original parent: 9017f19c-7691-438b-963f-2783eaf1e83d
- Milestone: Survey & Architecture Analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate both reference (`menu-qrwebsite-payment`) and target (`Mm-Mp`)
- Output report to `survey_services.md` and handoff to `handoff.md`

## Current Parent
- Conversation ID: 9017f19c-7691-438b-963f-2783eaf1e83d
- Updated: 2026-10-20T18:42:00Z

## Investigation State
- **Explored paths**:
  - `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` (target: clean slate, only `.agents` exists)
  - `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment` (reference: `MenuMini_1`, `app`, `scripts/`, `docs/`, `templates/`)
  - Toolchain detection: PostgreSQL 18 at `/usr/lib/postgresql/18/bin`, Python 3.14 + venv at `/usr/bin/python3`, Node 20 / npm at `/usr/bin/node`, Rustup cache at `/home/n-a-t/.cache/puccinialin/cargo/bin`
  - Active ports: Port 5434 (reference pgdata), Port 5432 (system postgres)
- **Key findings**:
  1. The reference codebase lacks standalone `services/go`, `services/python`, `core/rust`, and `dev.sh`. All logic was monolithic inside SvelteKit or python test scripts.
  2. Target `Mm-Mp` requires modular microservice extraction:
     - Go Realtime Engine (`services/go`, port 8080): Native QR code generation + Gorilla WebSocket hub for KDS/guest table channels.
     - Python Utility Service (`services/python`, port 5001): FastAPI service for Excel/CSV/JSON menu import/export + Ethiopic/Amharic Fidel normalization.
     - Rust Core Module (`core/rust`): High-speed cryptographic token derivation (HMAC-SHA256 base64url capability tokens) + WASM validation target (`wasm-pack`).
     - Unified Orchestrator (`dev.sh`): Isolated PostgreSQL 18 cluster in `database/pgdata` (port 5435), running migrations 0001-0012 with zero sample data, booting microservices, and launching SvelteKit.
- **Unexplored areas**: None, all target domains analyzed.

## Key Decisions Made
- Confirmed port allocation: Postgres 5435 (isolated, non-conflicting), Go Engine 8080, Python Utility 5001, SvelteKit 5173.
- Designed comprehensive architecture specifications for Go, Python, Rust, and dev.sh.

## Artifact Index
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2/survey_services.md` — Comprehensive analysis report
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_2/handoff.md` — 5-component structured handoff
