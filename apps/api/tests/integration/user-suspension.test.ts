/**
 * tests/integration/user-suspension.test.ts
 *
 * Verifies:
 * 1. Admin can suspend an active user (POST /api/v1/admin/users/:id/suspend { suspend: true })
 * 2. Suspended user is rejected at login (POST /auth/login returns 403 Forbidden)
 * 3. Admin can reactivate the suspended user (POST /api/v1/admin/users/:id/suspend { suspend: false })
 * 4. Reactivated user can successfully log in (POST /auth/login returns 200 OK)
 * 5. Admin cannot be suspended (returns 403 Forbidden)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildApp } from '../../src/app';

describe('User Account Suspension Enforcement Pipeline', () => {
  let app: FastifyInstance;

  const adminId = '11111111-2222-4333-8444-555555555555';
  const customerId = '66666666-7777-4888-8999-000000000000';
  const customerEmail = 'suspension-test@argon.kh';
  const rawPassword = 'Password123!';

  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'admin@argon.kh',
      role: Role.ADMIN,
    });

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Clean prior test fixtures
    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: customerId },
        ],
      },
    });
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [adminId, customerId] },
      },
    });

    // Create admin user
    await app.prisma.user.create({
      data: {
        id: adminId,
        email: 'admin-suspension@argon.kh',
        name: 'Admin Suspension Auditor',
        password: passwordHash,
        role: Role.ADMIN,
      },
    });

    // Create target customer user
    await app.prisma.user.create({
      data: {
        id: customerId,
        email: customerEmail,
        name: 'Target Customer',
        password: passwordHash,
        role: Role.CUSTOMER,
        isSuspended: false,
      },
    });
  });

  afterAll(async () => {
    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: customerId },
        ],
      },
    });
    await app.prisma.user.deleteMany({
      where: {
        id: { in: [adminId, customerId] },
      },
    });
    await app.close();
  });

  it('1. permits active customer to log in initially with 200 OK', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: customerEmail,
        password: rawPassword,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('2. admin successfully suspends the user account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${customerId}/suspend`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        suspend: true,
        reason: 'Fraudulent transaction dispute',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      userId: customerId,
      isSuspended: true,
      action: 'USER_ACCOUNT_SUSPENDED',
    });

    // Verify in PostgreSQL database
    const dbUser = await app.prisma.user.findUnique({ where: { id: customerId } });
    expect(dbUser?.isSuspended).toBe(true);
  });

  it('3. rejects login attempt for suspended user with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: customerEmail,
        password: rawPassword,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.message).toContain('Account has been suspended');
  });

  it('4. admin reactivates the suspended user account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${customerId}/suspend`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        suspend: false,
        reason: 'Identity verified and unblocked',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      userId: customerId,
      isSuspended: false,
      action: 'USER_ACCOUNT_RESTORED',
    });

    // Verify in PostgreSQL database
    const dbUser = await app.prisma.user.findUnique({ where: { id: customerId } });
    expect(dbUser?.isSuspended).toBe(false);
  });

  it('5. allows reactivated customer to log in again with 200 OK', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: customerEmail,
        password: rawPassword,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('6. prevents admin from suspending another platform administrator (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${adminId}/suspend`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        suspend: true,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('Platform administrators cannot be suspended');
  });
});
