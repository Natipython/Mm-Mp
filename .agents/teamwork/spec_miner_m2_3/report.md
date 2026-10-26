# Milestone 2 Specification Mining Report: Rust Core Module & Microservices Contracts

**Miner:** Spec Miner M2-3 (`spec_miner_m2_3`)  
**Target Project:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`  
**Working Directory:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/spec_miner_m2_3`  
**Governing Documents:**
- `ORIGINAL_REQUEST.md` (§R1, §R2, §R3)
- `PROJECT.md` (§Architecture, §Feature Inventory, §Interface Contracts)
- PostgreSQL Schema Migrations `0001_foundation.sql` through `0012_optional_landmark.sql`
- E2E Test Suite (`tests/e2e/tier1_features/`, `tests/e2e/tier2_boundaries/`, `tests/e2e/tier3_combinations/`, `tests/e2e/tier4_scenarios/`)
- Reference Codebase (`/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1`)

---

## 1. Executive Summary

Milestone 2 establishes the core computational engines and microservices contracts for the `Mm-Mp` platform:
1. **Rust Core Module (`core/rust`)**: High-speed cryptographic token derivation and client-side WebAssembly (WASM) validation engine. Implements 43-character URL-safe unpadded base64 HMAC-SHA256 capability derivation matching PostgreSQL database constraints (`^[A-Za-z0-9_-]{43}$`) and 64-character lowercase hexadecimal SHA-256 digests (`^[0-9a-f]{64}$`).
2. **Go Realtime Engine (`services/go`)**: High-concurrency QR generator (`/api/v1/qr`) and Gorilla WebSocket dining hub (`/ws/dining`) on port `8080`.
3. **Python Utility Service (`services/python`)**: FastAPI service on port `5001` providing Amharic Ethiopic Fidel text normalization (homophone and punctuation folding) and menu draft import/export (CSV, Excel `.xlsx`, JSON).
4. **Interface Contracts & Test Cross-Examination**: Full extraction of request/response schemas, error handling, status codes, and boundary tolerances required to pass Features 5–12 and Boundaries 5–12 in the E2E test suite.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Rust Crypto | F09.1: Capability Format | Derives capability token strictly matching PostgreSQL regex `^[A-Za-z0-9_-]{43}$` | 32-byte Base64URL key, purpose string, variable string parts | 43-char Base64URL string | Throws error if key length != 32 bytes | `0009_guest_ordering.sql:181`, `f09_f10_rust_crypto.test.mjs:19` |
| 2 | Rust Crypto | F09.2: HMAC-SHA256 Engine | Derives cryptographic tokens using HMAC-SHA256 over JSON array `["menumini-guest-v1", purpose, ...parts]` | Key buffer, purpose, parts | 32-byte raw HMAC digest | Throws error if key is empty | `crypto-helper.mjs:21`, `f09_f10_rust_crypto.test.mjs:25` |
| 3 | Rust Crypto | F09.3: Base64URL Unpadded Encoding | Digests encoded in URL-safe base64 without `+`, `/`, or `=` padding | 32-byte digest | 43-char URL-safe string | Reject if contains `+`, `/`, `=` | `f09_f10_rust_crypto.test.mjs:32` |
| 4 | Rust Crypto | F09.4: Deterministic Derivation | Identical inputs consistently yield identical tokens | Same key, purpose, parts | Identical 43-char token | None (idempotent) | `f09_f10_rust_crypto.test.mjs:39` |
| 5 | Rust Crypto | F09.5: Collision Resistance | Distinct inputs produce distinct cryptographic tokens | Different keys, purposes, or parts | Distinct 43-char tokens | None | `f09_f10_rust_crypto.test.mjs:45` |
| 6 | Rust WASM | F10.1: Capability Format Validator | Validates token string against regex `^[A-Za-z0-9_-]{43}$` | Token string | Boolean `true` or `false` | Returns `false` on invalid chars or length | `f09_f10_rust_crypto.test.mjs:55` |
| 7 | Rust WASM | F10.2: Hash Format Validator | Validates hash string against regex `^[0-9a-f]{64}$` | Hash string | Boolean `true` or `false` | Returns `false` on uppercase or non-hex | `f09_f10_rust_crypto.test.mjs:61` |
| 8 | Rust WASM | F10.3: Token Hash Computation | Computes SHA-256 of token matching PostgreSQL `encode(sha256(...), 'hex')` | 43-char token string | 64-char lowercase hex string | Throws error if token is empty | `0009_guest_ordering.sql:182`, `f09_f10_rust_crypto.test.mjs:85` |
| 9 | Rust WASM | F10.4: Exported WASM Derivation | `wasm_derive_guest_capability` exposed to JS/WASM runtime | `secret`, `session_id`, `table_id`, `timestamp` | 43-char token string | Returns JS error on invalid secret | Dispatch prompt §2, `PROJECT.md:71` |
| 10 | Rust WASM | F10.5: Exported WASM Validation | `wasm_validate_capability` and `wasm_validate_hash` | `token, secret, session_id` / `data, expected_hash` | Boolean | Returns `false` on tamper/mismatch | Dispatch prompt §2, `PROJECT.md:71` |
| 11 | Go Engine | F05.1: Go Liveness Probe | HTTP `GET /healthz` returns service liveness | None | JSON `{"status": "ok", ...}`, 200 OK | Connection refused if down | `f05_f06_go_realtime.test.mjs:14` |
| 12 | Go Engine | F05.2: Realtime QR Generation | HTTP `GET /api/v1/qr?url=<target>` returns PNG image | URL-encoded URL string | Binary PNG buffer (`image/png`), 200 OK | 400 Bad Request if URL missing | `f05_f06_go_realtime.test.mjs:20` |
| 13 | Go Engine | F05.3: QR Header Signature | Response contains 8-byte PNG signature `89 50 4E 47 0D 0A 1A 0A` | URL string | Valid PNG stream | Non-200 on failure | `f05_f06_go_realtime.test.mjs:34` |
| 14 | Go Engine | F05.4: Dynamic Table QR URL | QR endpoint encodes table query parameter `?table=N` | URL with `?table=N` | Scannable PNG QR code | 400 on empty | `f05_f06_go_realtime.test.mjs:48` |
| 15 | Go Engine | F06.1: WebSocket Dining Upgrade | HTTP `GET /ws/dining?venue_id=<id>&room=<room>&table_id=<num>` upgrades to WS | Query params: `venue_id`, `room`, `table_id` | HTTP 101 Switching Protocols | 400 Bad Request if `venue_id` missing | `f05_f06_go_realtime.test.mjs:57` |
| 16 | Go Engine | F06.2: WebSocket Welcome Frame | Server emits initial connection confirmation event | Client connects to room | JSON `{"event": "connected", "venue_id": "...", "room": "...", "table_id": ...}` | Closes if invalid handshake | `f05_f06_go_realtime.test.mjs:71`, `mock-server.mjs:143` |
| 17 | Go Engine | F06.3: WebSocket Order Broadcast | Kitchen room receives `new_order` event when order placed | Kitchen room listener | JSON `{"event": "new_order", "table": N, "total_etb_cents": C, ...}` | Dropped if client disconnected | `c04_cart_order_to_websocket_kds.test.mjs:40` |
| 18 | Python Utility | F07.1: Python Liveness Probe | HTTP `GET /healthz` returns service liveness | None | JSON `{"status": "ok"}`, 200 OK | Connection refused if down | `f07_f08_python_utility.test.mjs:13` |
| 19 | Python Utility | F07.2: Fidel Homophone Folding | HTTP `POST /api/v1/normalize-amharic` normalizes ሐ/ኀ->ሀ, ሠ->ሰ, ዐ->አ, ፀ->ጸ | JSON `{"text": "<string>"}` | JSON `{"original": "...", "normalized": "..."}` | 400 if `text` is not string | `f07_f08_python_utility.test.mjs:19` |
| 20 | Python Utility | F07.3: Ethiopic Separator Fold | Replaces traditional word separator `፡` (`\u1361`) with standard space | JSON `{"text": "ልዩ፡የበሬ፡ጥብስ"}` | JSON `{"normalized": "ልዩ የበሬ ጥብስ"}` | 400 if invalid payload | `f07_f08_python_utility.test.mjs:29` |
| 21 | Python Utility | F07.4: Ethiopic Punctuation Fold | Normalizes `፣`->`,`, `፤`->`;`, `።`->`.` | JSON `{"text": "ቡና፣ ሻይ፤ ማኪያቶ。"}` | JSON `{"normalized": "ቡና, ሻይ; ማኪያቶ."}` | Handled gracefully | `f07_f08_python_utility.test.mjs:37` |
| 22 | Python Utility | F07.5: Bilingual Text Preservation | Preserves mixed Amharic and English without corruption | JSON `{"text": "Special ማኪያቶ with 200 ETB"}` | JSON `{"normalized": "Special ማኪያቶ with 200 ETB"}` | Preserved exactly | `f07_f08_python_utility.test.mjs:45` |
| 23 | Python Utility | F08.1: Menu Import Processing | HTTP `POST /api/v1/menu/import` parses menu items array | JSON `{"items": [...]}` | JSON `{"ok": true, "count": N, "draft": {"sections": [...]}}` | 400 if `items` missing | `f07_f08_python_utility.test.mjs:55` |
| 24 | Python Utility | F08.2: ETB Cents Rounding | Converts decimal ETB (`650.50`) to integer cents (`65050`) via rounding | JSON item with `price_etb: 650.50` | JSON draft with `price_etb_cents: 65050` | Rejects non-numeric prices | `f07_f08_python_utility.test.mjs:68` |
| 25 | Python Utility | F08.3: Inline Import Normalization | Automatically runs Fidel normalizer over imported Amharic dish names | JSON item with `name_am: "ሠላም፡ሻይ"` | JSON draft with `name_am: "ሰላም ሻይ"` | Handled cleanly | `f07_f08_python_utility.test.mjs:80` |
| 26 | Python Utility | F08.4: Menu Export Generation | HTTP `POST /api/v1/menu/export` exports menu draft | JSON menu draft | Content-Disposition `attachment`, JSON payload with `exported_at` | 200 with timestamp | `f07_f08_python_utility.test.mjs:92` |
| 27 | Web PWA | F11.1-F11.5: PWA Foundation | SvelteKit web server on port 5173 with HTML5 DOCTYPE and viewport | HTTP GET `/` | Status 200, HTML body, sub-250ms load time | 404 on invalid route | `f11_f16_pwa_ux.test.mjs:12-44` |
| 28 | Web Design | F12.1-F12.5: Warm Luxury Palette | Obsidian `#0E1015`, charcoal `#151821`, copper `#C87D55`, cream `#F5F3EF`; strictly no bright yellow/blue | CSS / Theme styles | Validated stylesheet | Hard rejection of `#FFFF00`, `#0000FF`, etc. | `f11_f16_pwa_ux.test.mjs:46-74` |

