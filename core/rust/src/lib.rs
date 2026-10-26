//! MenuMini Core Cryptographic & Capability Token Module
//! Reflects HMAC-SHA256 capability derivation and validation contracts matching PostgreSQL regex:
//! ^[A-Za-z0-9_-]{43}$

use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use wasm_bindgen::prelude::*;

type HmacSha256 = Hmac<Sha256>;

/// Derives a guest ordering capability token using HMAC-SHA256.
/// Output is exactly 43 characters in base64url encoding.
#[wasm_bindgen]
pub fn wasm_derive_guest_capability(
    key_base64url: &str,
    purpose: &str,
    venue_id: &str,
    table_id: &str,
) -> Result<String, JsValue> {
    let key_bytes = URL_SAFE_NO_PAD
        .decode(key_base64url)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64url key: {}", e)))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str(&format!(
            "Key must decode to exactly 32 bytes, got {}",
            key_bytes.len()
        )));
    }

    let payload = serde_json::to_string(&[
        "menumini-guest-v1",
        purpose,
        venue_id,
        table_id,
    ])
    .map_err(|e| JsValue::from_str(&format!("JSON serialization error: {}", e)))?;

    let mut mac = HmacSha256::new_from_slice(&key_bytes)
        .map_err(|e| JsValue::from_str(&format!("HMAC init error: {}", e)))?;
    mac.update(payload.as_bytes());
    let result = mac.finalize();
    let token = URL_SAFE_NO_PAD.encode(result.into_bytes());

    if token.len() != 43 {
        return Err(JsValue::from_str(&format!(
            "Derived token length must be 43, got {}",
            token.len()
        )));
    }

    Ok(token)
}

/// Validates whether a token matches the strict capability regex: ^[A-Za-z0-9_-]{43}$
#[wasm_bindgen]
pub fn wasm_validate_capability(token: &str) -> bool {
    if token.len() != 43 {
        return false;
    }
    token
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// Computes SHA-256 hex hash of a capability token (64 hex chars).
#[wasm_bindgen]
pub fn wasm_validate_hash(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}
