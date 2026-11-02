/**
 * modules/admin/service.ts – Platform Administration & Operations Service.
 *
 * Implements ground-truth administrative operations directly against PostgreSQL:
 * - Metrics overview with real database telemetry, top events, and sales velocity
 * - User management with role promotion/demotion and activity counters
 * - Global event moderation with status changes and audit logs
 * - Bookings management with manual payment confirmations and quota-reverting refunds
 * - Manual door check-in override for gate failure recovery
 * - Audit log querying with actor metadata
 */

import crypto from 'node:crypto';
import { TicketStatus } from '@prisma/client';
import type {
  PrismaClient,
  Role,
  EventStatus,
  Prisma,
} from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type {
  GetUsersQuery,
  GetAuditLogsQuery,
  AdminBookingsQuery,
  GetAdminEventsQuery,
  GetPlatformOverviewQuery,
} from './schema';
import { generateHmacSignature } from '../../lib/hmac.js';
import { env } from '../../config/env.js';
import { revokeUserSessions, restoreUserSessions } from '../auth/service.js';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name =
      statusCode === 404
        ? 'NotFoundError'
        : statusCode === 400
          ? 'BadRequestError'
          : statusCode === 403
            ? 'ForbiddenError'
            : 'HttpError';
    this.statusCode = statusCode;
  }
}

const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 1,
  ORGANIZER: 2,
  ADMIN: 3,
};

