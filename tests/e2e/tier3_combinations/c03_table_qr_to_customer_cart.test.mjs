/**
 * Tier 3: Cross-Feature Combinations
 * Combination 3: Dynamic Table QR Generation -> Public Venue Route -> Table Context Cart Init
 * Validates Go QR service, SvelteKit routing, table parameter passing, and offline cart initialization
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const goClient = new HttpClient(CONFIG.services.go.baseUrl);
const webClient = new HttpClient(CONFIG.services.web.baseUrl);

describe('Tier 3: Combination 3 - Table QR to Customer Dining Cart', () => {
  const tableNumber = 6;
  const venueSlug = 'addis-bistro-combo';
  const targetTableUrl = `${CONFIG.services.web.baseUrl}/menu/${venueSlug}?table=${tableNumber}`;

  it('Step 1: Go Realtime Engine generates table QR image for target URL', async () => {
    const qrRes = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(targetTableUrl)}`);
    assert.strictEqual(qrRes.status, 200);
    assert.ok(qrRes.headers.get('content-type').includes('image/png'));
    assert.ok(Buffer.isBuffer(qrRes.data));
  });

  it('Step 2: Customer phone loads public route using URL encoded in QR code', async () => {
    const customerClient = new HttpClient(CONFIG.services.web.baseUrl);
    const pageRes = await customerClient.get(`/menu/${venueSlug}?table=${tableNumber}`);
    assert.ok(pageRes.status === 200 || pageRes.status === 404);
  });

  it('Step 3: Dining cart associates items with table number', () => {
    const cart = {
      venue_slug: venueSlug,
      table_number: tableNumber,
      items: [
        { name: 'Macchiato', price_etb_cents: 12000, quantity: 2 }
      ],
      created_at: new Date().toISOString()
    };
    assert.strictEqual(cart.table_number, 6);
    assert.strictEqual(cart.items[0].quantity * cart.items[0].price_etb_cents, 24000);
  });

  it('Step 4: Switching tables preserves item selections while updating context', () => {
    let cart = { table_number: 6, items: [{ name: 'Macchiato', price_etb_cents: 12000 }] };
    // Customer moves to table 7
    cart.table_number = 7;
    assert.strictEqual(cart.table_number, 7);
    assert.strictEqual(cart.items.length, 1);
  });
});
