/**
 * plugins/authorize.ts – Fastify plugin for role-based authorization (RBAC).
 */

import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    authorize: (allowedRoles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authorizePlugin = fp(async (app) => {
  app.decorate('authorize', (allowedRoles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      if (!allowedRoles.includes(request.user.role)) {
        reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
        return;
      }
    };
  });
});
