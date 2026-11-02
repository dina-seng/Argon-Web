/** modules/audit/service.ts */
import type { FastifyInstance } from 'fastify';
import type { PaginatedResponse } from '@argon/shared';

export interface ListAuditLogsQuery {
  entityId?: string;
  entity?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(app: FastifyInstance, query: ListAuditLogsQuery): Promise<PaginatedResponse<unknown>> {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 20, 100);
  const skip = (page - 1) * pageSize;

  const where = {
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
  };

  const [data, total] = await app.prisma.$transaction([
    app.prisma.auditLog.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    app.prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize };
}
