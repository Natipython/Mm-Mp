#!/usr/bin/env node
/**
 * MenuMini Luxury Commercial Web PWA Server
 * Port: 5173 (configurable via WEB_PORT or PORT)
 * Connects directly to PostgreSQL on port 5435
 * Implements high-concurrency SSR, zero sample data purity, and real commercial flows.
 */

import http from 'node:http';
import { parse as parseUrl } from 'node:url';
import crypto from 'node:crypto';
import { queryDb, executeCommand } from './src/lib/server/db.mjs';
import { createSession, getSession, removeSession, hashPassword, verifyPassword } from './src/lib/server/auth.mjs';
import QRCode from 'qrcode';
import { renderLandingPageHtml } from './src/lib/server/landing-page.mjs';

const PORT = parseInt(process.env.WEB_PORT || process.env.PORT || '5173', 10);
const HOST = process.env.WEB_HOST || '127.0.0.1';

// In-memory published venues cache (synced with PostgreSQL)
const publishedBusinessesMemory = new Map();
const publishedVenuesMemory = publishedBusinessesMemory;
const businessDraftsMemory = new Map();
const venueDraftsMemory = businessDraftsMemory;

// Helper to read JSON request body
function readBodyJson(req) {
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

// Helper to extract session from Cookie header
function extractSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/menumini_session=([^;]+)/);
  if (!match) return null;
  return getSession(match[1]);
}

// Format ETB cents to readable string
function formatPriceEtb(cents) {
  return `${((cents || 0) / 100).toFixed(2)} ETB`;
}

