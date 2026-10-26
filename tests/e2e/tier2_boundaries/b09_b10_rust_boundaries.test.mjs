/**
 * Tier 2: Boundary & Corner Cases (Features 9 - 10: Rust Crypto Capability & WASM Client Validator)
 * >= 5 boundary tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveGuestCapability,
  hashCapability,
  validateCapabilityFormat,
  validateHashFormat,
  generateCapabilityKey
} from '../helpers/crypto-helper.mjs';

const validKey = generateCapabilityKey();

describe('Tier 2: Boundary - Feature 9 Rust Crypto Capability Derivation', () => {
  it('B9.1: Throws explicit error when capability key is empty string', () => {
    assert.throws(() => {
      deriveGuestCapability('', 'dining', 'table-1');
    }, /Key must be a non-empty string/);
  });

  it('B9.2: Throws when capability key is 31 bytes (1 byte too short)', () => {
    const shortKey = Buffer.alloc(31, 0x11).toString('base64url');
    assert.throws(() => {
      deriveGuestCapability(shortKey, 'dining', 'table-1');
    }, /Key must decode to exactly 32 bytes/);
  });

  it('B9.3: Throws when capability key is 33 bytes (1 byte too long)', () => {
    const longKey = Buffer.alloc(33, 0x22).toString('base64url');
    assert.throws(() => {
      deriveGuestCapability(longKey, 'dining', 'table-1');
    }, /Key must decode to exactly 32 bytes/);
  });

  it('B9.4: Handles empty strings in purpose and parts without crash', () => {
    const token = deriveGuestCapability(validKey, '', '');
    assert.strictEqual(token.length, 43);
    assert.strictEqual(validateCapabilityFormat(token), true);
  });

  it('B9.5: Handles Unicode/Amharic parts in HMAC calculation', () => {
    const token = deriveGuestCapability(validKey, 'dining', 'ቦሌ', 'ጠረጴዛ-፩');
    assert.strictEqual(token.length, 43);
    assert.strictEqual(validateCapabilityFormat(token), true);
  });
});

describe('Tier 2: Boundary - Feature 10 Rust WASM Client Validator', () => {
  it('B10.1: Validator rejects 42-character token (1 character too short)', () => {
    const shortToken = 'a'.repeat(42);
    assert.strictEqual(validateCapabilityFormat(shortToken), false);
  });

  it('B10.2: Validator rejects 44-character token (1 character too long)', () => {
    const longToken = 'a'.repeat(44);
    assert.strictEqual(validateCapabilityFormat(longToken), false);
  });

  it('B10.3: Validator rejects token containing whitespace or newlines', () => {
    const spaceToken = 'a'.repeat(21) + ' ' + 'a'.repeat(21);
    assert.strictEqual(validateCapabilityFormat(spaceToken), false);
  });

  it('B10.4: Hash validator rejects 63-character hash', () => {
    const shortHash = 'f'.repeat(63);
    assert.strictEqual(validateHashFormat(shortHash), false);
  });

  it('B10.5: Hash validator rejects hash with uppercase hexadecimal characters', () => {
    const upperHash = '1234567890abcdef'.repeat(3) + 'ABCD1234567890ab';
    assert.strictEqual(validateHashFormat(upperHash), false, 'Hash must be strictly lowercase');
  });
});
