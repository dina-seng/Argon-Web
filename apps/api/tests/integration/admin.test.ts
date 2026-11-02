/**
 * tests/integration/admin.test.ts – Integration test suite for Platform Super-Admin Governance.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role, TicketStatus } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('Admin Governance Module (/api/v1/admin)', () => {
  let app: FastifyInstance;

  const adminId = '11111111-1111-4111-8111-111111111111';
  const organizerId = '22222222-2222-4222-8222-222222222222';
  const customerId = '33333333-3333-4333-8333-333333333333';
  const targetUserId = '44444444-4444-4444-8444-444444444444';
  const bookingId = '55555555-5555-4555-8555-555555555555';
  const tierId = '66666666-6666-4666-8666-666666666666';
  const eventId = '77777777-7777-4777-8777-777777777777';

  let adminToken: string;
  let organizerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await buildApp();

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'admin@argon.kh',
      role: Role.ADMIN,
    });

    organizerToken = app.jwt.sign({
      sub: organizerId,
      email: 'organizer@argon.kh',
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

  describe('RBAC Security Boundaries', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 403 Forbidden when CUSTOMER accesses /api/v1/admin/metrics/overview', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    });

    it('returns 403 Forbidden when ORGANIZER accesses /api/v1/admin/metrics/overview', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
        headers: {
          authorization: `Bearer ${organizerToken}`,
        },
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
        headers: {
          authorization: `Bearer ${organizerToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 403 Forbidden when CUSTOMER attempts role promotion', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: { role: 'ADMIN' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 401 Unauthorized when unauthenticated accessing /api/v1/admin/bookings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bookings',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 403 Forbidden when CUSTOMER accesses /api/v1/admin/bookings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bookings',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 403 Forbidden when ORGANIZER accesses /api/v1/admin/bookings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bookings',
        headers: {
          authorization: `Bearer ${organizerToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/admin/metrics/overview', () => {
    it('returns 200 OK with aggregated platform metrics for ADMIN', async () => {
      vi.spyOn(app.prisma.booking, 'count').mockResolvedValueOnce(42 as any);
      vi.spyOn(app.prisma.booking, 'findMany').mockResolvedValueOnce([
        { quantity: 2, tier: { price: 25.0 } },
        { quantity: 1, tier: { price: 50.0 } },
      ] as any);
      vi.spyOn(app.prisma.booking, 'aggregate').mockResolvedValueOnce({
        _sum: { quantity: 120 },
      } as any);
      vi.spyOn(app.prisma.event, 'count').mockResolvedValueOnce(5 as any);
      vi.spyOn(app.prisma.ticket, 'count').mockResolvedValueOnce(38 as any);
      vi.spyOn(app.prisma.user, 'groupBy').mockResolvedValueOnce([
        { role: Role.CUSTOMER, _count: { _all: 80 } },
        { role: Role.ORGANIZER, _count: { _all: 5 } },
        { role: Role.ADMIN, _count: { _all: 2 } },
      ] as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toMatchObject({
        totalPaidBookings: 42,
        grossRevenue: 100,
        gmv: 100,
        totalTicketsSold: 120,
        activeEventsCount: 5,
        doorCheckInCount: 38,
        usersByRole: {
          CUSTOMER: 80,
          ORGANIZER: 5,
          ADMIN: 2,
        },
      });
      expect(Array.isArray(data.dailyVelocity)).toBe(true);
      expect(data.dailyVelocity.length).toBe(7);
    });

    it('returns DOWN for database status when database ping throws error', async () => {
      vi.spyOn(app.prisma.booking, 'count').mockResolvedValueOnce(0 as any);
      vi.spyOn(app.prisma.booking, 'findMany').mockResolvedValueOnce([] as any);
      vi.spyOn(app.prisma.booking, 'aggregate').mockResolvedValueOnce({ _sum: { quantity: 0 } } as any);
      vi.spyOn(app.prisma.event, 'count').mockResolvedValueOnce(0 as any);
      vi.spyOn(app.prisma.ticket, 'count').mockResolvedValueOnce(0 as any);
      vi.spyOn(app.prisma.user, 'groupBy').mockResolvedValueOnce([] as any);
      vi.spyOn(app.prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection lost'));

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/metrics/overview',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.systemHealth.database.status).toBe('DOWN');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('returns 200 OK with paginated users list excluding password', async () => {
      const mockUsers = [
        {
          id: targetUserId,
          email: 'sokha@cadt.edu.kh',
          name: 'Sokha Chen',
          role: Role.CUSTOMER,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(app.prisma.user, 'findMany').mockResolvedValueOnce(mockUsers as any);
      vi.spyOn(app.prisma.user, 'count').mockResolvedValueOnce(1 as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?role=CUSTOMER&page=1&limit=10',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].email).toBe('sokha@cadt.edu.kh');
      expect(data.data[0].password).toBeUndefined();
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
    });
  });

  describe('GET /api/v1/admin/bookings', () => {
    it('returns 200 OK with paginated bookings and relations for ADMIN', async () => {
      const mockBookings = [
        {
          id: bookingId,
          userId: customerId,
          eventId,
          tierId,
          status: 'PENDING',
          quantity: 2,
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          paymentReference: 'KHQR_TEST_REF_123',
          gatewayTransactionId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: customerId,
            name: 'Dara Heng',
            email: 'dara.heng@gmail.com',
          },
          event: {
            id: eventId,
            title: 'BarCamp Phnom Penh 2026',
          },
          tier: {
            id: tierId,
            name: 'VIP Developer Pass',
            price: 75.0,
          },
          tickets: [
            { id: 'ticket-1', status: TicketStatus.ACTIVE },
            { id: 'ticket-2', status: TicketStatus.ACTIVE },
          ],
        },
      ];

      vi.spyOn(app.prisma.booking, 'findMany').mockResolvedValueOnce(mockBookings as any);
      vi.spyOn(app.prisma.booking, 'count').mockResolvedValueOnce(1 as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bookings?status=PENDING&limit=10&offset=0',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.bookings)).toBe(true);
      expect(body.bookings).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.bookings[0].id).toBe(bookingId);
      expect(body.bookings[0].user.email).toBe('dara.heng@gmail.com');
      expect(body.bookings[0].event.title).toBe('BarCamp Phnom Penh 2026');
      expect(body.bookings[0].tier.name).toBe('VIP Developer Pass');
      expect(body.bookings[0].tickets).toHaveLength(2);
    });

    it('filters bookings by search query and status', async () => {
      const findManySpy = vi.spyOn(app.prisma.booking, 'findMany').mockResolvedValueOnce([] as any);
      const countSpy = vi.spyOn(app.prisma.booking, 'count').mockResolvedValueOnce(0 as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bookings?status=PENDING&search=Dara&limit=5&offset=10',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.bookings).toEqual([]);
      expect(body.total).toBe(0);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            OR: [
              { user: { name: { contains: 'Dara', mode: 'insensitive' } } },
              { user: { email: { contains: 'Dara', mode: 'insensitive' } } },
              { event: { title: { contains: 'Dara', mode: 'insensitive' } } },
            ],
          }),
          skip: 10,
          take: 5,
        })
      );
      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            OR: [
              { user: { name: { contains: 'Dara', mode: 'insensitive' } } },
              { user: { email: { contains: 'Dara', mode: 'insensitive' } } },
              { event: { title: { contains: 'Dara', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });
  });

  describe('PATCH /api/v1/admin/users/:userId/role', () => {
    it('updates user role and creates an audit log entry for role promotion', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.user, 'findUnique').mockResolvedValueOnce({
        id: targetUserId,
        email: 'user@argon.kh',
        name: 'Target User',
        role: Role.CUSTOMER,
      } as any);

      vi.spyOn(app.prisma.user, 'update').mockResolvedValueOnce({
        id: targetUserId,
        email: 'user@argon.kh',
        name: 'Target User',
        role: Role.ORGANIZER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const auditLogSpy = vi
        .spyOn(app.prisma.auditLog, 'create')
        .mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'ORGANIZER',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().role).toBe('ORGANIZER');
      expect(auditLogSpy).toHaveBeenCalledWith({
        data: {
          actorId: adminId,
          action: 'USER_ROLE_PROMOTED',
          entity: 'User',
          entityId: targetUserId,
          metadata: {
            previousRole: Role.CUSTOMER,
            newRole: Role.ORGANIZER,
          },
        },
      });
    });

    it('returns 404 when target user is not found', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.user, 'findUnique').mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'ORGANIZER',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/admin/bookings/:bookingId/force-confirm', () => {
    it('force-confirms a PENDING booking, generates tickets, and creates an audit log', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const pendingBooking = {
        id: bookingId,
        userId: customerId,
        eventId,
        tierId,
        status: 'PENDING',
        quantity: 2,
        tier: { id: tierId, soldCount: 10, capacity: 50 },
        tickets: [],
      };

      vi.spyOn(app.prisma.booking, 'findUnique')
        .mockResolvedValueOnce(pendingBooking as any)
        .mockResolvedValueOnce({
          ...pendingBooking,
          status: 'PAID',
          tickets: [
            { id: 't-1', qrToken: 'argon_force_1' },
            { id: 't-2', qrToken: 'argon_force_2' },
          ],
        } as any);

      const bookingUpdateSpy = vi
        .spyOn(app.prisma.booking, 'update')
        .mockResolvedValueOnce({} as any);
      const ticketCreateManySpy = vi
        .spyOn(app.prisma.ticket, 'createMany')
        .mockResolvedValueOnce({ count: 2 } as any);
      const tierUpdateSpy = vi
        .spyOn(app.prisma.ticketTier, 'update')
        .mockResolvedValueOnce({} as any);
      const auditLogSpy = vi
        .spyOn(app.prisma.auditLog, 'create')
        .mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
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
            eventId,
            status: TicketStatus.ACTIVE,
            qrToken: expect.stringMatching(/^[0-9a-f-]+:[0-9a-f]{64}$/),
          }),
        ]),
      });
      expect(tierUpdateSpy).toHaveBeenCalledWith({
        where: { id: tierId },
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

    it('returns existing booking idempotently when status is already PAID', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const alreadyPaidBooking = {
        id: bookingId,
        userId: customerId,
        eventId,
        tierId,
        status: 'PAID',
        quantity: 1,
        tier: { id: tierId, soldCount: 11, capacity: 50 },
        tickets: [{ id: 't-1', qrToken: 'argon_force_existing' }],
      };

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce(
        alreadyPaidBooking as any
      );
      const bookingUpdateSpy = vi.spyOn(app.prisma.booking, 'update');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PAID');
      expect(bookingUpdateSpy).not.toHaveBeenCalled();
    });

    it('returns 400 Bad Request when attempting to force-confirm a CANCELLED booking', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce({
        id: bookingId,
        status: 'CANCELLED',
        quantity: 1,
        tier: { id: tierId },
        tickets: [],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/force-confirm`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/cannot force-confirm a cancelled booking/i);
    });
  });

  describe('POST /api/v1/admin/bookings/:bookingId/refund', () => {
    it('refunds a PAID booking, revokes tickets, decrements soldCount, and creates audit log', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      const paidBooking = {
        id: bookingId,
        userId: customerId,
        eventId,
        tierId,
        status: 'PAID',
        quantity: 2,
        tier: { id: tierId, soldCount: 12, capacity: 50 },
        tickets: [{ id: 't-1', status: 'ACTIVE' }, { id: 't-2', status: 'ACTIVE' }],
      };

      vi.spyOn(app.prisma.booking, 'findUnique')
        .mockResolvedValueOnce(paidBooking as any)
        .mockResolvedValueOnce({
          ...paidBooking,
          status: 'REFUNDED',
        } as any);

      const bookingUpdateSpy = vi
        .spyOn(app.prisma.booking, 'update')
        .mockResolvedValueOnce({} as any);
      const ticketUpdateManySpy = vi
        .spyOn(app.prisma.ticket, 'updateMany')
        .mockResolvedValueOnce({ count: 2 } as any);
      const tierUpdateSpy = vi
        .spyOn(app.prisma.ticketTier, 'update')
        .mockResolvedValueOnce({} as any);
      const auditLogSpy = vi
        .spyOn(app.prisma.auditLog, 'create')
        .mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
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
        where: { id: tierId },
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

    it('returns 400 Bad Request when booking is not in PAID status', async () => {
      vi.spyOn(app.prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(app.prisma);
      });

      vi.spyOn(app.prisma.booking, 'findUnique').mockResolvedValueOnce({
        id: bookingId,
        status: 'PENDING',
        quantity: 1,
        tier: { id: tierId },
        tickets: [],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/bookings/${bookingId}/refund`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toMatch(/cannot refund/i);
    });
  });

  describe('GET /api/v1/admin/audit', () => {
    it('returns 200 OK with paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          actorId: adminId,
          action: 'USER_ROLE_PROMOTED',
          entity: 'User',
          entityId: targetUserId,
          metadata: { previousRole: 'CUSTOMER', newRole: 'ORGANIZER' },
          createdAt: new Date().toISOString(),
          actor: {
            id: adminId,
            email: 'admin@argon.kh',
            name: 'Platform Administrator',
            role: Role.ADMIN,
          },
        },
      ];

      vi.spyOn(app.prisma.auditLog, 'findMany').mockResolvedValueOnce(mockLogs as any);
      vi.spyOn(app.prisma.auditLog, 'count').mockResolvedValueOnce(1 as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit?page=1&limit=20',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].action).toBe('USER_ROLE_PROMOTED');
      expect(data.data[0].actor.email).toBe('admin@argon.kh');
      expect(data.total).toBe(1);
    });
  });

  describe('GET /api/v1/admin/events', () => {
    it('returns 200 OK with paginated events for ADMIN', async () => {
      const mockEvents = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'BarCamp Cambodia 2026',
          description: 'Tech conference',
          venue: 'CADT Hall',
          startsAt: new Date(),
          status: 'PUBLISHED',
          category: 'TECH',
          coverImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizer: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'BarCamp Team',
            email: 'barcamp@argon.kh',
          },
          tiers: [
            {
              id: 'tier-1',
              name: 'General',
              price: 10,
              capacity: 100,
              soldCount: 20,
              reservedCount: 0,
            },
          ],
          _count: { bookings: 15 },
        },
      ];

      vi.spyOn(app.prisma.event, 'findMany').mockResolvedValueOnce(mockEvents as any);
      vi.spyOn(app.prisma.event, 'count').mockResolvedValueOnce(1 as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/events?page=1&limit=20',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('BarCamp Cambodia 2026');
      expect(data.data[0].totalCapacity).toBe(100);
      expect(data.data[0].totalSold).toBe(20);
      expect(data.total).toBe(1);
    });
  });

  describe('PATCH /api/v1/admin/events/:eventId/status', () => {
    it('updates event status and logs to audit trail', async () => {
      const eventId = '11111111-1111-1111-1111-111111111111';

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce({
        id: eventId,
        title: 'BarCamp Cambodia',
        status: 'DRAFT',
      } as any);

      vi.spyOn(app.prisma.event, 'update').mockResolvedValueOnce({
        id: eventId,
        title: 'BarCamp Cambodia',
        status: 'PUBLISHED',
        organizer: { id: 'org-1', name: 'BarCamp', email: 'barcamp@argon.kh' },
        tiers: [],
      } as any);

      vi.spyOn(app.prisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/events/${eventId}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          status: 'PUBLISHED',
          reason: 'Approved for public discovery',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PUBLISHED');
    });
  });

  describe('POST /api/v1/admin/tickets/:ticketId/check-in-override', () => {
    it('overrides ticket check-in at the door for ADMIN', async () => {
      const ticketId = '33333333-3333-3333-3333-333333333333';

      vi.spyOn(app.prisma.ticket, 'findUnique').mockResolvedValueOnce({
        id: ticketId,
        status: 'ACTIVE',
        bookingId: 'book-1',
        eventId: 'event-1',
      } as any);

      vi.spyOn(app.prisma.ticket, 'update').mockResolvedValueOnce({
        id: ticketId,
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInBy: adminId,
      } as any);

      vi.spyOn(app.prisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/tickets/${ticketId}/check-in-override`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('CHECKED_IN');
    });
  });
});