export async function getPlatformOverview(
  prisma: PrismaClient,
  app?: FastifyInstance,
  query?: GetPlatformOverviewQuery
) {
  const [
    totalPaidBookings,
    paidBookings,
    totalTicketsSoldAgg,
    activeEventsCount,
    doorCheckInCount,
    usersGroup,
  ] = await Promise.all([
    prisma.booking.count({
      where: { status: 'PAID' },
    }),
    prisma.booking.findMany({
      where: { status: 'PAID' },
      select: {
        quantity: true,
        tier: {
          select: { price: true },
        },
      },
    }),
    prisma.booking.aggregate({
      where: { status: 'PAID' },
      _sum: { quantity: true },
    }),
    prisma.event.count({
      where: { status: 'PUBLISHED' },
    }),
    prisma.ticket.count({
      where: { status: 'CHECKED_IN' },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
  ]);

  const grossRevenue = (paidBookings || []).reduce((sum, b) => {
    return sum + Number(b?.tier?.price ?? 0) * (b?.quantity ?? 0);
  }, 0);

  const usersByRole: Record<Role, number> = {
    CUSTOMER: 0,
    ORGANIZER: 0,
    ADMIN: 0,
  };

  if (Array.isArray(usersGroup)) {
    for (const group of usersGroup) {
      if (group?.role) {
        usersByRole[group.role] = group._count?._all ?? 0;
      }
    }
  }

  const totalTicketsSold = totalTicketsSoldAgg?._sum?.quantity ?? 0;

  // Real Database & Redis Telemetry
  let dbStatus = 'HEALTHY';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'DOWN';
  }

  let redisStatus: 'HEALTHY' | 'DISCONNECTED' | 'DISABLED' = 'DISABLED';
  let redisLatencyMs = 0;
  if (app?.redis && typeof app.redis.ping === 'function') {
    try {
      const redisStart = Date.now();
      const pong = await app.redis.ping();
      redisLatencyMs = Date.now() - redisStart;
      redisStatus = pong === 'PONG' ? 'HEALTHY' : 'DISCONNECTED';
    } catch {
      redisStatus = 'DISCONNECTED';
      redisLatencyMs = 0;
    }
  }

  // Top 3 Active Events
  let topEvents: Array<{
    id: string;
    title: string;
    venue: string;
    totalSold: number;
    totalCapacity: number;
    totalRevenue: number;
    paidOrdersCount: number;
  }> = [];
  try {
    const topEventsRaw = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        venue: true,
        tiers: {
          select: {
            soldCount: true,
            capacity: true,
            price: true,
          },
        },
        _count: {
          select: { bookings: { where: { status: 'PAID' } } },
        },
      },
      take: 3,
    });
    if (Array.isArray(topEventsRaw)) {
      topEvents = topEventsRaw.map((e) => ({
        id: e.id,
        title: e.title,
        venue: e.venue,
        totalSold: e.tiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) ?? 0,
        totalCapacity: e.tiers?.reduce((acc, t) => acc + (t.capacity || 0), 0) ?? 0,
        totalRevenue:
          e.tiers?.reduce(
            (acc, t) => acc + Number(t.price || 0) * (t.soldCount || 0),
            0
          ) ?? 0,
        paidOrdersCount: e._count?.bookings ?? 0,
      }));
    }
  } catch {
    topEvents = [];
  }

  // Sales Velocity Breakdown over dynamic timeframe
  const daysCount =
    query?.timeRange === '30D'
      ? 30
      : query?.timeRange === 'ALL'
        ? 90
        : (query?.days ?? 7);

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);

  const velocityMap: Record<string, { revenue: number; orders: number }> = {};
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    velocityMap[dateStr] = { revenue: 0, orders: 0 };
  }

  try {
    const recentPaidBookings = await prisma.booking.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: cutoffDate },
      },
      select: {
        createdAt: true,
        quantity: true,
        tier: {
          select: { price: true },
        },
      },
    });

    if (Array.isArray(recentPaidBookings)) {
      for (const b of recentPaidBookings) {
        const dateStr = new Date(b.createdAt).toISOString().slice(0, 10);
        if (velocityMap[dateStr]) {
          const rev = Number(b.tier?.price ?? 0) * (b.quantity ?? 1);
          velocityMap[dateStr].revenue += rev;
          velocityMap[dateStr].orders += 1;
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  const dailyVelocity = Object.entries(velocityMap).map(([date, stats]) => ({
    date,
    revenue: stats.revenue,
    orders: stats.orders,
  }));

  return {
    totalPaidBookings: totalPaidBookings ?? 0,
    grossRevenue,
    gmv: grossRevenue,
    totalTicketsSold,
    activeEventsCount: activeEventsCount ?? 0,
    doorCheckInCount: doorCheckInCount ?? 0,
    usersByRole,
    systemHealth: {
      api: { status: 'ONLINE', version: '0.1.0' },
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      redis: { status: redisStatus, latencyMs: redisLatencyMs },
    },
    topEvents,
    dailyVelocity,
  };
}

export async function listUsers(prisma: PrismaClient, query: GetUsersQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (query.role) {
    where.role = query.role;
  }
  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateUserRole(
  prisma: PrismaClient,
  adminId: string,
  targetUserId: string,
  newRole: Role
) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const previousRole = user.role;
    const isPromotion = ROLE_RANK[newRole] > ROLE_RANK[previousRole];
    const action = isPromotion ? 'USER_ROLE_PROMOTED' : 'USER_ROLE_UPDATED';

    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action,
        entity: 'User',
        entityId: targetUserId,
        metadata: {
          previousRole,
          newRole,
        },
      },
    });

    return updatedUser;
  });
}

export async function listAdminEvents(
  prisma: PrismaClient,
  query: GetAdminEventsQuery
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.EventWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { venue: { contains: query.search, mode: 'insensitive' } },
      { organizer: { name: { contains: query.search, mode: 'insensitive' } } },
      { organizer: { email: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [rawEvents, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            soldCount: true,
            reservedCount: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  const data = rawEvents.map((evt) => {
    const totalCapacity = evt.tiers.reduce((acc, t) => acc + t.capacity, 0);
    const totalSold = evt.tiers.reduce((acc, t) => acc + t.soldCount, 0);
    const grossRevenue = evt.tiers.reduce(
      (acc, t) => acc + Number(t.price) * t.soldCount,
      0
    );

    return {
      id: evt.id,
      title: evt.title,
      description: evt.description,
      venue: evt.venue,
      startsAt: evt.startsAt,
      status: evt.status,
      category: evt.category,
      coverImageUrl: evt.coverImageUrl,
      createdAt: evt.createdAt,
      updatedAt: evt.updatedAt,
      organizer: evt.organizer,
      tiers: evt.tiers.map((t) => ({ ...t, price: Number(t.price) })),
      totalCapacity,
      totalSold,
      grossRevenue,
      bookingsCount: evt._count.bookings,
    };
  });

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateAdminEventStatus(
  prisma: PrismaClient,
  adminId: string,
  eventId: string,
  status: EventStatus,
  reason?: string
) {
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new HttpError(404, 'Event not found');
    }

    const previousStatus = event.status;

    const updated = await tx.event.update({
      where: { id: eventId },
      data: { status },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        tiers: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: `EVENT_STATUS_${status}`,
        entity: 'Event',
        entityId: eventId,
        metadata: {
          eventTitle: event.title,
          previousStatus,
          newStatus: status,
          reason: reason ?? 'Admin event moderation',
        },
      },
    });

    return updated;
  });
}

