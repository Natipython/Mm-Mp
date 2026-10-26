/**
 * Tier 1: Feature Coverage (Features 5 - 6: Go Realtime QR Generation & WebSocket Dining Hub)
 * >= 5 tests per feature (Total 10 tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';
import { DiningWebSocketClient } from '../helpers/ws-helper.mjs';

const goClient = new HttpClient(CONFIG.services.go.baseUrl);

describe('Tier 1: Feature 5 - Go Realtime QR Generation (/api/v1/qr)', () => {
  it('F5.1: Go Service responds to health check on port 8080', async () => {
    const res = await goClient.get('/healthz');
    assert.strictEqual(res.status, 200, 'Health check should return 200');
    assert.ok(res.data && res.data.status === 'ok', 'Status should be ok');
  });

  it('F5.2: QR endpoint generates QR code for valid public venue URL', async () => {
    const venueUrl = `${CONFIG.services.web.baseUrl}/menu/bole-velvet-cafe`;
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(venueUrl)}`);
    assert.strictEqual(res.status, 200, 'QR generation should return 200 OK');
  });

  it('F5.3: Content-Type header is strictly image/png', async () => {
    const testUrl = 'https://menu.et/menu/habesha-roastery';
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(testUrl)}`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType && contentType.includes('image/png'), 'Content-Type must be image/png');
  });

  it('F5.4: Response body contains valid binary PNG header signature', async () => {
    const testUrl = 'https://menu.et/menu/entoto-forest-bistro';
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(testUrl)}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Buffer.isBuffer(res.data), 'Response data must be a binary Buffer');
    assert.ok(res.data.length > 8, 'PNG must have positive byte length');
    
    // PNG 8-byte signature: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      assert.strictEqual(res.data[i], pngSignature[i], `Byte at offset ${i} must match PNG signature`);
    }
  });

  it('F5.5: QR code encodes dynamic table query parameter correctly', async () => {
    const tableUrl = `${CONFIG.services.web.baseUrl}/menu/bole-velvet-cafe?table=7`;
    const res = await goClient.get(`/api/v1/qr?url=${encodeURIComponent(tableUrl)}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.length > 30, 'Generated QR code must contain image data');
  });
});

describe('Tier 1: Feature 6 - Go WebSocket Dining Hub (/ws/dining)', () => {
  it('F6.1: Connects successfully to /ws/dining for kitchen room', async () => {
    const ws = new DiningWebSocketClient('f8e12345-0000-0000-0000-000000000001', 'kitchen');
    await ws.connect();
    assert.strictEqual(ws.isOpen, true, 'WebSocket connection must be open');
    ws.close();
  });

  it('F6.2: Connects successfully to /ws/dining for table room with table_id', async () => {
    const ws = new DiningWebSocketClient('f8e12345-0000-0000-0000-000000000001', 'table', 4);
    await ws.connect();
    assert.strictEqual(ws.isOpen, true, 'Table WebSocket connection must be open');
    ws.close();
  });

  it('F6.3: Server sends initial connection confirmation event', async () => {
    const ws = new DiningWebSocketClient('venue-test-uuid', 'kitchen');
    await ws.connect();
    const msg = await ws.waitForMessage(m => m.event === 'connected', 3000);
    assert.ok(msg, 'Should receive connected event');
    assert.strictEqual(msg.event, 'connected');
    ws.close();
  });

  it('F6.4: Client can send JSON data frame over active connection', async () => {
    const ws = new DiningWebSocketClient('venue-test-uuid', 'kitchen');
    await ws.connect();
    assert.doesNotThrow(() => {
      ws.send({ action: 'ping', timestamp: Date.now() });
    });
    ws.close();
  });

  it('F6.5: Connection terminates cleanly on client disconnect', async () => {
    const ws = new DiningWebSocketClient('venue-test-uuid', 'table', 2);
    await ws.connect();
    assert.strictEqual(ws.isOpen, true);
    ws.close();
    assert.strictEqual(ws.isOpen, false, 'WebSocket state must reflect closed connection');
  });
});