---

## 3. Edge Cases & Boundary Tolerances

| # | Feature | Input / Scenario | Observed / Required Behavior | Test Reference |
|---|---------|------------------|------------------------------|----------------|
| 1 | Rust Crypto F09 | Empty string key `deriveGuestCapability('', ...)` | Throws explicit error: `/Key must be a non-empty string/` | `b09_b10_rust_boundaries.test.mjs:18` |
| 2 | Rust Crypto F09 | 31-byte key buffer (1 byte too short) | Throws explicit error: `/Key must decode to exactly 32 bytes/` | `b09_b10_rust_boundaries.test.mjs:24` |
| 3 | Rust Crypto F09 | 33-byte key buffer (1 byte too long) | Throws explicit error: `/Key must decode to exactly 32 bytes/` | `b09_b10_rust_boundaries.test.mjs:31` |
| 4 | Rust Crypto F09 | Empty string purpose and parts `('', '')` | Succeeds without crash; yields valid 43-char token | `b09_b10_rust_boundaries.test.mjs:38` |
| 5 | Rust Crypto F09 | Unicode & Amharic parts (`'dining', 'ቦሌ', 'ጠረጴዛ-፩'`) | Correct UTF-8 HMAC digest; yields valid 43-char token | `b09_b10_rust_boundaries.test.mjs:44` |
| 6 | Rust Crypto F09 | 100+ repeated parts (e.g. 500+ character total payload) | Derives valid 43-char token without buffer overrun | `b17_b24_commercial_boundaries.test.mjs:230` |
| 7 | Rust WASM F10 | 42-character token (1 char short) | `validateCapabilityFormat` returns `false` | `b09_b10_rust_boundaries.test.mjs:52` |
| 8 | Rust WASM F10 | 44-character token (1 char long) | `validateCapabilityFormat` returns `false` | `b09_b10_rust_boundaries.test.mjs:57` |
| 9 | Rust WASM F10 | Token containing standard Base64 `+` or `/` or `=` | `validateCapabilityFormat` returns `false` | `f09_f10_rust_crypto.test.mjs:69` |
| 10 | Rust WASM F10 | Token containing internal whitespace or newline | `validateCapabilityFormat` returns `false` | `b09_b10_rust_boundaries.test.mjs:62` |
| 11 | Rust WASM F10 | 63-character hex hash (1 char short) | `validateHashFormat` returns `false` | `b09_b10_rust_boundaries.test.mjs:67` |
| 12 | Rust WASM F10 | Hash containing uppercase hex characters (`A-F`) | `validateHashFormat` returns `false` (strictly lowercase required) | `b09_b10_rust_boundaries.test.mjs:72` |
| 13 | Rust WASM F10 | Hash containing non-hex characters (`g-z`) | `validateHashFormat` returns `false` | `f09_f10_rust_crypto.test.mjs:78` |
| 14 | Go QR F05 | Missing `url` query parameter | HTTP 400 Bad Request, JSON error | `b05_b06_go_boundaries.test.mjs:14` |
| 15 | Go QR F05 | Empty string `url=` parameter | HTTP 400 Bad Request, JSON error | `b05_b06_go_boundaries.test.mjs:19` |
| 16 | Go QR F05 | Exceptionally long URL (2048 chars) | Returns HTTP 200 (or 414/400); no crash or hang | `b05_b06_go_boundaries.test.mjs:24` |
| 17 | Go QR F05 | XSS payload in URL (`<script>alert(1)</script>`) | Encodes payload safely into QR image; HTTP 200 | `b05_b06_go_boundaries.test.mjs:30` |
| 18 | Go QR F05 | Amharic Unicode URL (`/menu/ካፌ-ቦሌ`) | Correctly encodes UTF-8 URL into QR; HTTP 200 | `b05_b06_go_boundaries.test.mjs:37` |
| 19 | Go WebSocket F06 | Missing `venue_id` query parameter | WebSocket upgrade rejected with HTTP 400 Bad Request | `b05_b06_go_boundaries.test.mjs:45` |
| 20 | Go WebSocket F06 | Unknown room name (`unknown-room-xyz`) | Handled gracefully without server panic | `b05_b06_go_boundaries.test.mjs:52` |
| 21 | Go WebSocket F06 | Malformed non-JSON frame sent by client | Ignored safely without terminating connection or crashing | `b05_b06_go_boundaries.test.mjs:63` |
| 22 | Go WebSocket F06 | Rapid repeated connection & disconnection | Handled cleanly; connection state maps purged | `b05_b06_go_boundaries.test.mjs:72` |
| 23 | Go WebSocket F06 | Table ID <= 0 or negative value | Handled gracefully without crash | `b05_b06_go_boundaries.test.mjs:81` |
| 24 | Python Normalizer F07 | Empty string input `""` | Returns `{"normalized": ""}` without error | `b07_b08_python_boundaries.test.mjs:13` |
| 25 | Python Normalizer F07 | Text with emojis (`☕`, `🌟`) | Preserves emojis intact without corrupting bytes | `b07_b08_python_boundaries.test.mjs:19` |
| 26 | Python Normalizer F07 | Consecutive punctuation (`፡።፣፤`) | Normalizes without infinite loops or hanging | `b07_b08_python_boundaries.test.mjs:28` |
| 27 | Python Normalizer F07 | Non-string `text` field (e.g. integer `12345`) | HTTP 400 Bad Request, JSON error | `b07_b08_python_boundaries.test.mjs:36` |
| 28 | Python Normalizer F07 | Ethiopic traditional numerals (`፩`, `፪`, `፫`, etc.) | Numerals preserved exactly without alteration | `b07_b08_python_boundaries.test.mjs:41` |
| 29 | Python Import F08 | Missing `items` array | HTTP 400 Bad Request, JSON error | `b07_b08_python_boundaries.test.mjs:52` |
| 30 | Python Import F08 | Recurring decimal float price (`99.999`) | Rounded to nearest integer cents (`10000`) | `b07_b08_python_boundaries.test.mjs:57` |
| 31 | Python Import F08 | Empty items array `[]` | Returns `{"ok": true, "count": 0, ...}` | `b07_b08_python_boundaries.test.mjs:67` |
| 32 | Python Import F08 | Large batch (50+ items) | Processes all items successfully with `count: 50` | `b07_b08_python_boundaries.test.mjs:73` |
| 33 | Python Export F08 | Null or empty menu draft `{}` | Returns HTTP 200 with valid `exported_at` timestamp | `b07_b08_python_boundaries.test.mjs:83` |

