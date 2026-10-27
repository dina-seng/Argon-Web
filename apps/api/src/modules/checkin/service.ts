/**
 * modules/checkin/service.ts
 *
 * Flow C. Verify HMAC signature, then in one row-level transaction:
 * if CHECKED_IN return 409 with prior scan time; if REVOKED reject;
 * if ACTIVE set CHECKED_IN and record timestamp.
 * Target under 1.0s.
 */

import type { FastifyInstance } from 'fastify';

export interface ScanResult {
  outcome: 'CHECKED_IN' | 'DUPLICATE' | 'REVOKED' | 'INVALID';
  checkedInAt?: string;
  holderName?: string;
}

export async function scanTicket(
  _app: FastifyInstance,
  _qrToken: string,
  _scannedBy: string,
): Promise<ScanResult> {
  // TODO: implement Flow C
  throw new Error('Not implemented');
}

export async function exportRoster(_app: FastifyInstance, _eventId: string): Promise<unknown[]> {
  // TODO: return minimal roster (ticketId, qrToken, status, holderName) – no secrets
  throw new Error('Not implemented');
}
