/**
 * src/app.ts – Fastify application factory.
 * Registers all plugins and route modules.
 */

import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { jwtPlugin } from './plugins/jwt.js';
import { authorizePlugin } from './plugins/authorize.js';
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
import { adminRoutes } from './modules/admin/routes.js';

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
  await app.register(authorizePlugin);
  await app.register(auditLogPlugin);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }));

  // ── Routes (Dual-registered for standard and /api/v1 prefixes) ───────────
  const routeModules = [
    { plugin: authRoutes, prefix: '/auth' },
    { plugin: eventsRoutes, prefix: '/events' },
    { plugin: bookingsRoutes, prefix: '/bookings' },
    { plugin: paymentsRoutes, prefix: '/payments' },
    { plugin: ticketsRoutes, prefix: '/tickets' },
    { plugin: checkinRoutes, prefix: '/checkin' },
    { plugin: organizerRoutes, prefix: '/organizer' },
    { plugin: auditRoutes, prefix: '/audit' },
    { plugin: adminRoutes, prefix: '/admin' },
  ];

  for (const { plugin, prefix } of routeModules) {
    await app.register(plugin, { prefix });
    await app.register(plugin, { prefix: `/api/v1${prefix}` });
  }

  return app;
}

let vercelApp: ReturnType<typeof buildApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  vercelApp ??= buildApp();
  const app = await vercelApp;
  await app.ready();
  app.routing(req, res);
}