---

## 4. Cryptographic Token Specification

### 4.1 Specification Constraints (Database & E2E Tests)
1. **Capability Token Regex:** `^[A-Za-z0-9_-]{43}$`
   - Referenced in PostgreSQL migration `0009_guest_ordering.sql:181`:
     ```sql
     if jsonb_typeof(p_body->'pairingToken') is distinct from 'string' or p_body->>'pairingToken' !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invitation invalid' using errcode='23514'; end if;
     ```
   - Referenced in `tests/e2e/config.mjs:45`: `capabilityRegex: /^[A-Za-z0-9_-]{43}$/`.
2. **Capability Hash Regex:** `^[0-9a-f]{64}$`
   - Referenced in PostgreSQL migration `0009_guest_ordering.sql:38, 79, 107`:
     ```sql
     if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' ...
     ```
   - Computed in PostgreSQL via `encode(sha256(convert_to(pairingToken, 'UTF8')), 'hex')`.
3. **Encoding & Sizing Arithmetic:**
   - Digest output of HMAC-SHA256 is exactly 32 bytes (256 bits).
   - In Base64, 32 bytes is represented by `ceil(32 * 8 / 6) = 43` characters, with 2 leftover bits.
   - Standard Base64 appends an `=` pad character, yielding 44 characters.
   - **Base64URL without padding** omits the `=` padding and substitutes `+` -> `-`, `/` -> `_`.
   - Length is therefore **strictly 43 ASCII characters**.

