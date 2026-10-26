# Project: Mm-Mp (Commercial Digital Menu, QR Ordering & Zero-Commission Ethiopian Payment Service)

## Architecture
A high-performance, modular commercial digital menu and ordering platform built on a pristine PostgreSQL foundation:
1. **Database Layer (`database/pgdata`)**: Dedicated PostgreSQL 18 cluster with migrations `0001_foundation.sql` through `0012_optional_landmark.sql` defining 48 schema tables, triggers, and RLS policies under schema `menumini`. Operates on isolated port `5435` with ZERO sample data.
2. **Go Realtime Engine (`services/go`)**: High-concurrency QR code generation (`/api/v1/qr`) and Gorilla WebSocket hub (`/ws/dining`) for real-time kitchen and table ordering updates on port `8080`.
3. **Python Utility Service (`services/python`)**: FastAPI service on port `5001` handling Amharic Fidel text normalization (homophone and punctuation folding) and menu draft import/export (CSV, Excel, JSON).
4. **Rust Core Module (`core/rust`)**: High-speed HMAC-SHA256 capability derivation and WASM validation package (`menumini-core-wasm`).
5. **Web PWA (`web`)**: SvelteKit 2 + TypeScript + GSAP for sub-100ms load times, responsive mobile-first UI, offline cart persistence (IndexedDB + localStorage fallback), bilingual English/Amharic typography (`Noto Sans Ethiopic`), and a warm luxury aesthetic (strictly no bright yellow or bright blue).
6. **Unified Orchestrator (`dev.sh`)**: Single bash script to initialize, migrate, boot all services, monitor health, and handle graceful shutdown.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dedicated PostgreSQL 18 Cluster | Boot clean cluster in `database/pgdata` on port 5435 | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Clean Schema Migrations 0001–0012 | Apply migrations 0001–0012 to establish schema `menumini` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Zero-Sample-Data Enforcement | Verify 0 mock merchants, 0 venues, 0 fake dishes in database | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Database Role & Access Provisioning | Provision `menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime` | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Go Realtime QR Generation | High-concurrency QR code generation endpoint (`/api/v1/qr`) | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Go WebSocket Dining Hub | Live order updates for kitchen display & table dining rooms | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Python Fidel Text Normalizer | Normalize Ethiopic Amharic homophones, numbers, punctuation | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Python Menu Import/Export | Import/export menus via CSV, Excel, JSON | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Rust Crypto Capability Derivation | HMAC-SHA256 43-character base64url capability token derivation | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Rust WASM Client Validator | Compile WASM package for client-side capability and hash validation | M2 | ORIGINAL_REQUEST §R2 |
| 11 | SvelteKit Web PWA Foundation | SvelteKit 2 + TypeScript + Vite 8 structure in `web` | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Warm Luxury Design System | Warm obsidian `#0E1015`, charcoal `#151821`, copper `#C87D55`, cream `#F5F3EF`; strictly no bright yellow/blue | M3 | ORIGINAL_REQUEST §R2 |
| 13 | GSAP Performance Animations | SSR-safe dynamic import GSAP animations with sub-100ms load | M3 | ORIGINAL_REQUEST §R2 |
| 14 | Bilingual Typography & Language Switch | Amharic (`Noto Sans Ethiopic`) & English toggle across all pages | M3 | ORIGINAL_REQUEST §R2 |
| 15 | Offline Cart Persistence | IndexedDB dining session cart with localStorage fallback & ETB cents arithmetic | M3 | ORIGINAL_REQUEST §R2 |
| 16 | Zero-Commission Ethiopian Payment Placards | Elegant dark-luxury telebirr and CBE Birr placards | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Merchant Registration & Secure Auth | Merchant onboarding, scrypt password hashing, secure session cookie | M4 | ORIGINAL_REQUEST §R3 |
| 18 | Menu Studio & Draft Persistence | Create real sections, dishes with ETB prices & modifiers, persist to PostgreSQL | M4 | ORIGINAL_REQUEST §R3 |
| 19 | Atomic Menu Publishing | Execute `menumini.publish_menu` to atomically generate active route in `menumini.venue_routes` | M4 | ORIGINAL_REQUEST §R3 |
| 20 | Customer Public Dining View | Public menu at `/menu/[venueSlug]` rendering published catalog | M4 | ORIGINAL_REQUEST §R3 |
| 21 | Dynamic Table QR Generation | Generate dynamic table QR codes pointing to `/menu/[venueSlug]?table=N` | M4 | ORIGINAL_REQUEST §R3 |
| 22 | Unified Orchestrator Script (`dev.sh`) | Single script to boot DB, Go, Python, SvelteKit, and manage shutdown | M4 | ORIGINAL_REQUEST §R2 |
| 23 | E2E Requirement-Driven Test Suite | Opaque-box E2E test suite across Tiers 1–4 passing 100% | M5 | Acceptance Criteria |
| 24 | Adversarial Hardening (Tier 5) | White-box adversarial test cases and edge-case resilience | M5 | Orchestration Standard |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Foundation & Clean Migrations | Dedicated PG cluster, migrations 0001–0012, zero-sample assertions, role grants | none | PLANNED |
| M2 | Backend Microservices & Rust WASM Core | Go QR/WS service, Python normalizer/import service, Rust WASM crypto core | M1 | PLANNED |
| M3 | SvelteKit Web PWA & Warm Luxury Design | Web PWA, GSAP animations, luxury palette, Noto Sans Ethiopic, offline cart | M1 | PLANNED |
| M4 | Commercial Journeys & Unified Orchestrator | Merchant registration, Menu Studio, atomic publishing, customer menu, dev.sh | M1, M2, M3 | PLANNED |
| M5 | E2E Acceptance & Adversarial Hardening | 100% E2E test pass (Tiers 1–4) + Tier 5 coverage hardening | M4 | PLANNED |

