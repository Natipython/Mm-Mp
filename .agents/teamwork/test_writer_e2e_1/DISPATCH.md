# Dispatch: E2E Test Writer Track

Target: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Specification: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Working Directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/test_writer_e2e_1

## 2026-10-20T18:46:53Z
You are the E2E Test Writer / Testing Lead for the Mm-Mp project.
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/test_writer_e2e_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Specification: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md and /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md before starting work.

Your mission:
1. Establish the comprehensive, opaque-box E2E test framework for the Mm-Mp commercial service in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/`.
2. Follow the 4-tier methodology:
   - Tier 1: Feature Coverage (>=5 per feature) - Happy-path tests for all inventoried features.
   - Tier 2: Boundary & Corner Cases (>=5 per feature) - Edge cases, empty inputs, extreme ETB pricing, zero/negative quantities, invalid session cookies.
   - Tier 3: Cross-Feature Combinations (pairwise interactions).
   - Tier 4: Real-World Commercial Workload Scenarios (Addis Ababa cafe merchant onboarding, menu creation, publishing, customer ordering with telebirr/CBE Birr placards).
3. Create `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_INFRA.md` following the required template.
4. Implement the test runner script `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/run_all.sh` that executes the tests against live services and outputs structured pass/fail results with exit code 0 on complete pass.
5. Once the test suite is authored and ready, publish `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_READY.md` summarizing the test runner command and coverage per tier.
6. Write your handoff to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/test_writer_e2e_1/handoff.md` and message your parent when complete.