### 4.2 Derivation Pipeline
1. **Secret Key Input:** Base64URL string that decodes to exactly 32 bytes.
   - If empty: Error "Key must be a non-empty string".
   - If decoded length != 32: Error "Key must decode to exactly 32 bytes, got <len>".
2. **Payload Envelope:**
   - JSON serialization of an array: `["menumini-guest-v1", purpose, ...parts]`.
   - Serialized to UTF-8 encoded byte array.
3. **HMAC Calculation:**
   - Compute `HMAC-SHA256(key_bytes, payload_bytes)`.
4. **Digest Encoding:**
   - Unpadded URL-safe Base64: `base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)`.
   - Output string: exactly 43 characters matching `^[A-Za-z0-9_-]{43}$`.
5. **Hash Calculation:**
   - Compute `SHA256(token_string_utf8_bytes)`.
   - Encode as lowercase hexadecimal: 64 characters matching `^[0-9a-f]{64}$`.

### 4.3 Exported WASM API
In `core/rust/src/lib.rs`:

```rust
use wasm_bindgen::prelude::*;

/// Derives a 43-character base64url capability token.
#[wasm_bindgen]
pub fn wasm_derive_guest_capability(
    secret: &str,
    session_id: &str,
    table_id: &str,
    timestamp: &str,
) -> Result<String, JsValue> {
    crate::crypto::derive_guest_capability_wasm(secret, session_id, table_id, timestamp)
        .map_err(|e| JsValue::from_str(&e))
}

/// Validates whether a token matches the capability regex ^[A-Za-z0-9_-]{43}$
/// and optionally verifies cryptographic authenticity if secret is provided.
#[wasm_bindgen]
pub fn wasm_validate_capability(token: &str, secret: &str, session_id: &str) -> bool {
    crate::validation::validate_capability(token, secret, session_id)
}

/// Validates that data matches expected 64-char lowercase SHA256 hex hash,
/// and verifies that expected_hash matches ^[0-9a-f]{64}$.
#[wasm_bindgen]
pub fn wasm_validate_hash(data: &str, expected_hash: &str) -> bool {
    crate::validation::validate_hash(data, expected_hash)
}

/// Directly validates token string format against ^[A-Za-z0-9_-]{43}$.
#[wasm_bindgen]
pub fn wasm_validate_capability_format(token: &str) -> bool {
    crate::validation::validate_capability_format(token)
}

/// Directly validates hash string format against ^[0-9a-f]{64}$.
#[wasm_bindgen]
pub fn wasm_validate_hash_format(hash: &str) -> bool {
    crate::validation::validate_hash_format(hash)
}

/// Computes 64-char lowercase SHA256 hex hash of a capability token.
#[wasm_bindgen]
pub fn wasm_hash_capability(token: &str) -> Result<String, JsValue> {
    crate::crypto::hash_capability(token)
        .map_err(|e| JsValue::from_str(&e))
}

/// Validates ETB currency format (positive decimal with <= 2 decimal digits).
#[wasm_bindgen]
pub fn wasm_validate_etb_amount(amount: &str) -> bool {
    crate::validation::validate_etb_amount(amount)
}
```

