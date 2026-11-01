/** modules/organizer/routes.ts – ORGANIZER role guard required */
import type { FastifyInstance } from 'fastify';
import { Role } from '@argon/shared';
import { requireRole } from '../../lib/requireRole.js';
import { getMetricsController, issueStaffController, listMyEventsController, getMyEventController } from './controller.js';
import { eventIdParamSchema } from './schema.js';
export async function organizerRoutes(app: FastifyInstance) {
  const organizerOnly = [requireRole(Role.ORGANIZER)];
  app.get('/events', { preHandler: organizerOnly, handler: listMyEventsController });
  app.get('/events/:eventId', { preHandler: organizerOnly, schema: { params: eventIdParamSchema }, handler: getMyEventController });
  app.get('/events/:eventId/metrics', { preHandler: [app.authenticate], handler: getMetricsController });
  app.post('/staff', { preHandler: [app.authenticate], handler: issueStaffController });
}
