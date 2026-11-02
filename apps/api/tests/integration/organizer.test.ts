/**
 * tests/integration/organizer.test.ts – Integration test suite for Organizer Event Sales & Tier Quota Module.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role, TicketStatus } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('Organizer Module (/organizer)', () => {
  let app: FastifyInstance;

  const organizer1Id = '11111111-1111-4111-8111-111111111111';
  const organizer2Id = '22222222-2222-4222-8222-222222222222';
  const adminId = '33333333-3333-4333-8333-333333333333';
  const customerId = '44444444-4444-4444-8444-444444444444';

  const event1Id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const tier1Id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const tier2Id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  let organizer1Token: string;
  let organizer2Token: string;
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await buildApp();

    organizer1Token = app.jwt.sign({
      sub: organizer1Id,
      email: 'organizer1@argon.kh',
      role: Role.ORGANIZER,
    });

    organizer2Token = app.jwt.sign({
      sub: organizer2Id,
      email: 'organizer2@argon.kh',
      role: Role.ORGANIZER,
    });

    adminToken = app.jwt.sign({
      sub: adminId,
      email: 'admin@argon.kh',
      role: Role.ADMIN,
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
        url: `/organizer/events/${event1Id}/metrics`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 403 Forbidden when CUSTOMER accesses organizer metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/metrics`,
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

    it('returns 401 Unauthorized for GET /organizer/events without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/organizer/events',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('returns 403 Forbidden when CUSTOMER accesses GET /organizer/events', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/organizer/events',
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
  });

  describe('GET /organizer/events/:eventId/metrics', () => {
    it('returns 200 OK with accurately computed sales metrics for event owner', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
        title: 'Argon Tech Summit 2026',
        tiers: [
          {
            id: tier1Id,
            name: 'Early Bird',
            price: 25.0,
            capacity: 100,
            soldCount: 80,
            reservedCount: 10,
          },
          {
            id: tier2Id,
            name: 'VIP',
            price: 100.0,
            capacity: 50,
            soldCount: 20,
            reservedCount: 5,
          },
        ],
        bookings: [
          {
            id: 'booking-1',
            status: 'PAID',
            tickets: [
              { id: 't1', status: TicketStatus.CHECKED_IN },
              { id: 't2', status: TicketStatus.CHECKED_IN },
              { id: 't3', status: TicketStatus.ACTIVE },
            ],
          },
          {
            id: 'booking-2',
            status: 'PAID',
            tickets: [
              { id: 't4', status: TicketStatus.CHECKED_IN },
              { id: 't5', status: TicketStatus.ACTIVE },
            ],
          },
        ],
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);

      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/metrics`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      // totalCapacity: 100 + 50 = 150
      expect(data.totalCapacity).toBe(150);
      // totalSold: 80 + 20 = 100
      expect(data.totalSold).toBe(100);
      // totalReserved: 10 + 5 = 15
      expect(data.totalReserved).toBe(15);
      // grossRevenue: (80 * 25) + (20 * 100) = 2000 + 2000 = 4000
      expect(data.grossRevenue).toBe(4000);
      // checkedInCount: 3 tickets
      expect(data.checkedInCount).toBe(3);
      // checkInRate: (3 / 100) * 100 = 3%
      expect(data.checkInRate).toBe(3);

      expect(data.tiers).toHaveLength(2);
      expect(data.tiers[0]).toEqual({
        id: tier1Id,
        name: 'Early Bird',
        price: 25.0,
        capacity: 100,
        soldCount: 80,
        reservedCount: 10,
        available: 10, // 100 - 80 - 10
      });
      expect(data.tiers[1]).toEqual({
        id: tier2Id,
        name: 'VIP',
        price: 100.0,
        capacity: 50,
        soldCount: 20,
        reservedCount: 5,
        available: 25, // 50 - 20 - 5
      });
    });

    it('returns 403 Forbidden when unauthorized organizer accesses another organizer’s event', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id, // owned by organizer1
        title: 'Secret Summit',
        tiers: [],
        bookings: [],
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);

      // Accessed by organizer2
      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/metrics`,
        headers: {
          authorization: `Bearer ${organizer2Token}`,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have access to this event',
      });
    });

    it('returns 200 OK when ADMIN accesses another organizer’s event metrics', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
        title: 'Public Summit',
        tiers: [],
        bookings: [],
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);

      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/metrics`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Public Summit');
    });

    it('returns 404 Not Found when event does not exist', async () => {
      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(null as any);

      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/metrics`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Event not found',
      });
    });

    it('returns 400 Bad Request when eventId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/organizer/events/invalid-uuid/metrics',
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /organizer/events/:eventId/tiers/:tierId/quota', () => {
    it('returns 200 OK and updates tier capacity when capacity >= soldCount', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
      };
      const mockTier = {
        id: tier1Id,
        eventId: event1Id,
        name: 'Regular',
        price: 50.0,
        capacity: 100,
        soldCount: 40,
        reservedCount: 5,
      };
      const mockUpdatedTier = {
        ...mockTier,
        capacity: 120,
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);
      vi.spyOn(app.prisma.ticketTier, 'findUnique').mockResolvedValueOnce(mockTier as any);
      vi.spyOn(app.prisma.ticketTier, 'update').mockResolvedValueOnce(mockUpdatedTier as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/organizer/events/${event1Id}/tiers/${tier1Id}/quota`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
        payload: {
          capacity: 120,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().capacity).toBe(120);
    });

    it('returns 400 Bad Request when setting capacity lower than soldCount', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
      };
      const mockTier = {
        id: tier1Id,
        eventId: event1Id,
        name: 'Regular',
        price: 50.0,
        capacity: 100,
        soldCount: 40,
        reservedCount: 5,
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);
      vi.spyOn(app.prisma.ticketTier, 'findUnique').mockResolvedValueOnce(mockTier as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/organizer/events/${event1Id}/tiers/${tier1Id}/quota`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
        payload: {
          capacity: 35, // lower than soldCount (40)
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Capacity cannot be lower than sold count (40)',
      });
    });

    it('returns 403 Forbidden when unauthorized organizer tries to update quota', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id, // owned by organizer 1
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/organizer/events/${event1Id}/tiers/${tier1Id}/quota`,
        headers: {
          authorization: `Bearer ${organizer2Token}`,
        },
        payload: {
          capacity: 150,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have access to this event',
      });
    });

    it('returns 404 Not Found when tier does not belong to the event', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
      };
      const mockTier = {
        id: tier1Id,
        eventId: 'different-event-id',
        soldCount: 10,
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);
      vi.spyOn(app.prisma.ticketTier, 'findUnique').mockResolvedValueOnce(mockTier as any);

      const res = await app.inject({
        method: 'PATCH',
        url: `/organizer/events/${event1Id}/tiers/${tier1Id}/quota`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
        payload: {
          capacity: 50,
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Ticket tier not found for this event',
      });
    });
  });

  describe('GET /organizer/events/:eventId/attendees', () => {
    it('returns 200 OK with paginated attendees roster', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
      };

      const mockTickets = [
        {
          id: 'ticket-1',
          status: TicketStatus.ACTIVE,
          checkedInAt: null,
          bookingId: 'booking-1',
          createdAt: new Date().toISOString(),
          booking: {
            user: {
              id: 'user-1',
              name: 'Sorphea Tepy',
              email: 'tepy@cadt.edu.kh',
            },
            tier: {
              id: tier1Id,
              name: 'VIP',
              price: 100.0,
            },
          },
        },
      ];

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);
      vi.spyOn(app.prisma.ticket, 'findMany').mockResolvedValueOnce(mockTickets as any);
      vi.spyOn(app.prisma.ticket, 'count').mockResolvedValueOnce(1 as any);

      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/attendees?page=1&limit=10&search=Tepy`,
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.attendees).toHaveLength(1);
      expect(body.attendees[0].user.name).toBe('Sorphea Tepy');
      expect(body.attendees[0].tier.name).toBe('VIP');
    });

    it('returns 403 Forbidden when unauthorized organizer requests attendees', async () => {
      const mockEvent = {
        id: event1Id,
        organizerId: organizer1Id,
      };

      vi.spyOn(app.prisma.event, 'findUnique').mockResolvedValueOnce(mockEvent as any);

      const res = await app.inject({
        method: 'GET',
        url: `/organizer/events/${event1Id}/attendees`,
        headers: {
          authorization: `Bearer ${organizer2Token}`,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have access to this event',
      });
    });
  });

  describe('POST /organizer/staff', () => {
    it('returns 501 Not Implemented', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/organizer/staff',
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(501);
      expect(res.json()).toMatchObject({
        statusCode: 501,
        error: 'Not Implemented',
      });
    });
  });

  describe('GET /organizer/events', () => {
    const mockOrganizer1Events = [
      {
        id: event1Id,
        organizerId: organizer1Id,
        title: 'Argon Tech Summit 2026',
        description: 'Flagship tech event',
        venue: 'Phnom Penh Center',
        startsAt: new Date('2026-11-15T09:00:00Z'),
        status: 'PUBLISHED',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-01T00:00:00Z'),
        tiers: [
          {
            id: tier1Id,
            eventId: event1Id,
            name: 'Early Bird',
            capacity: 100,
            price: 25.0,
            soldCount: 80,
            reservedCount: 10,
          },
          {
            id: tier2Id,
            eventId: event1Id,
            name: 'VIP',
            capacity: 50,
            price: 100.0,
            soldCount: 20,
            reservedCount: 5,
          },
        ],
        bookings: [
          {
            id: 'b-1',
            tierId: tier1Id,
            status: 'PAID',
            tickets: [
              { id: 't-1', status: TicketStatus.CHECKED_IN },
              { id: 't-2', status: TicketStatus.ACTIVE },
            ],
          },
          {
            id: 'b-2',
            tierId: tier2Id,
            status: 'PAID',
            tickets: [
              { id: 't-3', status: TicketStatus.CHECKED_IN },
            ],
          },
        ],
      },
    ];

    const mockAllEvents = [
      ...mockOrganizer1Events,
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        organizerId: organizer2Id,
        title: 'Khmer Developers Meetup',
        description: 'Developer community meetup',
        venue: 'CADT Innovation Hub',
        startsAt: new Date('2026-12-01T14:00:00Z'),
        status: 'PUBLISHED',
        createdAt: new Date('2026-10-05T00:00:00Z'),
        updatedAt: new Date('2026-10-05T00:00:00Z'),
        tiers: [
          {
            id: 'tier-meetup-1',
            eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            name: 'General',
            capacity: 200,
            price: 0.0,
            soldCount: 50,
            reservedCount: 0,
          },
        ],
        bookings: [],
      },
    ];

    it('returns 200 OK and only events owned by authenticated organizer', async () => {
      const findManySpy = vi.spyOn(app.prisma.event, 'findMany').mockResolvedValueOnce(mockOrganizer1Events as any);

      const res = await app.inject({
        method: 'GET',
        url: '/organizer/events',
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const events = res.json();
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event1Id);
      expect(events[0].organizerId).toBe(organizer1Id);
      expect(events[0].tiers).toHaveLength(2);

      // Verify tier fields: capacity, price, currency, soldCount, checkedInCount
      expect(events[0].tiers[0]).toMatchObject({
        id: tier1Id,
        name: 'Early Bird',
        capacity: 100,
        price: 25.0,
        currency: 'USD',
        soldCount: 80,
        checkedInCount: 1,
      });
      expect(events[0].tiers[1]).toMatchObject({
        id: tier2Id,
        name: 'VIP',
        capacity: 50,
        price: 100.0,
        currency: 'USD',
        soldCount: 20,
        checkedInCount: 1,
      });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizerId: organizer1Id },
        })
      );
    });

    it('returns 200 OK and all events when requested by ADMIN', async () => {
      const findManySpy = vi.spyOn(app.prisma.event, 'findMany').mockResolvedValueOnce(mockAllEvents as any);

      const res = await app.inject({
        method: 'GET',
        url: '/organizer/events',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const events = res.json();
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(2);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('supports /api/v1/organizer/events prefix identically', async () => {
      vi.spyOn(app.prisma.event, 'findMany').mockResolvedValueOnce(mockOrganizer1Events as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/organizer/events',
        headers: {
          authorization: `Bearer ${organizer1Token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const events = res.json();
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(1);
    });
  });
});
