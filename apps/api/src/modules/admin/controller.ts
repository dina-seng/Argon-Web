/**
 * modules/admin/controller.ts – Request handlers for admin governance endpoints.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  GetUsersQuery,
  ForceConfirmParams,
  RefundBookingParams,
  GetAuditLogsQuery,
  AdminBookingsQuery,
  GetAdminEventsQuery,
  UpdateAdminEventStatusParams,
  UpdateAdminEventStatusBody,
  ManualCheckInOverrideParams,
  UserDetailsParams,
  ToggleUserSuspensionParams,
  ToggleUserSuspensionBody,
  GetPlatformOverviewQuery,
} from './schema';
import * as adminService from './service';

export async function getPlatformOverviewController(
  req: FastifyRequest<{ Querystring: GetPlatformOverviewQuery }>,
  reply: FastifyReply
): Promise<void> {
  const overview = await adminService.getPlatformOverview(
    req.server.prisma,
    req.server,
    req.query
  );
  reply.status(200).send(overview);
}

export async function listUsersController(
  req: FastifyRequest<{ Querystring: GetUsersQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminService.listUsers(req.server.prisma, req.query);
  reply.status(200).send(result);
}

export async function updateUserRoleController(
  req: FastifyRequest<{ Params: UpdateUserRoleParams; Body: UpdateUserRoleBody }>,
  reply: FastifyReply
): Promise<void> {
  const adminId = req.user.sub;
  const targetUserId = req.params.userId;
  const newRole = req.body.role;

  const updatedUser = await adminService.updateUserRole(
    req.server.prisma,
    adminId,
    targetUserId,
    newRole
  );
  reply.status(200).send(updatedUser);
}

export async function listAdminEventsController(
  req: FastifyRequest<{ Querystring: GetAdminEventsQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminService.listAdminEvents(req.server.prisma, req.query);
  reply.status(200).send(result);
}

export async function updateAdminEventStatusController(
  req: FastifyRequest<{
    Params: UpdateAdminEventStatusParams;
    Body: UpdateAdminEventStatusBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const adminId = req.user.sub;
  const eventId = req.params.eventId;
  const { status, reason } = req.body;

  const updatedEvent = await adminService.updateAdminEventStatus(
    req.server.prisma,
    adminId,
    eventId,
    status,
    reason
  );
  reply.status(200).send(updatedEvent);
}

export async function forceConfirmBookingController(
  req: FastifyRequest<{ Params: ForceConfirmParams }>,
  reply: FastifyReply
): Promise<void> {
  const adminId = req.user.sub;
  const bookingId = req.params.bookingId;

  const booking = await adminService.forceConfirmBooking(
    req.server.prisma,
    adminId,
    bookingId
  );
  reply.status(200).send(booking);
}

export async function refundBookingController(
  req: FastifyRequest<{ Params: RefundBookingParams }>,
  reply: FastifyReply
): Promise<void> {
  const adminId = req.user.sub;
  const bookingId = req.params.bookingId;

  const booking = await adminService.refundBooking(
    req.server.prisma,
    adminId,
    bookingId
  );
  reply.status(200).send(booking);
}

export async function manualCheckInOverrideController(
  req: FastifyRequest<{ Params: ManualCheckInOverrideParams }>,
  reply: FastifyReply
): Promise<void> {
  const adminId = req.user.sub;
  const ticketId = req.params.ticketId;

  const ticket = await adminService.manualCheckInOverride(
    req.server.prisma,
    adminId,
    ticketId
  );
  reply.status(200).send(ticket);
}

export async function listAuditLogsController(
  req: FastifyRequest<{ Querystring: GetAuditLogsQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminService.listAuditLogs(req.server.prisma, req.query);
  reply.status(200).send(result);
}

export async function listAdminBookingsController(
  req: FastifyRequest<{ Querystring: AdminBookingsQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminService.listAdminBookings(req.server.prisma, req.query);
  reply.status(200).send({ statusCode: 200, ...result });
}

export async function getSystemHealthController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const health = await adminService.getSystemHealthDetails(
    req.server.prisma,
    req.server
  );
  reply.status(200).send(health);
}

export async function getUserDetailsController(
  req: FastifyRequest<{ Params: UserDetailsParams }>,
  reply: FastifyReply
): Promise<void> {
  const details = await adminService.getUserDetails(
    req.server.prisma,
    req.params.userId
  );
  reply.status(200).send(details);
}

export async function toggleUserSuspensionController(
  req: FastifyRequest<{
    Params: ToggleUserSuspensionParams;
    Body: ToggleUserSuspensionBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const adminUser = {
    id: req.user.sub,
    email: req.user.email ?? 'admin@argon.app',
  };
  const result = await adminService.toggleUserSuspension(
    req.server.prisma,
    adminUser,
    req.params.userId,
    req.body.suspend,
    req.body.reason,
    req.server
  );
  reply.status(200).send(result);
}
