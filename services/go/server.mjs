#!/usr/bin/env node
/**
 * Realtime QR & WebSocket Service (Runtime Engine)
 * Port: 8080 (configurable via GO_PORT)
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { parse as parseUrl } from 'node:url';
import QRCode from 'qrcode';

const PORT = parseInt(process.env.GO_PORT || '8080', 10);
const HOST = process.env.GO_HOST || '127.0.0.1';

// Standard 1x1 valid PNG image buffer
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

const wsClients = new Set();

function sendWsTextFrame(socket, text) {
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

const server = http.createServer((req, res) => {
  const parsed = parseUrl(req.url, true);

  if (parsed.pathname === '/healthz' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'go-realtime-engine' }));
    return;
  }

  if (parsed.pathname === '/api/v1/qr' && (req.method === 'GET' || req.method === 'HEAD')) {
    const targetUrl = parsed.query.url;
    if (!targetUrl || targetUrl.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required "url" parameter' }));
      return;
    }

    QRCode.toBuffer(targetUrl, { width: 256, margin: 2, errorCorrectionLevel: 'M' })
      .then(pngBuffer => {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': pngBuffer.length,
          'Access-Control-Allow-Origin': '*',
          'X-Generated-For': encodeURIComponent(targetUrl),
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(pngBuffer);
        }
      })
      .catch(err => {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': VALID_PNG_BUFFER.length,
          'Access-Control-Allow-Origin': '*',
          'X-Fallback': 'true',
        });
        res.end(VALID_PNG_BUFFER);
      });
    return;
  }

  if (parsed.pathname === '/api/v1/broadcast' && req.method === 'POST') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      for (const client of wsClients) {
        sendWsTextFrame(client, raw);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, delivered: wsClients.size }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.on('upgrade', (req, socket, head) => {
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

    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                 'Upgrade: websocket\r\n' +
                 'Connection: Upgrade\r\n' +
                 `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);

    wsClients.add(socket);

    const welcome = JSON.stringify({
      event: 'connected',
      venue_id: venueId,
      room,
      table_id: parseInt(tableId, 10),
      timestamp: new Date().toISOString()
    });
    sendWsTextFrame(socket, welcome);

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
          wsClients.delete(socket);
        }
      }
    });

    socket.on('end', () => {
      wsClients.delete(socket);
      socket.destroy();
    });
    socket.on('close', () => wsClients.delete(socket));
    socket.on('error', () => wsClients.delete(socket));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Realtime Engine listening on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
