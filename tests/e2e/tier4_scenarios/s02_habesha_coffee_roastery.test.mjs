/**
 * Tier 4: Real-World Commercial Workload Scenarios
 * Scenario 2: Habesha Coffee & Roastery Bilingual Menu Import & CBE Birr Settlement
 * Workflow: Raw Amharic Menu Import -> Fidel Normalization -> Studio Verification ->
 * Atomic Publishing -> Customer Amharic Ordering -> CBE Birr Placard Settlement
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const merchantClient = new HttpClient(CONFIG.services.web.baseUrl);
const pyClient = new HttpClient(CONFIG.services.python.baseUrl);
const customerClient = new HttpClient(CONFIG.services.web.baseUrl);

const fixturePath = '/run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/fixtures/menus/habesha_roastery.json';
const menuFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('Tier 4: Scenario 2 - Habesha Coffee & Roastery Bilingual & CBE Birr Flow', () => {
  const timestamp = Date.now();
  const email = `habesha_${timestamp}@roastery.et`;
  let venueSlug = '';

  it('Step 1: Merchant onboarding in Kirkos Subcity Addis Ababa', async () => {
    const res = await merchantClient.post('/api/auth/register', {
      email,
      password: 'HabeshaRoastery2026!',
      business_name: `${menuFixture.venue.name} ${timestamp}`,
    });
    assert.strictEqual(res.status, 201);
    venueSlug = res.data.venue_slug;
  });

  it('Step 2: Batch import traditional roast items with Amharic Fidel punctuation', async () => {
    const importPayload = {
      items: [
        {
          name_en: 'Sidama Natural Roast',
          name_am: 'የሲዳማ፡የተፈጥሮ፡ቆሎ፡ቡና', // unnormalized word separators
          price_etb_cents: 14000,
          category: 'Traditional'
        },
        {
          name_en: 'Spiced Chechebsa',
          name_am: 'ጨጨብሳ፡በንጹህ፡ቅቤ', // unnormalized
          price_etb_cents: 28000,
          category: 'Breakfast'
        }
      ]
    };

    const importRes = await pyClient.post('/api/v1/menu/import', importPayload);
    assert.strictEqual(importRes.status, 200);

    // Save normalized items into Menu Studio draft
    const draftRes = await merchantClient.post('/api/studio/draft', {
      sections: importRes.data.draft.sections
    });
    assert.strictEqual(draftRes.status, 200);
  });

  it('Step 3: Merchant publishes menu to active route', async () => {
    const pubRes = await merchantClient.post('/api/studio/publish', {});
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.published, true);
  });

  it('Step 4: Customer opens menu in Amharic and selects traditional breakfast items', async () => {
    const pageRes = await customerClient.get(`/menu/${venueSlug}`);
    assert.strictEqual(pageRes.status, 200);

    // Order 2x Sidama Roast (14000 cents each) + 1x Chechebsa (28000 cents) = 56000 cents (560.00 ETB)
    const orderRes = await customerClient.post('/api/dining/order', {
      venue_slug: venueSlug,
      table: 2,
      items: [
        { name: 'Sidama Natural Roast', price_etb_cents: 14000, quantity: 2 },
        { name: 'Spiced Chechebsa', price_etb_cents: 28000, quantity: 1 }
      ]
    });
    assert.strictEqual(orderRes.status, 201);
    assert.strictEqual(orderRes.data.total_etb_cents, 56000);
  });

  it('Step 5: Verifies CBE Birr 0% commission placard for bill payment', async () => {
    const pageRes = await customerClient.get(`/menu/${venueSlug}`);
    assert.strictEqual(pageRes.status, 200);
    assert.ok(pageRes.data.includes('cbe-birr-panel') || pageRes.data.toLowerCase().includes('cbe birr'));
  });
});
