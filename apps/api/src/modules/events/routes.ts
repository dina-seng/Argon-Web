/** modules/events/routes.ts */
import type { FastifyInstance } from 'fastify';
import { Role } from '@argon/shared';
import { requireRole } from '../../lib/requireRole';
import {
  listEventsController,
  getEventController,
  createEventController,
  updateEventController,
  updateEventStatusController,
} from './controller';
import {
  createEventSchema,
  eventParamsSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateEventStatusSchema,
} from './schema';

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/', { schema: { querystring: listEventsQuerySchema }, handler: listEventsController });
  app.get('/:id', { schema: { params: eventParamsSchema }, handler: getEventController });

  const organizerOnly = [requireRole(Role.ORGANIZER)];
  app.post('/', { preHandler: organizerOnly, schema: { body: createEventSchema }, handler: createEventController });
  app.patch('/:id', {
    preHandler: organizerOnly,
    schema: { params: eventParamsSchema, body: updateEventSchema },
    handler: updateEventController,
  });
  app.patch('/:id/status', {
    preHandler: organizerOnly,
    schema: { params: eventParamsSchema, body: updateEventStatusSchema },
    handler: updateEventStatusController,
  });
}
