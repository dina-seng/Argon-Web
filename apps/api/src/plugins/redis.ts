/**
 * plugins/redis.ts – Registers ioredis client as a Fastify decorator.
 * TODO: Add reconnect strategy and circuit-breaker pattern.
 */

import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app) => {
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redis.on('error', (err) => {
    app.log.warn(`Redis connection: ${err.message}`);
  });

  try {
    await redis.connect();
  } catch {
    app.log.warn('Redis could not connect on startup. Redis may not be running locally.');
  }

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit().catch(() => {});
  });
});
