/** modules/organizer/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getEventMetrics,
  updateTierQuota,
  getAttendees,
} from './service';
import type {
  GetEventMetricsParams,
  UpdateTierQuotaParams,
  UpdateTierQuotaBody,
  GetAttendeesParams,
  GetAttendeesQuery,
} from './schema';

export async function getMetricsController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { eventId } = req.params as GetEventMetricsParams;
  const userId = req.user.sub;
  const isAdmin = req.user.role === 'ADMIN';

  const metrics = await getEventMetrics(
    userId,
    eventId,
    isAdmin,
    req.server.prisma
  );
  reply.send(metrics);
}

export async function updateTierQuotaController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { eventId, tierId } = req.params as UpdateTierQuotaParams;
  const body = req.body as UpdateTierQuotaBody;
  const userId = req.user.sub;
  const isAdmin = req.user.role === 'ADMIN';

  const updatedTier = await updateTierQuota(
    userId,
    eventId,
    tierId,
    body,
    isAdmin,
    req.server.prisma
  );
  reply.send(updatedTier);
}

export async function getAttendeesController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { eventId } = req.params as GetAttendeesParams;
  const query = req.query as GetAttendeesQuery;
  const userId = req.user.sub;
  const isAdmin = req.user.role === 'ADMIN';

  const attendees = await getAttendees(
    userId,
    eventId,
    query,
    isAdmin,
    req.server.prisma
  );
  reply.send(attendees);
}

export async function issueStaffController(
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(501).send({
    statusCode: 501,
    error: 'Not Implemented',
    message: 'Staff credential issuance not implemented yet',
  });
}