export async function forceConfirmBooking(
  prisma: PrismaClient,
  adminId: string,
  bookingId: string
) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        tier: true,
        tickets: true,
      },
    });

    if (!booking) {
      throw new HttpError(404, 'Booking not found');
    }

    if (booking.status === 'PAID') {
      return booking;
    }

    if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
      throw new HttpError(400, `Cannot force-confirm a ${booking.status.toLowerCase()} booking`);
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'PAID' },
    });

    if (booking.tickets.length === 0) {
      const ticketsToCreate = Array.from({ length: booking.quantity }).map(() => {
        const ticketId = crypto.randomUUID();
        const signature = generateHmacSignature(ticketId, env.QR_HMAC_SECRET);
        return {
          id: ticketId,
          bookingId: booking.id,
          eventId: booking.eventId,
          status: TicketStatus.ACTIVE,
          qrToken: `${ticketId}:${signature}`,
        };
      });

      await tx.ticket.createMany({
        data: ticketsToCreate,
      });
    }

    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: {
        soldCount: { increment: booking.quantity },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'BOOKING_FORCE_CONFIRMED',
        entity: 'Booking',
        entityId: bookingId,
        metadata: { reason: 'Admin manual resolution' },
      },
    });

    const updatedBooking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        tier: true,
        tickets: true,
      },
    });

    return updatedBooking!;
  });
}

export async function refundBooking(
  prisma: PrismaClient,
  adminId: string,
  bookingId: string
) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        tier: true,
        tickets: true,
      },
    });

    if (!booking) {
      throw new HttpError(404, 'Booking not found');
    }

    if (booking.status !== 'PAID') {
      throw new HttpError(400, `Cannot refund booking with status ${booking.status}`);
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'REFUNDED' },
    });

    await tx.ticket.updateMany({
      where: { bookingId: booking.id },
      data: { status: TicketStatus.REVOKED },
    });

    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: {
        soldCount: { decrement: booking.quantity },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'BOOKING_REFUNDED',
        entity: 'Booking',
        entityId: bookingId,
        metadata: { reason: 'Admin manual refund' },
      },
    });

    const updatedBooking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        tier: true,
        tickets: true,
      },
    });

    return updatedBooking!;
  });
}

export async function manualCheckInOverride(
  prisma: PrismaClient,
  adminId: string,
  ticketId: string
) {
  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: { booking: true },
    });

    if (!ticket) {
      throw new HttpError(404, 'Ticket not found');
    }

    if (ticket.status === TicketStatus.CHECKED_IN) {
      return ticket;
    }

    if (ticket.status === TicketStatus.REVOKED) {
      throw new HttpError(400, 'Cannot check in a revoked ticket');
    }

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: new Date(),
        checkedInBy: adminId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'TICKET_CHECKED_IN_OVERRIDE',
        entity: 'Ticket',
        entityId: ticketId,
        metadata: {
          bookingId: ticket.bookingId,
          eventId: ticket.eventId,
          reason: 'Admin gate manual check-in override',
        },
      },
    });

    return updated;
  });
}

