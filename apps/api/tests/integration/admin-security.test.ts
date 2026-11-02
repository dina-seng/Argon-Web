/**
 * tests/integration/admin-security.test.ts
 *
 * Security Boundary & Multi-Tenant Regression Suite for Argon Admin & Organizer Modules.
 * Verifies:
 * 1. Unauthenticated access enforcement (401 Unauthorized)
 * 2. Vertical privilege escalation protections across roles (403 Forbidden)
 * 3. Horizontal multi-tenant isolation between distinct event organizers (403 Forbidden)
 * 4. Platform Super-Admin privilege bypass across tenant boundaries (200 OK)
 * 5. Idempotent force-confirmation & transactional refund integrity (idempotent / 400 Bad Request)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role, TicketStatus } from '@prisma/client';
import { buildApp } from '../../src/app';
import { verifyHmacSignature } from '../../src/lib/hmac';
import { env } from '../../src/config/env';

describe('Security Boundary & Multi-Tenant Regression Suite', () => {
  let app: FastifyInstance;

  // Identity fixtures
  const adminId = '11111111-1111-4111-8111-111111111111';
  const organizerAId = '22222222-2222-4222-8222-222222222222';
  const organizerBId = '33333333-3333-4333-8333-333333333333';
  const customerId = '44444444-4444-4444-8444-444444444444';
  const targetUserId = '55555555-5555-4555-8555-555555555555';

  // Domain entity fixtures
  const eventAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const tierAId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const bookingId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  // JWT bearer tokens
  let adminToken: string;
  let organizerAToken: string;
  let organizerBToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await buildApp();

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'admin@argon.kh',
      role: Role.ADMIN,
    });

    organizerAToken = app.jwt.sign({
      sub: organizerAId,
      email: 'organizerA@argon.kh',
      role: Role.ORGANIZER,
    });

    organizerBToken = app.jwt.sign({
      sub: organizerBId,
      email: 'organizerB@argon.kh',
      role: Role.ORGANIZER,
    });

    customerToken = app.jwt.sign({
      sub: customerId,
      email: 'customer@argon.kh',
      role: Role.CUSTOMER,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Unauthenticated Access Tests ─────────────────────────────────────────
  describe('1. Unauthenticated Access Enforcement', () => {
    it('returns 401 Unauthorized for GET /api/v1/admin/metrics/overview without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for GET /api/v1/organizer/events/:eventId/metrics without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/metrics`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for GET /api/v1/admin/users without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for GET /api/v1/admin/audit without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for GET /api/v1/organizer/events/:eventId/attendees without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/attendees`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for PATCH /api/v1/organizer/events/:eventId/tiers/:tierId/quota without token', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organizer/events/${eventAId}/tiers/${tierAId}/quota`,
        payload: { capacity: 200 },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for POST /api/v1/admin/bookings/:bookingId/force-confirm without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for POST /api/v1/admin/bookings/:bookingId/refund without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for POST /api/v1/checkin/scan without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkin/scan',
        payload: { qrToken: 'test-token', scannedBy: 'Gate 1' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 401 Unauthorized for GET /api/v1/checkin/roster/:eventId without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/checkin/roster/${eventAId}`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });
  });

  // ── 2. Vertical Privilege Escalation Protection ─────────────────────────────
  describe('2. Vertical Privilege Escalation Protection', () => {
    describe('CUSTOMER Role Denials', () => {
      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/admin/metrics/overview', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/metrics/overview',
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/organizer/events/:eventId/metrics', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/organizer/events/${eventAId}/metrics`,
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/admin/users', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/users',
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/admin/audit', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit',
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER attempts role promotion on /api/v1/admin/users/:userId/role', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/users/${targetUserId}/role`,
          headers: { authorization: `Bearer ${customerToken}` },
          payload: { role: 'ADMIN' },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER calls /api/v1/organizer/events/:eventId/attendees', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/organizer/events/${eventAId}/attendees`,
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER attempts quota adjustment', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/organizer/events/${eventAId}/tiers/${tierAId}/quota`,
          headers: { authorization: `Bearer ${customerToken}` },
          payload: { capacity: 200 },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/checkin/scan', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/checkin/scan',
          headers: { authorization: `Bearer ${customerToken}` },
          payload: { qrToken: 'test-token', scannedBy: 'Gate 1' },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when CUSTOMER accesses /api/v1/checkin/roster/:eventId', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/checkin/roster/${eventAId}`,
          headers: { authorization: `Bearer ${customerToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });
    });

    describe('ORGANIZER Role Denials on Platform Admin Endpoints', () => {
      it('returns 403 Forbidden when ORGANIZER accesses /api/v1/admin/metrics/overview', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/metrics/overview',
          headers: { authorization: `Bearer ${organizerAToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when ORGANIZER accesses /api/v1/admin/users', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/users',
          headers: { authorization: `Bearer ${organizerAToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when ORGANIZER accesses /api/v1/admin/audit', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit',
          headers: { authorization: `Bearer ${organizerAToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when ORGANIZER attempts role changes on /api/v1/admin/users/:userId/role', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/users/${targetUserId}/role`,
          headers: { authorization: `Bearer ${organizerAToken}` },
          payload: { role: 'ADMIN' },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when ORGANIZER attempts booking force-confirm override', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
          headers: { authorization: `Bearer ${organizerAToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });

      it('returns 403 Forbidden when ORGANIZER attempts booking refund override', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/admin/bookings/${bookingId}/refund`,
          headers: { authorization: `Bearer ${organizerAToken}` },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      });
    });
  });

  // ── 3. Horizontal Multi-Tenant Isolation (Organizer A vs Organizer B) ─────
  describe('3. Horizontal Multi-Tenant Isolation (Organizer A vs Organizer B)', () => {
    const mockEventA = {
      id: eventAId,
      organizerId: organizerAId,
      title: 'Khmer Tech Conference 2026',
      tiers: [
        {
          id: tierAId,
          eventId: eventAId,
          name: 'General Admission',
          price: 50.0,
          capacity: 100,
          soldCount: 30,
          reservedCount: 5,
        },
      ],
      bookings: [
        {
          id: 'booking-a1',
          status: 'PAID',
          tickets: [
            { id: 't-1', status: TicketStatus.CHECKED_IN },
            { id: 't-2', status: TicketStatus.ACTIVE },
          ],
        },
      ],
    };

    it('returns 403 Forbidden when Organizer B attempts GET /api/v1/organizer/events/:eventAId/metrics', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEventA as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/metrics`,
        headers: { authorization: `Bearer ${organizerBToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'Forbidden',
        message: expect.stringMatching(/do not have access to this event/i),
      });
    });

    it('returns 403 Forbidden when Organizer B attempts PATCH /api/v1/organizer/events/:eventAId/tiers/:tierAId/quota', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEventA as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organizer/events/${eventAId}/tiers/${tierAId}/quota`,
        headers: { authorization: `Bearer ${organizerBToken}` },
        payload: { capacity: 150 },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'Forbidden',
        message: expect.stringMatching(/do not have access to this event/i),
      });
    });

    it('returns 403 Forbidden when Organizer B attempts GET /api/v1/organizer/events/:eventAId/attendees', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEventA as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/attendees`,
        headers: { authorization: `Bearer ${organizerBToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'Forbidden',
        message: expect.stringMatching(/do not have access to this event/i),
      });
    });

    it('returns 200 OK when Organizer A (owner) accesses own event metrics', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEventA as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/metrics`,
        headers: { authorization: `Bearer ${organizerAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.eventId).toBe(eventAId);
      expect(body.totalCapacity).toBe(100);
      expect(body.totalSold).toBe(30);
      expect(body.checkedInCount).toBe(1);
    });
  });

  // ── 4. Platform Admin Superuser Passthrough ─────────────────────────────────
  describe('4. Platform Admin Superuser Passthrough', () => {
    const mockEventA = {
      id: eventAId,
      organizerId: organizerAId,
      title: 'Khmer Tech Conference 2026',
      tiers: [
        {
          id: tierAId,
          eventId: eventAId,
          name: 'General Admission',
          price: 50.0,
          capacity: 100,
          soldCount: 40,
          reservedCount: 0,
        },
      ],
      bookings: [
        {
          id: 'booking-a1',
          status: 'PAID',
          tickets: [
            { id: 't-1', status: TicketStatus.CHECKED_IN },
            { id: 't-2', status: TicketStatus.CHECKED_IN },
          ],
        },
      ],
    };

    it('returns 200 OK when ADMIN accesses organizer metrics for Event A owned by Organizer A', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEventA as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/metrics`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.eventId).toBe(eventAId);
      expect(data.totalSold).toBe(40);
      expect(data.grossRevenue).toBe(2000);
      expect(data.checkedInCount).toBe(2);
    });

    it('returns 200 OK when ADMIN accesses organizer attendees roster for Event A owned by Organizer A', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce({
        id: eventAId,
        organizerId: organizerAId,
      } as any);

      vi.spyOn(app.prisma.ticket, 'count').mockResolvedValueOnce(1);
      vi.spyOn(app.prisma.ticket, 'findMany').mockResolvedValueOnce([
        {
          id: 'ticket-1',
          status: TicketStatus.CHECKED_IN,
          checkedInAt: new Date('2026-10-28T10:00:00Z'),
          bookingId: bookingId,
          booking: {
            id: bookingId,
            createdAt: new Date('2026-10-27T08:00:00Z'),
            user: {
              id: customerId,
              name: 'John Doe',
              email: 'john@argon.kh',
            },
            tier: {
              id: tierAId,
              name: 'General Admission',
              price: 50.0,
            },
          },
        },
      ] as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/organizer/events/${eventAId}/attendees`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.total).toBe(1);
      expect(data.attendees).toHaveLength(1);
      expect(data.attendees[0].user.email).toBe('john@argon.kh');
    });

    it('returns 200 OK when ADMIN overrides tier quota for Event A owned by Organizer A', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce({
        id: eventAId,
        organizerId: organizerAId,
      } as any);

      vi.spyOn(app.prisma.ticketTier, 'findUnique').mockResolvedValueOnce({
        id: tierAId,
        eventId: eventAId,
        name: 'General Admission',
        capacity: 100,
        soldCount: 40,
        price: 50.0,
      } as any);

      vi.spyOn(app.prisma.ticketTier, 'update').mockResolvedValueOnce({
        id: tierAId,
        eventId: eventAId,
        name: 'General Admission',
        capacity: 150,
        soldCount: 40,
        price: 50.0,
      } as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organizer/events/${eventAId}/tiers/${tierAId}/quota`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { capacity: 150 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().capacity).toBe(150);
    });
  });

  // ── 5. Idempotent Force-Confirm & Transactional Integrity ───────────────────
  describe('5. Idempotent Force-Confirm & Transactional Integrity', () => {
    it('succeeds idempotently when force-confirming a booking already in PAID status without duplicating tickets or sold count', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const alreadyPaidBooking = {
        id: bookingId,
        userId: customerId,
        eventId: eventAId,
        tierId: tierAId,
        status: 'PAID',
        quantity: 2,
        tier: { id: tierAId, capacity: 100, soldCount: 50 },
        tickets: [
          { id: 'ticket-1', qrToken: 'argon_force_existing_1', status: TicketStatus.ACTIVE },
          { id: 'ticket-2', qrToken: 'argon_force_existing_2', status: TicketStatus.ACTIVE },
        ],
      };

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce(alreadyPaidBooking as any);

      const bookingUpdateSpy = vi.spyOn(app.prisma.booking, 'update');
      const ticketCreateManySpy = vi.spyOn(app.prisma.ticket, 'createMany');
      const tierUpdateSpy = vi.spyOn(app.prisma.ticketTier, 'update');
      const auditLogSpy = vi.spyOn(app.prisma.auditLog, 'create');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PAID');

      // Idempotency assertions: no duplicate provisioning, no counter increments, no duplicate audit records
      expect(bookingUpdateSpy).not.toHaveBeenCalled();
      expect(ticketCreateManySpy).not.toHaveBeenCalled();
      expect(tierUpdateSpy).not.toHaveBeenCalled();
      expect(auditLogSpy).not.toHaveBeenCalled();
    });

    it('atomically confirms a PENDING booking, creates exact tickets, increments sold count, and logs audit', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const pendingBooking = {
        id: bookingId,
        userId: customerId,
        eventId: eventAId,
        tierId: tierAId,
        status: 'PENDING',
        quantity: 2,
        tier: { id: tierAId, capacity: 100, soldCount: 40 },
        tickets: [],
      };

      const paidBooking = {
        ...pendingBooking,
        status: 'PAID',
        tickets: [
          { id: 't-1', qrToken: 'argon_force_1', status: TicketStatus.ACTIVE },
          { id: 't-2', qrToken: 'argon_force_2', status: TicketStatus.ACTIVE },
        ],
      };

      vi.spyOn(app.prisma.booking, 'findUnique')
        .mockResolvedValueOnce(pendingBooking as any)
        .mockResolvedValueOnce(paidBooking as any);

      const bookingUpdateSpy = vi.spyOn(app.prisma.booking, 'update').mockResolvedValueOnce({} as any);
      const ticketCreateManySpy = vi.spyOn(app.prisma.ticket, 'createMany').mockResolvedValueOnce({ count: 2 } as any);
      const tierUpdateSpy = vi.spyOn(app.prisma.ticketTier, 'update').mockResolvedValueOnce({} as any);
      const auditLogSpy = vi.spyOn(app.prisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PAID');

      expect(bookingUpdateSpy).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { status: 'PAID' },
      });
      expect(ticketCreateManySpy).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            bookingId,
            eventId: eventAId,
            status: TicketStatus.ACTIVE,
            qrToken: expect.stringMatching(/^[0-9a-f-]+:[0-9a-f]{64}$/),
          }),
        ]),
      });

      // Verify HMAC signatures of created tickets
      const createdTicketsCall = ticketCreateManySpy.mock.calls[0]?.[0]?.data as Array<{ id: string; qrToken: string }>;
      expect(createdTicketsCall).toHaveLength(2);
      for (const ticket of createdTicketsCall) {
        expect(verifyHmacSignature(ticket.qrToken, env.QR_HMAC_SECRET)).toBe(true);
      }
      expect(tierUpdateSpy).toHaveBeenCalledWith({
        where: { id: tierAId },
        data: { soldCount: { increment: 2 } },
      });
      expect(auditLogSpy).toHaveBeenCalledWith({
        data: {
          actorId: adminId,
          action: 'BOOKING_FORCE_CONFIRMED',
          entity: 'Booking',
          entityId: bookingId,
          metadata: { reason: 'Admin manual resolution' },
        },
      });
    });

    it('returns 400 Bad Request when attempting to force-confirm a CANCELLED booking', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce({
        id: bookingId,
        status: 'CANCELLED',
        quantity: 1,
        tier: { id: tierAId },
        tickets: [],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/cannot force-confirm a cancelled booking/i);
    });

    it('returns 400 Bad Request when attempting to refund a non-PAID booking (PENDING)', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce({
        id: bookingId,
        status: 'PENDING',
        quantity: 1,
        tier: { id: tierAId },
        tickets: [],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/cannot refund booking with status PENDING/i);
    });

    it('returns 400 Bad Request when attempting to refund a non-PAID booking (CANCELLED)', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce({
        id: bookingId,
        status: 'CANCELLED',
        quantity: 1,
        tier: { id: tierAId },
        tickets: [],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/cannot refund booking with status CANCELLED/i);
    });

    it('atomically refunds a PAID booking, sets REFUNDED status, revokes tickets, and decrements sold count', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const paidBooking = {
        id: bookingId,
        userId: customerId,
        eventId: eventAId,
        tierId: tierAId,
        status: 'PAID',
        quantity: 2,
        tier: { id: tierAId, capacity: 100, soldCount: 40 },
        tickets: [
          { id: 't-1', status: TicketStatus.ACTIVE },
          { id: 't-2', status: TicketStatus.ACTIVE },
        ],
      };

      vi.spyOn(app.prisma.booking, 'findUnique')
        .mockResolvedValueOnce(paidBooking as any)
        .mockResolvedValueOnce({
          ...paidBooking,
          status: 'REFUNDED',
        } as any);

      const bookingUpdateSpy = vi.spyOn(app.prisma.booking, 'update').mockResolvedValueOnce({} as any);
      const ticketUpdateManySpy = vi.spyOn(app.prisma.ticket, 'updateMany').mockResolvedValueOnce({ count: 2 } as any);
      const tierUpdateSpy = vi.spyOn(app.prisma.ticketTier, 'update').mockResolvedValueOnce({} as any);
      const auditLogSpy = vi.spyOn(app.prisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('REFUNDED');

      expect(bookingUpdateSpy).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { status: 'REFUNDED' },
      });
      expect(ticketUpdateManySpy).toHaveBeenCalledWith({
        where: { bookingId },
        data: { status: TicketStatus.REVOKED },
      });
      expect(tierUpdateSpy).toHaveBeenCalledWith({
        where: { id: tierAId },
        data: { soldCount: { decrement: 2 } },
      });
      expect(auditLogSpy).toHaveBeenCalledWith({
        data: {
          actorId: adminId,
          action: 'BOOKING_REFUNDED',
          entity: 'Booking',
          entityId: bookingId,
          metadata: { reason: 'Admin manual refund' },
        },
      });
    });
  });
});
