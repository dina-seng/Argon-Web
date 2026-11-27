/**
 * tests/integration/auth-password-hashing.test.ts – ARGON-22
 * Parent: ARGON-12
 *
 * Proves that a password is persisted only as a bcrypt hash and never as
 * plaintext. The test registers through the real API, then reads the row
 * directly from PostgreSQL with Prisma.
 */

import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { buildApp } from '../../src/app';

describe('passwords are stored as bcrypt hashes', () => {
  let app: FastifyInstance;

  const email = `bcrypt-${randomUUID()}@argon.kh`;
  const plaintextPassword = 'Argon!Passw0rd1';
  const name = 'Bcrypt Storage Test';
  let refreshToken: string | undefined;

  beforeAll(async () => {
    app = await buildApp();
    // Remove a fixture left behind by an interrupted previous run.
    await app.prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    if (refreshToken) {
      const key = `auth:refresh:${createHash('sha256').update(refreshToken).digest('hex')}`;
      await app.redis.del(key);
    }
    await app.prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('stores a bcrypt hash instead of the plaintext password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        password: plaintextPassword,
        confirmPassword: plaintextPassword,
        name,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).not.toHaveProperty('password');
    expect(res.body).not.toContain(plaintextPassword);
    refreshToken = body.refreshToken;

    const user = await app.prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();

    const storedValue = user!.password;

    // bcrypt format: $2a$ / $2b$ / $2y$ + cost (10) + 53-character salt+digest.
    expect(storedValue).toMatch(/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/);
    expect(bcrypt.getRounds(storedValue)).toBe(10);

    // The stored value is not the plaintext, and bcrypt can verify it.
    expect(storedValue).not.toBe(plaintextPassword);
    expect(storedValue).not.toContain(plaintextPassword);
    expect(await bcrypt.compare(plaintextPassword, storedValue)).toBe(true);
  });
});
