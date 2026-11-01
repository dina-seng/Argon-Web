/**
 * tests/unit/hmac.test.ts – Unit tests for HMAC signing/verification.
 */

import { describe, it, expect } from 'vitest';
import {
  signQrToken,
  verifyQrToken,
  generateHmacSignature,
  verifyHmacSignature,
} from '../../src/lib/hmac';

describe('HMAC QR token', () => {
  const secret = 'a-test-secret-that-is-long-enough-32chars';

  it('signs and verifies a valid token', () => {
    const payload = JSON.stringify({ ticketId: 'abc-123' });
    const token = signQrToken(payload, secret);
    const verified = verifyQrToken(token, secret);
    expect(verified).toBe(payload);
  });

  it('throws on tampered token', () => {
    const payload = JSON.stringify({ ticketId: 'abc-123' });
    const token = signQrToken(payload, secret);
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(() => verifyQrToken(tampered, secret)).toThrow();
  });

  it('throws on wrong secret', () => {
    const payload = 'some-payload';
    const token = signQrToken(payload, secret);
    expect(() => verifyQrToken(token, 'wrong-secret-that-is-also-long-enough!')).toThrow();
  });

  describe('generateHmacSignature & verifyHmacSignature', () => {
    it('generates sha256 hex signature and verifies correctly', () => {
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const sig = generateHmacSignature(ticketId, secret);
      expect(sig).toMatch(/^[0-9a-f]{64}$/);

      expect(verifyHmacSignature(ticketId, sig, secret)).toBe(true);
      expect(verifyHmacSignature(`${ticketId}:${sig}`, secret)).toBe(true);
    });

    it('rejects invalid signature or wrong secret', () => {
      const ticketId = '123e4567-e89b-12d3-a456-426614174000';
      const sig = generateHmacSignature(ticketId, secret);

      expect(verifyHmacSignature(ticketId, sig, 'different-secret-that-is-32-chars!')).toBe(false);
      expect(verifyHmacSignature(`${ticketId}:${sig.slice(0, -2)}xx`, secret)).toBe(false);
      expect(verifyHmacSignature('malformed-token-without-separator', secret)).toBe(false);
    });
  });
});
