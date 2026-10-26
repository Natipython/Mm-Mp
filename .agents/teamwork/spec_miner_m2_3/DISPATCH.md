## 2026-10-20T20:27:16Z
You are Milestone 2 Spec Miner 3 (Rust Core Module & Microservices Contracts Spec Miner).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m2_3
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Module: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/core/rust
Relevant E2E Tests:
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier1_features/f05_f08_realtime_qr.test.mjs
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier1_features/f09_f12_utility_rust.test.mjs
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier2_boundaries/b05_b08_realtime_qr_boundaries.test.mjs
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier2_boundaries/b09_b12_utility_rust_boundaries.test.mjs

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Your mission for Milestone 2 (Rust Core Module in core/rust & Service Contracts):
1. Inspect the reference Rust core module in `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/core/rust`.
2. Inspect the exact cryptographic token specification:
   - HMAC-SHA256 capability derivation matching PostgreSQL schema regex `^[A-Za-z0-9_-]{43}$`.
   - Base64URL encoding without padding (43 characters).
   - Exported WASM functions: `wasm_derive_guest_capability(secret, session_id, table_id, timestamp)`, `wasm_validate_capability(token, secret, session_id)`, `wasm_validate_hash(data, expected_hash)`.
3. Check Rust and cargo/wasm-pack toolchain availability (`rustc --version`, `cargo --version`, `wasm-pack --version`).
4. Cross-examine all E2E tests in `tests/e2e/` that test Features 5–12 and Boundaries 5–12 to extract exact request/response schemas, status codes, and error formats required by the tests.
5. Detail the Rust crate structure (`Cargo.toml`, `src/lib.rs`), compilation targets, and verification test commands for the implementation worker.
6. Write your comprehensive specification report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m2_3/report.md` and write your structured handoff to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m2_3/handoff.md`.
7. When done, send a message to parent with the report path.
