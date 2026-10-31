/** modules/checkin/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { scanTicket, exportRoster } from './service.js';

export async function scanController(
  req: FastifyRequest<{ Body: { qrToken: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { qrToken } = req.body;
  const scannedBy = req.user?.sub ?? 'Gate-Staff';

  const result = await scanTicket(req.server, qrToken, scannedBy);

  if (result.outcome === 'DUPLICATE') {
    return reply.status(409).send(result);
  }
  if (result.outcome === 'INVALID' || result.outcome === 'REVOKED') {
    return reply.status(400).send(result);
  }

  return reply.status(200).send(result);
}

export async function rosterController(
  req: FastifyRequest<{ Params: { eventId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { eventId } = req.params;
  const roster = await exportRoster(req.server, eventId);
  return reply.send(roster);
}
