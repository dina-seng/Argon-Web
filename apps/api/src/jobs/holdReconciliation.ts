/**
 * jobs/holdReconciliation.ts – Booking hold expiry sweeper.
 *
 * Redis TTL expiry is the fast path. This sweeper is the source of truth:
 * find PENDING bookings past expiresAt, mark EXPIRED, decrement reservedCount
 * in a transaction. Must be idempotent.
 */

import type { FastifyInstance } from 'fastify';
import { BookingStatus } from '@argon/shared';

export async function runHoldReconciliation(app: FastifyInstance): Promise<void> {
  const expiredBookings = await app.prisma.booking.findMany({
    where: { status: BookingStatus.PENDING, expiresAt: { lt: new Date() } },
  });

  for (const booking of expiredBookings) {
    try {
      await app.prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.PENDING },
          data: { status: BookingStatus.EXPIRED },
        });
        await tx.ticketTier.update({
          where: { id: booking.tierId },
          data: { reservedCount: { decrement: booking.quantity } },
        });
      });
      await app.redis.del(`hold:${booking.id}`).catch(() => {});
    } catch (err) {
      app.log.warn({ err, bookingId: booking.id }, 'Hold reconciliation error for booking');
    }
  }
}
