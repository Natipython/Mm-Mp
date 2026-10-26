## 2026-10-20T19:16:34Z
You are Milestone 1 Challenger 2 (Boundary, RLS & Schema Challenger).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/challenger_m1_2
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Worker Handoff: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/worker_m1_2/handoff.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Challenger Objectives:
1. Adversarially challenge the schema and security boundaries:
   - Test connecting as unprivileged role `menu_customer` and verify that direct modification or insertion into `menumini.merchants` or `menumini.venues` is strictly blocked by PostgreSQL permissions.
   - Test connecting as `menu_workspace_runtime` without setting `menu.merchant_id` session config.
   - Test stored procedure `validate_branch_profile` with empty landmark to ensure migration 0012 fix works as intended.
   - Verify zero sample records remain invariant.
2. Deliver a clear verdict (APPROVE or CHALLENGE_FAILED).
3. Write your handoff report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/challenger_m1_2/handoff.md` and send a message when complete.
