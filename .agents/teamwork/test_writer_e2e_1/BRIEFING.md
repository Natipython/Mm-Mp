# BRIEFING — 2026-10-20T21:51:00Z

## Mission
Establish the comprehensive, opaque-box E2E test framework for the Mm-Mp commercial service in /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/, covering Tiers 1-4 with >=5 tests per feature, creating TEST_INFRA.md, run_all.sh, and TEST_READY.md.

## 🔒 My Identity
- Archetype: test_writer
- Roles: specialist, qa
- Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/test_writer_e2e_1
- Original parent: 9017f19c-7691-438b-963f-2783eaf1e83d
- Milestone: Testing Track (Tiers 1-4)

## 🔒 Key Constraints
- Write and modify test code and test documentation ONLY — never implementation code.
- Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp.
- E2E tests must be opaque-box, testing observable behavior via HTTP/WebSocket/CLI/DB endpoints against live services or test harness.
- Follow 4-tier methodology:
  - Tier 1: Feature Coverage (>=5 per feature) - Happy path.
  - Tier 2: Boundary & Corner Cases (>=5 per feature) - Edge cases, empty inputs, extreme ETB pricing, zero/negative quantities, invalid session cookies.
  - Tier 3: Cross-Feature Combinations (pairwise interactions).
  - Tier 4: Real-World Commercial Workload Scenarios (Addis Ababa cafe merchant onboarding, menu creation, publishing, customer ordering with telebirr/CBE Birr placards).
- Create /run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_INFRA.md following standard template.
- Implement test runner /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/run_all.sh with structured pass/fail results and exit code 0 on complete pass.
- Publish /run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_READY.md when test suite is complete.
- Escalate any implementation defects to orchestrator/workers, never fix implementation code directly.
- .agents/teamwork/ must contain only metadata — never place test code or data files here.

## Current Parent
- Conversation ID: 9017f19c-7691-438b-963f-2783eaf1e83d
- Updated: 2026-10-20T18:46:53Z

## Task Summary
- **What to build**: Comprehensive 4-tier E2E test suite in `tests/e2e/`, `TEST_INFRA.md`, executable `run_all.sh`, `TEST_READY.md`.
- **Success criteria**: 
  - Complete test inventory covering all 24 features defined in `PROJECT.md`.
  - Tier 1: >=5 happy path tests per feature.
  - Tier 2: >=5 boundary/corner tests per feature.
  - Tier 3: Cross-feature pairwise interaction test cases.
  - Tier 4: Addis Ababa cafe commercial end-to-end user journeys.
  - Self-contained, robust runner script `tests/e2e/run_all.sh`.
  - `TEST_INFRA.md` and `TEST_READY.md` published.
- **Interface contracts**: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md § Interface Contracts
- **Code layout**: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md § Code Layout

## Key Decisions Made
- Use Python pytest with `httpx`, `websockets`, `psycopg2`/`asyncpg` or Node.js / bash runner for high performance and clean assertions. Given Python 3 is standard in Linux and already used across the project (`services/python` and test scripts in reference), pytest provides clean fixture management, isolation, parameterized tests, and structured JSON/JUnit reporting.
- Author modular test suites in `tests/e2e/`:
  - `tier1_features/`: Happy-path feature tests (>=5 tests per feature across all 24 features or logical services: DB, Go QR/WS, Python Fidel/Import, Rust Crypto/WASM, Web Auth/Studio/Publish/Customer/Placards).
  - `tier2_boundaries/`: Boundary, negative, and edge-case tests (extreme ETB values, invalid input schemas, injection strings, negative quantities, malformed auth tokens, etc.).
  - `tier3_combinations/`: Cross-feature pairwise flows (e.g. Normalization + Import -> Studio -> Publish -> QR -> Guest Order -> WebSocket notification).
  - `tier4_scenarios/`: Real-world commercial Addis Ababa venue lifecycles (e.g. Bole Velvet Cafe, Habesha Roastery, Entoto Bistro onboarding, bilingual menus, telebirr/CBE Birr payment verification).
- Create standalone test runner `run_all.sh` that detects active services (or mocks/harness) and runs the test suite, outputting clean structured summaries.

## Artifact Index
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_INFRA.md — Test infrastructure documentation
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/TEST_READY.md — Test suite readiness specification
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/run_all.sh — E2E test runner script
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/ — Test suite directory

## Loaded Skills
- Source: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/postman/skills/api-engineer/SKILL.md
  - Local copy: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/test_writer_e2e_1/skills/api-engineer.md
  - Core methodology: Contract comes first, validate against contracts, prove it works, filesystem-first testing.

## Quality Status
- **Build/test result**: Not started yet
- **Lint status**: Clean
- **Tests added/modified**: In preparation
