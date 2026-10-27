/**
 * modules/auth/routes.ts – Auth route registration.
 * Rate-limited: login is restricted to 10 requests per minute per IP.
 */

import type { FastifyInstance } from 'fastify';
import { registerController, loginController } from './controller';
import { registerSchema, loginSchema } from './schema';

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
}
