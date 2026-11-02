/**
 * modules/organizer/service.ts
 *
 * Organizer Event Sales, Tier Quota Management, and Attendee Rostering.
 */

import type { FastifyInstance } from 'fastify';
import { PrismaClient, type Prisma } from '@prisma/client';

export class HttpError extends Error {
  statusCode: number;
  error: string;

  constructor(statusCode: number, message: string, errorName?: string) {
    super(message);
    const resolvedName = errorName ?? (
      statusCode === 400 ? 'Bad Request' :
      statusCode === 401 ? 'Unauthorized' :
      statusCode === 403 ? 'Forbidden' :
      statusCode === 404 ? 'Not Found' :
      statusCode === 409 ? 'Conflict' : 'Error'
    );
    this.name = resolvedName;
    this.error = resolvedName;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

let defaultPrisma: PrismaClient | null = null;
function getPrismaClient(): PrismaClient {
  if (!defaultPrisma) {
    defaultPrisma = new PrismaClient();
  }
  return defaultPrisma;
}

export interface TierMetric {
  id: string;
  name: string;
  price: number;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  available: number;
}

export interface EventMetricsResponse {
  eventId: string;
  title: string;
  totalCapacity: number;
  totalSold: number;
  totalReserved: number;
  grossRevenue: number;
  checkedInCount: number;
  checkInRate: number;
  tiers: TierMetric[];
}

export interface AttendeeItem {
  id: string;
  ticketId: string;
  status: string;
  checkedInAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  tier: {
    id: string;
    name: string;
    price: number;
  } | null;
  bookingId: string;
  createdAt: Date;
}

export interface PaginatedAttendeesResponse {
  attendees: AttendeeItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Calculates real-time sales metrics and ticket tier check-in rates for an event.
 */
export async function getEventMetrics(
  userId: string,
  eventId: string,
  isAdmin: boolean,
  prisma: PrismaClient = getPrismaClient()
): Promise<EventMetricsResponse> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tiers: true,
      bookings: {
        where: { status: 'PAID' },
        include: { tickets: true },
      },
    },
  });

  if (!event) {
    throw new HttpError(404, 'Event not found', 'Not Found');
  }

  // Multi-tenant guard: only event organizer or admin can access
  if (!isAdmin && event.organizerId !== userId) {
    throw new HttpError(403, 'You do not have access to this event', 'Forbidden');
  }

  const totalCapacity = event.tiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalSold = event.tiers.reduce((acc, t) => acc + t.soldCount, 0);
  const totalReserved = event.tiers.reduce((acc, t) => acc + t.reservedCount, 0);
  const grossRevenue = event.tiers.reduce(
    (acc, t) => acc + t.soldCount * Number(t.price),
    0
  );

  // Tickets checked in from paid bookings
  const checkedInCount = event.bookings?.reduce(
    (acc, b) =>
      acc +
      (b.tickets
        ? b.tickets.filter((ticket) => ticket.status === 'CHECKED_IN').length
        : 0),
    0
  ) ?? 0;

  const checkInRate = totalSold > 0 ? (checkedInCount / totalSold) * 100 : 0;

  const tiers: TierMetric[] = event.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: Number(tier.price),
    capacity: tier.capacity,
    soldCount: tier.soldCount,
    reservedCount: tier.reservedCount,
    available: Math.max(0, tier.capacity - tier.soldCount - tier.reservedCount),
  }));

  return {
    eventId: event.id,
    title: event.title,
    totalCapacity,
    totalSold,
    totalReserved,
    grossRevenue,
    checkedInCount,
    checkInRate,
    tiers,
  };
}

/**
 * Updates tier capacity / quota ensuring capacity cannot drop below soldCount.
 */
