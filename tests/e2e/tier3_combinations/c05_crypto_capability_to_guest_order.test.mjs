/**
 * Tier 3: Cross-Feature Combinations
 * Combination 5: Rust HMAC-SHA256 Capability Derivation -> Client WASM Validation -> Guest Order Submission
 * Validates cryptographic capability pipeline matching PostgreSQL 0009_guest_ordering.sql
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import {
  deriveGuestCapability,
  hashCapability,
  validateCapabilityFormat,
  validateHashFormat,
  generateCapabilityKey
} from '../helpers/crypto-helper.mjs';

const webClient = new HttpClient(CONFIG.services.web.baseUrl);
const capabilitySecret = generateCapabilityKey();

describe('Tier 3: Combination 5 - Cryptographic Capability to Guest Dining Authorization', () => {
  const venueId = '777e1234-0000-0000-0000-000000000001';
  const tableId = '4';
  let guestToken = '';
  let guestHash = '';

  it('Step 1: Backend service derives HMAC-SHA256 capability token', () => {
    guestToken = deriveGuestCapability(capabilitySecret, 'guest-order', venueId, tableId);
    assert.strictEqual(guestToken.length, 43);
    assert.match(guestToken, CONFIG.crypto.capabilityRegex);
  });

  it('Step 2: Client-side WASM validator validates capability token format and computes SHA-256 hash', () => {
    const isTokenValid = validateCapabilityFormat(guestToken);
    assert.strictEqual(isTokenValid, true);

    guestHash = hashCapability(guestToken);
    assert.strictEqual(guestHash.length, 64);
    assert.strictEqual(validateHashFormat(guestHash), true);
  });

  it('Step 3: Customer submits dining order presenting valid capability token', async () => {
    const orderPayload = {
      venue_slug: 'crypto-test-venue',
      table: 4,
      items: [{ name: 'Fasting Shiro', price_etb_cents: 28000, quantity: 1 }],
      capability_token: guestToken,
    };

    const res = await webClient.post('/api/dining/order', orderPayload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.status, 'RECEIVED');
  });

  it('Step 4: Customer order with forged capability token is rejected with HTTP 403 Forbidden', async () => {
    const badPayload = {
      venue_slug: 'crypto-test-venue',
      table: 4,
      items: [{ name: 'Fasting Shiro', price_etb_cents: 28000, quantity: 1 }],
      capability_token: 'TAMPERED_FORGED_TOKEN_THAT_FAILS_VERIFICATION!',
    };

    const res = await webClient.post('/api/dining/order', badPayload);
    assert.strictEqual(res.status, 403);
  });
});
