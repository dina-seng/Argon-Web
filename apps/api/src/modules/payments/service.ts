/**
 * modules/payments/service.ts – Payment webhook handler.
 *
 * Flow B. Verify gateway signature BEFORE any DB access; reject unsigned or
 * replayed requests. Idempotent: if booking is already PAID, return 200
 * immediately without minting tickets again. In one transaction:
 * PENDING -> PAID, soldCount += qty, reservedCount -= qty, mint HMAC-SHA256
 * qrToken for each ticket.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { BookingStatus } from '@argon/shared';
import { mintTickets } from '../tickets/service.js';

export interface WebhookPayload {
  event: string;
  bookingReference: string;
  gatewayTransactionId: string;
  amount: number;
}

export async function handlePaymentWebhook(
  app: FastifyInstance,
  payload: WebhookPayload,
  rawBody: Buffer,
  signature: string,
): Promise<void> {
  // 1. Verify HMAC-SHA256 signature
  const expectedSig = createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  let sigValid = false;
  try {
    sigValid = timingSafeEqual(
      Buffer.from(expectedSig, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    sigValid = false;
  }

  if (!sigValid) {
    throw Object.assign(new Error('Invalid webhook signature'), { statusCode: 401 });
  }

  // 2. Idempotency check
  const existingBooking = await app.prisma.booking.findFirst({
    where: { paymentReference: payload.bookingReference },
  });
  if (existingBooking?.status === BookingStatus.PAID) {
    return;
  }

  let bookingId: string;
  let bookingQuantity: number;

  // 3. Transaction: update booking and tier
  await app.prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { paymentReference: payload.bookingReference },
    });
    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    bookingId = booking.id;
    bookingQuantity = booking.quantity;

    const { count } = await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: {
        status: BookingStatus.PAID,
        gatewayTransactionId: payload.gatewayTransactionId,
      },
    });

    if (count === 0) {
      throw Object.assign(new Error('Booking already processed'), { statusCode: 409 });
    }

    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: {
        soldCount: { increment: booking.quantity },
        reservedCount: { decrement: booking.quantity },
      },
    });
  });

  // 4. Mint tickets after transaction
  await mintTickets(app, bookingId!, bookingQuantity!);

  // 5. Delete Redis hold key
  await app.redis.del(`hold:${bookingId!}`).catch(() => {});
}

/** Adapter interface – implement per payment gateway */
export interface GatewayAdapter {
  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean;
  createPaymentIntent(amount: number, currency: string, reference: string): Promise<{ paymentUrl: string }>;
}
