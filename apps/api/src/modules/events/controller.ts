/** modules/events/controller.ts – thin handlers delegating to service */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput, UpdateEventStatusInput } from '@argon/shared';
import type { EventParams } from './schema';
import { createEvent, getEvent, listEvents, updateEvent, updateEventStatus } from './service';

export async function listEventsController(req: FastifyRequest<{ Querystring: ListEventsQuery }>) {
  return listEvents(req.server, req.query);
}

export async function getEventController(req: FastifyRequest<{ Params: EventParams }>) {
  return getEvent(req.server, req.params.id);
}

export async function createEventController(req: FastifyRequest<{ Body: CreateEventInput }>, reply: FastifyReply) {
  const event = await createEvent(req.server, req.user.sub, req.body);
  return reply.status(201).send(event);
}

export async function updateEventController(req: FastifyRequest<{ Params: EventParams; Body: UpdateEventInput }>) {
  return updateEvent(req.server, req.user.sub, req.params.id, req.body);
}

export async function updateEventStatusController(req: FastifyRequest<{ Params: EventParams; Body: UpdateEventStatusInput }>) {
  return updateEventStatus(req.server, req.user.sub, req.params.id, req.body);
}
