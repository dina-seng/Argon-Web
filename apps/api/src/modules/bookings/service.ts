/**
 * modules/bookings/service.ts
 *
 * Flow A. MUST run inside prisma.$transaction: check capacity -
 * (soldCount + reservedCount) >= quantity, increment reservedCount, create PENDING
 * booking with expiresAt = now + 10 minutes, then set Redis hold key with 600s TTL.
 * Prevents overselling.
 */

import type { FastifyInstance } from 'fastify';
import { BookingStatus, HOLD_TTL_SECONDS, SERVICE_FEE } from '@argon/shared';
import { mintTickets } from '../tickets/service.js';

export interface CreateBookingInput {
  userId: string;
  tierId: string;
  eventId: string;
  quantity: number;
}

export async function createBooking(app: FastifyInstance, input: CreateBookingInput): Promise<unknown> {
  const booking = await app.prisma.$transaction(async (tx) => {
    const tier = await tx.ticketTier.findUnique({ where: { id: input.tierId } });
    if (!tier || tier.eventId !== input.eventId) {
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
      WHERE id = ${input.tierId}
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
        expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000),
        paymentAmount: tier.price.mul(input.quantity).add(SERVICE_FEE),
      },
    });

    return newBooking;
  }, { isolationLevel: 'Serializable' });

  if (app.redis && typeof app.redis.set === 'function') {
    await app.redis.set(`hold:${booking.id}`, '1', 'EX', HOLD_TTL_SECONDS).catch(() => {});
  }

  return {
    id: booking.id,
    status: booking.status,
    expiresAt: booking.expiresAt,
    quantity: booking.quantity,
    tierId: booking.tierId,
    eventId: booking.eventId,
    paymentAmount: booking.paymentAmount,
  };
}

export async function getBooking(
  app: FastifyInstance,
  id: string,
  userId: string,
  isAdmin: boolean = false
) {
  const booking = await app.prisma.booking.findUnique({
    where: { id },
    include: { tickets: true },
  });

  if (!booking || (!isAdmin && booking.userId !== userId)) {
    const err = Object.assign(new Error('Booking not found'), { statusCode: 404 });
    throw err;
  }

  const { paymentQrImage: _paymentQrImage, ...details } = booking;
  return { ...details, tickets: booking.status === BookingStatus.PAID ? booking.tickets : [] };
}

export async function simulatePayment(
  app: FastifyInstance,
  bookingId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<unknown> {
  const existing = await app.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tier: true, tickets: true },
  });

  if (!existing) {
    const err = Object.assign(new Error('Booking not found'), { statusCode: 404 });
    throw err;
  }

  if (!isAdmin && existing.userId !== userId) {
    const err = Object.assign(new Error('Forbidden: You do not own this booking'), { statusCode: 403 });
    throw err;
  }

  if (existing.status === BookingStatus.PAID) {
    return existing;
  }

  const updatedBooking = await app.prisma.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, status: BookingStatus.PENDING, expiresAt: { gt: new Date() }, paymentReference: null },
      data: {
        status: BookingStatus.PAID,
        gatewayTransactionId: `sim_${Date.now()}_${bookingId.slice(0, 8)}`,
      },
    });

    if (count === 0) {
      const current = await tx.booking.findUnique({ where: { id: bookingId }, include: { tickets: true } });
      if (current?.status === BookingStatus.PAID) return current;
      throw Object.assign(new Error('This booking cannot be simulated'), { statusCode: 409 });
    }

    await tx.ticketTier.update({
      where: { id: existing.tierId },
      data: {
        soldCount: { increment: existing.quantity },
        reservedCount: { decrement: existing.quantity },
      },
    });

    // 3. Mint HMAC-signed tickets atomically
    await mintTickets(tx, existing.id, existing.quantity);

    return await tx.booking.findUnique({
      where: { id: bookingId },
      include: { tickets: true, tier: true, event: true },
    });
  });

  // 4. Clear Redis hold key
  if (app.redis && typeof app.redis.del === 'function') {
    await app.redis.del(`hold:${bookingId}`).catch(() => {});
  }

  return updatedBooking;
}
