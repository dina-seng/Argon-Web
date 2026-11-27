/**
 * jobs/holdReconciliation.ts – Booking hold expiry sweeper.
 *
 * Redis TTL expiry is the fast path. This sweeper is the source of truth:
 * find PENDING bookings past expiresAt, mark EXPIRED, decrement reservedCount
 * in a transaction. Must be idempotent.
 */

import type { FastifyInstance } from 'fastify';
import { BookingStatus } from '@argon/shared';
import { reconcilePayment } from '../modules/payments/service.js';

const PAYMENT_RECONCILIATION_GRACE_MS = 5 * 60_000;

export async function runHoldReconciliation(app: FastifyInstance): Promise<void> {
  const expiredBookings = await app.prisma.booking.findMany({
    where: { status: BookingStatus.PENDING, expiresAt: { lt: new Date() } },
    select: { id: true, expiresAt: true, paymentExpiresAt: true, paymentReference: true, tierId: true, quantity: true },
  });

  for (const booking of expiredBookings) {
    try {
      if (booking.paymentExpiresAt && booking.paymentReference && booking.expiresAt) {
        try {
          await reconcilePayment(app, booking.paymentReference);
        } catch (err) {
          if (Date.now() - booking.expiresAt.getTime() < PAYMENT_RECONCILIATION_GRACE_MS) throw err;
          app.log.error({ err, bookingId: booking.id }, 'Releasing hold after PayWay reconciliation failed');
        }
      }
      await app.prisma.$transaction(async (tx) => {
        const { count } = await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.PENDING },
          data: { status: BookingStatus.EXPIRED, paymentQrImage: null },
        });

        // Only decrement reservedCount if this transaction actually transitioned the booking from PENDING to EXPIRED
        if (count > 0) {
          await tx.ticketTier.update({
            where: { id: booking.tierId },
            data: { reservedCount: { decrement: booking.quantity } },
          });
        }
      });
      await app.redis.del(`hold:${booking.id}`).catch(() => {});
    } catch (err) {
      app.log.warn({ err, bookingId: booking.id }, 'Hold reconciliation error for booking');
    }
  }
}
