/**
 * plugins/jwt.ts – Registers @fastify/jwt for JWT auth.
 * JWT verification with Redis-backed logout revocation.
 */

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env';
import type { JwtPayload } from '@argon/shared';
import { isAccessTokenRevoked } from '../modules/auth/service';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const jwtPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }

    const authorization = request.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (accessToken && await isAccessTokenRevoked(app, accessToken)) {
      reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });
});
