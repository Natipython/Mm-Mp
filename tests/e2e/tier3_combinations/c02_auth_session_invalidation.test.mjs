/**
 * Tier 3: Cross-Feature Combinations
 * Combination 2: Merchant Registration -> Active Session -> Menu Studio Mutations -> Invalidation
 * Validates session security and access control boundaries across merchant workflows
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.mjs';
import { HttpClient } from '../helpers/http-helper.mjs';

const client = new HttpClient(CONFIG.services.web.baseUrl);

describe('Tier 3: Combination 2 - Auth Session Lifecycle & Access Invalidation', () => {
  const email = `session_flow_${Date.now()}@merchants.et`;

  it('Step 1: Register merchant and acquire valid session cookie', async () => {
    const res = await client.post('/api/auth/register', {
      email,
      password: 'ComplexPassword888!',
      business_name: `Security Cafe ${Date.now()}`
    });
    assert.strictEqual(res.status, 201);
    const cookie = client.getCookie('menumini_session');
    assert.ok(cookie);
  });

  it('Step 2: Authenticated session successfully modifies Menu Studio draft', async () => {
    const draftRes = await client.post('/api/studio/draft', {
      sections: [{ title: 'Authorized Section', items: [] }]
    });
    assert.strictEqual(draftRes.status, 200);
  });

  it('Step 3: Client clears session cookie to simulate logout or session expiration', async () => {
    client.clearCookies();
    assert.strictEqual(client.cookies.size, 0);
  });

  it('Step 4: Subsequent modification attempt is blocked with HTTP 401 Unauthorized', async () => {
    const res = await client.post('/api/studio/draft', {
      sections: [{ title: 'Unauthorized Modification', items: [] }]
    });
    assert.strictEqual(res.status, 401);
  });

  it('Step 5: Subsequent publish attempt is blocked with HTTP 401 Unauthorized', async () => {
    const res = await client.post('/api/studio/publish', {});
    assert.strictEqual(res.status, 401);
  });
});