export async function listAuditLogs(prisma: PrismaClient, query: GetAuditLogsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};
  if (query.entity && query.entity !== 'ALL') {
    where.entity = query.entity;
  }
  if (query.action && query.action !== 'ALL') {
    if (query.action === 'EVENT_STATUS_UPDATED') {
      where.action = { startsWith: 'EVENT_STATUS_' };
    } else if (query.action === 'TICKET_CHECKED_IN') {
      where.action = { in: ['TICKET_CHECKED_IN', 'TICKET_CHECKED_IN_OVERRIDE'] };
    } else if (query.action === 'USER_ROLE_UPDATED') {
      where.action = { in: ['USER_ROLE_UPDATED', 'USER_ROLE_PROMOTED'] };
    } else if (query.action === 'USER_ACCOUNT_SUSPENDED') {
      where.action = { in: ['USER_ACCOUNT_SUSPENDED', 'USER_ACCOUNT_RESTORED'] };
    } else {
      where.action = query.action;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listAdminBookings(
  prismaOrApp: PrismaClient | { prisma: PrismaClient },
  query: AdminBookingsQuery
) {
  const prisma = 'prisma' in prismaOrApp ? prismaOrApp.prisma : prismaOrApp;
  const limit = query.limit ?? 20;
  const skip = query.page !== undefined ? (query.page - 1) * limit : (query.offset ?? 0);

  const where: Prisma.BookingWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.qrToken) {
    where.tickets = {
      some: {
        qrToken: { contains: query.qrToken },
      },
    };
  } else if (query.search) {
    const term = query.search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const orConditions: Prisma.BookingWhereInput[] = [
      { paymentReference: { contains: term, mode: 'insensitive' } },
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { event: { title: { contains: term, mode: 'insensitive' } } },
      { tickets: { some: { qrToken: { contains: term } } } },
    ];

    if (isUuid) {
      orConditions.push({ id: term });
    }

    where.OR = orConditions;
  }

  const [rawBookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
            qrToken: true,
            checkedInAt: true,
            checkedInBy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  const bookings = rawBookings.map((b) => ({
    ...b,
    totalAmount: Number(b.tier?.price ?? 0) * b.quantity,
    paymentRef: b.paymentReference ?? 'PENDING_KHQR',
    customerName: b.user?.name ?? b.user?.email.split('@')[0] ?? 'Customer',
    customerEmail: b.user?.email ?? '',
    eventTitle: b.event?.title ?? 'Event',
    tierName: b.tier?.name ?? 'Standard Pass',
    tier: b.tier
      ? {
          ...b.tier,
          price: Number(b.tier.price),
          currency: 'USD',
        }
      : null,
  }));

  return {
    bookings,
    total,
  };
}

export async function getSystemHealthDetails(
  prisma: PrismaClient,
  app?: FastifyInstance
) {
  const startDb = Date.now();
  let dbStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY';
  let dbLatencyMs = 0;
  let connectionCount = 1;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startDb;
  } catch {
    dbStatus = 'DOWN';
    dbLatencyMs = Date.now() - startDb;
  }

  // Redis cache telemetry
  let redisStatus: 'HEALTHY' | 'DISCONNECTED' | 'DISABLED' = 'DISABLED';
  let redisLatencyMs = 0;
  let redisMemoryHuman = 'N/A';

  if (app?.redis) {
    const startRedis = Date.now();
    try {
      const pong = await app.redis.ping();
      redisLatencyMs = Date.now() - startRedis;
      redisStatus = pong === 'PONG' ? 'HEALTHY' : 'DISCONNECTED';
      const info = await app.redis.info('memory');
      const match = info.match(/used_memory_human:([^\r\n]+)/);
      if (match && match[1]) redisMemoryHuman = match[1];
    } catch {
      redisStatus = 'DISCONNECTED';
      redisLatencyMs = Date.now() - startRedis;
    }
  }

  // Count core platform entities
  const [userCount, eventCount, bookingCount, ticketCount, auditLogCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.booking.count(),
      prisma.ticket.count(),
      prisma.auditLog.count(),
    ]);

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    status: dbStatus === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      activeConnections: connectionCount,
      poolProvider: 'PostgreSQL 16 (Prisma Accelerate / Direct Pool)',
      counts: {
        users: userCount,
        events: eventCount,
        bookings: bookingCount,
        tickets: ticketCount,
        auditLogs: auditLogCount,
      },
    },
    cache: {
      status: redisStatus,
      latencyMs: redisLatencyMs,
      usedMemory: redisMemoryHuman,
      engine: 'Redis 7.2 (Sentinel / Key-Value Store)',
    },
    services: [
      { name: 'Core API Fastify Engine', status: 'HEALTHY', latencyMs: 1 },
      { name: 'PostgreSQL Relational Storage', status: dbStatus, latencyMs: dbLatencyMs },
      { name: 'Redis Token & Quota Cache', status: redisStatus, latencyMs: redisLatencyMs },
    ],
  };
}

