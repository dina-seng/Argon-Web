/**
 * modules/payments/service.ts – Payment webhook handler.
 *
 * Flow B. Verify gateway signature BEFORE any DB access; reject unsigned or
 * replayed requests. Idempotent: if booking is already PAID, return 200
 * immediately without minting tickets again. In one transaction:
 * PENDING -> PAID, soldCount += qty, reservedCount -= qty, mint HMAC-SHA256
 * qrToken for each ticket.
 */

import type { FastifyInstance } from 'fastify';

export interface WebhookPayload {
  event: string;
  bookingReference: string;
  gatewayTransactionId: string;
  amount: number;
}

export async function handlePaymentWebhook(
  _app: FastifyInstance,
  _payload: WebhookPayload,
  _rawBody: Buffer,
  _signature: string,
): Promise<void> {
  // TODO: implement Flow B
  throw new Error('Not implemented');
}

/** Adapter interface – implement per payment gateway */
export interface GatewayAdapter {
  verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean;
  createPaymentIntent(amount: number, currency: string, reference: string): Promise<{ paymentUrl: string }>;
}
