# Dispatch: Milestone 1 Explorer 1 (PostgreSQL Cluster Provisioning)

Milestone: M1 - Database Foundation & Clean Migrations
Working Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Survey: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/survey_database.md

## 2026-10-20T18:46:53Z
Sender: 9017f19c-7691-438b-963f-2783eaf1e83d
Priority: MESSAGE_PRIORITY_HIGH

You are Milestone 1 Explorer 1 (PostgreSQL Cluster Provisioning).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Specification: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Survey Database Report: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_1/survey_database.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Your mission for Milestone 1 (Database Foundation):
1. Plan the exact cluster bootstrapping commands (`initdb`, `pg_ctl`) using PostgreSQL 18 at `/usr/lib/postgresql/18/bin`.
2. Configure dedicated port `5435`, private unix socket directory `Mm-Mp/database/socket`, and data directory `Mm-Mp/database/pgdata`.
3. Design the automated initialization script `database/init.sh` that sets up the database `menumini_db` safely, idempotently, and cleanly.
4. Write your findings and recommended strategy to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m1_1/report.md` and handoff to `handoff.md`.
5. Message your parent when complete.
