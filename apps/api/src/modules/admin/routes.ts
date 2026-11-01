/**
 * modules/admin/routes.ts – Platform Super-Admin Governance routes.
 * Protected by authenticate + authorize(['ADMIN']).
 */

import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import {
  updateUserRoleParamsSchema,
  updateUserRoleBodySchema,
  getUsersQuerySchema,
  forceConfirmParamsSchema,
  refundBookingParamsSchema,
  getAuditLogsQuerySchema,
  adminBookingsQuerySchema,
} from './schema';
import {
  getPlatformOverviewController,
  listUsersController,
  updateUserRoleController,
  forceConfirmBookingController,
  refundBookingController,
  listAuditLogsController,
  listAdminBookingsController,
} from './controller';

export async function adminRoutes(app: FastifyInstance) {
  const adminPreHandlers = [app.authenticate, app.authorize([Role.ADMIN])];

  app.get('/metrics/overview', {
    preHandler: adminPreHandlers,
    handler: getPlatformOverviewController,
  });

  app.get('/users', {
    schema: { querystring: getUsersQuerySchema },
    preHandler: adminPreHandlers,
    handler: listUsersController,
  });

  app.get('/bookings', {
    schema: { querystring: adminBookingsQuerySchema },
    preHandler: adminPreHandlers,
    handler: listAdminBookingsController,
  });

  app.patch('/users/:userId/role', {
    schema: {
      params: updateUserRoleParamsSchema,
      body: updateUserRoleBodySchema,
    },
    preHandler: adminPreHandlers,
    handler: updateUserRoleController,
  });

  app.post('/bookings/:bookingId/force-confirm', {
    schema: { params: forceConfirmParamsSchema },
    preHandler: adminPreHandlers,
    handler: forceConfirmBookingController,
  });

  app.post('/bookings/:bookingId/refund', {
    schema: { params: refundBookingParamsSchema },
    preHandler: adminPreHandlers,
    handler: refundBookingController,
  });

  app.get('/audit', {
    schema: { querystring: getAuditLogsQuerySchema },
    preHandler: adminPreHandlers,
    handler: listAuditLogsController,
  });
}
