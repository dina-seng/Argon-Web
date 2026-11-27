/**
 * tests/integration/auth-protected-routes.test.ts – parent ARGON-12
 *
 * Completes "JWT checked on every protected route": every protected route
 * registration in the Fastify app must reject a missing or invalid JWT with
 * 401 before the handler can run.
 *
 * Keep this inventory in sync with src/modules/*\/routes.ts.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildApp } from '../../src/app';

interface ProtectedRoute {
  method: 'GET' | 'POST' | 'PATCH';
  url: string;
  body?: Record<string, unknown>;
}

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const TIER_ID = '22222222-2222-4222-8222-222222222222';
const BOOKING_ID = '33333333-3333-4333-8333-333333333333';
const TICKET_ID = '44444444-4444-4444-8444-444444444444';
const TARGET_USER_ID = '55555555-5555-4555-8555-555555555555';

const PROTECTED_ROUTES: ProtectedRoute[] = [
  // /events
  {
    method: 'POST',
    url: '/events',
    body: {
      title: 'Protected Route Test Event',
      description: 'Auth inventory sweep',
      venue: 'Test Hall',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'TECH',
      capacity: 10,
    },
  },
  { method: 'PATCH', url: `/events/${EVENT_ID}`, body: { title: 'Updated title' } },
  {
    method: 'PATCH',
    url: `/events/${EVENT_ID}/status`,
    body: { status: 'PUBLISHED' },
  },

  // /bookings
  {
    method: 'POST',
    url: '/bookings',
    body: { tierId: TIER_ID, eventId: EVENT_ID, quantity: 1 },
  },
  { method: 'GET', url: `/bookings/${BOOKING_ID}` },

  // /tickets
  { method: 'GET', url: '/tickets/my' },

  // /checkin and /api/v1/checkin
  { method: 'POST', url: '/checkin/scan', body: { qrToken: 'invalid-token' } },
  { method: 'GET', url: `/checkin/roster/${EVENT_ID}` },
  { method: 'POST', url: '/api/v1/checkin/scan', body: { qrToken: 'invalid-token' } },
  { method: 'GET', url: `/api/v1/checkin/roster/${EVENT_ID}` },

  // /organizer
  { method: 'GET', url: '/organizer/events' },
  { method: 'GET', url: `/organizer/events/${EVENT_ID}` },
  { method: 'GET', url: `/organizer/events/${EVENT_ID}/metrics` },
  {
    method: 'PATCH',
    url: `/organizer/events/${EVENT_ID}/tiers/${TIER_ID}/quota`,
    body: { capacity: 10 },
  },
  { method: 'GET', url: `/organizer/events/${EVENT_ID}/attendees` },
  { method: 'POST', url: '/organizer/staff' },

  // /api/v1/organizer aliases
  { method: 'GET', url: '/api/v1/organizer/events' },
  { method: 'GET', url: `/api/v1/organizer/events/${EVENT_ID}` },
  { method: 'GET', url: `/api/v1/organizer/events/${EVENT_ID}/metrics` },
  {
    method: 'PATCH',
    url: `/api/v1/organizer/events/${EVENT_ID}/tiers/${TIER_ID}/quota`,
    body: { capacity: 10 },
  },
  { method: 'GET', url: `/api/v1/organizer/events/${EVENT_ID}/attendees` },
  { method: 'POST', url: '/api/v1/organizer/staff' },

  // /audit
  { method: 'GET', url: '/audit' },

  // /api/v1/admin
  { method: 'GET', url: '/api/v1/admin/metrics/overview' },
  { method: 'GET', url: '/api/v1/admin/users' },
  { method: 'GET', url: `/api/v1/admin/users/${TARGET_USER_ID}/details` },
  {
    method: 'PATCH',
    url: `/api/v1/admin/users/${TARGET_USER_ID}/role`,
    body: { role: 'CUSTOMER' },
  },
  {
    method: 'POST',
    url: `/api/v1/admin/users/${TARGET_USER_ID}/suspend`,
    body: { suspend: false },
  },
  { method: 'GET', url: '/api/v1/admin/events' },
  {
    method: 'PATCH',
    url: `/api/v1/admin/events/${EVENT_ID}/status`,
    body: { status: 'PUBLISHED' },
  },
  { method: 'GET', url: '/api/v1/admin/bookings' },
  { method: 'POST', url: `/api/v1/admin/bookings/${BOOKING_ID}/force-confirm` },
  { method: 'POST', url: `/api/v1/admin/bookings/${BOOKING_ID}/refund` },
  {
    method: 'POST',
    url: `/api/v1/admin/tickets/${TICKET_ID}/check-in-override`,
  },
  { method: 'GET', url: '/api/v1/admin/audit' },
  { method: 'GET', url: '/api/v1/admin/system/health' },
];

describe('Every protected route requires a valid JWT', () => {
  let app: FastifyInstance;

  // Avoid the global 100 req/min limiter masking 401 results.
  let requestCounter = 0;
  const nextRemoteAddress = () => {
    requestCounter += 1;
    const third = Math.floor(requestCounter / 256) % 256;
    const fourth = requestCounter % 256;
    return `10.0.${third}.${fourth}`;
  };

  const inject = (options: InjectOptions) =>
    app.inject({ remoteAddress: nextRemoteAddress(), ...options });

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(PROTECTED_ROUTES)('rejects missing and invalid JWTs for $method $url', async (route) => {
    const base = {
      method: route.method,
      url: route.url,
      ...(route.body ? { payload: route.body } : {}),
    } as const;

    const missing = await inject(base);
    expect(missing.statusCode, 'missing token must be rejected').toBe(401);
    expect(missing.json()).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });

    const invalid = await inject({
      ...base,
      headers: { authorization: 'Bearer invalid.jwt.token' },
    });
    expect(invalid.statusCode, 'invalid token must be rejected').toBe(401);
    expect(invalid.json()).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  });
});
