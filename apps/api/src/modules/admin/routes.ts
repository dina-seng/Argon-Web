/**
 * modules/admin/routes.ts – Platform Administration & Operations Routes.
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
  getAdminEventsQuerySchema,
  updateAdminEventStatusParamsSchema,
  updateAdminEventStatusBodySchema,
  manualCheckInOverrideParamsSchema,
  userDetailsParamsSchema,
  toggleUserSuspensionParamsSchema,
  toggleUserSuspensionBodySchema,
  getPlatformOverviewQuerySchema,
} from './schema';
import {
  getPlatformOverviewController,
  listUsersController,
  updateUserRoleController,
  listAdminEventsController,
  updateAdminEventStatusController,
  forceConfirmBookingController,
  refundBookingController,
  manualCheckInOverrideController,
  listAuditLogsController,
  listAdminBookingsController,
  getSystemHealthController,
  getUserDetailsController,
  toggleUserSuspensionController,
} from './controller';

export async function adminRoutes(app: FastifyInstance) {
  const adminPreHandlers = [app.authenticate, app.authorize([Role.ADMIN])];

  // 1. Executive Platform Overview & Real Telemetry
  app.get('/metrics/overview', {
    schema: { querystring: getPlatformOverviewQuerySchema },
    preHandler: adminPreHandlers,
    handler: getPlatformOverviewController,
  });

  // 2. User Directory, Details & Account Actions
  app.get('/users', {
    schema: { querystring: getUsersQuerySchema },
    preHandler: adminPreHandlers,
    handler: listUsersController,
  });

  app.get('/users/:userId/details', {
    schema: { params: userDetailsParamsSchema },
    preHandler: adminPreHandlers,
    handler: getUserDetailsController,
  });

  app.patch('/users/:userId/role', {
    schema: {
      params: updateUserRoleParamsSchema,
      body: updateUserRoleBodySchema,
    },
    preHandler: adminPreHandlers,
    handler: updateUserRoleController,
  });

  app.post('/users/:userId/suspend', {
    schema: {
      params: toggleUserSuspensionParamsSchema,
      body: toggleUserSuspensionBodySchema,
    },
    preHandler: adminPreHandlers,
    handler: toggleUserSuspensionController,
  });

  // 3. Global Event Moderation
  app.get('/events', {
    schema: { querystring: getAdminEventsQuerySchema },
    preHandler: adminPreHandlers,
    handler: listAdminEventsController,
  });

  app.patch('/events/:eventId/status', {
    schema: {
      params: updateAdminEventStatusParamsSchema,
      body: updateAdminEventStatusBodySchema,
    },
    preHandler: adminPreHandlers,
    handler: updateAdminEventStatusController,
  });

  // 4. Bookings, Manual Confirmations, Refunds & Ticket Overrides
  app.get('/bookings', {
    schema: { querystring: adminBookingsQuerySchema },
    preHandler: adminPreHandlers,
    handler: listAdminBookingsController,
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

  app.post('/tickets/:ticketId/check-in-override', {
    schema: { params: manualCheckInOverrideParamsSchema },
    preHandler: adminPreHandlers,
    handler: manualCheckInOverrideController,
  });

  // 5. Audit Logs
  app.get('/audit', {
    schema: { querystring: getAuditLogsQuerySchema },
    preHandler: adminPreHandlers,
    handler: listAuditLogsController,
  });

  // 6. Deep System Health & Diagnostics
  app.get('/system/health', {
    preHandler: adminPreHandlers,
    handler: getSystemHealthController,
  });
}
