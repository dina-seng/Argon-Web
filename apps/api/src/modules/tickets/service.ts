/**
 * modules/tickets/service.ts – HMAC token minting and verification.
 * TODO: Use lib/hmac.ts to sign/verify ticket tokens.
 */
import type { FastifyInstance } from 'fastify';

export async function mintTickets(_app: FastifyInstance, _bookingId: string, _quantity: number): Promise<string[]> {
  // TODO: generate HMAC-SHA256 signed qrTokens
  throw new Error('Not implemented');
}

export async function getMyTickets(_app: FastifyInstance, _userId: string): Promise<unknown[]> {
  throw new Error('Not implemented');
}
