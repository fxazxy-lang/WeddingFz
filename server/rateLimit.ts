import { HttpError } from './http';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter. Good enough for a single-instance
 * wedding site; swap for Redis if you ever run several instances.
 */
export function createRateLimiter(options: { limit: number; windowMs: number; name: string }) {
  const buckets = new Map<string, Bucket>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, options.windowMs);
  sweep.unref();

  return {
    /** Throws 429 when `key` has exceeded the limit in the current window. */
    hit(key: string): void {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > options.limit) {
        throw new HttpError(429, 'Too many requests. Please wait a few minutes and try again.', 'rate_limited');
      }
    },
    reset(key: string): void {
      buckets.delete(key);
    },
  };
}
