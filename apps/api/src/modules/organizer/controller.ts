/** modules/organizer/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { listOrganizerEvents, getOrganizerEvent } from '../events/service';
export async function getMetricsController(_req: FastifyRequest, _reply: FastifyReply): Promise<void> { /* TODO */ }
export async function issueStaffController(_req: FastifyRequest, _reply: FastifyReply): Promise<void> { /* TODO */ }
export async function listMyEventsController(req: FastifyRequest) {
  return listOrganizerEvents(req.server, req.user.sub);
}
export async function getMyEventController(req: FastifyRequest<{ Params: { eventId: string } }>) {
  return getOrganizerEvent(req.server, req.user.sub, req.params.eventId);
}
