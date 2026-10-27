/**
 * plugins/cors.ts – CORS configuration.
 * Restricts origins to CLIENT_URL and SCANNER_URL in production.
 */

import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { env } from '../config/env';

export const corsPlugin = fp(async (app) => {
  await app.register(fastifyCors, {
    origin: [env.CLIENT_URL, env.SCANNER_URL],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
});
