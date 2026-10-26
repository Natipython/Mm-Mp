# BRIEFING — 2026-10-20T18:57:30Z

## Mission
Probe, trace, and document the integrity specification of migrations 0001–0012 for Milestone 1: verify schema definitions, publication function bug fix in 0012, zero-sample data compliance, exact file list, sizes/checksums, and execution order for Worker 1.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Milestone 1 Spec Miner 3 (Migration 0001–0012 Integrity Spec)
- Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3
- Original parent: 9017f19c-7691-438b-963f-2783eaf1e83d
- Milestone: M1 - Database Foundation & Clean Migrations

## 🔒 Key Constraints
- Authoritative reference migrations: `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations`
- Pristine zero-sample data: 0 sample records, 0 mock fixtures, 0 fictional venues/dishes.
- Fix landmark issue in 0012: `catalog_text(landmark, 300, true)` from 0005 must be properly handled.
- Deliver findings to `report.md` and `handoff.md`.
- Read-only on source implementation; produce specifications and findings.

## Current Parent
- Conversation ID: 9017f19c-7691-438b-963f-2783eaf1e83d
- Updated: 2026-10-20T18:57:30Z

## Task Summary
- **What to build/verify**: Detailed specification of migrations 0001–0012 for PostgreSQL 18 schema `menumini`, verify zero seed data, verify 0012 landmark bug fix, compute checksums/sizes and exact order.
- **Success criteria**: Comprehensive specification report and handoff covering all 12 migrations, zero mock assertions, landmark bug fix mechanism, and worker execution instructions.
- **Interface contracts**: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
- **Code layout**: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md § Code Layout

## Loaded Skills
- None explicitly loaded.

## Key Decisions Made
- All 12 migrations verified: 100% free of static demo data. Test fixtures in `database/tests/` must be excluded.
- Landmark bug traced: in 0005, landmark was required in `catalog_shape` and not optional in `catalog_text(b->'landmark', 300)`; in 0012 it is removed from required keys and optional=true is passed.
- Manifest with exact SHA-256 hashes, byte sizes, and sequential execution commands generated for Worker 1.

## Artifact Index
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/report.md` — Detailed Integrity Spec Report
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/handoff.md` — Formal Handoff Report
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/progress.md` — Liveness & task checklist
