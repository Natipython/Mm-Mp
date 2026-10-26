/**
 * MenuMini Core Cryptographic Interface
 * Provides native Node/WASM-equivalent functions for HMAC-SHA256 capability derivation and validation.
 */
import crypto from 'node:crypto';

const CAPABILITY_REGEX = /^[A-Za-z0-9_-]{43}$/;
const HASH_REGEX = /^[a-f0-9]{64}$/;

export function wasm_derive_guest_capability(keyBase64Url, purpose, venueId, tableId) {
  if (!keyBase64Url || typeof keyBase64Url !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  const keyBuffer = Buffer.from(keyBase64Url, 'base64url');
  if (keyBuffer.length !== 32) {
    throw new Error(`Key must decode to exactly 32 bytes, got ${keyBuffer.length}`);
  }

  const payload = JSON.stringify(['menumini-guest-v1', purpose, venueId, tableId]);
  const token = crypto.createHmac('sha256', keyBuffer).update(payload, 'utf8').digest('base64url');

  if (!CAPABILITY_REGEX.test(token)) {
    throw new Error(`Derived token "${token}" does not match 43-character base64url format`);
  }
  return token;
}

export function wasm_validate_capability(token) {
  return typeof token === 'string' && CAPABILITY_REGEX.test(token);
}

export function wasm_validate_hash(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  const hash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  if (!HASH_REGEX.test(hash)) {
    throw new Error(`Hash "${hash}" does not match 64-char hex format`);
  }
  return hash;
}
