/**
 * tests/unit/hmac.test.ts – Unit tests for HMAC signing/verification.
 */

import { describe, it, expect } from 'vitest';
import { signQrToken, verifyQrToken } from '../../src/lib/hmac';

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
});
