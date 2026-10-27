/**
 * plugins/rateLimit.ts – Global rate limiting via @fastify/rate-limit + Redis.
 * Checkout and login routes have stricter limits applied at the route level.
 */

import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';

export const rateLimitPlugin = fp(async (app) => {
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // TODO: wire up Redis store for distributed rate limiting
    // redis: app.redis,
  });
});
