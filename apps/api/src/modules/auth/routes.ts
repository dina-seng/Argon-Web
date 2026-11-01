/**
 * modules/auth/routes.ts – Auth route registration.
 * Rate-limited: login is restricted to 10 requests per minute per IP.
 */

import type { FastifyInstance } from 'fastify';
import { registerController, loginController, refreshController, logoutController } from './controller';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './schema';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: { body: registerSchema },
    handler: registerController,
  });

  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: loginSchema },
    handler: loginController,
  });

  app.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { body: refreshSchema },
    handler: refreshController,
  });

  app.post('/logout', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { body: logoutSchema },
    handler: logoutController,
  });
}