export async function getUserDetails(
  prisma: PrismaClient,
  userId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuspended: true,
      createdAt: true,
      updatedAt: true,
      bookings: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          quantity: true,
          createdAt: true,
          paymentReference: true,
          event: {
            select: { id: true, title: true, startsAt: true, venue: true },
          },
          tier: {
            select: { id: true, name: true, price: true },
          },
          tickets: {
            select: { id: true, status: true, checkedInAt: true },
          },
        },
      },
      events: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          venue: true,
          startsAt: true,
          createdAt: true,
          tiers: {
            select: { capacity: true, price: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new HttpError(404, `User with ID "${userId}" not found.`);
  }

  // Check latest suspension status from audit trail
  const latestSuspensionLog = await prisma.auditLog.findFirst({
    where: {
      entity: 'User',
      entityId: userId,
      action: { in: ['USER_ACCOUNT_SUSPENDED', 'USER_ACCOUNT_RESTORED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const isSuspended = user.isSuspended ?? (latestSuspensionLog?.action === 'USER_ACCOUNT_SUSPENDED');

  const formattedBookings = user.bookings.map((b) => ({
    id: b.id,
    eventTitle: b.event?.title ?? 'Unknown Event',
    eventVenue: b.event?.venue ?? 'Unknown Venue',
    tierName: b.tier?.name ?? 'Standard',
    amount: Number(b.tier?.price ?? 0) * b.quantity,
    quantity: b.quantity,
    status: b.status,
    createdAt: b.createdAt,
    ticketsIssued: b.tickets.length,
    ticketsCheckedIn: b.tickets.filter((t) => t.status === 'CHECKED_IN').length,
  }));

  const formattedEvents = user.events.map((e) => {
    const totalCapacity = e.tiers.reduce((acc, t) => acc + t.capacity, 0);
    return {
      id: e.id,
      title: e.title,
      status: e.status,
      venue: e.venue,
      startsAt: e.startsAt,
      capacity: totalCapacity,
    };
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isSuspended,
    suspensionReason: isSuspended ? (latestSuspensionLog?.metadata as any)?.reason ?? 'Administrative action' : null,
    bookings: formattedBookings,
    events: formattedEvents,
  };
}

export async function toggleUserSuspension(
  prisma: PrismaClient,
  adminUser: { id: string; email: string },
  targetUserId: string,
  suspend: boolean,
  reason?: string,
  app?: FastifyInstance
) {
  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      throw new HttpError(404, `User with ID "${targetUserId}" not found.`);
    }

    if (target.role === 'ADMIN') {
      throw new HttpError(403, 'Platform administrators cannot be suspended.');
    }

    const action = suspend ? 'USER_ACCOUNT_SUSPENDED' : 'USER_ACCOUNT_RESTORED';

    await tx.user.update({
      where: { id: targetUserId },
      data: { isSuspended: suspend },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUser.id,
        action,
        entity: 'User',
        entityId: targetUserId,
        metadata: {
          targetEmail: target.email,
          targetName: target.name,
          targetRole: target.role,
          reason: reason?.trim() || (suspend ? 'Suspended by admin' : 'Reactivated by admin'),
          executedBy: adminUser.email,
        },
      },
    });

    return {
      userId: targetUserId,
      isSuspended: suspend,
      action,
      reason: reason?.trim() || (suspend ? 'Suspended by admin' : 'Reactivated by admin'),
    };
  });

  if (app) {
    if (suspend) {
      await revokeUserSessions(app, targetUserId);
    } else {
      await restoreUserSessions(app, targetUserId);
    }
  }

  return result;
}
