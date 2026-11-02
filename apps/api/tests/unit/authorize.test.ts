/**
 * tests/unit/authorize.test.ts – Unit tests for role-based authorization plugin.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { authorizePlugin } from '../../src/plugins/authorize';

describe('authorizePlugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authorizePlugin);

    // Mock hook simulating authentication setting req.user from headers
    app.addHook('preHandler', async (req) => {
      const mockRole = req.headers['x-mock-role'] as Role | undefined;
      if (mockRole) {
        req.user = {
          sub: 'user-uuid-123',
          email: 'test@example.com',
          role: mockRole,
        };
      }
    });

    // Test routes
    app.get('/admin-only', {
      preHandler: [app.authorize([Role.ADMIN])],
      handler: async () => ({ status: 'success', access: 'admin' }),
    });

    app.get('/staff-only', {
      preHandler: [app.authorize([Role.ADMIN, Role.ORGANIZER])],
      handler: async () => ({ status: 'success', access: 'staff' }),
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('decorates fastify instance with authorize function', () => {
    expect(typeof app.authorize).toBe('function');
  });

  describe('when request.user is missing (unauthenticated)', () => {
    it('returns 401 Unauthorized with error message', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin-only',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });
  });

  describe('when request.user has non-matching role', () => {
    it('returns 403 Forbidden when CUSTOMER accesses ADMIN-only route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin-only',
        headers: {
          'x-mock-role': Role.CUSTOMER,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    });

    it('returns 403 Forbidden when ORGANIZER accesses ADMIN-only route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin-only',
        headers: {
          'x-mock-role': Role.ORGANIZER,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    });

    it('returns 403 Forbidden when CUSTOMER accesses staff route ([ADMIN, ORGANIZER])', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/staff-only',
        headers: {
          'x-mock-role': Role.CUSTOMER,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    });
  });

  describe('when request.user has matching role', () => {
    it('allows ADMIN to access ADMIN-only route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin-only',
        headers: {
          'x-mock-role': Role.ADMIN,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        status: 'success',
        access: 'admin',
      });
    });

    it('allows ORGANIZER to access staff route ([ADMIN, ORGANIZER])', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/staff-only',
        headers: {
          'x-mock-role': Role.ORGANIZER,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        status: 'success',
        access: 'staff',
      });
    });

    it('allows ADMIN to access staff route ([ADMIN, ORGANIZER])', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/staff-only',
        headers: {
          'x-mock-role': Role.ADMIN,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        status: 'success',
        access: 'staff',
      });
    });
  });
});
