/**
 * tests/integration/admin-audit-fixes.test.ts
 *
 * Empirical regression suite verifying the resolution of all audit integrity leaks:
 * 1. Timeframe velocity filtering (7D, 30D, dynamic days)
 * 2. Orders search expansion (by Booking UUID, Payment Ref, QR token)
 * 3. Audit logs action matching (EVENT_STATUS_*, TICKET_CHECKED_IN_OVERRIDE, USER_ROLE_*, USER_ACCOUNT_*)
 * 4. Immediate token revocation on user suspension via Redis blacklist
 * 5. Removal of cosmetic 'Ticket QR Crypto Worker' from health services
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role, EventStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildApp } from '../../src/app';

describe('Admin Audit Fixes Verification Suite (Zero Mocks)', () => {
  let app: FastifyInstance;

  const adminId = '81000000-0000-4000-8000-000000000001';
  const organizerId = '81000000-0000-4000-8000-000000000002';
  const targetCustomerId = '81000000-0000-4000-8000-000000000003';

  const eventId = '81000000-0000-4000-8000-000000000010';
  const tierId = '81000000-0000-4000-8000-000000000020';
  const bookingId = '81000000-0000-4000-8000-000000000030';
  const ticketId = '81000000-0000-4000-8000-000000000040';
  const uniquePaymentRef = 'KHQR_UNIQUE_AUDIT_FIX_REF_999';
  const uniqueQrToken = 'TOKEN_UNIQUE_AUDIT_FIX_QR_888';

  let adminToken: string;
  let targetCustomerToken: string;

  beforeAll(async () => {
    app = await buildApp();

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'audit-admin@argon.kh',
      role: Role.ADMIN,
    });

    targetCustomerToken = app.jwt.sign({
      sub: targetCustomerId,
      email: 'target-customer@argon.kh',
      role: Role.CUSTOMER,
    });

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Clean prior fixtures in PostgreSQL & Redis
    if (app.redis && typeof app.redis.del === 'function') {
      await app.redis.del(`revoked:user:${targetCustomerId}`);
    }

    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: { in: [adminId, organizerId, targetCustomerId, eventId, bookingId, ticketId] } },
        ],
      },
    });
    await app.prisma.ticket.deleteMany({ where: { eventId } });
    await app.prisma.booking.deleteMany({ where: { eventId } });
    await app.prisma.ticketTier.deleteMany({ where: { eventId } });
    await app.prisma.event.deleteMany({ where: { id: eventId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [adminId, organizerId, targetCustomerId] } } });

    // Seed test users
    await app.prisma.user.createMany({
      data: [
        {
          id: adminId,
          email: 'audit-admin@argon.kh',
          name: 'Audit Admin',
          password: passwordHash,
          role: Role.ADMIN,
        },
        {
          id: organizerId,
          email: 'audit-organizer@argon.kh',
          name: 'Audit Organizer',
          password: passwordHash,
          role: Role.ORGANIZER,
        },
        {
          id: targetCustomerId,
          email: 'target-customer@argon.kh',
          name: 'Target Customer',
          password: passwordHash,
          role: Role.CUSTOMER,
          isSuspended: false,
        },
      ],
    });

    // Seed event & tier
    await app.prisma.event.create({
      data: {
        id: eventId,
        organizerId,
        title: 'Audit Fixes Verification Expo',
        description: 'Verifying ground truth audit resolutions',
        venue: 'Audit Hall Alpha',
        startsAt: new Date(Date.now() + 86400000 * 5),
        status: EventStatus.PUBLISHED,
      },
    });

    await app.prisma.ticketTier.create({
      data: {
        id: tierId,
        eventId,
        name: 'Audit Pass Tier',
        price: 25.0,
        capacity: 100,
        soldCount: 1,
        reservedCount: 0,
      },
    });

    // Seed paid booking with unique payment ref and ticket
    await app.prisma.booking.create({
      data: {
        id: bookingId,
        userId: targetCustomerId,
        eventId,
        tierId,
        quantity: 1,
        status: 'PAID',
        paymentReference: uniquePaymentRef,
      },
    });

    await app.prisma.ticket.create({
      data: {
        id: ticketId,
        bookingId,
        eventId,
        status: 'ACTIVE',
        qrToken: uniqueQrToken,
      },
    });
  });

  afterAll(async () => {
    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: { in: [adminId, organizerId, targetCustomerId, eventId, bookingId, ticketId] } },
        ],
      },
    });
    await app.prisma.ticket.deleteMany({ where: { eventId } });
    await app.prisma.booking.deleteMany({ where: { eventId } });
    await app.prisma.ticketTier.deleteMany({ where: { eventId } });
    await app.prisma.event.deleteMany({ where: { id: eventId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [adminId, organizerId, targetCustomerId] } } });
    if (app.redis && typeof app.redis.del === 'function') {
      await app.redis.del(`revoked:user:${targetCustomerId}`);
    }
    await app.close();
  });

  it('1. GET /metrics/overview?timeRange=30D returns a 30-day velocity array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics/overview?timeRange=30D',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.dailyVelocity)).toBe(true);
    expect(body.dailyVelocity.length).toBe(30);
  });

  it('2. GET /metrics/overview?days=14 returns a 14-day velocity array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics/overview?days=14',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dailyVelocity.length).toBe(14);
  });

  it('3. GET /bookings?search=<UUID> finds booking by exact booking ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/bookings?search=${bookingId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bookings.length).toBe(1);
    expect(body.bookings[0].id).toBe(bookingId);
  });

  it('4. GET /bookings?search=<paymentRef> finds booking by payment reference', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/bookings?search=${uniquePaymentRef}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bookings.length).toBe(1);
    expect(body.bookings[0].paymentRef).toBe(uniquePaymentRef);
  });

  it('5. GET /bookings?search=<qrToken> finds booking by ticket QR token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/bookings?search=${uniqueQrToken}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bookings.length).toBe(1);
    expect(body.bookings[0].id).toBe(bookingId);
  });

  it('6. GET /audit?action=EVENT_STATUS_UPDATED matches EVENT_STATUS_* prefix', async () => {
    // Generate an event status audit log
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/events/${eventId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'DRAFT', reason: 'Testing audit log query' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit?action=EVENT_STATUS_UPDATED',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].action).toMatch(/^EVENT_STATUS_/);
  });

  it('7. GET /audit?action=TICKET_CHECKED_IN matches TICKET_CHECKED_IN_OVERRIDE', async () => {
    // Generate check-in override audit log
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/tickets/${ticketId}/check-in-override`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit?action=TICKET_CHECKED_IN',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((l: any) => l.action === 'TICKET_CHECKED_IN_OVERRIDE')).toBe(true);
  });

  it('8. POST /users/:id/suspend { suspend: true } immediately invalidates active JWT bearer tokens', async () => {
    // First, verify targetCustomerToken works before suspension
    const preRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${targetCustomerToken}` },
    });
    // In this repo, /auth/me or similar authenticated endpoint checks authenticate
    // If /auth/me doesn't exist, testing against an authenticated route
    const testAuthRoute = async () => {
      return await app.inject({
        method: 'GET',
        url: '/tickets/my',
        headers: { authorization: `Bearer ${targetCustomerToken}` },
      });
    };

    const beforeSuspension = await testAuthRoute();
    expect(beforeSuspension.statusCode).not.toBe(401);

    // Suspend the user
    const suspendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${targetCustomerId}/suspend`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { suspend: true, reason: 'Suspended for security test' },
    });
    expect(suspendRes.statusCode).toBe(200);

    // Verify immediate token rejection with 401 Unauthorized
    const afterSuspension = await testAuthRoute();
    expect(afterSuspension.statusCode).toBe(401);
    expect(afterSuspension.json().message).toMatch(/suspended/i);

    // Reactivate the user
    const reactivateRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${targetCustomerId}/suspend`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { suspend: false, reason: 'Reactivated for security test' },
    });
    expect(reactivateRes.statusCode).toBe(200);

    // Verify token works again
    const afterReactivation = await testAuthRoute();
    expect(afterReactivation.statusCode).not.toBe(401);
  });

  it('9. GET /system/health omits the cosmetic Ticket QR Crypto Worker entry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/system/health',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const serviceNames = (body.services || []).map((s: any) => s.name);
    expect(serviceNames).not.toContain('Ticket QR Crypto Worker');
    expect(serviceNames).toContain('Core API Fastify Engine');
    expect(serviceNames).toContain('PostgreSQL Relational Storage');
  });
});
