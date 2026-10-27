/**
 * lib/idempotency.ts – Idempotency key helpers for webhook processing.
 *
 * TODO: Implement Redis-based idempotency store.
 * - setIdempotencyKey(key, ttlSeconds): mark key as processed
 * - checkIdempotencyKey(key): return true if already processed
 */

import type Redis from 'ioredis';

const IDEMPOTENCY_KEY_PREFIX = 'idempotency:';
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours

export async function setIdempotencyKey(
  redis: Redis,
  key: string,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  await redis.set(`${IDEMPOTENCY_KEY_PREFIX}${key}`, '1', 'EX', ttl);
}

export async function checkIdempotencyKey(redis: Redis, key: string): Promise<boolean> {
  const result = await redis.exists(`${IDEMPOTENCY_KEY_PREFIX}${key}`);
  return result === 1;
}
