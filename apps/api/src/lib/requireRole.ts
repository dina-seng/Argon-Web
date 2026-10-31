/**
 * lib/requireRole.ts – preHandler that verifies the JWT and checks the caller's role.
 *
 * Usage: app.post('/', { preHandler: [requireRole(Role.ORGANIZER)], handler })
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@argon/shared';

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'You do not have access to this resource' });
    }
  };
}
