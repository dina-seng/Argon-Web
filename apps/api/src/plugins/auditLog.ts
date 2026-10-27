/**
 * plugins/auditLog.ts – Decorator for writing AuditLog entries.
 * TODO: Implement audit log writing via prisma from route handlers.
 */

import fp from 'fastify-plugin';

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyInstance {
    writeAuditLog: (entry: AuditLogEntry) => Promise<void>;
  }
}

export const auditLogPlugin = fp(async (app) => {
  app.decorate('writeAuditLog', async (_entry: AuditLogEntry): Promise<void> => {
    // TODO: implement using app.prisma.auditLog.create(...)
  });
});
