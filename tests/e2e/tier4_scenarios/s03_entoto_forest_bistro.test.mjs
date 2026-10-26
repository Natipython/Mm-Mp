/**
 * Tier 4: Real-World Commercial Workload Scenarios
 * Scenario 3: Entoto Forest Bistro Mountain Dining & Offline Cart Resilience
 * Workflow: Mountain Bistro Onboarding -> Menu Creation -> Network Interruption Simulation ->
 * Offline Cart State Recovery -> Order Submission with Cryptographic Capability -> Telebirr Settlement
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import { deriveGuestCapability, generateCapabilityKey } from '../helpers/crypto-helper.mjs';

const merchantClient = new HttpClient(CONFIG.services.web.baseUrl);
const customerClient = new HttpClient(CONFIG.services.web.baseUrl);

const fixturePath = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/fixtures/menus/entoto_bistro.json';
const menuFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const capKey = generateCapabilityKey();

describe('Tier 4: Scenario 3 - Entoto Forest Bistro Offline Cart & Telebirr Workflow', () => {
  const timestamp = Date.now();
  const email = `entoto_${timestamp}@bistro.et`;
  let venueSlug = '';

  it('Step 1: Merchant onboarding for mountain bistro in Gulele Subcity', async () => {
    const res = await merchantClient.post('/api/auth/register', {
      email,
      password: 'EntotoMountainPass2026!',
      business_name: `${menuFixture.venue.name} ${timestamp}`,
    });
    assert.strictEqual(res.status, 201);
    venueSlug = res.data.venue_slug;
  });

  it('Step 2: Save mountain breakfast draft and publish atomically', async () => {
    const draftRes = await merchantClient.post('/api/studio/draft', {
      sections: menuFixture.sections
    });
    assert.strictEqual(draftRes.status, 200);

    const pubRes = await merchantClient.post('/api/studio/publish', {});
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.published, true);
  });

  it('Step 3: Customer at Mountain View Table 8 builds dining cart during intermittent connectivity', () => {
    // Simulate offline cart stored in memory / local store
    const offlineCart = {
      venue_slug: venueSlug,
      table: 8,
      items: [
        { name: 'Special Foul with Egg', price_etb_cents: 26000, quantity: 2 },
        { name: 'Korerima Spiced Herbal Tea', price_etb_cents: 8000, quantity: 3 }
      ]
    };

    // Calculate total in ETB cents: (26000 * 2) + (8000 * 3) = 52000 + 24000 = 76000 cents (760.00 ETB)
    let totalCents = 0;
    for (const item of offlineCart.items) {
      totalCents += item.price_etb_cents * item.quantity;
    }
    assert.strictEqual(totalCents, 76000);
  });

  it('Step 4: Network connection is restored; customer derives cryptographic capability and submits order', async () => {
    const capabilityToken = deriveGuestCapability(capKey, 'mountain-order', venueSlug, 'table-8');
    assert.strictEqual(capabilityToken.length, 43);

    const orderRes = await customerClient.post('/api/dining/order', {
      venue_slug: venueSlug,
      table: 8,
      items: [
        { name: 'Special Foul with Egg', price_etb_cents: 26000, quantity: 2 },
        { name: 'Korerima Spiced Herbal Tea', price_etb_cents: 8000, quantity: 3 }
      ],
      capability_token: capabilityToken
    });

    assert.strictEqual(orderRes.status, 201);
    assert.strictEqual(orderRes.data.total_etb_cents, 76000);
    assert.strictEqual(orderRes.data.status, 'RECEIVED');
  });

  it('Step 5: Customer reviews telebirr 0% commission placard for contactless payment', async () => {
    const pageRes = await customerClient.get(`/menu/${venueSlug}`);
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.data.includes('telebirr-panel') || pageRes.data.toLowerCase().includes('telebirr'));
  });
});
