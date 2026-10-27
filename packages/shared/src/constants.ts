/**
 * @argon/shared – constants
 *
 * Application-wide constants consumed by both the API and front-end apps.
 */

/** Duration of a seat hold in seconds (10 minutes). Booking expires after this TTL. */
export const HOLD_TTL_SECONDS = 600;

/** Target latency for gate scan endpoint in milliseconds (Flow C). */
export const GATE_SCAN_TARGET_MS = 1000;

/** Redis key prefix for booking hold keys. */
export const REDIS_HOLD_KEY_PREFIX = 'hold:booking:';

/** Maximum tickets per booking. */
export const MAX_TICKETS_PER_BOOKING = 10;

/** Supported payment gateway webhook event types. */
export const WEBHOOK_EVENT_PAYMENT_SUCCESS = 'payment.success';
export const WEBHOOK_EVENT_PAYMENT_FAILED = 'payment.failed';
