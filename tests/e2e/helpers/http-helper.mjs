/**
 * HTTP Client Helper with Cookie Jar
 * Communicates with Web PWA (5173), Go QR engine (8080), Python service (5001)
 */
import { CONFIG } from '../config.mjs';

export class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookies = new Map();
  }

  setCookie(name, value) {
    this.cookies.set(name, value);
  }

  getCookie(name) {
    return this.cookies.get(name);
  }

  clearCookies() {
    this.cookies.clear();
  }

  _getCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  _parseSetCookie(headers) {
    // Collect set-cookie headers
    const setCookieHeaders = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean);
    for (const header of setCookieHeaders) {
      const parts = header.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        this.cookies.set(name, value);
      }
    }
  }

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});

    const cookieHeader = this._getCookieHeader();
    if (cookieHeader && !headers.has('Cookie')) {
      headers.set('Cookie', cookieHeader);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || CONFIG.timeouts.request);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      this._parseSetCookie(response.headers);

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (_) {
          data = null;
        }
      } else if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
        data = Buffer.from(await response.arrayBuffer());
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
      };
    } catch (err) {
      return {
        status: 0,
        ok: false,
        error: err.name === 'AbortError' ? 'Request timed out' : err.message,
        data: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async get(path, headers = {}) {
    return this.request(path, { method: 'GET', headers });
  }

  async post(path, body = null, headers = {}) {
    const opts = { method: 'POST', headers: { ...headers } };
    if (body !== null) {
      if (typeof body === 'object' && !(body instanceof Buffer)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      } else {
        opts.body = body;
      }
    }
    return this.request(path, opts);
  }
}

/**
 * Health check helper functions
 */
export async function checkGoServiceHealth() {
  const client = new HttpClient(CONFIG.services.go.baseUrl);
  const res = await client.get('/healthz');
  return {
    reachable: res.ok,
    status: res.status,
    data: res.data,
  };
}

export async function checkPythonServiceHealth() {
  const client = new HttpClient(CONFIG.services.python.baseUrl);
  const res = await client.get('/healthz');
  return {
    reachable: res.ok,
    status: res.status,
    data: res.data,
  };
}

export async function checkWebServiceHealth() {
  const client = new HttpClient(CONFIG.services.web.baseUrl);
  const res = await client.get('/');
  return {
    reachable: res.status > 0 && res.status < 500,
    status: res.status,
  };
}
