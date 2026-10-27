/**
 * plugins/prisma.ts – Registers PrismaClient as a Fastify decorator.
 * TODO: Add connection retry logic and graceful shutdown hook.
 */

import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient({
    log: app.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  try {
    await prisma.$connect();
  } catch {
    app.log.warn('Prisma could not connect on startup. PostgreSQL may not be running locally.');
  }

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect().catch(() => {});
  });
});
