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
} from './schema';
import * as adminService from './service';

export async function getPlatformOverviewController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const overview = await adminService.getPlatformOverview(req.server.prisma);
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
