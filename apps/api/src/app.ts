/**
 * src/app.ts – Fastify application factory.
 * Registers all plugins and route modules.
 */

import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { jwtPlugin } from './plugins/jwt.js';
import { rateLimitPlugin } from './plugins/rateLimit.js';
import { corsPlugin } from './plugins/cors.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';
import { auditLogPlugin } from './plugins/auditLog.js';

import { authRoutes } from './modules/auth/routes.js';
import { eventsRoutes } from './modules/events/routes.js';
import { bookingsRoutes } from './modules/bookings/routes.js';
import { paymentsRoutes } from './modules/payments/routes.js';
import { ticketsRoutes } from './modules/tickets/routes.js';
import { checkinRoutes } from './modules/checkin/routes.js';
import { organizerRoutes } from './modules/organizer/routes.js';
import { auditRoutes } from './modules/audit/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(jwtPlugin);
  await app.register(auditLogPlugin);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }));

  // ── Routes ───────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(eventsRoutes, { prefix: '/events' });
  await app.register(bookingsRoutes, { prefix: '/bookings' });
  await app.register(paymentsRoutes, { prefix: '/payments' });
  await app.register(ticketsRoutes, { prefix: '/tickets' });
  await app.register(checkinRoutes, { prefix: '/checkin' });
  await app.register(organizerRoutes, { prefix: '/organizer' });
  await app.register(auditRoutes, { prefix: '/audit' });

  return app;
}
