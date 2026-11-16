/** modules/audit/routes.ts – ADMIN only */
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { listAuditLogsController } from './controller.js';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, app.authorize([Role.ADMIN])],
    handler: listAuditLogsController,
  });
}
