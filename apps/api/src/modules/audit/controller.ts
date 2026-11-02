/** modules/audit/controller.ts */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { listAuditLogs, type ListAuditLogsQuery } from './service';
import { Role } from '@argon/shared';

export async function listAuditLogsController(req: FastifyRequest<{ Querystring: { entityId?: string; entity?: string; page?: string; pageSize?: string } }>, reply: FastifyReply): Promise<void> {
  if (req.user.role !== Role.ADMIN) {
    return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Admins only' });
  }

  const query: ListAuditLogsQuery = {};
  if (req.query.entityId !== undefined) query.entityId = req.query.entityId;
  if (req.query.entity !== undefined) query.entity = req.query.entity;
  if (req.query.page !== undefined) query.page = Number(req.query.page);
  if (req.query.pageSize !== undefined) query.pageSize = Number(req.query.pageSize);

  const logs = await listAuditLogs(req.server, query);
  reply.send(logs);
}
