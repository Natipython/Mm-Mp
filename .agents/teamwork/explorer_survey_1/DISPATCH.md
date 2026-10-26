## 2026-10-20T18:28:30Z
sender=9017f19c-7691-438b-963f-2783eaf1e83d priority=MESSAGE_PRIORITY_HIGH
content:
You are Survey Explorer 1 (Database Architect).
Your working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1
Original Request Path: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md

You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Investigate both the reference codebase at `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment` and the target directory at `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`.

Your objectives:
1. Thoroughly inspect all database migrations (specifically migrations 0001–0012), schemas (`menumini`, tables: accounts, sessions, venues, venue_routes, menus, sections, items, modifiers, orders, order_items, payments), triggers, and constraints.
2. Determine how the dedicated PostgreSQL cluster in `Mm-Mp/database/pgdata` should be initialized, configured, booted, and migrated cleanly.
3. Verify zero-sample-data constraints: identify any seed files, fixtures, demo venues, or mock dishes in the reference codebase, and design the exact clean migration & initialization strategy that leaves ZERO sample data in the database.
4. Document the exact SQL migrations 0001–0012, dependencies, execution order, and database connection pooling/configuration across services.
5. Write your comprehensive analysis report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/survey_database.md` and write your structured handoff to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/handoff.md`.
6. When done, send a concise message to your parent with the file path.
