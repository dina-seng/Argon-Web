/**
 * tests/integration/auth-jwt.test.ts – ARGON-23
 * Parent: ARGON-12
 *
 * Proves that:
 *  - POST /auth/login returns a signed JWT with the user's claims.
 *  - Protected routes accept a valid JWT.
 *  - Protected routes reject missing, malformed, tampered, expired and
 *    wrong-secret tokens.
 */

import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { Role, type JwtPayload } from '@argon/shared';
import { buildApp } from '../../src/app';

const BOOKING_ID = '33333333-3333-4333-8333-333333333333';

/** Routes that must never run without a valid access token. */
const PROTECTED_ROUTES = [
  { method: 'GET', url: '/tickets/my' },
  { method: 'GET', url: `/bookings/${BOOKING_ID}` },
  { method: 'GET', url: '/organizer/events' },
  { method: 'GET', url: '/api/v1/admin/users' },
] as const;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('JWT issuance and protected-route enforcement', () => {
  let app: FastifyInstance;

  const email = `jwt-${randomUUID()}@argon.kh`;
  const password = 'Argon!Passw0rd1';
  const name = 'JWT Login Test';
  let userId: string;
  let refreshToken: string | undefined;

  const login = () =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });

  const withToken = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await buildApp();

    await app.prisma.user.deleteMany({ where: { email } });
    const user = await app.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name,
        role: 'CUSTOMER',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (refreshToken) {
      await app.redis.del(`auth:refresh:${sha256(refreshToken)}`);
    }
    await app.prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('returns a signed JWT from login with the expected claims', async () => {
    const res = await login();

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.token.split('.')).toHaveLength(3);
    refreshToken = body.refreshToken;

    const claims = app.jwt.verify<JwtPayload>(body.token);
    expect(claims.sub).toBe(userId);
    expect(claims.email).toBe(email);
    expect(claims.role).toBe('CUSTOMER');
    expect(claims.exp!).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('accepts the login JWT on protected routes', async () => {
    const { token } = (await login()).json() as { token: string };

    const tickets = await app.inject({
      method: 'GET',
      url: '/tickets/my',
      headers: withToken(token),
    });
    expect(tickets.statusCode).toBe(200);

    const booking = await app.inject({
      method: 'GET',
      url: `/bookings/${BOOKING_ID}`,
      headers: withToken(token),
    });
    expect([401, 403]).not.toContain(booking.statusCode);
    expect(booking.statusCode).toBeLessThan(500);
  });

  it('rejects requests with no token on every protected route', async () => {
    for (const route of PROTECTED_ROUTES) {
      const res = await app.inject({ method: route.method, url: route.url });

      expect(res.statusCode, `${route.method} ${route.url} must require a token`).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });

  it('rejects malformed tokens on every protected route', async () => {
    for (const route of PROTECTED_ROUTES) {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        headers: withToken('not-a-real-jwt'),
      });

      expect(res.statusCode, `${route.method} ${route.url} must reject a bad token`).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    }
  });

  it('rejects wrong, tampered and expired tokens', async () => {
    const { token } = (await login()).json() as { token: string };
    const now = Math.floor(Date.now() / 1000);
    const claims: JwtPayload = {
      sub: userId,
      email,
      role: Role.CUSTOMER,
    };

    const wrongSecret = app.jwt.sign(claims, { key: 'x'.repeat(48) });
    const tampered = `${token.slice(0, -4)}AAAA`;
    const expired = app.jwt.sign({ ...claims, iat: now - 120, exp: now - 60 });

    for (const [label, badToken] of [
      ['wrong secret', wrongSecret],
      ['tampered signature', tampered],
      ['expired', expired],
    ] as const) {
      const res = await app.inject({
        method: 'GET',
        url: '/tickets/my',
        headers: withToken(badToken),
      });

      expect(res.statusCode, `${label} token must be rejected`).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    }
  });
});
