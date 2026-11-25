/**
 * tests/integration/auth-rbac.test.ts – ARGON-24
 * Parent: ARGON-12
 *
 * Verifies that CUSTOMER, ORGANIZER (the "ORG" role) and ADMIN can only use
 * the route groups their role permits.
 *
 * Route tiers:
 *  - CUSTOMER tier  : any authenticated role
 *  - ORGANIZER tier : ORGANIZER + ADMIN
 *  - ADMIN tier     : ADMIN only
 *
 * ADMIN is the platform superuser and is intentionally allowed on every
 * protected route, so it has no blocked production route. Its full allowed
 * matrix is covered here, and unknown roles are proven to be blocked.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { Role } from '@argon/shared';
import { buildApp } from '../../src/app';

interface RouteCase {
  method: 'GET' | 'POST' | 'PATCH';
  url: string;
  body?: Record<string, unknown>;
}

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const TIER_ID = '22222222-2222-4222-8222-222222222222';
const BOOKING_ID = '33333333-3333-4333-8333-333333333333';
const TARGET_USER_ID = '44444444-4444-4444-8444-444444444444';

/** Routes every signed-in user may use. */
const CUSTOMER_ROUTES: RouteCase[] = [
  { method: 'GET', url: '/tickets/my' },
  { method: 'GET', url: `/bookings/${BOOKING_ID}` },
  {
    method: 'POST',
    url: '/bookings',
    body: { tierId: TIER_ID, eventId: EVENT_ID, quantity: 1 },
  },
];

/** Organizer + admin routes, including the /api/v1 aliases. */
const ORGANIZER_ROUTES: RouteCase[] = [
  { method: 'GET', url: '/organizer/events' },
  { method: 'GET', url: `/organizer/events/${EVENT_ID}/metrics` },
  { method: 'GET', url: `/organizer/events/${EVENT_ID}/attendees` },
  { method: 'GET', url: `/checkin/roster/${EVENT_ID}` },
  { method: 'GET', url: '/api/v1/organizer/events' },
  { method: 'POST', url: '/checkin/scan', body: { qrToken: 'invalid-token' } },
  {
    method: 'PATCH',
    url: `/organizer/events/${EVENT_ID}/tiers/${TIER_ID}/quota`,
    body: { capacity: 10 },
  },
  { method: 'PATCH', url: `/events/${EVENT_ID}`, body: { title: 'Updated title' } },
  { method: 'PATCH', url: `/events/${EVENT_ID}/status`, body: { status: 'PUBLISHED' } },
];

/** Admin-only routes. */
const ADMIN_ROUTES: RouteCase[] = [
  { method: 'GET', url: '/api/v1/admin/users' },
  { method: 'GET', url: '/api/v1/admin/audit' },
  { method: 'GET', url: '/api/v1/admin/bookings' },
  { method: 'GET', url: '/api/v1/admin/events' },
  { method: 'GET', url: '/api/v1/admin/metrics/overview' },
  { method: 'GET', url: '/api/v1/admin/system/health' },
  { method: 'GET', url: '/audit' },
  {
    method: 'PATCH',
    url: `/api/v1/admin/users/${TARGET_USER_ID}/role`,
    body: { role: 'CUSTOMER' },
  },
  { method: 'POST', url: `/api/v1/admin/bookings/${BOOKING_ID}/force-confirm` },
];

describe('role-based route access', () => {
  let app: FastifyInstance;

  const customerId = randomUUID();
  const organizerId = randomUUID();
  const adminId = randomUUID();

  let tokens: Record<'CUSTOMER' | 'ORGANIZER' | 'ADMIN', string>;

  // Avoid the global 100 req/min limiter masking authorization results.
  let requestCounter = 0;
  const nextRemoteAddress = () => {
    requestCounter += 1;
    const third = Math.floor(requestCounter / 256) % 256;
    const fourth = requestCounter % 256;
    return `10.0.${third}.${fourth}`;
  };

  const inject = (options: InjectOptions) =>
    app.inject({ remoteAddress: nextRemoteAddress(), ...options });

  const call = (route: RouteCase, token: string) =>
    inject({
      method: route.method,
      url: route.url,
      ...(route.body ? { payload: route.body } : {}),
      headers: { authorization: `Bearer ${token}` },
    });

  const expectAllowed = async (route: RouteCase, token: string) => {
    const res = await call(route, token);

    expect([401, 403], `${route.method} ${route.url} should be allowed`).not.toContain(
      res.statusCode,
    );
    expect(res.statusCode, `${route.method} ${route.url} should not error`).toBeLessThan(500);
  };

  const expectBlocked = async (route: RouteCase, token: string) => {
    const res = await call(route, token);

    expect(res.statusCode, `${route.method} ${route.url} should be blocked`).toBe(403);
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      message: 'Insufficient permissions',
    });
  };

  beforeAll(async () => {
    app = await buildApp();

    tokens = {
      CUSTOMER: app.jwt.sign({
        sub: customerId,
        email: 'customer@argon.kh',
        role: Role.CUSTOMER,
      }),
      ORGANIZER: app.jwt.sign({
        sub: organizerId,
        email: 'organizer@argon.kh',
        role: Role.ORGANIZER,
      }),
      ADMIN: app.jwt.sign({
        sub: adminId,
        email: 'admin@argon.kh',
        role: Role.ADMIN,
      }),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CUSTOMER', () => {
    it.each(CUSTOMER_ROUTES)('allows $method $url', async (route) => {
      await expectAllowed(route, tokens.CUSTOMER);
    });

    it.each([...ORGANIZER_ROUTES, ...ADMIN_ROUTES])('blocks $method $url', async (route) => {
      await expectBlocked(route, tokens.CUSTOMER);
    });
  });

  describe('ORGANIZER (ORG)', () => {
    it.each([...CUSTOMER_ROUTES, ...ORGANIZER_ROUTES])('allows $method $url', async (route) => {
      await expectAllowed(route, tokens.ORGANIZER);
    });

    it.each(ADMIN_ROUTES)('blocks $method $url', async (route) => {
      await expectBlocked(route, tokens.ORGANIZER);
    });
  });

  describe('ADMIN', () => {
    it.each([...CUSTOMER_ROUTES, ...ORGANIZER_ROUTES, ...ADMIN_ROUTES])(
      'allows $method $url',
      async (route) => {
        await expectAllowed(route, tokens.ADMIN);
      },
    );

    it('blocks roles outside the allow-list', async () => {
      const unknownRoleToken = app.jwt.sign({
        sub: randomUUID(),
        email: 'unknown@argon.kh',
        role: 'UNKNOWN' as unknown as Role,
      });

      await expectBlocked(ORGANIZER_ROUTES[0]!, unknownRoleToken);
      await expectBlocked(ADMIN_ROUTES[0]!, unknownRoleToken);
    });
  });
});
