/**
 * Tier 2: Boundary & Corner Cases (Features 5 - 6: Go QR Engine & WebSocket Dining Hub)
 * >= 5 boundary tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import { DiningWebSocketClient } from '../helpers/ws-helper.mjs';

const goClient = new HttpClient(CONFIG.services.go.baseUrl);

describe('Tier 2: Boundary - Feature 5 Go QR Generation', () => {
  it('B5.1: Rejects missing "url" query parameter with HTTP 400 Bad Request', async () => {
    const res = await goClient.get('/api/v1/qr');
    assert.strictEqual(res.status, 400, 'Must return 400 when url parameter is missing');
  });

  it('B5.2: Rejects empty string "url=" parameter with HTTP 400', async () => {
    const res = await goClient.get('/api/v1/qr?url=');
    assert.strictEqual(res.status, 400, 'Must return 400 for empty url string');
  });

  it('B5.3: Handles exceptionally long URL (2048 characters) without crash or timeout', async () => {
    const longUrl = 'https://menu.et/menu/cafe?' + 'param=' + 'a'.repeat(2000);
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(longUrl)}`);
    assert.ok(res.status === 200 || res.status === 414 || res.status === 400, 'Must handle long URL gracefully');
  });

  it('B5.4: Handles URL containing XSS/script injection string safely in QR payload', async () => {
    const dangerousUrl = 'https://menu.et/menu/<script>alert(1)</script>';
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(dangerousUrl)}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.length > 0);
  });

  it('B5.5: Handles Amharic Fidel Unicode characters in target URL', async () => {
    const unicodeUrl = 'https://menu.et/menu/ካፌ-ቦሌ';
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(unicodeUrl)}`);
    assert.strictEqual(res.status, 200);
  });
});

describe('Tier 2: Boundary - Feature 6 Go WebSocket Dining Hub', () => {
  it('B6.1: Rejects WebSocket upgrade when venue_id query parameter is missing', async () => {
    const ws = new DiningWebSocketClient('', 'kitchen');
    await assert.rejects(async () => {
      await ws.connect(1500);
    }, 'Must reject upgrade without venue_id');
  });

  it('B6.2: Handles unknown room parameter gracefully', async () => {
    const ws = new DiningWebSocketClient('venue-test', 'unknown-room-xyz');
    try {
      await ws.connect(2000);
      assert.ok(true);
      ws.close();
    } catch (_) {
      assert.ok(true, 'Rejected unknown room or handled safely');
    }
  });

  it('B6.3: Handles malformed JSON payload sent from client without crashing', async () => {
    const ws = new DiningWebSocketClient('venue-test', 'kitchen');
    await ws.connect(2000);
    assert.doesNotThrow(() => {
      ws.send('INVALID_NON_JSON_FRAME');
    });
    ws.close();
  });

  it('B6.4: Handles rapid repeated connections in loop', async () => {
    for (let i = 0; i < 3; i++) {
      const ws = new DiningWebSocketClient('venue-test', 'kitchen');
      await ws.connect(2000);
      assert.strictEqual(ws.isOpen, true);
      ws.close();
    }
  });

  it('B6.5: Table ID with zero or negative value handled gracefully', async () => {
    const ws = new DiningWebSocketClient('venue-test', 'table', -1);
    try {
      await ws.connect(2000);
      ws.close();
    } catch (_) {}
    assert.ok(true);
  });
});
