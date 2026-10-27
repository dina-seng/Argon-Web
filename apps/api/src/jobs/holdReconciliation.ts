/**
 * jobs/holdReconciliation.ts – Booking hold expiry sweeper.
 *
 * Redis TTL expiry is the fast path. This sweeper is the source of truth:
 * find PENDING bookings past expiresAt, mark EXPIRED, decrement reservedCount
 * in a transaction. Must be idempotent.
 *
 * TODO: Schedule via node-cron or a managed job queue (e.g. BullMQ).
 * TODO: Run every 60 seconds. Use SELECT FOR UPDATE SKIP LOCKED to prevent
 *       duplicate processing when multiple API instances run.
 */

import type { FastifyInstance } from 'fastify';

export async function runHoldReconciliation(_app: FastifyInstance): Promise<void> {
  // TODO: implement idempotent sweeper
  // 1. Find all PENDING bookings where expiresAt < now
  // 2. In a prisma.$transaction for each:
  //    - Mark booking EXPIRED
  //    - Decrement tier.reservedCount by booking.quantity
  //    - Delete Redis hold key if still present (belt-and-braces)
  throw new Error('Not implemented');
}
