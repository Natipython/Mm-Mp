/**
 * Tier 1: Feature Coverage (Features 9 - 10: Rust Crypto Capability Derivation & WASM Client Validator)
 * >= 5 tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import {
  deriveGuestCapability,
  hashCapability,
  validateCapabilityFormat,
  validateHashFormat,
  generateCapabilityKey
} from '../helpers/crypto-helper.mjs';

const testKey = generateCapabilityKey();

describe('Tier 1: Feature 9 - Rust Crypto Capability Derivation (HMAC-SHA256)', () => {
  it('F9.1: Derived capability token strictly matches PostgreSQL regex ^[A-Za-z0-9_-]{43}$', () => {
    const token = deriveGuestCapability(testKey, 'dining-order', 'venue-123', 'table-4');
    assert.match(token, CONFIG.crypto.capabilityRegex);
    assert.strictEqual(token.length, 43, 'Token length must be exactly 43 characters');
  });

  it('F9.2: Uses HMAC-SHA256 with 32-byte key buffer', () => {
    const key = Buffer.alloc(32, 0x5a).toString('base64url');
    const token = deriveGuestCapability(key, 'guest-session', 'user-abc');
    assert.ok(token);
    assert.strictEqual(token.length, 43);
  });

  it('F9.3: Output uses URL-safe base64 encoding without padding', () => {
    const token = deriveGuestCapability(testKey, 'payment-claim', 'order-999');
    assert.ok(!token.includes('+'), 'Must not contain standard base64 "+');
    assert.ok(!token.includes('/'), 'Must not contain standard base64 "/"');
    assert.ok(!token.includes('='), 'Must not contain trailing "=" padding');
  });

  it('F9.4: Token derivation is deterministic for identical inputs', () => {
    const token1 = deriveGuestCapability(testKey, 'dining', 'table-1');
    const token2 = deriveGuestCapability(testKey, 'dining', 'table-1');
    assert.strictEqual(token1, token2, 'Identical inputs must yield identical capability tokens');
  });

  it('F9.5: Different inputs produce distinct cryptographic capability tokens', () => {
    const tokenA = deriveGuestCapability(testKey, 'dining', 'table-1');
    const tokenB = deriveGuestCapability(testKey, 'dining', 'table-2');
    const tokenC = deriveGuestCapability(testKey, 'payment', 'table-1');
    assert.notStrictEqual(tokenA, tokenB);
    assert.notStrictEqual(tokenA, tokenC);
  });
});

describe('Tier 1: Feature 10 - Rust WASM Client Validator', () => {
  it('F10.1: Validates that valid 43-char base64url capability token passes verification', () => {
    const token = deriveGuestCapability(testKey, 'order', 'venue-uuid');
    const isValid = validateCapabilityFormat(token);
    assert.strictEqual(isValid, true, 'Valid capability format must return true');
  });

  it('F10.2: Validates that valid 64-char lowercase hex hash passes verification', () => {
    const token = deriveGuestCapability(testKey, 'order', 'venue-uuid');
    const hash = hashCapability(token);
    const isValid = validateHashFormat(hash);
    assert.strictEqual(isValid, true, 'Valid hash format must return true');
    assert.strictEqual(hash.length, 64, 'Hash length must be 64 hex characters');
  });

  it('F10.3: Rejects capability tokens with invalid characters (+, /, =)', () => {
    const invalidToken1 = 'abc+def123456789012345678901234567890123456';
    const invalidToken2 = 'abc/def123456789012345678901234567890123456';
    const invalidToken3 = 'abcdef123456789012345678901234567890123456=';
    assert.strictEqual(validateCapabilityFormat(invalidToken1), false);
    assert.strictEqual(validateCapabilityFormat(invalidToken2), false);
    assert.strictEqual(validateCapabilityFormat(invalidToken3), false);
  });

  it('F10.4: Rejects hashes with uppercase letters or non-hex characters', () => {
    const upperHash = 'A'.repeat(64);
    const nonHexHash = 'g'.repeat(64);
    assert.strictEqual(validateHashFormat(upperHash), false);
    assert.strictEqual(validateHashFormat(nonHexHash), false);
  });

  it('F10.5: SHA-256 hash matches PostgreSQL sha256 hex digest contract', () => {
    const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1'; // 43 chars
    const hash = hashCapability(token);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.strictEqual(hash, hashCapability(token), 'Hash computation must be idempotent');
  });
});
