/**
 * modules/admin/service.ts – Platform Super-Admin Governance and Incident Overrides Service.
 */

import crypto from 'node:crypto';
import {
  PrismaClient,
  Role,
  TicketStatus,
  Prisma,
} from '@prisma/client';
import type { GetUsersQuery, GetAuditLogsQuery, AdminBookingsQuery } from './schema';
import { generateHmacSignature } from '../../lib/hmac.js';
import { env } from '../../config/env.js';

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

export async function getPlatformOverview(prisma: PrismaClient) {
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

  const grossRevenue = paidBookings.reduce((sum, b) => {
    return sum + Number(b.tier.price) * b.quantity;
  }, 0);

  const usersByRole: Record<Role, number> = {
    CUSTOMER: 0,
    ORGANIZER: 0,
    ADMIN: 0,
  };

  for (const group of usersGroup) {
    usersByRole[group.role] = group._count._all;
  }

  const totalTicketsSold = totalTicketsSoldAgg._sum.quantity ?? 0;

  return {
    totalPaidBookings,
    grossRevenue,
    gmv: grossRevenue,
    totalTicketsSold,
    activeEventsCount,
    doorCheckInCount,
    usersByRole,
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
        createdAt: true,
        updatedAt: true,
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

export async function listAuditLogs(prisma: PrismaClient, query: GetAuditLogsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};
  if (query.entity) {
    where.entity = query.entity;
  }
  if (query.action) {
    where.action = query.action;
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
  if (query.search) {
    where.OR = [
      { user: { name: { contains: query.search, mode: 'insensitive' } } },
      { user: { email: { contains: query.search, mode: 'insensitive' } } },
      { event: { title: { contains: query.search, mode: 'insensitive' } } },
    ];
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
    tier: b.tier
      ? {
          ...b.tier,
          currency: 'USD',
        }
      : null,
  }));

  return {
    bookings,
    total,
  };
}
