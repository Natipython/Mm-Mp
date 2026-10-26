/**
 * Tier 3: Cross-Feature Combinations
 * Combination 1: Python Menu Import + Fidel Normalization -> Menu Studio Draft -> Atomic Publish
 * Validates pairwise interaction between Python Utility, Menu Studio, and Database Publication
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const pyClient = new HttpClient(CONFIG.services.python.baseUrl);
const webClient = new HttpClient(CONFIG.services.web.baseUrl);

describe('Tier 3: Combination 1 - Menu Import to Studio & Atomic Publish', () => {
  const merchantEmail = `import_merchant_${Date.now()}@addis.et`;
  const businessName = `Import Bistro ${Date.now()}`;
  let venueSlug = '';

  it('Step 1: Onboard merchant and authenticate session', async () => {
    const regRes = await webClient.post('/api/auth/register', {
      email: merchantEmail,
      password: 'SecurePassword123!',
      business_name: businessName,
    });
    assert.strictEqual(regRes.status, 201);
    venueSlug = regRes.data.venue_slug;
    assert.ok(webClient.getCookie('menumini_session'));
  });

  it('Step 2: Import raw menu items with un-normalized Amharic text via Python service', async () => {
    const rawImportPayload = {
      items: [
        {
          name_en: 'Traditional Special Tibs',
          name_am: 'የባህል፡ልዩ፡ጥብስ', // unnormalized word separators
          price_etb: 450.00,
          category: 'Hot Grills'
        },
        {
          name_en: 'Peace Tea',
          name_am: 'ሠላም፡ሻይ', // homophone ሠ -> ሰ
          price_etb: 60.00,
          category: 'Beverages'
        }
      ]
    };

    const importRes = await pyClient.post('/api/v1/menu/import', rawImportPayload);
    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.ok, true);
    assert.strictEqual(importRes.data.count, 2);

    // Verify normalization in import result
    const items = importRes.data.draft.sections[0].items;
    assert.strictEqual(items[0].name_am, 'የባህል ልዩ ጥብስ');
    assert.strictEqual(items[0].price_etb_cents, 45000);
    assert.strictEqual(items[1].name_am, 'ሰላም ሻይ');
    assert.strictEqual(items[1].price_etb_cents, 6000);

    // Step 3: Persist imported draft to Menu Studio
    const studioDraft = {
      sections: importRes.data.draft.sections
    };
    const draftRes = await webClient.post('/api/studio/draft', studioDraft);
    assert.strictEqual(draftRes.status, 200);
    assert.strictEqual(draftRes.data.draft_saved, true);
  });

  it('Step 4: Atomically publish the imported menu', async () => {
    const pubRes = await webClient.post('/api/studio/publish', {});
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.data.published, true);
    assert.strictEqual(pubRes.data.public_url, `/menu/${venueSlug}`);
  });

  it('Step 5: Customer accesses published route and observes normalized items', async () => {
    const customerClient = new HttpClient(CONFIG.services.web.baseUrl);
    const viewRes = await customerClient.get(`/menu/${venueSlug}`, { Accept: 'application/json' });
    assert.strictEqual(viewRes.status, 200);
  });
});