---

## 5. Toolchain Audit Findings

### 5.1 Host System Toolchain State
| Tool | Command | Status | Details |
|---|---|---|---|
| `rustc` | `rustc --version` | Missing in standard PATH | Not currently installed in `/usr/bin` or default PATH |
| `cargo` | `cargo --version` | Missing in standard PATH | Not currently installed in `/usr/bin` or default PATH |
| `wasm-pack` | `wasm-pack --version` | Missing in standard PATH | Not installed |
| `rustup` | `/home/n-a-t/.cache/puccinialin/cargo/bin/rustup` | **Present** (v1.29.0) | Located in `/home/n-a-t/.cache/puccinialin/cargo/bin/rustup`. Needs `rustup default stable`. |
| `go` | `go version` | Missing in standard PATH | Needs binary download or package install |
| `python3` | `python3 --version` | **Present** (Python 3.14.4) | Standard Python 3 interpreter ready with `venv` support |
| `node` | `node --version` | **Present** (v22.22.1) | Supports native `--test` and global `WebSocket` |
| `npm` | `npm --version` | **Present** (9.2.0) | Package manager ready |

### 5.2 Network & Package Repository Connectivity
- `static.rust-lang.org` returned `HTTP/2 200 OK`. The host has active internet access to fetch Rust toolchains via `rustup`.
- `go.dev` returned `HTTP/2 200 OK`.

