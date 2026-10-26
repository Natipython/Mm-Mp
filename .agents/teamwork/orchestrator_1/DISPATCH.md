# Dispatch Message

## 2026-10-20T18:26:23Z
You are the Project Orchestrator (orchestrator_1) for building the production-grade, commercial digital menu, QR ordering, and zero-commission Ethiopian payment service.

Your Working Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/orchestrator_1
Target Project Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Reference Codebase Directory: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment
Original Request Path: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md

Please read the original request at /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md.

Key Requirements:
1. Pristine Zero-Sample-Data Service Foundation:
   - Dedicated PostgreSQL cluster running in `Mm-Mp/database/pgdata` with migrations 0001–0012 applied cleanly.
   - Zero mock cafes, zero fictional seed records, zero "In development" tags.
   - All records must originate exclusively from genuine user registration and live studio actions.
2. High-Performance Modular Architecture & Orchestration:
   - Web PWA (`Mm-Mp/web`): SvelteKit + TypeScript + GSAP for sub-100ms load times, responsive mobile-first UI, offline cart persistence, bilingual English/Amharic typography with a warm luxury aesthetic (strictly no bright yellow or bright blue).
   - Go Realtime Engine (`Mm-Mp/services/go`): High-concurrency QR code generation and WebSocket manager for live kitchen & table ordering updates.
   - Python Utility Service (`Mm-Mp/services/python`): Menu import/export processing and Amharic text normalization.
   - Rust Core Module (`Mm-Mp/core/rust`): High-speed cryptographic token derivation and client-side WASM validation.
   - Unified Orchestrator (`Mm-Mp/dev.sh`): Single script to spin up the isolated PostgreSQL cluster, the backend microservices, and the SvelteKit frontend seamlessly.
3. End-to-End User Journeys (Free, Menu'Mini, MenuPro Tiers):
   - Merchant registration & authentication via secure session cookie.
   - Menu Studio draft creation, section/dish management with ETB pricing & modifiers, persistence to PostgreSQL.
   - Atomic menu publishing generating live route in `menumini.venue_routes` (`/menu/[venueSlug]`).
   - Customer view at `/menu/[venueSlug]` rendering genuine merchant data, Amharic/English toggle, and telebirr/CBE Birr payment information.
   - Dynamic table QR codes pointing to the live public venue URL.

Maintain your plan.md, progress.md, and BRIEFING.md in your working directory (/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/orchestrator_1).
Decompose into milestones, dispatch tasks to specialist subagents, monitor progress, and notify when finished so victory auditing can be performed.
