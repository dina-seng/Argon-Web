/**
 * tests/integration/organizerEvents.test.ts – Auth and validation on organizer event routes.
 * These requests are rejected before any database query runs.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { EventCategory, Role } from '@argon/shared';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('organizer event routes', () => {
  let app: FastifyInstance;
  const tokenFor = (role: Role) => app.jwt.sign({ sub: randomUUID(), role, email: `${role.toLowerCase()}@test.dev` });

  const validBody = {
    title: 'Test event',
    description: '',
    venue: 'Test venue',
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    category: EventCategory.TECH,
    capacity: 10,
  };

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects creating an event without a token', async () => {
    const res = await app.inject({ method: 'POST', url: '/events', payload: validBody });
    expect(res.statusCode).toBe(401);
  });

  it('rejects customers creating events', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: validBody,
      headers: { authorization: `Bearer ${tokenFor(Role.CUSTOMER)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects an invalid event body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: { ...validBody, capacity: 0 },
      headers: { authorization: `Bearer ${tokenFor(Role.ORGANIZER)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an unknown status change', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/events/${randomUUID()}/status`,
      payload: { status: 'COMPLETED' },
      headers: { authorization: `Bearer ${tokenFor(Role.ORGANIZER)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects listing organizer events without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/organizer/events' });
    expect(res.statusCode).toBe(401);
  });
});
