/**
 * tests/integration/publicEvents.test.ts – Input validation on the public event feed.
 * These requests are rejected before any database query runs.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('public event routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/events?category=PARTY', '/events?pageSize=500', '/events?from=tomorrow'])('rejects %s', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a malformed event id', async () => {
    const res = await app.inject({ method: 'GET', url: '/events/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });
});
