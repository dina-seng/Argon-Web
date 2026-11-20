/**
 * src/server.ts – Entry point. Creates the Fastify server and starts listening.
 */

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { runHoldReconciliation } from './jobs/holdReconciliation.js';

const app = await buildApp();

try {
  const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen({ port: env.PORT, host });
  console.warn(`🚀 Argon API listening on port ${env.PORT}`);
  setInterval(() => {
    runHoldReconciliation(app).catch((e) => app.log.warn(e, 'Hold reconciliation failed'));
  }, 60_000);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
