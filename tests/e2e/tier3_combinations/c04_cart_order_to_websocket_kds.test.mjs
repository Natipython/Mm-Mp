/**
 * Tier 3: Cross-Feature Combinations
 * Combination 4: Dining Cart Submission -> Order Placement -> Real-time Kitchen WebSocket Broadcast
 * Validates SvelteKit customer order submission, ETB bill calculation, and Go WebSocket notification
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import { DiningWebSocketClient } from '../helpers/ws-helper.mjs';

const webClient = new HttpClient(CONFIG.services.web.baseUrl);

describe('Tier 3: Combination 4 - Cart Order to Kitchen WebSocket Notification', () => {
  const venueSlug = 'combo-kitchen-venue';
  let wsClient = null;

  it('Step 1: Kitchen Display System (KDS) connects to Go WebSocket room "kitchen"', async () => {
    wsClient = new DiningWebSocketClient(venueSlug, 'kitchen');
    await wsClient.connect();
    assert.strictEqual(wsClient.isOpen, true);
  });

  it('Step 2: Customer places dining order with items and table context', async () => {
    const orderPromise = wsClient.waitForMessage(m => m.event === 'new_order', 4000);

    const orderPayload = {
      venue_slug: venueSlug,
      table: 3,
      items: [
        { name: 'Special Shekla Tibs', price_etb_cents: 68000, quantity: 1 },
        { name: 'Classic Addis Macchiato', price_etb_cents: 12000, quantity: 2 }
      ]
    };

    const orderRes = await webClient.post('/api/dining/order', orderPayload);
    assert.strictEqual(orderRes.status, 201);
    assert.strictEqual(orderRes.data.total_etb_cents, 92000, '68000 + (12000 * 2) must equal 92000 cents');

    // Step 3: Kitchen WebSocket client immediately receives new_order notification
    const wsEvent = await orderPromise;
    assert.strictEqual(wsEvent.event, 'new_order');
    assert.strictEqual(wsEvent.table, 3);
    assert.strictEqual(wsEvent.total_etb_cents, 92000);

    wsClient.close();
  });
});
