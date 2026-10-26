/**
 * Tier 1: Feature Coverage (Features 7 - 8: Python Utility Service - Normalizer & Import/Export)
 * >= 5 tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const pyClient = new HttpClient(CONFIG.services.python.baseUrl);

describe('Tier 1: Feature 7 - Python Fidel Text Normalizer (/api/v1/normalize-amharic)', () => {
  it('F7.1: Python service responds to health check on port 5001', async () => {
    const res = await pyClient.get('/healthz');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data && res.data.status === 'ok');
  });

  it('F7.2: Normalizes Fidel homophone series (ሐ/ኀ -> ሀ, ሠ -> ሰ, ዐ -> አ, ፀ -> ጸ)', async () => {
    // Test sample: "ሐመር" -> "ሀመር", "ሠላም" -> "ሰላም", "ዐይብ" -> "አይብ", "ፀሐይ" -> "ጸሀይ"
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'ሐመር ሠላም ዐይብ ፀሐይ'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.normalized, 'Should contain normalized field');
    assert.strictEqual(res.data.normalized, 'ሀመር ሰላም አይብ ጸሀይ');
  });

  it('F7.3: Normalizes traditional Ethiopic word separator (፡) to standard space', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'ልዩ፡የበሬ፡ጥብስ'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.normalized, 'ልዩ የበሬ ጥብስ');
  });

  it('F7.4: Normalizes Ethiopic punctuation (፣, ፤, ።)', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'ቡና፣ ሻይ፤ ማኪያቶ።'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.normalized, 'ቡና, ሻይ; ማኪያቶ.');
  });

  it('F7.5: Correctly preserves mixed bilingual Amharic and English text', async () => {
    const res = await pyClient.post('/api/v1/normalize-amharic', {
      text: 'Special ማኪያቶ with 200 ETB'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.normalized, 'Special ማኪያቶ with 200 ETB');
  });
});

describe('Tier 1: Feature 8 - Python Menu Import/Export (/api/v1/menu/import & export)', () => {
  it('F8.1: Imports JSON menu payload and returns draft sections', async () => {
    const payload = {
      items: [
        { name_en: 'Espresso', name_am: 'ኤስፕሬሶ', price_etb_cents: 8000, category: 'Hot Coffee' }
      ]
    };
    const res = await pyClient.post('/api/v1/menu/import', payload);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.ok, true);
    assert.strictEqual(res.data.count, 1);
    assert.ok(Array.isArray(res.data.draft.sections));
  });

  it('F8.2: Preserves integer ETB cents arithmetic across import', async () => {
    const payload = {
      items: [
        { name_en: 'Prime Shekla Tibs', price_etb: 650.50, category: 'Main' }
      ]
    };
    const res = await pyClient.post('/api/v1/menu/import', payload);
    assert.strictEqual(res.status, 200);
    const item = res.data.draft.sections[0].items[0];
    assert.strictEqual(item.price_etb_cents, 65050, '650.50 ETB must convert to 65050 cents');
  });

  it('F8.3: Automatically normalizes Amharic dish names during import', async () => {
    const payload = {
      items: [
        { name_en: 'Peace Tea', name_am: 'ሠላም፡ሻይ', price_etb_cents: 5000 }
      ]
    };
    const res = await pyClient.post('/api/v1/menu/import', payload);
    assert.strictEqual(res.status, 200);
    const item = res.data.draft.sections[0].items[0];
    assert.strictEqual(item.name_am, 'ሰላም ሻይ', 'Amharic text must be normalized in imported item');
  });

  it('F8.4: Exports menu draft to structured JSON with export metadata', async () => {
    const draft = {
      venue_slug: 'bole-velvet-cafe',
      sections: [{ title: 'Specialties', items: [{ name: 'Macchiato', price_cents: 12000 }] }]
    };
    const res = await pyClient.post('/api/v1/menu/export', draft);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.exported_at, 'Export must include exported_at timestamp');
    assert.strictEqual(res.data.menu.venue_slug, 'bole-velvet-cafe');
  });

  it('F8.5: Export sets proper Content-Disposition attachment header', async () => {
    const draft = { test: true };
    const res = await pyClient.post('/api/v1/menu/export', draft);
    assert.strictEqual(res.status, 200);
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition && disposition.includes('attachment'), 'Must include attachment header');
  });
});
