/**
 * tests/integration/admin-real-db.test.ts
 *
 * Authoritative End-to-End Real-Database Test Suite for Admin Governance.
 * ZERO MOCK SPIES: All queries, aggregations, and ACID transactions execute
 * directly against the live PostgreSQL database.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role, TicketStatus, EventStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildApp } from '../../src/app';
import { verifyHmacSignature } from '../../src/lib/hmac';
import { env } from '../../src/config/env';

describe('Admin Governance Real-Database Suite (Zero Mocks)', () => {
  let app: FastifyInstance;

  // Identity UUIDs
  const adminId = '90000000-0000-4000-8000-000000000001';
  const organizerId = '90000000-0000-4000-8000-000000000002';
  const customerId = '90000000-0000-4000-8000-000000000003';

  // Domain Entity UUIDs
  const eventId = '90000000-0000-4000-8000-000000000010';
  const tierId = '90000000-0000-4000-8000-000000000020';
  const bookingId = '90000000-0000-4000-8000-000000000030';
  const refundBookingId = '90000000-0000-4000-8000-000000000031';

  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'realdb-admin@argon.kh',
      role: Role.ADMIN,
    });

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Idempotency cleanup: remove prior fixtures
    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: { in: [customerId, organizerId, eventId, bookingId, refundBookingId] } },
        ],
      },
    });
    await app.prisma.ticket.deleteMany({
      where: { eventId },
    });
    await app.prisma.booking.deleteMany({
      where: { eventId },
    });
    await app.prisma.ticketTier.deleteMany({
      where: { eventId },
    });
    await app.prisma.event.deleteMany({
      where: { id: eventId },
    });
    await app.prisma.user.deleteMany({
      where: { id: { in: [adminId, organizerId, customerId] } },
    });

    // 2. Seed real users
    await app.prisma.user.createMany({
      data: [
        {
          id: adminId,
          email: 'realdb-admin@argon.kh',
          name: 'Real Admin Root',
          password: passwordHash,
          role: Role.ADMIN,
        },
        {
          id: organizerId,
          email: 'realdb-organizer@argon.kh',
          name: 'Real Event Organizer',
          password: passwordHash,
          role: Role.ORGANIZER,
        },
        {
          id: customerId,
          email: 'realdb-customer@argon.kh',
          name: 'Real Test Customer',
          password: passwordHash,
          role: Role.CUSTOMER,
        },
      ],
    });

    // 3. Seed real event and tier
    await app.prisma.event.create({
      data: {
        id: eventId,
        organizerId,
        title: 'Real DB Test Expo 2026',
        description: 'End-to-end integration test event',
        venue: 'Phnom Penh Convention Hall',
        startsAt: new Date(Date.now() + 86400000 * 7),
        status: EventStatus.DRAFT,
      },
    });

    await app.prisma.ticketTier.create({
      data: {
        id: tierId,
        eventId,
        name: 'VIP All-Access',
        price: 50.0,
        capacity: 100,
        soldCount: 0,
        reservedCount: 0,
      },
    });

    // 4. Seed real pending booking
    await app.prisma.booking.create({
      data: {
        id: bookingId,
        userId: customerId,
        eventId,
        tierId,
        quantity: 2,
        status: 'PENDING',
        paymentReference: 'KHQR_REAL_TEST_REF_1',
      },
    });

    // 5. Seed a paid booking ready for refund
    await app.prisma.booking.create({
      data: {
        id: refundBookingId,
        userId: customerId,
        eventId,
        tierId,
        quantity: 1,
        status: 'PAID',
        paymentReference: 'KHQR_REAL_TEST_REF_2',
      },
    });

    // Update tier soldCount for the pre-seeded paid booking
    await app.prisma.ticketTier.update({
      where: { id: tierId },
      data: { soldCount: 1 },
    });

    // Create 1 ticket for the paid booking
    await app.prisma.ticket.create({
      data: {
        id: '90000000-0000-4000-8000-000000000099',
        bookingId: refundBookingId,
        eventId,
        status: TicketStatus.ACTIVE,
        qrToken: '90000000-0000-4000-8000-000000000099:signature',
      },
    });
  });

  afterAll(async () => {
    // Teardown test fixtures
    await app.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: adminId },
          { entityId: { in: [customerId, organizerId, eventId, bookingId, refundBookingId] } },
        ],
      },
    });
    await app.prisma.ticket.deleteMany({ where: { eventId } });
    await app.prisma.booking.deleteMany({ where: { eventId } });
    await app.prisma.ticketTier.deleteMany({ where: { eventId } });
    await app.prisma.event.deleteMany({ where: { id: eventId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [adminId, organizerId, customerId] } } });
    await app.close();
  });

  it('1. GET /metrics/overview calculates real database aggregations and daily velocity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics/overview',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalPaidBookings).toBeGreaterThanOrEqual(1);
    expect(body.grossRevenue).toBeGreaterThanOrEqual(50);
    expect(body.systemHealth.database.status).toBe('HEALTHY');
    expect(Array.isArray(body.dailyVelocity)).toBe(true);
    expect(body.dailyVelocity.length).toBe(7);
  });

  it('2. PATCH /events/:id/status mutates event status and writes audit log in PostgreSQL', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/events/${eventId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'PUBLISHED',
        reason: 'Event listing approved by platform auditor',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('PUBLISHED');

    // Verify PostgreSQL entity mutation
    const dbEvent = await app.prisma.event.findUnique({ where: { id: eventId } });
    expect(dbEvent?.status).toBe('PUBLISHED');

    // Verify audit log record
    const audit = await app.prisma.auditLog.findFirst({
      where: { entity: 'Event', entityId: eventId },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit?.action).toBe('EVENT_STATUS_PUBLISHED');
  });

  it('3. POST /bookings/:id/force-confirm generates valid HMAC tickets & increments tier soldCount in PostgreSQL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('PAID');

    // Verify PostgreSQL booking status
    const dbBooking = await app.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tickets: true, tier: true },
    });
    expect(dbBooking?.status).toBe('PAID');
    expect(dbBooking?.tickets.length).toBe(2);

    // Verify HMAC cryptographic signature on generated tickets
    for (const t of dbBooking!.tickets) {
      expect(t.status).toBe(TicketStatus.ACTIVE);
      const [ticketId, signature] = t.qrToken.split(':');
      expect(verifyHmacSignature(ticketId, signature, env.QR_HMAC_SECRET)).toBe(true);
    }

    // Verify tier soldCount incremented by quantity 2 (1 previous + 2 = 3)
    const dbTier = await app.prisma.ticketTier.findUnique({ where: { id: tierId } });
    expect(dbTier?.soldCount).toBe(3);
  });

  it('4. POST /tickets/:id/check-in-override sets CHECKED_IN and stamps checkedInBy admin in PostgreSQL', async () => {
    const tickets = await app.prisma.ticket.findMany({ where: { bookingId } });
    const targetTicket = tickets[0];
    expect(targetTicket).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/tickets/${targetTicket.id}/check-in-override`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe(TicketStatus.CHECKED_IN);

    // Verify PostgreSQL ticket state
    const dbTicket = await app.prisma.ticket.findUnique({ where: { id: targetTicket.id } });
    expect(dbTicket?.status).toBe(TicketStatus.CHECKED_IN);
    expect(dbTicket?.checkedInBy).toBe(adminId);
    expect(dbTicket?.checkedInAt).toBeDefined();
  });

  it('5. POST /bookings/:id/refund revokes tickets and decrements soldCount in PostgreSQL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/bookings/${refundBookingId}/refund`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('REFUNDED');

    // Verify tickets revoked
    const tickets = await app.prisma.ticket.findMany({ where: { bookingId: refundBookingId } });
    for (const t of tickets) {
      expect(t.status).toBe(TicketStatus.REVOKED);
    }

    // Verify tier soldCount decremented by 1 (3 - 1 = 2)
    const dbTier = await app.prisma.ticketTier.findUnique({ where: { id: tierId } });
    expect(dbTier?.soldCount).toBe(2);
  });

  it('6. PATCH /users/:id/role updates role in PostgreSQL and records USER_ROLE_PROMOTED audit', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${customerId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'ORGANIZER' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe(Role.ORGANIZER);

    const dbUser = await app.prisma.user.findUnique({ where: { id: customerId } });
    expect(dbUser?.role).toBe(Role.ORGANIZER);

    const audit = await app.prisma.auditLog.findFirst({
      where: { entity: 'User', entityId: customerId },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit?.action).toBe('USER_ROLE_PROMOTED');
  });

  it('7. GET /system/health executes SELECT 1 and returns actual PostgreSQL entity counts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/system/health',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('OPERATIONAL');
    expect(body.database.status).toBe('HEALTHY');
    expect(body.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(body.database.counts.users).toBeGreaterThanOrEqual(3);
    expect(body.database.counts.events).toBeGreaterThanOrEqual(1);
    expect(body.database.counts.bookings).toBeGreaterThanOrEqual(2);
  });
});
