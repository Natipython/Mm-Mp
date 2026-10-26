## 2026-10-20T19:07:03Z

You are Milestone 1 Worker Replacement (worker_m1_2).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_2
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Interruption Recovery:
Previous worker `worker_m1_1` set up the initial files (`database/init.sh`, `database/roles.sql`, `database/verify_clean.sql`, `database/migrations/`, `database/pgdata/`, `.env`) and began executing when its stream timed out.

Your objectives:
1. Inspect the existing files in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/database/` and `.env`.
2. Ensure that PostgreSQL cluster running in `Mm-Mp/database/pgdata` on port `5435` is cleanly initialized, healthy, and accessible.
3. Verify that all 12 migrations `0001_foundation.sql` through `0012_optional_landmark.sql` are applied cleanly with zero errors.
4. Execute `database/roles.sql` to ensure all 4 login roles (`menu_admin`, `menu_workspace_runtime`, `menu_customer`, `menu_guest_runtime`) are provisioned with their respective passwords from `.env` and memberships in `menu_runtime`, `menu_public`, and `menu_guest_api`.
5. Execute `database/verify_clean.sql` and confirm zero sample records exist (merchants = 0, venues = 0, dishes = 0).
6. Verify that `database/init.sh` runs cleanly, idempotently, and can check/restart the service without error.
7. Test TCP connections for all 4 roles and verify application handshake functions.
8. Document all commands, execution outputs, and verification tables in your structured handoff report `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_2/handoff.md`.
9. Send a message to parent when complete.
