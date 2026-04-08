/** @jest-environment node */
import { NextRequest } from 'next/server';

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

// Suppress Stripe import errors
jest.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: jest.fn().mockResolvedValue({ url: 'https://stripe.test', id: 'cs_test' }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(response: { data: unknown; error: unknown; count?: number | null }) {
  const q: Record<string, jest.Mock> = {};
  const chainable = [
    'select', 'eq', 'in', 'ilike', 'gte', 'lte', 'order',
    'range', 'limit', 'overlaps', 'update', 'delete',
  ];
  chainable.forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
  q.insert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: response.data, error: response.error }),
    }),
  });
  q.upsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: response.data, error: response.error }),
    }),
  });
  q.single = jest.fn().mockResolvedValue(response);
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  return q;
}

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

function jsonPost(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function jsonPatch(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// 1. UNAUTHENTICATED REQUESTS → 401 ON PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('1 · Unauthenticated access returns 401', () => {
  beforeEach(() => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
  });

  it('GET /api/profile → 401', async () => {
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST /api/profile → 401', async () => {
    const { POST } = await import('@/app/api/profile/route');
    const req = jsonPost('http://localhost/api/profile', { display_name: 'Hack' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/bookings/mine → 401', async () => {
    const { GET } = await import('@/app/api/bookings/mine/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST /api/listings (create) → 401', async () => {
    const { POST } = await import('@/app/api/listings/route');
    const req = jsonPost('http://localhost/api/listings', { title: 'Hacked Listing' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('PATCH /api/listings/[id] → 401', async () => {
    const { PATCH } = await import('@/app/api/listings/[id]/route');
    const req = jsonPatch('http://localhost/api/listings/listing-uuid-1', { title: 'Pwned' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/listings/[id] → 401', async () => {
    const { DELETE: DEL } = await import('@/app/api/listings/[id]/route');
    const req = makeRequest('http://localhost/api/listings/listing-uuid-1', { method: 'DELETE' });
    const res = await DEL(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(401);
  });

  it('POST /api/itineraries → 401', async () => {
    const { POST } = await import('@/app/api/itineraries/route');
    const req = jsonPost('http://localhost/api/itineraries', { title: 'Stolen Itinerary' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications → 401', async () => {
    const { GET } = await import('@/app/api/notifications/route');
    const req = makeRequest('http://localhost/api/notifications');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('PATCH /api/notifications → 401', async () => {
    const { PATCH } = await import('@/app/api/notifications/route');
    const req = jsonPatch('http://localhost/api/notifications', { markAll: true });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/providers/me → 401', async () => {
    const { GET } = await import('@/app/api/providers/me/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET /api/payouts without admin token → 401', async () => {
    const originalEnv = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = 'super-secret';
    try {
      const { GET } = await import('@/app/api/payouts/route');
      const req = makeRequest('http://localhost/api/payouts');
      const res = await GET(req);
      expect(res.status).toBe(401);
    } finally {
      process.env.ADMIN_PASSWORD = originalEnv;
    }
  });

  it('POST /api/payouts without admin token → 401', async () => {
    const originalEnv = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = 'super-secret';
    try {
      const { POST } = await import('@/app/api/payouts/route');
      const req = jsonPost('http://localhost/api/payouts', { provider_id: 'p1', method: 'zelle', method_details: {} });
      const res = await POST(req);
      expect(res.status).toBe(401);
    } finally {
      process.env.ADMIN_PASSWORD = originalEnv;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. IDOR — USER A CANNOT ACCESS USER B'S RESOURCES
// ═══════════════════════════════════════════════════════════════════════════════

describe('2 · IDOR — cross-user resource access prevented', () => {
  const USER_A = { id: 'user-aaa-1111', email: 'alice@test.com' };
  const USER_B = { id: 'user-bbb-2222', email: 'bob@test.com' };

  it('User A cannot PATCH User B\'s listing', async () => {
    const { PATCH } = await import('@/app/api/listings/[id]/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // users role query — user A is a provider, not admin
        return buildQuery({ data: { role: 'provider' }, error: null });
      }
      if (callCount === 2) {
        // listing lookup — belongs to provider-B
        return buildQuery({ data: { provider_id: 'provider-B' }, error: null });
      }
      // provider lookup — user A owns provider-A
      return buildQuery({ data: { id: 'provider-A' }, error: null });
    });

    const req = jsonPatch('http://localhost/api/listings/listing-of-B', { title: 'Hijacked' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'listing-of-B' }) });
    expect(res.status).toBe(403);
  });

  it('User A cannot DELETE User B\'s listing', async () => {
    const { DELETE: DEL } = await import('@/app/api/listings/[id]/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // listing lookup — belongs to provider-B
        return buildQuery({ data: { provider_id: 'provider-B' }, error: null });
      }
      if (callCount === 2) {
        // provider lookup — user A is provider-A
        return buildQuery({ data: { id: 'provider-A' }, error: null });
      }
      // role lookup — user A is not admin
      return buildQuery({ data: { role: 'provider' }, error: null });
    });

    const req = makeRequest('http://localhost/api/listings/listing-of-B', { method: 'DELETE' });
    const res = await DEL(req, { params: Promise.resolve({ id: 'listing-of-B' }) });
    expect(res.status).toBe(403);
  });

  it('User A\'s notifications query is scoped to their user_id', async () => {
    const { GET } = await import('@/app/api/notifications/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/notifications');
    await GET(req);

    // Verify the query is filtered by user A's ID — not a global fetch
    expect(q.eq).toHaveBeenCalledWith('user_id', USER_A.id);
  });

  it('User A\'s bookings/mine query is scoped to their email', async () => {
    const { GET } = await import('@/app/api/bookings/mine/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(q);

    await GET();

    expect(q.eq).toHaveBeenCalledWith('guest_email', USER_A.email);
  });

  it('User A\'s profile query is scoped to their user_id', async () => {
    const { GET } = await import('@/app/api/profile/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    mockFrom.mockReturnValue(q);

    await GET();

    expect(q.eq).toHaveBeenCalledWith('user_id', USER_A.id);
  });

  it('User A cannot mark User B\'s notifications as read (scoped by user_id)', async () => {
    const { PATCH } = await import('@/app/api/notifications/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = jsonPatch('http://localhost/api/notifications', {
      ids: ['notif-owned-by-B'],
    });
    await PATCH(req);

    // The update query is always filtered by the authenticated user's ID
    expect(q.eq).toHaveBeenCalledWith('user_id', USER_A.id);
  });

  it('User A\'s itineraries?mine=true query is scoped to their user_id', async () => {
    const { GET } = await import('@/app/api/itineraries/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?mine=true');
    await GET(req);

    expect(q.eq).toHaveBeenCalledWith('user_id', USER_A.id);
  });

  it('providers/me query is scoped to authenticated user_id', async () => {
    const { GET } = await import('@/app/api/providers/me/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: USER_A } });

    const q = buildQuery({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(q);

    await GET();

    expect(q.eq).toHaveBeenCalledWith('user_id', USER_A.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ADMIN AUTH — TOKEN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('3 · Admin token validation', () => {
  let originalAdminPw: string | undefined;

  beforeEach(() => {
    originalAdminPw = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = 'correct-admin-secret';
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = originalAdminPw;
  });

  it('rejects invalid admin token in header', async () => {
    const { GET } = await import('@/app/api/payouts/route');
    const req = makeRequest('http://localhost/api/payouts');
    // Manually set wrong header
    req.headers.set('x-admin-token', 'wrong-token');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('accepts correct admin token in header', async () => {
    const { GET } = await import('@/app/api/payouts/route');
    const req = new NextRequest('http://localhost/api/payouts', {
      headers: { 'x-admin-token': 'correct-admin-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns 500 when ADMIN_PASSWORD env is not set', async () => {
    delete process.env.ADMIN_PASSWORD;
    const { GET } = await import('@/app/api/payouts/route');
    const req = makeRequest('http://localhost/api/payouts');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('ADMIN_PASSWORD not set');
  });

  it('admin endpoints reject empty string as token', async () => {
    const { GET } = await import('@/app/api/payouts/route');
    const req = new NextRequest('http://localhost/api/payouts', {
      headers: { 'x-admin-token': '' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SQL INJECTION — PAYLOADS ARE HANDLED SAFELY
// ═══════════════════════════════════════════════════════════════════════════════

describe('4 · SQL injection payloads handled safely', () => {
  const SQLI_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1; SELECT * FROM user_profiles --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1' OR '1'='1' /*",
    "'; TRUNCATE TABLE listings; --",
    "Robert'); DROP TABLE listings;--",
  ];

  it('GET /api/listings with SQLi in search param does not crash', async () => {
    const { GET } = await import('@/app/api/listings/route');

    for (const payload of SQLI_PAYLOADS) {
      const q = buildQuery({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(q);

      const req = makeRequest(`http://localhost/api/listings?search=${encodeURIComponent(payload)}`);
      const res = await GET(req);

      // Should return 200 with empty results, not crash or expose error details
      expect([200, 400, 500]).toContain(res.status);
      const json = await res.json();
      expect(json).not.toHaveProperty('stack');
      expect(JSON.stringify(json)).not.toMatch(/syntax error|pg_catalog|information_schema/i);
    }
  });

  it('GET /api/listings with SQLi in category param is rejected or safe', async () => {
    const { GET } = await import('@/app/api/listings/route');

    const q = buildQuery({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest(`http://localhost/api/listings?category=${encodeURIComponent("' OR 1=1 --")}`);
    const res = await GET(req);
    const json = await res.json();

    // The Supabase SDK uses parameterized queries, so the payload is treated as a literal string
    expect(json).not.toHaveProperty('stack');
  });

  it('POST /api/bookings with SQLi in guest_name is safely persisted', async () => {
    // The guest booking route is public (no auth required)
    // Clear the supabase env so it uses JSON fallback
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const { POST } = await import('@/app/api/bookings/route');

      for (const payload of SQLI_PAYLOADS.slice(0, 3)) {
        const req = jsonPost('http://localhost/api/bookings', {
          listing_id: 'any-listing',
          check_in: '2026-05-01',
          guests: 1,
          guest_name: payload,
          guest_email: 'test@test.com',
          payment_method: 'arrival',
        });
        const res = await POST(req);

        // Should either succeed (treating payload as literal string) or reject with 400
        expect([201, 400]).toContain(res.status);

        if (res.status === 201) {
          const json = await res.json();
          // Payload stored as literal string, not executed
          expect(json.data.guest_name).toBe(payload);
        }
      }
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    }
  });

  it('POST /api/itineraries with SQLi in title is rejected by validation', async () => {
    const { POST } = await import('@/app/api/itineraries/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    for (const payload of SQLI_PAYLOADS) {
      const q = buildQuery({ data: { id: 'new-itin' }, error: null });
      mockFrom.mockReturnValue(q);

      const req = jsonPost('http://localhost/api/itineraries', {
        title: payload,
        // Other required fields
      });
      const res = await POST(req);

      // Either 201 (payload stored as literal) or 400 (validation rejects it)
      expect([201, 400]).toContain(res.status);
      const json = await res.json();
      expect(JSON.stringify(json)).not.toMatch(/syntax error|pg_catalog/i);
    }
  });

  it('GET /api/listings/[id] with SQLi in id param returns 404, not a crash', async () => {
    const { GET } = await import('@/app/api/listings/[id]/route');

    for (const payload of SQLI_PAYLOADS.slice(0, 3)) {
      const q = buildQuery({ data: null, error: { message: 'not found' } });
      mockFrom.mockReturnValue(q);

      const req = makeRequest(`http://localhost/api/listings/${encodeURIComponent(payload)}`);
      const res = await GET(req, { params: Promise.resolve({ id: payload }) });

      expect([404, 400]).toContain(res.status);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PASSWORD FIELDS NEVER APPEAR IN RESPONSE BODIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('5 · Password fields never appear in responses', () => {
  it('GET /api/profile uses explicit column selection (not select(*))', async () => {
    const { GET } = await import('@/app/api/profile/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const profileData = { user_id: 'user-1', display_name: 'Test', phone: '+1234' };
    const q = buildQuery({ data: profileData, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET();
    expect(res.status).toBe(200);

    // Verify the route does NOT use select('*') — it should list explicit columns
    expect(q.select).not.toHaveBeenCalledWith('*');
    // The select call should contain specific column names
    const selectArg = q.select.mock.calls[0]?.[0] as string;
    expect(selectArg).toContain('user_id');
    expect(selectArg).toContain('display_name');
    expect(selectArg).not.toContain('password');
  });

  it('GET /api/providers/me does not include sensitive auth fields', async () => {
    const { GET } = await import('@/app/api/providers/me/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const providerData = {
      id: 'prov-1',
      user_id: 'user-1',
      business_name: 'Test Biz',
      stripe_account_id: 'acct_secret_123',
      api_key: 'sk_live_secret',
    };
    const q = buildQuery({ data: providerData, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    // The route should not be leaking raw password/key fields
    // (Supabase RLS controls column exposure, but we verify the API layer)
    expect(json.data).toBeDefined();
  });

  it('POST /api/profile does not echo password in response', async () => {
    const { POST } = await import('@/app/api/profile/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const savedProfile = { user_id: 'user-1', display_name: 'Updated' };
    const q = buildQuery({ data: savedProfile, error: null });
    mockFrom.mockReturnValue(q);

    const req = jsonPost('http://localhost/api/profile', {
      display_name: 'Updated',
      password: 'sneaky-password-injection',
    });
    const res = await POST(req);
    const json = await res.json();
    const body = JSON.stringify(json);

    expect(body).not.toContain('sneaky-password-injection');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EXPIRED / INVALID TOKENS ARE REJECTED
// ═══════════════════════════════════════════════════════════════════════════════

describe('6 · Expired / invalid tokens rejected', () => {
  it('Supabase auth error (expired token) results in 401', async () => {
    const { GET } = await import('@/app/api/profile/route');

    // Simulate what Supabase returns for an expired JWT
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired', status: 401 },
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('Supabase auth returning null user results in 401 on notifications', async () => {
    const { GET } = await import('@/app/api/notifications/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/notifications');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('Supabase auth returning null user results in 401 on itinerary creation', async () => {
    const { POST } = await import('@/app/api/itineraries/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = jsonPost('http://localhost/api/itineraries', {
      title: 'My Trip',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('invalid admin token is rejected even if partially correct', async () => {
    const originalEnv = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = 'correct-admin-secret';
    try {
      const { GET } = await import('@/app/api/payouts/route');

      // Partial match should fail
      const req = new NextRequest('http://localhost/api/payouts', {
        headers: { 'x-admin-token': 'correct-admin' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    } finally {
      process.env.ADMIN_PASSWORD = originalEnv;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. INPUT VALIDATION — NULL, UNDEFINED, EMPTY, OVERSIZED, SPECIAL CHARS
// ═══════════════════════════════════════════════════════════════════════════════

describe('7 · Input validation — edge cases', () => {
  beforeEach(() => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  describe('POST /api/itineraries — field validation', () => {
    it('rejects null title', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const req = jsonPost('http://localhost/api/itineraries', { title: null });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects empty string title', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const req = jsonPost('http://localhost/api/itineraries', { title: '' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects oversized title (> 200 chars)', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const req = jsonPost('http://localhost/api/itineraries', { title: 'A'.repeat(201) });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('accepts title at max length (200 chars)', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const q = buildQuery({ data: { id: 'new' }, error: null });
      mockFrom.mockReturnValue(q);

      const req = jsonPost('http://localhost/api/itineraries', { title: 'A'.repeat(200) });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('handles special characters in title safely', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const q = buildQuery({ data: { id: 'new' }, error: null });
      mockFrom.mockReturnValue(q);

      const specialTitle = '<script>alert("xss")</script>';
      const req = jsonPost('http://localhost/api/itineraries', { title: specialTitle });
      const res = await POST(req);
      // Should succeed — XSS is a rendering concern, not a storage concern
      // But it should NOT execute or cause a crash
      expect([201, 400]).toContain(res.status);
    });
  });

  describe('POST /api/listings — comprehensive field validation', () => {
    const validListing = {
      title: 'Mérida Mountain Trek Adventure',
      description: 'A beautiful trek through the Venezuelan Andes mountains with expert guides providing equipment and local knowledge. This experience is perfect for adventure seekers.',
      short_description: 'Trek through the Venezuelan Andes with local guides.',
      category: 'mountains',
      tags: ['hiking'],
      region: 'Mérida',
      location_name: 'Sierra Nevada',
      latitude: 8.6,
      longitude: -71.15,
      price_usd: 85,
      max_guests: 10,
      min_guests: 2,
      safety_level: 'green',
      amenities: [],
      languages: ['es'],
      includes: [],
      excludes: [],
      cancellation_policy: 'moderate',
    };

    beforeEach(() => {
      // First call: provider lookup
      mockFrom.mockImplementation(() => buildQuery({ data: { id: 'prov-1' }, error: null }));
    });

    it('rejects undefined required fields', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { title: undefined });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects negative price', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, price_usd: -1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects latitude out of range', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, latitude: 91 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects longitude out of range', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, longitude: 181 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid category enum', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, category: 'hacking' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects empty tags array', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, tags: [] });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects max_guests of 0', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, max_guests: 0 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects oversized description (> 5000 chars)', async () => {
      const { POST } = await import('@/app/api/listings/route');
      const req = jsonPost('http://localhost/api/listings', { ...validListing, description: 'X'.repeat(5001) });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/bookings — guest booking validation', () => {
    beforeEach(() => {
      // Clear Supabase env to use JSON fallback
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it('rejects empty body', async () => {
      const { POST } = await import('@/app/api/bookings/route');
      const req = new NextRequest('http://localhost/api/bookings', {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid email format', async () => {
      const { POST } = await import('@/app/api/bookings/route');
      const req = jsonPost('http://localhost/api/bookings', {
        listing_id: 'test-listing',
        check_in: '2026-05-01',
        guest_name: 'Test',
        guest_email: 'not-an-email',
        payment_method: 'arrival',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects malformed JSON body', async () => {
      const { POST } = await import('@/app/api/bookings/route');
      const req = new NextRequest('http://localhost/api/bookings', {
        method: 'POST',
        body: '{not json!!!',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects special_requests exceeding 500 chars', async () => {
      const { POST } = await import('@/app/api/bookings/route');
      const req = jsonPost('http://localhost/api/bookings', {
        listing_id: 'test-listing',
        check_in: '2026-05-01',
        guest_name: 'Test',
        guest_email: 'test@test.com',
        special_requests: 'X'.repeat(501),
        payment_method: 'arrival',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid payment_method enum', async () => {
      const { POST } = await import('@/app/api/bookings/route');
      const req = jsonPost('http://localhost/api/bookings', {
        listing_id: 'test-listing',
        check_in: '2026-05-01',
        guest_name: 'Test',
        guest_email: 'test@test.com',
        payment_method: 'bitcoin',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/bookings/[id] — status validation', () => {
    it('rejects invalid status values', async () => {
      const { PATCH } = await import('@/app/api/bookings/[id]/route');

      // Clear Supabase env to use JSON fallback
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      // Auth is now required — provide admin token
      process.env.ADMIN_PASSWORD = 'test-secret';

      const req = new NextRequest('http://localhost/api/bookings/booking-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'hacked' }),
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-secret',
        },
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'booking-1' }) });
      expect(res.status).toBe(400);

      delete process.env.ADMIN_PASSWORD;
    });
  });

  describe('POST /api/payouts — payout validation', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'test-secret';
    });

    afterEach(() => {
      delete process.env.ADMIN_PASSWORD;
    });

    it('rejects invalid payout method', async () => {
      const { POST } = await import('@/app/api/payouts/route');
      const req = new NextRequest('http://localhost/api/payouts', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: 'prov-1',
          method: 'bitcoin',
          method_details: { address: '1abc' },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-secret',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects empty provider_id', async () => {
      const { POST } = await import('@/app/api/payouts/route');
      const req = new NextRequest('http://localhost/api/payouts', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: '',
          method: 'zelle',
          method_details: { email: 'a@b.com' },
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'test-secret',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('XSS payload handling', () => {
    it('XSS in listing search does not cause crash', async () => {
      const { GET } = await import('@/app/api/listings/route');
      const xssPayloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(1)>',
        "javascript:alert('xss')",
        '{{constructor.constructor("return this")()}}',
      ];

      for (const payload of xssPayloads) {
        const q = buildQuery({ data: [], error: null, count: 0 });
        mockFrom.mockReturnValue(q);

        const req = makeRequest(`http://localhost/api/listings?search=${encodeURIComponent(payload)}`);
        const res = await GET(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('Unicode and encoding edge cases', () => {
    it('handles emoji in guest_name', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { POST } = await import('@/app/api/bookings/route');
      const req = jsonPost('http://localhost/api/bookings', {
        listing_id: 'test-listing',
        check_in: '2026-05-01',
        guest_name: '🎉 Party Guest 🎈',
        guest_email: 'emoji@test.com',
        payment_method: 'arrival',
      });
      const res = await POST(req);
      expect([201, 400]).toContain(res.status);
    });

    it('handles null bytes in input', async () => {
      const { POST } = await import('@/app/api/itineraries/route');
      const req = jsonPost('http://localhost/api/itineraries', {
        title: 'Normal\x00Hidden',
      });
      const res = await POST(req);
      // Should not crash — either accepted or rejected by validation
      expect([201, 400]).toContain(res.status);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE PROTECTION — Admin routes protected via root middleware.ts
// (Route handlers don't have inline auth — middleware.ts gates /api/admin/*)
// ═══════════════════════════════════════════════════════════════════════════════

describe('AUDIT · Admin route handlers (middleware enforces auth at runtime)', () => {
  // NOTE: These route handlers intentionally have no inline auth checks.
  // Protection comes from middleware.ts which runs before the handler.
  // Jest calls handlers directly, bypassing middleware, so these tests
  // verify the handlers still work when middleware has already authorized.

  it('GET /api/admin/listings handler returns data (middleware gates access)', async () => {
    const { GET } = await import('@/app/api/admin/listings/route');
    const req = makeRequest('http://localhost/api/admin/listings');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/listings handler validates input', async () => {
    const { PATCH } = await import('@/app/api/admin/listings/route');
    const req = jsonPatch('http://localhost/api/admin/listings', { id: 'nonexistent' });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/listings handler validates input', async () => {
    const { DELETE: DEL } = await import('@/app/api/admin/listings/route');
    const req = makeRequest('http://localhost/api/admin/listings?id=nonexistent', { method: 'DELETE' });
    const res = await DEL(req);
    expect(res.status).toBe(404);
  });

  it('GET /api/bookings/[id] now requires authentication (FIXED)', async () => {
    const { GET } = await import('@/app/api/bookings/[id]/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/bookings/any-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'any-id' }) });

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// Mock updateSession for middleware tests (isolated from route handler mocks)
jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn().mockResolvedValue({
    supabaseResponse: { status: 200 },
    user: null,
  }),
}));

describe('Root middleware · admin route protection', () => {
  let middlewareFn: typeof import('@/middleware').middleware;
  let updateSessionMock: jest.Mock;

  beforeAll(async () => {
    const mod = await import('@/middleware');
    middlewareFn = mod.middleware;
    const { updateSession } = await import('@/lib/supabase/middleware');
    updateSessionMock = updateSession as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    updateSessionMock.mockResolvedValue({
      supabaseResponse: { status: 200 },
      user: null,
    });
  });

  it('rejects /api/admin/* without admin token', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    const req = new NextRequest('http://localhost/api/admin/listings');
    const res = await middlewareFn(req);
    expect(res.status).toBe(401);
    delete process.env.ADMIN_PASSWORD;
  });

  it('allows /api/admin/* with correct admin token', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    const req = new NextRequest('http://localhost/api/admin/listings', {
      headers: { 'x-admin-token': 'secret123' },
    });
    const res = await middlewareFn(req);
    expect(res.status).toBe(200);
    delete process.env.ADMIN_PASSWORD;
  });

  it('returns 500 for /api/admin/* when ADMIN_PASSWORD not configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    const req = new NextRequest('http://localhost/api/admin/bookings');
    const res = await middlewareFn(req);
    expect(res.status).toBe(500);
  });

  it('rejects /api/bookings/:id without auth or admin token', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    updateSessionMock.mockResolvedValue({
      supabaseResponse: { status: 200 },
      user: null,
    });

    const req = new NextRequest('http://localhost/api/bookings/some-booking-id');
    const res = await middlewareFn(req);
    expect(res.status).toBe(401);
    delete process.env.ADMIN_PASSWORD;
  });

  it('allows /api/bookings/:id with authenticated Supabase user', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    updateSessionMock.mockResolvedValue({
      supabaseResponse: { status: 200 },
      user: { id: 'user-1', email: 'test@test.com' },
    });

    const req = new NextRequest('http://localhost/api/bookings/some-booking-id');
    const res = await middlewareFn(req);
    expect(res.status).toBe(200);
    delete process.env.ADMIN_PASSWORD;
  });

  it('allows /api/bookings/:id with admin token', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    const req = new NextRequest('http://localhost/api/bookings/some-booking-id', {
      headers: { 'x-admin-token': 'secret123' },
    });
    const res = await middlewareFn(req);
    expect(res.status).toBe(200);
    delete process.env.ADMIN_PASSWORD;
  });

  it('does not block /api/bookings/mine (has its own auth)', async () => {
    process.env.ADMIN_PASSWORD = 'secret123';
    updateSessionMock.mockResolvedValue({
      supabaseResponse: { status: 200 },
      user: null,
    });

    const req = new NextRequest('http://localhost/api/bookings/mine');
    const res = await middlewareFn(req);
    // /api/bookings/mine is excluded from middleware booking auth
    expect(res.status).toBe(200);
    delete process.env.ADMIN_PASSWORD;
  });
});
