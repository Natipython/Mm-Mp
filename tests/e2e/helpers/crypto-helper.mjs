/**
 * Cryptographic Capability & Hash Helper
 * Reflects core/rust HMAC-SHA256 capability specification & PostgreSQL 0009_guest_ordering.sql contracts.
 */
import { createHmac, createHash } from 'node:crypto';
import { CONFIG } from '../config.mjs';

/**
 * Derives a guest ordering capability token using HMAC-SHA256.
 * Output is exactly 43 characters in base64url encoding.
 */
export function deriveGuestCapability(keyBase64Url, purpose, ...parts) {
  if (!keyBase64Url || typeof keyBase64Url !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  const keyBuffer = Buffer.from(keyBase64Url, 'base64url');
  if (keyBuffer.length !== 32) {
    throw new Error(`Key must decode to exactly 32 bytes, got ${keyBuffer.length}`);
  }

  const payload = JSON.stringify(['menumini-guest-v1', purpose, ...parts]);
  const token = createHmac('sha256', keyBuffer).update(payload, 'utf8').digest('base64url');
  
  if (!CONFIG.crypto.capabilityRegex.test(token)) {
    throw new Error(`Derived token "${token}" does not match 43-character base64url format`);
  }
  return token;
}

/**
 * Computes SHA-256 hex hash of a capability token.
 * Output is exactly 64 lowercase hexadecimal characters.
 */
export function hashCapability(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  const hash = createHash('sha256').update(token, 'utf8').digest('hex');
  if (!CONFIG.crypto.hashRegex.test(hash)) {
    throw new Error(`Hash "${hash}" does not match 64-char hex format`);
  }
  return hash;
}

/**
 * Validates whether a token matches the strict capability regex
 */
export function validateCapabilityFormat(token) {
  return typeof token === 'string' && CONFIG.crypto.capabilityRegex.test(token);
}

/**
 * Validates whether a hash matches the strict 64-char hex format
 */
export function validateHashFormat(hash) {
  return typeof hash === 'string' && CONFIG.crypto.hashRegex.test(hash);
}

/**
 * Generates a valid 32-byte base64url key for testing
 */
export function generateCapabilityKey() {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[i] = (i * 37 + 13) % 256;
  return buf.toString('base64url');
}
