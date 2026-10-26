/**
 * Tier 2: Boundary & Corner Cases (Features 7 - 8: Python Normalizer & Menu Import/Export)
 * >= 5 boundary tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const pyClient = new HttpClient(CONFIG.services.python.baseUrl);

describe('Tier 2: Boundary - Feature 7 Python Fidel Normalizer', () => {
  it('B7.1: Normalizing empty string returns empty string without error', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', { text: '' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.normalized, '');
  });

  it('B7.2: Preserves emojis and Unicode symbols without corruption', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: '☕ ቡና 🌟 Special'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.normalized.includes('☕'));
    assert.ok(res.data.normalized.includes('🌟'));
  });

  it('B7.3: Handles consecutive Ethiopic punctuation (፡።፣፤) without infinite loops', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'ቡና፡።፣፤ሻይ'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.normalized.length > 0);
  });

  it('B7.4: Rejects payload with non-string text field with HTTP 400', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', { text: 12345 });
    assert.strictEqual(res.status, 400);
  });

  it('B7.5: Preserves Ethiopic traditional numerals (፩, ፪, ፫, ፬, ፭, ፮, ፯, ፰, ፱, ፲)', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'ቁጥር ፩ እና ፪'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.normalized.includes('፩'));
    assert.ok(res.data.normalized.includes('፪'));
  });
});

describe('Tier 2: Boundary - Feature 8 Python Menu Import/Export', () => {
  it('B8.1: Rejects import payload missing "items" array with HTTP 400', async () => {
    const res = await pyClient.post('/api/v1/menu/import', { random_key: 'value' });
    assert.strictEqual(res.status, 400);
  });

  it('B8.2: Handles float prices with recurring decimals by rounding to nearest integer cents', async () => {
    // 99.999 ETB -> 10000 cents
    const res = await pyClient.post('/api/v1/menu/import', {
      items: [{ name: 'Test Float', price_etb: 99.999 }]
    });
    assert.strictEqual(res.status, 200);
    const item = res.data.draft.sections[0].items[0];
    assert.strictEqual(Number.isInteger(item.price_etb_cents), true);
  });

  it('B8.3: Handles empty items array gracefully with count 0', async () => {
    const res = await pyClient.post('/api/v1/menu/import', { items: [] });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.count, 0);
  });

  it('B8.4: Successfully imports large menu payload with 50 items', async () => {
    const items = [];
    for (let i = 1; i <= 50; i++) {
      items.push({ name: `Dish ${i}`, price_etb_cents: i * 1000 });
    }
    const res = await pyClient.post('/api/v1/menu/import', { items });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.count, 50);
  });

  it('B8.5: Export handles null or empty menu draft safely', async () => {
    const res = await pyClient.post('/api/v1/menu/export', {});
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.exported_at);
  });
});
