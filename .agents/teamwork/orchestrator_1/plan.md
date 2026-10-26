# Orchestrator Execution Plan: Digital Menu & QR Payment Service (Mm-Mp)

## Objective
Deliver a production-grade, zero-sample-data, commercial digital menu, QR ordering, and zero-commission Ethiopian payment service in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`, adhering strictly to R1, R2, R3, and zero-tolerance integrity standards.

## Plan Steps
1. **Survey (Phase 0)**:
   - Spawn 3 parallel Explorers:
     - Explorer 1: Deep inspection of database schema & migrations 0001–0012, zero-sample-data requirements, data model in reference codebase vs target.
     - Explorer 2: Deep inspection of backend microservices (Go realtime/WebSocket/QR, Python utility service, Rust core module/WASM) in reference codebase vs target.
     - Explorer 3: Deep inspection of frontend SvelteKit Web PWA, GSAP animations, luxury styling (no bright yellow/blue), offline cart, bilingual English/Amharic, unified `dev.sh`.
   - Synthesize findings into `PROJECT.md` at target root `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md` with full Feature Inventory, Architecture, and Milestone definitions.

2. **Dual-Track Dispatch (Phase 1)**:
   - Track A: Implementation Track (M1 -> M2 -> M3 -> M4 -> M5)
   - Track B: E2E Testing Track (Test infra, Tiers 1-4 requirement-driven tests, `TEST_READY.md`)

3. **Milestone Execution & Rigorous Gating (Phase 2)**:
   - For each milestone: Explorer(s) -> Worker -> 2 Reviewers -> 2 Challengers -> 1 Forensic Auditor -> Gating.
   - Zero tolerance on cheating/mocking.

4. **Integration & Final Victory Verification (Phase 3)**:
   - Pass 100% of E2E tests across Tiers 1-4.
   - Tier 5 adversarial hardening.
   - Forensic clean audit and parent notification.