### 5.3 Setup Commands for Implementation Worker
To activate Rust and WASM on the system:
```bash
# 1. Add rustup binaries to PATH
export PATH="/home/n-a-t/.cache/puccinialin/cargo/bin:$PATH"

# 2. Install stable Rust toolchain
rustup default stable

# 3. Add WASM target
rustup target add wasm32-unknown-unknown

# 4. Install wasm-pack
cargo install wasm-pack || npm install -g wasm-pack
```

---

## 6. Rust Crate Architecture & Implementation Plan

### 6.1 Directory & File Layout
```
/run/media/n-a-t/Local Disk_HDD/Mm-Mp/core/rust/
├── Cargo.toml
├── src/
│   ├── lib.rs            # Re-exports, WASM bindings, JsValue conversion
│   ├── crypto.rs         # HMAC-SHA256, SHA-256 hex, Base64URL encoding
│   └── validation.rs     # Strict regex checking, length bounds, constant-time compare
└── tests/
    └── crypto_tests.rs   # Comprehensive native unit tests (F9, F10, B9, B10)
```

### 6.2 `Cargo.toml`
```toml
[package]
name = "menumini-core"
version = "0.1.0"
edition = "2021"
authors = ["Mm-Mp Team"]
description = "High-speed cryptographic capability and WASM validator for Mm-Mp digital dining platform"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
hmac = "0.12"
sha2 = "0.10"
base64 = "0.22"
hex = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
regex = "1.10"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "s"
lto = true
```

