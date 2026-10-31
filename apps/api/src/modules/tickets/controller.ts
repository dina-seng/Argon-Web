/** modules/tickets/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getMyTickets } from './service.js';

export async function getMyTicketsController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'User not logged in' });
  }

  const tickets = await getMyTickets(req.server, userId);
  return reply.send(tickets);
}
