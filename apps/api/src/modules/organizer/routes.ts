/** modules/organizer/routes.ts – ORGANIZER role guard required */
import type { FastifyInstance } from 'fastify';
import { getMetricsController, issueStaffController } from './controller';
export async function organizerRoutes(app: FastifyInstance) {
  app.get('/events/:eventId/metrics', { preHandler: [app.authenticate], handler: getMetricsController });
  app.post('/staff', { preHandler: [app.authenticate], handler: issueStaffController });
}
