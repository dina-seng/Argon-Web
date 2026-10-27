/**
 * src/app.ts – Fastify application factory.
 * Registers all plugins and route modules.
 */

import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { prismaPlugin } from './plugins/prisma';
import { redisPlugin } from './plugins/redis';
import { jwtPlugin } from './plugins/jwt';
import { rateLimitPlugin } from './plugins/rateLimit';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/errorHandler';
import { auditLogPlugin } from './plugins/auditLog';

import { authRoutes } from './modules/auth/routes';
import { eventsRoutes } from './modules/events/routes';
import { bookingsRoutes } from './modules/bookings/routes';
import { paymentsRoutes } from './modules/payments/routes';
import { ticketsRoutes } from './modules/tickets/routes';
import { checkinRoutes } from './modules/checkin/routes';
import { organizerRoutes } from './modules/organizer/routes';
import { auditRoutes } from './modules/audit/routes';

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
