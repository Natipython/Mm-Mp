/**
 * High-Fidelity Simulation Server for Mm-Mp E2E Test Suite
 * Faithfully implements Interface Contracts from PROJECT.md
 * Used when running tests in simulation/self-test mode or validating test assertions.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { parse as parseUrl } from 'node:url';
import { createServer } from 'node:net';
import { deriveGuestCapability, hashCapability } from './crypto-helper.mjs';

// Minimal 1x1 PNG image buffer with valid PNG magic header
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

// Amharic Fidel Normalizer rules (homophone mapping)
const FIDEL_HOMOPHONES = {
  'ሐ': 'ሀ', 'ኀ': 'ሀ', 'ሗ': 'ኋ',
  'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ',
  'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
  'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ',
};

export function normalizeAmharicText(input) {
  if (!input || typeof input !== 'string') return '';
  let out = '';
  for (const char of input) {
    if (FIDEL_HOMOPHONES[char]) {
      out += FIDEL_HOMOPHONES[char];
    } else if (char === '፡') {
      out += ' ';
    } else if (char === '፣') {
      out += ',';
    } else if (char === '፤') {
      out += ';';
    } else if (char === '።') {
      out += '.';
    } else {
      out += char;
    }
  }
  return out.trim();
}

export class SimulationHarness {
  constructor() {
    this.goServer = null;
    this.pythonServer = null;
    this.webServer = null;
    this.registeredMerchants = new Map();
    this.sessions = new Map();
    this.venueDrafts = new Map();
    this.publishedVenues = new Map();
    this.wsClients = new Set();
  }

  async start(goPort = 8080, pythonPort = 5001, webPort = 5173) {
    await this._startGoService(goPort);
    await this._startPythonService(pythonPort);
    await this._startWebService(webPort);
  }

  async stop() {
    for (const ws of this.wsClients) {
      try { ws.destroy(); } catch (_) {}
    }
    const closeServer = (srv) => new Promise((resolve) => srv ? srv.close(() => resolve()) : resolve());
    await Promise.all([
      closeServer(this.goServer),
      closeServer(this.pythonServer),
      closeServer(this.webServer),
    ]);
  }

  // Go Realtime Engine simulation (Port 8080)
  async _startGoService(port) {
    this.goServer = http.createServer((req, res) => {
      const parsed = parseUrl(req.url, true);

      if (parsed.pathname === '/healthz' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'go-realtime-engine' }));
        return;
      }

      if (parsed.pathname === '/api/v1/qr' && req.method === 'GET') {
        const targetUrl = parsed.query.url;
        if (!targetUrl || targetUrl.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required "url" parameter' }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': VALID_PNG_BUFFER.length,
          'X-Generated-For': encodeURIComponent(targetUrl),
        });
        res.end(VALID_PNG_BUFFER);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    // Handle WebSocket upgrade for /ws/dining
    this.goServer.on('upgrade', (req, socket, head) => {
      const parsed = parseUrl(req.url, true);
      if (parsed.pathname === '/ws/dining') {
        const venueId = parsed.query.venue_id;
        const room = parsed.query.room || 'kitchen';
        const tableId = parsed.query.table_id || '1';

        if (!venueId) {
          socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
          socket.destroy();
          return;
        }

        // Complete minimal WebSocket handshake
        const key = req.headers['sec-websocket-key'];
        const accept = crypto.createHash('sha1')
          .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');

        socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                     'Upgrade: websocket\r\n' +
                     'Connection: Upgrade\r\n' +
                     `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);

        this.wsClients.add(socket);

        // Send welcome / connected frame (text frame)
        const welcome = JSON.stringify({
          event: 'connected',
          venue_id: venueId,
          room,
          table_id: parseInt(tableId, 10),
          timestamp: new Date().toISOString()
        });
        this._sendWsTextFrame(socket, welcome);

        socket.on('data', (chunk) => {
          if (chunk.length > 0) {
            let isClose = (chunk[0] & 0x0f) === 0x08;
            if (!isClose) {
              for (let i = 0; i < chunk.length; i++) {
                if (chunk[i] === 0x88) {
                  isClose = true;
                  break;
                }
              }
            }
            if (isClose) {
              try {
                socket.write(Buffer.from([0x88, 0x00]));
                socket.destroy();
              } catch (_) {}
              this.wsClients.delete(socket);
            }
          }
        });
        socket.on('end', () => {
          this.wsClients.delete(socket);
          socket.destroy();
        });
        socket.on('close', () => this.wsClients.delete(socket));
        socket.on('error', () => this.wsClients.delete(socket));
      } else {
        socket.destroy();
      }
    });

    return new Promise((resolve, reject) => {
      this.goServer.listen(port, '127.0.0.1', () => resolve());
      this.goServer.on('error', reject);
    });
  }

  _sendWsTextFrame(socket, text) {
    const payload = Buffer.from(text, 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x81, len]);
    } else if (len <= 65535) {
      header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      socket.write(Buffer.concat([header, payload]));
    } catch (_) {}
  }

  // Python Utility Service simulation (Port 5001)
  async _startPythonService(port) {
    this.pythonServer = http.createServer(async (req, res) => {
      const parsed = parseUrl(req.url, true);

      if (parsed.pathname === '/healthz' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'python-utility-service' }));
        return;
      }

      if (parsed.pathname === '/api/v1/normalize-amharic' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        if (!body || typeof body.text !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Field "text" must be a string' }));
          return;
        }
        const normalized = normalizeAmharicText(body.text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ original: body.text, normalized }));
        return;
      }

      if (parsed.pathname === '/api/v1/menu/import' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        if (!body || !body.items || !Array.isArray(body.items)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid menu import payload. Expected "items" array.' }));
          return;
        }
        const normalizedItems = body.items.map(item => ({
          name_en: item.name_en || item.name || '',
          name_am: normalizeAmharicText(item.name_am || ''),
          price_etb_cents: item.price_etb_cents || Math.round((item.price_etb || 0) * 100),
          category: item.category || 'General',
          modifiers: item.modifiers || [],
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: normalizedItems.length, draft: { sections: [{ title: 'Imported Section', items: normalizedItems }] } }));
        return;
      }

      if (parsed.pathname === '/api/v1/menu/export' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="menu_export.json"'
        });
        res.end(JSON.stringify({ exported_at: new Date().toISOString(), menu: body }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    return new Promise((resolve, reject) => {
      this.pythonServer.listen(port, '127.0.0.1', () => resolve());
      this.pythonServer.on('error', reject);
    });
  }

  // Web PWA simulation (Port 5173)
  async _startWebService(port) {
    this.webServer = http.createServer(async (req, res) => {
      const parsed = parseUrl(req.url, true);

      // Public Landing Page
      if (parsed.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Luxury-Theme': 'obsidian-copper-cream',
        });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mm-Mp Commercial Digital Menu & QR Payment Service</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700&display=swap">
  <style>
    :root {
      --color-base: #0E1015;
      --color-card: #151821;
      --color-accent: #C87D55;
      --color-accent-hover: #B5653C;
      --color-cream: #F5F3EF;
      --color-muted: #9E988D;
      font-family: 'Noto Sans Ethiopic', sans-serif;
    }
    body { background-color: var(--color-base); color: var(--color-cream); margin: 0; padding: 2rem; }
    .hero-badge { color: var(--color-accent); font-weight: bold; }
    .telebirr-placard { background: #151821; border: 1px solid #C87D55; color: #F5F3EF; padding: 1rem; }
    .cbe-birr-placard { background: #151821; border: 1px solid #C87D55; color: #F5F3EF; padding: 1rem; }
  </style>
</head>
<body>
  <div class="hero-badge">MM-MP ZERO COMMISSION</div>
  <h1>Digital Menu, QR Ordering & Telebirr/CBE Birr Placards</h1>
  <div class="telebirr-placard">Telebirr Merchant Payment: 0% Commission</div>
  <div class="cbe-birr-placard">CBE Birr QR Payment: 0% Commission</div>
</body>
</html>`);
        return;
      }

      // Merchant Registration
      if (parsed.pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        if (!body.email || !body.password || !body.business_name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing email, password, or business_name' }));
          return;
        }
        if (!body.email.includes('@') || !body.email.includes('.')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email format' }));
          return;
        }
        if (this.registeredMerchants.has(body.email)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Merchant email already exists' }));
          return;
        }

        const merchantId = `mch_${Date.now()}`;
        const venueSlug = body.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        this.registeredMerchants.set(body.email, {
          id: merchantId,
          email: body.email,
          password: body.password,
          businessName: body.business_name,
          venueSlug,
        });

        this.sessions.set(sessionId, {
          merchantId,
          email: body.email,
          venueSlug,
        });

        res.writeHead(201, {
          'Content-Type': 'application/json',
          'Set-Cookie': `menumini_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
        });
        res.end(JSON.stringify({
          ok: true,
          merchant_id: merchantId,
          business_name: body.business_name,
          venue_slug: venueSlug,
        }));
        return;
      }

      // Merchant Login
      if (parsed.pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        const merchant = this.registeredMerchants.get(body.email);
        if (!merchant || merchant.password !== body.password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }

        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        this.sessions.set(sessionId, {
          merchantId: merchant.id,
          email: merchant.email,
          venueSlug: merchant.venueSlug,
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `menumini_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
        });
        res.end(JSON.stringify({ ok: true, venue_slug: merchant.venueSlug }));
        return;
      }

      // Check Session Helper
      const getSession = () => {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/menumini_session=([^;]+)/);
        if (!match) return null;
        return this.sessions.get(match[1]);
      };

      // Menu Studio Draft Save
      if (parsed.pathname === '/api/studio/draft' && req.method === 'POST') {
        const session = getSession();
        if (!session) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized: valid menumini_session cookie required' }));
          return;
        }

        const body = await this._readBodyJson(req);
        if (!body.sections || !Array.isArray(body.sections)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid draft format. "sections" required.' }));
          return;
        }

        this.venueDrafts.set(session.venueSlug, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, draft_saved: true, venue_slug: session.venueSlug }));
        return;
      }

      // Atomic Menu Publish
      if (parsed.pathname === '/api/studio/publish' && req.method === 'POST') {
        const session = getSession();
        if (!session) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized: valid menumini_session cookie required' }));
          return;
        }

        const draft = this.venueDrafts.get(session.venueSlug);
        if (!draft || !draft.sections || draft.sections.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot publish empty menu draft' }));
          return;
        }

        const publishedData = {
          venueSlug: session.venueSlug,
          publishedAt: new Date().toISOString(),
          menu: draft,
          placards: {
            telebirr: { merchant_number: '123456', title: 'Telebirr 0% Commission' },
            cbe_birr: { account_number: '100012345678', title: 'CBE Birr 0% Commission' },
          },
        };
        this.publishedVenues.set(session.venueSlug, publishedData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          published: true,
          public_url: `/menu/${session.venueSlug}`,
          route_active: true,
        }));
        return;
      }

      // Customer Public Dining View (/menu/[venueSlug])
      if (parsed.pathname.startsWith('/menu/')) {
        const slug = parsed.pathname.replace('/menu/', '').split('?')[0];
        const published = this.publishedVenues.get(slug);

        if (!published) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Venue route "${slug}" not found or not published` }));
          return;
        }

        const table = parsed.query.table || null;

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            venue_slug: slug,
            table: table ? parseInt(table, 10) : null,
            published_data: published,
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${slug} - Customer Menu</title>
  <style>
    body { background: #0E1015; color: #F5F3EF; font-family: 'Noto Sans Ethiopic', sans-serif; }
    .dish-card { background: #151821; border-left: 3px solid #C87D55; margin: 10px 0; padding: 10px; }
    .price { color: #C87D55; font-weight: bold; }
    .telebirr-panel { background: #151821; border: 1px solid #C87D55; color: #F5F3EF; }
    .cbe-birr-panel { background: #151821; border: 1px solid #C87D55; color: #F5F3EF; }
  </style>
</head>
<body>
  <h1>${slug}</h1>
  <div id="table-badge">${table ? 'Table ' + table : 'Takeout'}</div>
  <div class="telebirr-panel">telebirr 0% commission</div>
  <div class="cbe-birr-panel">CBE Birr 0% commission</div>
  <div id="catalog">${JSON.stringify(published.menu)}</div>
</body>
</html>`);
        return;
      }

      // Customer Order Submission with Capability Token
      if (parsed.pathname === '/api/dining/order' && req.method === 'POST') {
        const body = await this._readBodyJson(req);
        if (!body.venue_slug || !body.items || !Array.isArray(body.items)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid order. venue_slug and items required.' }));
          return;
        }

        // Validate guest capability token if provided
        if (body.capability_token) {
          const capValid = /^[A-Za-z0-9_-]{43}$/.test(body.capability_token);
          if (!capValid) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid guest capability token format' }));
            return;
          }
        }

        // Calculate total in ETB cents
        let totalCents = 0;
        for (const item of body.items) {
          totalCents += (item.price_etb_cents || 0) * (item.quantity || 1);
        }

        const orderId = `ord_${Date.now()}`;
        const orderEvent = {
          event: 'new_order',
          order_id: orderId,
          venue_slug: body.venue_slug,
          table: body.table || 1,
          total_etb_cents: totalCents,
          items: body.items,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to WebSocket clients
        for (const ws of this.wsClients) {
          this._sendWsTextFrame(ws, JSON.stringify(orderEvent));
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          order_id: orderId,
          total_etb_cents: totalCents,
          currency: 'ETB',
          status: 'RECEIVED'
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    return new Promise((resolve, reject) => {
      this.webServer.listen(port, '127.0.0.1', () => resolve());
      this.webServer.on('error', reject);
    });
  }

  _readBodyJson(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve({});
        }
      });
    });
  }
}

// Allow starting the simulation server directly via CLI
import path from 'node:path';
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const harness = new SimulationHarness();
  await harness.start();
  console.log('Simulation harness running on ports 8080 (Go), 5001 (Python), 5173 (Web)');
  process.on('SIGINT', async () => {
    await harness.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await harness.stop();
    process.exit(0);
  });
}


