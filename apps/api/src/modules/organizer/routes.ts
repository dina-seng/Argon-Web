/** modules/organizer/routes.ts – ORGANIZER role guard required */
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import {
  getMetricsController,
  updateTierQuotaController,
  getAttendeesController,
  issueStaffController,
} from './controller';
import {
  getEventMetricsParamsSchema,
  updateTierQuotaParamsSchema,
  updateTierQuotaBodySchema,
  getAttendeesParamsSchema,
  getAttendeesQuerySchema,
} from './schema';

export async function organizerRoutes(app: FastifyInstance) {
  const organizerAuth = [app.authenticate, app.authorize([Role.ORGANIZER, Role.ADMIN])];

  app.get(
    '/events/:eventId/metrics',
    {
      schema: {
        params: getEventMetricsParamsSchema,
      },
      preHandler: organizerAuth,
    },
    getMetricsController
  );

  app.patch(
    '/events/:eventId/tiers/:tierId/quota',
    {
      schema: {
        params: updateTierQuotaParamsSchema,
        body: updateTierQuotaBodySchema,
      },
      preHandler: organizerAuth,
    },
    updateTierQuotaController
  );

  app.get(
    '/events/:eventId/attendees',
    {
      schema: {
        params: getAttendeesParamsSchema,
        querystring: getAttendeesQuerySchema,
      },
      preHandler: organizerAuth,
    },
    getAttendeesController
  );

  app.post(
    '/staff',
    {
      preHandler: organizerAuth,
    },
    issueStaffController
  );
}
