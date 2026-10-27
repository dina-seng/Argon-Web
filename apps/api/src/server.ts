/**
 * src/server.ts – Entry point. Creates the Fastify server and starts listening.
 */

import { buildApp } from './app';
import { env } from './config/env';

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.warn(`🚀 Argon API listening on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
