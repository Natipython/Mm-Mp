# Dispatch: Milestone 1 Spec Miner 3 (Migration 0001–0012 Integrity Spec)

Milestone: M1 - Database Foundation & Clean Migrations
Working Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Survey: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/survey_database.md

## 2026-10-20T18:46:53Z
You are Milestone 1 Spec Miner 3 (Migration 0001–0012 Integrity Spec).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Specification: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Migrations: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Your mission for Milestone 1 (Database Foundation):
1. Trace the exact sequence of 12 migrations: `0001_foundation.sql` through `0012_optional_landmark.sql`.
2. Verify that `0012_optional_landmark.sql` correctly fixes the `catalog_text(landmark, 300, true)` issue from migration 0005 so that publishing succeeds.
3. Verify that copying all 12 migration files into `Mm-Mp/database/migrations/` introduces zero sample records or mock fixtures.
4. Document the exact file list, checksums/sizes, and execution order for Worker 1.
5. Write your findings to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m1_3/report.md` and handoff to `handoff.md`.
6. Message your parent when complete.
