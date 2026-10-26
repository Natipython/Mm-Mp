# Original User Request

## 2026-10-20T18:23:56Z

Build the production-grade, commercial digital menu, QR ordering, and zero-commission Ethiopian payment service in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` from a clean slate with zero sample data, allowing the user to test the real workflow as a merchant and customer.

Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Integrity mode: development

## Requirements

### R1. Pristine Zero-Sample-Data Service Foundation
The service in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` must initialize with an empty, dedicated PostgreSQL cluster running in `Mm-Mp/database/pgdata`. Zero mock cafes, zero fictional seed records, and zero "In development" tags. All records must originate exclusively from genuine user registration and live studio actions.

### R2. High-Performance Modular Architecture & Orchestration
- **Web PWA (`Mm-Mp/web`):** SvelteKit + TypeScript + GSAP for sub-100ms load times, responsive mobile-first UI, offline cart persistence, and bilingual English/Amharic typography with a warm luxury aesthetic (strictly no bright yellow or bright blue).
- **Go Realtime Engine (`Mm-Mp/services/go`):** High-concurrency QR code generation and WebSocket manager for live kitchen & table ordering updates.
- **Python Utility Service (`Mm-Mp/services/python`):** Menu import/export processing and Amharic text normalization.
- **Rust Core Module (`Mm-Mp/core/rust`):** High-speed cryptographic token derivation and client-side WASM validation.
- **Unified Orchestrator (`Mm-Mp/dev.sh`):** A single script to spin up the isolated PostgreSQL cluster, the backend microservices, and the SvelteKit frontend seamlessly.

### R3. End-to-End User Journeys (Free, Menu'Mini, MenuPro Tiers)
1. User lands on the salesperson landing page and signs up with email/password.
2. User enters Menu Studio, creates real sections, adds dishes with ETB pricing and modifiers, and saves the draft to PostgreSQL.
3. User publishes the menu atomically to generate a permanent live route (`/menu/[venueSlug]`).
4. User opens the public URL or scans the generated table QR code on their phone to test the instant bilingual customer dining menu with zero-commission telebirr & CBE Birr placards.

## Acceptance Criteria

### Infrastructure & Clean State
- [ ] Dedicated PostgreSQL 18+ cluster boots in `Mm-Mp/database/pgdata` with migrations 0001–0012 applied cleanly.
- [ ] Zero demo venues or fictional dishes exist in the database upon startup.
- [ ] Unified `./dev.sh` starts all services cleanly without manual multi-step configuration.

### Real Commercial Flow Verification
- [ ] User can register a brand-new business and authenticate via secure session cookie.
- [ ] User can create, edit, and persist menu drafts with ETB pricing to PostgreSQL.
- [ ] User can publish the menu atomically, generating an active route in `menumini.venue_routes`.
- [ ] Customer view at `/menu/[venueSlug]` renders genuine merchant data, Amharic/English toggle, and telebirr/CBE Birr payment information.
- [ ] Table QR codes generate dynamically and point to the live public venue URL.
