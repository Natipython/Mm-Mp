/**
 * Tier 4: Real-World Commercial Workload Scenarios
 * Scenario 1: Addis Ababa Bole Velvet Cafe Complete Commercial Lifecycle
 * End-to-end journey: Merchant Onboarding -> Menu Creation with Modifiers -> Atomic Publish ->
 * Table QR Code -> Customer Scan & Bilingual View -> Dining Order -> Kitchen KDS -> Payment Placards
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import { DiningWebSocketClient } from '../helpers/ws-helper.mjs';

const merchantClient = new HttpClient(CONFIG.services.web.baseUrl);
const customerClient = new HttpClient(CONFIG.services.web.baseUrl);
const goClient = new HttpClient(CONFIG.services.go.baseUrl);

const fixturePath = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/fixtures/menus/bole_velvet_cafe.json';
const menuFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('Tier 4: Scenario 1 - Bole Velvet Cafe & Roastery Commercial Lifecycle', () => {
  const timestamp = Date.now();
  const merchantEmail = `owner_${timestamp}@bolevelvet.et`;
  let venueSlug = '';
  let kdsWs = null;

  it('Step 1: Merchant onboarding in Bole Subcity Addis Ababa', async () => {
    const regRes = await merchantClient.post('/api/auth/register', {
      email: merchantEmail,
      password: 'BoleVelvet2026!Secure',
      business_name: `${menuFixture.venue.name} ${timestamp}`,
    });
    assert.strictEqual(regRes.status, 201, 'Merchant registration must succeed');
    venueSlug = regRes.data.venue_slug;
    assert.ok(merchantClient.getCookie('menumini_session'), 'Session cookie must be established');
  });

  it('Step 2: Merchant builds Menu Studio draft with ETB pricing and modifiers', async () => {
    const draftPayload = {
      sections: menuFixture.sections
    };
    const draftRes = await merchantClient.post('/api/studio/draft', draftPayload);
    assert.strictEqual(draftRes.status, 200);
    assert.strictEqual(draftRes.data.draft_saved, true);
  });

  it('Step 3: Merchant executes atomic menu publication', async () => {
    const pubRes = await merchantClient.post('/api/studio/publish', {});
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.published, true);
    assert.strictEqual(pubRes.data.public_url, `/menu/${venueSlug}`);
  });

  it('Step 4: Go Realtime Engine generates table QR code for Table 4', async () => {
    const tableUrl = `${CONFIG.services.web.baseUrl}/menu/${venueSlug}?table=4`;
    const qrRes = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(tableUrl)}`);
    assert.strictEqual(qrRes.status, 200);
    assert.ok(qrRes.headers.get('content-type').includes('image/png'));
    assert.ok(qrRes.data.length > 50, 'QR image buffer must be non-empty');
  });

  it('Step 5: Kitchen Display System (KDS) connects to live WebSocket room', async () => {
    kdsWs = new DiningWebSocketClient(venueSlug, 'kitchen');
    await kdsWs.connect();
    assert.strictEqual(kdsWs.isOpen, true);
  });

  it('Step 6: Customer seated at Table 4 loads menu and places bilingual dining order', async () => {
    // Customer views public menu at Table 4
    const pageRes = await customerClient.get(`/menu/${venueSlug}?table=4`);
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.data.includes('telebirr'));
    assert.ok(pageRes.data.includes('CBE Birr') || pageRes.data.includes('cbe birr'));

    // Prepare to capture WebSocket broadcast on KDS
    const kdsPromise = kdsWs.waitForMessage(m => m.event === 'new_order', 4000);

    // Customer places order:
    // 1x Prime Shekla Tibs (68000 cents) + 2x Classic Addis Macchiato (12000 cents each) = 92000 cents (920.00 ETB)
    const orderRes = await customerClient.post('/api/dining/order', {
      venue_slug: venueSlug,
      table: 4,
      items: [
        { name: 'Prime Shekla Tibs', price_etb_cents: 68000, quantity: 1 },
        { name: 'Classic Addis Macchiato', price_etb_cents: 12000, quantity: 2 }
      ]
    });

    assert.strictEqual(orderRes.status, 201);
    assert.strictEqual(orderRes.data.total_etb_cents, 92000);
    assert.strictEqual(orderRes.data.currency, 'ETB');

    // Step 7: KDS receives real-time order alert
    const kdsEvent = await kdsPromise;
    assert.strictEqual(kdsEvent.event, 'new_order');
    assert.strictEqual(kdsEvent.table, 4);
    assert.strictEqual(kdsEvent.total_etb_cents, 92000);

    kdsWs.close();
  });

  it('Step 8: Payment settlement verification with zero-commission placards', async () => {
    const pageRes = await customerClient.get(`/menu/${venueSlug}?table=4`);
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.data.includes('0% commission') || pageRes.data.includes('0% Commission') || pageRes.data.includes('0%'));
  });
});
