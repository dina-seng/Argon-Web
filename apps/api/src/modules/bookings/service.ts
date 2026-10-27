/**
 * modules/bookings/service.ts
 *
 * Flow A. MUST run inside prisma.$transaction: check capacity -
 * (soldCount + reservedCount) >= quantity, increment reservedCount, create PENDING
 * booking with expiresAt = now + 10 minutes, then set Redis hold key with 600s TTL.
 * Prevents overselling.
 */

import type { FastifyInstance } from 'fastify';

export interface CreateBookingInput {
  userId: string;
  tierId: string;
  eventId: string;
  quantity: number;
}

export async function createBooking(_app: FastifyInstance, _input: CreateBookingInput): Promise<unknown> {
  // TODO: implement Flow A inside prisma.$transaction
  throw new Error('Not implemented');
}

export async function getBooking(_app: FastifyInstance, _id: string): Promise<unknown> {
  // TODO: implement
  throw new Error('Not implemented');
}
