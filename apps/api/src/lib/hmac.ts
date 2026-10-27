/**
 * lib/hmac.ts – HMAC-SHA256 QR token signing and verification.
 *
 * The signing secret (QR_SIGNING_SECRET) MUST never leave the server.
 * Uses Node.js built-in `crypto` module – no external dependencies.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs a payload string and returns a `<payload>.<signature>` token.
 */
export function signQrToken(payload: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verifies a `<payload>.<signature>` token.
 * Uses timingSafeEqual to prevent timing attacks.
 * Returns the payload string if valid, throws if invalid.
 */
export function verifyQrToken(token: string, secret: string): string {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) throw new Error('Invalid QR token format');

  const payload = token.slice(0, lastDot);
  const providedSig = token.slice(lastDot + 1);
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

  const a = Buffer.from(providedSig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('QR token signature mismatch');
  }

  return payload;
}