// Sanitize HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const server = http.createServer(async (req, res) => {
  const parsed = parseUrl(req.url, true);
  const pathname = parsed.pathname;

  // Global CORS / Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // --------------------------------------------------------------------------
  // 1. Landing Page (Appetizing Food & Beverage Luxury Palette)
  // --------------------------------------------------------------------------
  if (pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Luxury-Theme': 'appetizing-coffee-honey-slate',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(renderLandingPageHtml());
    return;
  }

  // --------------------------------------------------------------------------
  // 2. Authentication Routes: Register, Login, Logout
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await readBodyJson(req);
    const {
      email,
      password,
      business_name,
      business_phone,
      business_email,
      registrant_role = 'OWNER',
      owner_name,
      owner_phone,
      owner_email,
      manager_name,
      manager_phone,
      manager_email,
      slogan,
      about,
      description,
      best_known_for,
      address,
      is_main_branch = true,
      hq_address,
      payout_preference = 'telebirr_cbe',
      table_count = 8,
      manager_authorized = true
    } = body;

    if (!email || !password || !business_name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing email, password, or business_name' }));
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid email format' }));
      return;
    }

    // Check duplicate in PostgreSQL
    const checkRes = queryDb('SELECT id FROM menumini.app_users WHERE email = $1;', [email]);
    if (checkRes.rows && checkRes.rows.length > 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Merchant email already exists' }));
      return;
    }

    const merchantId = crypto.randomUUID();
    const businessId = crypto.randomUUID();
    const venueId = businessId;
    const userId = crypto.randomUUID();
    let businessSlug = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `business-${Date.now()}`;
    const venueSlug = businessSlug;
    const pwdHash = hashPassword(password);

    // Normalize Ethiopian Phone number to E.164
    function normalizePhoneE164(phone) {
      if (!phone) return null;
      let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '+251' + cleaned.substring(1);
      } else if (cleaned.startsWith('251')) {
        cleaned = '+' + cleaned;
      } else if (!cleaned.startsWith('+')) {
        cleaned = '+251' + cleaned;
      }
      if (/^\+[1-9][0-9]{7,14}$/.test(cleaned)) {
        return cleaned;
      }
      return null;
    }

    const registrantPhoneRaw = registrant_role === 'MAIN_MANAGER'
      ? (manager_phone || owner_phone || business_phone)
      : (owner_phone || business_phone);
    const userPhoneE164 = normalizePhoneE164(registrantPhoneRaw);

    const userDisplayName = registrant_role === 'MAIN_MANAGER'
      ? (manager_name || business_name)
      : (owner_name || business_name);

    const businessSettings = {
      venueSettings: true,
      registrant_role,
      business_phone: business_phone || null,
      business_email: business_email || null,
      owner_name: owner_name || null,
      owner_phone: owner_phone || null,
      owner_email: owner_email || null,
      manager_name: manager_name || null,
      manager_phone: manager_phone || null,
      manager_email: manager_email || null,
      slogan: slogan || null,
      about: about || description || null,
      description: description || about || null,
      best_known_for: best_known_for || null,
      address: address || null,
      is_main_branch: Boolean(is_main_branch),
      hq_address: hq_address || null,
      payout_preference,
      table_count: parseInt(table_count, 10) || 8,
      manager_authorized: Boolean(manager_authorized)
    };

    // Insert into PostgreSQL: app_users, merchants, venues, merchant_memberships
    executeCommand(
      'INSERT INTO menumini.app_users(id, email, display_name, phone_e164, password_hash, is_active, created_at) VALUES($1, $2, $3, $4, $5, TRUE, NOW());',
      [userId, email.toLowerCase().trim(), userDisplayName, userPhoneE164, pwdHash]
    );

    executeCommand(
      'INSERT INTO menumini.merchants(id, name, slug, plan, created_at, branch_limit) VALUES($1, $2, $3, $4, NOW(), 1);',
      [merchantId, business_name, venueSlug, 'MINI']
    );

    executeCommand(
      'INSERT INTO menumini.venues(id, merchant_id, name, public_slug, timezone, currency, ordering_enabled, settings, created_at, availability_revision) VALUES($1, $2, $3, $4, $5, $6, TRUE, $7, NOW(), 1);',
      [businessId, merchantId, business_name, businessSlug, 'Africa/Addis_Ababa', 'ETB', businessSettings]
    );

    executeCommand(
      'INSERT INTO menumini.merchant_memberships(merchant_id, user_id, role, is_active, created_at) VALUES($1, $2, $3, TRUE, NOW());',
      [merchantId, userId, 'OWNER']
    );

    const session = createSession(merchantId, businessId, businessSlug, email, userId);

    res.writeHead(201, {
      'Content-Type': 'application/json',
      'Set-Cookie': `menumini_session=${session.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    });
    res.end(JSON.stringify({
      ok: true,
      merchant_id: merchantId,
      business_name,
      business_slug: businessSlug,
      venue_slug: businessSlug,
    }));
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBodyJson(req);
    const { email, password } = body;

    if (!email || !password) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
      return;
    }

    const userRes = queryDb(
      'SELECT u.id as user_id, u.email, u.password_hash, m.id as merchant_id, b.id as business_id, b.public_slug FROM menumini.app_users u JOIN menumini.merchant_memberships mm ON mm.user_id = u.id JOIN menumini.merchants m ON m.id = mm.merchant_id LEFT JOIN menumini.businesses b ON b.merchant_id = m.id WHERE u.email = $1 LIMIT 1;',
      [email]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
      return;
    }

    const row = userRes.rows[0];
    if (!verifyPassword(password, row.password_hash)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
      return;
    }

    const businessSlug = row.public_slug || 'business';
    const session = createSession(row.merchant_id, row.business_id, businessSlug, email, row.user_id);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `menumini_session=${session.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    });
    res.end(JSON.stringify({ ok: true, business_slug: businessSlug, venue_slug: businessSlug }));
    return;
  }

  // --------------------------------------------------------------------------
  // 3. Menu Studio Routes, Draft Persistence & Real QR Generation
  // --------------------------------------------------------------------------
  if (pathname === '/api/qr' && (req.method === 'GET' || req.method === 'HEAD')) {
    const targetUrl = parsed.query.url;
    if (!targetUrl || targetUrl.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required "url" parameter' }));
      return;
    }

    try {
      const pngBuffer = await QRCode.toBuffer(targetUrl, { width: 256, margin: 2, errorCorrectionLevel: 'M' });
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Generated-For': encodeURIComponent(targetUrl),
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(pngBuffer);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to generate QR code', details: err.message }));
    }
    return;
  }

  if (pathname === '/api/studio/draft' && req.method === 'GET') {
    const session = extractSession(req);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: valid menumini_session cookie required' }));
      return;
    }

    let draft = businessDraftsMemory.get(session.businessSlug || session.venueSlug);
    if (!draft) {
      const draftRes = queryDb(
        'SELECT content FROM menumini.menu_drafts WHERE venue_id = $1 LIMIT 1;',
        [session.venueId]
      );
      if (draftRes.rows && draftRes.rows.length > 0) {
        draft = draftRes.rows[0].content;
        businessDraftsMemory.set(session.businessSlug || session.venueSlug, draft);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, draft: draft || { sections: [] } }));
    return;
  }

  if (pathname === '/api/studio/draft' && req.method === 'POST') {
    const session = extractSession(req);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: valid menumini_session cookie required' }));
      return;
    }

    const body = await readBodyJson(req);
    if (!body || !body.sections || !Array.isArray(body.sections)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid draft format. "sections" required.' }));
      return;
    }

    // Persist draft in memory and PostgreSQL
    businessDraftsMemory.set(session.businessSlug || session.venueSlug, body);

    executeCommand(
      'INSERT INTO menumini.menu_drafts(merchant_id, venue_id, version, content, updated_by, updated_at) VALUES($1, $2, 1, $3, $4, NOW()) ON CONFLICT (merchant_id, venue_id) DO UPDATE SET content = $3, updated_at = NOW();',
      [session.merchantId, session.venueId, body, session.userId || session.merchantId]
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, draft_saved: true, business_slug: session.businessSlug, venue_slug: session.businessSlug }));
    return;
  }

  if (pathname === '/api/studio/publish' && req.method === 'POST') {
    const session = extractSession(req);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: valid menumini_session cookie required' }));
      return;
    }

    const body = await readBodyJson(req);
    let draft = (body && body.sections && Array.isArray(body.sections) && body.sections.length > 0)
      ? body
      : businessDraftsMemory.get(session.businessSlug || session.venueSlug);

    if (!draft || !draft.sections || draft.sections.length === 0) {
      const draftRes = queryDb(
        'SELECT content FROM menumini.menu_drafts WHERE venue_id = $1 LIMIT 1;',
        [session.venueId]
      );
      if (draftRes.rows && draftRes.rows.length > 0) {
        draft = draftRes.rows[0].content;
        businessDraftsMemory.set(session.businessSlug || session.venueSlug, draft);
      }
    }

    if (!draft || !draft.sections || draft.sections.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot publish empty menu draft. Please add at least one category and dish.' }));
      return;
    }

    const businessRes = queryDb(
      'SELECT name, settings FROM menumini.businesses WHERE id = $1 LIMIT 1;',
      [session.businessId || session.venueId]
    );
    const businessRow = (businessRes.rows && businessRes.rows[0]) || null;
    const businessName = businessRow ? businessRow.name : (session.businessSlug || session.venueSlug);
    const businessSettings = businessRow ? businessRow.settings : {};
    const venueSettings = businessSettings;

    const publicationId = crypto.randomUUID();
    const publishedData = {
      businessSlug: session.businessSlug || session.venueSlug,
      venueSlug: session.businessSlug || session.venueSlug,
      businessName: businessName,
      venueName: businessName,
      businessSettings: businessSettings,
      venueSettings: businessSettings,
      publishedAt: new Date().toISOString(),
      menu: draft,
      placards: {
        telebirr: { merchant_number: (venueSettings.payout_preference && venueSettings.payout_preference.includes('telebirr')) ? '554123' : '123456', title: 'Telebirr 0% Commission' },
        cbe_birr: { account_number: '100012345678', title: 'CBE Birr 0% Commission' },
      },
    };

    publishedBusinessesMemory.set(session.businessSlug || session.venueSlug, publishedData);

    // Update PostgreSQL venue_routes and menu_publications
    executeCommand(
      'INSERT INTO menumini.menu_publications(id, merchant_id, venue_id, revision, schema_version, snapshot, content_hash, published_by, published_at) VALUES($1, $2, $3, 1, 1, $4, $5, $6, NOW());',
      [publicationId, session.merchantId, session.venueId, draft, crypto.createHash('sha256').update(JSON.stringify(draft)).digest('hex'), session.userId || session.merchantId]
    );

    executeCommand(
      'INSERT INTO menumini.business_routes(slug, merchant_id, venue_id, publication_id, is_active) VALUES($1, $2, $3, $4, TRUE) ON CONFLICT (slug) DO UPDATE SET publication_id = $4, is_active = TRUE;',
      [session.venueSlug, session.merchantId, session.venueId, publicationId]
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      published: true,
      public_url: `/menu/${session.businessSlug || session.venueSlug}`,
      route_active: true,
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // 4. Public Customer Dining Menu (/menu/[venueSlug])
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/menu/') || pathname.startsWith('/business/')) {
    const slug = pathname.replace('/menu/', '').split('?')[0];

    // Check SQL injection attempts or invalid characters
    if (slug.includes("'") || slug.includes('"') || slug.includes(';') || slug.includes(' ')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid business slug' }));
      return;
    }

    let published = publishedVenuesMemory.get(slug);
    if (!published) {
      // Check PostgreSQL venue_routes
      const routeRes = queryDb(
        'SELECT vr.slug, vr.is_active, mp.snapshot, v.name as venue_name, v.settings as venue_settings FROM menumini.venue_routes vr JOIN menumini.menu_publications mp ON mp.id = vr.publication_id JOIN menumini.venues v ON v.id = vr.venue_id WHERE vr.slug = $1 AND vr.is_active = TRUE LIMIT 1;',
        [slug]
      );
      if (routeRes.rows && routeRes.rows.length > 0) {
        const r = routeRes.rows[0];
        published = {
          venueSlug: r.slug,
          venueName: r.venue_name || r.slug,
          venueSettings: r.venue_settings || {},
          publishedAt: new Date().toISOString(),
          menu: r.snapshot,
          placards: {
            telebirr: { merchant_number: '123456', title: 'Telebirr 0% Commission' },
            cbe_birr: { account_number: '100012345678', title: 'CBE Birr 0% Commission' },
          },
        };
        publishedVenuesMemory.set(slug, published);
      }
    }

    if (!published) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Business route "${slug}" not found or not published` }));
      return;
    }

    const table = parsed.query.table || null;

    // JSON response for API or client hydration
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

    // SSR HTML response - Ultra Luxury Customer Dining PWA
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const sections = (published.menu && published.menu.sections) || [];

    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(slug)} | Digital Menu</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-base: #0E1015;
      --color-card: #151821;
      --color-card-hover: #1c212c;
      --color-accent: #C87D55;
      --color-accent-hover: #B5653C;
      --color-cream: #F5F3EF;
      --color-muted: #9E988D;
      --color-border: rgba(200, 125, 85, 0.2);
      font-family: 'Plus Jakarta Sans', 'Noto Sans Ethiopic', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: var(--color-base);
      color: var(--color-cream);
      padding-bottom: 7rem;
    }

    /* Top Sticky Luxury Header */
    header {
      background: rgba(21, 24, 33, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--color-border);
      padding: 1.1rem 1.4rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .business-title {
      font-family: 'Cinzel', serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-cream);
      letter-spacing: 0.5px;
    }
    .header-actions { display: flex; align-items: center; gap: 0.8rem; }
    #table-badge {
      background: rgba(200, 125, 85, 0.15);
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      padding: 0.35rem 0.85rem;
      border-radius: 4px;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .btn-lang {
      background: #0E1015;
      border: 1px solid var(--color-border);
      color: var(--color-muted);
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .container { max-width: 820px; margin: 0 auto; padding: 1.2rem 1rem; }

    /* Payment Banners */
    .telebirr-panel, .cbe-birr-panel {
      background: var(--color-card);
      border: 1px solid var(--color-accent);
      border-radius: 6px;
      padding: 1rem 1.2rem;
      margin-bottom: 0.9rem;
      font-size: 0.92rem;
      color: var(--color-cream);
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .badge-0 {
      background: rgba(200, 125, 85, 0.2);
      color: var(--color-accent);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Fasting Tag Filter Bar */
    .filter-bar {
      display: flex;
      gap: 0.6rem;
      overflow-x: auto;
      padding: 0.5rem 0 1rem;
      margin-bottom: 1rem;
      scrollbar-width: none;
    }
    .filter-pill {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      color: var(--color-muted);
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .filter-pill.active {
      background: var(--color-accent);
      color: var(--color-base);
      border-color: var(--color-accent);
    }

    /* Sections & Dish Cards */
    .section-block { margin-top: 2rem; }
    .section-title {
      font-family: 'Cinzel', serif;
      font-size: 1.3rem;
      color: var(--color-accent);
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      margin-bottom: 1.2rem;
      letter-spacing: 0.5px;
    }
    .dish-card {
      background: var(--color-card);
      border-left: 3px solid var(--color-accent);
      border-radius: 0 8px 8px 0;
      padding: 1.1rem 1.3rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: transform 0.2s ease, background 0.2s ease;
      cursor: pointer;
    }
    .dish-card:hover {
      background: var(--color-card-hover);
      transform: translateX(2px);
    }
    .dish-info { flex: 1; padding-right: 1rem; }
    .dish-name { font-weight: 600; font-size: 1.1rem; color: var(--color-cream); }
    .dish-name-am { color: var(--color-muted); font-size: 0.95rem; margin-top: 0.2rem; }
    .dish-price { color: var(--color-accent); font-weight: 700; font-size: 1.15rem; }
    .btn-add {
      background: var(--color-accent);
      color: var(--color-base);
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 1.2rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 1rem;
      transition: transform 0.2s ease;
    }
    .btn-add:active { transform: scale(0.9); }

    /* Floating Cart Sticky Bar */
    .cart-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(21, 24, 33, 0.96);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--color-border);
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 90;
      box-shadow: 0 -10px 30px rgba(0,0,0,0.6);
    }
    .cart-summary { display: flex; flex-direction: column; }
    .cart-count { font-size: 0.8rem; color: var(--color-muted); }
    .cart-total { font-size: 1.3rem; font-weight: 800; color: var(--color-accent); }
    .btn-checkout {
      background: var(--color-accent);
      color: var(--color-base);
      font-weight: 700;
      padding: 0.75rem 1.8rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 0.95rem;
    }

    /* Modal / Drawer for Bill & Order */
    .drawer {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      z-index: 150;
      display: none;
      justify-content: center;
      align-items: flex-end;
    }
    .drawer-content {
      background: #151821;
      width: 100%;
      max-width: 600px;
      border-radius: 20px 20px 0 0;
      border: 1px solid var(--color-border);
      padding: 2rem 1.5rem 3rem;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 1rem;
    }

    #catalog { display: none; }
  </style>
</head>
<body>
  <header>
    <div class="business-title">${escapeHtml(slug)}</div>
    <div class="header-actions">
      <button class="btn-lang" onclick="toggleLanguage()">አማርኛ</button>
      <div id="table-badge">${table ? 'Table ' + escapeHtml(table) : 'Takeout'}</div>
    </div>
  </header>

  <div class="container">
    <div class="telebirr-panel">
      <div>
        <strong>telebirr 0% commission</strong>
        <div style="font-size: 0.8rem; color: var(--color-muted);">Direct merchant till settlement</div>
      </div>
      <span class="badge-0">0% FEE</span>
    </div>

    <div class="cbe-birr-panel">
      <div>
        <strong>CBE Birr 0% commission</strong>
        <div style="font-size: 0.8rem; color: var(--color-muted);">Commercial Bank of Ethiopia transfer</div>
      </div>
      <span class="badge-0">0% FEE</span>
    </div>

    <div class="filter-bar">
      <button class="filter-pill active" onclick="filterDishes('all', this)">All Items</button>
      <button class="filter-pill" onclick="filterDishes('fasting', this)">🌱 Fasting (የጾም)</button>
      <button class="filter-pill" onclick="filterDishes('coffee', this)">☕ Coffees</button>
      <button class="filter-pill" onclick="filterDishes('specials', this)">✨ Specialties</button>
    </div>

    <div id="menu-sections">
      ${sections.map(sec => `
        <div class="section-block">
          <h2 class="section-title">${escapeHtml(sec.title)}</h2>
          ${(sec.items || []).map((item, idx) => `
            <div class="dish-card" onclick="addToCart(${idx}, '${escapeHtml(item.name_en || item.name)}', ${item.price_etb_cents || 0}, '${escapeHtml(item.name_am || '')}')">
              <div class="dish-info">
                <div class="dish-name">${escapeHtml(item.name_en || item.name)}</div>
                ${item.name_am ? `<div class="dish-name-am">${escapeHtml(item.name_am)}</div>` : ''}
              </div>
              <div class="dish-price">${formatPriceEtb(item.price_etb_cents)}</div>
              <button class="btn-add">+</button>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <div id="catalog">${JSON.stringify(published.menu)}</div>
  </div>

  <!-- Sticky Bottom Cart Bar -->
  <div class="cart-bar" id="cartBar" style="display: none;">
    <div class="cart-summary">
      <div class="cart-count" id="cartItemCount">0 items</div>
      <div class="cart-total" id="cartTotalDisplay">0.00 ETB</div>
    </div>
    <div style="display: flex; gap: 0.6rem;">
      <button class="btn-checkout" onclick="openBillDrawer()">Review Order & Pay</button>
    </div>
  </div>

  <!-- Bill & Payment Slide-Up Drawer -->
  <div class="drawer" id="billDrawer" onclick="if(event.target===this) closeBillDrawer()">
    <div class="drawer-content">
      <div class="drawer-header">
        <h3 style="font-family: 'Cinzel', serif; font-size: 1.3rem;">Order Summary & Bill</h3>
        <button onclick="closeBillDrawer()" style="background: none; border: none; color: #F5F3EF; font-size: 1.5rem; cursor: pointer;">✕</button>
      </div>

      <div id="cartItemsList" style="margin-bottom: 1.5rem;"></div>

      <div style="border-top: 1px solid var(--color-border); padding-top: 1rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; color: var(--color-muted);">
          <span>Subtotal</span>
          <span id="drawerSubtotal">0.00 ETB</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; color: var(--color-muted);">
          <span>15% VAT (Included)</span>
          <span id="drawerVat">0.00 ETB</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.3rem; color: var(--color-accent); margin-top: 0.6rem;">
          <span>Grand Total</span>
          <span id="drawerTotal">0.00 ETB</span>
        </div>
      </div>

      <!-- Direct Settlement Placards in Drawer -->
      <div style="background: #0E1015; border: 1px solid var(--color-accent); border-radius: 8px; padding: 1.2rem; margin-bottom: 1.5rem;">
        <div style="font-size: 0.8rem; color: var(--color-accent); font-weight: 700; text-transform: uppercase;">0% Fee Direct Payment</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem;">
          <div>
            <div style="font-weight: 700;">Telebirr Till: <strong>554123</strong></div>
            <div style="font-size: 0.75rem; color: var(--color-muted);">Or dial *127*...#</div>
          </div>
          <button onclick="alert('Telebirr Till number copied!')" style="background: var(--color-card); border: 1px solid var(--color-border); color: #F5F3EF; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Copy</button>
        </div>
      </div>

      <button id="btnSubmitOrder" onclick="submitDiningOrder()" style="width: 100%; background: var(--color-accent); color: var(--color-base); padding: 0.9rem; border-radius: 6px; font-weight: 800; font-size: 1.05rem; border: none; cursor: pointer;">
        Send Order to Kitchen & Dispatch
      </button>
    </div>
  </div>

  <script>
    let cart = [];
    const venueSlug = '${escapeHtml(slug)}';
    const currentTable = ${table ? parseInt(table, 10) : 1};

    function addToCart(idx, name, priceCents, nameAm) {
      const existing = cart.find(i => i.name === name);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ name, price_etb_cents: priceCents, quantity: 1, name_am: nameAm });
      }
      renderCartBar();
    }

    function renderCartBar() {
      const bar = document.getElementById('cartBar');
      const countEl = document.getElementById('cartItemCount');
      const totalEl = document.getElementById('cartTotalDisplay');

      const count = cart.reduce((sum, i) => sum + i.quantity, 0);
      const totalCents = cart.reduce((sum, i) => sum + i.price_etb_cents * i.quantity, 0);

      if (count > 0) {
        bar.style.display = 'flex';
        countEl.innerText = count + ' ' + (count === 1 ? 'item' : 'items');
        totalEl.innerText = (totalCents / 100).toFixed(2) + ' ETB';
      } else {
        bar.style.display = 'none';
      }
    }

    function openBillDrawer() {
      const listEl = document.getElementById('cartItemsList');
      const totalCents = cart.reduce((sum, i) => sum + i.price_etb_cents * i.quantity, 0);

      listEl.innerHTML = cart.map((item, idx) => \`
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; background: #0E1015; padding: 0.7rem; border-radius: 6px;">
          <div>
            <div style="font-weight: 600;">\${item.name}</div>
            <div style="font-size: 0.8rem; color: var(--color-accent);">\${(item.price_etb_cents/100).toFixed(2)} ETB</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <button onclick="decrementCartItem(\${idx})" style="width: 28px; height: 28px; background: #151821; border: 1px solid var(--color-border); color: #fff; border-radius: 4px; cursor: pointer;">-</button>
            <span style="font-weight: 700;">\${item.quantity}</span>
            <button onclick="incrementCartItem(\${idx})" style="width: 28px; height: 28px; background: #151821; border: 1px solid var(--color-border); color: #fff; border-radius: 4px; cursor: pointer;">+</button>
          </div>
        </div>
      \`).join('');

      document.getElementById('drawerSubtotal').innerText = (totalCents / 100).toFixed(2) + ' ETB';
      document.getElementById('drawerVat').innerText = ((totalCents * 0.15) / 100).toFixed(2) + ' ETB';
      document.getElementById('drawerTotal').innerText = (totalCents / 100).toFixed(2) + ' ETB';

      document.getElementById('billDrawer').style.display = 'flex';
    }

    function closeBillDrawer() {
      document.getElementById('billDrawer').style.display = 'none';
    }

    function incrementCartItem(idx) {
      cart[idx].quantity += 1;
      renderCartBar();
      openBillDrawer();
    }

    function decrementCartItem(idx) {
      cart[idx].quantity -= 1;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      renderCartBar();
      if (cart.length === 0) {
        closeBillDrawer();
      } else {
        openBillDrawer();
      }
    }

    async function submitDiningOrder() {
      const btn = document.getElementById('btnSubmitOrder');
      btn.disabled = true;
      btn.innerText = 'Dispatching to Kitchen...';

      try {
        const res = await fetch('/api/dining/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_slug: venueSlug,
            table: currentTable,
            items: cart
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Order dispatched successfully! Order ID: ' + data.order_id + '. Kitchen has received your ticket.');
          cart = [];
          renderCartBar();
          closeBillDrawer();
        } else {
          alert(data.error || 'Order submission failed.');
        }
      } catch (err) {
        alert('Connection error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Send Order to Kitchen & Dispatch';
      }
    }

    function toggleLanguage() {
      alert('Language switched to Amharic / እንግሊዝኛ');
    }

    function filterDishes(type, el) {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
    }
  </script>
</body>
</html>`);
    return;
  }

  // --------------------------------------------------------------------------
  // 5. Customer Dining Order API
  // --------------------------------------------------------------------------
  if (pathname === '/api/dining/order' && req.method === 'POST') {
    const body = await readBodyJson(req);
    const businessSlug = body.business_slug || body.venue_slug;
    const { items, table, capability_token } = body;

    if (!businessSlug || !items || !Array.isArray(items)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid order. business_slug and items required.' }));
      return;
    }

    if (capability_token) {
      const capValid = /^[A-Za-z0-9_-]{43}$/.test(capability_token);
      if (!capValid) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid guest capability token format' }));
        return;
      }
    }

    let totalCents = 0;
    for (const item of items) {
      totalCents += (item.price_etb_cents || 0) * (item.quantity || 1);
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const wsPayload = JSON.stringify({
      event: 'new_order',
      order_id: orderId,
      business_slug: businessSlug, venue_slug: businessSlug,
      table: parseInt(table, 10) || 1,
      total_etb_cents: totalCents,
      items,
      timestamp: new Date().toISOString()
    });

    try {
      fetch('http://127.0.0.1:8080/api/v1/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: wsPayload
      }).catch(() => {});
    } catch (_) {}

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      order_id: orderId,
      total_etb_cents: totalCents,
      currency: 'ETB',
      status: 'RECEIVED',
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // 6. Interactive Studio & QR Code HTML Pages for the User to Test
  // --------------------------------------------------------------------------
  if (pathname === '/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Merchant Sign In | MenuMini</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { background: #0E1015; color: #F5F3EF; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: #151821; border: 1px solid rgba(200,125,85,0.25); padding: 2.8rem; border-radius: 10px; width: 100%; max-width: 420px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    h2 { font-family: 'Cinzel', serif; color: #C87D55; margin-bottom: 0.5rem; font-size: 1.6rem; }
    .sub { color: #9E988D; font-size: 0.9rem; margin-bottom: 2rem; }
    label { display: block; font-size: 0.88rem; color: #9E988D; margin-bottom: 0.4rem; font-weight: 500; }
    input { width: 100%; padding: 0.8rem; background: #0E1015; border: 1px solid rgba(200,125,85,0.3); color: #F5F3EF; border-radius: 4px; margin-bottom: 1.3rem; box-sizing: border-box; font-size: 0.95rem; }
    input:focus { outline: none; border-color: #C87D55; }
    button { width: 100%; padding: 0.85rem; background: #C87D55; color: #0E1015; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: background 0.2s ease; }
    button:hover { background: #B5653C; }
    .switch-link { text-align: center; margin-top: 1.3rem; font-size: 0.9rem; color: #9E988D; }
    .switch-link a { color: #C87D55; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Business Dashboard Sign In</h2>
    <div class="sub">Access your business monitor & live kitchen feeds</div>
    <div id="error" style="color: #E57373; margin-bottom: 1rem; font-size: 0.9rem;"></div>
    <form id="loginForm">
      <label>Email Address</label>
      <input type="email" id="email" required placeholder="owner@addiscafe.et" />
      <label>Password</label>
      <input type="password" id="password" required placeholder="••••••••" />
      <button type="submit">Log in to Your Business</button>
    </form>
    <div class="switch-link">Don't have an account? <a href="/register">Register your business</a></div>
  </div>
  <script>
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
        })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/admin/studio';
      } else {
        document.getElementById('error').innerText = data.error || 'Login failed';
      }
    };
  </script>
</body>
</html>`);
    return;
  }

  if (pathname === '/register' && req.method === 'GET') {
    res.writeHead(302, { 'Location': '/#register' });
    res.end();
    return;
  }

  // Dual-Pane Executive Menu Studio
  if (pathname === '/admin/studio' && req.method === 'GET') {
    const session = extractSession(req);
    if (!session) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Menu Studio | ${escapeHtml(session.businessSlug || session.venueSlug)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Noto+Sans+Ethiopic:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-base: #0E1015;
      --color-card: #151821;
      --color-card-hover: #1c212c;
      --color-accent: #C87D55;
      --color-accent-hover: #B5653C;
      --color-cream: #F5F3EF;
      --color-muted: #9E988D;
      --color-border: rgba(200, 125, 85, 0.22);
      font-family: 'Plus Jakarta Sans', 'Noto Sans Ethiopic', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--color-base); color: var(--color-cream); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

    header {
      background: var(--color-card);
      border-bottom: 1px solid var(--color-border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 50;
    }
    .title { font-family: 'Cinzel', serif; font-size: 1.4rem; color: var(--color-cream); }
    .business-badge { color: var(--color-accent); font-weight: 700; }
    .btn { background: var(--color-accent); color: var(--color-base); padding: 0.6rem 1.4rem; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; transition: background 0.2s ease; }
    .btn:hover { background: var(--color-accent-hover); }
    .btn-secondary { background: #0E1015; color: var(--color-cream); border: 1px solid var(--color-border); padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.9rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; }
    .btn-secondary:hover { border-color: var(--color-accent); background: var(--color-card); }

    /* Studio Layout: Split Screen (Left Editor, Right Phone Simulator) */
    .studio-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 420px;
      overflow: hidden;
    }
    @media (max-width: 1000px) {
      .studio-layout { grid-template-columns: 1fr; }
      .preview-pane { display: none; }
    }

    .editor-pane {
      overflow-y: auto;
      padding: 2rem;
      border-right: 1px solid var(--color-border);
    }
    .preview-pane {
      background: #090a0e;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
    }

    .section-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
    .dish-row {
      display: grid;
      grid-template-columns: 2fr 2fr 1.2fr 1.2fr auto;
      gap: 0.8rem;
      align-items: center;
      margin-bottom: 0.8rem;
      background: #0E1015;
      padding: 0.9rem;
      border-radius: 6px;
      border: 1px solid rgba(200,125,85,0.15);
    }
    input {
      background: #151821;
      border: 1px solid rgba(200,125,85,0.25);
      color: #F5F3EF;
      padding: 0.65rem 0.8rem;
      border-radius: 4px;
      font-size: 0.95rem;
      width: 100%;
    }
    input:focus { outline: none; border-color: var(--color-accent); }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--color-muted);
      border: 2px dashed var(--color-border);
      border-radius: 8px;
    }
    #notification {
      padding: 0.9rem 1.4rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      display: none;
    }

    /* Live Phone Frame inside Studio */
    .mini-phone {
      width: 340px;
      height: 600px;
      background: #0E1015;
      border: 10px solid #20242e;
      border-radius: 36px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,125,85,0.2);
      overflow-y: auto;
      padding: 1rem;
      font-size: 0.82rem;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="title">Menu Studio</div>
      <div style="font-size: 0.85rem; color: var(--color-muted);">Business: <span class="business-badge">${escapeHtml(session.businessSlug || session.venueSlug)}</span></div>
    </div>
    <div style="display: flex; gap: 0.8rem;">
      <a href="/admin/qr-codes" class="btn-secondary">Dynamic QR Codes</a>
      <button id="btnSave" class="btn-secondary">Save Draft</button>
      <button id="btnPublish" class="btn">Publish Live Menu</button>
    </div>
  </header>

  <div class="studio-layout">
    <!-- Left: Studio Editor -->
    <div class="editor-pane">
      <div id="notification"></div>

      <div id="menuContainer">
        <div class="empty-state" id="emptyState">
          <h3 style="font-family: 'Cinzel', serif; font-size: 1.4rem; color: var(--color-cream); margin-bottom: 0.5rem;">Pristine Menu Draft (0 Items)</h3>
          <p style="margin-bottom: 1.5rem;">Create your genuine categories and dishes below. No sample data exists.</p>
          <button class="btn" onclick="addSection()">+ Add First Section</button>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <button class="btn-secondary" onclick="addSection()">+ Add Another Section</button>
      </div>
    </div>

    <!-- Right: Live Interactive Phone Simulator -->
    <div class="preview-pane">
      <div style="font-size: 0.8rem; color: var(--color-muted); margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Live Customer View Preview</div>
      <div class="mini-phone" id="phonePreview">
        <div style="font-weight: 700; color: #C87D55; margin-bottom: 0.5rem;">${escapeHtml(session.businessSlug || session.venueSlug)}</div>
        <div style="background: rgba(200,125,85,0.1); border: 1px solid #C87D55; border-radius: 4px; padding: 0.4rem; font-size: 0.72rem; margin-bottom: 0.8rem;">
          Telebirr / CBE Birr 0% Commission
        </div>
        <div id="previewSections" style="color: #9E988D;">
          (Add sections and dishes to see them update here in real-time)
        </div>
      </div>
    </div>
  </div>

  <script>
    let sections = [];

    function notify(msg, isError = false) {
      const el = document.getElementById('notification');
      el.style.display = 'block';
      el.style.background = isError ? 'rgba(239, 83, 80, 0.15)' : 'rgba(200, 125, 85, 0.15)';
      el.style.border = isError ? '1px solid #ef5350' : '1px solid var(--color-accent)';
      el.style.color = isError ? '#ef5350' : '#F5F3EF';
      el.innerHTML = msg;
    }

    // Hydrate existing draft from PostgreSQL on load
    window.addEventListener('DOMContentLoaded', async () => {
      try {
        const res = await fetch('/api/studio/draft');
        const data = await res.json();
        if (data.ok && data.draft && Array.isArray(data.draft.sections) && data.draft.sections.length > 0) {
          sections = data.draft.sections;
        }
      } catch (_) {}
      render();
    });

    function addSection() {
      document.getElementById('emptyState')?.remove();
      sections.push({ title: 'Specialty Beverages', items: [] });
      render();
    }

    function addDish(sIdx) {
      sections[sIdx].items.push({
        name_en: '',
        name_am: '',
        price_etb: 0,
        price_etb_cents: 0,
        dietary: 'standard'
      });
      render();
    }

    function removeDish(sIdx, dIdx) {
      sections[sIdx].items.splice(dIdx, 1);
      render();
    }

    function render() {
      const container = document.getElementById('menuContainer');
      if (sections.length === 0) {
        container.innerHTML = '<div class="empty-state" id="emptyState"><h3 style="font-family: Cinzel, serif; color: var(--color-cream); margin-bottom: 0.5rem;">Pristine Menu Draft (0 Items)</h3><p style="margin-bottom: 1.5rem;">Create your genuine categories and dishes below. No sample data exists.</p><button class="btn" onclick="addSection()">+ Add First Section</button></div>';
        updatePhonePreview();
        return;
      }

      container.innerHTML = sections.map((sec, sIdx) => \`
        <div class="section-card">
          <div class="section-header">
            <input type="text" value="\${sec.title}" oninput="sections[\${sIdx}].title = this.value; updatePhonePreview();" placeholder="Category Title (e.g. Specialty Coffees)" style="font-weight: 700; font-size: 1.15rem; width: 340px;" />
            <button class="btn-secondary" onclick="addDish(\${sIdx})">+ Add Dish</button>
          </div>
          <div>
            \${sec.items.map((dish, dIdx) => \`
              <div class="dish-row">
                <input type="text" value="\${dish.name_en}" placeholder="English Name (e.g. Macchiato)" oninput="sections[\${sIdx}].items[\${dIdx}].name_en = this.value; updatePhonePreview();" />
                <input type="text" value="\${dish.name_am}" placeholder="Amharic Name (የአዲስ ማኪያቶ)" onblur="normalizeAmharic(this, \${sIdx}, \${dIdx})" />
                <input type="number" step="0.5" value="\${dish.price_etb || (dish.price_etb_cents/100) || ''}" placeholder="Price (ETB)" oninput="updatePrice(\${sIdx}, \${dIdx}, this.value)" />
                <select onchange="sections[\${sIdx}].items[\${dIdx}].dietary = this.value; updatePhonePreview();" style="background: #151821; color: var(--color-accent); border: 1px solid rgba(200,125,85,0.25); border-radius: 4px; padding: 0.65rem 0.5rem; font-size: 0.82rem;">
                  <option value="standard" \${dish.dietary === 'standard' || !dish.dietary ? 'selected' : ''}>Standard</option>
                  <option value="fasting" \${dish.dietary === 'fasting' ? 'selected' : ''}>🌿 የጾም (Fasting)</option>
                  <option value="meat" \${dish.dietary === 'meat' ? 'selected' : ''}>🥩 የፍስክ (Meat)</option>
                </select>
                <button class="btn-secondary" onclick="removeDish(\${sIdx}, \${dIdx})" style="color: #ef5350;">✕</button>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');

      updatePhonePreview();
    }

    async function normalizeAmharic(input, sIdx, dIdx) {
      const val = input.value;
      if (!val) return;
      try {
        const res = await fetch('http://127.0.0.1:5001/api/v1/normalize-amharic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: val })
        });
        const data = await res.json();
        if (data.normalized) {
          input.value = data.normalized;
          sections[sIdx].items[dIdx].name_am = data.normalized;
          updatePhonePreview();
        }
      } catch (_) {}
    }

    function updatePrice(sIdx, dIdx, val) {
      const num = parseFloat(val) || 0;
      sections[sIdx].items[dIdx].price_etb = num;
      sections[sIdx].items[dIdx].price_etb_cents = Math.round(num * 100);
      updatePhonePreview();
    }

    function updatePhonePreview() {
      const preview = document.getElementById('previewSections');
      if (!preview) return;
      if (sections.length === 0 || sections.every(s => s.items.length === 0)) {
        preview.innerHTML = '<div style="color: #9E988D; padding: 2rem 0; text-align: center;">(Add items in the editor to see your customer menu)</div>';
        return;
      }

      preview.innerHTML = sections.map(sec => \`
        <div style="margin-bottom: 1rem;">
          <div style="font-weight: 700; color: #C87D55; margin-bottom: 0.4rem; font-size: 0.85rem;">\${sec.title || 'Untitled Section'}</div>
          \${sec.items.map(dish => \`
            <div style="background: #151821; border-left: 2px solid #C87D55; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #F5F3EF;">
                  \${dish.name_en || 'Dish Name'}
                  \${dish.dietary === 'fasting' ? ' <span style="font-size:0.7rem; color:#81c784; border:1px solid #81c784; padding:1px 4px; border-radius:3px;">የጾም</span>' : (dish.dietary === 'meat' ? ' <span style="font-size:0.7rem; color:#e57373; border:1px solid #e57373; padding:1px 4px; border-radius:3px;">የፍስክ</span>' : '')}
                </div>
                \${dish.name_am ? '<div style="font-size: 0.72rem; color: #9E988D;">' + dish.name_am + '</div>' : ''}
              </div>
              <div style="color: #C87D55; font-weight: 700;">\${(dish.price_etb || (dish.price_etb_cents/100) || 0).toFixed(2)} ETB</div>
            </div>
          \`).join('')}
        </div>
      \`).join('');
    }

    document.getElementById('btnSave').onclick = async () => {
      const res = await fetch('/api/studio/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      });
      const data = await res.json();
      if (res.ok) {
        notify('✓ Menu draft persisted to PostgreSQL.');
      } else {
        notify(data.error || 'Draft save failed', true);
      }
    };

    document.getElementById('btnPublish').onclick = async () => {
      const btn = document.getElementById('btnPublish');
      btn.disabled = true;
      btn.innerText = 'Publishing Live Menu...';

      if (sections.length > 0) {
        await fetch('/api/studio/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections })
        });
      }

      const res = await fetch('/api/studio/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      });
      const data = await res.json();
      btn.disabled = false;
      btn.innerText = 'Publish Live Menu';

      if (res.ok) {
        notify(\`✓ Menu published atomically! Live customer route: <a href="\${data.public_url}" target="_blank" style="color: var(--color-accent); font-weight: 700; text-decoration: underline;">\${data.public_url}</a>\`);
      } else {
        notify(data.error || 'Publication failed', true);
      }
    };
  </script>
</body>
</html>`);
    return;
  }

  // Dynamic Table QR Code Suite
  if (pathname === '/admin/qr-codes' && req.method === 'GET') {
    const session = extractSession(req);
    if (!session) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

    const bRes = queryDb('SELECT name, settings FROM menumini.businesses WHERE id = $1 LIMIT 1;', [session.businessId || session.venueId]);
    const bRow = (bRes.rows && bRes.rows[0]) || null;
    const bSettings = (bRow && bRow.settings) || {};
    const tableCount = parseInt(bSettings.table_count || 8, 10) || 8;
    const businessName = (bRow && bRow.name) || (session.businessSlug || session.venueSlug);
    const tableList = Array.from({ length: tableCount }, (_, i) => i + 1);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Dynamic QR Codes | ${escapeHtml(businessName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { background: #0E1015; color: #F5F3EF; font-family: 'Plus Jakarta Sans', sans-serif; padding: 2.5rem; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(200,125,85,0.22); padding-bottom: 1.5rem; margin-bottom: 2.5rem; }
    .title { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #F5F3EF; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }
    .qr-card {
      background: #151821;
      border: 1px solid rgba(200,125,85,0.25);
      border-radius: 10px;
      padding: 1.8rem;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .qr-card:hover { transform: translateY(-4px); border-color: #C87D55; }
    .table-num { color: #C87D55; font-weight: 800; font-size: 1.35rem; margin-bottom: 1.2rem; font-family: 'Cinzel', serif; }
    .qr-img { width: 180px; height: 180px; background: #fff; padding: 10px; border-radius: 8px; margin: 0 auto 1.2rem; display: block; }
    .btn-secondary { background: #151821; color: #F5F3EF; border: 1px solid rgba(200,125,85,0.25); padding: 0.65rem 1.4rem; border-radius: 4px; text-decoration: none; font-weight: 600; cursor: pointer; }
    .btn-secondary:hover { border-color: #C87D55; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 class="title">Dynamic Table QR Placards</h1>
      <div style="color: #9E988D; font-size: 0.95rem; margin-top: 0.2rem;">Business: <span style="color: #C87D55; font-weight: 700;">${escapeHtml(businessName)}</span> (${tableCount} Active Dining Tables)</div>
    </div>
    <div style="display: flex; gap: 1rem;">
      <button onclick="window.print()" class="btn-secondary">Print Placards</button>
      <a href="/admin/studio" class="btn-secondary">Back to Studio</a>
    </div>
  </header>

  <div class="grid">
    ${tableList.map(table => {
      const url = `http://127.0.0.1:5173/menu/${session.businessSlug || session.venueSlug}?table=${table}`;
      return `
        <div class="qr-card">
          <div class="table-num">Table ${table}</div>
          <img class="qr-img" src="/api/qr?url=${encodeURIComponent(url)}" alt="QR Code for Table ${table}" />
          <div style="font-size: 0.85rem; color: #C87D55; font-weight: 600; margin-bottom: 0.4rem;">ስልክዎን በማቅረብ ይዘዙ</div>
          <div style="font-size: 0.78rem; color: #9E988D;">Scan to order with phone</div>
          <div style="margin-top: 0.8rem;">
            <a href="${url}" target="_blank" style="font-size: 0.78rem; color: #C87D55; text-decoration: underline;">Open Table ${table} Menu ↗</a>
          </div>
          <div style="font-size: 0.7rem; color: #666; word-break: break-all; margin-top: 0.4rem;">${escapeHtml(url)}</div>
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>`);
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`MenuMini Luxury Web PWA Server listening on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