export async function updateTierQuota(
  userId: string,
  eventId: string,
  tierId: string,
  data: { capacity?: number | undefined },
  isAdmin: boolean,
  prisma: PrismaClient = getPrismaClient()
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new HttpError(404, 'Event not found', 'Not Found');
  }

  if (!isAdmin && event.organizerId !== userId) {
    throw new HttpError(403, 'You do not have access to this event', 'Forbidden');
  }

  const tier = await prisma.ticketTier.findUnique({
    where: { id: tierId },
  });

  if (!tier || tier.eventId !== eventId) {
    throw new HttpError(404, 'Ticket tier not found for this event', 'Not Found');
  }

  if (data.capacity !== undefined) {
    if (data.capacity < tier.soldCount) {
      throw new HttpError(
        400,
        `Capacity cannot be lower than sold count (${tier.soldCount})`,
        'Bad Request'
      );
    }

    const updated = await prisma.ticketTier.update({
      where: { id: tierId },
      data: { capacity: data.capacity },
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  return {
    ...tier,
    price: Number(tier.price),
  };
}

/**
 * Returns paginated attendees roster for an event with search filtering.
 */
export async function getAttendees(
  userId: string,
  eventId: string,
  query: { page?: number | undefined; limit?: number | undefined; search?: string | undefined },
  isAdmin: boolean,
  prisma: PrismaClient = getPrismaClient()
): Promise<PaginatedAttendeesResponse> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new HttpError(404, 'Event not found', 'Not Found');
  }

  if (!isAdmin && event.organizerId !== userId) {
    throw new HttpError(403, 'You do not have access to this event', 'Forbidden');
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.max(1, Math.min(100, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.TicketWhereInput = {
    eventId,
  };

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim();
    where.OR = [
      {
        booking: {
          user: {
            name: { contains: term, mode: 'insensitive' },
          },
        },
      },
      {
        booking: {
          user: {
            email: { contains: term, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tier: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.count({ where }),
  ]);

  const attendees: AttendeeItem[] = tickets.map((t) => ({
    id: t.id,
    ticketId: t.id,
    status: t.status,
    checkedInAt: t.checkedInAt,
    user: t.booking?.user ?? null,
    tier: t.booking?.tier
      ? {
          id: t.booking.tier.id,
          name: t.booking.tier.name,
          price: Number(t.booking.tier.price),
        }
      : null,
    bookingId: t.bookingId,
    createdAt: t.createdAt,
  }));

  return {
    attendees,
    total,
    page,
    limit,
  };
}

/**
 * Placeholder for issuing staff credentials.
 */
export async function issueStaffCredential(
  _app: unknown,
  _organizerId: string
): Promise<unknown> {
  throw new HttpError(501, 'Staff credential issuance not implemented yet', 'Not Implemented');
}

export interface OrganizerEventTierItem {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  price: number;
  currency: string;
  soldCount: number;
  reservedCount: number;
  checkedInCount: number;
}

export interface OrganizerEventItem {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  startsAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tiers: OrganizerEventTierItem[];
  totalCapacity: number;
  totalSold: number;
  totalCheckedIn: number;
}

/**
 * Lists events for an organizer, or all events if platform admin.
 * Includes tiers with capacity, price, currency, soldCount, and checkedInCount.
 */
export async function listOrganizerEvents(
  app: FastifyInstance | { prisma: PrismaClient },
  organizerId: string,
  isAdmin = false
): Promise<OrganizerEventItem[]> {
  const prisma = 'prisma' in app ? app.prisma : getPrismaClient();

  const where: Prisma.EventWhereInput = isAdmin ? {} : { organizerId };

  const events = await prisma.event.findMany({
    where,
    include: {
      tiers: true,
      bookings: {
        where: { status: 'PAID' },
        include: {
          tickets: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return events.map((event) => {
    let totalCheckedIn = 0;
    let totalSold = 0;
    let totalCapacity = 0;

    const tiers: OrganizerEventTierItem[] = event.tiers.map((tier) => {
      const tierBookings = (event.bookings || []).filter((b) => b.tierId === tier.id);
      const checkedInCount = tierBookings.reduce(
        (acc, b) =>
          acc +
          (b.tickets
            ? b.tickets.filter((ticket) => ticket.status === 'CHECKED_IN').length
            : 0),
        0
      );

      totalCheckedIn += checkedInCount;
      totalSold += tier.soldCount;
      totalCapacity += tier.capacity;

      return {
        id: tier.id,
        eventId: tier.eventId,
        name: tier.name,
        capacity: tier.capacity,
        price: Number(tier.price),
        currency: 'USD',
        soldCount: tier.soldCount,
        reservedCount: tier.reservedCount,
        checkedInCount,
      };
    });

    return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      description: event.description,
      venue: event.venue,
      startsAt: event.startsAt,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      tiers,
      totalCapacity,
      totalSold,
      totalCheckedIn,
    };
  });
}
