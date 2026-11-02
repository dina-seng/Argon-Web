/**
 * modules/bookings/service.ts
 *
 * Flow A. MUST run inside prisma.$transaction: check capacity -
 * (soldCount + reservedCount) >= quantity, increment reservedCount, create PENDING
 * booking with expiresAt = now + 10 minutes, then set Redis hold key with 600s TTL.
 * Prevents overselling.
 */

import type { FastifyInstance } from 'fastify';
import { BookingStatus } from '@argon/shared';

export interface CreateBookingInput {
  userId: string;
  tierId: string;
  eventId: string;
  quantity: number;
}

export async function createBooking(app: FastifyInstance, input: CreateBookingInput): Promise<unknown> {
  const booking = await app.prisma.$transaction(async (tx) => {
    const tier = await tx.ticketTier.findUnique({ where: { id: input.tierId } });
    if (!tier) {
      const err = Object.assign(new Error('Ticket tier not found'), { statusCode: 404 });
      throw err;
    }

    if (tier.capacity - tier.soldCount - tier.reservedCount < input.quantity) {
      const err = Object.assign(new Error('Not enough tickets available'), { statusCode: 409 });
      throw err;
    }

    // Atomic conditional update using raw SQL to prevent race conditions
    const result = await tx.$executeRaw`
      UPDATE "TicketTier"
      SET "reservedCount" = "reservedCount" + ${input.quantity}
      WHERE id = ${input.tierId}::uuid
        AND capacity - "soldCount" - "reservedCount" >= ${input.quantity}
    `;

    if (result === 0) {
      const err = Object.assign(new Error('Not enough tickets available'), { statusCode: 409 });
      throw err;
    }

    const newBooking = await tx.booking.create({
      data: {
        userId: input.userId,
        tierId: input.tierId,
        eventId: input.eventId,
        quantity: input.quantity,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return newBooking;
  }, { isolationLevel: 'Serializable' });

  await app.redis.set(`hold:${booking.id}`, '1', 'EX', 600);

  return {
    id: booking.id,
    status: booking.status,
    expiresAt: booking.expiresAt,
    quantity: booking.quantity,
    tierId: booking.tierId,
    eventId: booking.eventId,
  };
}

export async function getBooking(app: FastifyInstance, id: string, userId: string): Promise<unknown> {
  const booking = await app.prisma.booking.findUnique({
    where: { id },
    include: { tickets: true },
  });

  if (!booking || booking.userId !== userId) {
    const err = Object.assign(new Error('Booking not found'), { statusCode: 404 });
    throw err;
  }

  if (booking.status === BookingStatus.PAID) {
    return booking;
  }

  return { ...booking, tickets: [] };
}
