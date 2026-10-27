/**
 * config/env.ts – Environment variable validation with Zod.
 * Fails fast on startup if required env vars are missing or malformed.
 */

import { z } from 'zod';

try {
  process.loadEnvFile?.();
} catch {
  // .env file not found or already provided via environment
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).default(3000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/argon_dev'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32).default('argon_jwt_secret_must_be_at_least_32_chars_dev_only'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SCANNER_URL: z.string().default('http://localhost:5174'),
  QR_SIGNING_SECRET: z.string().min(32).default('argon_qr_signing_secret_min_32_chars_dev_only'),
  PAYMENT_GATEWAY_BASE_URL: z.string().default('https://payment-sandbox.example.com'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).default('argon_webhook_secret_dev'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
