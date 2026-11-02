/** modules/organizer/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { listOrganizerEvents, getOrganizerEvent } from '../events/service.js';
import { getEventMetrics, issueStaffCredential } from './service.js';
import { issueStaffBodySchema, type IssueStaffBody } from './schema.js';

export async function getMetricsController(req: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply): Promise<void> {
  const metrics = await getEventMetrics(req.server, req.params.eventId, req.user.sub);
  reply.send(metrics);
}

export async function issueStaffController(req: FastifyRequest<{ Body: IssueStaffBody }>, reply: FastifyReply): Promise<void> {
  const body = issueStaffBodySchema.parse(req.body);
  const result = await issueStaffCredential(req.server, req.user.sub, body);
  reply.code(201).send(result);
}
export async function listMyEventsController(req: FastifyRequest) {
  return listOrganizerEvents(req.server, req.user.sub);
}

export async function getMyEventController(req: FastifyRequest<{ Params: { eventId: string } }>) {
  return getOrganizerEvent(req.server, req.user.sub, req.params.eventId);
}
