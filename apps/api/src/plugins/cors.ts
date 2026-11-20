/**
 * plugins/cors.ts – CORS configuration.
 * Allows configured CLIENT_URL, SCANNER_URL, Vercel deployments, and local dev origins.
 */

import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { env } from '../config/env.js';

export const corsPlugin = fp(async (app) => {
  const configuredOrigins = [
    ...env.CLIENT_URL.split(',').map((u) => u.trim()),
    ...env.SCANNER_URL.split(',').map((u) => u.trim()),
  ].filter(Boolean);

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like curl, mobile native, or server-to-server)
      if (!origin) {
        return cb(null, true);
      }
      if (configuredOrigins.includes(origin)) {
        return cb(null, true);
      }
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return cb(null, true);
      }
      // Strictly restrict Vercel preview domains to this project prefix
      // to prevent arbitrary 3rd-party .vercel.app websites from exploiting CORS with credentials
      if (/^https:\/\/argon-(web|scanner|api)(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
});
