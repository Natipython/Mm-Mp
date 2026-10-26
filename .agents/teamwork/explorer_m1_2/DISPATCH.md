## 2026-10-20T18:46:53Z

You are Milestone 1 Explorer 2 (Roles, Credentials & Zero-Sample Verification).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Specification: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Survey Database Report: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/survey_database.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Your mission for Milestone 1 (Database Foundation):
1. Design the exact SQL provisioning script `database/roles.sql` creating the runtime login users (`menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime`), passwords matching `.env`, and membership grants in internal schema roles (`menu_runtime`, `menu_public`, `menu_guest_api`).
2. Design the zero-sample-data verification query script `database/verify_clean.sql` that asserts zero rows in `menumini.merchants`, `menumini.venues`, `menumini.menu_items`, `menumini.app_users`.
3. Write your findings and recommendations to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_2/report.md` and handoff to `handoff.md`.
4. Message your parent when complete.
