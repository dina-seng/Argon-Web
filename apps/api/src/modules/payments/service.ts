import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PaymentMethod } from '@prisma/client';
import { BookingStatus, SERVICE_FEE } from '@argon/shared';
import { mintTickets } from '../tickets/service.js';
import { checkTransaction, createCardForm, generateQr, paymentError } from './payway.js';

export async function createPayment(app: FastifyInstance, id: string, userId: string, method: PaymentMethod) {
  return app.prisma.$transaction(async (tx) => {
    // Serialize QR creation for this booking, including requests from different API instances.
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
    const booking = await tx.booking.findFirst({ where: { id, userId }, include: { tier: true } });
    if (!booking) throw paymentError(404, 'Booking not found');
    const now = Date.now();
    if (booking.status !== BookingStatus.PENDING || !booking.expiresAt || booking.expiresAt.getTime() <= now) {
      throw paymentError(409, 'This booking can no longer accept payment');
    }
    if (booking.paymentMethod && booking.paymentMethod !== method) {
      throw paymentError(409, 'This booking already has a payment method');
    }
    if (booking.paymentExpiresAt && booking.paymentExpiresAt.getTime() <= now) {
      throw paymentError(409, 'This payment has expired');
    }
    if (method === 'KHQR' && booking.paymentQrImage && booking.paymentAmount && booking.paymentExpiresAt) {
      return { method, qrImage: booking.paymentQrImage, amount: Number(booking.paymentAmount), expiresAt: booking.paymentExpiresAt };
    }

    // PayWay takes whole minutes. Leave time for the request and payment confirmation.
    const deadline = booking.paymentExpiresAt?.getTime() ?? booking.expiresAt.getTime() - 15_000;
    const lifetime = Math.floor((deadline - now) / 60_000);
    if (lifetime < 3) throw paymentError(409, 'Too little time remains to start payment. Reserve your tickets again.');
    const reference = booking.paymentMethod && booking.paymentReference
      ? booking.paymentReference
      : createHash('sha256').update(id).digest('hex').slice(0, 20);
    const amount = booking.paymentAmount ?? booking.tier.price.mul(booking.quantity).add(SERVICE_FEE);
    const expiresAt = booking.paymentExpiresAt ?? new Date(now + lifetime * 60_000);
    const payment = method === 'CARD'
      ? { method, ...createCardForm(id, reference, Number(amount), lifetime) }
      : { method, qrImage: await generateQr(reference, Number(amount), lifetime) };
    await tx.booking.update({
      where: { id },
      data: {
        paymentReference: reference, paymentAmount: amount, paymentMethod: method,
        paymentQrImage: payment.method === 'KHQR' ? payment.qrImage : null, paymentExpiresAt: expiresAt,
      },
    });
    return { ...payment, amount: Number(amount), expiresAt };
  }, { timeout: 12_000 });
}

export async function reconcilePayment(app: FastifyInstance, reference: string) {
  const booking = await app.prisma.booking.findUnique({ where: { paymentReference: reference } });
  if (!booking?.paymentExpiresAt || !booking.paymentAmount || booking.status === BookingStatus.PAID) return;

  const payment = await checkTransaction(reference);
  if (!payment) return;
  const expected = Number(booking.paymentAmount);
  if (payment.payment_currency !== 'USD' || payment.original_amount !== expected || payment.payment_amount !== expected) {
    app.log.error({ bookingId: booking.id, reference }, 'Approved PayWay payment differs from the booking total');
    throw paymentError(409, 'The payment amount or currency could not be verified');
  }

  const settled = await app.prisma.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.PAID, gatewayTransactionId: reference, paymentQrImage: null },
    });
    if (count === 0) {
      const current = await tx.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
      if (current?.status !== BookingStatus.PAID) {
        app.log.error({ bookingId: booking.id, reference, status: current?.status }, 'Approved PayWay payment requires manual reconciliation');
      }
      return false;
    }

    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: { soldCount: { increment: booking.quantity }, reservedCount: { decrement: booking.quantity } },
    });
    await mintTickets(tx, booking.id, booking.quantity);
    return true;
  });

  if (settled) await app.redis?.del(`hold:${booking.id}`).catch(() => {});
}
