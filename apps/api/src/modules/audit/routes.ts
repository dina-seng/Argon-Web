/** modules/audit/routes.ts – ADMIN only */
import type { FastifyInstance } from 'fastify';
import { listAuditLogsController } from './controller';
export async function auditRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate], handler: listAuditLogsController });
}