### 6.3 Implementation Details (`src/crypto.rs`)
```rust
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

type HmacSha256 = Hmac<Sha256>;

pub fn derive_guest_capability(key_b64url: &str, purpose: &str, parts: &[&str]) -> Result<String, String> {
    if key_b64url.is_empty() {
        return Err("Key must be a non-empty string".to_string());
    }

    let key_bytes = URL_SAFE_NO_PAD
        .decode(key_b64url)
        .map_err(|e| format!("Invalid base64url key: {}", e))?;

    if key_bytes.len() != 32 {
        return Err(format!("Key must decode to exactly 32 bytes, got {}", key_bytes.len()));
    }

    // Build JSON array envelope: ["menumini-guest-v1", purpose, ...parts]
    let mut envelope = Vec::with_capacity(2 + parts.len());
    envelope.push("menumini-guest-v1");
    envelope.push(purpose);
    for part in parts {
        envelope.push(part);
    }

    let payload_json = serde_json::to_string(&envelope)
        .map_err(|e| format!("Serialization error: {}", e))?;

    let mut mac = HmacSha256::new_from_slice(&key_bytes)
        .map_err(|e| format!("HMAC init error: {}", e))?;
    mac.update(payload_json.as_bytes());
    let result = mac.finalize();
    let token = URL_SAFE_NO_PAD.encode(result.into_bytes());

    if token.len() != 43 {
        return Err(format!("Derived token has invalid length {}", token.len()));
    }

    Ok(token)
}

pub fn derive_guest_capability_wasm(secret: &str, session_id: &str, table_id: &str, timestamp: &str) -> Result<String, String> {
    derive_guest_capability(secret, "guest-session", &[session_id, table_id, timestamp])
}

pub fn hash_capability(token: &str) -> Result<String, String> {
    if token.is_empty() {
        return Err("Token must be a non-empty string".to_string());
    }
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let hash = hex::encode(hasher.finalize());
    Ok(hash)
}
```

### 6.4 Implementation Details (`src/validation.rs`)
```rust
use regex::Regex;
use std::sync::OnceLock;

static CAPABILITY_REGEX: OnceLock<Regex> = OnceLock::new();
static HASH_REGEX: OnceLock<Regex> = OnceLock::new();
static ETB_AMOUNT_REGEX: OnceLock<Regex> = OnceLock::new();

fn capability_regex() -> &'static Regex {
    CAPABILITY_REGEX.get_or_init(|| Regex::new(r"^[A-Za-z0-9_-]{43}$").unwrap())
}

fn hash_regex() -> &'static Regex {
    HASH_REGEX.get_or_init(|| Regex::new(r"^[0-9a-f]{64}$").unwrap())
}

fn etb_amount_regex() -> &'static Regex {
    ETB_AMOUNT_REGEX.get_or_init(|| Regex::new(r"^\d+(\.\d{1,2})?$").unwrap())
}

pub fn validate_capability_format(token: &str) -> bool {
    capability_regex().is_match(token)
}

pub fn validate_hash_format(hash: &str) -> bool {
    hash_regex().is_match(hash)
}

pub fn validate_capability(token: &str, secret: &str, session_id: &str) -> bool {
    if !validate_capability_format(token) {
        return false;
    }
    if secret.is_empty() || session_id.is_empty() {
        return true;
    }
    // Re-verify if secret provided
    match crate::crypto::derive_guest_capability(secret, "guest-session", &[session_id]) {
        Ok(expected) => expected == token,
        Err(_) => false,
    }
}

pub fn validate_hash(data: &str, expected_hash: &str) -> bool {
    if !validate_hash_format(expected_hash) {
        return false;
    }
    match crate::crypto::hash_capability(data) {
        Ok(actual) => actual == expected_hash,
        Err(_) => false,
    }
}

pub fn validate_etb_amount(amount: &str) -> bool {
    etb_amount_regex().is_match(amount)
}
```

---

## 7. Verification Method for Implementation Worker

The worker implementing `core/rust` must execute these independent verification steps:

1. **Verify Toolchain Setup:**
   ```bash
   export PATH="/home/n-a-t/.cache/puccinialin/cargo/bin:$PATH"
   rustc --version
   cargo --version
   ```

2. **Run Native Rust Unit & Integration Tests:**
   ```bash
   cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/core/rust"
   cargo test -- --nocapture
   ```
   *Expected output:* All native tests pass (validating HMAC 43-char tokens, key length checks, Unicode Amharic inputs, uppercase rejection).

3. **Compile WASM Bundle:**
   ```bash
   cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/core/rust"
   wasm-pack build --target web --out-dir ../../web/src/lib/wasm
   ```
   *Expected output:* Generates `menumini_core_bg.wasm`, `menumini_core.js`, and `menumini_core.d.ts`.

4. **Run Node 22 E2E Tests (Features 9-10 and Boundaries 9-10):**
   ```bash
   cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e"
   node --test tier1_features/f09_f10_rust_crypto.test.mjs
   node --test tier2_boundaries/b09_b10_rust_boundaries.test.mjs
   node --test tier3_combinations/c05_crypto_capability_to_guest_order.test.mjs
   ```
   *Expected output:* 24/24 tests pass with 0 failures.