## Interface Contracts
### Database ↔ Backend Services & Web PWA
- `DATABASE_URL`: `postgres://menu_admin:menumini_admin_dev@127.0.0.1:5435/menumini_db?sslmode=disable`
- `MENU_MERCHANT_DATABASE_URL`: `postgres://menu_workspace_runtime:menumini_merchant_dev@127.0.0.1:5435/menumini_db?sslmode=disable`
- `MENU_PUBLIC_DATABASE_URL`: `postgres://menu_customer:menumini_customer_dev@127.0.0.1:5435/menumini_db?sslmode=disable`
- `MENU_GUEST_DATABASE_URL`: `postgres://menu_guest_runtime:menumini_guest_dev@127.0.0.1:5435/menumini_db?sslmode=disable`

### Go Realtime Engine (`services/go`)
- Port: `8080` (or `GO_PORT`)
- `GET /healthz` -> `{"status": "ok"}`
- `GET /api/v1/qr?url=<target_url>` -> PNG image `image/png`
- `GET /ws/dining?venue_id=<uuid>&room=<kitchen|table>&table_id=<num>` -> WebSocket connection

### Python Utility Service (`services/python`)
- Port: `5001` (or `PYTHON_PORT`)
- `GET /healthz` -> `{"status": "ok"}`
- `POST /api/v1/normalize-amharic` -> `{"text": "<raw>"}` returns `{"normalized": "<clean>"}`
- `POST /api/v1/menu/import` -> Multipart form file (CSV/Excel/JSON) returns normalized menu draft JSON
- `POST /api/v1/menu/export` -> JSON payload returns CSV/Excel buffer

### Rust Core Module (`core/rust`)
- HMAC-SHA256 capability derivation matching PostgreSQL regex `^[A-Za-z0-9_-]{43}$`
- WASM functions: `wasm_derive_guest_capability`, `wasm_validate_capability`, `wasm_validate_hash`

### Web PWA (`web`)
- Port: `5173` (or `PORT`)
- Auth: HTTPOnly cookie `menumini_session`
- Public Menu Route: `/menu/[venueSlug]`
- Table QR Link: `/menu/[venueSlug]?table=[tableNumber]`

## Code Layout
```
Mm-Mp/
├── dev.sh                     # Unified orchestrator supervisor script
├── database/
│   ├── pgdata/                # Isolated PostgreSQL cluster data (port 5435)
│   ├── migrations/            # Migrations 0001_foundation.sql through 0012_optional_landmark.sql
│   ├── init.sh                # DB initialization & migration runner
│   └── roles.sql              # Login roles provisioning script
├── services/
│   ├── go/                    # Go Realtime Engine (port 8080)
│   │   ├── cmd/server/main.go
│   │   ├── internal/qr/
│   │   ├── internal/ws/
│   │   └── go.mod
│   └── python/                # Python Utility Service (port 5001)
│       ├── main.py
│       ├── normalizer.py
│       ├── import_export.py
│       └── requirements.txt
├── core/
│   └── rust/                  # Rust cryptographic & WASM module
│       ├── Cargo.toml
│       └── src/lib.rs
├── web/                       # SvelteKit 2 PWA (port 5173)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── server/        # auth.ts, db pools, publication
│   │   │   ├── menu/          # cart-draft.ts, money arithmetic
│   │   │   └── services/      # indexedDbStore.ts
│   │   └── routes/
│   │       ├── +page.svelte   # Warm luxury salesperson landing page
│   │       ├── login/
│   │       ├── register/
│   │       ├── admin/
│   │       │   ├── studio/    # Menu Studio with ETB pricing
│   │       │   └── qr-codes/  # Dynamic table QR generation
│   │       └── menu/
│   │           └── [venueSlug]/ # Bilingual customer dining view
│   ├── static/
│   ├── package.json
│   └── svelte.config.js
└── tests/
    └── e2e/                   # Requirement-driven E2E tests (Tiers 1-5)
```
