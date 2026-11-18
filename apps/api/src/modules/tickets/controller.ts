/** modules/tickets/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getMyTickets, getTicketById } from './service.js';

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

export async function getTicketByIdController(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'User not logged in' });
  }

  const { id } = req.params as { id: string };
  const ticket = await getTicketById(req.server, id, userId, req.user?.role);
  return reply.send(ticket);
}
